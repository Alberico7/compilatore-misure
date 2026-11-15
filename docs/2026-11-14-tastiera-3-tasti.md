# Tre tasti per la chiavetta

Data: 2026-11-14
Stato: **realizzato il 2026-11-15** (firmware 1.2.0). L'utente ha deciso di passare subito ai tre tasti, insieme al case stampabile ([2026-11-15-case-chiavetta.md](2026-11-15-case-chiavetta.md)).

Nel simulatore il comando è `PREMI <TASTO> <da>-<a> ...`: più tasti nello stesso comando, con i tempi in ms. Es. `PREMI SCRIVI 0-100 FERMA 1700-1800`. `PREMI <ms>` resta valido per il solo Scrivi.

## Perché

Con il pulsante singolo, ricominciare e aprire l'abbinamento dipendono da quanto lo si tiene premuto. Con tre tasti ognuno fa una cosa sola, e nell'uso normale non ci sono tempi da ricordare.

Volutamente **niente Indietro né Avanti** (scelta dell'utente). Se un inserimento è sbagliato si ricomincia dalla prima coppia: è veloce, e la posizione della chiavetta resta sempre allineata al cursore in macchina.

## Collegamento

Si usano tre tasti della tastiera su PCB a 6 tasti, che ha 7 pin: un comune e uno per tasto. Gli altri tre tasti restano scollegati.
Il pin comune va a GND. Non servono resistenze: si usano quelle interne del Pico verso l'alto.

| Tasto | GPIO | Pin del Pico |
|---|---|---|
| **Scrivi** | GP15 | 20 (lo stesso del pulsante singolo) |
| **Ferma** | GP14 | 19 |
| **Ricomincia** | GP13 | 17 |
| comune | GND | 18 (tra il 17 e il 19) |

Con la presa USB in alto, sono in fondo al lato sinistro.

## Funzioni

| Tasto | Cosa fa |
|---|---|
| **Scrivi** | scrive dopo 1 secondo (tutte le coppie, o il blocco impostato sul sito). Mentre scrive o aspetta: si ferma, come oggi |
| **Ferma** | durante l'attesa o la scrittura: si ferma dopo il valore in corso, mai a metà numero. A chiavetta ferma non fa niente |
| **Ricomincia** | pressione breve: torna alla prima coppia (tre lampi). **Tenuto 5 secondi**: apre l'abbinamento Bluetooth per un minuto |

- **Ricomincia mentre scrive** non fa niente: prima si preme Ferma. Così non si perde il segno a metà scrittura.
- **Modo caricamento** con il cavo: si collega la chiavetta tenendo premuto Scrivi, come oggi.

## Compatibilità con il pulsante singolo

- Se è collegato solo il pulsante su GP15, tutto resta come oggi, pressioni lunghe comprese.
- Anche con i tre tasti, **Scrivi** conserva le pressioni lunghe (2–5 s ricomincia, oltre 5 s abbinamento). Non servono, ma non danno fastidio.
- GP13 e GP14, se non collegati, restano "alti", cioè non premuti. Il firmware non deve sapere se i tasti ci sono.

## Cosa cambia nel codice

- **`motore.c`:**
  - antirimbalzo e funzioni di Ferma e Ricomincia, con `motore_tasto(m, tasto, premuto, ora)`;
  - Ricomincia riusa il ritorno all'inizio e l'apertura dell'abbinamento che ci sono già;
  - la logica di GP15 non cambia.
- **`main.c`:** legge GP13 e GP14 con la resistenza interna verso l'alto; `bi_decl` con il nome dei pin.
- **Firmware 1.2.0.**
- **Simulatore:** comando `PREMI <tasto> <ms>`.
- **Test C:**
  - Ferma durante l'attesa e durante la scrittura;
  - Ferma e Ricomincia a chiavetta ferma;
  - Ricomincia ignorato mentre scrive;
  - Ricomincia tenuto 5 s apre l'abbinamento;
  - il pulsante singolo funziona come prima.
- **LEGGIMI:**
  - sezione "Collegare i tre tasti", con lo schema dei pin;
  - nuova tabella **"Tasti"**, che compare anche nella guida del sito (si aggiunge a `TABELLE`, come "Pulsante" e "LED").

## Da provare sul Pico vero

- Scrivi; Ferma a metà; Scrivi di nuovo, che riparte da dove si era fermata.
- Ricomincia breve, poi Scrivi dalla prima coppia.
- Ricomincia tenuto 5 s, che apre l'abbinamento.
- Solo pulsante singolo, che funziona come prima.
