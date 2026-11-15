'use strict';
// Chiavetta: parte pura del firmware (in C) e protocollo fra sito e firmware.
// Il sito (src/chiavetta.js) prepara testo e pacchetti; il Pico simulato, con lo stesso
// codice C del firmware, li riceve, li controlla e "scrive" i tasti con il layout tedesco.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');
const Chiavetta = require('../src/chiavetta.js');
const Logica = require('../src/logica.js');
const { versioneFirmware, compilatoreOSalta, compila, avviaSimulatore, esa, CHIAVETTA } = require('./chiavetta-sim');

const { cc, salta: senzaCompilatore } = compilatoreOSalta();

const IMP = { ritardoCarattere: 30, ritardoInvio: 200, coppiePerPressione: 0, decAng: 2, decAlt: 2 };

function valoriDa(righe) {
  const a = Logica.analizza(righe, { modo: 'separatore', decAng: 2, decAlt: 2 });
  assert.ok(a.valido);
  return a.valori;
}

test('firmware: test della parte pura in C', { skip: senzaCompilatore }, () => {
  const exe = compila(cc, 'test_dati', path.join(CHIAVETTA, 'test', 'test_dati.c'));
  const r = spawnSync(exe, [], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, / 0 falliti/);
});

test('sito: CRC-32, testo, pacchetti e risposte', () => {
  assert.equal(Chiavetta.crc32(Buffer.from('123456789')), 0xCBF43926);
  assert.equal(Chiavetta.esa(0xA), '0000000A');

  const valori = valoriDa([['214,94', '26,94'], ['-1,50', '59,30']]);
  const t = Chiavetta.testo(valori, IMP);
  assert.equal(t,
    '# Compilatore misure - valori per la chiavetta\n' +
    '# 2 coppie - decimali angolo 2, altezza 2\n' +
    'ritardo_carattere_ms = 30\nritardo_invio_ms = 200\ncoppie_per_pressione = 0\n' +
    '21494\n2694\n-150\n5930\n');
  assert.ok(/^[\x00-\x7f]*$/.test(t), 'solo ASCII');
  // niente data né ora: stessi valori e impostazioni = stesso codice di controllo, anche in un altro momento
  assert.equal(Chiavetta.testo(valori, IMP), t);
  assert.notEqual(Chiavetta.testo(valori, Object.assign({}, IMP, { ritardoInvio: 300 })), t);

  const byte = Chiavetta.codifica(t);
  const p = Chiavetta.pacchetti(byte, 50);
  assert.equal(String.fromCharCode(p[0][0]), 'I');
  assert.equal(Buffer.from(p[0]).readUInt32LE(1), byte.length);
  assert.equal(Buffer.from(p[0]).readUInt32LE(5), Chiavetta.crc32(byte));
  assert.equal(String.fromCharCode(p[p.length - 1][0]), 'F');
  const ricostruito = Buffer.concat(p.slice(1, -1).map((x) => { assert.equal(x[0], 0x44); assert.ok(x.length <= 51); return Buffer.from(x.subarray(1)); }));
  assert.equal(ricostruito.toString(), t);
  assert.deepEqual([...Chiavetta.telaio(new Uint8Array([0x53]))], [1, 0, 0x53]);
  assert.deepEqual([...Chiavetta.pacchettoCodice(123456)], [0x50, 0x40, 0xE2, 0x01, 0x00]);
  assert.deepEqual([...Chiavetta.pacchettoCodice(null)], [0x50, 0xFF, 0xFF, 0xFF, 0xFF]);

  assert.deepEqual(Chiavetta.risposta('OK 40 3F2A1B9C'), { tipo: 'ok', n: 40, crc: '3F2A1B9C' });
  const e = Chiavetta.risposta('ERRORE RIGA 7');
  assert.equal(e.tipo, 'errore');
  assert.match(e.messaggio, /riga 7/);
  const st = Chiavetta.risposta('STATO 40 6 0000000A BT FERMATO 1.1.0');
  assert.deepEqual([st.tipo, st.n, st.pos, st.crc, st.bluetooth, st.stato, st.versione], ['stato', 40, 6, '0000000A', true, 'FERMATO', '1.1.0']);
  assert.equal(Chiavetta.risposta('STATO 40 6 0000000A NOBT FERMATO').versione, null);   // firmware senza versione
  assert.equal(Chiavetta.risposta('STATO 40 6 0000000A NOBT FERMATO').bluetooth, false);
  assert.ok(Chiavetta.confrontaVersioni('1.0.9', '1.1.0') < 0);
  assert.ok(Chiavetta.confrontaVersioni('1.10.0', '1.9.3') > 0);
  assert.equal(Chiavetta.confrontaVersioni('2.0.0', '2.0.0'), 0);
  assert.equal(Chiavetta.versionePubblicata(), null, 'nel sorgente il segnaposto non è sostituito');
  assert.equal(Chiavetta.risposta('CODICE SPENTO').attivo, false);
  assert.equal(Chiavetta.risposta('boh').tipo, 'sconosciuta');

  assert.equal(Chiavetta.controlla(valori, IMP), null);
  assert.match(Chiavetta.controlla(valori.slice(0, 3), IMP), /dispari/);
  assert.match(Chiavetta.controlla(valoriDa([['1234567890', '1']]).slice(0, 2), IMP), /troppe cifre/);
  assert.match(Chiavetta.controlla(valori, Object.assign({}, IMP, { ritardoCarattere: 0 })), /tasti/);
});

