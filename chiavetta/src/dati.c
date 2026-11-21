#include "dati.h"

#include <stdio.h>
#include <string.h>

static const char *const NOMI_ERRORI[] = {
    [DATI_OK] = "OK",
    [ERR_RIGA] = "RIGA",
    [ERR_IMPOSTAZIONE] = "IMPOSTAZIONE",
    [ERR_VUOTO] = "VUOTO",
    [ERR_DISPARI] = "DISPARI",
    [ERR_TROPPI] = "TROPPI",
    [ERR_LUNGHEZZA] = "LUNGHEZZA",
    [ERR_CRC] = "CRC",
    [ERR_SEQUENZA] = "SEQUENZA",
    [ERR_OCCUPATO] = "OCCUPATO",
    [ERR_CODICE] = "CODICE",
    [ERR_PACCHETTO] = "PACCHETTO",
    [ERR_MEMORIA] = "MEMORIA",
};

const char *dati_nome_errore(dati_errore_t e) {
    if ((size_t)e < sizeof(NOMI_ERRORI) / sizeof(NOMI_ERRORI[0]) && NOMI_ERRORI[e]) return NOMI_ERRORI[e];
    return "SCONOSCIUTO";
}

uint32_t dati_crc32(const uint8_t *p, size_t n) {
    uint32_t c = 0xFFFFFFFFu;
    for (size_t i = 0; i < n; i++) {
        c ^= p[i];
        for (int k = 0; k < 8; k++) c = (c >> 1) ^ (0xEDB88320u & (0u - (c & 1u)));
    }
    return ~c;
}

static bool spazio(char c) { return c == ' ' || c == '\t'; }
static bool cifra(char c) { return c >= '0' && c <= '9'; }

typedef struct {
    const char *nome;
    uint16_t min, max;
    size_t campo;
} impostazione_t;

static const impostazione_t IMPOSTAZIONI[] = {
    { "ritardo_carattere_ms", 1, 1000, offsetof(dati_t, ritardo_carattere_ms) },
    { "ritardo_invio_ms",     0, 5000, offsetof(dati_t, ritardo_invio_ms) },
    { "coppie_per_pressione", 0, 500,  offsetof(dati_t, coppie_per_pressione) },
};

// Riga gia' senza spazi ai lati e non vuota. true se riconosciuta come impostazione.
static dati_errore_t leggi_impostazione(const char *s, size_t n, dati_t *d, bool *era) {
    *era = false;
    size_t i = 0;
    while (i < n && ((s[i] >= 'a' && s[i] <= 'z') || s[i] == '_')) i++;
    if (i == 0) return DATI_OK;
    size_t lnome = i;
    while (i < n && spazio(s[i])) i++;
    if (i >= n || s[i] != '=') return DATI_OK;   // non e' un'impostazione
    *era = true;
    i++;
    while (i < n && spazio(s[i])) i++;
    size_t inizio = i;
    uint32_t v = 0;
    while (i < n && cifra(s[i]) && i - inizio < 6) v = v * 10u + (uint32_t)(s[i++] - '0');
    if (i == inizio || i != n) return ERR_IMPOSTAZIONE;
    for (size_t k = 0; k < sizeof(IMPOSTAZIONI) / sizeof(IMPOSTAZIONI[0]); k++) {
        const impostazione_t *imp = &IMPOSTAZIONI[k];
        if (strlen(imp->nome) == lnome && memcmp(imp->nome, s, lnome) == 0) {
            if (v < imp->min || v > imp->max) return ERR_IMPOSTAZIONE;
            *(uint16_t *)((uint8_t *)d + imp->campo) = (uint16_t)v;
            return DATI_OK;
        }
    }
    return ERR_IMPOSTAZIONE;
}

static bool valore_valido(const char *s, size_t n) {
    size_t i = 0;
    if (n > 0 && s[0] == '-') i = 1;
    if (n - i < 1 || n - i > DATI_MAX_CIFRE) return false;
    for (; i < n; i++) if (!cifra(s[i])) return false;
    return true;
}

