// Cosa fa la chiavetta con un pacchetto ricevuto (Bluetooth o cavo).
// Puro: il salvataggio in flash arriva da fuori, cosi' si prova sul PC
// con lo stesso codice del firmware (test/simulatore.c).
#ifndef PROTOCOLLO_H
#define PROTOCOLLO_H

#include "dati.h"
#include "motore.h"

typedef struct {
    dati_t *dati;           // valori in uso (li legge il motore)
    dati_t *nuovi;          // appoggio per controllare i valori ricevuti
    motore_t *motore;
    bool caricamento;       // modo caricamento: il motore non scrive
    uint32_t crc;           // CRC del testo in uso (0 = nessuno)
    uint32_t codice;        // codice Bluetooth in uso
    // Salva il testo tenendo il codice; true se riuscito.
    bool (*salva_testo)(const uint8_t *testo, uint32_t lung, void *ctx);
    // Salva il codice tenendo il testo e cancella gli abbinamenti; true se riuscito.
    bool (*salva_codice)(uint32_t codice, void *ctx);
    void *ctx;
} sistema_t;

// Elabora un pacchetto. 'cavo' = arrivato con il cavo (solo da li' si cambia il codice).
// Scrive la risposta in 'out' e ne restituisce la lunghezza (0 = nessuna risposta).
size_t protocollo_elabora(sistema_t *s, ricevitore_t *r, bool cavo,
                          const uint8_t *p, size_t n, char *out, size_t max, uint32_t ora);

#endif
