# Lettura a voce dei valori

Data: 2026-11-20 (23:29)
Stato: **preparato, da non realizzare**. L'utente ha chiesto di prepararlo ma di non farlo: si realizza solo quando lo chiede.

Scelte già fatte dall'utente il 2026-11-20:

- si va avanti **toccando lo schermo oppure a voce** ("avanti");
- servono **tutti e due i modi**, scrittura e controllo.

## Perché

Mentre si lavora in macchina gli occhi devono stare sullo schermo della macchina, non sul telefono. La app legge a voce i valori:

- **Scrittura:** la app detta un valore, l'utente lo scrive in macchina e passa al successivo.
- **Controllo:** la app legge i valori, l'utente li confronta con lo schermo della macchina e la riga si spunta.

## Dove

Sotto il riepilogo della sezione 1, quando i valori sono corretti, accanto a "Confronta con la macchina" compare **"🔊 Leggi a voce"**. Il pulsante apre una vista a tutto schermo, come "uno alla volta". In alto si sceglie il modo: **Scrittura** o **Controllo**.

## Cosa dice

- **Scrittura**, un valore alla volta:
  - "Angolo 3: quaranta virgola zero zero";
  - poi "Altezza 3: centocinquantadue virgola zero zero".
- **Controllo**, una coppia alla volta: "Coppia 3: angolo quaranta virgola zero zero, altezza centocinquantadue virgola zero zero".
- **Come si legge il numero.** Il testo si compone nella pagina, senza lasciare che sia il motore vocale a interpretare "40,00", perché alcuni motori leggerebbero solo "quaranta":
  - la parte intera come numero;
  - poi "virgola";
  - poi i decimali **cifra per cifra** ("zero zero", "zero cinque");
  - i valori negativi iniziano con "meno".
- **Impostazione "Leggi":**
  - **"come numero"**, predefinita: "quaranta virgola zero zero";
  - **"cifra per cifra"**: "quattro, zero, zero, zero", cioè i tasti da premere in macchina scrivendo "come in macchina".
- **Valori con un avviso** (negativo, oltre 360, altezza sospetta, coppia uguale): dopo il valore dice "attenzione, da controllare".
- **Alla fine** dice "Fine: 40 valori" in Scrittura, oppure "Fine: 20 coppie controllate" in Controllo.

## Sullo schermo

- Il valore che sta leggendo, a caratteri grandi, scritto come in macchina ("40.00"), con l'etichetta ("Angolo 3").
- In alto "12 di 40" e la barra di avanzamento, come in "uno alla volta".
- **Avanti:** un pulsante enorme, tutta la metà bassa dello schermo.
- **Ripeti** e **Indietro**, più piccoli.
- **🎤 Comandi a voce**, acceso o spento.
- **Chiudi.**
- In Controllo, le righe già spuntate si vedono come in "Confronta con la macchina".

## Come si va avanti

- **Toccando** Avanti, Ripeti o Indietro.
- **A voce**, se "Comandi a voce" è acceso. Le parole:

  | Comando | Parole |
  |---|---|
  | Avanti | "avanti", "poi", "prossimo", "ok", "fatto" |
  | Ripeti | "ripeti", "ancora", "come" |
  | Indietro | "indietro" |
  | Fine | "stop", "basta", "fine": chiude la vista |

- **Il riconoscimento** è lo stesso della dettatura di oggi (Vosk, nel dispositivo).
  - Se il modello non è ancora stato scaricato, chiede di scaricarlo come fa oggi il 🎤.
  - Con la dettatura già pronta all'apertura (sito 1.7.0), i comandi a voce partono subito.
- **La app non deve sentire sé stessa:** mentre parla, e per mezzo secondo dopo, quello che sente il microfono si scarta.
- **Le altre parole** non fanno niente. Così i rumori dell'officina o una frase detta a un collega non mandano avanti per sbaglio.
- **In Controllo, "Avanti" spunta la coppia** e passa alla successiva. Le spunte sono le stesse di "Confronta con la macchina", quindi le due viste vanno d'accordo.
- **Dove riparte:**
  - Scrittura riparte dal valore dove ci si era fermati, che si ricorda come "uno alla volta";
  - Controllo riparte dalla prima coppia non spuntata.

