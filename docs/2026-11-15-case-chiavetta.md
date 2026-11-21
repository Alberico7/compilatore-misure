# Case stampabile per la chiavetta

Data: 2026-11-15
Stato: **confermato dall'utente** (misure dei pulsantini, prese d'aria e chiusura a incastro).
Il 2026-11-15, dopo la prima versione, l'utente ha chiesto i **simboli** ▶ ⏸ ↻ al posto delle scritte, per un case più stretto: 38 mm invece di 43.
Il 2026-11-16 ha chiesto **2 calamite** invece di 4, **simboli più grandi** (10 mm invece di 5) e un case ancora più stretto: 34 mm. Per stringerlo:

- a sinistra il bordo del coperchio fa anche da guida ai pulsantini;
- a destra niente linguette elastiche, che scendevano fino al Pico, ma **ganci fissi** in alto: la parete sta a 0,6 mm dal Pico.

Sempre il 2026-11-16 l'utente ha chiesto di chiudere **con le viti** invece che con le linguette, che rischiano di spezzarsi. A sinistra ci sono due **viti M3 svasate** in **inserti filettati di ottone**, messi a caldo in due colonnine tra un tasto e l'altro. I tasti sono un po' più distanziati per fare spazio alle colonnine. A destra restano i ganci fissi, che non si piegano e quindi non si spezzano.

Il 2026-11-21 le guide dei pulsantini sono diventate linguette corte e basse (3 × 2,2 mm), e accanto ai pulsantini il bordo di sinistra è stato abbassato, così le zampine piegate di lato non le toccano: vedi [2026-11-21-guide-tasti-case.md](2026-11-21-guide-tasti-case.md).

## Cosa si fa

Un case in due pezzi da stampare in 3D, per il Pico 2 W e i tre tasti (Scrivi, Ferma, Ricomincia) di [2026-11-14-tastiera-3-tasti.md](2026-11-14-tastiera-3-tasti.md):

- **fondo:** tiene il Pico, ha l'apertura per il cavo USB, le prese d'aria e le calamite sotto;
- **coperchio:** tiene i tre pulsantini, con il simbolo di ogni tasto inciso accanto. Si chiude con due ganci a destra e due viti M3 a sinistra.

Scelte dell'utente:

- pulsantini tattili **6 × 6 mm, alti 8 mm, pulsante nero Ø 3,5 mm**;
- Pico **senza pin**, con i fili saldati direttamente;
- fissaggio con **calamite**;
- **prese d'aria**;
- chiusura prima **a incastro**, poi (2026-11-16) **con viti M3 e inserti di ottone**.

## Forma

Misure: **circa 34 × 62 × 16 mm**, più i pulsanti che sporgono di 2–3 mm.

Visto dall'alto, con la presa USB in alto:

- **a sinistra**, la colonna dei tre tasti, vicina ai pin 17–20 del Pico, così i fili sono corti;
- **a destra**, il Pico;
- i **simboli** stanno accanto ai tasti, sopra il Pico.

La colonna dei tasti è stretta e vicina alla parete. Le due viti stanno **tra un tasto e l'altro** (tasti a 16 mm di distanza), lontane dalle zampine dei pulsantini.

In fondo c'è un margine vuoto di 5 mm davanti all'antenna, che lì non vuole niente vicino. Angoli arrotondati.

## Fondo

- **Pico:**
  - appoggia su **quattro colonnine** alte 4 mm, nei suoi fori da Ø 2,1 mm;
  - è fissato con viti autofilettanti **M2 × 5** (ne bastano due).
- **Apertura per la micro-USB** nella parete corta, larga 12 mm: ci entra anche il guscio della spina.
- **Due sedi per calamite Ø 10 × 3 mm**, al centro e aperte verso l'esterno: si incollano con una goccia di colla istantanea e toccano direttamente il metallo. Nessuna sta sotto l'antenna.
- **Prese d'aria:**
  - feritoie verticali per tutta la lunghezza dei due lati lunghi, tranne accanto alle viti e ai ganci;
  - feritoie sulla parete in fondo, davanti all'antenna.
  - Niente feritoie sul coperchio, così trucioli e olio non entrano dall'alto.
- **Due sedi per i ganci** del coperchio, scavate in alto sul lato interno della parete destra: da fuori non si vedono buchi (2026-11-16, al posto delle finestrelle).
- **Due colonnine** sul lato sinistro, fuse con la parete, con il foro da Ø 4 mm per gli inserti M3 e sotto altro spazio per la punta della vite.

## Coperchio

- **Chiusura:**
  - un bordo interno centra il coperchio nel fondo;
  - a destra due **ganci fissi** sul bordo; a sinistra due **viti M3 svasate**, a filo con il coperchio;
  - si chiude agganciando prima il lato destro, poi abbassando il sinistro e avvitando;
  - per riaprire si tolgono le viti, si solleva il lato sinistro e si sfila il coperchio.
- **Tre sedi per i pulsantini**, sul lato interno:
  - due linguette tengono il corpo da 6 × 6 mm, solo al centro del lato e in alto (dal 2026-11-21);
  - i lati con le zampine restano liberi per saldare i fili;
  - il pulsante esce di circa 2,5 mm da un foro da Ø 4,1 mm;
  - un punto di colla a caldo lo tiene fermo.
- **Simboli e anelli incisi:**
  - ▶ Scrivi, ⏸ Ferma e ↻ Ricomincia accanto ai tasti, grandi 10 mm, disegnati come forme e non con un carattere, così non dipendono dai font;
  - un anello inciso intorno a ogni pulsante, per trovarlo anche al tatto.
- **Tubetto sopra il LED** del Pico, per vedere i lampi. Senza scritta accanto (tolta il 2026-11-16, su richiesta dell'utente).
- **Tubetto sopra il tasto BOOTSEL**, da premere con una graffetta. Serve solo in caso di emergenza.

## Stampa

- Senza supporti:
  - fondo stampato dritto;
  - coperchio stampato capovolto, con i simboli sul piatto. Gli STL sono già orientati così.
- PETG consigliato: regge meglio caldo e olio. Va bene anche PLA.
- Strato 0,2 mm, riempimento 20 %.
- Pezzi da comprare:
  - 2 calamite Ø 10 × 3 mm;
  - 2 inserti filettati in ottone M3 (foro Ø 4 mm, lunghi fino a 4 mm);
  - 2 viti M3 × 6 o × 8 a testa svasata;
  - 2 o 4 viti M2 × 5 autofilettanti.

## Come è fatto il disegno

- **OpenSCAD**, con tutte le misure in cima al file come parametri: pulsantini, calamite, tolleranze, posizione dei tasti.
- Nella cartella nuova **`case/`**:
  - `case-chiavetta.scad`, il disegno;
  - `case-fondo.stl` e `case-coperchio.stl`;
  - `anteprima.png`;
  - `LEGGIMI.md`, con stampa, montaggio e collegamento.
- Le posizioni di fori, LED, BOOTSEL e presa USB vengono dal disegno meccanico ufficiale del Pico 2 W (datasheet, figura 3).
- Non tocca il sito né il firmware.

## Da provare con il case stampato

- Il Pico entra e le viti tengono, senza piegare la scheda.
- Il cavo USB entra fino in fondo.
- I pulsantini scattano bene e non si incastrano nel foro.
- Il LED si vede dal tubetto.
- Gli inserti entrano dritti e le viti chiudono il coperchio a filo.
- I ganci a destra entrano nelle loro sedi senza forzare.
- Il Bluetooth funziona con il coperchio chiuso.
- Le calamite tengono il case sulla macchina anche premendo i tasti.
