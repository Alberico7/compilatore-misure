// Genera le icone PNG per "Aggiungi a schermata Home" (docs/2026-11-14-logo-pettirosso.md).
// Uso: npm run icone (da rilanciare solo se cambia il disegno).
// - icona.svg → icona-180/192.png: quadrate senza angoli, li arrotonda il telefono (iPhone e scheda del browser).
// - icona-ritagliabile.svg → icona-ritagliabile-192/512.png: icone "maskable" del manifest. Fondo blu fino ai
//   bordi e pettirosso nella zona sicura: Android le ritaglia nella sua forma senza aggiungere il bordo bianco.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const svg = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/rx="112"/, 'rx="0"');
const LAVORI = [
  { svg: svg('icona.svg'), file: { 'icona-180.png': 180, 'icona-192.png': 192 } },
  { svg: svg('icona-ritagliabile.svg'), file: { 'icona-ritagliabile-192.png': 192, 'icona-ritagliabile-512.png': 512 } },
];
const cartella = path.join(__dirname, 'icone');
fs.mkdirSync(cartella, { recursive: true });

(async () => {
  const browser = await chromium.launch(process.env.CI ? {} : { channel: 'msedge' });
  try {
    for (const { svg: s, file } of LAVORI) {
      const uri = 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
      for (const [nome, lato] of Object.entries(file)) {
        const page = await browser.newPage({ viewport: { width: lato, height: lato } });
        await page.setContent(`<body style="margin:0"><img src="${uri}" width="${lato}" height="${lato}" style="display:block"></body>`);
        await page.screenshot({ path: path.join(cartella, nome) });
        await page.close();
        console.log('Creato', path.join('src', 'icone', nome));
      }
    }
  } finally {
    await browser.close();
  }
})();
