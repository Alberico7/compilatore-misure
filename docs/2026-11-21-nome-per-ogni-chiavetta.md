# Un nome diverso per ogni chiavetta

Data: 2026-11-21 (21:44)
Stato: **realizzato il 2026-11-21** (firmware 1.4.0, sito 1.9.0), confermato dall'utente il 2026-11-21.

Note di realizzazione:

- **Controlla la chiavetta:** il codice è su una riga a sé, in cima ("Chiavetta **3F2A**"), poi lo stato come prima. Con un firmware vecchio la riga non c'è.
- **Guida del sito:** oltre al LEGGIMI, anche la guida *Chiavetta* in `src/template.html` ha una riga su più chiavette.
- **Test in più:** il nome di base è lo stesso nel sito e nel firmware (`DATI_NOME_BASE`), e in `ble.c` e `usb.c` il nome non è più scritto a mano.

L'utente vuole usare due (o più) chiavette nello stesso momento, con telefoni e PC diversi. Oggi funziona, ma tutte le chiavette si chiamano **"Chiavetta misure"**. Quando il sito chiede di scegliere la chiavetta, nella lista se ne vedono due uguali e non si sa quale sia quale.

## Com'è oggi

- **Bluetooth:** il nome annunciato è fisso, "Chiavetta misure" (`chiavetta/src/ble.c`, `dati_risposta_scansione`). È fisso anche il nome GATT, che il telefono legge dopo il collegamento (`chiavetta/src/chiavetta.gatt`, `GAP_DEVICE_NAME`).
- **USB:** il prodotto si chiama "Chiavetta misure" (tastiera) e "Chiavetta misure - caricamento" (caricamento con il cavo), sempre fissi (`chiavetta/src/usb.c`). Il numero di serie USB invece è già diverso per ogni Pico: è l'ID del chip, 16 cifre esadecimali.
- **Sito:** riceve dal browser il nome della chiavetta scelta (`dispositivo.name` o `productName` in `src/chiavetta.js`), ma non lo mostra.

## Cosa cambia

### 1. Un codice di 4 caratteri per ogni chiavetta

- Il codice sono le **ultime 4 cifre dell'ID del chip** (lo stesso del numero di serie USB), per esempio `3F2A`.
- Non si sceglie e non si imposta: ogni Pico ha già il suo, e resta uguale anche dopo un aggiornamento del firmware.
- La probabilità che due chiavette abbiano lo stesso codice è circa 1 su 65.000.

### 2. Il nome contiene il codice

| Dove | Oggi | Dopo |
|---|---|---|
| Bluetooth (lista del telefono e del sito) | Chiavetta misure | **Chiavetta misure 3F2A** |
| USB, tastiera (Windows) | Chiavetta misure | **Chiavetta misure 3F2A** |
| USB, caricamento con il cavo | Chiavetta misure - caricamento | **Chiavetta misure 3F2A - caricamento** |

- Il nome Bluetooth sta nella risposta alla scansione: 21 caratteri, sotto il limite di 29.
- Il nome GATT diventa *dinamico*, cioè lo dà il firmware quando il telefono lo legge, uguale a quello annunciato. Così il telefono non mostra un nome diverso dopo il collegamento.
- Il passkey, l'abbinamento, i comandi e le risposte non cambiano. Il protocollo resta lo stesso, quindi un sito vecchio funziona con il firmware nuovo, e il sito nuovo con un firmware vecchio.

### 3. Il sito mostra quale chiavetta è collegata

- Dopo **Invia** e dopo **Controlla la chiavetta**, il messaggio comincia con il codice. Per esempio: "Chiavetta **3F2A**: 12 valori caricati…".
- Il sito prende il codice dal nome che gli dà il browser. Se il nome non ha il codice (firmware vecchio), scrive "Chiavetta" come oggi.
- Il sito non ricorda le chiavette e non le collega fra loro: ogni volta si sceglie dalla lista, come oggi.

### 4. Istruzioni

In `chiavetta/LEGGIMI.md`, che finisce anche nella guida del sito:

- "scegli *Chiavetta misure*" diventa "scegli la tua chiavetta, *Chiavetta misure* seguito dal suo codice";
- una parte nuova, **Più chiavette**:
  - ognuna ha il suo codice, che si legge con *Controlla la chiavetta*;
  - conviene scriverlo sul case, per esempio con un pennarello o un'etichetta;
  - ogni chiavetta tiene un solo telefono abbinato, come oggi;
  - per il primo abbinamento, una chiavetta alla volta.

## Cosa bisogna sapere

- **Il telefono può ricordare il nome vecchio.** Per una chiavetta già abbinata, il telefono a volte continua a mostrare "Chiavetta misure" finché non si rifà l'abbinamento. Non è un problema, funziona lo stesso. Il nome nuovo compare di sicuro dopo un nuovo abbinamento (pressione di 5 secondi).
- **Windows** mostra il nome nuovo appena si ricollega il cavo.

## Cosa cambia nel codice e nei documenti

- **`chiavetta/src/dati.c` e `dati.h`:** una funzione pura che, dato l'ID del chip, prepara il codice di 4 caratteri e il nome. Così si prova nei test senza il Pico.
- **`chiavetta/src/ble.c`:** la risposta alla scansione si prepara all'avvio con il nome completo; la lettura del nome GATT risponde con lo stesso nome.
- **`chiavetta/src/chiavetta.gatt`:** `GAP_DEVICE_NAME` diventa `READ | DYNAMIC`.
- **`chiavetta/src/usb.c`:** i nomi del prodotto (tastiera e caricamento) con il codice.
- **`src/chiavetta.js`:** estrae il codice dal nome (`Chiavetta misure XXXX`).
- **`src/app-chiavetta.js`:** mostra il codice nei messaggi di Invia e Controlla.
- **`chiavetta/LEGGIMI.md`:** come detto sopra.
- **Versioni:**
  - firmware **1.4.0** (`chiavetta/CMakeLists.txt`);
  - sito **1.9.0** (`package.json`).

## Test

- **Firmware (`chiavetta/test/test_dati.c`):**
  - dato un ID, il codice è le sue ultime 4 cifre, in maiuscolo;
  - il nome è "Chiavetta misure XXXX", e non supera la lunghezza massima.
- **Sito:**
  - con il nome "Chiavetta misure 3F2A" il messaggio mostra `3F2A`;
  - con il nome vecchio "Chiavetta misure" il messaggio resta come oggi;
  - tutti i test con `CC_CHIAVETTA`.
- **Firmware compilato su GitHub senza errori.**
- **Prova vera, dopo la pubblicazione:**
  - caricare il firmware;
  - controllare il nome sul telefono, nella lista del sito e in Windows;
  - fare Controlla la chiavetta.
