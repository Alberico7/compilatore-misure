# Attesa di mezzo secondo prima di scrivere

Data: 2026-11-21 (17:46)
Stato: **realizzato il 2026-11-21** (firmware 1.3.0, sito 1.8.1), confermato dall'utente il 2026-11-21.

Nota di realizzazione: anche `test/chiavetta.test.js` (sito e firmware insieme) aveva i tempi pensati per 1 secondo. Ferma e Ricomincia, premuti a 1150 e 1200 ms, ora sono premuti a 650 e 700 ms. Così cadono ancora durante la scrittura del primo valore dopo la partenza, come prima.

L'utente ha chiesto che la chiavetta, dopo la pressione di Scrivi, aspetti **mezzo secondo** prima di scrivere, invece di 1 secondo.

## Com'è oggi

- Quando si lascia il pulsante (o Scrivi), la chiavetta aspetta **1 secondo** e poi scrive. Durante l'attesa il LED è acceso fisso.
- Una pressione durante l'attesa (Scrivi o Ferma) annulla la scrittura.
- Il tempo è fisso nel firmware: `MOTORE_ATTESA_MS = 1000` in `chiavetta/src/motore.h`.

## Cosa cambia

- L'attesa diventa di **500 ms**. Si conta sempre da quando si lascia il tasto.
- Il resto non cambia:
  - per annullare si preme di nuovo durante l'attesa, che ora dura mezzo secondo;
  - il LED resta acceso fisso durante l'attesa;
  - le pressioni lunghe (2–5 secondi per ricominciare, più di 5 per l'abbinamento) restano uguali, perché si contano mentre il tasto è premuto, prima dell'attesa.
- Mezzo secondo basta per togliere il dito dal tasto prima che arrivi il primo numero. Il cursore sul campo Angolo 1 si mette prima di premere, come oggi.

## Cosa cambia nel codice e nei documenti

- **`chiavetta/src/motore.h`:** `MOTORE_ATTESA_MS` da 1000 a 500, e il commento di `ST_ATTESA`.
- **`chiavetta/test/test_dati.c`:** il commento "dopo 1 s". I test usano già `MOTORE_ATTESA_MS`, quindi seguono da soli.
- **`chiavetta/LEGGIMI.md`:** "dopo 1 secondo" diventa "dopo mezzo secondo"; "nel secondo di attesa" diventa "nel mezzo secondo di attesa". Le tabelle finiscono anche nella guida del sito.
- **`src/template.html`:** la guida "dopo 1 secondo scrive" diventa "dopo mezzo secondo scrive".
- **Versioni:**
  - firmware **1.3.0** (`chiavetta/CMakeLists.txt`), così il sito invita ad aggiornare chi ha la 1.2.0;
  - sito **1.8.1**.
- **`chiavetta.uf2`** lo compila GitHub a ogni push e lo mette sul sito.

## Test

- Test della parte pura del firmware (`test_dati.c`):
  - prima di 500 ms non scrive niente;
  - dopo 500 ms scrive tutto;
  - Ferma durante l'attesa annulla.
- Firmware compilato senza errori.
- Test del sito: passano tutti, con `CC_CHIAVETTA` per il Pico simulato.
- Dopo la pubblicazione: caricare il nuovo `chiavetta.uf2` e provare con il Blocco note.
