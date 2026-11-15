// Pico simulato per i test del sito: stesso codice del firmware per protocollo,
// lettura dei dati e scrittura (dati.c, motore.c, protocollo.c); la flash e'
// in memoria e i tasti diventano testo con il layout tedesco.
//
// Comandi su stdin, uno per riga; ogni comando produce una riga su stdout:
//   CAVO <esadecimale>    byte arrivati con il cavo (con la lunghezza davanti)
//                         -> "R <risposta>" per ogni risposta, poi "."
//   BT <esadecimale>      un pacchetto Bluetooth -> "R <risposta>" oppure "R"
//   MODO caricamento|tastiera
//   PREMI <ms>            tiene premuto il pulsante (Scrivi) per <ms>, poi lascia
//                         lavorare la chiavetta finche' non si ferma -> "K <testo scritto>"
//                         (INVIO = "\n", scritto come \n)
//   PREMI <TASTO> <da>-<a> [<TASTO> <da>-<a> ...]
//                         come sopra, con i tre tasti (SCRIVI, FERMA, RICOMINCIA) premuti
//                         negli intervalli dati, in ms dall'inizio del comando.
//                         Es. "PREMI SCRIVI 0-100 FERMA 1700-1800"
//   STATO                 -> "S <stato> <pos> <n>"
#include "../src/dati.h"
#include "../src/motore.h"
#include "../src/protocollo.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static dati_t dati, nuovi;
static motore_t motore;
static ricevitore_t ric_bt, ric_cavo;
static telaio_t telaio;
static sistema_t sistema;
static uint8_t flash_testo[DATI_MAX_TESTO];
static uint32_t flash_lung;
static uint32_t ora = 0;

static bool salva_testo(const uint8_t *t, uint32_t n, void *ctx) {
    (void)ctx;
    memcpy(flash_testo, t, n);
    flash_lung = n;
    return true;
}
static bool salva_codice(uint32_t c, void *ctx) { (void)c; (void)ctx; return true; }

static size_t da_esa(const char *s, uint8_t *out, size_t max) {
    size_t n = 0;
    while (s[0] && s[1] && n < max) {
        unsigned v;
        if (sscanf(s, "%2x", &v) != 1) break;
        out[n++] = (uint8_t)v;
        s += 2;
    }
    return n;
}

static void risposta_cavo(const uint8_t *p, size_t n, void *ctx) {
    (void)ctx;
    char out[128];
    size_t k = protocollo_elabora(&sistema, &ric_cavo, true, p, n, out, sizeof(out), ora);
    if (k) printf("R %s\n", out);
}

// Tedesco senza Shift, solo i tasti che la chiavetta puo' mandare
static char car_de(uint8_t t) {
    if (t >= 0x1E && t <= 0x26) return (char)('1' + (t - 0x1E));
    if (t == 0x27) return '0';
    if (t == 0x28) return '\n';
    if (t == 0x56) return '-';
    return '?';
}

#define MAX_PRESSIONI 16
typedef struct { int tasto; uint32_t da, a; } pressione_t;   // tasto: -1 = Scrivi, altrimenti motore_tasto_t

static bool premuto(const pressione_t *p, size_t np, int tasto, uint32_t t) {
    for (size_t i = 0; i < np; i++) if (p[i].tasto == tasto && t >= p[i].da && t < p[i].a) return true;
    return false;
}

// "100" oppure "SCRIVI 0-100 FERMA 1700-1800": false se la riga non si capisce
static bool leggi_pressioni(char *s, pressione_t *p, size_t *np) {
    *np = 0;
    char *fine;
    unsigned long ms = strtoul(s, &fine, 10);
    if (fine != s && *fine == 0) {
        p[0] = (pressione_t){ -1, 0, (uint32_t)ms };
        *np = 1;
        return true;
    }
    for (char *nome = strtok(s, " "); nome; nome = strtok(NULL, " ")) {
        char *intervallo = strtok(NULL, " ");
        unsigned da, a;
        if (!intervallo || sscanf(intervallo, "%u-%u", &da, &a) != 2 || a <= da || *np >= MAX_PRESSIONI) return false;
        int tasto;
        if (strcmp(nome, "SCRIVI") == 0) tasto = -1;
        else if (strcmp(nome, "FERMA") == 0) tasto = MT_FERMA;
        else if (strcmp(nome, "RICOMINCIA") == 0) tasto = MT_RICOMINCIA;
        else return false;
        p[(*np)++] = (pressione_t){ tasto, da, a };
    }
    return *np > 0;
}

