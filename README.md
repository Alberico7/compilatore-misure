# Compilatore misure

Strumento d'officina: le coppie **Grado / Dato** da inserire nella maschera prima della tastatura diventano codici a barre (Code 128) o QR, che il lettore collegato alla macchina in modalità tastiera "digita" da solo. Sul PC della macchina non si installa niente.

**Sito:** https://alberico7.github.io/compilatore-misure/

## Cosa fa

- Tabella Grado | Dato: INVIO e frecce come in macchina, incolla da Excel, anteprima "In macchina: 20.00" sotto ogni casella.
- Valori scritti come in macchina (`2000`) o con il separatore (`20.00` / `20,00`); decimali di gradi e dati impostabili.
- Controllo dei dati: caselle vuote, valori non numerici, troppi decimali. I codici si generano solo con tutti i dati corretti.
- **Valori da controllare**, segnalati ma senza bloccare: negativi, gradi oltre 360, dati almeno 5 volte diversi da tutti e due i vicini (la virgola sbagliata), coppie con grado e dato uguali alla precedente.
- **Liste salvate** con un nome (per esempio il codice del pezzo), da riaprire quando serve; **Esporta / Importa** in un file per passarle da un dispositivo all'altro.
- **Confronta con la macchina**: la lista a caratteri grandi, da spuntare riga per riga mentre si controllano i valori sullo schermo della macchina.
- Uscita: un **Code 128 per valore** (lettore 1D), anche "uno alla volta" a tutto schermo per leggerli dal telefono, oppure **QR a blocchi** di N coppie separate da INVIO (lettore 2D).
- **Prova del lettore**: confronta quello che il lettore digita con i valori attesi (layout di tastiera, INVIO doppi, valori attaccati).
- **Dettatura** con Vosk, solo dal sito: "duecentoquattordici virgola nove quattro" → `214,94`. Un valore tenendo premuto 🎤, oppure più valori di seguito con un tocco. Il riconoscimento avviene nel dispositivo: l'audio non esce. La prima volta scarica il modello italiano (circa 50 MB); dopo, si prepara da sola all'apertura della pagina, così il 🎤 parte subito.
- **Chiavetta-tastiera** (Raspberry Pi Pico 2 W) per quando lettore e codici non bastano. Si carica dal sito via Bluetooth o con il cavo; in macchina è una tastiera USB e scrive i valori quando premi il suo pulsante. Vedi [chiavetta/LEGGIMI.md](chiavetta/LEGGIMI.md).
- Tema scuro (predefinito) e chiaro, usabile da smartphone, salvataggio automatico nel browser.

**Sicurezza:** lo strumento compila solo i campi, non avvia cicli. Prima di avviare la tastatura controllare sempre i valori sullo schermo della macchina.

## Uso senza internet

- **Dal sito:** aperto una volta con la rete, il sito resta salvato nel browser (service worker) e poi si apre anche senza. La dettatura funziona senza rete se il modello è già stato scaricato.
- **Sul PC:** si può anche scaricare `compilatore-misure.html` e aprirlo con il browser: funziona tutto tranne la dettatura.

## Sviluppo

```
npm install
npm test           # compila e prova: codici decodificati con zxing, telefono, dettatura simulata,
                   # chiavetta (parte pura in C e sito collegato al Pico simulato: serve gcc,
                   # oppure CC_CHIAVETTA="python -m ziglang cc"; senza compilatore quei test si saltano)
npm run test:vosk  # solo Windows: vero Vosk con la voce sintetica di Windows al posto del microfono
npm run build      # crea compilatore-misure.html e sito/
npm run firmware   # solo Windows: compila chiavetta/build/chiavetta.uf2 (strumenti dell'estensione Pico per VS Code)
```

- Sorgenti in `src/`: `template.html`, `logica.js` (conversione, validazione, Code 128, QR, prova lettore), `dettato.js` (parole → valori), `voce.js` (Vosk), `chiavetta.js` (protocollo, Web Bluetooth, WebUSB), `app-chiavetta.js` (scheda Chiavetta), `tabelle-md.js` (tabelle del LEGGIMI nella guida), `app.js` (pagina, liste salvate, confronto), `sw.js` (service worker per l'uso senza rete: `build.js` ci scrive l'elenco dei file e la loro impronta).
- Firmware della chiavetta in `chiavetta/` (C, pico-sdk 2.3.1).
- Documenti di progetto in `docs/`.
- A ogni push su `main`, GitHub Actions compila il firmware, esegue i test e pubblica `sito/` (con `chiavetta.uf2`) su GitHub Pages.

## Licenza

© 2026 Andrea Carletti. **PolyForm Noncommercial 1.0.0**: si può usare, studiare, modificare e condividere gratis, ma **solo per scopi non commerciali** (niente vendita né uso in attività a scopo di lucro senza il permesso dell’autore). Vedi `LICENSE`.

Componenti di terze parti sotto le loro licenze: QR Code Generator for JavaScript (MIT), vosk-browser e modello Vosk italiano (Apache 2.0), fflate (MIT); nel firmware della chiavetta pico-sdk, TinyUSB, BTstack e cyw43-driver (vedi `chiavetta/LICENZE-TERZE-PARTI.txt`).
