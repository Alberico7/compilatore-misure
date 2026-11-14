# Chiavetta come metodo predefinito

Data: 2026-11-14

## Perché

Al lavoro il lettore legge solo codici 1D. La Chiavetta (Pi Pico 2 W) diventa il metodo principale.
Codici a barre (1D) e QR (2D) restano disponibili come alternative.

## Cosa cambia

### 1. Scheda aperta all'avvio

- **Chi apre la pagina la prima volta:** trova aperta la scheda **Chiavetta**, non più "Codici a barre".
- **Chi l'ha già usata:** la scelta salvata era quasi sempre "Codici a barre" solo perché era quella predefinita. Per questo, **una volta sola**, la pagina passa alla Chiavetta. Da lì in poi ricorda la scheda scelta, come oggi. Per sapere che lo spostamento è già stato fatto, salva un segno nei dati della pagina.
- **Browser che non supportano né Bluetooth né cavo** (Firefox, Safari / iPhone): resta "Codici a barre" come predefinita, perché lì la Chiavetta non si può caricare.

### 2. Ordine e testi nella sezione 2

- Titolo: "In macchina: **chiavetta o codici**".
- Schede nell'ordine: **Chiavetta · Codici a barre · QR**.
- Riga di scelta: "**Chiavetta** (consigliata) · Lettore 1D → **Codici a barre** · Lettore 2D → **QR**". Ogni nome apre la sua scheda, come ora.

### 3. Guida

- **"Come si usa"**, passo 4: "Scegli il metodo: **Chiavetta** (consigliata, vedi la guida Chiavetta), **Codici a barre** (lettore 1D) o **QR a blocchi** (lettore 2D)". I passi su cursore e lettura diventano "Con i codici: …".
- Il riquadro **"Chiavetta"** della guida si sposta subito dopo "Come si usa", prima di "Da smartphone".

### Cosa non cambia

La tabella, i codici, i QR, la scheda Chiavetta e il firmware restano uguali. Cambiano solo la scheda di partenza, l'ordine e i testi.

## Test

- **Nuovo utente:** si apre la scheda Chiavetta.
- **Chi ha "barre" salvato senza il segno:** passa alla Chiavetta una sola volta. Se poi sceglie QR e ricarica la pagina, resta QR.
- **Browser senza `navigator.bluetooth` e `navigator.usb`:** parte con Codici a barre.
- **Test esistenti:** aggiornati l'ordine delle schede e la riga di scelta (`semplicita.test.js`). I test che usano i codici aprono prima la scheda "Codici a barre".
- Versione della pagina: 1.5.0.

## Realizzato (2026-11-14)

- Confermato dall'utente: spostamento una tantum per tutti.
- `src/app.js`: `schedaPredefinita()` e il segno `schedaChiavetta` nello stato salvato.
- `src/template.html`: titolo, riga di scelta, ordine delle schede e guida.
- In più: il QR viene ridisegnato solo se cambia (come "Leggi uno alla volta"). Prima un ridimensionamento della finestra lo rifaceva uguale; il test del QR sul telefono lo trovava a metà.
- Test: nuovo test in `semplicita.test.js`; `pagina.test.js` parte dalla scheda "Codici a barre".