dati_errore_t dati_analizza(const char *testo, size_t len, dati_t *d, uint32_t *riga) {
    *riga = 0;
    if (len > DATI_MAX_TESTO) return ERR_LUNGHEZZA;
    memset(d, 0, sizeof(*d));
    d->ritardo_carattere_ms = 30;
    d->ritardo_invio_ms = 200;
    d->coppie_per_pressione = 0;

    size_t pos = 0;
    uint32_t nriga = 0;
    while (pos < len) {
        size_t fine = pos;
        while (fine < len && testo[fine] != '\n') fine++;
        nriga++;
        const char *s = testo + pos;
        size_t n = fine - pos;
        pos = fine + 1;
        while (n > 0 && (spazio(s[n - 1]) || s[n - 1] == '\r')) n--;
        while (n > 0 && spazio(s[0])) { s++; n--; }
        if (n == 0 || s[0] == '#') continue;

        bool era;
        dati_errore_t e = leggi_impostazione(s, n, d, &era);
        if (e != DATI_OK) { *riga = nriga; return e; }
        if (era) continue;

        if (!valore_valido(s, n)) { *riga = nriga; return ERR_RIGA; }
        if (d->n >= DATI_MAX_VALORI) { *riga = nriga; return ERR_TROPPI; }
        memcpy(d->valori[d->n], s, n);
        d->valori[d->n][n] = '\0';
        d->n++;
    }
    if (d->n == 0) return ERR_VUOTO;
    if (d->n % 2u) return ERR_DISPARI;
    return DATI_OK;
}

size_t dati_tasti(const char *v, uint8_t *tasti, size_t max) {
    size_t n = strlen(v);
    if (!valore_valido(v, n) || max < n + 1) return 0;
    size_t k = 0;
    for (size_t i = 0; i < n; i++) {
        char c = v[i];
        if (c == '-') tasti[k++] = TASTO_MENO_TN;
        else if (c == '0') tasti[k++] = TASTO_0;
        else tasti[k++] = (uint8_t)(TASTO_1 + (c - '1'));
    }
    tasti[k++] = TASTO_INVIO;
    return k;
}

uint16_t dati_fine_blocco(const dati_t *d, uint16_t pos) {
    if (pos >= d->n) return d->n;
    if (d->coppie_per_pressione == 0) return d->n;
    uint32_t blocco = 2u * d->coppie_per_pressione;
    uint32_t fine = ((uint32_t)pos / blocco + 1u) * blocco;
    return fine > d->n ? d->n : (uint16_t)fine;
}

// ---------------------------------------------------------------------------

