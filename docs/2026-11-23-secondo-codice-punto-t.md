# Secondo codice a barre: il nome del programma con ".t"

Data: 2026-11-23 (21:48)
Stato: **realizzato il 2026-11-23** (sito 1.20.0), confermato dall'utente il 2026-11-23. Il codice con ".t" è il programma per l'affilatura in testa, e si legge anche lui nel caricatore.

Richiesta dell'utente: oltre al codice a barre del nome del programma (sito 1.18.0), serve un secondo codice con lo stesso nome seguito da **.t**. Esempio: per **FRESA-1234** il secondo codice scrive **FRESA-1234.t**.

## Cosa cambia

### Due codici nel riquadro "Nome del programma"

In cima alla sezione 2 ci sono due codici, uno sotto l'altro. Ognuno ha un titolo sopra e il testo in chiaro sotto:

1. **Programma**: **FRESA-1234**, il nome, come oggi;
2. **Affilatura in testa**: **FRESA-1234.t**, il nome con ".t" in fondo. È il programma per l'affilatura in testa, e si scrive anche questo nella pagina del caricatore (spiegazione dell'utente).

Il ".t" lo aggiunge il sito: nella casella si scrive solo il nome, come oggi. Se il nome finisce già con ".t" (per esempio "FRESA-1234.t"), il secondo codice non aggiunge un altro ".t". In quel caso i due codici sarebbero uguali, quindi se ne mostra uno solo.

La nota sotto i codici dice dove leggerli: «In macchina, nella pagina del caricatore: cursore sul campo del programma o dell'affilatura in testa, poi leggi il codice giusto».

### Lunghezza

Ogni codice può avere al massimo 40 caratteri, come oggi. Il secondo ne ha 2 in più. Quindi con un nome di 39 o 40 caratteri il primo codice c'è, e al posto del secondo il sito dice «Con ".t" il nome ha 42 caratteri: nel codice a barre ne stanno al massimo 40».

### Il punto

Il punto esce uguale con la tastiera italiana e con quella americana. Per questo, se nel nome ci sono solo lettere, cifre e il punto, la nota «Prova una volta che i segni escano giusti» non compare. Il trattino invece può uscire diverso, quindi con "FRESA-1234" la nota resta.

### Stampa

Nella stampa escono tutti e due i codici, in cima.

## Cosa cambia nel codice

- **`src/app.js`:** `mostraNomeProgramma()` disegna i due codici, ognuno controllato con `Logica.testoPerCodice()`; la nota sui segni ignora il punto.
- **`src/template.html`:** CSS per i due codici; nella guida, la riga sul codice del nome dice che c'è anche quello con ".t".
- **Versione:** sito **1.20.0**. Il firmware resta 1.4.0.

## Test

- **Pagina:**
  - con "FRESA-1234" i due codici si decodificano esattamente in "FRESA-1234" e "FRESA-1234.t";
  - con "FRESA.t" c'è un codice solo;
  - con un nome di 39 caratteri c'è il primo codice, e al posto del secondo il messaggio;
  - con "ALBERO7" niente nota sui segni; con "FRESA-1234" la nota c'è;
  - sul telefono i due codici stanno dentro lo schermo.
- **Tutti gli altri test**, con `CC_CHIAVETTA`. Alla pubblicazione, controllo che il firmware venga ripreso da quello già compilato, senza ricompilarlo (docs/2026-11-23-firmware-solo-se-cambia.md).
