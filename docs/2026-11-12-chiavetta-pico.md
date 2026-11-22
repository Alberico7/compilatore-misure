# Chiavetta-tastiera con Raspberry Pi Pico 2 W

Data: 2026-11-12 (aggiornato alle 20:34)
Stato: **confermato** (2026-11-12), in realizzazione

## Perché

Se in macchina i codici a barre o i QR non funzionano (lettore che non legge dallo schermo, maschera che perde caratteri, layout della tastiera), serve un'altra strada senza installare niente sul PC della macchina: un dispositivo USB che la macchina vede come **tastiera** e che scrive da solo la sequenza `angolo 1, INVIO, altezza 1, INVIO, …`.

Scheda scelta: **Raspberry Pi Pico 2 W** (RP2350 + WiFi/Bluetooth CYW43439), per compatibilità e reperibilità (in produzione almeno fino al 2040).

## Cosa serve

- Raspberry Pi Pico 2 W (meglio con i pin già saldati, "2 WH").
- Un pulsante normalmente aperto, collegato tra **GP15** e **GND** (due fili).
- Un cavo **micro-USB → USB-A** corto e di buona qualità.
- Facoltativo: una scatolina.

## Come si usa

### Caricare i valori

**A) Dal telefono, via Bluetooth (la strada principale)**

1. Sul sito, sezione "Codici", nuova scheda **"Chiavetta"**. Pulsante **"Invia alla chiavetta"**, attivo solo se tutti i valori sono corretti, come per i codici.
2. Il browser chiede di scegliere il dispositivo ("Chiavetta misure"). La prima volta il telefono chiede il **codice di abbinamento** (vedi "Sicurezza").
3. La chiavetta controlla i dati e risponde. Il sito mostra **"Chiavetta: 40 valori caricati, controllo 3F2A"**, con lo stesso codice di controllo calcolato dal sito: se coincidono, i valori sono arrivati identici.
4. I valori restano salvati nella chiavetta anche scollegandola.

Funziona con **Chrome su Android** (e con Chrome/Edge su PC con Bluetooth). Non funziona su iPhone. Su Vanadium va verificato se Web Bluetooth è attivo; se no si usa Chrome.

**B) Con il cavo, dal telefono o dal PC (WebUSB)**

1. Si collega il Pico **tenendo premuto il pulsante**: in questo modo si presenta come dispositivo per il caricamento, non come tastiera.
   - **Telefono Android:** cavo USB-C → micro-USB, oppure adattatore OTG. Il telefono alimenta il Pico.
   - **PC:** porta USB normale.
2. Sul sito, **"Invia alla chiavetta con il cavo"**: il browser mostra il selettore, si sceglie "Chiavetta misure". Stessa conferma con numero di valori e codice di controllo.

WebUSB funziona con Vanadium sul Pixel 7a (collaudato nel progetto delle etichette), con Chrome su Android e con Chrome/Edge su PC. Il Pico dichiara da sé i descrittori di Windows (WinUSB), quindi su PC non serve installare driver.

### In macchina

1. Si collega il Pico **senza** premere niente. Per la macchina è **solo una tastiera USB "boot"**, il tipo più semplice, senza unità disco né porta seriale. Il LED fa due lampeggi: "pronto".
2. Si mette il cursore sul campo **Angolo 1** della maschera e si **preme il pulsante**:
   - il LED resta acceso 1 secondo (tempo per togliere il dito), poi il Pico scrive i valori, ciascuno seguito da INVIO;
   - mentre scrive, il LED lampeggia; alla fine resta acceso fisso.
3. **Fermarsi e ripartire:**
   - una pressione mentre scrive lo **ferma subito**, dopo il valore in corso;
   - una pressione breve dopo una fermata **riprende dal valore successivo**;
   - una pressione lunga (da 2 a 5 secondi) **riporta all'inizio**, confermata da tre lampeggi veloci; poi una pressione breve scrive dal primo valore. Non parte da sola, così non si riscrive niente per sbaglio;
   - finita la scrittura, una pressione breve non fa niente: per riscrivere tutto serve la pressione lunga.
