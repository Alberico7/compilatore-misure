# Dettatura non preparata all'apertura, di predefinito

Data: 2026-11-23 (22:19)
Stato: **realizzato il 2026-11-23** (sito 1.21.0), confermato dall'utente il 2026-11-23, con la pausa di un terzo di secondo.

Note di realizzazione:

- **Misura dopo**, con 500 coppie: un tasto costa circa 1 ms sul PC con qualsiasi scheda aperta (prima 46–91 ms). Con la scheda Chiavetta aperta la pagina ha ~5.500 elementi invece di ~32.000.
- **In più rispetto al documento:** chiudendo la scheda Codici a barre i suoi codici si tolgono dalla pagina (si ridisegnano quando si riapre), così la memoria si libera.
- **Pausa e salvataggio:** solo per i tasti nelle caselle (`aggiorna(true)`). Dettatura, incolla, ±, liste, Svuota tutto e cambi di impostazioni aggiornano e salvano subito.
- **Test:** `leggiBarre` aspetta la pausa prima di leggere i codici. I test della preparazione all'apertura accendono la spunta (opzione `prepara` di `nuovaPagina` in `test/voce.test.js`).

Dal 2026-11-19 (docs/2026-11-19-dettatura-pronta.md), all'apertura del sito il riconoscimento vocale si prepara da solo, se il modello è già nel telefono. Così il primo tocco su 🎤 è subito pronto.

Il modello occupa qualche centinaio di MB. Sul telefono dell'utente, con altre schede aperte, Chrome chiude la scheda del sito e mostra "Uffa! Si è verificato un problema…", anche senza toccare niente. Richiesta dell'utente: per adesso, di predefinito la preparazione all'apertura va disattivata.

## Cosa cambia

- **"Prepara la dettatura all'apertura"**, nel riquadro **Cambia**, parte **senza spunta**.
- **Chi ha già usato il sito** ha la spunta salvata nel browser. Al primo avvio della nuova versione la spunta si toglie, una volta sola. Se poi la rimetti a mano, resta.
- **Senza spunta** il modello si carica solo al primo tocco su 🎤: quella volta servono alcuni secondi prima di poter dettare. Se apri il sito solo per guardare, scrivere a mano o usare la chiavetta, la memoria non si occupa.
- Il resto della dettatura non cambia.

## Pagina più leggera

L'utente ha chiesto se i codici a barre possono contribuire ai blocchi, e poi di rendere tutto il più efficiente possibile.

Misura del 2026-11-23, su un telefono simulato:

| Tabella | Codici disegnati | Elementi nella pagina | Lavoro per tasto (PC) |
|---|---|---|---|
| 20 coppie | 40 | ~1.800 | 4 ms |
| 500 coppie | 1.000 | ~32.000 | 46–91 ms |

Sul telefono il lavoro è 3–5 volte più lento. Oggi a ogni tasto il sito:

- ridisegna **tutti** i codici a barre e il QR, anche se la scheda aperta è un'altra e non si vedono;
- riscrive l'anteprima "In macchina: …" sotto **ogni** casella, anche se non è cambiata;
- ricalcola il testo e il codice di controllo della chiavetta, anche con la scheda Chiavetta chiusa;
- salva tutta la tabella nella memoria del browser.

Cosa cambia:

1. **Si disegna solo la scheda aperta.** I codici a barre si disegnano solo con la scheda **Codici a barre** aperta, il QR solo con **QR** e i dati della chiavetta solo con **Chiavetta**. Le altre schede si aggiornano quando le apri.
2. **Mentre scrivi, la scheda aperta si aggiorna una volta sola, dopo una breve pausa** (un terzo di secondo dopo l'ultimo tasto, scelta dell'utente), e non a ogni tasto. Quando il valore arriva intero (dettatura, incolla da Excel, apertura di una lista, Svuota tutto) si aggiorna subito. Il riepilogo, gli errori e l'anteprima sotto le caselle restano immediati.
3. **Si riscrivono solo le anteprime cambiate.** Sotto le caselle cambia solo quello che è diverso. Con 500 righe, scrivendo in una casella si tocca quella e poco altro.
4. **Salvataggio raggruppato.** Mentre scrivi, la tabella si salva al massimo ogni mezzo secondo, invece che a ogni tasto. Quando passi a un'altra app o chiudi la pagina, si salva subito. Al massimo si possono perdere i tasti dell'ultimo mezzo secondo, e solo se il telefono chiude la scheda di colpo.
5. **Cambiando dimensione della finestra** (anche quando sul telefono compare o sparisce la barra dell'indirizzo) si ridisegna solo la scheda aperta.

Il nome del programma e i suoi due codici restano come sono: si ridisegnano già solo quando cambia il nome.

## Cosa cambia nel codice

- **`src/app.js`:**
  - `vocePrepara: false` in `statoIniziale`;
  - un segno una tantum, `preparaSpenta: true`, come per i 30 ms dopo INVIO: in `carica()`, se il segno manca, `vocePrepara` diventa `false`;
  - `aggiorna()`: le anteprime si scrivono solo se cambiano; la sezione 2 si aggiorna con un ritardo di 333 ms (subito per dettatura, incolla, liste) e solo per la scheda aperta (`mostraBarre`, `mostraQR`, `chiavetta.aggiorna`); `mostraScheda()` disegna la scheda appena aperta;
  - `salva()` raggruppato (500 ms), con salvataggio subito su `visibilitychange` (pagina nascosta) e `pagehide`.
- **`src/template.html`:** nella guida, la riga sulla preparazione dice che parte spenta e perché si può accendere.
- **Versione:** sito **1.21.0**. Il firmware resta 1.4.0, e la pubblicazione non lo ricompila.

## Test

- **Pagina:**
  - prima volta: la spunta è tolta e il riconoscimento non si prepara all'apertura;
  - chi aveva la spunta salvata la trova tolta; rimessa a mano, resta dopo la ricarica;
  - con la spunta il riconoscimento si prepara all'apertura come oggi (il test che c'è già, con la spunta messa).
- **Pagina più leggera:**
  - con la scheda Chiavetta aperta non ci sono codici a barre disegnati; aprendo Codici a barre compaiono, giusti;
  - scrivendo con la scheda Codici a barre aperta, dopo la pausa i codici sono quelli nuovi;
  - la tabella salvata nel browser è quella giusta dopo la pausa e subito dopo aver nascosto la pagina;
  - misura di prima e dopo, con 500 coppie: elementi nella pagina e lavoro per tasto.
- **Tutti gli altri test**, con `CC_CHIAVETTA`. Alcuni test leggono la sezione 2 o la memoria del browser subito dopo aver scritto: aspetteranno la pausa.
