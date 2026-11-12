#include "memoria.h"

#include <string.h>

#include "dati.h"
#include "hardware/flash.h"
#include "pico/btstack_flash_bank.h"
#include "pico/flash.h"

// Tre settori subito prima di quelli che BTstack usa per gli abbinamenti.
#define SETTORI          3u
#define MEMORIA_LUNG     (SETTORI * FLASH_SECTOR_SIZE)
#define MEMORIA_OFFSET   (PICO_FLASH_BANK_STORAGE_OFFSET - MEMORIA_LUNG)
#define MAGIA            0x31484356u   // "VCH1"

typedef struct {
    uint32_t magia;
    uint32_t codice;
    uint32_t lung;
    uint32_t crc;            // del testo
    uint32_t crc_testata;    // dei quattro campi sopra
} testata_t;

_Static_assert(sizeof(testata_t) + DATI_MAX_TESTO <= MEMORIA_LUNG, "spazio in flash insufficiente");

static uint8_t copia[MEMORIA_LUNG];   // immagine da scrivere

static const uint8_t *in_flash(void) { return (const uint8_t *)(XIP_BASE + MEMORIA_OFFSET); }

void memoria_leggi(memoria_t *m) {
    m->codice = CODICE_NESSUNO;
    m->testo = NULL;
    m->lung = 0;
    m->crc = 0;
    testata_t t;
    memcpy(&t, in_flash(), sizeof(t));
    if (t.magia != MAGIA) return;
    if (dati_crc32((const uint8_t *)&t, offsetof(testata_t, crc_testata)) != t.crc_testata) return;
    if (t.codice != CODICE_NESSUNO && !dati_codice_valido(t.codice)) return;
    m->codice = t.codice;
    if (t.lung == 0 || t.lung > DATI_MAX_TESTO) return;
    const char *testo = (const char *)in_flash() + sizeof(t);
    if (dati_crc32((const uint8_t *)testo, t.lung) != t.crc) return;
    m->testo = testo;
    m->lung = t.lung;
    m->crc = t.crc;
}

typedef struct { uint32_t offset, lung; const uint8_t *dati; } lavoro_t;

static void scrivi_flash(void *p) {
    const lavoro_t *l = p;
    flash_range_erase(l->offset, l->lung);
    if (l->dati) flash_range_program(l->offset, l->dati, l->lung);
}

bool memoria_salva(const char *testo, uint32_t lung, uint32_t codice) {
    if (lung > DATI_MAX_TESTO) return false;
    memset(copia, 0xFF, sizeof(copia));
    testata_t t = { .magia = MAGIA, .codice = codice, .lung = lung,
                    .crc = lung ? dati_crc32((const uint8_t *)testo, lung) : 0 };
    t.crc_testata = dati_crc32((const uint8_t *)&t, offsetof(testata_t, crc_testata));
    if (lung) memmove(copia + sizeof(t), testo, lung);   // il testo puo' stare nella flash
    memcpy(copia, &t, sizeof(t));
    lavoro_t l = { MEMORIA_OFFSET, MEMORIA_LUNG, copia };
    if (flash_safe_execute(scrivi_flash, &l, 1000) != PICO_OK) return false;
    memoria_t verifica;
    memoria_leggi(&verifica);
    return verifica.codice == codice && verifica.lung == lung;
}

bool memoria_cancella_abbinamenti(void) {
    lavoro_t l = { PICO_FLASH_BANK_STORAGE_OFFSET, PICO_FLASH_BANK_TOTAL_SIZE, NULL };
    return flash_safe_execute(scrivi_flash, &l, 1000) == PICO_OK;
}
