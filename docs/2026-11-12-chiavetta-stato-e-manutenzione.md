# Chiavetta: versione, "Controlla la chiavetta" e manutenzione

Data: 2026-11-12 (21:30)
Stato: **realizzato** (2026-11-12)

Seguito della revisione di [2026-11-12-chiavetta-pico.md](2026-11-12-chiavetta-pico.md). Tre funzioni nuove e tre lavori di manutenzione.

## 1. Versione del firmware

- La versione si scrive **in un solo posto**: `project(chiavetta VERSION 1.1.0 ...)` in `chiavetta/CMakeLists.txt`.
- Da lì arriva:
  - **al firmware**, come costante di compilazione e nelle informazioni che mostra `picotool info`;
  - **al sito**: `build.js` la legge dal CMakeLists e la scrive nella pagina come "versione del firmware pubblicato".
- La risposta di stato della chiavetta guadagna un campo:
  `STATO n pos crc BT|NOBT stato 1.1.0`
  Il sito accetta anche la risposta vecchia, a 6 campi, e in quel caso dice "versione sconosciuta (firmware precedente)".
- Nella scheda Chiavetta, accanto al link per scaricare il firmware, compare: "Versione pubblicata: 1.1.0".

## 2. "Controlla la chiavetta"

Serve a sapere, prima di andare in macchina o dopo un'interruzione, **cosa c'è nella chiavetta**.

- **Interfaccia:** il collegamento si sceglie una volta, con un selettore **Bluetooth / Cavo**. Sotto ci sono due pulsanti: **"Invia i valori"** e **"Controlla la chiavetta"**. Sostituiscono gli attuali "Invia via Bluetooth" e "Invia con il cavo": restano due pulsanti, ma con una funzione ciascuno. La scelta del collegamento si ricorda nel browser. Se il browser supporta un solo collegamento, il selettore mostra solo quello.
- **"Controlla la chiavetta"** manda solo la richiesta di stato (`S`) e mostra:
  - quanti valori ha la chiavetta e a che punto è ("pronta, dall'inizio", "fermata dopo il valore 12 di 40", "ha finito", "nessun valore");
  - se sono **gli stessi valori della tabella**, confrontando il codice di controllo: "uguali alla tabella" in verde, oppure "diversi dalla tabella: reinvia" in giallo. Il confronto tiene conto anche delle impostazioni (pause, coppie per pressione), perché fanno parte del testo inviato;
  - la versione del firmware e se il Bluetooth è attivo; se la versione è più vecchia di quella pubblicata, un invito ad aggiornarla.
- **Il confronto con la tabella è affidabile solo se il testo è identico.** Il testo contiene una riga di commento con data e ora di creazione, che cambia a ogni invio. Quella riga sparisce: resta solo "# Compilatore misure - N coppie - decimali ...". Così gli stessi valori con le stesse impostazioni danno sempre lo stesso codice di controllo.
- Funziona anche mentre la chiavetta è collegata alla macchina, via Bluetooth: non tocca valori né posizione.

## 3. Titolo della sezione 2

- Titolo: **"In macchina: codici o chiavetta"**.
- Indice in alto: "2 · In macchina".

## 4. Compilare il firmware sul proprio PC

- **LEGGIMI, nuova sezione "Compilare sul proprio PC"**, con la strada consigliata: estensione ufficiale **Raspberry Pi Pico** per VS Code. Installa da sola SDK, compilatore, CMake, Ninja, picotool e pioasm; poi si apre la cartella `chiavetta/` e si compila.
- **Script `chiavetta/compila.ps1`** per chi usa le cartelle dell'estensione (`%USERPROFILE%\.pico-sdk`). Trova SDK e strumenti lì oppure nelle variabili d'ambiente, compila in `chiavetta/build/` e lascia `chiavetta.uf2` dove `npm run build` lo trova e lo mette nel sito.
- **Nuovo comando `npm run firmware`**, che lancia lo script.
- **Prova:** sul mio PC con gli strumenti già scaricati; lo script deve fallire con un messaggio chiaro se non trova SDK o compilatore.

## 5. Dividere `app.js`

