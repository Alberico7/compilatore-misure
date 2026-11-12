// Salvataggio nella flash: ultimo testo valido e codice Bluetooth.
#ifndef MEMORIA_H
#define MEMORIA_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
    uint32_t codice;          // CODICE_NESSUNO = Bluetooth spento
    const char *testo;        // punta nella flash (sola lettura); NULL se non c'e'
    uint32_t lung;
    uint32_t crc;
} memoria_t;

// Legge cio' che c'e'. Se la flash e' vuota o rovinata: niente testo, niente codice.
void memoria_leggi(memoria_t *m);
// Salva testo e codice. Il testo puo' puntare nella flash stessa (viene copiato prima).
bool memoria_salva(const char *testo, uint32_t lung, uint32_t codice);
// Cancella gli abbinamenti Bluetooth salvati da BTstack.
bool memoria_cancella_abbinamenti(void);

#endif
