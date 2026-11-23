# Chiavetta-tastiera (Raspberry Pi Pico 2 W)

Per la macchina è una **tastiera USB**. Quando premi il suo pulsante scrive i valori caricati dal sito, ciascuno seguito da INVIO. Sul PC della macchina non si installa niente.

I valori si caricano dal [sito](https://alberico7.github.io/compilatore-misure/), scheda **Chiavetta**:
- **via Bluetooth** dal telefono;
- **con il cavo**, dal telefono o dal PC.

> **Sicurezza:** la chiavetta compila solo i campi, non avvia cicli. Prima di avviare la tastatura controlla sempre i valori sullo schermo della macchina.

## Cosa serve

- **Raspberry Pi Pico 2 W**, meglio la versione "WH" con i pin già saldati.
- **Un pulsante** normalmente aperto, per esempio un pulsantino da circuito stampato. In alternativa **tre tasti**: Scrivi, Ferma e Ricomincia.
- Facoltativo: il **case stampabile in 3D** per il Pico e i tre tasti, in [case/](../case/LEGGIMI.md).
- **Un cavo micro-USB → USB-A** corto e di buona qualità, per la macchina e il PC.
- Per caricare dal telefono con il cavo, **un cavo USB-C → micro-USB** (oppure un adattatore OTG).

## Collegare il pulsante

Il pulsante va tra il pin **20 (GP15)** e il pin **18 (GND)**. Guardando il Pico dall'alto con la presa USB in alto, sono in fondo al lato sinistro.

```
            USB
        ┌───┴┴───┐
  pin 1 │●      ●│ pin 40
   ...  │        │  ...
 pin 18 │● GND   │
 pin 19 │● GP14  │
 pin 20 │● GP15  │
        └────────┘
  pulsante tra pin 18 e pin 20
```

- Non servono resistenze: la chiavetta usa quella interna verso l'alto. È il collegamento consigliato per l'RP2350, perché le resistenze interne verso il basso hanno un difetto noto (erratum E9).
- Il LED è quello già montato sul Pico.

### Oppure tre tasti

Con tre tasti ognuno fa una cosa sola, e nell'uso normale non ci sono tempi da ricordare. Scrivi è il pulsante di sopra; si aggiungono Ferma e Ricomincia. Ogni tasto va tra il suo pin e il comune **GND (pin 18)**:

```
            USB
        ┌───┴┴───┐
  pin 1 │●      ●│ pin 40
   ...  │        │  ...
 pin 17 │● GP13  │  Ricomincia
 pin 18 │● GND   │  comune
 pin 19 │● GP14  │  Ferma
 pin 20 │● GP15  │  Scrivi
        └────────┘
```

- Anche qui niente resistenze.
- I tasti non collegati non danno fastidio: con il solo pulsante tutto funziona come prima.
- Con i tre tasti, Scrivi conserva anche le pressioni lunghe del pulsante.

## Installare il firmware

1. Scarica [chiavetta.uf2](https://alberico7.github.io/compilatore-misure/chiavetta.uf2), oppure il link nella scheda Chiavetta del sito.
2. Tieni premuto il tasto **BOOTSEL** sul Pico e collegalo al PC. Compare un'unità chiamata **RP2350**.
3. Copia `chiavetta.uf2` nell'unità. Il Pico si riavvia da solo e l'unità sparisce.

Per aggiornare il firmware si ripete la stessa cosa. I valori e il codice Bluetooth restano salvati.

## Due modi all'accensione

| Come la colleghi | Cosa fa |
|---|---|
| **Senza** premere il pulsante | Tastiera USB (solo cifre, "−" del tastierino numerico e INVIO), più il Bluetooth se hai impostato un codice. **È il modo per la macchina.** |
| **Tenendo premuto** il pulsante | **Caricamento con il cavo** (WebUSB): niente tastiera e niente Bluetooth. Il LED fa un lampo al secondo, e resta acceso mentre arrivano i dati dal sito. |

## Primo uso: codice Bluetooth

1. Collega la chiavetta al telefono o al PC **tenendo premuto il pulsante**.
2. Sul sito apri **Chiavetta → Codice Bluetooth e firmware**, premi **Genera** (oppure scrivi 6 cifre) e poi **Imposta con il cavo**. **Annota il codice.**
3. Scollega la chiavetta e ricollegala **senza** premere il pulsante.
4. Tieni premuto il pulsante (o **Ricomincia**, se hai i tre tasti) per **5 secondi**: il LED fa due lampi ripetuti e l'abbinamento resta aperto per un minuto.
5. Sul telefono premi **Invia via Bluetooth**, scegli la tua chiavetta, cioè "Chiavetta misure" seguito dal suo codice (per esempio "Chiavetta misure 3F2A"), e inserisci il codice Bluetooth quando il telefono lo chiede.

**Il telefono abbinato è uno solo:** un nuovo abbinamento sostituisce il precedente. Se cambi il codice, gli abbinamenti vengono cancellati. Finché il codice non è impostato, il Bluetooth resta spento.

## Più chiavette

Si possono usare più chiavette nello stesso momento, ognuna con il suo telefono e il suo PC.

- **Ogni chiavetta ha un codice di 4 caratteri**, per esempio `3F2A`: sono le ultime cifre del numero del chip del Pico. Non si imposta: c'è già, ed è sempre lo stesso, anche dopo un aggiornamento del firmware.
- Il codice è nel nome che vedi sul telefono, sul sito e in Windows: **"Chiavetta misure 3F2A"**. Dopo **Invia** e **Controlla la chiavetta** il sito scrive quale chiavetta ha usato.
- **Scrivi il codice sul case**, con un pennarello o un'etichetta, così sai sempre quale prendere dalla lista.
- Ogni chiavetta tiene **un solo telefono** abbinato. Un telefono si può abbinare a più chiavette.
- Per il primo abbinamento, tieni aperta la finestra (5 secondi) su **una chiavetta alla volta**.
- Un telefono già abbinato con un firmware precedente può mostrare ancora il nome vecchio, "Chiavetta misure". Funziona lo stesso; per vedere il nome nuovo, rifai l'abbinamento.

## Uso in macchina

1. Carica i valori dal sito: scegli **Bluetooth** o **Cavo** e premi **Invia i valori**. Il sito controlla che il **codice di controllo** della chiavetta sia uguale al suo.
2. Collega la chiavetta alla macchina **senza** premere il pulsante: il LED fa due lampi e poi resta acceso fisso (pronta).
3. Metti il cursore sul campo **Grado 1** della maschera.
4. **Premi il pulsante** (o Scrivi): dopo mezzo secondo inizia a scrivere.
5. Controlla i valori sullo schermo della macchina **prima** di avviare la tastatura.

<!-- Le tabelle "Pulsante", "Tasti" e "LED" finiscono anche nella guida del sito (src/build.js): si cambiano solo qui. -->

| Pulsante | Effetto |
|---|---|
| Pressione breve, da pronta o fermata | Scrive, dopo mezzo secondo |
| Pressione mentre scrive (o nel mezzo secondo di attesa) | Si ferma dopo il valore in corso, mai a metà numero |
| Tenuto da 2 a 5 secondi | Torna all'inizio; poi una pressione breve scrive dal primo valore |
| Tenuto più di 5 secondi | Apre l'abbinamento Bluetooth per un minuto |
| Pressione breve quando ha finito | Niente: per riscrivere tutto, prima tenere premuto 2–5 secondi |

| Tasti | Effetto |
|---|---|
| **Scrivi** | Come il pulsante, pressioni lunghe comprese |
| **Ferma** | Durante la scrittura o il mezzo secondo di attesa: si ferma dopo il valore in corso, mai a metà numero. A chiavetta ferma non fa niente |
| **Ricomincia**, pressione breve | Torna alla prima coppia (tre lampi); poi Scrivi scrive dal primo valore |
| **Ricomincia** tenuto 5 secondi | Apre l'abbinamento Bluetooth per un minuto. Quando lo puoi lasciare, il LED fa già il doppio lampo |
| **Ricomincia** mentre scrive | Niente: prima premi Ferma, così non perdi il segno |

Con "Coppie per pressione" diverso da 0, ogni pressione scrive quel numero di coppie e poi si ferma. Serve se la maschera cambia pagina.

| LED | Significato |
|---|---|
| Acceso fisso | Pronta, dall'inizio |
| Lampeggio veloce | Sta scrivendo |
| Lampeggio lento (mezzo secondo) | Fermata a metà o a fine blocco |
| Un lampo ogni 2 secondi | Ha finito |
| Lampi lunghi (1 secondo acceso, 1 spento) | Nessun valore caricato |
| Doppio lampo ripetuto | Abbinamento Bluetooth aperto |
| Tre lampi veloci | Valori nuovi caricati, oppure tornata all'inizio |

## Controllare la chiavetta

Nella scheda Chiavetta del sito, **Controlla la chiavetta** chiede alla chiavetta cosa contiene e mostra:
- quale chiavetta è, con il suo codice (vedi *Più chiavette*);
- quanti valori ha e a che punto è ("pronta dall'inizio", "fermata dopo il valore 12 di 40", "ha finito");
- se sono **uguali alla tabella** del sito, impostazioni comprese (pause, coppie per pressione);
- la **versione del firmware**, con un avviso se sul sito ce n'è una più nuova;
- se il Bluetooth è acceso.

Via Bluetooth funziona anche con la chiavetta collegata alla macchina: non cambia niente e non fa partire nessun tasto.

## Se qualcosa non va

- **La maschera perde caratteri:** aumenta "Pausa tra i tasti" (per esempio 60 ms) e reinvia.
- **Salta un campo o due valori finiscono attaccati:** aumenta "Pausa dopo INVIO" (per esempio 400 ms).
- **Il segno meno non arriva:** la chiavetta manda il "−" del **tastierino numerico**. Verifica che la maschera lo accetti, provando con una tastiera vera.
- **Il telefono non trova la chiavetta:** dev'essere collegata senza premere il pulsante, con il codice impostato. Usa Chrome su Android (Web Bluetooth). Su Vanadium, se non funziona, prova Chrome.
- **"Collegamento perso" al primo invio:** apri l'abbinamento (pulsante tenuto 5 secondi) e riprova entro un minuto.
- **La chiavetta rifiuta i dati mentre scrive:** aspetta che finisca, oppure fermala con una pressione (o con Ferma).

## Per sviluppatori

Il firmware è in C, con l'[SDK ufficiale Raspberry Pi](https://github.com/raspberrypi/pico-sdk) 2.3.1. Usa **TinyUSB** per tastiera e WebUSB e **BTstack** per il Bluetooth LE.

| File | Cosa contiene |
|---|---|
| `src/dati.c` | Parte pura: lettura e controllo del testo, CRC-32, tasti, protocollo |
| `src/motore.c` | Parte pura: scrittura, pulsante e tasti, LED |
| `src/protocollo.c` | Parte pura: cosa fare con ogni pacchetto ricevuto |
| `src/main.c`, `src/usb.c`, `src/ble.c`, `src/memoria.c`, `src/chiavetta.gatt` | Le parti che usano l'hardware |
| `test/test_dati.c` | Test della parte pura (con `npm test`, oppure da solo) |
| `test/simulatore.c` | Pico simulato usato dai test del sito |
| `compila.ps1` | Compilazione su Windows con gli strumenti dell'estensione VS Code (`npm run firmware`) |

La **versione** si cambia solo in `CMakeLists.txt` (`project(chiavetta VERSION x.y.z ...)`). Da lì arriva al firmware (risposta di stato), a `picotool info` e al sito, che la mostra come "versione pubblicata".

### Compilare sul proprio PC

Su GitHub Actions il firmware si compila a ogni push e `chiavetta.uf2` finisce sul sito. Per compilarlo su Windows:

1. Installa **VS Code** e l'estensione **Raspberry Pi Pico** (di Raspberry Pi).
2. Con l'estensione crea una volta un progetto di prova per **Pico 2 W**, con SDK **2.3.1** o successivo. Così scarica in `%USERPROFILE%\.pico-sdk` l'SDK, il compilatore ARM, CMake, Ninja, picotool e pioasm.
3. Nella cartella del progetto: `npm run firmware`. Lo script `compila.ps1` trova da solo gli strumenti e crea `chiavetta/build/chiavetta.uf2`. Poi `npm run build` lo mette nel sito.

Se gli strumenti sono altrove: `PICO_STRUMENTI` (cartella in cui cercarli) e `PICO_SDK_PATH` (l'SDK). Con `-Pulisci` lo script ricomincia da zero. Su Linux e macOS: `cmake -S chiavetta -B chiavetta/build -G Ninja && cmake --build chiavetta/build`, con `PICO_SDK_PATH` impostata.

**Protocollo** (uguale per Bluetooth e cavo):

| Pacchetto | Significato |
|---|---|
| `I` + lunghezza + CRC-32 | Inizio |
| `D` + dati | Dati, uno o più pacchetti in ordine |
| `F` | Fine |
| `S` | Stato |
| `P` + codice | Codice Bluetooth (solo con il cavo) |

- Risposte: `OK n crc`, `ERRORE nome riga`, `STATO n pos crc BT|NOBT stato versione`, `CODICE OK|SPENTO`. Il firmware 1.0 non manda la versione: il sito lo riconosce e invita ad aggiornarlo.
- Con il cavo ogni pacchetto è preceduto dalla sua lunghezza (2 byte).
- Il servizio Bluetooth è `0f600001-7d5c-4ab1-a5aa-df4e1c99d7c0`. WebUSB usa VID `0x1209` e PID `0x0006`, con `0x0005` per la tastiera: sono PID di prova di pid.codes, adatti a un dispositivo privato.

Licenza: il codice della chiavetta ha la stessa licenza del progetto (PolyForm Noncommercial 1.0.0), vedi `../LICENSE`.

Il firmware compilato contiene anche componenti di terze parti:
- pico-sdk (BSD-3-Clause);
- TinyUSB (MIT);
- BTstack, con la licenza che Raspberry Pi concede a chi usa il Pico 2 W;
- cyw43-driver, utilizzabile solo con i chip Raspberry Pi.

I testi completi sono in [LICENZE-TERZE-PARTI.txt](LICENZE-TERZE-PARTI.txt).
