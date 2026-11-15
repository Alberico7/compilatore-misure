// Crea, a partire dai sorgenti in src/:
//  - compilatore-misure.html   file unico completo, da aprire offline sul PC (senza dettatura)
//  - sito/                      il sito per GitHub Pages: index.html (stessa pagina) e voce/ con le
//                               librerie della dettatura, caricate solo al primo uso del microfono
// Uso: npm run build
'use strict';
const fs = require('fs');
const path = require('path');

const src = __dirname;
const radice = path.join(src, '..');
const leggi = (f) => fs.readFileSync(path.join(src, f), 'utf8');

let html = leggi('template.html');
const parti = {
  '/*QRCODE_LIB*/': leggi('vendor/qrcode.js'),
  '/*LOGICA*/': leggi('logica.js'),
  '/*DETTATO*/': leggi('dettato.js'),
  '/*VOCE*/': leggi('voce.js'),
  '/*CHIAVETTA*/': leggi('chiavetta.js'),
  '/*APP_CHIAVETTA*/': leggi('app-chiavetta.js'),
  '/*APP*/': leggi('app.js'),
};
for (const [segnaposto, codice] of Object.entries(parti)) {
  if (!html.includes(segnaposto)) throw new Error('Segnaposto mancante: ' + segnaposto);
  if (/<\/script/i.test(codice)) throw new Error('Il codice contiene </script: ' + segnaposto);
  html = html.split(segnaposto).join(codice);
}
// il template è diviso in due per un'eventuale pubblicazione senza scheletro: qui i segnaposto non servono
html = html.replace('<!--INIZIO_CONTENUTO_HEAD-->\n', '').replace('<!--FINE_CONTENUTO_HEAD-->\n', '');

// Chiavetta: tabelle "Pulsante", "Tasti" e "LED" dal LEGGIMI (fonte unica) e versione del firmware dal CMakeLists
const { tabellaHtml, TABELLE } = require('./tabelle-md');
const leggimi = fs.readFileSync(path.join(radice, 'chiavetta', 'LEGGIMI.md'), 'utf8');
if (!html.includes('<!--TABELLE_CHIAVETTA-->')) throw new Error('Segnaposto mancante: TABELLE_CHIAVETTA');
html = html.replace('<!--TABELLE_CHIAVETTA-->', TABELLE.map((t) => tabellaHtml(leggimi, t)).join('\n'));
const versione = /project\(chiavetta VERSION (\d+\.\d+\.\d+)/.exec(fs.readFileSync(path.join(radice, 'chiavetta', 'CMakeLists.txt'), 'utf8'));
if (!versione) throw new Error('Versione del firmware non trovata in chiavetta/CMakeLists.txt');
if (html.split('__VERSIONE_FIRMWARE__').length !== 2) throw new Error('Segnaposto __VERSIONE_FIRMWARE__ assente o ripetuto');
html = html.replace('__VERSIONE_FIRMWARE__', versione[1]);

// Logo (docs/2026-11-14-logo-pettirosso.md): l'SVG dentro la pagina, così funziona anche il file aperto dal PC.
// Le PNG per "Aggiungi a schermata Home" (npm run icone) esistono solo sul sito: lì si aggiungono i loro link.
const logo = 'data:image/svg+xml;base64,' + Buffer.from(leggi('icona.svg')).toString('base64');
for (const s of ['<!--ICONE-->', '__LOGO__']) if (html.split(s).length !== 2) throw new Error('Segnaposto ' + s + ' assente o ripetuto');
html = html.replace('__LOGO__', logo);
const ICONA_SVG = '<link rel="icon" type="image/svg+xml" href="' + logo + '">';
const ICONE_SITO = ICONA_SVG + '\n<link rel="apple-touch-icon" href="icona-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="icona-192.png">' +
  '\n<link rel="manifest" href="manifest.webmanifest">';   // icone ritagliabili: niente bordo bianco su Android
const htmlSito = html.replace('<!--ICONE-->', ICONE_SITO);
html = html.replace('<!--ICONE-->', ICONA_SVG);

function scrivi(file, testo) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, testo);
  console.log('Creato', path.relative(radice, file), Math.round(testo.length / 1024) + ' KB');
}

scrivi(path.join(radice, 'compilatore-misure.html'), html);

const sito = path.join(radice, 'sito');
fs.rmSync(sito, { recursive: true, force: true });
scrivi(path.join(sito, 'index.html'), htmlSito);
for (const f of ['icona-180.png', 'icona-192.png', 'icona-ritagliabile-192.png', 'icona-ritagliabile-512.png']) {
  scrivi(path.join(sito, f), fs.readFileSync(path.join(src, 'icone', f)));
}
scrivi(path.join(sito, 'manifest.webmanifest'), leggi('manifest.webmanifest'));
const moduli = path.join(radice, 'node_modules');
scrivi(path.join(sito, 'voce', 'vosk.js'), fs.readFileSync(path.join(moduli, 'vosk-browser', 'dist', 'vosk.js')));
scrivi(path.join(sito, 'voce', 'fflate.js'), fs.readFileSync(path.join(moduli, 'fflate', 'umd', 'index.js')));
fs.writeFileSync(path.join(sito, '.nojekyll'), '');

// Firmware della chiavetta, se compilato (in GitHub Actions: CHIAVETTA_UF2)
const uf2 = process.env.CHIAVETTA_UF2 || path.join(radice, 'chiavetta', 'build', 'chiavetta.uf2');
if (fs.existsSync(uf2)) scrivi(path.join(sito, 'chiavetta.uf2'), fs.readFileSync(uf2));
else console.log('Firmware della chiavetta non trovato (' + path.relative(radice, uf2) + '): il sito non lo includerà');
scrivi(path.join(sito, 'chiavetta-licenze.txt'), fs.readFileSync(path.join(radice, 'chiavetta', 'LICENZE-TERZE-PARTI.txt')));
