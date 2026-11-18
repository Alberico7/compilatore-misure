# Senza rete, liste salvate e valori sospetti

Data: 2026-11-18 (23:38)
Stato: **realizzato il 2026-11-19** (sito 1.6.0), confermato dall'utente il 2026-11-18.

Note di realizzazione:

- Le librerie della dettatura si salvano al primo uso del 🎤, non alla prima apertura: vedi sotto, "Cosa salva".
- **Importa:** una lista uguale si salta anche se un'importazione precedente l'aveva già rinominata, per esempio "Flangia (2)". Così reimportare lo stesso file non crea doppioni.
- **Test:** `test/liste-avvisi.test.js` per pagina, liste, confronto e senza rete; `test/logica.test.js` per gli avvisi.
- **Esportazione nei test:** il file si prende dal link, prima che il browser lo scarichi. Con un vero scaricamento, Playwright 1.49 lascia un errore interno alla chiusura della pagina, anche senza il sito.

Quattro miglioramenti del sito chiesti dall'utente il 2026-11-18 (il 4 "se utile", nella forma descritta sotto). Il firmware della chiavetta e il case non cambiano.

## 1. Il sito funziona anche senza rete

Oggi, senza internet, funziona solo il file `compilatore-misure.html` scaricato sul PC. Dal telefono il sito vuole la rete, e in officina il segnale può mancare.

**Come:** un *service worker* (`sito/sw.js`), cioè un piccolo programma che il browser tiene insieme al sito e che risponde al posto della rete.

- **Cosa salva**, alla prima apertura con la rete:
  - la pagina;
  - le icone e il manifest.
- **Le due librerie della dettatura** (`voce/vosk.js`, `voce/fflate.js`, 5,6 MB) le salva al primo uso del 🎤, non alla prima apertura: senza il modello non servono, e il primo uso richiede comunque la rete per scaricarlo. Così chi non usa la dettatura non scarica 5,6 MB in più (deciso in realizzazione).
- **Il modello della dettatura** (50 MB) resta dove è già oggi: nella memoria del browser, scaricato al primo uso del 🎤. Il service worker non lo tocca e non lo cancella. Dopo il primo uso, quindi, anche la dettatura funziona senza rete.
- **Il firmware** `chiavetta.uf2` non viene salvato: per aggiornarlo serve comunque un PC, di solito con la rete.
- **Come risponde:**
  - con la rete, scarica la pagina nuova. Così si vede sempre l'ultima versione;
  - se la rete non risponde entro **3 secondi**, o non c'è, usa la copia salvata.
- **Aggiornamenti:** `npm run build` scrive in `sw.js` un'impronta dei file pubblicati. A ogni pubblicazione il browser vede un `sw.js` diverso e aggiorna la copia salvata. Le copie vecchie si cancellano.
- **Dove funziona:** solo dal sito (https), non dal file aperto dal PC, che è già senza rete di suo.
- **Cosa vede l'utente:** accanto a "I valori si salvano da soli su questo dispositivo." compare **"La pagina funziona anche senza rete."** quando la copia è pronta.
- **Senza rete funzionano:**
  - tabella, codici a barre e QR;
  - chiavetta via Bluetooth e cavo;
  - prova del lettore;
  - liste salvate;
  - dettatura, se il modello è già stato scaricato.
- **Senza rete non funziona:** il primo scaricamento del modello della dettatura. Il messaggio di errore attuale ("non riesco a scaricare…") resta.

## 2. Liste salvate con un nome

Se gli stessi pezzi tornano, le misure non vanno riscritte ogni volta.

### Dove

Nella sezione **1 Valori**, accanto a "Svuota tutto", un pulsante **"Liste"** apre un riquadro con:

- **Salva** e **Salva come…**;
- l'elenco delle liste salvate, con:
  - le più recenti in alto;
  - per ognuna il **nome**, il **numero di coppie** e la **data**;
  - i pulsanti **Apri** ed **Elimina**;
- una casella **Cerca**, che compare quando le liste sono più di 8;
- **Esporta** e **Importa**, per passare le liste da un dispositivo all'altro.

