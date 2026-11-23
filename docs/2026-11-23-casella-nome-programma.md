# Casella "Nome del programma" sopra la tabella

Data: 2026-11-23 (20:33)
Stato: **realizzato il 2026-11-23** (sito 1.19.0), confermato dall'utente il 2026-11-23, con la richiesta del pulsante Salva accanto alla casella.

Note di realizzazione:

- **`mostraListaAttuale()`** in `src/app.js` ora aggiorna il pulsante Salva, il messaggio sotto la casella e il codice del nome. Gira dopo ogni modifica dei valori e del nome.
- **Salva** e **Liste → Salva** fanno la stessa cosa (`salvaLista()`). Il messaggio dopo il salvataggio va sotto la casella, oppure nel riquadro Liste se è aperto.
- **Invio nella casella** chiude la tastiera del telefono.

Oggi, sito 1.18.0, il nome del programma si scrive solo salvando la tabella: **Liste → Salva**, poi il nome nella finestra. Solo dopo compare il codice a barre. L'utente chiede un campo più facile da raggiungere, per semplificare il lavoro.

## Cosa cambia

### Una casella sempre visibile

Nella sezione 1, sopra la tabella, c'è la casella **Nome del programma**. Scrivi il nome lì e il codice a barre in cima alla sezione 2 compare subito, mentre scrivi. Non serve salvare.

Il lavoro diventa:

1. scrivi il nome del programma;
2. scrivi o detti i valori;
3. in macchina leggi il codice del nome nella pagina del caricatore, poi scrivi i valori con la chiavetta o con i codici.

Il nome resta salvato nel browser come i valori: se chiudi e riapri il sito lo ritrovi.

### La casella e le liste

La casella è anche il nome con cui si salva la lista:

- **Liste → Salva** salva con il nome scritto nella casella, senza chiedere niente. Se la casella è vuota, chiede il nome come oggi. Se esiste già un'altra lista con quel nome, chiede se sostituirla, come oggi.
- **Salva come…** chiede il nome, con quello della casella già scritto. Dopo il salvataggio la casella ha il nome nuovo.
- **Aprendo una lista** la casella prende il suo nome.
- **Svuota tutto** svuota anche la casella.

### Il pulsante Salva accanto alla casella

Richiesta dell'utente: anche Salva deve essere più facile da raggiungere.

Accanto alla casella c'è il pulsante **Salva**. Fa la stessa cosa di **Liste → Salva**: salva la tabella come lista con il nome della casella, con un tocco solo. In **Liste** restano Salva come…, l'elenco, Esporta e Importa.

Il pulsante dice a che punto sei:

- **Salva**, evidenziato: ci sono valori o un nome non ancora salvati;
- **✓ Salvata**, spento: la lista è salvata così com'è. Si riaccende appena cambi un valore o il nome;
- tabella vuota: spento, perché non c'è niente da salvare.

Così non serve più la riga "Lista: nome · modifiche non salvate" sopra la tabella: il nome è nella casella e lo stato è sul pulsante. Il messaggio dopo il salvataggio, per esempio «Salvata "FRESA-1234": 12 coppie», compare sotto la casella.

### Il codice del nome

- Il codice si fa dal nome scritto nella casella, anche se la tabella non è salvata.
- **Casella vuota:** in cima alla sezione 2, «Scrivi il **nome del programma** sopra la tabella per avere il suo codice a barre».
- Le regole restano quelle della 1.18.0: niente lettere accentate né simboli come € o °, al massimo 40 caratteri. Se il nome non va, il sito dice quale carattere cambiare. Lo dice anche sotto la casella, così lo vedi mentre scrivi.

## Esempio

1. Apri il sito e scrivi **FRESA-1234** in Nome del programma. In cima alla sezione 2 c'è già il codice.
2. Detti le coppie.
3. Tocchi **Salva** accanto al nome: salvata come "FRESA-1234", senza domande. Il pulsante diventa **✓ Salvata**.

## Cosa cambia nel codice

- **`src/template.html`:** la casella e il pulsante Salva sopra la tabella, al posto della riga `lista-attuale`; nella guida, le righe sul nome del programma e su Salva.
- **`src/app.js`:**
  - `stato.programma`: il nome scritto nella casella, salvato con il resto;
  - il codice in cima alla sezione 2 segue `stato.programma`, non più la lista aperta;
  - Salva, Salva come, Apri lista e Svuota tutto come descritto sopra;
  - chi ha già una lista aperta (sito 1.18.0) trova il suo nome nella casella.
- **Versione:** sito **1.19.0**. Il firmware resta 1.4.0.

## Test

- **Pagina:**
  - scrivendo nella casella, il codice compare subito e si decodifica nel nome esatto;
  - Salva, sia quello accanto alla casella sia quello in Liste, salva con il nome della casella senza chiedere; con la casella vuota chiede il nome;
  - il pulsante accanto alla casella: Salva con modifiche, ✓ Salvata dopo il salvataggio, di nuovo Salva cambiando un valore o il nome, spento con la tabella vuota;
  - Salva come chiede il nome, con quello della casella già scritto, e aggiorna la casella;
  - Apri lista mette il nome nella casella; Svuota tutto la svuota;
  - il nome resta dopo la ricarica; chi aveva una lista aperta trova il suo nome;
  - nome con "è": niente codice, messaggio sotto la casella e nella sezione 2.
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