4. Si possono caricare nuovi valori dal telefono anche con la chiavetta collegata alla macchina, ma **solo mentre non sta scrivendo**: durante la scrittura il Bluetooth rifiuta i dati. Nuovi valori riportano la posizione all'inizio.
5. **Controllare i valori sullo schermo della macchina prima di avviare la tastatura.**

## Dati inviati

Lo stesso testo per Bluetooth e cavo, leggibile:

```
# Compilatore misure - 2026-11-12 19:20 - 20 coppie - decimali angolo 2, altezza 2
ritardo_carattere_ms = 30
ritardo_invio_ms = 200
coppie_per_pressione = 0
21494
2694
...
```

- `ritardo_carattere_ms`: pausa tra un tasto e l'altro (se la maschera perde caratteri, si aumenta).
- `ritardo_invio_ms`: pausa dopo ogni INVIO, per dare tempo alla maschera di passare al campo dopo.
- `coppie_per_pressione`: 0 vuol dire tutte in una volta. Con 10, ogni pressione scrive 10 coppie e poi si ferma (se la maschera cambia pagina).
- I ritardi e le coppie per pressione si impostano sul sito nella scheda "Chiavetta" (predefiniti 30 ms, 30 ms, 0; fino al sito 1.12.0 la pausa dopo INVIO era 200 ms, vedi `docs/2026-11-22-pausa-invio-30ms.md`).
- Valori: solo cifre, con un eventuale meno all'inizio. Al massimo 1000 valori.
- Il testo viaggia con lunghezza e codice di controllo (CRC-32). Se arriva incompleto o contiene una riga non valida, la chiavetta **scarta tutto e tiene i valori precedenti**, e il sito mostra l'errore.

## Tasti mandati e layout della tastiera

Il Pico manda i **codici dei tasti**, non i caratteri. Per non dipendere dal layout impostato sulla macchina (tedesco, italiano o inglese):

- **cifre:** i tasti della fila in alto, nella stessa posizione con layout tedesco, italiano e inglese;
- **segno meno:** il tasto **"−" del tastierino numerico**, uguale su tutti i layout e indipendente da Bloc Num;
- **INVIO:** il tasto Invio principale.

## Sicurezza

1. **Solo questi tasti.** Il firmware non contiene altri codici di tasto: niente lettere, Tab, Ctrl, Alt, tasti Windows o tasti funzione. Qualunque cosa arrivi, la chiavetta non può aprire menu, finestre o comandi.
2. **La scrittura parte solo dal pulsante fisico.** Dal telefono si caricano i valori, mai il via.
3. **Abbinamento Bluetooth protetto.** LE Secure Connections con codice di 6 cifre. Il Pico non ha uno schermo, quindi il codice è **fisso, scelto da te**. Si imposta **dal sito, con il cavo** (scheda "Chiavetta" → "Codice Bluetooth") e resta salvato nel Pico. Non sta nel firmware: il file `.uf2` è pubblico e chiunque potrebbe leggerlo. Finché il codice non è impostato, il Bluetooth resta spento. Cambiando il codice si cancellano anche gli abbinamenti. L'abbinamento si apre solo per 60 secondi, **tenendo premuto il pulsante per 5 secondi** quando la chiavetta è ferma (LED che lampeggia lento). Si ricorda **un solo telefono**: un nuovo abbinamento sostituisce il precedente. Senza abbinamento il Bluetooth rifiuta qualunque scrittura.
4. **Controllo dei dati** con lunghezza e CRC-32. Con dati non validi non si scrive niente.
5. **WiFi spento**, sempre.

## Firmware

