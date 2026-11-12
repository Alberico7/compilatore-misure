# Tema scuro per il compilatore misure

Data: 2026-11-12

## Cosa si fa

- Aggiunta di un **tema scuro**, che diventa il **predefinito**.
- Un pulsante in alto a destra nella testata, "☀ Tema chiaro" / "☾ Tema scuro", per passare da uno all'altro.
- La scelta si salva nel browser insieme alle altre impostazioni. Chi ha già usato lo strumento parte comunque dal tema scuro, finché non cambia tema.

## Come

- I colori sono già definiti come variabili CSS (`--sfondo`, `--carta`, `--testo`, …). Si aggiunge un secondo gruppo di valori scuri attivato da `data-tema="scuro"` sull'elemento `<html>`.
- Il tema si applica prima che la pagina venga disegnata (piccolo script nell'`<head>`), così all'apertura non si vede un lampo bianco.
- I colori che oggi sono scritti a mano nel CSS (bordi arancioni, sfondi dei riquadri, righe della tabella) diventano variabili, così cambiano anche loro col tema.
- Contrasto alto anche nel tema scuro: testo chiaro su grigio scuro, errori e avvisi in rosso e arancione chiari, leggibili da lontano in officina.

## Cosa NON cambia col tema

- **Codici a barre e QR restano neri su riquadro bianco** anche nel tema scuro. Molti lettori non leggono i codici invertiti (chiari su scuro), quindi i codici e la loro zona di rispetto stanno sempre su un riquadro bianco.
- La **stampa** è sempre in tema chiaro (nero su bianco).

## Test

- Il tema predefinito al primo avvio è scuro.
- Il pulsante cambia tema e la scelta resta dopo il ricaricamento.
- Nel tema scuro, i Code 128 e i QR generati si decodificano ancora con zxing e il contenuto è esatto.
- Screenshot della pagina in entrambi i temi, per controllare la leggibilità.
