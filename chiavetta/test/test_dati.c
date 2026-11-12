// Test della parte pura della chiavetta, sul PC:
//   cc -std=c11 -Wall -Wextra -Werror -Isrc test/test_dati.c src/dati.c src/motore.c -o test_dati && ./test_dati
#include "../src/dati.h"
#include "../src/motore.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int fallimenti = 0, controlli = 0;
#define VERO(c) do { controlli++; if (!(c)) { fallimenti++; \
    printf("  FALLITO %s:%d: %s\n", __FILE__, __LINE__, #c); } } while (0)
#define UGUALI_S(a, b) do { controlli++; if (strcmp((a), (b)) != 0) { fallimenti++; \
    printf("  FALLITO %s:%d:\n    ottenuto: \"%s\"\n    atteso:   \"%s\"\n", __FILE__, __LINE__, (a), (b)); } } while (0)

static dati_t D;            // grandi: statici
static ricevitore_t R;
static telaio_t T;

static dati_errore_t analizza(const char *s, uint32_t *riga) {
    return dati_analizza(s, strlen(s), &D, riga);
}

// ---------------------------------------------------------------------------
// Tastiere: dal codice del tasto al carattere, SENZA Shift (il firmware non
// manda mai modificatori). Solo i tasti che la chiavetta puo' mandare: se il
// layout desse un carattere diverso il test lo vedrebbe.
typedef struct { const char *nome; char car[256]; } layout_t;

static void layout_base(layout_t *l, const char *nome) {
    memset(l->car, 0, sizeof(l->car));
    l->nome = nome;
    const char *cifre = "1234567890";          // fila in alto, 0x1E..0x27
    for (int i = 0; i < 10; i++) l->car[0x1E + i] = cifre[i];
    l->car[0x28] = '\n';                        // Invio
    l->car[0x56] = '-';                         // "-" del tastierino
    l->car[0x2D] = nome[0] == 'D' ? (char)0xDF : '\''; // tasto a destra dello 0: "ss" in DE, apostrofo in IT
}

// ---------------------------------------------------------------------------
// Simulatore: tempo a passi di 1 ms, pulsante descritto da intervalli.
typedef struct { uint32_t da, a; } intervallo_t;

typedef struct {
    char testo[16384];
    size_t n;
    int eventi_abbina;
    bool giu;
    int errori_sequenza;      // premi due volte senza rilasciare, ecc.
    uint32_t t_ultimo_invio_rilasciato;
    uint32_t pausa_min_dopo_invio;
    uint32_t pausa_min_tra_tasti;
    uint32_t t_ultimo_rilascio;
    bool ultimo_invio;
} uscita_t;

static motore_t M;

static void simula(motore_t *m, const layout_t *l, uint32_t da, uint32_t a,
                   const intervallo_t *pressioni, size_t np, uscita_t *u,
                   bool (*hid_pronto)(uint32_t)) {
    for (uint32_t ora = da; ora < a; ora++) {
        bool premuto = false;
        for (size_t i = 0; i < np; i++) if (ora >= pressioni[i].da && ora < pressioni[i].a) premuto = true;
        if (motore_pulsante(m, premuto, ora) == EV_ABBINA) u->eventi_abbina++;
        uint8_t tasto = 0;
        bool pronto = hid_pronto ? hid_pronto(ora) : true;
        motore_azione_t az = motore_passo(m, ora, pronto, &tasto);
        if (az != AZ_NIENTE && !pronto) u->errori_sequenza++;
        if (az == AZ_PREMI) {
            if (u->giu) u->errori_sequenza++;
            u->giu = true;
            uint32_t pausa = ora - u->t_ultimo_rilascio;
            if (u->n > 0) {
                if (u->ultimo_invio) { if (pausa < u->pausa_min_dopo_invio) u->pausa_min_dopo_invio = pausa; }
                else if (pausa < u->pausa_min_tra_tasti) u->pausa_min_tra_tasti = pausa;
            }
            char c = l->car[tasto];
            if (c == 0) { u->errori_sequenza++; c = '?'; }
            u->testo[u->n++] = c;
            u->testo[u->n] = 0;
            u->ultimo_invio = tasto == TASTO_INVIO;
        } else if (az == AZ_RILASCIA) {
            if (!u->giu) u->errori_sequenza++;
            u->giu = false;
            u->t_ultimo_rilascio = ora;
        }
    }
}