- **Linguaggio e strumenti:** C con l'**SDK ufficiale Raspberry Pi** (pico-sdk, ultima versione stabile verificata al momento della realizzazione), **TinyUSB** per l'USB e **BTstack** per il Bluetooth, entrambi inclusi nell'SDK.
- **Modi all'accensione:**
  - **senza pulsante:** tastiera USB "boot" pura (un solo dispositivo, nessun altro) e Bluetooth;
  - **con il pulsante premuto:** interfaccia WebUSB per caricare i valori dal telefono o dal PC. Niente tastiera, niente Bluetooth.
- **Memoria:** gli ultimi valori validi in un settore della flash, con la stessa intestazione di controllo.
- **LED:** quello a bordo (sul Pico 2 W passa dal chip wireless).
- **Cartella `chiavetta/` nel repository:**
  - `src/dati.c`: la parte pura, senza hardware (lettura e controllo del testo, CRC, dai valori ai codici dei tasti, blocchi, posizione). Si compila e si prova anche sul PC;
  - `src/main.c`, `src/usb.c`, `src/ble.c`, `src/flash.c`: le parti che usano l'hardware;
  - `CMakeLists.txt` e `LEGGIMI.md`: come caricare il firmware (tenere premuto BOOTSEL, collegare, copiare il file `.uf2`), come collegare il pulsante, come abbinare il telefono.
- **Compilazione:** in GitHub Actions. Il file `chiavetta.uf2` si scarica dal sito. Non contiene segreti: il codice di abbinamento si imposta con il cavo.

## Sito

- Nuova scheda **"Chiavetta"** in "Codici", con le impostazioni (ritardi, coppie per pressione), i pulsanti "Invia alla chiavetta" (Bluetooth) e "Invia con il cavo" (WebUSB, da telefono o PC), e il risultato: valori caricati e codice di controllo.
- Pulsanti nascosti se il browser non supporta Web Bluetooth o WebUSB, con una riga che spiega perché.
- Guida aggiornata: nuova voce "Chiavetta".

## Test

- **Parte pura del firmware**, compilata sul PC e in CI:
  - lettura del testo: commenti, impostazioni, righe non valide, CRC sbagliato, troppi valori;
  - sequenza dei tasti per ogni valore, anche negativo;
  - blocchi con `coppie_per_pressione`, ferma, riprendi e riparti.
- **Traduzione dei tasti:** la sequenza, tradotta con il layout **tedesco** e con quello **italiano**, dà esattamente il testo atteso (`21494⏎2694⏎…`, `-150⏎`).
- **Firmware completo:** compilato in CI per il Pico 2 W, così ogni modifica produce un `.uf2` valido.
- **Sito:** Bluetooth e WebUSB simulati nei test con Playwright. Si controlla che il testo inviato contenga esattamente i valori dei codici a barre, nello stesso ordine, con CRC corretto, divisione in pacchetti e gestione di errori e disconnessioni. Con dati non validi i pulsanti non sono attivi.
- **Sul Pico vero (tu):**
  1. collegato al PC dell'ufficio, scrive nel Blocco note e nella "Prova del lettore" del sito, che confronta già quello che arriva con i valori attesi;
  2. invio con il cavo dal telefono, poi abbinamento e invio via Bluetooth;
  3. in macchina, prima con 2 o 3 coppie.

## Ordine di lavoro

1. Parte pura (`dati.c`) con i suoi test.
2. Firmware tastiera e caricamento con il cavo (WebUSB): si prova subito, dal PC o dal telefono.
3. Bluetooth con abbinamento.
4. Scheda "Chiavetta" sul sito.

Per compilare in locale installo l'SDK (estensione ufficiale Raspberry Pi Pico per VS Code, oppure toolchain ARM e CMake). Altrimenti si compila solo in GitHub Actions.

## Decisioni (2026-11-12)

