#include "motore.h"

#include <string.h>

// true se 'ora' e' arrivato a 't' (regge il giro del contatore a 32 bit)
static bool arrivato(uint32_t ora, uint32_t t) { return (int32_t)(ora - t) >= 0; }

const char *motore_nome_stato(motore_stato_t s) {
    switch (s) {
    case ST_VUOTO: return "VUOTO";
    case ST_PRONTO: return "PRONTO";
    case ST_ATTESA: return "ATTESA";
    case ST_SCRIVE: return "SCRIVE";
    case ST_FERMATO: return "FERMATO";
    case ST_FINITO: return "FINITO";
    }
    return "?";
}

static void stato_fermo(motore_t *m) {
    const dati_t *d = m->dati;
    if (d == NULL || d->n == 0) m->stato = ST_VUOTO;
    else if (m->pos == 0) m->stato = ST_PRONTO;
    else if (m->pos >= d->n) m->stato = ST_FINITO;
    else m->stato = ST_FERMATO;
}

void motore_init(motore_t *m, const dati_t *d, uint32_t ora) {
    memset(m, 0, sizeof(*m));
    m->dati = d;
    m->t_cambio_grezzo = ora;
    stato_fermo(m);
}

bool motore_occupato(const motore_t *m) {
    return m->stato == ST_ATTESA || m->stato == ST_SCRIVE;
}

bool motore_nuovi_dati(motore_t *m, uint32_t ora) {
    if (motore_occupato(m)) return false;
    m->pos = 0;
    m->ferma_richiesto = false;
    stato_fermo(m);
    if (m->stato != ST_VUOTO) motore_lampi(m, 3, ora);
    return true;
}

void motore_lampi(motore_t *m, uint8_t n, uint32_t ora) {
    m->lampi = n;
    m->t_lampi = ora;
}

static void prepara_valore(motore_t *m) {
    m->ntasti = (uint8_t)dati_tasti(m->dati->valori[m->pos], m->tasti, sizeof(m->tasti));
    m->itasto = 0;
    m->tasto_giu = false;
}

motore_evento_t motore_pulsante(motore_t *m, bool premuto, uint32_t ora) {
    if (premuto != m->liv_grezzo) {
        m->liv_grezzo = premuto;
        m->t_cambio_grezzo = ora;
    }
    if (m->liv_grezzo == m->liv || !arrivato(ora, m->t_cambio_grezzo + MOTORE_RIMBALZO_MS))
        return EV_NIENTE;
    m->liv = m->liv_grezzo;

    if (m->liv) {   // appena premuto
        m->t_premuto = ora;
        m->consumata = false;
        if (m->stato == ST_ATTESA) {          // annulla prima di iniziare
            stato_fermo(m);
            m->consumata = true;
        } else if (m->stato == ST_SCRIVE) {   // ferma dopo il valore in corso
            m->ferma_richiesto = true;
            m->consumata = true;
        }
        return EV_NIENTE;
    }

    // appena rilasciato
    if (m->consumata) return EV_NIENTE;
    uint32_t durata = ora - m->t_premuto;
    if (durata < MOTORE_LUNGA_MS) {
        if (m->stato == ST_PRONTO || m->stato == ST_FERMATO) {
            m->stato = ST_ATTESA;
            m->t_attesa = ora + MOTORE_ATTESA_MS;
        }
        return EV_NIENTE;
    }
    if (motore_occupato(m)) return EV_NIENTE;
    if (durata < MOTORE_ABBINA_MS) {
        if (m->dati && m->dati->n > 0) {
            m->pos = 0;
            stato_fermo(m);
            motore_lampi(m, 3, ora);
        }
        return EV_NIENTE;
    }
    return EV_ABBINA;
}

motore_azione_t motore_passo(motore_t *m, uint32_t ora, bool hid_pronto, uint8_t *tasto) {
    if (m->stato == ST_ATTESA && arrivato(ora, m->t_attesa)) {
        m->stato = ST_SCRIVE;
        m->ferma_richiesto = false;
        m->fine = dati_fine_blocco(m->dati, m->pos);
        m->t_prossimo = ora;
        prepara_valore(m);
    }
    if (m->stato != ST_SCRIVE) return AZ_NIENTE;
    if (!arrivato(ora, m->t_prossimo) || !hid_pronto) return AZ_NIENTE;

    if (!m->tasto_giu) {
        *tasto = m->tasti[m->itasto];
        m->tasto_giu = true;
        return AZ_PREMI;
    }

    // rilascia il tasto premuto e prepara il prossimo
    m->tasto_giu = false;
    bool invio = m->tasti[m->itasto] == TASTO_INVIO;
    m->t_prossimo = ora + (invio ? m->dati->ritardo_invio_ms : m->dati->ritardo_carattere_ms);
    m->itasto++;
    if (m->itasto >= m->ntasti) {
        m->pos++;
        if (m->ferma_richiesto || m->pos >= m->fine) {
            m->ferma_richiesto = false;
            stato_fermo(m);
        } else {
            prepara_valore(m);
        }
    }
    return AZ_RILASCIA;
}

static bool onda(uint32_t t, uint32_t periodo, uint32_t acceso) { return (t % periodo) < acceso; }

bool motore_led(const motore_t *m, uint32_t ora) {
    if (m->lampi && !arrivato(ora, m->t_lampi + 200u * m->lampi))
        return onda(ora - m->t_lampi, 200, 100);
    if (m->liv && !m->consumata) {   // mentre si tiene premuto si vede a che punto si e'
        uint32_t d = ora - m->t_premuto;
        if (d < MOTORE_LUNGA_MS) return true;
        if (d < MOTORE_ABBINA_MS) return onda(d, 200, 100);
        return onda(d, 1000, 100) || (d % 1000 >= 200 && d % 1000 < 300);
    }
    if (m->abbina_fino && !arrivato(ora, m->abbina_fino))
        return onda(ora, 1000, 100) || (ora % 1000 >= 200 && ora % 1000 < 300);
    switch (m->stato) {
    case ST_VUOTO: return onda(ora, 2000, 1000);
    case ST_PRONTO:
    case ST_ATTESA: return true;
    case ST_SCRIVE: return onda(ora, 200, 100);
    case ST_FERMATO: return onda(ora, 1000, 500);
    case ST_FINITO: return onda(ora, 2000, 100);
    }
    return false;
}