static void uscita_init(uscita_t *u) {
    memset(u, 0, sizeof(*u));
    u->pausa_min_dopo_invio = u->pausa_min_tra_tasti = 0xFFFFFFFFu;
}

static const char *ESEMPIO =
    "# Compilatore misure - prova\r\n"
    "ritardo_carattere_ms = 30\r\n"
    "ritardo_invio_ms=200\n"
    "  coppie_per_pressione = 0  \n"
    "\n"
    "21494\n"
    "2694\n"
    "-150\n"
    "  8884  \r\n";

static void test_crc(void) {
    printf("crc32\n");
    VERO(dati_crc32((const uint8_t *)"123456789", 9) == 0xCBF43926u);
    VERO(dati_crc32((const uint8_t *)"", 0) == 0);
}

static void test_analizza(void) {
    printf("lettura del testo\n");
    uint32_t riga;
    VERO(analizza(ESEMPIO, &riga) == DATI_OK);
    VERO(D.n == 4);
    UGUALI_S(D.valori[0], "21494");
    UGUALI_S(D.valori[2], "-150");
    UGUALI_S(D.valori[3], "8884");
    VERO(D.ritardo_carattere_ms == 30 && D.ritardo_invio_ms == 200 && D.coppie_per_pressione == 0);

    VERO(analizza("ritardo_invio_ms = 0\nritardo_carattere_ms = 1000\ncoppie_per_pressione = 10\n1\n2", &riga) == DATI_OK);
    VERO(D.ritardo_invio_ms == 0 && D.ritardo_carattere_ms == 1000 && D.coppie_per_pressione == 10);
    VERO(analizza("1\n2", &riga) == DATI_OK && D.ritardo_carattere_ms == 30 && D.ritardo_invio_ms == 200);

    struct { const char *testo; dati_errore_t e; uint32_t riga; } casi[] = {
        { "1\n12a\n", ERR_RIGA, 2 },
        { "# c\n1\n2,5\n", ERR_RIGA, 3 },
        { "1\n2.5\n", ERR_RIGA, 2 },
        { "1\n-\n", ERR_RIGA, 2 },
        { "1\n--1\n", ERR_RIGA, 2 },
        { "1\n+1\n", ERR_RIGA, 2 },
        { "1\n1234567890\n", ERR_RIGA, 2 },
        { "1\n1 2\n", ERR_RIGA, 2 },
        { "1\nINVIO\n", ERR_RIGA, 2 },
        { "velocita = 3\n1\n2\n", ERR_IMPOSTAZIONE, 1 },
        { "ritardo_carattere_ms = 0\n1\n2\n", ERR_IMPOSTAZIONE, 1 },
        { "ritardo_carattere_ms = 1001\n1\n2\n", ERR_IMPOSTAZIONE, 1 },
        { "ritardo_invio_ms = 5001\n1\n2\n", ERR_IMPOSTAZIONE, 1 },
        { "ritardo_invio_ms = -1\n1\n2\n", ERR_IMPOSTAZIONE, 1 },
        { "ritardo_invio_ms =\n1\n2\n", ERR_IMPOSTAZIONE, 1 },
        { "coppie_per_pressione = 501\n1\n2\n", ERR_IMPOSTAZIONE, 1 },
        { "# solo commenti\n\n", ERR_VUOTO, 0 },
        { "", ERR_VUOTO, 0 },
        { "1\n2\n3\n", ERR_DISPARI, 0 },
    };
    for (size_t i = 0; i < sizeof(casi) / sizeof(casi[0]); i++) {
        dati_errore_t e = analizza(casi[i].testo, &riga);
        controlli++;
        if (e != casi[i].e || riga != casi[i].riga) {
            fallimenti++;
            printf("  FALLITO caso %zu: errore %s riga %u, atteso %s riga %u\n", i, dati_nome_errore(e),
                   (unsigned)riga, dati_nome_errore(casi[i].e), (unsigned)casi[i].riga);
        }
    }

    // troppi valori e testo troppo lungo
    static char grande[DATI_MAX_TESTO * 2];
    size_t n = 0;
    for (unsigned i = 0; i < DATI_MAX_VALORI; i++) n += (size_t)sprintf(grande + n, "%u\n", i % 10);
    VERO(dati_analizza(grande, n, &D, &riga) == DATI_OK && D.n == DATI_MAX_VALORI);
    n += (size_t)sprintf(grande + n, "1\n2\n");
    VERO(dati_analizza(grande, n, &D, &riga) == ERR_TROPPI && riga == DATI_MAX_VALORI + 1);
    memset(grande, '#', DATI_MAX_TESTO + 1);
    VERO(dati_analizza(grande, DATI_MAX_TESTO + 1, &D, &riga) == ERR_LUNGHEZZA);
    // carattere nullo dentro il testo
    VERO(dati_analizza("1\n\0002\n", 5, &D, &riga) == ERR_RIGA && riga == 2);
}

