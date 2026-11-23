# Codice a barre del nome del programma

Data: 2026-11-23 (20:02, rivisto alle 20:15)
Stato: **realizzato il 2026-11-23** (sito 1.18.0), confermato dall'utente il 2026-11-23: «deve essere il più immediato e semplice possibile».

Note di realizzazione:

- **Il controllo del nome** è `Logica.testoPerCodice()`. Il riquadro lo disegna `mostraNomeProgramma()` in `src/app.js`, chiamata da `mostraListaAttuale()`. Il codice si ridisegna solo quando cambiano il nome o la larghezza.
- **Stampa:** il riquadro sta in cima alla sezione 2, quindi nella stampa esce prima dei codici dei valori. Le note non si stampano, come le altre.

Richiesta dell'utente: dare un nome alla tabella, cioè alla lista, che è **il nome del programma** in macchina, e avere un codice a barre di quel nome. Così in macchina, nella **pagina del caricatore**, il nome si scrive leggendo il codice invece di scriverlo a mano.

Prima versione di questo documento: una scheda "Testo" per qualsiasi testo. Dopo la spiegazione dell'utente, il codice è quello del nome della lista.

## Cosa c'è già

- Una tabella si salva come **lista** con un nome: **Liste → Salva** (o **Salva come…**).
- Sopra la tabella si vede "Lista: **nome**" della lista aperta.

## Cosa cambia

### 1. Il nome della lista è il nome del programma

Quando salvi, la domanda diventa: «Nome del programma (come in macchina)». Prima era «Nome della lista (per esempio il codice del pezzo)». Il nome si sceglie e si cambia come oggi, da **Liste**.

### 2. Il codice a barre del nome

In cima alla sezione 2, sopra le schede Chiavetta, Codici a barre e QR, compare un riquadro **Nome del programma**:

- il **codice a barre** del nome (Code 128, lo stesso tipo dei valori);
- sotto, il nome in chiaro, per controllare;
- la nota: «In macchina, nella pagina del caricatore: cursore sul campo del nome, poi leggi questo codice».

Il riquadro si vede con tutte e tre le schede, perché il nome serve anche a chi scrive i valori con la chiavetta.

- **Nessuna lista aperta:** al posto del codice, «Per il codice del nome del programma, salva la tabella con **Liste → Salva**».
- **Modifiche non salvate:** il codice si vede lo stesso. Il nome non cambia.
- **Stampa:** il codice del nome è stampato in cima, prima dei codici dei valori.

### 3. Cosa può contenere il nome

Il codice a barre accetta lettere senza accento, cifre, spazio e i segni della tastiera: `- . / + _` e simili.

- **Lettere accentate** (è, à…) **e simboli come € o °**: il codice non li può contenere. La lista si salva lo stesso, ma al posto del codice il sito dice quale carattere cambiare, per esempio «"è" non si può mettere in un codice a barre: rinomina la lista con **Salva come…**».
- **Lunghezza:** il codice si fa fino a **40 caratteri**. Oltre, diventa così largo che il lettore fatica a leggerlo dallo schermo del telefono.
- **Maiuscole e minuscole:** il codice scrive il nome esattamente come è stato scritto.
- **Segni** (`/ - _ .` e simili): il lettore, impostato con la tastiera americana su un PC con la tastiera italiana, potrebbe scrivere un segno diverso. Con lettere e cifre non ci sono problemi. Se nel nome c'è un segno, sotto il codice compare la nota «Prova una volta in macchina che i segni escano giusti».

## Esempio

1. Scrivi i valori e salva con **Liste → Salva**, nome **FRESA-1234**.
2. In cima alla sezione 2 compare il codice di "FRESA-1234".
3. In macchina, nella pagina del caricatore, metti il cursore sul campo del nome e leggi il codice. Poi vai nella maschera, cursore su **Grado 1**, e scrivi i valori con la chiavetta o con i codici.

## Cosa cambia nel codice

- **`src/template.html`:** il riquadro Nome del programma in cima alla sezione 2; nella guida, una riga sul codice del nome.
- **`src/app.js`:** il riquadro segue la lista aperta (si aggiorna con apri, salva, salva come, svuota); la domanda del nome; la stampa.
- **`src/logica.js`:** una funzione che controlla se un testo si può mettere in un codice a barre e dice qual è il primo carattere che non va.
- **Versione:** sito **1.18.0**. Il firmware resta 1.4.0.

## Test

- **Logica:** nome valido; lettera accentata, €, nome troppo lungo: niente codice, con il messaggio giusto.
- **Pagina:**
  - senza lista aperta: il messaggio per salvare;
  - salvando "FRESA-1234" compare il codice, che si decodifica esattamente in "FRESA-1234";
  - aprendo un'altra lista il codice cambia; con Svuota tutto sparisce;
  - con un nome con la "è": la lista si salva, il codice no, c'è il messaggio;
  - il riquadro si vede con tutte e tre le schede; sul telefono il codice sta dentro lo schermo;
  - nella stampa il codice del nome è in cima.
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
