// Genera le icone PNG per "Aggiungi a schermata Home" da src/icona.svg (docs/2026-11-14-logo-pettirosso.md).
// Uso: npm run icone (da rilanciare solo se cambia il disegno). Quadrate senza angoli: li arrotonda il telefono.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const svg = fs.readFileSync(path.join(__dirname, 'icona.svg'), 'utf8').replace(/rx="112"/, 'rx="0"');
const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
const cartella = path.join(__dirname, 'icone');
fs.mkdirSync(cartella, { recursive: true });

(async () => {
  const browser = await chromium.launch(process.env.CI ? {} : { channel: 'msedge' });
  try {
    for (const lato of [180, 192]) {
      const page = await browser.newPage({ viewport: { width: lato, height: lato } });
      await page.setContent(`<body style="margin:0"><img src="${uri}" width="${lato}" height="${lato}" style="display:block"></body>`);
      const file = path.join(cartella, `icona-${lato}.png`);
      await page.screenshot({ path: file });
      await page.close();
      console.log('Creato', path.relative(path.join(__dirname, '..'), file));
    }
  } finally {
    await browser.close();
  }
})();