static void test_tasti(void) {
    printf("tasti\n");
    uint8_t t[DATI_MAX_TASTI];
    size_t n = dati_tasti("21494", t, sizeof(t));
    uint8_t atteso1[] = { 0x1F, 0x1E, 0x21, 0x26, 0x21, 0x28 };
    VERO(n == sizeof(atteso1) && memcmp(t, atteso1, n) == 0);
    n = dati_tasti("-150", t, sizeof(t));
    uint8_t atteso2[] = { 0x56, 0x1E, 0x22, 0x27, 0x28 };
    VERO(n == sizeof(atteso2) && memcmp(t, atteso2, n) == 0);
    n = dati_tasti("0", t, sizeof(t));
    VERO(n == 2 && t[0] == 0x27 && t[1] == 0x28);
    VERO(dati_tasti("12a", t, sizeof(t)) == 0);
    VERO(dati_tasti("", t, sizeof(t)) == 0);
    VERO(dati_tasti("123456789", t, sizeof(t)) == 10);
    VERO(dati_tasti("-123456789", t, sizeof(t)) == 11);
    // nessun tasto fuori dall'elenco ammesso, per ogni cifra
    for (char c = '0'; c <= '9'; c++) {
        char v[3] = { '-', c, 0 };
        n = dati_tasti(v, t, sizeof(t));
        for (size_t i = 0; i < n; i++)
            VERO((t[i] >= 0x1E && t[i] <= 0x28) || t[i] == 0x56);
    }
}

static void test_blocchi(void) {
    printf("blocchi\n");
    uint32_t riga;
    VERO(analizza("1\n2\n3\n4\n5\n6\n7\n8\n", &riga) == DATI_OK);
    VERO(dati_fine_blocco(&D, 0) == 8);
    D.coppie_per_pressione = 1;
    VERO(dati_fine_blocco(&D, 0) == 2 && dati_fine_blocco(&D, 1) == 2 && dati_fine_blocco(&D, 2) == 4);
    D.coppie_per_pressione = 3;
    VERO(dati_fine_blocco(&D, 0) == 6 && dati_fine_blocco(&D, 5) == 6 && dati_fine_blocco(&D, 6) == 8);
    VERO(dati_fine_blocco(&D, 8) == 8);
}

static void pacchetto_inizio(uint8_t *p, uint32_t len, uint32_t crc) {
    p[0] = 'I';
    for (int i = 0; i < 4; i++) { p[1 + i] = (uint8_t)(len >> (8 * i)); p[5 + i] = (uint8_t)(crc >> (8 * i)); }
}

