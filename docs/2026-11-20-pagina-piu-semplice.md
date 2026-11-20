# Pagina più semplice

Data: 2026-11-20 (23:38)
Stato: **realizzato il 2026-11-20** (sito 1.8.0), confermato dall'utente il 2026-11-20.

Note di realizzazione:

- **Colonne uguali:** Angolo e Altezza ora hanno la stessa larghezza. Prima la colonna Altezza si allargava per il testo degli avvisi, e sul telefono "In macchina: 135.00" andava a capo nella colonna Angolo.
- **Frecce:** sono ▶ e ▼, un po' più grandi di ▸ e ▾, che sul telefono quasi non si vedevano.

Il 2026-11-20 l'utente ha chiesto un controllo dell'interfaccia: deve essere "il più semplice e intuitiva possibile". Il controllo è stato fatto sulle foto di tutte le schermate, sul telefono (390 px) e sul PC, alla prima apertura e con 8 coppie già scritte. Ne sono usciti 8 punti, e l'utente ha chiesto di farli tutti.

Le funzioni non cambiano: cambia solo come si presentano. Il firmware della chiavetta e il case non cambiano.

## 1. Le voci apribili hanno una freccia

**Oggi:** le voci della Guida ("Come si usa", "Chiavetta", "Da smartphone", "Liste salvate", "Senza rete", "Dettatura", "Configurazione del lettore", "Note") e "Codice Bluetooth e firmware" sembrano titoli normali. Non si capisce che si aprono.

**Dopo:**
- davanti a ogni voce c'è **▸**, che diventa **▾** quando la voce è aperta;
- vale per tutte le voci apribili, tranne i riquadri con "Cambia", che hanno già la loro freccia.

## 2. Sotto le caselle solo "In macchina"

**Oggi:** sotto ogni casella c'è, per esempio, "In macchina: **152.50** · cifre: 15250". Sul telefono occupa 2 o 3 righe, e in una schermata entrano 4 o 5 coppie.

**Dopo:**
- sotto ogni casella resta solo **"In macchina: 152.50"**;
- restano anche gli avvisi ("molto diversa dalle vicine!" e gli altri) e gli errori;
- le cifre si vedono ancora in "Leggi uno alla volta", dove servono per controllare il codice.

## 3. Riquadro "Cambia" più corto

**Oggi:** alla prima apertura il riquadro "Cambia" è aperto e sul telefono riempie tutto il primo schermo. La tabella si vede solo scorrendo.

**Dopo:**
- si tolgono **"+ Aggiungi riga"** e **"− Elimina ultima riga"**. Le righe si cambiano già in altri modi:
  - con il campo **"Righe"**;
  - con INVIO (o Avanti) sull'ultima casella, che aggiunge una riga;
  - incollando da Excel, che aggiunge le righe che servono;
- la Guida ("Come si usa") dice come aggiungere e togliere righe.

## 4. Sul telefono niente "Prova del lettore"

**Oggi:** la sezione 3 dice "Collega il lettore a **questo PC**". Sul telefono non si può fare, ma la sezione occupa spazio e un pulsante nell'indice.

**Dopo:**
- sui dispositivi touch senza mouse (telefono e tablet) la sezione 3 è nascosta;
- l'indice diventa **1 Valori · 2 Macchina · 3 Guida**, e anche la Guida prende il numero 3;
- sul PC non cambia niente;
- una finestra stretta sul PC non conta come telefono: si guarda se il dispositivo ha il mouse, non la larghezza.

## 5. Testo sopra la tabella più corto

**Oggi:** sopra la tabella, sul telefono, ci sono 4 righe fisse: "Tocca una casella: in basso compaiono **Indietro**, **±** (segno) e **Avanti** (come INVIO in macchina). I valori si salvano da soli su questo dispositivo. La pagina funziona anche senza rete."

**Dopo:**
- **sul telefono** la spiegazione della barra si toglie: la barra compare da sola quando si tocca una casella, e i suoi pulsanti hanno già i nomi;
- **sul PC** la spiegazione di INVIO, frecce ed Excel resta, perché lì i tasti non si vedono;
- **i due stati** si accorciano:
  - "I valori si salvano da soli su questo dispositivo." diventa **"Salvataggio automatico."**;
  - "La pagina funziona anche senza rete." diventa **"Funziona anche senza rete."**;
  - l'avviso quando il salvataggio non funziona resta com'è.

