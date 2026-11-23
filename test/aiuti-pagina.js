'use strict';
// Aiuti comuni ai test che aprono la pagina nel browser.

/* Chiavi della memoria del browser usate dalla pagina (src/app.js). */
const CHIAVE = 'compilatore-misure-v1';
const CHIAVE_LISTE = 'compilatore-misure-liste-v1';

/* I test sono scritti con 2 decimali per gradi e dati (i predefiniti sono 0 / 1: docs/2026-11-23-gradi-e-dati.md),
   e cambiano modo e decimali dal riquadro Cambia, che ora parte chiuso: qui si apre. */
async function usaDecimali(page, [gradi, dati]) {
  await page.evaluate(([g, d]) => {
    document.getElementById('imp-valori').open = true;
    [['dec-gra', g], ['dec-dat', d]].forEach(([id, v]) => {
      const el = document.getElementById(id);
      el.value = String(v);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, [gradi, dati]);
}

module.exports = { CHIAVE, CHIAVE_LISTE, usaDecimali };
