# Senza il nome del costruttore né il modello della macchina

Data: 2026-11-14

## Richiesta

Nessun file e nessun commit pubblicato deve contenere il nome del costruttore della macchina né il suo modello.

## Decisioni dell'utente

1. Il nome nuovo è **"Compilatore misure"**, con repository `Alberico7/compilatore-misure` e sito `https://alberico7.github.io/compilatore-misure/`.
2. Va tolto anche il modello della macchina: si parla solo di "maschera della macchina".
3. Il repository lo rinomina Claude, con le credenziali di git di questo PC.

## Cosa è cambiato

| Dove | Ora |
|---|---|
| Nome del programma: pagina, README, LICENSE, documenti | "Compilatore misure" |
| File | `compilatore-misure.html`, `docs/2026-11-12-compilatore-misure.md` |
| Firmware 1.1.1 | nome Bluetooth "Chiavetta misure"; nomi USB "Compilatore misure" (produttore) e "Chiavetta misure - caricamento" |
| Nomi interni | salvataggio `compilatore-misure-v1`, cache della voce `compilatore-misure-voce`, processore audio `cattura-voce`, package `compilatore-misure` |

- **Storia:** tutti i commit sono stati riscritti con le stesse sostituzioni, compreso il messaggio del primo commit. Poi push forzato. Il backup della storia precedente è un bundle nello scratchpad della sessione.
- Lo script delle sostituzioni ha lavorato sia sui file attuali sia su ogni commit; alla fine nessun commit contiene più le due parole.

## Effetti

- Il link vecchio non funziona più: GitHub Pages non fa il reindirizzamento.
- La pagina riparte una volta senza valori salvati, perché la chiave di salvataggio è nuova.
- Il modello della dettatura si riscarica una volta.
- Con il firmware 1.1.1 il nome Bluetooth sul telefono cambia; se resta quello vecchio, basta rifare l'abbinamento.
