# Impostazioni chiuse e righe che si aggiungono da sole

Data: 2026-11-23 (19:12)
Stato: **realizzato il 2026-11-23** (sito 1.17.0), confermato dall'utente il 2026-11-23. Il limite di 500 righe resta, d'accordo con l'utente: la chiavetta è fatta per 500 coppie.

Note di realizzazione:

- **La riga nuova** si aggiunge in `aggiorna()`, che gira dopo ogni modifica dei valori (`rigaVuotaInFondo()` in `src/app.js`).
- **Svuota tutto** riporta la tabella a 5 righe vuote. Prima lasciava il numero di righe che c'era.
- **Test:** le funzioni che aprono la pagina nei test aprono il riquadro Cambia, perché i test cambiano modo e decimali da lì.

Richieste dell'utente:

1. il riquadro **Cambia** (modo e decimali) deve partire chiuso;
2. togliere la scelta del numero di righe;
3. quando una riga è completa, aggiungere sempre una riga nuova.

## Cosa cambia

### 1. Riquadro Cambia chiuso anche la prima volta

Oggi la prima volta il riquadro parte aperto, perché bisognava scegliere modo e decimali. Ora che i decimali partono già giusti (0 e 1, sito 1.16.0), parte **chiuso** anche la prima volta. Si vede la riga di riepilogo, ad esempio "Con separatore · decimali 0 / 1". Un tocco su **Cambia** lo apre.

Se lo apri e lo lasci aperto, alla volta dopo lo ritrovi aperto, come oggi.

### 2. Niente più "Righe"

La casella **Righe** sparisce dal riquadro Cambia. Sparisce anche "· 5 righe" dal riepilogo.

- **Si parte con 5 righe vuote**, come oggi.
- **Le righe vuote in fondo non contano:** non diventano codici e la chiavetta non le scrive, come oggi.
- **Per togliere tutto** resta **Svuota tutto**, che riporta la tabella a 5 righe vuote.

### 3. Sempre una riga vuota in fondo

Quando **l'ultima riga è completa**, cioè ha sia il grado sia il dato, sotto ne compare subito una nuova vuota. In fondo alla tabella c'è quindi sempre una riga pronta da riempire, in qualsiasi modo si scriva:

- **a mano**, appena scrivi il dato dell'ultima riga. Il cursore resta dov'è, e la riga nuova compare senza farti perdere quello che stai scrivendo;
- **con la dettatura**;
- **incollando da Excel**: dopo l'ultima coppia incollata resta una riga vuota;
- **aprendo una lista salvata**: dopo l'ultima coppia c'è una riga vuota.

Come oggi, INVIO e Avanti sull'ultimo dato portano alla riga dopo. Ora la riga dopo c'è già.

Il limite resta di 500 righe: arrivati lì, non se ne aggiungono altre.

## Esempio

1. Apri il sito: 5 righe vuote, riquadro Cambia chiuso.
2. Scrivi 5 coppie. Appena scrivi Dato 5, compare la riga 6, vuota.
3. Detti la coppia 6. Appena scrivi Dato 6, compare la riga 7.

## Cosa cambia nel codice

- **`src/app.js`:**
  - `impAperte: false` in `statoIniziale`;
  - via `impostaRighe()` e la casella `num-righe`, e "righe" dal riepilogo;
  - una funzione che aggiunge la riga vuota in fondo quando l'ultima è completa. Si chiama dopo ogni modifica dei valori: scrittura, dettatura, incolla, apertura di una lista. La riga nuova si aggiunge alla tabella senza ridisegnarla, così chi scrive non perde il cursore.
- **`src/template.html`:** via la casella Righe; nella guida, una riga: "Quando l'ultima riga è completa, sotto ne compare una nuova".
- **Versione:** sito **1.17.0**. Il firmware resta 1.4.0.

## Test

- **Prima volta:** il riquadro Cambia è chiuso, il riepilogo non dice più le righe, la casella Righe non c'è.
- **Riga nuova:**
  - scrivendo a mano il dato dell'ultima riga compare una riga vuota, e il cursore resta nella casella;
  - solo il grado nell'ultima riga: nessuna riga nuova;
  - dettatura, incolla e apertura di una lista lasciano una riga vuota in fondo;
  - a 500 righe non se ne aggiungono altre.
- **Tutti gli altri test**, aggiornati: quelli che usavano la casella Righe ora usano Svuota tutto oppure scrivono i valori.