## 6. Sezione 2: niente riga che ripete le schede

**Oggi:** sopra le schede Chiavetta / Codici a barre / QR c'è la riga "Chiavetta (consigliata) · Lettore 1D → Codici a barre · Lettore 2D → QR", che ripete i nomi delle schede.

**Dopo:**
- la riga si toglie;
- la prima frase di ogni scheda dice per cosa serve:
  - **Chiavetta**, come oggi, più "consigliata": "La **chiavetta** (consigliata) scrive i valori in macchina come una tastiera, quando premi il suo pulsante.";
  - **Codici a barre**, nuova: "Per il **lettore 1D**: un codice per ogni valore.";
  - **QR**, nuova: "Per il **lettore 2D**: più coppie in ogni codice.".

## 7. Avviso di sicurezza più corto

**Oggi** (4 righe sul telefono): "**Sicurezza:** lo strumento compila solo i campi, non avvia cicli. Prima di avviare la tastatura controlla sempre i valori sullo schermo della macchina: un valore sbagliato può mandare il tastatore contro l'utensile."

**Dopo:**
- in alto: "**Sicurezza:** prima di avviare la tastatura controlla sempre i valori sullo schermo della macchina.";
- il resto ("lo strumento compila solo i campi, non avvia cicli"; "un valore sbagliato può mandare il tastatore contro l'utensile") va nella Guida, al punto 7 di "Come si usa";
- l'avviso resta in alto, sempre visibile, con lo stesso colore.

## 8. Prova del lettore: niente tendina vuota

**Oggi:** sul PC, senza valori corretti, la tendina "Confronta con" è vuota.

**Dopo:**
- la tendina e "Svuota prova" si vedono solo quando i valori sono corretti;
- prima resta solo il messaggio "Prima completa e correggi i valori nella sezione 1.".

## Cosa cambia nel codice

- **`src/template.html`:**
  - frecce delle voci apribili (CSS);
  - tolti i due pulsanti delle righe;
  - testo sopra la tabella;
  - sezione 2 senza la riga dei metodi, e la frase in ogni scheda;
  - avviso di sicurezza;
  - Guida aggiornata (righe, sicurezza);
  - sezione 3 nascosta e numeri dell'indice per i dispositivi touch.
- **`src/app.js`:**
  - anteprima delle caselle senza le cifre;
  - i due stati più corti;
  - tendina della prova nascosta senza valori;
  - tolti i collegamenti ai due pulsanti.
- **Test** aggiornati:
  - `pagina.test.js` e `voce.test.js`: l'anteprima senza le cifre;
  - `semplicita.test.js`: la riga dei metodi tolta, e l'indice "3 Guida" sul telefono;
  - `liste-avvisi.test.js`: il testo "Funziona anche senza rete.".
- **`docs/2026-11-20-lettura-a-voce.md`:** la versione prevista diventa la successiva a questa.
- Versione del sito **1.8.0**.

## Test

- Sul telefono:
  - le voci della Guida hanno la freccia;
  - le caselle hanno una riga sola sotto;
  - la sezione 3 non c'è, e l'indice è "1 Valori · 2 Macchina · 3 Guida";
  - alla prima apertura la tabella sale di circa 110 px. Non arriva ancora nel primo schermo: il riquadro "Cambia" aperto resta più alto dello schermo, con la scelta del modo, i decimali, le righe e la dettatura.
- Sul PC:
  - la sezione 3 c'è, con l'indice a 4 voci;
  - senza valori la tendina "Confronta con" non si vede, e compare con i valori corretti.
- Una finestra stretta sul PC continua a mostrare la sezione 3.
- Le schede della sezione 2 hanno la loro prima frase.
- L'avviso di sicurezza ha il testo corto, e la Guida ha il resto.
- Foto delle schermate nuove sul telefono e sul PC, tema scuro e chiaro, da guardare prima di pubblicare.
- Test esistenti: passano tutti, aggiornati dove cambia il testo.
