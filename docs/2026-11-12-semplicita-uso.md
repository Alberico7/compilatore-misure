# Semplicità d'uso: tabella subito visibile, meno righe vuote, chiavetta più diretta

Data: 2026-11-12 (22:07)
Stato: **realizzato** (2026-11-12)

Questo documento nasce dal giro d'uso del 2026-11-12, fatto su telefono a 390 px e su PC. Il problema principale: sul telefono, aprendo la pagina, la tabella non si vede, e con 2 coppie scritte la pagina è lunga 5500 px.

## 1. Impostazioni raccolte in una riga

- **Cosa si raccoglie:** "Come scrivi i valori", "Decimali angolo/altezza", "Righe", "+ Aggiungi riga" ed "− Elimina ultima riga" finiscono in un riquadro apribile, sopra la tabella.
- **Il riepilogo, sempre visibile:** **"Con separatore · decimali 2 / 2 · 20 righe"** con a destra **"Cambia"**.
- **Quando è aperto:**
  - al **primo uso**, quando nel browser non c'è niente di salvato, perché le impostazioni vanno scelte;
  - poi resta come l'ha lasciato l'utente, e la scelta viene ricordata.
- **Dettatura:** resta visibile solo il pulsante **🎤 Tieni premuto e parla** (o "Tocca e parla"). Le due scelte, "Un valore / Più valori" e "Fine di ogni valore", passano nel riquadro delle impostazioni, sotto il titolo "Dettatura". Il riquadro della dettatura sparisce; lo stato ("Capito: …") compare sotto il pulsante solo quando serve.
- **"Svuota tutto"** resta visibile accanto al 🎤: si usa a ogni lavoro.

## 2. Meno righe vuote

- **Righe iniziali:** la tabella nuova parte con **5 righe** invece di 20. I dati già salvati non cambiano.
- **Righe aggiunte da sole:** **INVIO** sul PC o **Avanti** sul telefono, nell'**Altezza dell'ultima riga**, aggiunge una riga e porta il cursore su "Angolo" della nuova riga, come la maschera della macchina. Il massimo resta 500.
- **Dettatura:** anche la dettatura aggiunge righe. Oggi, all'ultima casella, si ferma con "Ultima riga della tabella: dettatura finita". D'ora in poi continua; si ferma con "stop", dopo 30 secondi di silenzio o arrivati a 500 righe.
- **Righe vuote in fondo:** come adesso, non vengono usate.

## 3. Indice in alto su una riga

- **Etichette:** sul telefono **"1 Valori · 2 Macchina · 3 Prova · 4 Guida"**; sul PC restano quelle lunghe.
- **Larghezze strette:** se lo schermo è più stretto di così (per esempio 320 px), l'indice resta su **una riga** e scorre di lato, senza andare a capo.
- **Salto alle sezioni:** cliccando l'indice, il titolo della sezione non deve finire sotto l'indice fisso (margine di scorrimento).

## 4. Scheda Chiavetta: prima l'azione

Nuovo ordine:
1. **Una riga di introduzione:** "La chiavetta scrive i valori in macchina come una tastiera, quando premi il suo pulsante."
2. **Collegamento:** Bluetooth / Cavo.
3. **Pulsanti:** "Invia i valori" e "Controlla la chiavetta".
4. **Esito.**
5. **"Impostazioni di scrittura"**, in un riquadro chiuso: pause e coppie per pressione. Il riepilogo mostra i valori attuali, per esempio "Pause 30 / 200 ms · tutte le coppie", così si vede subito se sono state cambiate.
6. **"Codice Bluetooth e firmware"**, in un riquadro chiuso, come adesso.

## 5. Schede della sezione 2 su una riga

- **Etichette:** "Codici a barre", "QR", "Chiavetta".
- **1D e 2D:** l'indicazione passa nella riga del punto 6.
- **Verifica:** a 360 px le schede devono stare su una riga.

## 6. Quale metodo usare

Sotto il titolo della sezione 2, una riga:
**"Lettore 1D → Codici a barre · Lettore 2D → QR · Senza lettore → Chiavetta"**, con i tre nomi cliccabili, che aprono la scheda corrispondente.

## 7. Dettagli

- **Pulsante del tema:** diventa solo un'icona (☀ / ☾), **anche sul PC** (richiesta dell'utente), con l'etichetta per gli screen reader e il suggerimento al passaggio del mouse.
- **Avviso di sicurezza:** sul telefono testo più piccolo e meno margine, **stesso contenuto**: non si accorcia il testo della sicurezza.

## Test

- **Telefono 390×844, pagina nuova:** la casella **Angolo 1** è visibile senza scorrere.
- **Pagina più corta:** con 2 coppie scritte, la pagina del telefono è molto più corta di adesso (misurata nel test).
- **Riquadro delle impostazioni:**
  - aperto al primo uso, chiuso dopo se l'utente lo chiude, e ricordato;
  - il riepilogo cambia insieme alle impostazioni.
- **Righe aggiunte:**
  - INVIO e Avanti sull'ultima Altezza aggiungono una riga e spostano il cursore;
  - non si supera 500;
  - la dettatura continua oltre l'ultima riga (test della dettatura aggiornato).
- **Indice e schede su una riga** a 320, 360 e 390 px, e nessuno scorrimento orizzontale della pagina.
- **Chiavetta:** pulsanti prima delle impostazioni di scrittura; il riepilogo delle impostazioni cambia con i valori.
- **Riga dei metodi:** ogni nome apre la sua scheda.
- **Test esistenti:** passano, aggiornati solo dove cambiano le righe iniziali (20 → 5) o l'ordine della scheda Chiavetta.
- **Schermate prima e dopo** su telefono e PC, da confrontare.

## Note di realizzazione (2026-11-12)

- **Pagina sul telefono con 2 coppie:** da 5513 a circa 4250 px.
- **Angolo 1 visibile senza scorrere** per chi torna: anche a 360×740, oltre che a 390×844. Al **primo uso** le impostazioni sono aperte (come deciso) e la tabella è appena sotto.
- **In più rispetto al documento:**
  - sotto i 640 px il **sottotitolo** è nascosto: tre righe di descrizione che spingevano la tabella fuori dallo schermo;
  - "Svuota tutto" non si allarga più a tutta la riga;
  - "Leggi uno alla volta" ridisegna il codice **solo se cambia**: prima un aggiornamento della tabella lo ridisegnava identico mentre il lettore lo inquadrava, e lo faceva sfarfallare. L'ha scoperto un test.
- **Chi aveva già dati salvati:** tiene le sue righe (anche 20) e trova le impostazioni chiuse.
- **"INVIO / Avanti aggiungono una riga":** c'era già; è cambiata solo la dettatura, che prima si fermava all'ultima riga.
- **Test:** 59 in tutto. Il nuovo `test/semplicita.test.js` ne ha 6: primo uso, chi torna, righe, indice e schede su una riga (320–1200 px), riga dei metodi e icona del tema, ordine della scheda Chiavetta. Aggiornati i test del tema, delle 5 righe, della dettatura continua e della scheda Chiavetta.
