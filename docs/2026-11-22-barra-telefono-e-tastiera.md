# Telefono: la barra in basso resta visibile e Avanti / Indietro non aprono la tastiera

Data: 2026-11-22 (18:45)
Stato: **realizzato il 2026-11-22** (sito 1.15.0), confermato dall'utente il 2026-11-22, con la richiesta dei due tocchi per aprire la tastiera.

Note di realizzazione:

- **"Telefono" vuol dire schermo che si usa con il dito** (`pointer: coarse`): telefono e tablet. Con il mouse non cambia niente, anche su un PC con lo schermo stretto.
- **Il secondo tocco ridà il fuoco alla casella**, così il telefono apre la tastiera anche se aveva già il cursore lì.
- **Tastiera aperta o chiusa:** il sito la considera aperta quando la parte visibile dello schermo è più bassa di almeno 120 px rispetto alla più alta vista con la stessa larghezza.
- **Test:** in `test/pagina.test.js` una tastiera finta accorcia di 300 px la parte visibile dello schermo, come fa la tastiera vera su Chrome per Android. Anche il test della dettatura sul telefono (`test/voce.test.js`) ora tocca due volte per scrivere a mano.

L'utente segnala che sul telefono, spostandosi nella tabella con **Avanti** e **Indietro** della barra in basso, si apre da solo il tastierino numerico. Il tastierino copre la barra, e con la barra sparisce anche il 🎤 per dettare.

## Perché succede

- **Avanti e Indietro spostano il cursore sulla casella dopo o su quella prima.** Il telefono, quando il cursore arriva in una casella, apre la tastiera. Fa così anche se l'utente l'aveva appena chiusa con il tasto Indietro di Android. La tastiera resta chiusa solo durante la dettatura, cioè dopo aver usato 🎤 e finché non si tocca una casella.
- **La barra è attaccata al fondo dello schermo, non al bordo della tastiera.** Su Chrome e sui browser simili per Android (anche Vanadium), la tastiera si apre *sopra* la pagina senza farle spazio, e copre tutto quello che sta in fondo, barra compresa.

## Cosa cambia

### 1. La barra resta sempre visibile

Quando la tastiera è aperta, la barra (Indietro, ±, Avanti, 🎤) sale e si appoggia sopra la tastiera. Quando la tastiera si chiude, torna in fondo allo schermo.

Così 🎤, Avanti e Indietro si possono toccare sempre, anche mentre si scrive a mano.

### 2. Avanti e Indietro non cambiano la tastiera

- **Tastiera chiusa:** Avanti e Indietro spostano il cursore senza aprirla. È il caso di chi detta, o di chi guarda la tabella.
- **Tastiera aperta:** resta aperta, come oggi. È il caso di chi scrive a mano: scrive, tocca Avanti, scrive il valore dopo.

### 3. La tastiera si apre con due tocchi sulla casella

Richiesta dell'utente: per aprire la tastiera bisogna toccare la casella due volte.

- **Primo tocco:** sceglie la casella. Il cursore va lì, compare la barra, la tastiera resta chiusa.
- **Secondo tocco sulla stessa casella:** si apre la tastiera per scrivere a mano. Va bene un doppio tocco veloce, ma anche un secondo tocco più tardi: non c'è un tempo da rispettare.
- **Tocco su un'altra casella:** sceglie quella, e la tastiera resta com'era. Se era aperta resta aperta, se era chiusa resta chiusa, come per Avanti e Indietro.

Vale solo sul telefono e sul tablet. Sul PC non cambia niente.

### Esempio: dettare a partire da Angolo 5

1. Tocchi Angolo 5. La tastiera non si apre, e la barra è in fondo.
2. Tieni premuto 🎤 e detti. Il valore va in Angolo 5 e si passa ad Altezza 5.
3. Per correggere a mano un valore, tocchi due volte la sua casella e scrivi. La barra sta sopra la tastiera.

## Cosa cambia nel codice e nei documenti

- **`src/app.js`:**
  - la barra segue il bordo della tastiera, con le misure della parte visibile dello schermo che il browser dà alla pagina (`visualViewport`);
  - con le stesse misure il sito capisce se la tastiera è aperta. Avanti e Indietro, se è chiusa, spostano il cursore lasciandola chiusa;
  - sul telefono le caselle partono senza tastiera; un tocco sulla casella già scelta la apre.
- **`src/template.html`:** nella guida per il telefono, due righe: un tocco sceglie la casella, due tocchi aprono la tastiera; Avanti e Indietro non la aprono.
- **Versione:** sito **1.15.0** (`package.json`). Il firmware resta 1.4.0.

## Cosa bisogna sapere

- **I test automatici non hanno una tastiera vera.** Si può simulare la parte visibile dello schermo che si restringe, ma non il tastierino del telefono. La prova vera va fatta sul tuo telefono.
- **Se un browser non dà le misure della parte visibile**, la barra resta in fondo come oggi, e Avanti e Indietro funzionano come oggi.

## Test

- **Pagina, telefono simulato:**
  - con la parte visibile ristretta (come con la tastiera aperta), la barra sta sopra la tastiera, dentro la parte visibile;
  - con la tastiera chiusa, Avanti e Indietro spostano il cursore e le caselle restano senza tastiera;
  - con la tastiera aperta, Avanti e Indietro la lasciano aperta;
  - un tocco su una casella la sceglie senza tastiera; un secondo tocco sulla stessa casella la apre;
  - sul PC il primo clic permette subito di scrivere, come oggi.
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
- **Prova vera sul telefono:**
  - toccare una casella una volta (niente tastiera) e due volte (tastiera);
  - scrivere a mano con Avanti;
  - chiudere la tastiera, muoversi con Avanti e Indietro, dettare con 🎤;
  - controllare che la barra non sparisca mai.
