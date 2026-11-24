# Dettatura: una sola copia del modello, già pronta

Data: 2026-11-24 (17:52, rivisto alle 18:20)
Stato: **realizzato il 2026-11-24** (sito 1.22.0), confermato dall'utente il 2026-11-24.

Note di realizzazione:
- Misure dopo la modifica, sul PC:
  - scheda con la dettatura pronta: **390 MB** (prima 900–1000 MB);
  - preparazione con la copia già estratta: **0,8–1,1 s**;
  - una sola cartella nell'archivio anche dopo molte preparazioni. Le 7 copie vecchie del browser dei test sono sparite alla prima preparazione.
- Strada di riserva provata (pagina senza service worker): estrae, poi l'archivio resta vuoto.
- `Vosk.createModel` non rispondeva mai se il caricamento falliva. Ora il sito ascolta anche l'errore e chiude il worker (`apriModello`).
- Il nome del modello e della sua cache li mette `build.js` nel service worker, presi da `voce.js`: i due file non possono andare fuori sincrono.
- Il test con il vero Vosk apre il riquadro Cambia, chiuso dal sito 1.17.0, e usa due decimali: non era più stato aggiornato.

## Il problema

Dal 2026-11-23, sul telefono (Pixel 7a, Vanadium), la scheda va in crash ("Uffa!") quando si prepara la dettatura, anche con tutte le altre schede chiuse. Il caricamento è anche più lento di prima. Il codice della dettatura non è cambiato dal 2026-11-12.

La causa è dentro Vosk (vosk-browser 0.0.8), nel modo in cui lo usa il sito.

- Il motore di Vosk lavora in un worker. Il worker tiene il modello estratto (91 MB) in un archivio del browser (IndexedDB, database `/vosk`). L'archivio è diviso in cartelle, e ogni cartella prende il nome dall'indirizzo del modello.
- Il sito passa a Vosk il modello con un indirizzo temporaneo (`blob:…`), che **cambia ogni volta**.
- Così, a ogni preparazione, Vosk non riconosce la copia salvata la volta prima. Estrae il modello di nuovo e lo salva in una **cartella nuova**: le copie vecchie restano.
- All'avvio Vosk **rilegge in memoria tutto l'archivio**, cioè tutte le copie, anche se ne usa una sola.

Con la preparazione all'apertura attiva fino a ieri, ogni apertura del sito aggiungeva una copia. Dopo 12 giorni le copie sono molte. Ogni caricamento legge centinaia di MB, o qualche GB, e diventa più lento finché il telefono chiude la scheda.

## Misure sul PC (Edge 158, motore come Vanadium 158)

| | Pronta in | Memoria della scheda |
|---|---|---|
| Oggi, con 7 copie accumulate | circa 2 s | 900–1000 MB |
| Una sola copia, estratta ogni volta | 1,5 s | 350 MB |
| Una sola copia, tenuta già estratta | 0,7 s | 350 MB |

Sul telefono i tempi sono più lunghi, ma il rapporto dovrebbe essere simile.

Il modello **non si scarica da internet ogni volta** già oggi. Si scarica una volta sola (50 MB), poi si tiene nella cache del sito. Ogni volta però si **estrae** di nuovo: è questo il passaggio che si può togliere.

## Cosa cambia

1. **Indirizzo fisso per il modello.** Il sito passa a Vosk sempre lo stesso indirizzo: `…/vosk-model-small-it-0.22.tar.gz`, lo stesso nome che il modello ha già nella cache del sito.
   - La prima volta Vosk chiede il file a quell'indirizzo. Glielo dà il **service worker** del sito, prendendolo dalla cache, senza internet. Vosk lo estrae e tiene la copia estratta nel suo archivio.
   - Le volte dopo Vosk trova la copia già estratta e **non estrae più niente**.
2. **Pulizia dell'archivio di Vosk** prima di ogni preparazione: il sito toglie dall'archivio tutto quello che non è la copia buona. Quindi:
   - **al primo uso dopo l'aggiornamento** spariscono le copie accumulate sul telefono. Non serve cancellare a mano i dati del sito, cosa che cancellerebbe anche le liste salvate;
   - con un modello nuovo in futuro, la copia del modello vecchio non resta.
3. **Strada di riserva.** Se il service worker non c'è ancora o non risponde (per esempio alla primissima apertura del sito, o con una ricarica forzata), il sito fa come oggi: indirizzo temporaneo ed estrazione. Poi però toglie subito dall'archivio quella copia, che non servirebbe più. Questo modo è più lento, ma non accumula niente.

Spazio nel telefono: 51 MB (il modello compresso, come oggi) più 91 MB (la copia estratta), invece delle tante copie da 91 MB di adesso.

Non cambiano:
- il primo scaricamento del modello e il controllo della sua impronta;
- il riconoscimento;
- i pulsanti e le impostazioni.

## Cosa cambia nel codice

- **`src/voce.js`:**
  - `archivioVosk(tieni)`: apre il database `/vosk` (senza crearlo se non esiste, e senza aspettare all'infinito se è occupato), toglie le voci che non iniziano con la cartella `tieni` e dice se in quella cartella c'è `extracted.ok`. Se qualcosa va storto, la preparazione continua lo stesso;
  - `MotoreVosk.prototype.prepara`:
    1. si assicura che il modello sia nella cache, come oggi;
    2. pulisce l'archivio;
    3. se la copia estratta c'è, oppure se la pagina ha il service worker, usa l'indirizzo fisso;
    4. altrimenti, o se l'indirizzo fisso non funziona, usa l'indirizzo temporaneo e dopo toglie quella copia.
- **`src/sw.js`:** risponde all'indirizzo del modello con la copia nella cache `compilatore-misure-voce`. Se nella cache non c'è, risponde "non trovato" senza andare in rete.
- **Versione:** sito 1.22.0.

## Test

- `test/voce.test.js`, senza il vero Vosk:
  - pulizia: in un database `/vosk` con tre cartelle finte resta solo quella da tenere;
  - pulizia: senza database, la funzione non ne crea uno;
  - il service worker risponde all'indirizzo del modello dalla cache, e senza cache risponde "non trovato".
- `test/vosk-reale.test.js`, con il vero Vosk:
  - dopo due preparazioni nell'archivio c'è una sola cartella, quella fissa;
  - la seconda preparazione non estrae.
- Misura con gli script di questa sessione: tempo, memoria e numero di copie, prima e dopo.
- Tutti gli altri test, con `CC_CHIAVETTA`.