1. Per iniziare **un pulsante** su GP15: breve scrive/ferma/riprende, lunga ricomincia, 5 secondi abbinamento.
2. Ritardi predefiniti **30 ms** tra i tasti e **200 ms** dopo INVIO.
3. **Codice di abbinamento fisso**, scelto dall'utente. Modifica in realizzazione: non come secret su GitHub (finirebbe nel `.uf2` pubblico), ma impostato dal sito con il cavo e salvato nel Pico.
4. Si tiene il **caricamento con il cavo**, con WebUSB anziché Web Serial, così funziona anche da Android.

## Note di realizzazione (2026-11-12)

- **Strumenti:** pico-sdk 2.3.1 (TinyUSB, BTstack, cyw43-driver inclusi), toolchain ARM GNU 14.3 in locale e `gcc-arm-none-eabi` di Ubuntu in GitHub Actions. picotool e pioasm precompilati da `raspberrypi/pico-sdk-tools` in locale; in CI li compila l'SDK.
- **Firmware** in `chiavetta/`:
  - parte pura `dati.c`, `motore.c`, `protocollo.c`, provata sul PC;
  - parte hardware `main.c`, `usb.c`, `ble.c`, `memoria.c`, `chiavetta.gatt`.
  - File compilato di circa 390 KB su 4 MB.
- **USB:**
  - in macchina un solo dispositivo, tastiera HID "boot", PID 0x0005;
  - caricamento con una sola interfaccia WebUSB e i descrittori Microsoft OS 2.0 (WinUSB, nessun driver su Windows), PID 0x0006;
  - VID 0x1209 con PID di prova di pid.codes.
  - Il chip wireless si avvia **prima** dell'USB: il suo avvio dura centinaia di millisecondi e l'USB non risponderebbe al PC. Se il chip wireless non parte, la tastiera funziona lo stesso (senza LED e Bluetooth).
- **Bluetooth:**
  - LE Secure Connections con MITM, passkey fissa in "display only", chiave a 16 byte; caratteristiche `WRITE/READ_AUTHENTICATED_SC`;
  - fuori dalla finestra di abbinamento chi prova ad abbinarsi viene scollegato; dopo un abbinamento riuscito si cancellano gli altri;
  - "Just Works" e "confronto numerico" sono sempre rifiutati;
  - le scritture lunghe (Prepare Write) sono gestite, se il telefono non alza l'MTU.
- **Memoria:** ultimo testo valido e codice in 3 settori subito prima di quelli di BTstack, con intestazione e CRC; si rilegge e si controlla dopo ogni salvataggio. Testo massimo 12 000 byte (1000 valori da 9 cifre col segno).
- **Cambiamenti rispetto al progetto:**
  - codice Bluetooth impostato con il cavo, non come secret (vedi Decisioni, punto 3);
  - la pressione lunga riporta all'inizio **senza** scrivere da sola;
  - a scrittura finita la pressione breve non fa niente;
  - stop durante il secondo di attesa = annulla.
- **Test** (47 in tutto, `npm test`):
  - `chiavetta/test/test_dati.c`: 226 controlli sulla parte pura, compresa la traduzione dei tasti con layout tedesco e italiano, i rimbalzi del pulsante e la tastiera USB non sempre pronta;
  - `test/chiavetta.test.js`: il sito prepara testo e pacchetti, il **Pico simulato** (`chiavetta/test/simulatore.c`, stesso codice C del firmware) li riceve con il cavo (a pezzi qualsiasi) e via Bluetooth e "scrive" i tasti: 100 coppie con negativi, blocchi, dati rovinati, riga non valida, codice;
  - `test/pagina-chiavetta.test.js`: la scheda del sito con Web Bluetooth e WebUSB simulati collegati al Pico simulato, su PC e telefono, compresi errori e browser senza queste funzioni.
  - Senza compilatore C questi test si saltano; in locale si usa `CC_CHIAVETTA="python -m ziglang cc"`.
- **Da provare sul Pico vero** (non simulabile qui): riconoscimento come tastiera dal PC e dalla macchina, WebUSB da Vanadium con OTG, abbinamento Bluetooth da Android, tempi reali del LED e del pulsante, scrittura nella flash con il Bluetooth attivo.
