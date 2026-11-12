# Uso da smartphone del compilatore misure

Data: 2026-11-12

## Scopo

Rendere lo strumento comodo da usare su smartphone. Gli usi da coprire sono due:

1. **Inserire i valori dal telefono**, per esempio mentre si misura.
2. **Mostrare i codici sul telefono, davanti alla macchina**, e leggerli col lettore dallo schermo senza stamparli.

Si lavora sullo stesso file `compilatore-misure.html`, che si adatta da solo alla larghezza dello schermo. Non si crea una versione separata.

## Cosa si fa

### Impaginazione su schermo stretto (sotto i 640 px)

- Impostazioni una sotto l'altra. Pulsanti e caselle alti almeno 44 px, comodi da toccare.
- Tabella su tutta la larghezza, con colonna N° stretta. Il testo delle caselle resta almeno a 16 px, così iPhone non ingrandisce la pagina quando si tocca una casella.
- Barra delle sezioni in alto più compatta (numeri e nomi brevi). Mai scorrimento orizzontale.
- Codici a barre e QR in una sola colonna, dimensionati sulla larghezza reale dello schermo e sempre neri su riquadro bianco.

### Inserimento dal telefono

- Tastierino numerico: `inputmode="decimal"` nel modo "con separatore" e `inputmode="numeric"` nel modo "come in macchina".
- Il tastierino numerico dell'iPhone non ha né INVIO né segno meno. Per questo, mentre si scrive in una casella, compare in basso una **barra fissa**:
  `◀ Indietro` · `±` (cambia segno) · `Avanti ▶`.
  "Avanti" fa la stessa cosa di INVIO: angolo → altezza → riga successiva.
- Su Android il tasto della tastiera mostra "Avanti" (`enterkeyhint="next"`).

### Modalità lettura "uno alla volta" (codici a barre)

Su telefono scorrere fino a 200 codici è scomodo e si rischia di saltarne uno. Quindi:

- nuovo pulsante **"Leggi uno alla volta"** nella scheda Codici a barre;
- mostra un solo codice grande a tutto schermo, con l'etichetta ("Angolo 7"), il valore ("20.00") e l'avanzamento ("13 di 40");
- grandi pulsanti `◀ Precedente` / `Successivo ▶`, più lo scorrimento laterale del dito;
- il punto in cui si è arrivati si salva, così se lo schermo si spegne si riparte da lì;
- dove il telefono lo permette, lo schermo resta acceso mentre la modalità è aperta (Wake Lock, solo se la pagina è aperta da un indirizzo https);
- funziona anche su PC.

La scheda QR è già "uno alla volta". Si adattano solo le dimensioni e i pulsanti più grandi.

### Guida

- Nuovo paragrafo "Da smartphone": luminosità dello schermo al massimo e telefono tenuto fermo.
- Avvertenza: alcuni lettori 1D laser **non leggono i codici da uno schermo**, quelli a fotocamera ("imager") sì. Va provato col nostro lettore.

## Test

- Viewport da telefono (390×844, con tocco):
  - nessuno scorrimento orizzontale;
  - pulsanti alti almeno 44 px;
  - testo delle caselle almeno a 16 px.
- Barra Indietro / ± / Avanti: ordine dei campi uguale a INVIO, cambio di segno corretto.
- Modalità uno alla volta:
  - ordine esatto di tutti i codici;
  - ogni codice mostrato si decodifica con zxing con il contenuto atteso;
  - posizione mantenuta dopo il ricaricamento.
- QR su telefono: si decodifica con il contenuto esatto.
- Screenshot da telefono, nel tema scuro e nel tema chiaro.

## Punto aperto

- **Come si apre il file sul telefono?** Un file HTML locale su Android si apre con qualche passaggio. Su iPhone invece l'anteprima di File non esegue bene la pagina. Le strade possibili sono due:
  - **a)** copiare il file sul telefono e aprirlo con Chrome (va bene su Android);
  - **b)** pubblicarlo come pagina web privata da aprire con un link (funziona su qualsiasi telefono, serve internet solo per aprirla).

  I valori salvati restano comunque solo su quel telefono: tra PC e telefono non si sincronizzano.
