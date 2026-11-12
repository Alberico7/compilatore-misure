# Dettatura dei valori con Vosk (su GitHub Pages)

Data: 2026-11-12
Stato: **confermato (2026-11-12)**

## Scopo

Compilare la tabella Angolo/Altezza a voce: si dice "duecentoquattordici virgola nove quattro" e lo strumento scrive `214,94` nella casella attiva, poi passa alla successiva come con INVIO.

Si fa **come nel progetto "stampa etichette webusb"** (`docs/2026-11-10-dettatura.md` di quel progetto), dove la dettatura con Vosk funziona sul Pixel 7a: stesso motore, stesso modello, stesso modo di scaricarlo e conservarlo.

## Perché GitHub Pages (scelta dell'utente, 2026-11-12)

Prove fatte il 2026-11-12:

| Dove | Microfono | Scaricare il modello | Vosk |
|---|---|---|---|
| Pagina pubblicata su Claude | bloccato dalla piattaforma | bloccato dalla piattaforma | **no** |
| File aperto dal PC (`file://`) | sì | sì (49,7 MB da Hugging Face, impronta giusta) | **no**: il worker di `vosk-browser` non riesce a leggere il modello da una pagina senza indirizzo vero. Una prima correzione alla libreria non basta (`Failed to fetch` nel worker). |
| Sito https (GitHub Pages) | sì | sì | **sì**, come nel progetto etichette |

Quindi lo strumento si pubblica su **GitHub Pages**, come le etichette:

- nuovo repository GitHub (nome proposto: `compilatore-misure`) con i sorgenti di questa cartella;
- pubblicazione automatica con GitHub Actions (`pages.yml`, come nelle etichette): a ogni push si eseguono i test, si compila e si pubblica;
- indirizzo tipo `https://alberico7.github.io/compilatore-misure/`;
- **il sito è pubblico** (chiunque abbia l'indirizzo può aprirlo; i valori però restano solo nel browser di chi li scrive, non vanno su GitHub);
- il file `compilatore-misure.html` da aprire offline sul PC resta, **senza** dettatura;
- la pagina pubblicata su Claude può restare com'è (senza dettatura) o essere tolta: a scelta.

## Come funziona

### Versioni (verificate il 2026-11-12)

| Pezzo | Ultima versione | Note |
|---|---|---|
| Modello italiano piccolo | **vosk-model-small-it-0.22** (48 MB) | È il più recente per l'italiano. Il 0.42 esiste solo per altre lingue (es. russo, spagnolo). L'unico altro modello italiano è `vosk-model-it-0.22` da 1,2 GB, per server: troppo grande per un browser. |
| `vosk-browser` (ufficiale) | **0.0.8** (dicembre 2022) | Ultima pubblicata, la stessa delle etichette. Contiene Vosk del 2022. |
| `@lichess-org/vosk-browser` (fork) | **0.0.3** (giugno 2025) | Copia della 0.0.8 ricompilata con strumenti recenti da Lichess (la usano per i comandi vocali degli scacchi). Più leggera (3,2 MB invece di 5,8 MB) e compatibile con regole di sicurezza più strette. Il motore Vosk dentro però non risulta aggiornato, e non è usata nelle etichette. |
| `vosk-api` (motore, per server/app) | 0.3.50 (aprile 2024) | Nessuna versione per browser pubblicata da Alphacephei. |

**Scelta dell'utente (2026-11-12):** `vosk-browser` **0.0.8** ufficiale, direttamente (niente prova del fork). Modello `small-it-0.22`.

### Motore e modello (come nelle etichette)

- Libreria `vosk-browser` 0.0.8 (5,8 MB) e `fflate` 0.8.3, versioni fisse. **Si caricano solo alla prima pressione del microfono**: l'apertura della pagina non diventa più lenta.
- Modello `vosk-model-small-it-0.22` dalla copia su Hugging Face con revisione fissa (il sito ufficiale non permette lo scaricamento da un'altra pagina). La pagina controlla l'impronta SHA-256 dello zip ufficiale e si ferma se è diversa.
- Lo zip si converte in `.tar.gz` nel browser e si conserva nella memoria del browser (Cache Storage): dalla seconda volta non si riscarica.
- La prima volta: "Scaricare il riconoscimento vocale? Circa 50 MB, una volta sola", con l'avanzamento. Senza conferma non si scarica niente.
- Audio mono a 16 kHz raccolto con un AudioWorklet, come nelle etichette. L'audio non esce mai dal dispositivo.
- Su Vanadium (GrapheneOS) serve "JavaScript JIT" attivo per il sito, altrimenti il riconoscimento è lento: la pagina lo nota e lo dice, come nelle etichette.

### Due modi di dettare

Pulsante **🎤** nella barra in basso (telefono) e sopra la tabella (PC). Accanto, la scelta del modo (si ricorda):

**A) Un valore alla volta: tieni premuto**

- Si tiene premuto, si dice un valore, si lascia. Lasciando, il valore va nella casella attiva e **si passa alla successiva** (angolo → altezza → riga dopo), come con "Avanti".
- Sul PC anche tenendo premuta la barra spaziatrice quando il cursore è nella tabella.

**B) Più valori di seguito: un tocco per iniziare, uno per finire** (richiesta dell'utente)

- Un tocco su 🎤 avvia l'ascolto continuo (il pulsante diventa rosso "● Ascolto… tocca per fermare").
- Si dettano i valori uno dopo l'altro: "duecentoquattordici virgola nove quattro … ventisei virgola nove quattro … trecentotredici virgola uno sei …". Ogni valore va nella casella attiva e si passa alla successiva.
- **Come si separano i valori** (impostazione, da scegliere dopo la prova):
  - **pausa**: una breve pausa (circa mezzo secondo) chiude il valore. È il più veloce, ma una pausa a metà numero ("duecento … quattordici") lo spezza in due valori sbagliati;
  - **parola "avanti"**: il valore si chiude solo dicendo "avanti" (o "poi"). Più lento da dire, ma una pausa a metà numero non fa danni. Anche "venti virgola cinque avanti trenta avanti" detto tutto d'un fiato dà due valori.
  - Proposta: predefinito **"avanti"** (più sicuro); la prova con la voce sintetica e la tua prova sul telefono diranno se la pausa è affidabile.
- Comandi anche durante l'ascolto continuo: "indietro", "cancella" (svuota la casella attiva), "correggi" (torna al valore appena dettato e lo svuota), "riga dodici", "stop".
- L'ascolto si ferma da solo: con "stop", toccando di nuovo 🎤, dopo 30 s senza parlare, se la pagina va in secondo piano o lo schermo si spegne, o all'ultima riga della tabella.
- Mentre si detta, sotto il pulsante si vede l'elenco degli ultimi valori scritti ("Angolo 3: 214,94 · Altezza 3: 26,94 · …"), così si controlla senza guardare la tabella.

**In entrambi i modi** il riquadro in alto mostra in grande quello che è stato capito: "Capito: duecentoquattordici virgola nove quattro → 214,94 (Angolo 3)". Se la frase non è un numero né un comando, non si scrive niente e compare "Non ho capito: …" (e la casella resta quella).

### Dalle parole al numero

Stesse regole sui numeri del progetto etichette (riuso di `parseItalianNumber`: da zero a 9999, anche in più parole, "ventuno", "centotto", "milleduecento"), adattate alle misure:

| Detto | Valore scritto |
|---|---|
| "duecentoquattordici virgola nove quattro" | 214,94 |
| "duecentoquattordici virgola novantaquattro" | 214,94 |
| "venti virgola cinque" | 20,5 |
| "zero virgola zero cinque" | 0,05 |
| "venti punto cinque" | 20.5 |
| "meno uno virgola cinque" | -1,5 (con l'avviso dei negativi) |
| "venti" | 20 |

Comandi (detti da soli, tenendo premuto):

| Detto | Effetto |
|---|---|
| "indietro" | torna alla casella precedente |
| "cancella" | svuota la casella attiva |
| "riga dodici" | va ad Angolo 12 |

- Se la frase non è un numero né un comando, **non si scrive niente** e compare "Non ho capito: …".
- Il valore dettato passa dalle stesse regole di uno scritto a mano: anteprima "In macchina: …", errori in rosso (es. troppi decimali), avviso dei negativi.
- Nel modo "come in macchina" il valore dettato si scrive come cifre senza separatore se si dice "duemila"; se si dice "virgola" la casella segnala l'errore come per la scrittura a mano.

### Vocabolario ristretto (da provare)

Vosk permette di limitare le parole riconosciute a un elenco (numeri, "virgola", "punto", "meno", comandi). Di solito sbaglia molto meno e non scrive parole a caso. Lo provo sul PC con la voce sintetica di Windows (Elsa), confrontandolo con il riconoscimento libero usato nelle etichette, e tengo quello che riconosce meglio le frasi di prova.

## Sicurezza

- La dettatura compila solo la tabella: non tocca mai la macchina.
- Ogni valore dettato è visibile subito con l'anteprima "In macchina"; i codici si generano solo con tutti i dati corretti.
- Resta l'avviso: controllare i valori sullo schermo della macchina prima della tastatura.

## Test

- **Unitari:** dalle parole al numero (tutte le frasi delle tabelle, ogni numero da 0 a 9999 come lo scrive Vosk, decimali con zeri iniziali, frasi non valide → niente).
- **E2E con riconoscitore simulato** (solo nei test, come nelle etichette): tieni premuto → testo provvisorio; lasci → valore nella casella giusta e passaggio alla successiva; ascolto continuo con 20 valori di seguito, separati da pausa e da "avanti", con "correggi" a metà; arresto automatico (stop, 30 s di silenzio, pagina in secondo piano, ultima riga); conferma dello scaricamento la prima volta; le librerie non si caricano finché non si preme il microfono.
- **Separatore:** frasi con una pausa a metà numero, per misurare quanto spesso il modo "pausa" spezza i valori.
- **Sul PC, con il vero Vosk:** la voce sintetica di Windows al posto del microfono, sul sito servito in https in locale; si controlla che i valori finiscano in tabella.
- **Sui telefoni (tu):** le stesse frasi, sul sito pubblicato.

## Decisioni (conferma dell'utente, 2026-11-12)

1. Repository pubblico `compilatore-misure` su `Alberico7`, con GitHub Pages, **licenza che non permette la vendita** (PolyForm Noncommercial 1.0.0, già nel progetto).
2. La pagina su Claude e la sua versione di pubblicazione si **cancellano**: il sito su GitHub la sostituisce.
3. Ascolto continuo: per iniziare il separatore predefinito è la **pausa**.
4. `vosk-browser` 0.0.8 ufficiale, modello `small-it-0.22`.

## Domande (risolte, vedi Decisioni)

1. **Repository:** creo il repository `compilatore-misure` sul tuo account GitHub (lo stesso delle etichette, `Alberico7`), **pubblico** come richiesto da GitHub Pages gratuito? Oppure preferisci un altro nome?
2. **Pagina su Claude:** la lascio (senza dettatura) o la tolgo, visto che il sito su GitHub la sostituisce?
3. **Ascolto continuo:** separatore predefinito "avanti" (più sicuro) o pausa (più veloce)? Si potrà cambiare nella pagina in ogni caso.

## Note di realizzazione (2026-11-12)

- **File:**
  - `src/dettato.js`: dalle parole ai valori e ai comandi (numeri con le stesse regole delle etichette, `numeroItaliano`), testato in Node;
  - `src/voce.js`: motore Vosk (modello da Hugging Face con impronta, zip → tar.gz, Cache Storage, AudioWorklet con ripiego su ScriptProcessor, ricampionamento a 16 kHz);
  - `src/app.js`: pulsante 🎤, i due modi, separatore, comandi, arresto automatico, tastiera chiusa mentre si detta;
  - `src/build.js`: crea `compilatore-misure.html` (file locale, senza dettatura) e `sito/` per GitHub Pages (`index.html` + `voce/vosk.js` + `voce/fflate.js`).
- **Librerie a richiesta:** `voce/vosk.js` (5,7 MB) e `voce/fflate.js` si scaricano solo alla prima pressione di 🎤 dopo la conferma. Lo verifica un test.
- **Tieni premuto:** il primo tocco, se il modello non c'è, chiede solo di scaricarlo (non apre il microfono); dopo, tenendo premuto si detta. Sul PC anche con la barra spaziatrice nella tabella.
- **Ascolto continuo:** separatore predefinito "pausa" (scelta dell'utente). Con "avanti", le parole restano in attesa ("In attesa di «avanti»: 200") finché non si dice "avanti"; i comandi valgono subito; fermando, il valore in attesa si scrive. Si ferma all'ultima casella della tabella, con "stop", dopo 30 s senza parlare, se la pagina va in secondo piano.
- **Telefono:** 🎤 anche nella barra in basso; mentre si detta le caselle hanno `inputmode="none"` (la tastiera non si apre), toccando una casella si torna a scrivere a mano.
- **Lentezza:** se il riconoscimento dopo il rilascio dura più della frase (e più di 1,5 s), una volta compare l'avviso per "JavaScript JIT" su Vanadium.
- **Vocabolario ristretto:** non usato. Con il riconoscimento libero (come nelle etichette) la prova con la voce sintetica è risultata esatta al 100%, quindi non serviva.
- **Prova con il vero Vosk sul PC** (`npm run test:vosk`, voce "Microsoft Elsa" al posto del microfono, sito servito da localhost, ascolto continuo con pausa di 1,3 s fra i valori):
  - dettato `214,94 | 26,94 | 313,16 | 82,38 | -1,5 | 59,30` → in tabella identico, alla prima prova;
  - prima volta: modello scaricato, controllato e convertito, microfono aperto in 17–20 s;
  - volte successive: modello dalla memoria del browser, pronto in 1,9 s.
- **Test automatici:** 5 unitari sulla dettatura (tra cui ogni numero da 0 a 9999 scritto come da Vosk), 8 sul sito con il riconoscitore simulato (librerie a richiesta, conferma, tieni premuto, barra spaziatrice, 20 coppie di seguito con "correggi" e arresto all'ultima riga, separatore "avanti" con pausa a metà numero, arresto per silenzio e secondo piano, telefono), 1 con il vero Vosk. Totale 39 + 1.
- **Licenza:** PolyForm Noncommercial 1.0.0 (vedi `docs/2026-11-12-compilatore-misure.md`).