test('sito e firmware usano le stesse costanti (UUID, USB, limiti, errori, stati)', () => {
  const fs = require('fs');
  const leggi = (f) => fs.readFileSync(path.join(CHIAVETTA, 'src', f), 'utf8');
  const datiH = leggi('dati.h'), datiC = leggi('dati.c'), usbC = leggi('usb.c'), bleC = leggi('ble.c');
  const gatt = leggi('chiavetta.gatt'), motoreC = leggi('motore.c');
  const define = (testo, nome) => parseInt(new RegExp('#define\\s+' + nome + '\\s+(0x[0-9a-fA-F]+|\\d+)').exec(testo)[1]);

  assert.equal(define(datiH, 'DATI_MAX_TESTO'), Chiavetta.MAX_TESTO);
  assert.equal(define(datiH, 'DATI_MAX_VALORI'), Chiavetta.MAX_VALORI);
  assert.equal(define(datiH, 'DATI_MAX_CIFRE'), Chiavetta.MAX_CIFRE);
  assert.equal(define(usbC, 'USB_VID'), Chiavetta.USB_VID);
  assert.equal(define(usbC, 'PID_CARICAMENTO'), Chiavetta.USB_PID_CARICAMENTO);

  // UUID: servizio e caratteristiche nel GATT, nomi delle maniglie in ble.c, annuncio al contrario
  const uuid = gatt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
  assert.deepEqual(uuid, [Chiavetta.SERVIZIO, Chiavetta.COMANDO, Chiavetta.RISPOSTA]);
  assert.ok(bleC.includes('H_COMANDO      ATT_CHARACTERISTIC_' + Chiavetta.COMANDO.replace(/-/g, '_')));
  assert.ok(bleC.includes('H_RISPOSTA     ATT_CHARACTERISTIC_' + Chiavetta.RISPOSTA.replace(/-/g, '_')));
  const annuncio = /0x11, BLUETOOTH_DATA_TYPE_COMPLETE_LIST_OF_128_BIT_SERVICE_CLASS_UUIDS,[^\n]*\n[^\n]*\n\s*([^\n]*)/.exec(bleC)[1];
  const byteAnnuncio = annuncio.match(/0x[0-9a-f]{2}/g).map((x) => x.slice(2)).reverse().join('');
  assert.equal(byteAnnuncio, Chiavetta.SERVIZIO.replace(/-/g, ''));

  // impostazioni: stessi nomi e limiti
  const impC = [...datiC.matchAll(/\{ "(\w+)",\s*(\d+), (\d+),/g)].map((m) => ({ nome: m[1], min: +m[2], max: +m[3] }));
  assert.deepEqual(impC, Chiavetta.IMPOSTAZIONI.map((x) => ({ nome: x.nome, min: x.min, max: x.max })));

  // ogni errore e ogni stato del firmware ha la sua spiegazione nel sito
  const erroriC = [...datiC.matchAll(/\[ERR_\w+\] = "(\w+)"/g)].map((m) => m[1]);
  assert.ok(erroriC.length >= 12);
  assert.deepEqual(erroriC.filter((e) => !Chiavetta.ERRORI[e]), []);
  const statiC = [...motoreC.matchAll(/case ST_\w+: return "(\w+)";/g)].map((m) => m[1]).concat(['CARICAMENTO']);
  assert.deepEqual(statiC.filter((s) => !Chiavetta.STATI[s]), []);
});

test('versione del firmware: una sola, dal CMakeLists al sito', () => {
  const fs = require('fs');
  const v = versioneFirmware();
  assert.match(v, /^\d+\.\d+\.\d+$/);
  const cmake = fs.readFileSync(path.join(CHIAVETTA, 'CMakeLists.txt'), 'utf8');
  assert.match(cmake, /FIRMWARE_VERSIONE="\$\{PROJECT_VERSION\}"/, 'il firmware la prende dal progetto');
  assert.match(cmake, /pico_set_program_version\(chiavetta "\$\{PROJECT_VERSION\}"\)/, 'anche picotool');
  const pagina = fs.readFileSync(path.join(__dirname, '..', 'sito', 'index.html'), 'utf8');
  assert.ok(pagina.includes("var VERSIONE_PUBBLICATA = '" + v + "';"), 'build.js la scrive nella pagina');
  assert.ok(!pagina.includes('__VERSIONE_FIRMWARE__'));
});

test('sito e firmware insieme: cavo, Bluetooth, tasti scritti ed errori', { skip: senzaCompilatore }, async () => {
  const sim = avviaSimulatore(compila(cc, 'simulatore', path.join(CHIAVETTA, 'test', 'simulatore.c')));
  try {
    // 100 coppie dal generatore, con qualche negativo
    const righe = [], attese = [];
    for (let i = 0; i < 100; i++) {
      const ang = (i * 7919) % 36000 - (i % 17 === 0 ? 50000 : 0), alt = (i * 104729) % 9000 + 1;
      const conSep = (c) => (c < 0 ? '-' : '') + Math.floor(Math.abs(c) / 100) + ',' + String(Math.abs(c) % 100).padStart(2, '0');
      righe.push([conSep(ang), conSep(alt)]);
      attese.push(String(ang), String(alt));
    }
    const valori = valoriDa(righe);
    assert.deepEqual(valori.map((v) => v.cifre), attese.map((x) => String(+x)));
    const byte = Chiavetta.codifica(Chiavetta.testo(valori, IMP));
    const crc = Chiavetta.esa(Chiavetta.crc32(byte));

    // con il cavo, pezzi da 1024 e telai attaccati come li manda il browser
    assert.deepEqual(await sim.comando('MODO caricamento'), ['OK']);
    const flusso = Buffer.concat(Chiavetta.pacchetti(byte, 1024).map((p) => Buffer.from(Chiavetta.telaio(p))));
    for (let i = 0; i < flusso.length; i += 700) {      // arriva a pezzi qualsiasi
      const r = await sim.comando('CAVO ' + esa(flusso.subarray(i, i + 700)));
      if (i + 700 < flusso.length) assert.deepEqual(r, []);
      else assert.deepEqual(r, ['R OK 200 ' + crc]);
    }
    assert.deepEqual(await sim.comando('CAVO ' + esa(Chiavetta.telaio(Chiavetta.pacchettoStato()))),
      ['R STATO 200 0 ' + crc + ' NOBT CARICAMENTO ' + versioneFirmware()]);

    // in macchina: una pressione scrive tutto, con il layout tedesco
    await sim.comando('MODO tastiera');
    const [scritto] = await sim.comando('PREMI 100');
    assert.equal(scritto, 'K ' + attese.map((x) => String(+x) + '\\n').join(''));
    assert.deepEqual(await sim.comando('STATO'), ['S FINITO 200 200']);
    // finito: un'altra pressione breve non riscrive
    assert.deepEqual(await sim.comando('PREMI 100'), ['K ']);

    // via Bluetooth, pezzi da 180, con 2 coppie per pressione
    const valori2 = valoriDa([['1,00', '2,00'], ['3,00', '4,00'], ['5,00', '6,00']]);
    const byte2 = Chiavetta.codifica(Chiavetta.testo(valori2, Object.assign({}, IMP, { coppiePerPressione: 2 })));
    const crc2 = Chiavetta.esa(Chiavetta.crc32(byte2));
    const pac = Chiavetta.pacchetti(byte2, 180);
    for (let i = 0; i < pac.length; i++) {
      const r = await sim.comando('BT ' + esa(pac[i]));
      assert.deepEqual(r, [i < pac.length - 1 ? 'R' : 'R OK 6 ' + crc2]);
    }
    assert.deepEqual(await sim.comando('PREMI 100'), ['K 100\\n200\\n300\\n400\\n']);
    assert.deepEqual(await sim.comando('PREMI 100'), ['K 500\\n600\\n']);

    // tre tasti: Ricomincia torna alla prima coppia; Ferma si ferma dopo il valore in corso;
    // Ricomincia mentre scrive non fa niente
    assert.deepEqual(await sim.comando('PREMI RICOMINCIA 0-100'), ['K ']);
    assert.deepEqual(await sim.comando('STATO'), ['S PRONTO 0 6']);
    assert.deepEqual(await sim.comando('PREMI SCRIVI 0-100 FERMA 1150-1250'), ['K 100\\n']);
    assert.deepEqual(await sim.comando('STATO'), ['S FERMATO 1 6']);
    assert.deepEqual(await sim.comando('PREMI SCRIVI 0-100'), ['K 200\\n300\\n400\\n']);
    assert.deepEqual(await sim.comando('PREMI SCRIVI 0-100 RICOMINCIA 1200-1300'), ['K 500\\n600\\n']);
    assert.deepEqual(await sim.comando('STATO'), ['S FINITO 6 6']);

    // dati rovinati: scartati, restano i valori di prima
    const rovinato = Chiavetta.pacchetti(byte, 180);
    rovinato[3] = Uint8Array.from(rovinato[3]); rovinato[3][5] ^= 1;
    let ultima;
    for (const p of rovinato) ultima = await sim.comando('BT ' + esa(p));
    assert.deepEqual(ultima, ['R ERRORE CRC 0']);
    assert.deepEqual(await sim.comando('STATO'), ['S FINITO 6 6']);

    // riga non valida (il sito non la manderebbe: testo scritto a mano)
    const cattivo = Chiavetta.codifica('1\n2\n3,5\n4\n');
    for (const p of Chiavetta.pacchetti(cattivo, 180)) ultima = await sim.comando('BT ' + esa(p));
    assert.deepEqual(ultima, ['R ERRORE RIGA 3']);
    assert.equal(Chiavetta.risposta(ultima[0].slice(2)).messaggio, 'La chiavetta ha rifiutato i dati: una riga non è un valore valido (riga 3).');

    // il codice Bluetooth non si cambia via Bluetooth
    assert.deepEqual(await sim.comando('BT ' + esa(Chiavetta.pacchettoCodice(123456))), ['R ERRORE CODICE 0']);
    assert.deepEqual(await sim.comando('CAVO ' + esa(Chiavetta.telaio(Chiavetta.pacchettoCodice(123456)))), ['R CODICE OK']);
    assert.deepEqual(await sim.comando('CAVO ' + esa(Chiavetta.telaio(Chiavetta.pacchettoCodice(null)))), ['R CODICE SPENTO']);
  } finally {
    sim.chiudi();
  }
});
