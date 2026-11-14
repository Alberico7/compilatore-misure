'use strict';
// Scheda "Chiavetta" del sito: Bluetooth e WebUSB del browser sono simulati e collegati
// al Pico simulato (stesso codice C del firmware). Si controlla tutto il giro:
// tabella -> sito -> pacchetti -> firmware -> tasti scritti in macchina.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { avviaServer } = require('./server');
const { versioneFirmware, compilatoreOSalta, compila, avviaSimulatore, CHIAVETTA } = require('./chiavetta-sim');

const { cc, salta } = compilatoreOSalta();
const CARTELLA_SCREENSHOT = path.join(__dirname, 'screenshot');

let browser, server, eseguibile;
test.before(async () => {
  if (salta) return;
  browser = await chromium.launch(process.env.CI ? {} : { channel: 'msedge' });
  server = await avviaServer(path.join(__dirname, '..', 'sito'));
  eseguibile = compila(cc, 'simulatore-pagina', path.join(CHIAVETTA, 'test', 'simulatore.c'));
  fs.mkdirSync(CARTELLA_SCREENSHOT, { recursive: true });
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.chiudi();
});

/* Nel browser: navigator.usb e navigator.bluetooth finti che passano i byte a window.__sim
   (il Pico simulato, in Node). opzioni: { senzaApi, senzaBt, senzaUsb, annullaScelta, rovina, versione }
   versione: cambia la versione nelle risposte di stato ('nessuna' = firmware vecchio, senza versione). */
function dispositiviFinti(opzioni) {
  const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
  const byteDi = (d) => new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d);
  window.__finto = { scelte: [], filtri: [] };
  if (opzioni.senzaApi) {
    Object.defineProperty(navigator, 'usb', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true });
    return;
  }
  function annulla() {
    const e = new Error('User cancelled the requestDevice() chooser.');
    e.name = 'NotFoundError';
    return Promise.reject(e);
  }
  function trasforma(testo) {
    if (!opzioni.versione || !testo.startsWith('STATO ')) return testo;
    const p = testo.split(' ');
    if (opzioni.versione === 'nessuna') p.pop(); else p[6] = opzioni.versione;
    return p.join(' ');
  }
  let contatoreD = 0;
  function forse_rovina(u8) {
    if (opzioni.rovina && u8[0] === 0x44 && ++contatoreD === 1) { u8 = u8.slice(); u8[u8.length - 1] ^= 1; }
    return u8;
  }

  const usb = {
    requestDevice: async ({ filters }) => {
      window.__finto.filtri.push(filters);
      if (opzioni.annullaScelta) return annulla();
      window.__finto.scelte.push('usb');
      let coda = '', inAttesa = null;
      return {
        productName: 'Chiavetta misure - caricamento', configuration: null,
        open: async () => {}, close: async () => {},
        selectConfiguration: async function () { this.configuration = { configurationValue: 1 }; },
        claimInterface: async () => {},
        transferOut: async (ep, dati) => {
          let u8 = byteDi(dati);
          // il telaio: [lung][lung][pacchetto]
          if (u8[2] === 0x44) u8 = Uint8Array.from([u8[0], u8[1]].concat(Array.from(forse_rovina(u8.subarray(2)))));
          const righe = await window.__sim('CAVO ' + hex(u8));
          righe.forEach((r) => { coda += trasforma(r.slice(2)) + '\n'; });
          if (inAttesa && coda) { const f = inAttesa; inAttesa = null; f(); }
          return { status: 'ok', bytesWritten: u8.length };
        },
        transferIn: async () => {
          if (!coda) await new Promise((ok) => { inAttesa = ok; });
          const pezzo = coda.slice(0, 64); coda = coda.slice(64);
          return { status: 'ok', data: new DataView(new TextEncoder().encode(pezzo).buffer) };
        },
      };
    },
  };

  const bluetooth = {
    requestDevice: async ({ filters }) => {
      window.__finto.filtri.push(filters);
      if (opzioni.annullaScelta) return annulla();
      window.__finto.scelte.push('bluetooth');
      const ascoltatori = [];
      const risposta = {
        addEventListener: (tipo, f) => ascoltatori.push(f),
        startNotifications: async () => risposta,
      };
      const comando = {
        writeValueWithResponse: async (dati) => {
          const righe = await window.__sim('BT ' + hex(forse_rovina(byteDi(dati))));
          const testo = trasforma(righe[0].slice(2));
          if (testo) {
            const valore = new DataView(new TextEncoder().encode(testo).buffer);
            setTimeout(() => ascoltatori.forEach((f) => f({ target: { value: valore } })), 5);
          }
        },
      };
      const servizio = { getCharacteristic: async (u) => (u.startsWith('0f600002') ? comando : risposta) };
      const gatt = { connected: false, connect: async () => { gatt.connected = true; return { getPrimaryService: async () => servizio }; },
        disconnect: () => { gatt.connected = false; } };
      return { name: 'Chiavetta misure', gatt };
    },
  };
  Object.defineProperty(navigator, 'usb', { value: opzioni.senzaUsb ? undefined : usb, configurable: true });
  Object.defineProperty(navigator, 'bluetooth', { value: opzioni.senzaBt ? undefined : bluetooth, configurable: true });
}

