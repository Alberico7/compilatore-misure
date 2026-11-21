// Logica della scrittura, del pulsante e del LED. Pura: il tempo, il
// pulsante e lo stato della tastiera USB arrivano da fuori, quindi si
// prova sul PC senza hardware.
#ifndef MOTORE_H
#define MOTORE_H

#include "dati.h"

#define MOTORE_ATTESA_MS        500u   // dopo la pressione (dal rilascio), prima di scrivere
#define MOTORE_RIMBALZO_MS      20u
#define MOTORE_LUNGA_MS         2000u  // riporta all'inizio
#define MOTORE_ABBINA_MS        5000u  // apre l'abbinamento Bluetooth

typedef enum {
    ST_VUOTO = 0,   // nessun valore valido
    ST_PRONTO,      // valori caricati, posizione all'inizio
    ST_ATTESA,      // pressione ricevuta, aspetta mezzo secondo
    ST_SCRIVE,
    ST_FERMATO,     // fermato a meta' o a fine blocco
    ST_FINITO,      // tutti i valori scritti
} motore_stato_t;

typedef enum {
    AZ_NIENTE = 0,
    AZ_PREMI,       // mandare il rapporto con 'tasto' premuto
    AZ_RILASCIA,    // mandare il rapporto vuoto
} motore_azione_t;

typedef enum {
    EV_NIENTE = 0,
    EV_ABBINA,      // pressione di almeno 5 s a chiavetta ferma
} motore_evento_t;

// Tasti in piu' rispetto al pulsante (che e' "Scrivi"): docs/2026-11-14-tastiera-3-tasti.md
typedef enum {
    MT_FERMA = 0,   // ferma dopo il valore in corso (o annulla l'attesa)
    MT_RICOMINCIA,  // breve: torna all'inizio; tenuto 5 s: abbinamento. Ignorato mentre scrive
    MT_NUMERO,
} motore_tasto_t;

typedef struct {
    bool liv_grezzo, liv;    // true = premuto
    uint32_t t_cambio_grezzo;
    uint32_t t_premuto;
    bool consumata;          // la pressione non deve fare niente al rilascio
} motore_tasto_stato_t;

typedef struct {
    const dati_t *dati;
    motore_stato_t stato;
    uint16_t pos;            // prossimo valore da scrivere
    uint16_t fine;           // dove fermarsi (escluso)
    uint32_t t_attesa;       // fine dell'attesa
    bool ferma_richiesto;
    // scrittura del valore corrente
    uint8_t tasti[DATI_MAX_TASTI];
    uint8_t ntasti, itasto;
    bool tasto_giu;
    uint32_t t_prossimo;     // prima di questo istante non si manda niente
    // pulsante
    bool liv_grezzo, liv;    // livello letto e livello stabile (true = premuto)
    uint32_t t_cambio_grezzo;
    uint32_t t_premuto;
    bool consumata;          // la pressione e' gia' servita a fermare
    motore_tasto_stato_t tasto[MT_NUMERO];   // Ferma e Ricomincia
    // LED
    uint32_t t_lampi;
    uint8_t lampi;           // lampi veloci da mostrare (avvisi)
    uint32_t abbina_fino;    // 0 = abbinamento chiuso
} motore_t;

void motore_init(motore_t *m, const dati_t *d, uint32_t ora);
// Nuovi valori caricati (o tolti con d->n == 0): si riparte dall'inizio.
// false (e niente cambia) se sta scrivendo: i dati non vanno toccati.
bool motore_nuovi_dati(motore_t *m, uint32_t ora);
// Livello del pulsante letto adesso (true = premuto). Si chiama spesso.
motore_evento_t motore_pulsante(motore_t *m, bool premuto, uint32_t ora);
// Livello di Ferma o Ricomincia letto adesso. Scollegati restano "non premuti".
motore_evento_t motore_tasto(motore_t *m, motore_tasto_t t, bool premuto, uint32_t ora);
// Passo della scrittura. hid_pronto: la tastiera USB puo' ricevere un rapporto.
motore_azione_t motore_passo(motore_t *m, uint32_t ora, bool hid_pronto, uint8_t *tasto);
bool motore_led(const motore_t *m, uint32_t ora);
bool motore_occupato(const motore_t *m);   // in attesa o mentre scrive
void motore_lampi(motore_t *m, uint8_t n, uint32_t ora);
const char *motore_nome_stato(motore_stato_t s);

#endif
