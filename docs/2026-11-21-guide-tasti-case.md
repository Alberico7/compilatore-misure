# Guide dei tasti che non danno fastidio alle zampine

Data: 2026-11-21 (13:57)
Stato: **realizzato il 2026-11-21**, confermato dall'utente il 2026-11-21 con le linguette alte **2,2 mm**.

Note di realizzazione:

- **Bordo di sinistra abbassato, non interrotto:** la proposta era di interrompere il bordo per 9 mm accanto a ogni pulsantino. Però le interruzioni dei tasti e quelle delle viti si sarebbero toccate, e a sinistra il bordo sarebbe sparito quasi del tutto. Così, accanto ai pulsantini, il bordo è stato solo abbassato a 2,2 mm, come le linguette: continua a centrare il coperchio e lascia libere le zampine.
- **Zampine piegate verso la parete:** nel controllo arrivano fino a 0,2 mm dalla parete del fondo, cioè fin dove c'è posto (circa 2 mm). Il controllo resta vuoto, tranne il contatto piatto del Pico.

L'utente ha chiesto che le linguette del coperchio che tengono fermi i pulsantini non diano fastidio se le zampine si piegano.

Cambia solo il coperchio (`case/case-chiavetta.scad` e `case/case-coperchio.stl`). Il fondo, il Pico, il firmware e il sito non cambiano.

## Com'era

Ogni pulsantino da 6 × 6 mm stava tra due guide:

- **a destra**, dalla parte del Pico, una linguetta lunga **6 mm**, cioè tutto il lato del pulsantino, che scendeva dal coperchio per **3 mm**;
- **a sinistra** il bordo interno del coperchio, lungo quanto tutto il coperchio, che scendeva per **4 mm**.

Il corpo del pulsantino è alto 3,5 mm e le zampine escono dal fondo del corpo, vicino agli angoli. Le guide arrivavano quindi fino a 0,5 mm dalle zampine, e il bordo di sinistra andava anche più in basso. Se una zampina si piegava di lato, verso una guida, la toccava subito e il pulsantino non stava più dritto.

## Cosa cambia

### 1. Linguette più corte e più basse, su tutti e due i lati

- **Lunghe 3 mm invece di 6**, al centro del lato. Gli angoli, dove escono le zampine, restano liberi: una zampina piegata di lato passa accanto alla linguetta, con circa 1,3 mm di spazio.
- **Scendono per 2,2 mm invece di 3.** Tengono la parte alta del corpo, e sotto, dove escono le zampine, restano 1,3 mm liberi.
- Il pulsantino resta tenuto: 2,2 mm di guida per parte, più il foro del pulsante e il punto di colla a caldo.

### 2. A sinistra il bordo si abbassa accanto ai pulsantini

- Accanto a ogni pulsantino, per 9 mm, il bordo interno del coperchio scende solo per 2,2 mm invece di 4.
- Nel resto del coperchio il bordo resta com'era, e il coperchio entra ancora centrato nel fondo.
- A sinistra c'è la parete del fondo, a circa 2,3 mm dalle zampine. Una zampina piegata verso la parete si appoggia lì: più di così non si può fare senza allargare il case.

### 3. Il controllo vede anche le zampine piegate

- In `"controllo"` e `"ingombri"` ci sono anche le zampine **piegate a 90°**:
  - verso il Pico, per tutta la lunghezza (3,5 mm);
  - verso la parete, fin dove c'è posto.
- Con `"controllo"` non devono toccare niente.

## Cosa non cambia

- **Le zampine piegate verso le viti** toccano ancora le colonnine, come prima: tra zampina e colonnina ci sono circa 0,8 mm. Per evitarlo bisognerebbe allontanare i tasti dalle viti, e il case diventerebbe più lungo di circa 6 mm.
- Il LEGGIMI del case lo dice: le zampine si saldano dritte, oppure si piegano di lato, mai verso le viti.

## Cosa cambia nel codice e nei documenti

- **`case/case-chiavetta.scad`:**
  - nuove misure `tasto_zampa = 3.5`, `guida_l = 3` e `guida_h = 2.2`, tra le "Misure da adattare";
  - linguette dei pulsantini corte e basse su tutti e due i lati;
  - bordo di sinistra abbassato accanto ai pulsantini;
  - zampine piegate negli ingombri.
- **`case/case-coperchio.stl`** rigenerato.
- **`case/case-fondo.stl`** non cambia: rigenerato, ha la stessa forma di prima.
- **`case/LEGGIMI.md`:** montaggio dei pulsantini, linguette e zampine.
- **`docs/2026-11-15-case-chiavetta.md`:** nota che rimanda a questo documento.
- **`case/anteprima.png`** resta com'è: il coperchio si vede da fuori, e da fuori non cambia niente.

## Controlli

- OpenSCAD 2021.01: il fondo e il coperchio si generano senza avvisi.
- `"controllo"`: resta solo il contatto piatto del Pico sulle colonnine, a z = 5,6 mm. Le zampine, dritte e piegate, non toccano niente.
- Il coperchio esterno ha le stesse misure di prima: i ganci, le viti e il bordo esterno non cambiano.
- Stampabile capovolto senza supporti: le linguette e il bordo abbassato salgono dal piatto.
