# Un valore solo per ogni pressione di 🎤

Data: 2026-11-22 (18:24)
Stato: **realizzato il 2026-11-22** (sito 1.14.0), confermato dall'utente il 2026-11-22. Il vocabolario ristretto di Vosk, di cui si era parlato, per ora no (scelta dell'utente).

Note di realizzazione:

- **La "è" scritta in due modi** (la "e" con l'accento attaccato o a parte) vale lo stesso: il testo riconosciuto si normalizza prima di leggerlo.
- **Una frase con un solo valore e parole non capite** (per esempio «ehm venti») scrive il valore e mostra «Non ho capito: «ehm»», come prima.
- **Il test della pagina** è in `test/voce.test.js`, con il riconoscimento finto.

L'utente segnala che nel modo **Un valore: tieni premuto**, dicendo in fretta «due e settanta», a volte il sito scrive **2** in una casella e **70** in quella dopo. Chiede che in questo modo si scriva sempre **un numero solo** per ogni pressione.

## Perché succede

Il riconoscimento vocale (Vosk) scrive tutte le parole italiane, non solo i numeri. Detto in fretta, «due e settanta» può arrivare al sito in modi diversi:

| Arriva | Oggi |
|---|---|
| due e settanta | 270 |
| due settanta (la "e" persa) | 2, poi 70 nella casella dopo |
| due è settanta | 2, «Non ho capito: è», poi 70 |
| due ed settanta | 2, «Non ho capito: ed», poi 70 |
| due il settanta (visto dall'utente nell'anteprima) | 2, «Non ho capito: il», poi 70 |

Oggi il modo Un valore scrive tutti i numeri che trova nella frase, uno per casella, come il modo Più valori.

## Cosa cambia

### 1. "e", "è", "ed" e "il" valgono uguale

In tutti e due i modi di dettatura, fra una cifra e le decine, "è", "ed" e "il" valgono come "e": «due è settanta», «due ed settanta» e «due il settanta» danno 270.

Valgono così solo in quel punto, fra una cifra da uno a nove e un numero da dieci a novantanove. Altrove restano parole non capite, come oggi. Se in futuro si vedono altri modi in cui arriva la "e", si aggiungono alla lista.

### 2. Nel modo Un valore anche senza "e"

Nel modo **Un valore**, «due settanta» (una cifra da uno a nove, subito seguita da un numero da dieci a novantanove) dà **270**.

Nel modo **Più valori** questo non vale: lì «due settanta» resta due valori, 2 e 70, come oggi.

### 3. Mai più di un valore per pressione

Nel modo **Un valore**, se in una pressione il sito trova ancora più di un numero, **non scrive niente** e mostra:

> Ho sentito più numeri: 2 · 70. Ridetta il valore.

La casella resta quella di prima, così basta ripremere e ridire. È più sicuro che scrivere solo il primo numero, perché non si sa quale dei due fosse giusto.

I comandi («correggi», «indietro», «cancella», «riga dodici», «stop») funzionano come oggi.

### Esempi nel modo Un valore

| Detto (come arriva) | Oggi | Dopo |
|---|---|---|
| due e settanta | 270 | 270 |
| due settanta | 2, poi 70 | **270** |
| due è settanta | 2, poi 70 | **270** |
| due il settanta | 2, poi 70 | **270** |
| due settanta virgola cinque | 2, poi 70,5 | **270,5** |
| venti trenta | 20, poi 30 | **niente**, «Ho sentito più numeri» |
| due e cinque | 2, poi 5 | **niente**, «Ho sentito più numeri» |
| duecentoquattordici virgola nove quattro | 214,94 | 214,94 |

## Cosa cambia nel codice e nei documenti

- **`src/dettato.js`:**
  - "è", "ed" e "il" come "e" fra cifra e decine;
  - `interpreta(frase, { unValore: true })`: unisce anche «cifra + decine» senza "e".
- **`src/app.js`:** il modo Un valore chiama `interpreta` con `unValore`. Se escono più valori, non li scrive e mostra il messaggio.
- **`src/template.html`:** nella guida *Dettatura*, una riga: con Un valore ogni pressione scrive un numero solo.
- **Versione:** sito **1.14.0** (`package.json`). Il firmware resta 1.4.0.

## Test

- **`test/dettato.test.js`:**
  - gli esempi della tabella;
  - nel modo Più valori «due settanta» resta 2 e 70.
- **Pagina, con il riconoscimento finto dei test:**
  - una pressione con «venti trenta» non scrive niente, mostra il messaggio e la casella non si sposta;
  - una pressione con «due settanta» scrive 270.
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
- **Prova vera:** dire in fretta «due e settanta» più volte, tenendo premuto 🎤.