static void test_ricevitore(void) {
    printf("protocollo\n");
    const char *testo = ESEMPIO;
    uint32_t len = (uint32_t)strlen(testo);
    uint32_t crc = dati_crc32((const uint8_t *)testo, len);
    uint8_t p[300];

    ric_azzera(&R);
    pacchetto_inizio(p, len, crc);
    VERO(ric_pacchetto(&R, p, 9) == RIC_NIENTE);
    for (uint32_t i = 0; i < len; i += 7) {
        uint32_t k = len - i < 7 ? len - i : 7;
        p[0] = 'D';
        memcpy(p + 1, testo + i, k);
        VERO(ric_pacchetto(&R, p, k + 1) == RIC_NIENTE);
    }
    p[0] = 'F';
    VERO(ric_pacchetto(&R, p, 1) == RIC_COMPLETO);
    VERO(R.ricevuti == len && memcmp(R.buf, testo, len) == 0);

    // CRC sbagliato
    pacchetto_inizio(p, len, crc ^ 1);
    ric_pacchetto(&R, p, 9);
    p[0] = 'D'; memcpy(p + 1, testo, len);
    ric_pacchetto(&R, p, len + 1);
    p[0] = 'F';
    VERO(ric_pacchetto(&R, p, 1) == RIC_ERRORE && R.errore == ERR_CRC);
    // dati senza inizio, e fine ripetuta
    p[0] = 'D';
    VERO(ric_pacchetto(&R, p, 3) == RIC_ERRORE && R.errore == ERR_SEQUENZA);
    p[0] = 'F';
    VERO(ric_pacchetto(&R, p, 1) == RIC_ERRORE && R.errore == ERR_SEQUENZA);
    // troppi dati
    pacchetto_inizio(p, 3, 0);
    ric_pacchetto(&R, p, 9);
    p[0] = 'D';
    VERO(ric_pacchetto(&R, p, 5) == RIC_ERRORE && R.errore == ERR_LUNGHEZZA);
    // dati troncati
    pacchetto_inizio(p, 3, 0);
    ric_pacchetto(&R, p, 9);
    p[0] = 'D';
    ric_pacchetto(&R, p, 3);
    p[0] = 'F';
    VERO(ric_pacchetto(&R, p, 1) == RIC_ERRORE && R.errore == ERR_LUNGHEZZA);
    // lunghezze impossibili
    pacchetto_inizio(p, DATI_MAX_TESTO + 1, 0);
    VERO(ric_pacchetto(&R, p, 9) == RIC_ERRORE && R.errore == ERR_LUNGHEZZA);
    pacchetto_inizio(p, 0, 0);
    VERO(ric_pacchetto(&R, p, 9) == RIC_ERRORE);
    // stato, codice, pacchetti sconosciuti
    p[0] = 'S';
    VERO(ric_pacchetto(&R, p, 1) == RIC_STATO);
    p[0] = 'P'; p[1] = 0x3F; p[2] = 0x42; p[3] = 0x0F; p[4] = 0;   // 999999
    VERO(ric_pacchetto(&R, p, 5) == RIC_CODICE && R.codice == 999999u);
    p[1] = 0x40;                                                   // 1000000
    VERO(ric_pacchetto(&R, p, 5) == RIC_ERRORE && R.errore == ERR_CODICE);
    memset(p + 1, 0xFF, 4);
    VERO(ric_pacchetto(&R, p, 5) == RIC_CODICE && R.codice == CODICE_NESSUNO);
    p[0] = 'X';
    VERO(ric_pacchetto(&R, p, 1) == RIC_ERRORE && R.errore == ERR_PACCHETTO);
    VERO(ric_pacchetto(&R, p, 0) == RIC_ERRORE);
    p[0] = 'S';
    VERO(ric_pacchetto(&R, p, 2) == RIC_ERRORE && R.errore == ERR_PACCHETTO);
}

typedef struct { int n; size_t lung[10]; uint8_t primo[10]; } raccolta_t;
static void raccogli(const uint8_t *p, size_t n, void *ctx) {
    raccolta_t *r = ctx;
    if (r->n < 10) { r->lung[r->n] = n; r->primo[r->n] = p[0]; }
    r->n++;
}

static void test_telaio(void) {
    printf("pacchetti con il cavo\n");
    uint8_t flusso[] = { 1, 0, 'S',  3, 0, 'D', 'a', 'b',  1, 0, 'F' };
    // a pezzi di ogni grandezza
    for (size_t pezzo = 1; pezzo <= sizeof(flusso); pezzo++) {
        raccolta_t r = { 0 };
        telaio_azzera(&T);
        for (size_t i = 0; i < sizeof(flusso); i += pezzo) {
            size_t k = sizeof(flusso) - i < pezzo ? sizeof(flusso) - i : pezzo;
            VERO(telaio_aggiungi(&T, flusso + i, k, raccogli, &r));
        }
        VERO(r.n == 3 && r.primo[0] == 'S' && r.lung[1] == 3 && r.primo[1] == 'D' && r.primo[2] == 'F');
    }
    raccolta_t r = { 0 };
    uint8_t zero[] = { 0, 0 };
    telaio_azzera(&T);
    VERO(!telaio_aggiungi(&T, zero, 2, raccogli, &r) && r.n == 0);
    uint8_t enorme[] = { 0xFF, 0xFF, 'D' };
    VERO(!telaio_aggiungi(&T, enorme, 3, raccogli, &r) && r.n == 0);
}

