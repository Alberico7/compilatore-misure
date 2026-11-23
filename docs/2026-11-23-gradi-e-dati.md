# Gradi e Dati, con 0 e 1 decimali

Data: 2026-11-23 (17:13)
Stato: **realizzato il 2026-11-23** (sito 1.16.0), confermato dall'utente il 2026-11-23, con la richiesta di cambiare i nomi anche nel codice.

Note di realizzazione:

- **Nomi vecchi:** la funzione `nomiNuovi()` in `src/app.js` passa `decAng` / `decAlt` a `decGra` / `decDat`. Si usa per le impostazioni salvate, per le liste salvate nel browser e per i file importati.
- **Test:** i test di prima erano scritti con 2 decimali, che erano i predefiniti. Ora le funzioni che aprono la pagina nei test mettono 2 e 2 (opzione `decimali`), così i test controllano le stesse cose di prima. I test nuovi provano i predefiniti 0 e 1, il passaggio da 2 / 2 e le liste con i nomi vecchi (`test/semplicita.test.js`, `test/liste-avvisi.test.js`).

L'utente ha controllato in macchina:

- **gli angoli hanno 0 decimali**, e in officina si chiamano **gradi**;
- **le altezze hanno 1 decimale**, e in officina si chiamano **dati**.

## Cosa cambia

### 1. Decimali predefiniti: 0 per i gradi, 1 per i dati

Oggi il sito parte con 2 e 2. D'ora in poi parte con **0** per i gradi e **1** per i dati.

Chi ha già usato il sito ha 2 e 2 salvati nel browser. Al primo avvio della nuova versione succede questo:

- **Tabella vuota:** i decimali passano da soli a 0 e 1.
- **Tabella con dei valori:** i decimali restano 2 e 2. Cambiarli da soli cambierebbe quello che la chiavetta scrive in macchina senza che tu lo veda. Li cambi tu nel riquadro **Cambia**, e i valori si accorciano come già fa la versione 1.12.0.

Il passaggio si fa una volta sola. Se poi rimetti 2 e 2 a mano, restano 2 e 2.

Le liste salvate tengono i decimali con cui sono state salvate, come oggi.

### 2. I nomi: Grado e Dato

In tutto quello che si vede nel sito, "Angolo" diventa **Grado** e "Altezza" diventa **Dato**:

- intestazioni della tabella: **N° · Grado · Dato**, anche nella verifica e nella tabella dei codici QR;
- nomi delle caselle: "Grado 5", "Dato 5", anche in basso sul telefono e nei messaggi;
- riquadro Cambia: **Decimali gradi** e **Decimali dati**; il riepilogo resta "decimali 0 / 1";
- avvisi:
  - "Grado 5: 400 è oltre 360";
  - "Dato 3: 25 è molto diverso dai vicini" (prima "molto diversa dalle vicine": "dato" è maschile);
  - "Inserisci almeno una coppia Grado/Dato";
- guida, sottotitolo, pagina della chiavetta: "cursore su **Grado 1**";
- il commento in testa al file dei valori della chiavetta: "decimali gradi 0, dati 1";
- `README.md` e `chiavetta/LEGGIMI.md`.

### 3. Anche nel codice

Richiesta dell'utente: i nomi nuovi valgono anche dentro il codice, non solo in quello che si vede. Esempi:

- `decAng` / `decAlt` diventano `decGra` / `decDat`;
- gli avvisi `angolo360` / `altezza` diventano `grado360` / `dato`;
- le classi e i colori della pagina: `tipo-ang` / `tipo-alt` diventano `tipo-gra` / `tipo-dat`, e `--altezza` diventa `--dato`;
- le caselle dei decimali: `dec-ang` / `dec-alt` diventano `dec-gra` / `dec-dat`;
- i commenti nel codice, nei test e nel firmware (`chiavetta/src/dati.h`).

**Niente va perso.** Le impostazioni e le liste salvate nel browser, e i file di liste esportati prima, hanno ancora i nomi vecchi:

- all'avvio il sito legge le impostazioni e le liste con i nomi vecchi e le riscrive con quelli nuovi;
- l'importazione di un file accetta sia i nomi vecchi sia quelli nuovi;
- i file esportati da ora in poi hanno i nomi nuovi.

**Non cambiano:**

- il firmware: cambia solo un commento, il programma della chiavetta resta lo stesso (1.4.0);
- la dettatura: non ha comandi con "angolo" o "altezza";
- nel case 3D (`case/`) "angolo" vuol dire lo spigolo della scatola e "altezza" la misura: restano.

## Cosa cambia nel codice

- **`src/app.js`:**
  - in `statoIniziale`, `decGra: 0` e `decDat: 1`, più il segno `decimali01: true`;
  - la lettura delle impostazioni, delle liste e dei file importati con i nomi vecchi;
  - in `carica()`, se il segno manca, i decimali salvati sono 2 e 2 e la tabella è vuota, i decimali diventano 0 e 1;
  - nomi delle caselle, messaggi e intestazioni.
- **`src/logica.js`:** testi e tipi degli avvisi.
- **`src/template.html`, `src/app-chiavetta.js`, `src/chiavetta.js`:** testi e nomi.
- **Test** e **documenti** (`README.md`, `chiavetta/LEGGIMI.md`): nomi nuovi. I documenti vecchi in `docs/` restano come sono stati scritti.
- **Versione:** sito **1.16.0**.

## Test

- **Logica:** testi nuovi degli avvisi.
- **Pagina:**
  - una pagina nuova parte con 0 e 1;
  - con 2 e 2 salvati e la tabella vuota si passa a 0 e 1; con dei valori nella tabella restano 2 e 2;
  - intestazioni e nomi delle caselle nuovi;
  - impostazioni e liste salvate con i nomi vecchi: si leggono, e i decimali restano quelli salvati;
  - importazione di un file di liste con i nomi vecchi.
- **Tutti gli altri test**, aggiornati ai nomi nuovi, con `CC_CHIAVETTA`.
