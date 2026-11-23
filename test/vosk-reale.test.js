'use strict';
// Prova con il VERO Vosk (vosk-browser 0.0.8, modello small-it-0.22 da Hugging Face) sul sito servito in locale.
// Al posto del microfono: la voce sintetica italiana di Windows ("Microsoft Elsa"), letta da un file WAV.
// Solo sul PC Windows: npm run test:vosk. La prima volta scarica il modello (circa 50 MB) e lo tiene
// nella cartella test/.browser-vosk, così le volte dopo non si riscarica.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { avviaServer } = require('./server');

/* Frasi dettate, con una pausa fra l'una e l'altra (separatore "pausa"), e i valori attesi nella tabella. */
const FRASI = [
  ['duecentoquattordici virgola nove quattro', '214,94'],
  ['ventisei virgola nove quattro', '26,94'],
  ['trecentotredici virgola uno sei', '313,16'],
  ['ottantadue virgola tre otto', '82,38'],
  ['meno uno virgola cinque', '-1,5'],
  ['cinquantanove virgola tre zero', '59,30'],
];

function creaWav(file, frasi, pausaMs) {
  const ps = `
Add-Type -AssemblyName System.Speech
$sintesi = New-Object System.Speech.Synthesis.SpeechSynthesizer
$sintesi.SelectVoice('Microsoft Elsa Desktop')
$formato = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$sintesi.SetOutputToWaveFile('${file}', $formato)
$p = New-Object System.Speech.Synthesis.PromptBuilder
$p.AppendBreak([TimeSpan]::FromMilliseconds(1500))
${frasi.map((f) => `$p.AppendText('${f}'); $p.AppendBreak([TimeSpan]::FromMilliseconds(${pausaMs}))`).join('\n')}
$p.AppendBreak([TimeSpan]::FromMilliseconds(2000))
$sintesi.Speak($p)
$sintesi.Dispose()`;
  execFileSync('powershell', ['-NoProfile', '-Command', ps]);
}

test('vero Vosk: sei valori dettati di seguito con la pausa finiscono nelle caselle giuste', { skip: process.platform !== 'win32', timeout: 600000 }, async () => {
  const wav = path.join(os.tmpdir(), 'compilatore-misure-frasi.wav');
  creaWav(wav, FRASI.map((f) => f[0]), 1300);
  const server = await avviaServer(path.join(__dirname, '..', 'sito'), 8765);
  const ctx = await chromium.launchPersistentContext(path.join(__dirname, '.browser-vosk'), {
    channel: 'msedge',
    viewport: { width: 1200, height: 900 },
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}%noloop`],
  });
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    const errori = [];
    page.on('pageerror', (e) => errori.push(e.message));
    await page.goto(server.url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.selectOption('#voce-modo', 'continuo');
    assert.equal(await page.inputValue('#voce-separatore'), 'pausa');
    await page.click('#cella-0-0');
    const t0 = Date.now();
    await page.click('#btn-voce');
    // la prima volta: conferma dello scaricamento
    const conferma = page.locator('#conferma');
    let scaricato = false;
    await Promise.race([
      conferma.waitFor().then(() => { scaricato = true; return conferma.locator('#conferma-si').click(); }),
      page.waitForSelector('#btn-voce.ascolto', { timeout: 300000 }),
    ]);
    await page.waitForSelector('#btn-voce.ascolto', { timeout: 300000 });
    const secondi = (Date.now() - t0) / 1000;
    console.log(`  modello ${scaricato ? 'scaricato da Hugging Face' : 'preso dalla memoria del browser'}; pronto e microfono aperto in ${secondi.toFixed(1)} s`);
    if (!scaricato) assert.ok(secondi < 15, 'dalla memoria del browser il modello è pronto in pochi secondi');
    // aspetta che arrivi l'ultimo valore (Dato 3) o al massimo 60 s
    await page.waitForFunction(() => document.getElementById('cella-2-1').value !== '', null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const letti = [];
    for (let i = 0; i < 3; i++) letti.push(await page.inputValue(`#cella-${i}-0`), await page.inputValue(`#cella-${i}-1`));
    console.log('  dettato :', FRASI.map((f) => f[1]).join(' | '));
    console.log('  in tabella:', letti.join(' | '));
    console.log('  ultimi   :', await page.locator('#voce-ultimi').innerText());
    await page.locator('#sez-dati').screenshot({ path: path.join(__dirname, 'screenshot', 'pc-vosk-reale.png') });
    await page.click('#btn-voce'); // ferma
    assert.deepEqual(letti, FRASI.map((f) => f[1]));
    assert.deepEqual(errori, []);
  } finally {
    await ctx.close();
    await server.chiudi();
  }
});