async function nuovaPagina(sim, opzioni = {}, { telefono = false } = {}) {
  const ctx = await browser.newContext(telefono
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    : { viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  await ctx.exposeFunction('__sim', (riga) => sim.comando(riga));
  await ctx.addInitScript(dispositiviFinti, opzioni);
  const page = await ctx.newPage();
  const erroriJs = [];
  page.on('pageerror', (e) => erroriJs.push(e.message));
  await page.goto(server.url);
  page.erroriJs = erroriJs;
  return page;
}

async function scrivi(page, coppie) {
  for (let i = 0; i < coppie.length; i++) {
    await page.fill(`#corpo-tabella input[data-r="${i}"][data-c="0"]`, coppie[i][0]);
    await page.fill(`#corpo-tabella input[data-r="${i}"][data-c="1"]`, coppie[i][1]);
  }
  await page.click('#tab-chiavetta');
}

/* Sceglie il collegamento e preme un pulsante della scheda: 'invia' o 'controlla'. */
async function premi(page, mezzo, pulsante) {
  await page.check(`input[name=ch-mezzo][value=${mezzo}]`);
  await page.click('#btn-ch-' + pulsante);
}

async function esito(page, classe) {
  // non i messaggi intermedi ("Collegamento…", "Lettura dello stato…")
  const m = page.locator('#esito-chiavetta .messaggio.' + classe).filter({ hasNotText: '…' });
  await m.waitFor();
  return m.innerText();
}

const COPPIE = [['214,94', '26,94'], ['313,16', '82,38'], ['-1,5', '59,30']];
const SCRITTO = 'K 21494\\n2694\\n31316\\n8238\\n-150\\n5930\\n';

test('Bluetooth: invio, conferma con lo stesso codice di controllo, poi la chiavetta scrive i valori', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    const page = await nuovaPagina(sim);
    await scrivi(page, COPPIE);
    const pronti = await page.locator('#esito-chiavetta').innerText();
    const crc = /controllo (\w{8})/.exec(pronti)[1];
    assert.match(pronti, /3 coppie \(6 valori\)/);
    assert.ok(await page.locator('input[name=ch-mezzo][value=bluetooth]').isChecked(), 'Bluetooth predefinito');
    await page.click('#btn-ch-invia');
    await page.locator('#esito-chiavetta .messaggio.ok').waitFor();
    const esito = await page.locator('#esito-chiavetta').innerText();
    assert.match(esito, new RegExp('6 valori caricati, codice di controllo ' + crc + ' uguale a quello del sito'));
    assert.deepEqual(await page.evaluate(() => window.__finto.filtri),
      [[{ services: ['0f600001-7d5c-4ab1-a5aa-df4e1c99d7c0'] }]]);
    assert.deepEqual(await sim.comando('PREMI 100'), [SCRITTO]);
    // cambiando un valore, l'esito vecchio sparisce
    await page.click('#tab-barre');
    await page.fill('#corpo-tabella input[data-r="0"][data-c="0"]', '214,95');
    await page.click('#tab-chiavetta');
    assert.match(await page.locator('#esito-chiavetta').innerText(), /Pronti da inviare/);
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('cavo (WebUSB): invio con le impostazioni scelte, anche da telefono', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    await sim.comando('MODO caricamento');
    const page = await nuovaPagina(sim, {}, { telefono: true });
    await scrivi(page, COPPIE);
    await page.evaluate(() => { document.getElementById('ch-scrittura').open = true; });
    await page.fill('#ch-coppie', '1');
    await page.locator('#ch-coppie').dispatchEvent('change');
    await premi(page, 'cavo', 'invia');
    await page.locator('#esito-chiavetta .messaggio.ok').waitFor();
    assert.match(await page.locator('#esito-chiavetta').innerText(), /ricollegala senza premere il pulsante/);
    assert.deepEqual(await page.evaluate(() => window.__finto.filtri), [[{ vendorId: 0x1209, productId: 0x0006 }]]);
    await sim.comando('MODO tastiera');
    assert.deepEqual(await sim.comando('PREMI 100'), ['K 21494\\n2694\\n']);
    assert.deepEqual(await sim.comando('PREMI 100'), ['K 31316\\n8238\\n']);
    await page.locator('#pannello-chiavetta').screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'chiavetta-telefono.png') });
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('codice Bluetooth: generato, impostato solo con il cavo dopo conferma, poi spento', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    const page = await nuovaPagina(sim);
    await page.click('#tab-chiavetta');
    await page.click('.ch-avanzate summary');
    await page.click('#btn-ch-codice');
    assert.match(await page.locator('#esito-chiavetta').innerText(), /6 cifre/);
    await page.click('#btn-ch-genera');
    const codice = await page.inputValue('#ch-codice');
    assert.match(codice, /^\d{6}$/);
    await page.click('#btn-ch-codice');
    assert.match(await page.locator('#conferma-testo').innerText(), new RegExp('codice ' + codice));
    await page.click('#conferma-si');
    await page.locator('#esito-chiavetta .messaggio.ok').waitFor();
    assert.match(await page.locator('#esito-chiavetta').innerText(), /Codice impostato/);
    await page.click('#btn-ch-spegni');
    await page.click('#conferma-si');
    await page.locator('#esito-chiavetta .messaggio.ok').filter({ hasText: 'spento' }).waitFor();
    // solo cifre, al massimo 6
    await page.fill('#ch-codice', '12a34567');
    await page.locator('#ch-codice').dispatchEvent('input');
    assert.equal(await page.inputValue('#ch-codice'), '123456');
    // il codice non finisce nel salvataggio del browser
    assert.doesNotMatch(await page.evaluate(() => localStorage.getItem('compilatore-misure-v1')), new RegExp(codice));
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('errori: dati non validi, scelta annullata, dati rovinati, browser senza Bluetooth e WebUSB', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    // valori non validi: niente invio
    let page = await nuovaPagina(sim);
    await scrivi(page, [['214,94', 'abc']]);
    assert.ok(await page.locator('#btn-ch-invia').isDisabled());
    assert.ok(await page.locator('#btn-ch-controlla').isEnabled(), 'controllare si può anche con la tabella sbagliata');
    assert.match(await page.locator('#esito-chiavetta').innerText(), /Correggi i valori/);
    await page.context().close();

    // troppe cifre per la chiavetta
    page = await nuovaPagina(sim);
    await scrivi(page, [['12345678,90', '1']]);
    assert.ok(await page.locator('#btn-ch-invia').isDisabled());
    assert.match(await page.locator('#esito-chiavetta').innerText(), /troppe cifre/);
    await page.context().close();

    // scelta del dispositivo annullata
    page = await nuovaPagina(sim, { annullaScelta: true });
    await scrivi(page, COPPIE);
    await page.click('#btn-ch-invia');
    await page.locator('#esito-chiavetta .messaggio.errore').waitFor();
    assert.match(await page.locator('#esito-chiavetta').innerText(), /Nessuna chiavetta scelta/);
    assert.ok(await page.locator('#btn-ch-invia').isEnabled());
    await page.context().close();

    // un byte cambiato per strada: la chiavetta rifiuta, il sito lo dice
    page = await nuovaPagina(sim, { rovina: true });
    await scrivi(page, COPPIE);
    await page.click('#btn-ch-invia');
    await page.locator('#esito-chiavetta .messaggio.errore').waitFor();
    assert.match(await page.locator('#esito-chiavetta').innerText(), /rovinati/);
    await page.context().close();

    // browser senza Bluetooth e WebUSB (es. Firefox): pulsanti nascosti e spiegazione
    page = await nuovaPagina(sim, { senzaApi: true });
    await scrivi(page, COPPIE);
    assert.ok(await page.locator('#btn-ch-invia').isHidden());
    assert.ok(await page.locator('#btn-ch-controlla').isHidden());
    assert.ok(await page.locator('#ch-mezzo').isHidden());
    assert.match(await page.locator('#ch-supporto').innerText(), /Bluetooth.*WebUSB/s);
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('screenshot della scheda Chiavetta sul PC', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    const page = await nuovaPagina(sim);
    await scrivi(page, COPPIE);
    await page.click('#btn-ch-invia');
    await page.locator('#esito-chiavetta .messaggio.ok').waitFor();
    await page.click('#btn-ch-controlla');
    await page.locator('#esito-chiavetta .messaggio.ok').filter({ hasText: 'Uguali' }).waitFor();
    await page.click('.ch-avanzate summary');
    await page.locator('#sez-codici').screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'chiavetta-pc.png') });
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('Controlla la chiavetta: avanzamento, confronto con la tabella (valori e impostazioni), versione', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    const page = await nuovaPagina(sim);
    await scrivi(page, COPPIE);
    await page.evaluate(() => { document.getElementById('ch-scrittura').open = true; });
    await page.fill('#ch-coppie', '1');
    await page.locator('#ch-coppie').dispatchEvent('change');
    await premi(page, 'bluetooth', 'invia');
    await esito(page, 'ok');

    await page.click('#btn-ch-controlla');
    let t = await esito(page, 'ok');
    assert.match(t, /6 valori, pronta a scrivere dall'inizio/);
    assert.match(t, /Uguali ai valori e alle impostazioni della tabella/);
    assert.match(t, new RegExp('Firmware ' + versioneFirmware().replace(/\./g, '\\.') + '\\.'));

    // la chiavetta scrive una coppia (1 coppia per pressione) e si ferma
    assert.deepEqual(await sim.comando('PREMI 100'), ['K 21494\\n2694\\n']);
    await page.click('#btn-ch-controlla');
    t = await page.locator('#esito-chiavetta .messaggio').filter({ hasText: 'Fermata' }).innerText();
    assert.match(t, /Fermata dopo il valore 2 di 6: una pressione breve riprende/);
    assert.deepEqual(await sim.comando('STATO'), ['S FERMATO 2 6'], 'controllare non cambia niente');

    // un valore diverso nella tabella
    await page.click('#tab-barre');
    await page.fill('#corpo-tabella input[data-r="1"][data-c="1"]', '82,39');
    await page.click('#tab-chiavetta');
    await page.click('#btn-ch-controlla');
    assert.match(await esito(page, 'avviso'), /Diversi dalla tabella/);
    // stessi valori, impostazione diversa
    await page.click('#tab-barre');
    await page.fill('#corpo-tabella input[data-r="1"][data-c="1"]', '82,38');
    await page.click('#tab-chiavetta');
    await page.evaluate(() => { document.getElementById('ch-scrittura').open = true; });
    await page.fill('#ch-rit-inv', '300');
    await page.locator('#ch-rit-inv').dispatchEvent('change');
    await page.click('#btn-ch-controlla');
    assert.match(await esito(page, 'avviso'), /Diversi dalla tabella/);
    // di nuovo come prima: uguali
    await page.fill('#ch-rit-inv', '200');
    await page.locator('#ch-rit-inv').dispatchEvent('change');
    await page.click('#btn-ch-controlla');
    assert.match(await esito(page, 'ok'), /Uguali/);
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('Controlla la chiavetta: firmware vecchio, con o senza versione', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    let page = await nuovaPagina(sim, { versione: 'nessuna' });
    await scrivi(page, COPPIE);
    await page.click('#btn-ch-controlla');
    assert.match(await esito(page, 'avviso'), /versione precedente: aggiornalo/);
    await page.context().close();

    page = await nuovaPagina(sim, { versione: '0.9.0' });
    await scrivi(page, COPPIE);
    assert.equal(await page.locator('#ch-versione').textContent(), versioneFirmware());
    await page.click('#btn-ch-controlla');
    assert.match(await esito(page, 'avviso'), new RegExp('Firmware 0\\.9\\.0: è disponibile la ' + versioneFirmware().replace(/\./g, '\\.')));
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('collegamento: scelta ricordata; con un solo collegamento disponibile si vede solo quello', { skip: salta }, async () => {
  const sim = avviaSimulatore(eseguibile);
  try {
    let page = await nuovaPagina(sim);
    await scrivi(page, COPPIE);
    await page.check('input[name=ch-mezzo][value=cavo]');
    await page.reload();
    await page.click('#tab-chiavetta');
    assert.ok(await page.locator('input[name=ch-mezzo][value=cavo]').isChecked());
    await page.context().close();

    page = await nuovaPagina(sim, { senzaBt: true });
    await scrivi(page, COPPIE);
    assert.ok(await page.locator('#lbl-ch-bt').isHidden());
    assert.ok(await page.locator('input[name=ch-mezzo][value=cavo]').isChecked());
    assert.match(await page.locator('#ch-supporto').innerText(), /Bluetooth/);
    await sim.comando('MODO caricamento');
    await page.click('#btn-ch-invia');
    assert.match(await esito(page, 'ok'), /6 valori caricati/);
    assert.deepEqual(await page.evaluate(() => window.__finto.scelte), ['usb']);
    await page.context().close();

    page = await nuovaPagina(sim, { senzaUsb: true });
    await scrivi(page, COPPIE);
    assert.ok(await page.locator('#lbl-ch-cavo').isHidden());
    assert.ok(await page.locator('#btn-ch-codice').isDisabled(), 'il codice si imposta solo con il cavo');
    await page.context().close();
  } finally { sim.chiudi(); }
});

test('guida e titolo: tabelle "Pulsante" e "LED" uguali al LEGGIMI, sezione 2 "In macchina"', { skip: salta }, async () => {
  const { righeTabella, testoCella, TABELLE } = require('../src/tabelle-md');
  const leggimi = fs.readFileSync(path.join(CHIAVETTA, 'LEGGIMI.md'), 'utf8');
  const sim = avviaSimulatore(eseguibile);
  try {
    const page = await nuovaPagina(sim);
    assert.equal((await page.locator('#sez-codici h2').innerText()).replace(/\s+/g, ' ').trim(), '2 In macchina: chiavetta o codici');
    assert.equal(await page.locator('nav.indice a[href="#sez-codici"]').innerText(), '2 · In macchina');
    const tabelle = await page.$$eval('#sez-guida details table', (ts) => ts.map((t) =>
      Array.from(t.rows, (r) => Array.from(r.cells, (c) => c.textContent.trim()))));
    assert.deepEqual(tabelle, TABELLE.map((t) => righeTabella(leggimi, t).map((r) => r.map(testoCella))));
    assert.equal(tabelle.length, 2);
    assert.ok(tabelle[1].length >= 7, 'tutte le righe del LED');
    await page.context().close();
  } finally { sim.chiudi(); }
});
