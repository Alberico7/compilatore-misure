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
  '/*APP*/': leggi('app.js'),
};
for (const [segnaposto, codice] of Object.entries(parti)) {
  if (!html.includes(segnaposto)) throw new Error('Segnaposto mancante: ' + segnaposto);
  if (/<\/script/i.test(codice)) throw new Error('Il codice contiene </script: ' + segnaposto);
  html = html.split(segnaposto).join(codice);
}
// il template è diviso in due per un'eventuale pubblicazione senza scheletro: qui i segnaposto non servono
html = html.replace('<!--INIZIO_CONTENUTO_HEAD-->\n', '').replace('<!--FINE_CONTENUTO_HEAD-->\n', '');

function scrivi(file, testo) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, testo);
  console.log('Creato', path.relative(radice, file), Math.round(testo.length / 1024) + ' KB');
}

scrivi(path.join(radice, 'compilatore-misure.html'), html);

const sito = path.join(radice, 'sito');
fs.rmSync(sito, { recursive: true, force: true });
scrivi(path.join(sito, 'index.html'), html);
const moduli = path.join(radice, 'node_modules');
scrivi(path.join(sito, 'voce', 'vosk.js'), fs.readFileSync(path.join(moduli, 'vosk-browser', 'dist', 'vosk.js')));
scrivi(path.join(sito, 'voce', 'fflate.js'), fs.readFileSync(path.join(moduli, 'fflate', 'umd', 'index.js')));
fs.writeFileSync(path.join(sito, '.nojekyll'), '');

// Firmware della chiavetta, se compilato (in GitHub Actions: CHIAVETTA_UF2)
const uf2 = process.env.CHIAVETTA_UF2 || path.join(radice, 'chiavetta', 'build', 'chiavetta.uf2');
if (fs.existsSync(uf2)) scrivi(path.join(sito, 'chiavetta.uf2'), fs.readFileSync(uf2));
else console.log('Firmware della chiavetta non trovato (' + path.relative(radice, uf2) + '): il sito non lo includerà');
scrivi(path.join(sito, 'chiavetta-licenze.txt'), fs.readFileSync(path.join(radice, 'chiavetta', 'LICENZE-TERZE-PARTI.txt')));
