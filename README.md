# Compilatore misure

Strumento d'officina: le coppie **Angolo / Altezza** da inserire nella maschera prima della tastatura diventano codici a barre (Code 128) o QR, che il lettore collegato alla macchina in modalità tastiera "digita" da solo. Sul PC della macchina non si installa niente.

**Sito:** https://alberico7.github.io/compilatore-misure/

## Cosa fa

- Tabella Angolo | Altezza: INVIO e frecce come in macchina, incolla da Excel, anteprima "In macchina: 20.00" sotto ogni casella.
- Valori scritti come in macchina (`2000`) o con il separatore (`20.00` / `20,00`); decimali di angolo e altezza impostabili.
- Controllo dei dati: caselle vuote, valori non numerici, troppi decimali; avviso per i negativi. I codici si generano solo con tutti i dati corretti.
- Uscita: un **Code 128 per valore** (lettore 1D), anche "uno alla volta" a tutto schermo per leggerli dal telefono, oppure **QR a blocchi** di N coppie separate da INVIO (lettore 2D).
- **Prova del lettore**: confronta quello che il lettore digita con i valori attesi (layout di tastiera, INVIO doppi, valori attaccati).
- **Dettatura** con Vosk, solo dal sito: "duecentoquattordici virgola nove quattro" → `214,94`. Un valore tenendo premuto 🎤, oppure più valori di seguito con un tocco. Il riconoscimento avviene nel dispositivo: l'audio non esce. La prima volta scarica il modello italiano (circa 50 MB).
- Tema scuro (predefinito) e chiaro, usabile da smartphone, salvataggio automatico nel browser.

**Sicurezza:** lo strumento compila solo i campi, non avvia cicli. Prima di avviare la tastatura controllare sempre i valori sullo schermo della macchina.

## Uso senza internet sul PC

Scaricare `compilatore-misure.html` e aprirlo con il browser: funziona tutto tranne la dettatura.

## Sviluppo

```
npm install
npm test           # compila e prova: codici decodificati con zxing, telefono, dettatura simulata
npm run test:vosk  # solo Windows: vero Vosk con la voce sintetica di Windows al posto del microfono
npm run build      # crea compilatore-misure.html e sito/
```

- Sorgenti in `src/`: `template.html`, `logica.js` (conversione, validazione, Code 128, QR, prova lettore), `dettato.js` (parole → valori), `voce.js` (Vosk), `app.js` (pagina).
- Documenti di progetto in `docs/`.
- A ogni push su `main`, GitHub Actions esegue i test e pubblica `sito/` su GitHub Pages.

## Licenza

© 2026 Andrea Carletti. **PolyForm Noncommercial 1.0.0**: si può usare, studiare, modificare e condividere gratis, ma **solo per scopi non commerciali** (niente vendita né uso in attività a scopo di lucro senza il permesso dell’autore). Vedi `LICENSE`.

Componenti di terze parti sotto le loro licenze: QR Code Generator for JavaScript (MIT), vosk-browser e modello Vosk italiano (Apache 2.0), fflate (MIT).
