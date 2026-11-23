'use strict';
// Dettatura sul sito, con un riconoscitore simulato al posto di Vosk (il vero Vosk: test/vosk-reale.test.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { chromium } = require('playwright');
const { avviaServer } = require('./server');
const { usaDecimali } = require('./aiuti-pagina');

let browser, server;
test.before(async () => {
  browser = await chromium.launch(process.env.CI ? {} : { channel: 'msedge' });
  server = await avviaServer(path.join(__dirname, '..', 'sito'));
});
test.after(async () => { await browser.close(); await server.chiudi(); });

/* Motore simulato: stessa interfaccia del motore Vosk (prepara, avvia, ferma, chiudiMicrofono).
   Il test detta con window.__voce.dici(testo) (frase chiusa da una pausa) e window.__voce.finale = testo
   (quello che Vosk restituisce quando si lascia il pulsante). */
function simulatore([modelloGiaScaricato, opzioni]) {
  window.__modelloSimulatoScaricato = modelloGiaScaricato;
  // tentativi: chiamate a prepara; ritardo: ms di preparazione; fallisci: la prossima preparazione non riesce
  window.__voce = Object.assign({ preparato: 0, tentativi: 0, ritardo: 0, fallisci: false, avviato: 0, attivo: false, finale: '' }, opzioni);
  window.__motoreVoceSimulato = () => {
    const m = {
      prepara: async (avanzamento) => {
        window.__voce.tentativi++;
        if (window.__voce.ritardo) await new Promise((ok) => setTimeout(ok, window.__voce.ritardo));
        if (window.__voce.fallisci) { window.__voce.fallisci = false; throw new Error('memoria insufficiente'); }
        avanzamento('Scaricamento: 25,0 di 49,7 MB', 0.5); window.__voce.preparato++;
      },
      avvia: async (g) => { m.g = g; window.__voce.avviato++; window.__voce.attivo = true; },
      ferma: async () => {
        window.__voce.attivo = false;
        const t = window.__voce.finale; window.__voce.finale = '';
        return { testo: t, audioMs: 1500, ms: 20 };
      },
      chiudiMicrofono: () => { window.__voce.attivo = false; },
    };
    window.__voce.dici = (t) => m.g.onRisultato(t);
    window.__voce.parziale = (t) => m.g.onParziale(t);
    return m;
  };
}

