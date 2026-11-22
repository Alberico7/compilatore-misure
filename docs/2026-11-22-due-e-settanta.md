# "Due e settanta" vuol dire 270

Data: 2026-11-22 (12:10)
Stato: **realizzato il 2026-11-22** (sito 1.11.0), confermato dall'utente il 2026-11-22 con due scelte: "dodici e cinquanta" resta com'è, e la regola vale anche nel modo Più valori.

L'utente chiede che, nella dettatura a voce, "due e settanta" voglia dire **270**. È il modo abbreviato di dire le centinaia: "due (cento) e settanta".

## Com'è oggi

`src/dettato.js` non conosce questo modo di dire. "Due e settanta" diventa tre pezzi:

1. scrive **2** nella casella e passa alla successiva;
2. dice "Non ho capito: «e»";
3. scrive **70** nella casella dopo.

Quindi si sbagliano due caselle.

## Cosa cambia

In tutti e due i modi di dettatura, **Un valore** e **Più valori**, se si dice **una cifra da uno a nove, poi "e", poi un numero da dieci a novantanove**, la cifra conta come centinaia.

| Detto | Oggi | Dopo |
|---|---|---|
| due e settanta | 2, poi 70 | **270** |
| tre e quarantacinque | 3, poi 45 | **345** |
| uno e dieci | 1, poi 10 | **110** |
| due e settanta virgola cinque | 2, poi 70,5 | **270,5** |
| meno due e settanta | -2, poi 70 | **-270** |

Restano come oggi:

- **"duecentosettanta"** e **"duecento settanta"** danno già 270.
- **"mille e due", "mille e cento"** danno già 1002 e 1100.
- **"due e cinque"** (dopo la "e" un numero sotto dieci) non cambia. Potrebbe voler dire 205 o 2,5, e il sito non tira a indovinare.
- **"dodici e cinquanta"** (prima della "e" un numero sopra nove) non cambia.
- **"riga due e settanta"** non cambia: il comando "riga" vuole il numero detto per intero.

### Nel modo Più valori

Anche qui "due e settanta" dà 270. Per dettare 2 e poi 70 basta separarli come oggi: una pausa o "avanti" fra i due.

## Cosa cambia nel codice e nei documenti

- **`src/dettato.js`:** in `interpreta`, "cifra + e + numero da 10 a 99" diventa un numero solo. Vale per tutti e due i modi, quindi `src/app.js` non cambia.
- **`src/template.html`:** nella guida *Dettatura*, a "Come dire i numeri" si aggiunge "due e settanta" → 270.
- **Versione:** sito **1.11.0** (`package.json`). Il firmware resta 1.4.0.

## Test

- **Test della dettatura:**
  - gli esempi della tabella qui sopra;
  - "due e cinque", "dodici e cinquanta" e "riga due e settanta" non cambiano;
  - "due avanti settanta" dà ancora 2 e 70.
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
- **Prova vera, dopo la pubblicazione:** dire "due e settanta" tenendo premuto 🎤. Nella casella deve comparire 270.