static uint32_t leggi32(const uint8_t *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

void ric_azzera(ricevitore_t *r) {
    r->atteso = r->crc = r->ricevuti = 0;
    r->attivo = false;
    r->codice = CODICE_NESSUNO;
    r->errore = DATI_OK;
}

static ric_esito_t errore(ricevitore_t *r, dati_errore_t e) {
    r->attivo = false;
    r->errore = e;
    return RIC_ERRORE;
}

bool dati_codice_valido(uint32_t codice) { return codice <= 999999u; }

ric_esito_t ric_pacchetto(ricevitore_t *r, const uint8_t *p, size_t n) {
    if (n == 0) return errore(r, ERR_PACCHETTO);
    switch (p[0]) {
    case 'I':
        if (n != 9) return errore(r, ERR_PACCHETTO);
        r->atteso = leggi32(p + 1);
        r->crc = leggi32(p + 5);
        r->ricevuti = 0;
        if (r->atteso == 0 || r->atteso > DATI_MAX_TESTO) return errore(r, ERR_LUNGHEZZA);
        r->attivo = true;
        return RIC_NIENTE;
    case 'D':
        if (!r->attivo) return errore(r, ERR_SEQUENZA);
        if (r->ricevuti + (n - 1) > r->atteso) return errore(r, ERR_LUNGHEZZA);
        memcpy(r->buf + r->ricevuti, p + 1, n - 1);
        r->ricevuti += (uint32_t)(n - 1);
        return RIC_NIENTE;
    case 'F':
        if (n != 1) return errore(r, ERR_PACCHETTO);
        if (!r->attivo) return errore(r, ERR_SEQUENZA);
        r->attivo = false;
        if (r->ricevuti != r->atteso) return errore(r, ERR_LUNGHEZZA);
        if (dati_crc32(r->buf, r->ricevuti) != r->crc) return errore(r, ERR_CRC);
        return RIC_COMPLETO;
    case 'S':
        if (n != 1) return errore(r, ERR_PACCHETTO);
        return RIC_STATO;
    case 'P':
        if (n != 5) return errore(r, ERR_PACCHETTO);
        r->codice = leggi32(p + 1);
        if (r->codice != CODICE_NESSUNO && !dati_codice_valido(r->codice)) return errore(r, ERR_CODICE);
        return RIC_CODICE;
    default:
        return errore(r, ERR_PACCHETTO);
    }
}

void telaio_azzera(telaio_t *t) { t->presenti = 0; }

bool telaio_aggiungi(telaio_t *t, const uint8_t *p, size_t n,
                     void (*cb)(const uint8_t *, size_t, void *), void *ctx) {
    while (n > 0) {
        size_t spazio_libero = TELAIO_MAX - t->presenti;
        size_t k = n < spazio_libero ? n : spazio_libero;
        memcpy(t->buf + t->presenti, p, k);
        t->presenti += (uint32_t)k;
        p += k;
        n -= k;
        for (;;) {
            if (t->presenti < 2) break;
            uint32_t lung = (uint32_t)t->buf[0] | ((uint32_t)t->buf[1] << 8);
            if (lung == 0 || lung + 2u > TELAIO_MAX) { t->presenti = 0; return false; }
            if (t->presenti < lung + 2u) break;
            cb(t->buf + 2, lung, ctx);
            memmove(t->buf, t->buf + 2 + lung, t->presenti - 2 - lung);
            t->presenti -= 2 + lung;
        }
    }
    return true;
}

static size_t finisci(int k, size_t max) {
    if (k < 0) return 0;
    return (size_t)k < max ? (size_t)k : max - 1;
}

size_t risposta_ok(char *out, size_t max, uint16_t n, uint32_t crc) {
    return finisci(snprintf(out, max, "OK %u %08lX", (unsigned)n, (unsigned long)crc), max);
}

size_t risposta_errore(char *out, size_t max, dati_errore_t e, uint32_t riga) {
    return finisci(snprintf(out, max, "ERRORE %s %lu", dati_nome_errore(e), (unsigned long)riga), max);
}

size_t risposta_stato(char *out, size_t max, uint16_t n, uint16_t pos, uint32_t crc,
                      bool bluetooth, const char *stato, const char *versione) {
    return finisci(snprintf(out, max, "STATO %u %u %08lX %s %s %s", (unsigned)n, (unsigned)pos,
                            (unsigned long)crc, bluetooth ? "BT" : "NOBT", stato, versione), max);
}

size_t dati_nome(char *out, size_t max, const char *id) {
    char cod[5] = { 0 };
    size_t n = id ? strlen(id) : 0;
    bool ok = n >= 4;
    for (size_t i = 0; ok && i < 4; i++) {
        char c = id[n - 4 + i];
        if (c >= 'a' && c <= 'f') c = (char)(c - 'a' + 'A');
        ok = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F');
        cod[i] = c;
    }
    if (max == 0) return 0;
    return finisci(ok ? snprintf(out, max, "%s %s", DATI_NOME_BASE, cod)
                      : snprintf(out, max, "%s", DATI_NOME_BASE), max);
}