## La voce

- È la **sintesi vocale del browser** (`speechSynthesis`), che usa la voce italiana del dispositivo.
  - Non si scarica niente dal sito.
  - Funziona anche aprendo il file dal PC: lì però mancano i comandi a voce, come la dettatura.
- **Si preferisce una voce che sta nel dispositivo**, così funziona anche senza rete.
- **Impostazione "Velocità":** normale o lenta.
- **Se non c'è una voce italiana**, la vista lo dice e spiega come aggiungerla:
  - **Android:** Impostazioni › Sintesi vocale › motore e lingua italiana;
  - **GrapheneOS:** di serie non c'è un motore di sintesi vocale. Si installa RHVoice da F-Droid, si sceglie la voce italiana e lo si imposta come motore predefinito. Va provato prima su un telefono vero;
  - **PC Windows:** Impostazioni › Ora e lingua › Voce › aggiungi una voce italiana.
- **Pulsante "Prova la voce"** nella guida: dice "Angolo 1: venti virgola zero zero".

## Comportamento

- **Lo schermo resta acceso** finché la vista è aperta, come in "uno alla volta".
- **Se la pagina va in secondo piano,** voce e microfono si fermano. Al ritorno, Ripeti rilegge il valore.
- **Se si cambia un valore** nella tabella mentre la vista è chiusa, in Controllo le spunte si azzerano come oggi.

## Cosa cambia nel codice

- **`src/leggi.js`** (nuovo):
  - composizione del testo da dire, con le due letture e il segno;
  - scelta della voce;
  - coda delle frasi, con l'avviso "sto parlando" per scartare il microfono.
- **`src/dettato.js`:** comando nuovo "ripeti", con le sue parole, e "ok" e "fatto" per "avanti". Si riconoscono solo nella vista "Leggi a voce", per non cambiare la dettatura nella tabella.
- **`src/app.js`:**
  - la vista, con i due modi;
  - collegamento ai comandi a voce, usando lo stesso motore della dettatura in ascolto continuo;
  - spunte condivise con "Confronta con la macchina".
- **`src/template.html`:**
  - pulsante e vista;
  - impostazioni "Leggi" e "Velocità";
  - guida: voce nuova "Lettura a voce", con le istruzioni per la voce italiana e il pulsante "Prova la voce".
- **README:** la funzione nell'elenco "Cosa fa".
- Versione del sito: la successiva alla 1.8.0 (la 1.8.0 è "Pagina più semplice").

## Test

- **Logica**, in `test/leggi.test.js`, per il testo da dire:
  - "40.00" → "quaranta virgola zero zero";
  - "0.05" → "zero virgola zero cinque";
  - "-1.50" → "meno uno virgola cinque zero";
  - decimali 0 e 3;
  - la lettura cifra per cifra;
  - coppia in Controllo;
  - "attenzione, da controllare".
- **Pagina**, con una sintesi vocale finta che registra le frasi al posto di parlare:
  - Scrittura: Avanti, Ripeti, Indietro, e "Fine" alla fine;
  - Controllo: Avanti spunta la coppia, e la spunta si vede in "Confronta con la macchina";
  - si riparte dal punto giusto in tutti e due i modi;
  - senza una voce italiana compare il messaggio con le istruzioni.
- **Comandi a voce**, con il motore Vosk simulato già usato nei test della dettatura:
  - "avanti", "ripeti", "indietro" e "stop";
  - una parola detta mentre la app parla non conta;
  - le parole che non sono comandi non fanno niente.
- **Telefono:** la vista sta in una schermata senza scorrimento orizzontale, con il pulsante Avanti grande.
- **Test esistenti:** passano tutti.

## Da decidere quando si realizza

- **Lettura predefinita:** "come numero" o "cifra per cifra"? Per scrivere "come in macchina" forse è più comoda quella cifra per cifra.
- **In Controllo:** una coppia per volta, come proposto, o un valore per volta?
- **Prova della voce su GrapheneOS:** prima di realizzarlo, verificare con RHVoice che la voce italiana funzioni dal browser (Vanadium).
