# Dettatura pronta all'apertura

Data: 2026-11-19 (22:09)
Stato: **realizzato il 2026-11-19** (sito 1.7.0), confermato dall'utente il 2026-11-19.

Nota di realizzazione: un secondo tocco del 🎤 durante l'attesa non apre un secondo ascolto. Se la preparazione all'apertura non riesce mentre un tocco la sta aspettando, il tocco riprova subito e, se serve, mostra l'errore.

Richiesta dell'utente: far partire la dettatura più in fretta quando serve. Tra le due proposte ha scelto solo questa. Lo scaricamento del modello resta com'è: si fa al primo uso del 🎤.

## Oggi

Ogni volta che si apre la pagina, al primo tocco del 🎤:

- il modello è già nel dispositivo, ma va caricato in memoria per il riconoscimento;
- passano alcuni secondi con "Modello già nel dispositivo, caricamento…" e "Preparazione del riconoscimento…";
- dal secondo tocco in poi si parte subito.

## Cosa cambia

All'apertura della pagina la dettatura si prepara da sola, in sottofondo, ma solo se:

- **il modello è già nel dispositivo**: lì la dettatura è già stata usata almeno una volta. Altrimenti non si scarica niente e non compare nessuna domanda;
- la dettatura è disponibile: solo dal sito, non dal file aperto dal PC;
- la pagina è **in primo piano**. Se si apre in secondo piano, la preparazione aspetta che torni visibile;
- l'impostazione nuova è attiva (vedi sotto).

**Quando parte:** un paio di secondi dopo l'apertura, così prima si disegna la pagina e il telefono resta reattivo.

**Cosa si vede:**

- durante la preparazione il 🎤 ha lo stesso aspetto di oggi durante il caricamento;
- sotto, una riga discreta: "Preparazione della dettatura…";
- alla fine: "Dettatura pronta.";
- se la preparazione non riesce, per esempio per poca memoria, non compare nessun errore. Il 🎤 torna normale e al primo tocco riprova come oggi, mostrando l'eventuale errore.

**Se si tocca il 🎤 mentre si sta preparando:**

- oggi il tocco durante il caricamento va perso;
- con la modifica il tocco aspetta la fine della preparazione:
  - modo "tieni premuto": se il 🎤 è ancora premuto, parte l'ascolto. Se è già stato lasciato, compare "Pronto: tieni premuto 🎤 e parla." come oggi;
  - modo "più valori": l'ascolto parte appena è pronto.

**Il microfono non si apre:** la preparazione carica solo il riconoscimento. Il microfono si apre solo toccando il 🎤, quindi non compare la richiesta del permesso e non si accende l'indicatore del microfono.

## Impostazione

Nelle impostazioni della dettatura, accanto a "Modo" e "Separatore", una casella nuova:

- **"Prepara la dettatura all'apertura"**, attiva in partenza;
- si salva come le altre impostazioni;
- serve per i telefoni con poca memoria, o per chi non vuole il lavoro in sottofondo.

## Costo

Il riconoscimento caricato occupa memoria, e la preparazione usa il processore per qualche secondo. Oggi succede lo stesso al primo tocco del 🎤: cambia solo il momento. La differenza è che con la modifica succede anche le volte in cui la dettatura non si usa. Per questo c'è l'impostazione.

## Cosa cambia nel codice

- **`src/app.js`:**
  - `preparaVoce` diventa riutilizzabile: durante il caricamento restituisce la stessa attesa in corso invece di `false`. Così il tocco durante la preparazione non va perso;
  - una modalità "silenziosa" per la preparazione all'apertura: niente domanda di scaricamento e niente errori a schermo;
  - avvio dopo il caricamento della pagina, con il controllo del primo piano;
  - nuova impostazione `vocePrepara`.
- **`src/template.html`:** la casella nelle impostazioni della dettatura; una riga nella guida, nella voce sulla dettatura.
- **README:** una frase nella voce "Dettatura".
- Versione del sito **1.7.0**.

## Test

Con il motore simulato già usato dai test della dettatura:

- con il modello nel dispositivo, la pagina prepara il motore senza toccare il 🎤, e alla fine compare "Dettatura pronta.";
- senza il modello: niente preparazione, niente domanda;
- con l'impostazione spenta: niente preparazione;
- con la pagina aperta in secondo piano, la preparazione parte quando torna visibile;
- tocco durante la preparazione, in tutti e due i modi: l'ascolto parte alla fine della preparazione, una volta sola;
- con una preparazione che fallisce: nessun errore a schermo, e il tocco successivo riprova;
- il microfono non si apre finché non si tocca il 🎤;
- i test esistenti passano tutti.
