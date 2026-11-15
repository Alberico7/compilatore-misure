# Case stampabile per la chiavetta

Data: 2026-11-15
Stato: **confermato dall'utente** (misure dei pulsantini, prese d'aria e chiusura a incastro).

## Cosa si fa

Un case in due pezzi da stampare in 3D, per il Pico 2 W e i tre tasti (Scrivi, Ferma, Ricomincia) di [2026-11-14-tastiera-3-tasti.md](2026-11-14-tastiera-3-tasti.md):

- **fondo:** tiene il Pico, ha l'apertura per il cavo USB, le prese d'aria e le calamite sotto;
- **coperchio:** tiene i tre pulsantini, con il nome di ogni tasto inciso accanto. Si chiude **a incastro**, senza viti.

Scelte dell'utente:

- pulsantini tattili **6 × 6 mm, alti 8 mm, pulsante nero Ø 3,5 mm**;
- Pico **senza pin**, con i fili saldati direttamente;
- fissaggio con **calamite**;
- **prese d'aria**;
- **chiusura a incastro**.

## Forma

Misure: **circa 43 × 62 × 16 mm**, più i pulsanti che sporgono di 2–3 mm.

Visto dall'alto, con la presa USB in alto:

- **a sinistra**, la colonna dei tre tasti, vicina ai pin 17–20 del Pico, così i fili sono corti;
- **a destra**, il Pico;
- le **scritte** stanno accanto ai tasti, sopra il Pico.

In fondo c'è un margine vuoto di 5 mm davanti all'antenna, che lì non vuole niente vicino. Angoli arrotondati.

## Fondo

- **Pico:**
  - appoggia su **quattro colonnine** alte 4 mm, nei suoi fori da Ø 2,1 mm;
  - è fissato con viti autofilettanti **M2 × 5** (ne bastano due).
- **Apertura per la micro-USB** nella parete corta, larga 12 mm: ci entra anche il guscio della spina.
- **Quattro sedi per calamite Ø 10 × 3 mm**, aperte verso l'esterno: si incollano con una goccia di colla istantanea e toccano direttamente il metallo. Nessuna sta sotto l'antenna.
- **Prese d'aria:**
  - feritoie verticali sui due lati lunghi;
  - feritoie sulla parete in fondo, davanti all'antenna.
  - Niente feritoie sul coperchio, così trucioli e olio non entrano dall'alto.
- **Quattro finestrelle** nelle pareti lunghe per i ganci del coperchio.

## Coperchio

- **Incastro:**
  - un bordo interno centra il coperchio nel fondo;
  - quattro **linguette elastiche con dentino** scattano nelle finestrelle;
  - per riaprire si spingono i dentini dalle finestrelle con un cacciavite piccolo.
- **Tre sedi per i pulsantini**, sul lato interno:
  - due guide tengono il corpo da 6 × 6 mm;
  - i lati con le zampine restano liberi per saldare i fili;
  - il pulsante esce di circa 2,5 mm da un foro da Ø 4,1 mm;
  - un punto di colla a caldo lo tiene fermo.
- **Scritte e anelli incisi:** SCRIVI, FERMA, RICOMINCIA accanto ai tasti, più un anello inciso intorno a ogni pulsante, per trovarlo anche al tatto.
- **Tubetto sopra il LED** del Pico, per vedere i lampi.
- **Tubetto sopra il tasto BOOTSEL**, da premere con una graffetta. Serve solo in caso di emergenza.

## Stampa

- Senza supporti:
  - fondo stampato dritto;
  - coperchio stampato capovolto, con le scritte sul piatto. Gli STL sono già orientati così.
- PETG consigliato: regge meglio caldo e olio, e le linguette si piegano senza rompersi. Va bene anche PLA.
- Strato 0,2 mm, riempimento 20 %.
- Pezzi da comprare:
  - 4 calamite Ø 10 × 3 mm;
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
- Il coperchio scatta e si riapre.
- Il Bluetooth funziona con il coperchio chiuso.
- Le calamite tengono il case sulla macchina anche premendo i tasti.