static void test_risposte(void) {
    printf("risposte\n");
    char s[64];
    risposta_ok(s, sizeof(s), 40, 0x3F2A1B9Cu);
    UGUALI_S(s, "OK 40 3F2A1B9C");
    risposta_errore(s, sizeof(s), ERR_RIGA, 5);
    UGUALI_S(s, "ERRORE RIGA 5");
    risposta_stato(s, sizeof(s), 40, 6, 0xAu, true, "FERMATO", "1.1.0");
    UGUALI_S(s, "STATO 40 6 0000000A BT FERMATO 1.1.0");
    risposta_stato(s, sizeof(s), 0, 0, 0, false, "VUOTO", "12.3.45");
    UGUALI_S(s, "STATO 0 0 00000000 NOBT VUOTO 12.3.45");
}

// --- motore -----------------------------------------------------------------

static const char *VALORI_PROVA =
    "ritardo_carattere_ms = 30\nritardo_invio_ms = 200\n"
    "21494\n2694\n19522\n8884\n-150\n5930\n";
static const char *ATTESO_PROVA = "21494\n2694\n19522\n8884\n-150\n5930\n";

static void carica(const char *testo) {
    uint32_t riga;
    VERO(analizza(testo, &riga) == DATI_OK);
    motore_init(&M, &D, 0);
}

static bool hid_a_singhiozzo(uint32_t ora) { return (ora / 7) % 3 != 0; }

static void test_motore_layout(const layout_t *l) {
    printf("motore, layout %s\n", l->nome);
    uscita_t u;

    // senza premere niente non parte nessun tasto
    carica(VALORI_PROVA);
    uscita_init(&u);
    simula(&M, l, 0, 20000, NULL, 0, &u, NULL);
    VERO(u.n == 0 && M.stato == ST_PRONTO);

    // una pressione breve: dopo 1 s scrive tutto, esattamente
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t breve[] = { { 1000, 1150 } };
    simula(&M, l, 0, 1150 + MOTORE_ATTESA_MS + MOTORE_RIMBALZO_MS - 1, breve, 1, &u, NULL);
    VERO(u.n == 0 && M.stato == ST_ATTESA);           // ancora in attesa
    simula(&M, l, 1150 + MOTORE_ATTESA_MS + MOTORE_RIMBALZO_MS - 1, 30000, NULL, 0, &u, NULL);
    UGUALI_S(u.testo, ATTESO_PROVA);
    VERO(u.errori_sequenza == 0 && !u.giu);
    VERO(M.stato == ST_FINITO && M.pos == 6);
    VERO(u.pausa_min_dopo_invio >= 200 && u.pausa_min_tra_tasti >= 30);
    // finito: una pressione breve non riscrive
    intervallo_t ancora[] = { { 31000, 31100 } };
    simula(&M, l, 30000, 40000, ancora, 1, &u, NULL);
    UGUALI_S(u.testo, ATTESO_PROVA);
    // la pressione lunga riporta all'inizio, ma non scrive da sola
    intervallo_t lunga[] = { { 41000, 44000 } };
    simula(&M, l, 40000, 50000, lunga, 1, &u, NULL);
    VERO(M.stato == ST_PRONTO && M.pos == 0);
    UGUALI_S(u.testo, ATTESO_PROVA);
    intervallo_t di_nuovo[] = { { 51000, 51100 } };
    simula(&M, l, 50000, 70000, di_nuovo, 1, &u, NULL);
    char due_volte[256];
    snprintf(due_volte, sizeof(due_volte), "%s%s", ATTESO_PROVA, ATTESO_PROVA);
    UGUALI_S(u.testo, due_volte);
}

