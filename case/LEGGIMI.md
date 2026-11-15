# Case per la chiavetta

Case stampabile in 3D per il Pico 2 W e i tre tasti **Scrivi**, **Ferma** e **Ricomincia**. È in due pezzi che si chiudono a incastro, con calamite sotto.

Il progetto è in [docs/2026-11-15-case-chiavetta.md](../docs/2026-11-15-case-chiavetta.md), il collegamento dei tasti in [docs/2026-11-14-tastiera-3-tasti.md](../docs/2026-11-14-tastiera-3-tasti.md).

| File | Cosa contiene |
|---|---|
| `case-chiavetta.scad` | il disegno, con tutte le misure in cima come parametri |
| `case-fondo.stl` | il fondo, pronto da stampare |
| `case-coperchio.stl` | il coperchio, già capovolto per la stampa |
| `anteprima.png` | i due pezzi, con il coperchio sollevato |

![Anteprima del case](anteprima.png)

Misure: circa 38 × 62 × 16 mm, più i pulsanti che sporgono di circa 2,5 mm.

Sul coperchio ogni tasto ha il suo simbolo inciso: **▶ Scrivi**, **⏸ Ferma**, **↻ Ricomincia**.

## Cosa serve

- Pico 2 W **senza pin** saldati;
- 3 pulsantini tattili **6 × 6 mm, alti 8 mm** (pulsante Ø 3,5 mm);
- 4 calamite al neodimio **Ø 10 × 3 mm**;
- 2 o 4 viti autofilettanti **M2 × 5**;
- filo sottile, colla istantanea, colla a caldo.

## Stampa

- Senza supporti:
  - il fondo dritto;
  - il coperchio capovolto, con i simboli sul piatto, come negli STL.
- **PETG** consigliato: regge caldo e olio, e le linguette si piegano senza rompersi. Va bene anche il PLA.
- Strato 0,2 mm, riempimento 20 %, 3 perimetri.
- Le sedi delle calamite sono sotto il fondo: il loro tetto si stampa a ponte. Se esce un po' cadente non importa.

## Montaggio

1. **Calamite:**
   - una goccia di colla istantanea in ogni sede sotto il fondo, poi si spinge dentro la calamita;
   - mettile **tutte con lo stesso polo verso l'esterno**: così non si respingono tra loro sulla macchina.
2. **Pulsantini:**
   - dall'interno del coperchio, si spinge ognuno tra le sue due guide, con il pulsante nel foro;
   - **le zampine vanno verso i lati aperti**, non contro le guide;
   - un punto di colla a caldo sul retro lo tiene fermo.
3. **Fili:**
   - si collega **un piedino di ogni pulsantino al comune**, cioè un filo che va al pin **18 (GND)** del Pico;
   - l'altro piedino va al suo pin:

   | Tasto | Pin del Pico |
   |---|---|
   | ▶ Scrivi (in alto) | 20 (GP15) |
   | ⏸ Ferma (al centro) | 19 (GP14) |
   | ↻ Ricomincia (in basso) | 17 (GP13) |

   - In un pulsantino 6 × 6 i due piedini dello stesso lato sono separati, quelli uno di fronte all'altro sono uniti: usa **due piedini in diagonale** e vai sul sicuro.
   - Lascia i fili lunghi circa 6 cm, così il coperchio si apre senza strapparli.
4. **Pico:** si appoggia sulle colonnine con la presa USB verso l'apertura e si fissa con le viti M2. Non stringere troppo: la scheda non deve piegarsi.
5. **Chiusura:** il coperchio va appoggiato con la scritta **LED** dalla parte della presa USB. Poi si preme finché le quattro linguette scattano.

**Per riaprire:** con un cacciavite piccolo si spingono verso l'interno i dentini, attraverso le finestrelle sui lati lunghi, e intanto si solleva il coperchio.

## Cosa c'è sul coperchio

- **Tubetto LED:** si vede la luce del LED del Pico, compresi i tre lampi di Ricomincia.
- **Forellino accanto:** è sopra il tasto BOOTSEL del Pico. Serve solo in caso di emergenza per ricaricare il firmware: si collega il cavo tenendolo premuto con una graffetta.

## Adattare le misure

In cima a `case-chiavetta.scad` ci sono tutti i parametri:

- tolleranza;
- spessori;
- misure dei pulsantini;
- posizione dei tasti;
- calamite;
- incastro.

Se i pezzi entrano troppo stretti, alza `tolleranza` (es. 0,3).

Per rifare gli STL serve [OpenSCAD](https://openscad.org): scegli `parte` (`"fondo"` o `"coperchio"`), premi F6, poi *File → Export → STL*. Da riga di comando:

```
openscad -o case-fondo.stl -D "parte=\"fondo\"" case-chiavetta.scad
openscad -o case-coperchio.stl -D "parte=\"coperchio\"" case-chiavetta.scad
```

**Dopo aver cambiato le misure, fai il controllo.** Con `parte = "ingombri"` si vedono in verde il Pico, la presa USB, la spina e i pulsantini dentro il case. Con `parte = "controllo"` si vede solo dove toccano il case. Deve restare solo il contatto piatto del Pico sulle colonnine, nient'altro.

Il file è stato provato con OpenSCAD 2021.01.
