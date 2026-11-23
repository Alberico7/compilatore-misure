// Parte pura della chiavetta: lettura e controllo dei dati, CRC-32,
// tasti da mandare e protocollo di caricamento. Non usa l'hardware:
// si compila e si prova anche sul PC (vedi test/test_dati.c).
#ifndef DATI_H
#define DATI_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define DATI_MAX_TESTO   12000u  // byte del testo: 1000 valori da 9 cifre col segno ci stanno
#define DATI_MAX_VALORI  1000u   // valori (grado + dato = 2 valori)
#define DATI_MAX_CIFRE   9u      // cifre per valore, segno escluso
#define DATI_MAX_TASTI   (DATI_MAX_CIFRE + 2u) // segno + cifre + INVIO

// Codici dei tasti USB HID (tabella "Keyboard/Keypad", pagina 0x07).
#define TASTO_1          0x1Eu   // fila in alto: 1..9 = 0x1E..0x26
#define TASTO_0          0x27u
#define TASTO_INVIO      0x28u
#define TASTO_MENO_TN    0x56u   // "-" del tastierino numerico

typedef enum {
    DATI_OK = 0,
    ERR_RIGA,          // riga che non e' ne' commento, ne' impostazione, ne' valore valido
    ERR_IMPOSTAZIONE,  // nome sconosciuto o numero fuori dai limiti
    ERR_VUOTO,         // nessun valore
    ERR_DISPARI,       // numero di valori dispari (le coppie non tornano)
    ERR_TROPPI,        // piu' di DATI_MAX_VALORI valori
    ERR_LUNGHEZZA,     // testo troppo lungo o lunghezza diversa da quella annunciata
    ERR_CRC,           // codice di controllo diverso
    ERR_SEQUENZA,      // pacchetto fuori ordine (dati senza inizio, ecc.)
    ERR_OCCUPATO,      // la chiavetta sta scrivendo
    ERR_CODICE,        // codice Bluetooth non valido o non ammesso da qui
    ERR_PACCHETTO,     // pacchetto sconosciuto o malformato
    ERR_MEMORIA,       // salvataggio in flash non riuscito
} dati_errore_t;

typedef struct {
    uint16_t ritardo_carattere_ms;
    uint16_t ritardo_invio_ms;
    uint16_t coppie_per_pressione;   // 0 = tutte
    uint16_t n;                      // numero di valori
    char valori[DATI_MAX_VALORI][DATI_MAX_CIFRE + 2]; // "-" + cifre + '\0'
} dati_t;

const char *dati_nome_errore(dati_errore_t e);

uint32_t dati_crc32(const uint8_t *p, size_t n);

// Legge il testo. In caso di errore *riga indica la riga (da 1), 0 se non c'entra.
// Con un errore 'out' non va usato.
dati_errore_t dati_analizza(const char *testo, size_t len, dati_t *out, uint32_t *riga);

// Tasti per un valore, INVIO compreso. Restituisce quanti (0 se il valore non e' valido).
size_t dati_tasti(const char *valore, uint8_t *tasti, size_t max);

// Indice (escluso) dove fermarsi partendo da 'pos', con i blocchi di
// coppie_per_pressione allineati dall'inizio (come le pagine della maschera).
uint16_t dati_fine_blocco(const dati_t *d, uint16_t pos);

// ---------------------------------------------------------------------------
// Protocollo di caricamento (uguale per Bluetooth e cavo)
//   'I' len(u32 LE) crc(u32 LE)   inizio
//   'D' byte...                   dati, in ordine
//   'F'                           fine: controlla lunghezza e CRC
//   'S'                           stato
//   'P' codice(u32 LE)            codice Bluetooth (solo con il cavo);
//                                 0xFFFFFFFF = Bluetooth spento
// Risposte di testo: "OK n crc", "STATO ...", "ERRORE nome riga".
typedef enum {
    RIC_NIENTE = 0,     // pacchetto accettato, nessuna risposta
    RIC_COMPLETO,       // testo completo in buf[0..ricevuti), lunghezza e CRC giusti
    RIC_STATO,          // chiesto lo stato
    RIC_CODICE,         // nuovo codice in 'codice'
    RIC_ERRORE,         // errore in 'errore'
} ric_esito_t;

typedef struct {
    uint8_t buf[DATI_MAX_TESTO];
    uint32_t atteso, crc, ricevuti;
    bool attivo;
    uint32_t codice;
    dati_errore_t errore;
} ricevitore_t;

void ric_azzera(ricevitore_t *r);
ric_esito_t ric_pacchetto(ricevitore_t *r, const uint8_t *p, size_t n);

#define CODICE_NESSUNO 0xFFFFFFFFu
bool dati_codice_valido(uint32_t codice);   // 6 cifre: 0..999999

// Pacchetti con il cavo: [lunghezza u16 LE][pacchetto]
#define TELAIO_MAX (DATI_MAX_TESTO + 16u)
typedef struct {
    uint8_t buf[TELAIO_MAX];
    uint32_t presenti;
} telaio_t;

void telaio_azzera(telaio_t *t);
// Aggiunge byte arrivati dal cavo. Per ogni pacchetto completo chiama cb.
// Restituisce false se un pacchetto annuncia una lunghezza impossibile (stream da azzerare).
bool telaio_aggiungi(telaio_t *t, const uint8_t *p, size_t n,
                     void (*cb)(const uint8_t *pacchetto, size_t n, void *ctx), void *ctx);

// Nome della chiavetta: "Chiavetta misure 3F2A", con le ultime 4 cifre dell'ID del chip,
// cosi' due chiavette si distinguono (docs/2026-11-21-nome-per-ogni-chiavetta.md).
#define DATI_NOME_BASE "Chiavetta misure"
#define DATI_NOME_MAX  29u   // ci sta nella risposta alla scansione Bluetooth (31 byte - 2)
// id: l'ID del chip in esadecimale (pico_get_unique_board_id_string). Senza almeno 4 cifre
// esadecimali il nome resta DATI_NOME_BASE. Restituisce la lunghezza (senza '\0').
size_t dati_nome(char *out, size_t max, const char *id);

// Risposte (terminate da '\0'; con il cavo il chiamante aggiunge '\n')
size_t risposta_ok(char *out, size_t max, uint16_t n, uint32_t crc);
size_t risposta_errore(char *out, size_t max, dati_errore_t e, uint32_t riga);
size_t risposta_stato(char *out, size_t max, uint16_t n, uint16_t pos, uint32_t crc,
                      bool bluetooth, const char *stato, const char *versione);

#endif
