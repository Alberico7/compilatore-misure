# Pubblicazione: il firmware si compila solo quando cambia

Data: 2026-11-23 (21:14)
Stato: **realizzato il 2026-11-23**, confermato dall'utente il 2026-11-23. **Verificato su GitHub il 2026-11-23:** la prima pubblicazione (f5bf4ba) ha compilato il firmware e l'ha tenuto da parte. La seguente (353fe49, sito 1.20.0) l'ha ripreso e ha saltato Strumenti per il Pico, pico-sdk e Compila.

Note di realizzazione:

- **Etichetta:** si calcola una volta, all'inizio (`firmware-` + `hashFiles('chiavetta/**', '!chiavetta/build/**', '.github/workflows/pages.yml')`). La stessa si usa per riprendere e per tenere da parte il firmware, così la cartella `chiavetta/build` creata dalla compilazione non cambia l'impronta.
- **`actions/cache/restore@v6`** e **`actions/cache/save@v6`:** si tiene da parte solo un firmware compilato bene.
- **Il passo "Firmware da pubblicare"** scrive nel registro di GitHub l'impronta SHA-256 del `chiavetta.uf2`, sia compilato sia ripreso, per il confronto.

## Il problema

A ogni push GitHub pubblica il sito in tre passi:

1. **firmware:** scarica da Ubuntu gli strumenti per il Pico (compilatore ARM, cmake…), scarica il pico-sdk e compila il programma della chiavetta (`chiavetta.uf2`);
2. **build:** prova tutto (`npm test`) e prepara il sito, con dentro `chiavetta.uf2`;
3. **deploy:** pubblica.

Il passo 1 si fa **a ogni push**, anche quando il programma della chiavetta non è cambiato, cioè quasi sempre. Il 2026-11-23 il server dei pacchetti di Ubuntu non ha risposto entro 10 minuti in 2 pubblicazioni su 3 (sito 1.16.0 e 1.19.0). Così si è fermato tutto, anche se il sito era a posto.

## Cosa cambia

### Il firmware compilato si tiene da parte

GitHub può tenere da parte dei file tra una pubblicazione e l'altra (la "cache" di GitHub Actions). Il `chiavetta.uf2` compilato si tiene lì, con un'etichetta fatta da un'impronta di:

- tutti i file in `chiavetta/` (sorgenti, CMake, configurazione);
- il file della pubblicazione (`.github/workflows/pages.yml`), perché lì sono scritte le versioni del pico-sdk e degli strumenti.

A ogni pubblicazione:

- **Il programma della chiavetta non è cambiato:** l'etichetta è la stessa. Si prende il `chiavetta.uf2` tenuto da parte e si salta tutto il resto del passo 1: niente Ubuntu e niente pico-sdk. Il passo dura pochi secondi.
- **Il programma è cambiato**, o il file della pubblicazione: l'etichetta è nuova, si compila come oggi e il risultato si tiene da parte per le volte dopo.

Il `chiavetta.uf2` che va sul sito è lo stesso che uscirebbe compilandolo di nuovo, perché viene dagli stessi file.

### Quando si ricompila lo stesso

- GitHub cancella le cose tenute da parte se non le usa nessuno per **7 giorni**. Se non si pubblica per più di una settimana, la volta dopo si ricompila come oggi. In quel caso serve il server di Ubuntu.
- Se si vuole, si può forzare una compilazione nuova dalla pagina Actions di GitHub (pulsante "Run workflow"). Lì si aggiunge una scelta "ricompila il firmware".

### Il resto non cambia

- I passi 2 e 3 restano uguali, con tutti i test.
- Se il server di Ubuntu non risponde quando il firmware va davvero ricompilato, la pubblicazione si ferma come oggi. Succede solo quando cambia il programma della chiavetta, quindi di rado.

## Cosa cambia nel codice

- **`.github/workflows/pages.yml`**, passo firmware:
  - all'inizio, `actions/cache` con l'etichetta `firmware-` + l'impronta di `chiavetta/**` e del file della pubblicazione;
  - se il firmware è già tenuto da parte, si saltano i passi "Strumenti per il Pico", "pico-sdk" e "Compila";
  - la scelta "ricompila il firmware" in `workflow_dispatch`, che ignora quello tenuto da parte.
- Il sito e il firmware non cambiano: nessuna nuova versione. La prossima versione del sito userà già la pubblicazione nuova.

## Prova

Non si può provare in locale, perché è GitHub che lo esegue. Dopo la conferma:

1. push di questa modifica: la prima volta il firmware si compila, perché l'etichetta è nuova, e si tiene da parte;
2. alla pubblicazione dopo, che riguarda solo il sito, nel passo firmware i tre passi risultano saltati, e il sito pubblicato ha lo stesso `chiavetta.uf2` (si confronta l'impronta SHA-256 del file scaricato dal sito).