static void test_motore(void) {
    printf("motore\n");
    layout_t l;
    layout_base(&l, "IT");
    uscita_t u;

    // ferma mentre scrive: finisce il valore in corso, poi riprende dal successivo
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t p1[] = { { 100, 200 }, { 1700, 1800 } };
    simula(&M, &l, 0, 6000, p1, 2, &u, NULL);
    VERO(M.stato == ST_FERMATO && M.pos > 0 && M.pos < 6);
    VERO(u.n > 0 && u.testo[u.n - 1] == '\n');     // fermo dopo un INVIO, mai a meta' valore
    size_t prima = u.n;
    intervallo_t p2[] = { { 7000, 7100 } };
    simula(&M, &l, 6000, 30000, p2, 1, &u, NULL);
    VERO(u.n > prima);
    UGUALI_S(u.testo, ATTESO_PROVA);
    VERO(u.errori_sequenza == 0);

    // una pressione durante l'attesa annulla
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t p3[] = { { 100, 200 }, { 600, 700 } };
    simula(&M, &l, 0, 10000, p3, 2, &u, NULL);
    VERO(u.n == 0 && M.stato == ST_PRONTO);

    // tenere premuto 5 s: abbinamento, niente tasti
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t p4[] = { { 100, 5300 } };
    simula(&M, &l, 0, 12000, p4, 1, &u, NULL);
    VERO(u.n == 0 && u.eventi_abbina == 1 && M.stato == ST_PRONTO);

    // pressione lunga mentre e' fermo a meta': riporta all'inizio
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t p5[] = { { 100, 200 }, { 1700, 1800 }, { 8000, 11000 } };
    simula(&M, &l, 0, 15000, p5, 3, &u, NULL);
    VERO(M.stato == ST_PRONTO && M.pos == 0);

    // rimbalzi del contatto: impulsi di 5 ms non contano
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t rimbalzi[] = { { 100, 105 }, { 300, 305 }, { 500, 504 } };
    simula(&M, &l, 0, 5000, rimbalzi, 3, &u, NULL);
    VERO(u.n == 0 && M.stato == ST_PRONTO);

    // tastiera USB non sempre pronta: si aspetta, non si perde niente
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t p6[] = { { 100, 200 } };
    simula(&M, &l, 0, 40000, p6, 1, &u, hid_a_singhiozzo);
    UGUALI_S(u.testo, ATTESO_PROVA);
    VERO(u.errori_sequenza == 0);

    // blocchi: 1 coppia per pressione
    carica("coppie_per_pressione = 1\n21494\n2694\n19522\n8884\n-150\n5930\n");
    uscita_init(&u);
    intervallo_t p7[] = { { 100, 200 } };
    simula(&M, &l, 0, 8000, p7, 1, &u, NULL);
    UGUALI_S(u.testo, "21494\n2694\n");
    VERO(M.stato == ST_FERMATO && M.pos == 2);
    intervallo_t p8[] = { { 9000, 9100 } };
    simula(&M, &l, 8000, 16000, p8, 1, &u, NULL);
    UGUALI_S(u.testo, "21494\n2694\n19522\n8884\n");
    intervallo_t p9[] = { { 17000, 17100 } };
    simula(&M, &l, 16000, 24000, p9, 1, &u, NULL);
    UGUALI_S(u.testo, ATTESO_PROVA);
    VERO(M.stato == ST_FINITO);

    // nuovi dati rifiutati mentre scrive, accettati da fermo
    carica(VALORI_PROVA);
    uscita_init(&u);
    intervallo_t p10[] = { { 100, 200 } };
    simula(&M, &l, 0, 1500, p10, 1, &u, NULL);
    VERO(M.stato == ST_SCRIVE);
    VERO(!motore_nuovi_dati(&M, 1500));
    VERO(M.stato == ST_SCRIVE);
    simula(&M, &l, 1500, 30000, NULL, 0, &u, NULL);
    UGUALI_S(u.testo, ATTESO_PROVA);
    VERO(motore_nuovi_dati(&M, 30000) && M.stato == ST_PRONTO && M.pos == 0);

    // senza valori: il pulsante non fa niente
    memset(&D, 0, sizeof(D));
    motore_init(&M, &D, 0);
    uscita_init(&u);
    intervallo_t p11[] = { { 100, 200 }, { 1000, 4000 } };
    simula(&M, &l, 0, 10000, p11, 2, &u, NULL);
    VERO(u.n == 0 && M.stato == ST_VUOTO);

    // LED: acceso da pronto, lampeggia mentre scrive
    carica(VALORI_PROVA);
    VERO(motore_led(&M, 5000));
    uscita_init(&u);
    intervallo_t p12[] = { { 100, 200 } };
    simula(&M, &l, 0, 1300, p12, 1, &u, NULL);
    int accesi = 0;
    for (uint32_t t = 1300; t < 1700; t++) accesi += motore_led(&M, t);
    VERO(accesi > 100 && accesi < 300);
}

int main(void) {
    test_crc();
    test_analizza();
    test_tasti();
    test_blocchi();
    test_ricevitore();
    test_telaio();
    test_risposte();
    layout_t de, it;
    layout_base(&de, "DE");
    layout_base(&it, "IT");
    test_motore_layout(&de);
    test_motore_layout(&it);
    test_motore();
    printf("\n%d controlli, %d falliti\n", controlli, fallimenti);
    return fallimenti ? 1 : 0;
}