static void premi(const pressione_t *p, size_t np) {
    static char testo[DATI_MAX_TESTO * 2];
    size_t n = 0;
    uint32_t inizio = ora, fine_pressione = ora;
    for (size_t i = 0; i < np; i++) if (inizio + p[i].a > fine_pressione) fine_pressione = inizio + p[i].a;
    uint32_t limite = fine_pressione + 600000u;   // al massimo 10 minuti simulati
    bool partito = false;
    for (; ora < limite; ora++) {
        uint32_t t = ora - inizio;
        motore_pulsante(&motore, premuto(p, np, -1, t), ora);
        for (int k = 0; k < MT_NUMERO; k++) motore_tasto(&motore, (motore_tasto_t)k, premuto(p, np, k, t), ora);
        uint8_t tasto;
        motore_azione_t az = motore_passo(&motore, ora, true, &tasto);
        if (az == AZ_PREMI) {
            char c = car_de(tasto);
            if (c == '\n') { testo[n++] = '\\'; testo[n++] = 'n'; }
            else testo[n++] = c;
        }
        if (motore_occupato(&motore)) partito = true;
        if (ora > fine_pressione + 100 && !motore_occupato(&motore) && (partito || ora > fine_pressione + 2000)) break;
    }
    testo[n] = 0;
    printf("K %s\n", testo);
}

int main(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
    motore_init(&motore, &dati, 0);
    ric_azzera(&ric_bt);
    ric_azzera(&ric_cavo);
    telaio_azzera(&telaio);
    sistema.dati = &dati;
    sistema.nuovi = &nuovi;
    sistema.motore = &motore;
    sistema.codice = CODICE_NESSUNO;
    sistema.salva_testo = salva_testo;
    sistema.salva_codice = salva_codice;

    static char riga[2 * (DATI_MAX_TESTO + 64)];
    static uint8_t byte[DATI_MAX_TESTO + 64];
    while (fgets(riga, sizeof(riga), stdin)) {
        riga[strcspn(riga, "\r\n")] = 0;
        ora += 10;
        if (strncmp(riga, "CAVO ", 5) == 0) {
            size_t n = da_esa(riga + 5, byte, sizeof(byte));
            if (!telaio_aggiungi(&telaio, byte, n, risposta_cavo, NULL)) printf("R ERRORE PACCHETTO 0\n");
            printf(".\n");
        } else if (strncmp(riga, "BT ", 3) == 0) {
            size_t n = da_esa(riga + 3, byte, sizeof(byte));
            char out[128];
            size_t k = protocollo_elabora(&sistema, &ric_bt, false, byte, n, out, sizeof(out), ora);
            printf(k ? "R %s\n" : "R\n", out);
        } else if (strncmp(riga, "MODO ", 5) == 0) {
            sistema.caricamento = strcmp(riga + 5, "caricamento") == 0;
            printf("OK\n");
        } else if (strncmp(riga, "PREMI ", 6) == 0) {
            static pressione_t p[MAX_PRESSIONI];
            size_t np;
            if (leggi_pressioni(riga + 6, p, &np)) premi(p, np);
            else printf("? %s\n", riga);
        } else if (strcmp(riga, "STATO") == 0) {
            printf("S %s %u %u\n", motore_nome_stato(motore.stato), (unsigned)motore.pos, (unsigned)dati.n);
        } else {
            printf("? %s\n", riga);
        }
    }
    return 0;
}
