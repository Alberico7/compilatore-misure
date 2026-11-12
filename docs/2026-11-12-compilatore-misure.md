# Compilatore misure Angolo/Altezza

Data: 2026-11-12

## Scopo

Evitare di ridigitare a mano nella maschera della macchina le coppie ANGOLO/ALTEZZA (fino a 100 e oltre).
Il PC dell'ufficio genera dei codici; il lettore collegato alla macchina in modalità tastiera (USB HID) li "digita" nella maschera.
Sulla macchina non si installa nulla.

Lo strumento **compila soltanto i campi**: non invia mai tasti diversi da cifre, segno meno (se presente) e INVIO, quindi non può avviare cicli.

## Cosa si consegna

| File | Contenuto |
|---|---|
| `compilatore-misure.html` | Lo strumento: un unico file, funziona offline aprendolo con doppio clic. Librerie incluse nel file. |
| `test/` | Test automatici (Node + Playwright + zxing). Servono solo a noi per lo sviluppo, non vanno copiati sul PC dell'ufficio. |
| `docs/` | Questo documento. |

## Struttura della pagina

Una pagina, in italiano, con caratteri grandi e alto contrasto (leggibile in officina e da un monitor un po' lontano).

1. **Impostazioni** (in alto, compatte)
   - Decimali angolo (predefinito 2), decimali altezza (predefinito 2).
   - Modo di inserimento: "Come in macchina (2000)" oppure "Con separatore (20.00 / 20,00)".
   - Numero di righe.
2. **Tabella** `N° | Angolo | Altezza`
   - Sotto ogni casella: anteprima "In macchina: 20.00" e, se diverso, "Cifre inviate: 2000".
   - INVIO: angolo → altezza → angolo riga successiva (all'ultima riga ne aggiunge una).
   - Frecce ↑/↓: stessa colonna, riga precedente/successiva.
   - Incolla da Excel: due colonne (separate da TAB) incollate a partire dalla casella attiva; le righe si aggiungono da sole. Una sola colonna incollata riempie solo quella colonna.
   - Pulsanti: "Aggiungi riga", "Elimina ultima riga", "Svuota tutto" (con conferma).
3. **Controllo dati** — riepilogo errori/avvisi con link alla casella.
4. **Uscita**, due schede:
   - **Codici a barre (lettore 1D)**: un Code 128 per ogni valore, nell'ordine Angolo 1, Altezza 1, Angolo 2…; ogni codice ha etichetta "Angolo 3" / "Altezza 3" e valore leggibile "20.00". Il codice contiene solo le cifre (es. `2000`), l'INVIO lo aggiunge il lettore.
   - **QR a blocchi (lettore 2D)**: coppie per blocco impostabili (5 / 10 / 20 / 25, predefinito 10); navigazione "Blocco 1 di 3" con Precedente/Successivo; scritta "Questo blocco parte dalla coppia 11 (Angolo 11) e finisce alla coppia 20". Opzione "Aggiungi INVIO finale nel QR" (predefinita: **disattivata**, perché il lettore aggiunge già il suo INVIO). Sotto il QR, il contenuto in chiaro (es. `2000⏎1550⏎2100⏎…`).
   - I codici compaiono solo se tutti i dati sono validi; altrimenti al loro posto c'è il messaggio "Correggi gli errori".
5. **Prova del lettore** — vedi sotto.
6. **Guida** — vedi sotto.

## Conversione dei valori

Regola unica: il valore inviato è il numero intero = valore × 10^decimali, scritto senza separatore, senza zeri iniziali inutili.

| Modo | Digitato | Decimali | Inviato | In macchina |
|---|---|---|---|---|
| Come in macchina | `2000` | 2 | `2000` | 20.00 |
| Come in macchina | `5` | 2 | `5` | 0.05 |
| Con separatore | `20.00` / `20,00` | 2 | `2000` | 20.00 |
| Con separatore | `20.5` | 2 | `2050` | 20.50 |
| Con separatore | `20` | 2 | `2000` | 20.00 |
| Con separatore | `20.123` | 2 | errore: troppi decimali | — |

- La conversione è fatta sulle stringhe (niente calcoli in virgola mobile, quindi niente `19.999999`).
- Spazi iniziali/finali ignorati; i separatori delle migliaia non sono accettati (evitano ambiguità tra `1.000` e `1,000`).
- Nel modo "come in macchina" un punto o una virgola sono un errore ("in questo modo non scrivere il separatore").
- Cambiando modo o decimali, la tabella viene ricontrollata e le anteprime si aggiornano subito.

## Validazione

- **Errori (bloccano i codici)**: casella vuota, valore non numerico, troppi decimali, separatore nel modo "come in macchina".
- **Avvisi (non bloccano)**: valore negativo → banner "Non sappiamo se la maschera accetta il segno meno: verificare in macchina". Il segno `-` viene inviato come carattere.
- Caselle con errore bordate in rosso con messaggio sotto; con avviso in arancione.

## Codici

- **Code 128**: encoder scritto nello strumento (poche decine di righe). Set C per stringhe di sole cifre in numero pari (codice più corto e facile da leggere), set B negli altri casi (cifre dispari, segno meno). Disegnato in SVG, con zona di rispetto bianca ai lati.
- **QR**: libreria `qrcode-generator` (Kazuhiko Arase, licenza MIT, ~20 KB) incollata nel file. Modalità byte, correzione errori livello M. Contenuto: valori separati da CR (0x0D). Esempio blocco di 2 coppie, senza INVIO finale: `2000\r1550\r2100\r1600`.
  - Nota: senza INVIO finale, dopo la lettura del blocco il lettore aggiunge il suo INVIO e il cursore arriva al campo dell'angolo successivo, pronto per il blocco dopo.

## Prova del lettore

Si collega il lettore al PC dell'ufficio e si legge nella casella di prova.

- Scelta di cosa confrontare: "Tutti i codici a barre in ordine" oppure "Blocco QR n".
- Lo strumento confronta riga per riga quello che arriva con quello atteso e mostra una tabella Atteso | Ricevuto | Esito.
- Segnala in chiaro:
  - caratteri diversi (con suggerimento "layout di tastiera diverso?", es. `-` che arriva come `ß` o `'`);
  - righe vuote = INVIO doppio ("disattivare l'INVIO finale nel QR o il suffisso del lettore");
  - valori attaccati senza INVIO = il lettore non invia i caratteri di controllo ("attivare Function key emulation");
  - valori mancanti o in più.
- Il PC dell'ufficio può avere un layout diverso da quello della macchina: la guida spiega che la prova vale per la macchina solo se i layout coincidono.

## Salvataggio

- `localStorage`: valori della tabella, modo, decimali, numero righe, coppie per blocco, opzione INVIO finale, scheda attiva. Salvataggio a ogni modifica.
- Se `localStorage` non è disponibile la pagina funziona lo stesso (avviso discreto "salvataggio non disponibile").
- "Svuota tutto" chiede conferma e azzera solo i valori (le impostazioni restano).

## Guida nella pagina (sezione richiudibile)

- Uso passo passo: inserire/incollare valori → controllare anteprime → in macchina posizionarsi sul campo **Angolo 1** → leggere i codici nell'ordine.
- **Sicurezza, in evidenza**: lo strumento compila solo i campi. Prima di avviare la tastatura controllare sempre i valori sullo schermo della macchina: un valore sbagliato può mandare il tastatore contro l'utensile.
- Configurazione del lettore: layout tastiera uguale a quello della macchina (probabilmente tedesco); suffisso INVIO attivo; per i QR attivare "Function key emulation" (o l'equivalente "invio caratteri di controllo"); se la maschera perde caratteri, impostare un ritardo tra i caratteri (inter-character delay).
- Cosa fare se si sbaglia o si salta un campo: fermarsi, correggere a mano, ripartire dal codice giusto (le etichette dicono dove si è).

## Test

Cartella `test/` con `package.json` (dipendenze solo di sviluppo: `playwright`, `zxing-wasm`). Comando: `cd test && npm test` (ricompila l'HTML e lancia tutti i test, browser Microsoft Edge già installato).

Nota: inizialmente si era previsto `@zxing/library` (zxing-js). In prova il suo rilevatore falliva su alcuni QR validi (contenuto corretto se letto in modalità "codice puro"), quindi si usa `zxing-wasm` (zxing-cpp, la versione mantenuta di zxing), che li legge tutti. Il test confronta i byte grezzi decodificati.

Sorgenti: `src/template.html`, `src/logica.js` (logica pura, testabile in Node), `src/app.js` (interfaccia), `src/vendor/qrcode.js`. `node src/build.js` li unisce in `compilatore-misure.html`.

1. **Logica** (conversione e validazione): casi della tabella sopra, virgola/punto, negativi, zeri iniziali, 0, decimali 0/3/4.
2. **Decodifica end-to-end**: Playwright apre `compilatore-misure.html` in Chromium, inserisce i dati (anche via incolla stile Excel), legge i pixel di ogni codice generato e li decodifica con zxing. Si verifica che il contenuto sia **esattamente** quello atteso, byte per byte:
   - Code 128: 20 coppie e 100 coppie, ordine Angolo/Altezza, cifre corrette, nessun separatore.
   - QR: 100 coppie con blocchi da 5/10/20/25, con e senza INVIO finale; controllo dei CR, nessun LF, ordine e confini dei blocchi (l'ultimo blocco può essere più corto).
   - Valori negativi e valori a cifre dispari (passaggio Code 128 set B).
3. **Interfaccia**: nessun codice con dati non validi; persistenza dopo ricarica; "Svuota tutto".
4. **Screenshot** della pagina (tabella, codici a barre, QR, prova lettore) salvati in `test/screenshot/` e controllati a vista per leggibilità.

## Fuori da questa prima versione

- Lettura diretta da file Excel (si usa il copia/incolla).
- Più programmi/utensili salvati con nome (si può aggiungere dopo).

## Licenza

- **PolyForm Noncommercial 1.0.0**, titolare Andrea Carletti (file `LICENSE`, con la riga `Required Notice`): solo uso non commerciale.
- Le librerie incluse restano sotto le loro licenze (QR: MIT; vosk-browser e modello: Apache 2.0; fflate: MIT).

## Decisioni (conferma dell'utente, 2026-11-12)

1. Modello del lettore: sconosciuto per ora. Si fanno entrambe le uscite (1D e 2D).
2. Righe oltre la pagina visibile: per la prima prova non si supera la pagina. Nessuna gestione del cambio pagina in questa versione.
3. Valori negativi: solo avviso, non bloccano.
4. Decimali: 2 e 2, configurabili.
