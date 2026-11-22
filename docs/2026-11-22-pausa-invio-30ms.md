# Pausa dopo INVIO predefinita: 30 ms

Data: 2026-11-22 (13:31)
Stato: **realizzato il 2026-11-22** (sito 1.13.0), confermato dall'utente il 2026-11-22.

Note di realizzazione:

- **`chiavetta/LEGGIMI.md`** non nominava i 200 ms: non è cambiato. In `docs/2026-11-12-chiavetta-pico.md` è cambiata la riga dei valori predefiniti; le decisioni del 2026-11-12 restano come erano, perché sono la storia del progetto.
- **Il test del passaggio** è in `test/semplicita.test.js`.

L'utente chiede che le pause della chiavetta partano da **30 ms tra i tasti e 30 ms dopo INVIO**.

## Com'è oggi

- Le pause si scelgono nella scheda **Chiavetta**, in **Pausa tra i tasti** e **Pausa dopo INVIO**. Il sito le manda alla chiavetta con **Invia**, insieme ai valori.
- I valori predefiniti sono **30 ms** tra i tasti e **200 ms** dopo INVIO. I 200 ms servono a dare tempo alla maschera di passare al campo dopo.
- Il sito ricorda le pause scelte. Chi ha già usato il sito ha salvato anche 200 ms.

## Cosa cambia

1. **Pausa dopo INVIO predefinita: 30 ms.** La pausa tra i tasti resta 30 ms.
2. **Chi ha già usato il sito**, se ha ancora 200 ms, passa a 30 ms una volta sola, all'apertura. Senza questo passaggio, sul tuo telefono e sul tuo PC resterebbero i 200 ms già salvati. Se dopo rimetti 200 ms (o un altro valore) a mano, il sito lo ricorda come oggi.
3. **Il firmware non cambia.** Il sito manda sempre le pause con Invia, quindi non serve ricaricare il firmware. Il valore predefinito del firmware, 200 ms, vale solo se mancano le pause nei dati ricevuti. Con il sito questo non succede.

## Cosa bisogna sapere

Con 30 ms dopo INVIO, la chiavetta va molto più veloce di una persona:

| Chi scrive | Tempo fra un tasto e l'altro, circa |
|---|---|
| Persona veloce al tastierino numerico | 250–300 ms |
| Dattilografo molto veloce, 100 parole al minuto | 120 ms |
| Chiavetta, oggi | 30 ms tra i tasti, 200 ms dopo INVIO |
| Chiavetta, dopo | 30 ms tra i tasti, 30 ms dopo INVIO |

Se la maschera non fa in tempo a passare al campo dopo, può saltare un campo o attaccare due valori. La guida lo dice già: «Salta un campo o due valori finiscono attaccati: aumenta "Pausa dopo INVIO"».

Per questo, alla prima prova vera, conviene controllare tutti i valori sullo schermo della macchina, come sempre.

## Cosa cambia nel codice e nei documenti

- **`src/app.js`:**
  - `chRitInv` predefinito 30;
  - una volta sola, chi ha 200 passa a 30, con un segno nel salvataggio come per `schedaChiavetta`.
- **`src/app-chiavetta.js`:** il valore predefinito della casella *Pausa dopo INVIO* è 30.
- **`chiavetta/LEGGIMI.md`** e **`docs/2026-11-12-chiavetta-pico.md`:** dove dicono «200 ms», scrivere i valori nuovi.
- **Versione:** sito **1.13.0** (`package.json`). Il firmware resta 1.4.0.

## Test

- **Pagina:**
  - prima apertura: pause 30 / 30;
  - chi aveva 200 salvato passa a 30; chi aveva un altro valore, per esempio 400, lo tiene;
  - se dopo il passaggio si rimette 200 a mano, riaprendo resta 200.
- Aggiornare i test che si aspettano «pause 30 / 200 ms».
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
- **Prova vera:** caricare una lista lunga con 30 / 30 e controllare in macchina che non manchi nessun campo.