Sopra la tabella si vede il nome della lista aperta, per esempio **"Lista: Flangia 1234"**. Se si cambia qualcosa senza salvare, compare **"· modifiche non salvate"**.

### Cosa si salva

Per ogni lista si salvano:

- le **coppie Angolo/Altezza**, senza le righe vuote in fondo;
- **come sono scritti i valori**: "con separatore" o "come in macchina";
- i **decimali** di angolo e altezza.

Le impostazioni della chiavetta (pause, coppie per pressione) non si salvano con la lista: dipendono dalla macchina, non dal pezzo.

### Come funziona

- **Salva come…** chiede il nome. Se esiste già una lista con lo stesso nome, chiede se sostituirla.
- **Salva** aggiorna la lista aperta senza chiedere il nome. Se non c'è una lista aperta, fa come "Salva come…".
- **Apri** mette la lista nella tabella. Se la tabella ha valori che non sono già salvati, prima chiede conferma: "Sostituire i valori attuali?".
- **Elimina** chiede conferma.
- **"Svuota tutto"** svuota la tabella e chiude la lista aperta, ma non la cancella dall'elenco.

### Esporta e Importa

- **Esporta** scarica un file con tutte le liste, `liste-misure-AAAA-MM-GG.json`.
- **Importa** legge un file esportato e aggiunge le liste. Non cancella niente:
  - se esiste già una lista uguale, con stesso nome e stesse coppie, la salta;
  - se ha lo stesso nome ma coppie diverse, la aggiunge con il nome seguito da " (2)".
- Alla fine dice quante liste ha aggiunto e quante ne ha saltate.

### Dove restano

Nella memoria del browser, su quel dispositivo, come i valori di oggi. Le liste si perdono se si cancellano i dati del sito: per questo c'è Esporta.
Funziona anche dal file aperto dal PC.

## 3. Avvisi sui valori sospetti

Oggi il sito controlla il formato dei valori. Gli unici avvisi sono per i valori negativi. Se ne aggiungono tre.

Come per i negativi, sono **avvisi e non errori**: i codici e la chiavetta funzionano lo stesso.

| Avviso | Quando | Messaggio, per esempio |
|---|---|---|
| **Angolo oltre 360** | l'angolo è più di 360 | "Angolo 3: 370.00 è oltre 360" |
| **Altezza molto diversa dalle vicine** | è almeno **5 volte** più grande, o 5 volte più piccola, di **tutte e due** le altezze vicine | "Altezza 7: 2000.00 è molto diversa dalle vicine (200.00 e 205.00): controlla la virgola" |
| **Coppia uguale alla precedente** | **angolo e altezza** sono tutti e due uguali alla coppia sopra | "Coppia 5 uguale alla 4" |

Dettagli sull'altezza:

- **Le vicine** sono l'altezza della riga sopra e quella della riga sotto. Per la prima e l'ultima riga sono le due righe più vicine.
- Serve almeno **3 altezze** compilate.
- Gli zeri non si confrontano, perché il rapporto non ha senso. Per i valori negativi conta la grandezza, senza il segno.
- Con le vicine diverse tra loro, per esempio 20 e 200, l'avviso non scatta. Così un salto vero di misura non dà un falso allarme: scatta solo per un valore isolato, che è il caso tipico della virgola sbagliata.

Coppia uguale: basta che sia uguale l'angolo, o solo l'altezza, e l'avviso non scatta (richiesta dell'utente).

**Dove si vedono:**

- **Nella casella:** la casella è colorata come avviso, e la riga "In macchina: …" sotto aggiunge "oltre 360!", "molto diversa dalle vicine!" o "uguale alla coppia sopra!". Per la coppia uguale si colorano tutte e due le caselle.
- **Sotto la tabella:** un riquadro **"Da controllare"** con l'elenco cliccabile, come oggi per i negativi. Il messaggio sui negativi resta com'è.

## 4. Lista da confrontare con la macchina