- La parte della scheda Chiavetta (circa 150 righe) passa in **`src/app-chiavetta.js`**, un modulo `AppChiavetta` che riceve da `app.js` quello che gli serve: stato, analisi corrente, salvataggio, conferma nella pagina.
- `app.js` torna alla tabella, ai codici, alla prova del lettore e alla dettatura.
- **Nessun cambiamento visibile.** I test esistenti devono passare senza modifiche, a parte quelle dovute ai punti 2 e 3.

## 6. Spiegazioni del LED in un solo posto

- **Le tabelle del LEGGIMI diventano la fonte unica:** quella del LED e quella del pulsante.
- `build.js` le legge da `chiavetta/LEGGIMI.md` e le inserisce nella guida del sito, al posto delle righe scritte a mano, come piccole tabelle.
- **Test:** la guida del sito contiene esattamente le righe del LEGGIMI.

## Test

- **Firmware:**
  - la risposta di stato contiene la versione (`test_dati.c`);
  - il simulatore risponde con la versione presa dal CMakeLists.
- **Sito con il Pico simulato:**
  - "Controlla" con valori uguali, con valori diversi (una casella cambiata) e con impostazioni diverse;
  - chiavetta fermata a metà: posizione mostrata;
  - risposta vecchia senza versione;
  - firmware più vecchio di quello pubblicato;
  - selettore del collegamento ricordato;
  - browser con un solo collegamento disponibile.
- **Codice di controllo stabile:** due invii a orari diversi danno lo stesso codice.
- **Costanti:** il test delle costanti controlla anche la versione (CMakeLists, firmware e sito).
- **Guida:** le tabelle del LED e del pulsante coincidono con il LEGGIMI.
- **Interfaccia:** nuovo titolo e nuovo indice; schermate su PC e telefono.
- **Tutti i test esistenti devono passare.**

## Da provare sul Pico vero (tu)

- "Controlla la chiavetta" via Bluetooth mentre la chiavetta è collegata alla macchina: non deve partire nessun tasto.
- Le correzioni della revisione:
  - un invio con il cavo interrotto e subito ripetuto;
  - il LED in modo caricamento.

## Note di realizzazione (2026-11-12)

- **Versione:** 1.1.0 in `project(chiavetta VERSION 1.1.0 ...)`. Arriva al firmware (`FIRMWARE_VERSIONE`, risposta `STATO ... 1.1.0`), a `picotool info` ("version: 1.1.0") e al sito: `build.js` sostituisce `__VERSIONE_FIRMWARE__` in `chiavetta.js`. Senza la versione il firmware non si compila (`#error`).
- **Testo inviato:** la riga con data e ora è diventata `# N coppie - decimali angolo X, altezza Y`.
- **Interfaccia:** selettore "Collegamento" (Bluetooth / Cavo, ricordato in `chMezzo`) e pulsanti "Invia i valori" / "Controlla la chiavetta". "Controlla" resta attivo anche se la tabella ha errori: dice cosa c'è nella chiavetta, senza confronto.
- **`app.js`:** da 1014 a 879 righe; la scheda è in `src/app-chiavetta.js` (`AppChiavetta.crea(ctx)`).
- **Tabelle Pulsante e LED:** `src/tabelle-md.js` le legge dal LEGGIMI; `build.js` le mette nella guida al posto di `<!--TABELLE_CHIAVETTA-->`. Nel LEGGIMI un commento ricorda che si cambiano solo lì.
- **`compila.ps1` / `npm run firmware`:** provato con una cartella di strumenti inesistente (messaggio chiaro, codice 1) e con gli strumenti scaricati in un'altra disposizione rispetto all'estensione VS Code (trovati tutti, `chiavetta.uf2` creato, versione 1.1.0). Con l'estensione vera va provato da te.
- **Test:** 53, tutti superati. Nuovi: versione unica (CMakeLists, simulatore, pagina), Controlla (uguali, valori diversi, impostazioni diverse, fermata a metà, nessuna modifica nella chiavetta), firmware senza versione o più vecchio, collegamento ricordato e un solo collegamento disponibile, guida uguale al LEGGIMI, nuovo titolo.
