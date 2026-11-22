# Cambiare i decimali con i valori già scritti

Data: 2026-11-22 (12:59)
Stato: **realizzato il 2026-11-22** (sito 1.12.0), confermato dall'utente il 2026-11-22 (senza arrotondare).

Note di realizzazione:

- **Il messaggio** sta in cima al riepilogo, dove già compare l'avviso dell'incolla da Excel. Resta finché non si incolla, si apre una lista o si svuota la tabella, come quell'avviso.
- **Un valore che era già un errore** (per esempio 20,555 con 2 decimali) non si accorcia: resta rosso e va corretto a mano.
- **Se tutte le cifre restano zero**, il segno meno si toglie: -0,05 con 1 decimale diventa 0,0.

L'utente chiede che, quando si tolgono decimali (per esempio da 2 a 1), si cancellino solo le cifre dopo la virgola che non servono più, e che il resto del valore resti com'è.

## Com'è oggi

I decimali si scelgono in **Cambia**, in **Decimali angolo** e **Decimali altezza**. Quando si cambiano, le caselle tengono il testo scritto e il sito ricalcola le cifre da digitare.

- **Con separatore (20,55):** se la casella ha più decimali di quelli scelti, diventa rossa con «Troppi decimali (massimo 1)». Bisogna correggerle una per una.
- **Come in macchina (2055):** le cifre restano quelle, ma cambia dove cade la virgola. Con 2 decimali 2055 vuol dire 20,55, con 1 decimale vuol dire 205,5. Il valore cambia senza che si veda.

## Cosa cambia

Quando si cambiano i decimali dell'angolo, il sito sistema tutte le caselle degli angoli. Quando si cambiano quelli dell'altezza, sistema le caselle delle altezze. Il valore resta lo stesso, salvo le cifre tolte.

### Se si tolgono decimali

Si cancellano le cifre in più in fondo, **senza arrotondare**: 20,59 diventa 20,5, non 20,6.

| Modo | Prima (2 decimali) | Dopo (1 decimale) |
|---|---|---|
| Con separatore | 20,55 | **20,5** |
| Con separatore | 20,5 | 20,5 (non cambia) |
| Come in macchina | 2055 (20,55) | **205** (20,5) |

### Se si aggiungono decimali

| Modo | Prima (1 decimale) | Dopo (2 decimali) |
|---|---|---|
| Con separatore | 20,5 | 20,5 (non cambia, si digita 2050) |
| Come in macchina | 205 (20,5) | **2050** (20,50) |

Nel modo **come in macchina** si aggiunge uno zero in fondo, così 205 resta 20,5 e non diventa 2,05.

### Cosa non si tocca

- **Caselle vuote** e **caselle con un errore** (per esempio una lettera): restano come sono.
- **Valori scritti dopo il cambio:** se con 1 decimale si scrive 20,55, la casella diventa rossa come oggi. Il sito non cancella niente mentre si scrive, così un errore di battitura si vede.
- **Le liste salvate** non cambiano finché non si risalvano. Quando se ne apre una, tornano anche i suoi decimali, come oggi.

### Il sito dice cosa ha cambiato

Dopo il cambio compare un messaggio, per esempio: «Decimali angolo: 1. Accorciati 12 valori.» Se nessuna casella cambia, il messaggio non c'è.

Le cifre cancellate non tornano se si rimettono i decimali di prima. Per questo il messaggio dice quanti valori sono stati accorciati.

### Il modo di scrittura

Anche passare da **con separatore** a **come in macchina**, o il contrario, oggi cambia il significato dei valori. Questo documento non lo tocca. Se vuoi, se ne può fare un altro.

## Cosa cambia nel codice e nei documenti

- **`src/logica.js`:** una funzione pura, `cambiaDecimali(testo, modo, prima, dopo)`, che restituisce il testo nuovo della casella. Così si prova nei test senza la pagina.
- **`src/app.js`:**
  - al cambio di *Decimali angolo* o *Decimali altezza*, applica la funzione alle caselle della colonna giusta;
  - ridisegna la tabella e mostra il messaggio.
- **`src/template.html`:** nella guida, una riga che spiega cosa succede ai valori quando si cambiano i decimali.
- **Versione:** sito **1.12.0** (`package.json`). Il firmware resta 1.4.0.

## Test

- **`cambiaDecimali`:**
  - gli esempi delle tabelle qui sopra, anche con i negativi e con il punto al posto della virgola;
  - da 2 a 0 decimali: 20,55 diventa 20, e 2055 diventa 20;
  - caselle vuote ed errori restano come sono.
- **Pagina:**
  - con i valori scritti, passare da 2 a 1 decimale cambia solo la colonna giusta;
  - compare il messaggio con il numero di valori accorciati.
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