Dopo la scrittura bisogna confrontare i valori sullo schermo della macchina con quelli giusti. Sul telefono, oggi, la tabella ha caselle piccole e scrivibili: si rischia di cambiare un valore toccandolo.

**Perché non segue la chiavetta in diretta:** la chiavetta non è istantanea, ma quasi. Con le pause predefinite, 30 ms tra le cifre e 200 ms dopo INVIO, scrive un valore ogni 0,35 secondi circa: 20 coppie in 15 secondi, 100 in poco più di un minuto. Seguirla in diretta vorrebbe dire interrogarla via Bluetooth di continuo mentre scrive, per poco vantaggio: il confronto si fa comunque dopo, a macchina ferma. Dove si è fermata la chiavetta lo dice già "Controlla la chiavetta".

**Come:** sotto il riepilogo della sezione 1, quando i valori sono corretti, un pulsante **"Confronta con la macchina"** apre una vista a tutto schermo, come "uno alla volta":

- una riga per coppia: **N°, Angolo, Altezza**, a caratteri grandi, scritti **come in macchina** ("20.00");
- **toccando una riga** la si spunta come controllata (✓ e sfondo verde); toccandola di nuovo si toglie la spunta;
- in alto **"12 di 40 controllate"**, **Azzera spunte** e **Chiudi**;
- le righe con un avviso (negativo, oltre 360, altezza sospetta, coppia uguale) sono segnate anche qui;
- lo **schermo resta acceso** finché la vista è aperta, come in "uno alla volta".

**Le spunte** restano finché i valori non cambiano, anche chiudendo e riaprendo la vista. Se si cambia un valore, si azzerano.

## Cosa cambia nel codice

- **`src/logica.js`:** in `analizza`, i tre nuovi avvisi. Ogni avviso dice di che tipo è, così la pagina sceglie testo e colore.
- **`src/app.js`:**
  - visualizzazione degli avvisi;
  - liste salvate, con un riquadro per scrivere il nome (oggi c'è solo quello di conferma);
  - vista "Confronta con la macchina", che riusa lo schermo sempre acceso di "uno alla volta";
  - registrazione del service worker, solo se la pagina non è aperta da file.
- **`src/template.html`:**
  - riquadro "Liste";
  - nome della lista aperta;
  - riga "funziona anche senza rete";
  - vista "Confronta con la macchina";
  - guida aggiornata, con due voci nuove: "Liste salvate" e "Senza rete".
- **`src/build.js`:** crea `sito/sw.js` con l'elenco dei file e la loro impronta.
- **`src/sw.js`** (nuovo): il service worker.
- **README:** le quattro funzioni nell'elenco "Cosa fa".
- Versione del sito **1.6.0**.

## Test

- **Logica**, per ogni avviso, compresi i casi limite:
  - 360 non dà avviso, 360.01 sì;
  - altezze 200, 2000, 205: avviso; 20, 200, 2000: niente avviso;
  - prima e ultima riga;
  - zeri;
  - solo l'angolo uguale, o solo l'altezza uguale: niente avviso.
- **Pagina, avvisi:** casella colorata, riquadro "Da controllare", il link porta alla casella; i codici si generano lo stesso.
- **Pagina, liste:**
  - salva, apri, elimina;
  - Salva come… con un nome già usato;
  - conferma prima di sostituire valori non salvati;
  - "modifiche non salvate";
  - esporta e reimporta (le liste uguali si saltano, quelle con lo stesso nome prendono " (2)");
  - il file aperto dal PC salva le liste.
- **Confronto:**
  - il pulsante compare solo con i valori corretti;
  - i valori sono scritti come in macchina;
  - spunta e contatore;
  - le spunte restano chiudendo e riaprendo, e si azzerano cambiando un valore;
  - la vista sta in una schermata da telefono senza scorrimento orizzontale.
- **Senza rete:**
  - si apre il sito e si aspetta che la copia sia pronta;
  - si toglie la rete (in Playwright) e si ricarica: la pagina si apre, la tabella e i codici funzionano;
  - con un `sw.js` nuovo, la copia si aggiorna.
- **Test esistenti:** passano tutti.
