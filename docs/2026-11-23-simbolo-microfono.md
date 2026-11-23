# Simbolo del microfono a linea, come Salva e Apri

Data: 2026-11-23 (22:44)
Stato: **realizzato il 2026-11-23** (sito 1.21.0), confermato dall'utente il 2026-11-23.

Note di realizzazione: il disegno è nel template (pulsanti e guida). I messaggi della dettatura prendono quello piccolo della guida (`ICONA_MICROFONO` in `src/app.js`). Già che c'ero, il suggerimento nella casella del nome è diventato "es. FRESA-1234": sul telefono "per esempio FRESA-1234" veniva tagliato.

Dal sito 1.19.0 Salva e Apri hanno simboli disegnati a linea, nel colore della scritta del pulsante. Il pulsante della dettatura usa ancora l'emoji 🎤, colorata, che stona con il tema e cambia aspetto da un telefono all'altro. Richiesta dell'utente: il microfono nello stesso stile.

## Cosa cambia

- **Pulsante Detta** (sezione 1, sul PC): un microfono disegnato a linea, nel colore della scritta, al posto dell'emoji, accanto alla parola "Detta".
- **Pulsante nella barra in basso** (telefono): lo stesso microfono, da solo e più grande, come gli altri simboli della barra.
- **Il microfono segue lo stato del pulsante**, come fa oggi la scritta: quando ascolta o si prepara il pulsante cambia colore, e il disegno cambia con lui.
- **Nella guida e nei messaggi** ("tieni premuto 🎤 e parla", "tocca 🎤"), il simbolo nel testo diventa lo stesso microfono a linea, piccolo, alla stessa altezza delle lettere. Così il testo mostra il pulsante come è davvero.

Il resto della dettatura non cambia.

## Cosa cambia nel codice

- **`src/template.html`:**
  - un solo disegno del microfono (SVG con `stroke: currentColor`, classe `.icona`, come Salva e Apri) nei due pulsanti;
  - nella guida, al posto di 🎤 lo stesso disegno, piccolo (classe `.icona-testo`).
- **`src/app.js`:** il messaggio "Pronto: tieni premuto … e parla" usa il disegno; i commenti restano.
- **Versione:** insieme alla 1.21.0, non ancora pubblicata.

## Test

- Nella pagina non c'è più l'emoji 🎤 (né nei pulsanti, né nella guida, né nei messaggi).
- I due pulsanti hanno il disegno, e il loro nome per il lettore dello schermo resta "Detta".
- Schermate del PC e del telefono, con il tema scuro e chiaro.
- **Tutti gli altri test**, con `CC_CHIAVETTA`. I test della dettatura cercano i pulsanti per id, non per l'emoji.
