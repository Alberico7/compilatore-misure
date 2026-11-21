# Colori ad alto contrasto che non affaticano la vista

Data: 2026-11-22 (00:36)
Stato: **realizzato il 2026-11-22** (sito 1.10.0), confermato dall'utente il 2026-11-22.

Note di realizzazione:

- **Il test è in un file a parte:** `test/colori.test.js`, aggiunto a `npm test`. Controlla le soglie, i fondi non puri e che caselle, menu, pulsanti e scelte usino `--bordo-campo`.
- **Bordo dei riquadri di avviso:** anche `--bordo-avviso` è un po' meno saturo (`#9c7b3c` scuro, `#c9973f` chiaro). È solo una cornice, non un testo.
- **`test/pagina.test.js`** controllava il colore di fondo dei due temi: aggiornato ai colori nuovi.

L'utente chiede, per i due temi (scuro e chiaro), colori ad alto contrasto che non affatichino la vista.

Cambiano solo i colori della pagina (`src/template.html`). La disposizione, il firmware e la chiavetta non cambiano.

## Com'è oggi

Il contrasto si misura come nelle regole WCAG: 1 = nessuna differenza, 21 = nero su bianco. Per un testo che si legge bene a lungo servono **almeno 7** (livello AAA). Per il bordo di un campo o di un pulsante servono **almeno 3**.

Il testo normale va già bene: 14 nel tema scuro, 18 in quello chiaro. Restano però dei punti deboli.

- **Bordi dei campi quasi invisibili:** il contorno delle caselle, dei pulsanti e delle scelte ha un contrasto di 1,4–1,7. Si vede male dove finisce una casella, soprattutto in officina, con la luce che riflette sullo schermo.
- **Tema chiaro: fondo bianco puro.** Il bianco `#ffffff` su tutta la pagina abbaglia e stanca la vista, specie con lo schermo luminoso.
- **Tema chiaro: alcuni testi colorati sotto 7.** Messaggi di errore, di avviso e di conferma, e il testo tenue sul fondo: 5,7–6,5.
- **Tema scuro: colori accesi.** L'azzurro e il lilla sono molto saturi: su fondo scuro "vibrano" e stancano. Anche l'azzurro della scheda scelta sul suo fondo è sotto 7 (5,6).

## Cosa cambia

### Le regole

1. **Ogni testo ha almeno 7 di contrasto** con il fondo su cui sta, in tutti e due i temi: testo normale, testo tenue, link, schede, messaggi di errore, avviso e conferma, pulsanti.
2. **I bordi dei campi** (caselle, menu, pulsanti, scelte) hanno **almeno 3 di contrasto**.
   - Per questo c'è un colore nuovo, `--bordo-campo`.
   - Le cornici dei riquadri restano leggere, con un contrasto di circa 2: separano senza disturbare.
3. **Niente bianco puro né nero puro come fondo della pagina.**
   - Il tema chiaro ha un fondo bianco caldo, color carta.
   - Il tema scuro ha un fondo grigio molto scuro e un testo bianco sporco. Così i caratteri non "sbavano", come succede con il bianco pieno sul nero.
4. **Colori meno saturi:** azzurro, lilla, rosso, giallo e verde restano riconoscibili, ma più calmi.

Il tema scuro resta quello predefinito. Il pulsante ☀/☾ funziona come oggi.

### I colori

**Tema scuro**

| Uso | Oggi | Dopo | Contrasto oggi → dopo |
|---|---|---|---|
| Fondo pagina | `#14171c` | `#121417` | — |
| Riquadri | `#1d2128` | `#1a1d21` | — |
| Campi | `#252a33` | `#202429` | — |
| Testo | `#eef1f5` | `#e9e7e2` | 14,3 → 13,7 |
| Testo tenue | `#a3acb9` | `#b9b6ae` | 7,0 → 8,3 |
| Bordo dei campi | `#3a414d` | `#737a84` (nuovo) | 1,4 → 3,6 |
| Cornici | `#3a414d` | `#454b54` | 1,6 → 1,9 |
| Azzurro (link, pulsante principale) | `#6cb0ff` | `#8dbbe8` | 7,1 → 8,4 |
| Azzurro sulla scheda scelta | — | — | 5,6 → 7,5 |
| Lilla (altezze) | `#c9a4ff` | `#c6b4e4` | 7,9 → 8,9 |
| Rosso (errori) | `#ff8f86` | `#f0a49c` | 6,7 → 7,3 sul suo fondo |
| Giallo (avvisi) | `#ffc266` | `#e6c47e` | 8,5 → 8,5 |
| Verde (conferme) | `#7fd99a` | `#9ad1aa` | 8,0 → 8,4 |

**Tema chiaro**

| Uso | Oggi | Dopo | Contrasto oggi → dopo |
|---|---|---|---|
| Fondo pagina | `#f4f5f7` | `#ecebe5` | — |
| Riquadri | `#ffffff` | `#faf9f5` | — |
| Campi | `#ffffff` | `#fdfdfb` | — |
| Testo | `#15181d` | `#1c1d1f` | 17,8 → 16,0 |
| Testo tenue | `#545c69` | `#44474c` | 6,7 → 8,9 |
| Bordo dei campi | `#c3c9d2` | `#80838a` (nuovo) | 1,7 → 3,6 |
| Cornici | `#c3c9d2` | `#bcbab1` | 1,7 → 1,8 |
| Blu (link, pulsante principale) | `#0b57a4` | `#0e4a87` | 7,2 → 8,5 |
| Viola (altezze) | `#6a3fa0` | `#583590` | 7,4 → 8,6 |
| Rosso (errori) | `#b3261e` | `#8f1a14` | 5,7 → 7,4 sul suo fondo |
| Marrone (avvisi) | `#8a5300` | `#6b4200` | 5,8 → 7,4 sul suo fondo |
| Verde (conferme) | `#1d6b35` | `#195a2c` | 5,8 → 7,2 sul suo fondo |

Nelle tabelle il contrasto è misurato sul fondo dei riquadri, dove sta quasi tutto il testo. Il bordo dei campi è misurato sul fondo del campo, e dove c'è scritto "sul suo fondo" il messaggio è misurato sul suo riquadro colorato. Con i colori nuovi, ogni testo resta sopra 7 anche sugli altri fondi (pagina, campi, scheda scelta).

## Cosa non cambia

- **I codici a barre e i QR restano neri su bianco puro**, anche con il tema scuro: i lettori ne hanno bisogno.
- **La stampa** resta nera su bianco, come oggi.
- La disposizione, le misure, i caratteri e i pulsanti restano uguali.

## Cosa cambia nel codice e nei documenti

- **`src/template.html`:**
  - i colori dei due temi;
  - il nuovo `--bordo-campo` per caselle, menu, pulsanti, scelte e area di prova;
  - il commento in cima allo stile con le regole qui sopra.
- **Versione:** sito **1.10.0** (`package.json`). Il firmware resta 1.4.0.

## Test

- **Test nuovo (`test/pagina.test.js` o un file a parte):**
  - legge i colori dei due temi da `src/template.html` e calcola il contrasto;
  - controlla che ogni coppia testo/fondo usata nella pagina sia almeno 7;
  - controlla che bordi dei campi siano almeno 3.
  - Così, se in futuro si cambia un colore, il test avvisa quando scende sotto la soglia.
- Tutti gli altri test, con `CC_CHIAVETTA`.
- **Prova a occhio dopo la pubblicazione:** i due temi sul PC e sul telefono, con lo schermo luminoso.
