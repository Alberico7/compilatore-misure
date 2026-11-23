# Pulsante Apri accanto al nome del programma

Data: 2026-11-23 (20:45)
Stato: **realizzato il 2026-11-23** (sito 1.19.0), confermato dall'utente il 2026-11-23, con i simboli a linea. Gli esempi usano FRESA, come ha chiesto l'utente.

Note di realizzazione:

- **Simboli:** SVG dentro i pulsanti, con `stroke: currentColor` (classe `.icona`). Sotto i 640 px di larghezza `.testo` si nasconde e restano solo i simboli.
- **Elenco:** ogni lista è un pulsante (`data-apri`) con nome e dettagli, più Elimina. Aperta una lista, il riquadro si chiude (`chiudiListe()`) e il messaggio «Aperta …» va sotto il nome.
- **Liste → Salva** non c'è più: Salva è solo accanto al nome. Nel riquadro restano Salva come…, Esporta e Importa.
- **Test:** lo stato del pulsante si legge dal suo nome per il lettore dello schermo (`aria-label`: "Salva" o "Salvata").

Con la versione 1.19.0 il nome del programma e **Salva** stanno sopra la tabella. Per aprire una lista salvata, però, bisogna ancora toccare **Liste**, più in alto accanto a Svuota tutto, e poi **Apri** sulla lista. L'utente chiede un pulsante Apri più facile da raggiungere.

## Cosa cambia

### Apri accanto a Salva

Sopra la tabella, nella riga del nome:

**Nome del programma** `[ FRESA-1234 ]` **Salva** **Apri** (con i simboli: vedi sotto)

**Apri** apre, subito sotto la riga del nome, l'elenco delle liste salvate:

- le liste in ordine, la più recente in alto, con il numero di coppie e la data;
- **un tocco sul nome della lista la apre**: la tabella prende i suoi valori, la casella prende il suo nome e l'elenco si chiude da solo. Se ci sono valori non salvati, prima chiede conferma, come oggi;
- con più di 8 liste, in cima c'è la casella **Cerca per nome**, come oggi;
- accanto a ogni lista resta **Elimina**, con la conferma;
- in fondo restano **Salva come…**, **Esporta** e **Importa**;
- toccando di nuovo **Apri** l'elenco si chiude.

### Via il pulsante Liste

Il pulsante **Liste** accanto a Svuota tutto sparisce: tutto quello che c'era dentro ora si apre da **Apri**. Accanto a Svuota tutto resta solo 🎤 Detta, dove c'è.

### Simboli sui pulsanti

Richiesta dell'utente: sui pulsanti si possono usare anche i simboli.

I simboli sono **disegni a linea** dello stesso colore della scritta del pulsante, come ◀ ▶ ± ✓ già presenti nella pagina. Non sono emoji colorate, che sul tema scuro stonano e cambiano aspetto da un telefono all'altro. Così seguono il tema scuro e chiaro, e anche il pulsante evidenziato e quello spento.

| Pulsante | Simbolo | Sul PC | Sul telefono |
|---|---|---|---|
| Salva | dischetto, a linea | simbolo + "Salva" | solo il simbolo |
| Salvata (spento) | ✓ | "✓ Salvata" | ✓ |
| Apri | cartella aperta, a linea | simbolo + "Apri" | solo il simbolo |

Sul telefono resta solo il simbolo, così i pulsanti sono stretti e la casella del nome ha più spazio. Il nome del pulsante c'è comunque per chi usa il lettore dello schermo, e compare tenendo il mouse sopra il pulsante.

La riga resta una sola, e la tabella non scende più in basso di oggi.

## Esempio

1. Tocchi **Apri**: sotto il nome compare l'elenco.
2. Tocchi **FRESA-1234**: la tabella ha i suoi valori, il nome è nella casella, l'elenco si chiude, il codice del nome è pronto nella sezione 2.

## Cosa cambia nel codice

- **`src/template.html`:** il pulsante Apri nella riga del nome; il riquadro delle liste spostato sotto quella riga; via il pulsante Liste; nella guida, le righe sulle liste.
- **`src/app.js`:** Apri apre e chiude il riquadro; il tocco sul nome della lista la apre e chiude il riquadro.
- **Versione:** resta sito **1.19.0**, insieme alla casella del nome, perché la 1.19.0 non è ancora pubblicata. Il firmware resta 1.4.0.

## Test

- **Pagina:**
  - Apri mostra l'elenco sotto il nome; toccando di nuovo Apri si chiude;
  - un tocco sul nome della lista la apre, mette il nome nella casella e chiude l'elenco;
  - con valori non salvati chiede conferma;
  - Salva come, Esporta, Importa ed Elimina funzionano come prima (i test delle liste, aggiornati da Liste ad Apri);
  - sul PC i pulsanti hanno simbolo e parola, sul telefono solo il simbolo, con il nome per il lettore dello schermo;
  - sul telefono la riga del nome sta su una riga, senza scorrimento orizzontale, e Grado 1 resta visibile senza scorrere.
- **Tutti gli altri test**, con `CC_CHIAVETTA`.
