# Logo: il pettirosso con un altro oggetto nel becco

Data: 2026-11-14

## Idea

Riprendere il pettirosso dell'icona di Etichettatrice (Rubeculabel): progetto "stampa etichette webusb", `public/icona.svg`.
Restano uguali la forma, i colori e il fondo blu `#274e76` con gli angoli arrotondati.
Cambia solo l'oggetto nel becco: invece dell'etichetta con ⌀ tiene qualcosa che parla del Compilatore misure.

## Varianti da scegliere

I disegni sono in `docs/2026-11-14-logo-pettirosso/`: `a-chiavetta.svg`, `b-codice-a-barre.svg`, `c-qr.svg`, `d-angolo-altezza.svg`.
In `anteprima.png` si vedono a 256, 96, 48, 24 e 16 px.

| Variante | Nel becco | Pro / contro |
|---|---|---|
| **A · chiavetta** | il Pico verde con la presa USB | richiama il metodo predefinito; da 24 px in giù diventa una macchiolina verde |
| **B · codice a barre** | etichetta bianca con le barre | si riconosce bene anche piccola; ricorda molto l'Etichettatrice |
| **C · QR** | quadratino QR | come B, ma meno "etichetta" |
| **D · angolo e altezza** | etichetta con l'angolo (arco arancione) e la freccia su/giù | parla delle misure (angolo e altezza); da piccola si legge poco |

### Varianti della D con i simboli ISO (richieste dall'utente)

Sono in `anteprima-iso.png`, accanto alla D di partenza:

| Variante | Nel becco |
|---|---|
| **D1 · iso simboli** (`d1-iso-simboli.svg`) | simbolo di **inclinazione ISO 1101** (base orizzontale e lato a 30°), più una **quota di altezza ISO 129**: due linee di riferimento e la linea di quota con le frecce piene |
| **D2 · iso riquadro** (`d2-iso-riquadro.svg`) | gli stessi due simboli dentro un **riquadro di tolleranza ISO 1101**, a scomparti come nei disegni tecnici |
| **D3 · iso quote** (`d3-iso-quote.svg`) | **quota angolare ISO 129**: due lati con l'arco e le frecce piene, più la stessa quota di altezza |

## Dove va il logo

1. **Icona della scheda del browser (favicon):** l'SVG messo dentro la pagina come `data:`. Così funziona anche aprendo il file `compilatore-misure.html` dal PC, perché la pagina resta un file unico.
2. **Icona per "Aggiungi a schermata Home":** sul sito, `icona-180.png` e `icona-192.png`, quadrate senza angoli (li arrotonda il telefono), generate dall'SVG con Playwright come nell'Etichettatrice. Il comando è `npm run icone`, da rilanciare solo se cambia il disegno.
3. **In testa alla pagina:** il logo piccolo (32 px) accanto al titolo "Compilatore misure".

I file stanno in `src/icona.svg` e `src/icone/`. `build.js` copia le PNG in `sito/` e mette l'SVG nella pagina.

## Test

- La pagina contiene `<link rel="icon">` con l'SVG e, sul sito, `<link rel="apple-touch-icon">` che punta a una PNG esistente.
- Il logo in testa non fa andare a capo il titolo sul telefono a 320 px.

## Da decidere

- Quale variante (A, B, C o D), oppure una modifica, per esempio "B ma con la chiavetta".
- Se va bene anche il logo piccolo in testa alla pagina (punto 3).

## Realizzato (2026-11-14)

- Scelta dell'utente: **D originale** ("per adesso"). Le altre varianti restano in questa cartella.
- `src/icona.svg`: il disegno. `npm run icone` (`src/icone.js`) genera `src/icone/icona-180.png` e `icona-192.png`.
- `build.js`:
  - mette l'SVG nella pagina come `data:`, sia come icona del browser sia come logo di 40 px accanto al titolo;
  - solo nel sito aggiunge `apple-touch-icon` e l'icona PNG da 192 px, e copia le PNG in `sito/`.
- Sul telefono il titolo andava già su due righe anche senza logo (a 24 px non ci sta), quindi la testata non si allunga.
- Test in `semplicita.test.js`.