async function nuovaPagina({ telefono = false, giaScaricato = true, simulato = true, voce = {}, prima = null, decimali = [2, 2] } = {}) {
  const ctx = await browser.newContext(telefono
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    : { viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  if (simulato) await ctx.addInitScript(simulatore, [giaScaricato, voce]);
  if (prima) await ctx.addInitScript(prima);
  const page = await ctx.newPage();
  page.erroriJs = [];
  page.on('pageerror', (e) => page.erroriJs.push(e.message));
  await page.goto(server.url);
  if (decimali) await usaDecimali(page, decimali);
  return page;
}

const valore = (page, r, c) => page.inputValue(`#cella-${r}-${c}`);
const attivo = (page) => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
const statoVoce = (page) => page.locator('#voce-stato').innerText();

async function tieniPremutoEDici(page, frase, sel = '#btn-voce') {
  const b = await page.locator(sel).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.__voce.attivo);
  await page.evaluate((f) => { window.__voce.parziale(f); window.__voce.finale = f; }, frase);
  await page.mouse.up();
  await page.waitForFunction(() => !window.__voce.attivo);
}

test('le librerie della voce non si scaricano finché non si usa il microfono', async () => {
  const page = await nuovaPagina({ simulato: false });
  assert.equal(await page.locator('#voce').isVisible(), true, 'sul sito la dettatura c\'è');
  await page.fill('#cella-0-0', '20,5');
  assert.ok(!server.richieste.some((u) => u.startsWith('/voce/')), 'nessuna richiesta a voce/*.js');
  // primo uso senza modello: chiede conferma; "Annulla" non scarica niente
  await page.click('#btn-voce');
  await page.locator('#conferma').waitFor();
  assert.match(await page.locator('#conferma-testo').innerText(), /Circa 50 MB/);
  await page.click('#conferma-no');
  assert.ok(!server.richieste.some((u) => u.startsWith('/voce/')));
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('primo uso: conferma dello scaricamento, poi "tieni premuto" scrive e passa alla casella dopo', async () => {
  const page = await nuovaPagina({ giaScaricato: false });
  await page.click('#cella-0-0');
  await page.click('#btn-voce'); // primo tocco: chiede di scaricare, non ascolta ancora
  await page.locator('#conferma').waitFor();
  await page.click('#conferma-si');
  await page.waitForFunction(() => window.__voce.preparato === 1);
  assert.match(await statoVoce(page), /pronto/i);
  assert.equal(await page.evaluate(() => window.__voce.avviato), 0, 'il microfono non si apre senza tenere premuto');
  await tieniPremutoEDici(page, 'duecentoquattordici virgola nove quattro');
  assert.equal(await valore(page, 0, 0), '214,94');
  assert.equal(await attivo(page), 'Dato 1');
  assert.match(await statoVoce(page), /Capito: 214,94 \(Grado 1\) → in macchina 214\.94/);
  await tieniPremutoEDici(page, 'ventisei virgola nove quattro');
  assert.equal(await valore(page, 0, 1), '26,94');
  assert.equal(await attivo(page), 'Grado 2');
  await tieniPremutoEDici(page, 'buongiorno');
  assert.match(await statoVoce(page), /Non ho capito: «buongiorno»/);
  assert.equal(await attivo(page), 'Grado 2', 'parole non capite: la casella non cambia');
  assert.equal(await page.locator('#ant-0-0').innerText(), 'In macchina: 214.94');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('"tieni premuto": un valore solo per pressione', async () => {
  const page = await nuovaPagina();
  await page.click('#cella-0-0');
  await tieniPremutoEDici(page, 'due settanta');
  assert.equal(await valore(page, 0, 0), '270');
  assert.equal(await attivo(page), 'Dato 1');
  await tieniPremutoEDici(page, 'due il settanta');
  assert.equal(await valore(page, 0, 1), '270');
  assert.equal(await attivo(page), 'Grado 2');
  await tieniPremutoEDici(page, 'venti trenta');
  assert.match(await statoVoce(page), /Ho sentito più numeri: 20 · 30\. Ridetta il valore\./);
  assert.equal(await valore(page, 1, 0), '');
  assert.equal(await valore(page, 1, 1), '');
  assert.equal(await attivo(page), 'Grado 2', 'niente scritto: la casella non cambia');
  await tieniPremutoEDici(page, 'trenta');
  assert.equal(await valore(page, 1, 0), '30');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('barra spaziatrice tenuta premuta nella tabella (PC)', async () => {
  const page = await nuovaPagina();
  await page.click('#cella-2-1');
  await page.keyboard.down(' ');
  await page.waitForFunction(() => window.__voce.attivo);
  await page.evaluate(() => { window.__voce.finale = 'meno uno virgola cinque'; });
  await page.keyboard.up(' ');
  await page.waitForFunction(() => !window.__voce.attivo);
  assert.equal(await valore(page, 2, 1), '-1,5', 'nessuno spazio scritto nella casella');
  assert.equal(await attivo(page), 'Grado 4');
  assert.match(await page.locator('#riepilogo').innerText(), /Valori negativi/);
  await page.context().close();
});

test('più valori con un tocco, separati dalla pausa: 20 coppie, "correggi" e "stop"', async () => {
  const page = await nuovaPagina();
  await page.selectOption('#voce-modo', 'continuo');
  assert.equal(await page.inputValue('#voce-separatore'), 'pausa', 'pausa predefinita');
  await page.click('#btn-voce');
  await page.waitForFunction(() => window.__voce.attivo);
  assert.match(await page.locator('#btn-voce-testo').innerText(), /tocca per fermare/);
  const frasi = [], attesi = [];
  for (let i = 1; i <= 20; i++) {
    frasi.push(`${['dieci', 'venti', 'trenta', 'quaranta'][i % 4]} virgola ${['uno', 'due', 'tre'][i % 3]}`, `${['cinque', 'sei'][i % 2]} virgola zero ${['quattro', 'otto'][i % 2]}`);
    attesi.push([`${[10, 20, 30, 40][i % 4]},${[1, 2, 3][i % 3]}`, `${[5, 6][i % 2]},0${[4, 8][i % 2]}`]);
  }
  for (let k = 0; k < frasi.length; k++) {
    await page.evaluate((f) => window.__voce.dici(f), frasi[k]);
    if (k === 5) { // valore sbagliato e "correggi"
      await page.evaluate(() => window.__voce.dici('novecento'));
      await page.evaluate(() => window.__voce.dici('correggi'));
    }
  }
  // le righe si aggiungono da sole: la dettatura continua oltre la tabella iniziale (5 righe)
  await page.waitForFunction(() => document.querySelectorAll('#corpo-tabella tr').length === 21);
  assert.ok(await page.evaluate(() => window.__voce.attivo), 'ancora in ascolto');
  for (let i = 0; i < 20; i++) {
    assert.deepEqual([await valore(page, i, 0), await valore(page, i, 1)], attesi[i], 'riga ' + (i + 1));
  }
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cella-20-0', 'pronta per Grado 21');
  await page.evaluate(() => window.__voce.dici('stop'));
  await page.waitForFunction(() => !window.__voce.attivo);
  assert.equal(await valore(page, 20, 0), '', 'niente scritto con "stop"');
  // di nuovo, con "stop"
  await page.click('#cella-3-0');
  await page.click('#btn-voce');
  await page.waitForFunction(() => window.__voce.attivo);
  await page.evaluate(() => window.__voce.dici('cento stop'));
  await page.waitForFunction(() => !window.__voce.attivo);
  assert.equal(await valore(page, 3, 0), '100');
  assert.match(await statoVoce(page), /Dettatura finita/);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('più valori separati da "avanti": anche detti d\'un fiato, con pause a metà numero', async () => {
  const page = await nuovaPagina();
  await page.selectOption('#voce-modo', 'continuo');
  await page.selectOption('#voce-separatore', 'avanti');
  await page.click('#btn-voce');
  await page.waitForFunction(() => window.__voce.attivo);
  await page.evaluate(() => window.__voce.dici('duecento'));             // pausa a metà numero
  assert.equal(await valore(page, 0, 0), '', 'senza "avanti" non si scrive ancora');
  assert.match(await statoVoce(page), /In attesa di «avanti»: 200/);
  await page.evaluate(() => window.__voce.dici('quattordici virgola nove quattro avanti'));
  assert.equal(await valore(page, 0, 0), '214,94');
  await page.evaluate(() => window.__voce.dici('venti avanti trenta virgola cinque avanti'));
  assert.equal(await valore(page, 0, 1), '20');
  assert.equal(await valore(page, 1, 0), '30,5');
  await page.evaluate(() => window.__voce.dici('quaranta'));
  await page.click('#btn-voce'); // fermando, il valore in attesa si scrive (senza passare oltre)
  await page.waitForFunction(() => !window.__voce.attivo);
  assert.equal(await valore(page, 1, 1), '40');
  await page.context().close();
});

test('ascolto continuo: si ferma dopo 30 s di silenzio e se la pagina va in secondo piano', async () => {
  const page = await nuovaPagina();
  await page.clock.install();
  await page.reload();
  await page.selectOption('#voce-modo', 'continuo');
  await page.click('#btn-voce');
  await page.waitForFunction(() => window.__voce.attivo);
  await page.clock.runFor(29000);
  assert.equal(await page.evaluate(() => window.__voce.attivo), true);
  await page.evaluate(() => window.__voce.parziale('venti'));
  await page.clock.runFor(29000);
  assert.equal(await page.evaluate(() => window.__voce.attivo), true, 'parlare riarma il tempo');
  await page.clock.runFor(2000);
  await page.clock.runFor(500);
  assert.equal(await page.evaluate(() => window.__voce.attivo), false);
  assert.match(await statoVoce(page), /30 secondi/);
  await page.click('#btn-voce');
  await page.waitForFunction(() => window.__voce.attivo);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(500);
  assert.equal(await page.evaluate(() => window.__voce.attivo), false);
  assert.match(await statoVoce(page), /secondo piano/);
  await page.context().close();
});

test('telefono: 🎤 nella barra in basso, la tastiera non si apre mentre si detta', async () => {
  const page = await nuovaPagina({ telefono: true });
  await page.tap('#cella-0-0');
  assert.equal(await page.locator('#mob-voce').isVisible(), true);
  await tieniPremutoEDici(page, 'dodici virgola sette cinque', '#mob-voce');
  assert.equal(await valore(page, 0, 0), '12,75');
  assert.equal(await attivo(page), 'Dato 1');
  assert.equal(await page.getAttribute('#cella-0-1', 'inputmode'), 'none', 'tastiera chiusa durante la dettatura');
  await page.tap('#cella-1-0'); // un tocco sceglie la casella: la tastiera resta chiusa
  assert.equal(await page.getAttribute('#cella-1-0', 'inputmode'), 'none');
  await page.tap('#cella-1-0'); // il secondo tocco la apre per scrivere a mano
  assert.equal(await page.getAttribute('#cella-1-0', 'inputmode'), 'decimal');
  const largh = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(largh <= 390, 'nessuno scorrimento orizzontale: ' + largh);
  await page.screenshot({ path: path.join(__dirname, 'screenshot', 'tel-scuro-5-dettatura.png') });
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('screenshot della dettatura sul PC', async () => {
  const page = await nuovaPagina();
  await page.selectOption('#voce-modo', 'continuo');
  await page.click('#cella-0-0');
  await page.click('#btn-voce');
  await page.waitForFunction(() => window.__voce.attivo);
  await page.evaluate(() => { window.__voce.dici('duecentoquattordici virgola nove quattro'); window.__voce.dici('ventisei virgola nove quattro'); window.__voce.parziale('trecentotredici virgola'); });
  await page.locator('#sez-dati').screenshot({ path: path.join(__dirname, 'screenshot', 'pc-scuro-7-dettatura.png') });
  await page.context().close();
});

/* docs/2026-11-19-dettatura-pronta.md: con il modello già nel dispositivo, la dettatura si prepara all'apertura */
const preparando = (page) => page.waitForFunction(() => document.getElementById('btn-voce').classList.contains('caricamento'));

test('dettatura pronta all\'apertura: senza toccare 🎤 e senza aprire il microfono', async () => {
  const page = await nuovaPagina();
  await page.waitForFunction(() => window.__voce.preparato === 1);
  await page.waitForFunction(() => /Dettatura pronta/.test(document.getElementById('voce-stato').textContent));
  assert.equal(await page.evaluate(() => window.__voce.avviato), 0, 'il microfono non si apre');
  assert.equal(await page.locator('#conferma').isVisible(), false);
  await page.click('#cella-0-0');
  await tieniPremutoEDici(page, 'venti virgola cinque');
  assert.equal(await valore(page, 0, 0), '20,5');
  assert.equal(await page.evaluate(() => window.__voce.tentativi), 1, 'non si prepara una seconda volta');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('dettatura pronta all\'apertura: niente senza modello, con l\'impostazione spenta o con la pagina nascosta', async () => {
  // senza modello: nessuna preparazione e nessuna domanda
  let page = await nuovaPagina({ giaScaricato: false });
  await page.waitForTimeout(3000);
  assert.equal(await page.evaluate(() => window.__voce.tentativi), 0);
  assert.equal(await page.locator('#conferma').isVisible(), false);
  assert.equal(await statoVoce(page), '');
  await page.context().close();

  // impostazione spenta: si salva e vale alla riapertura
  page = await nuovaPagina();
  assert.equal(await page.locator('#voce-prepara').isChecked(), true, 'attiva in partenza');
  await page.locator('#voce-prepara').uncheck();
  await page.reload();
  await page.waitForTimeout(3000);
  assert.equal(await page.locator('#voce-prepara').isChecked(), false);
  assert.equal(await page.evaluate(() => window.__voce.tentativi), 0);
  // riaccesa: si prepara subito
  await page.locator('#voce-prepara').check();
  await page.waitForFunction(() => window.__voce.preparato === 1);
  await page.context().close();

  // pagina aperta in secondo piano: aspetta che torni visibile
  page = await nuovaPagina({ prima: () => {
    window.__visibile = 'hidden';
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => window.__visibile });
  } });
  await page.waitForTimeout(3000);
  assert.equal(await page.evaluate(() => window.__voce.tentativi), 0);
  await page.evaluate(() => { window.__visibile = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(() => window.__voce.preparato === 1);
  assert.equal(await page.evaluate(() => window.__voce.avviato), 0);
  await page.context().close();
});

test('tocco durante la preparazione: "tieni premuto" parte alla fine, una volta sola', async () => {
  const page = await nuovaPagina({ voce: { ritardo: 1500 } });
  await page.click('#cella-0-0');
  await preparando(page);
  // tenuto premuto: l'ascolto parte quando è pronto
  await tieniPremutoEDici(page, 'trenta virgola due');
  assert.equal(await valore(page, 0, 0), '30,2');
  assert.equal(await page.evaluate(() => window.__voce.avviato), 1);
  assert.equal(await page.evaluate(() => window.__voce.tentativi), 1);
  await page.context().close();

  // lasciato prima che sia pronto (anche due tocchi): niente ascolto, solo "Pronto"
  const p2 = await nuovaPagina({ voce: { ritardo: 1500 } });
  await preparando(p2);
  const b = await p2.locator('#btn-voce').boundingBox();
  await p2.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p2.mouse.down(); await p2.mouse.up();
  await p2.mouse.down(); await p2.mouse.up();
  await p2.waitForFunction(() => window.__voce.preparato === 1);
  await p2.waitForFunction(() => /Pronto: tieni premuto/.test(document.getElementById('voce-stato').textContent));
  assert.equal(await p2.evaluate(() => window.__voce.avviato), 0);
  assert.deepEqual(p2.erroriJs, []);
  await p2.context().close();
});

test('tocco durante la preparazione: "più valori" parte alla fine, una volta sola', async () => {
  const page = await nuovaPagina({ voce: { ritardo: 1500 } });
  await page.selectOption('#voce-modo', 'continuo');
  await page.reload();
  await preparando(page);
  await page.click('#btn-voce');
  await page.click('#btn-voce'); // il secondo tocco durante l'attesa non apre un altro ascolto
  await page.waitForFunction(() => window.__voce.attivo);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__voce.avviato), 1);
  await page.evaluate(() => window.__voce.dici('dodici'));
  assert.equal(await valore(page, 0, 0), '12');
  await page.click('#btn-voce');
  await page.waitForFunction(() => !window.__voce.attivo);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('preparazione all\'apertura non riuscita: nessun errore a schermo, il tocco riprova', async () => {
  const page = await nuovaPagina({ voce: { fallisci: true } });
  await page.waitForFunction(() => window.__voce.tentativi === 1);
  await page.waitForFunction(() => !document.getElementById('btn-voce').classList.contains('caricamento'));
  assert.equal(await statoVoce(page), '');
  await page.click('#cella-0-0');
  await tieniPremutoEDici(page, 'sette');
  assert.equal(await valore(page, 0, 0), '7');
  assert.equal(await page.evaluate(() => window.__voce.tentativi), 2);

  // tocco durante una preparazione all'apertura che poi fallisce: riprova subito
  const p2 = await nuovaPagina({ voce: { fallisci: true, ritardo: 1500 } });
  await p2.click('#cella-0-0');
  await preparando(p2);
  await tieniPremutoEDici(p2, 'otto');
  assert.equal(await valore(p2, 0, 0), '8');
  assert.equal(await p2.evaluate(() => window.__voce.tentativi), 2);
  assert.deepEqual(page.erroriJs, []);
  assert.deepEqual(p2.erroriJs, []);
  await page.context().close();
  await p2.context().close();
});
