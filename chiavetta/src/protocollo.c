#include "protocollo.h"

#include <stdio.h>
#include <string.h>

size_t protocollo_elabora(sistema_t *s, ricevitore_t *r, bool cavo,
                          const uint8_t *p, size_t n, char *out, size_t max, uint32_t ora) {
    switch (ric_pacchetto(r, p, n)) {
    case RIC_NIENTE:
        return 0;
    case RIC_STATO:
        return risposta_stato(out, max, s->dati->n, s->motore->pos, s->crc, dati_codice_valido(s->codice),
                              s->caricamento ? "CARICAMENTO" : motore_nome_stato(s->motore->stato));
    case RIC_ERRORE:
        return risposta_errore(out, max, r->errore, 0);
    case RIC_CODICE: {
        if (!cavo) return risposta_errore(out, max, ERR_CODICE, 0);
        if (!s->salva_codice(r->codice, s->ctx)) return risposta_errore(out, max, ERR_MEMORIA, 0);
        s->codice = r->codice;
        int k = snprintf(out, max, "CODICE %s", dati_codice_valido(s->codice) ? "OK" : "SPENTO");
        return k < 0 ? 0 : (size_t)k < max ? (size_t)k : max - 1;
    }
    case RIC_COMPLETO: {
        // mentre scrive i valori non si toccano
        if (!s->caricamento && motore_occupato(s->motore)) return risposta_errore(out, max, ERR_OCCUPATO, 0);
        uint32_t riga;
        dati_errore_t e = dati_analizza((const char *)r->buf, r->ricevuti, s->nuovi, &riga);
        if (e != DATI_OK) return risposta_errore(out, max, e, riga);
        if (!s->salva_testo(r->buf, r->ricevuti, s->ctx)) return risposta_errore(out, max, ERR_MEMORIA, 0);
        memcpy(s->dati, s->nuovi, sizeof(*s->dati));
        s->crc = r->crc;
        motore_nuovi_dati(s->motore, ora);
        return risposta_ok(out, max, s->dati->n, s->crc);
    }
    }
    return 0;
}
