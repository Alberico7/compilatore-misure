// Chiavetta-tastiera per la macchina - Raspberry Pi Pico 2 W.
//
// All'accensione:
//  - pulsante NON premuto: tastiera USB (solo cifre, "-" del tastierino e
//    INVIO) e, se e' impostato un codice, Bluetooth per ricevere i valori;
//  - pulsante premuto: caricamento con il cavo (WebUSB). Niente tastiera,
//    niente Bluetooth.
// La scrittura parte solo dal pulsante. WiFi mai acceso.
#include <stdio.h>
#include <string.h>

#include "ble.h"
#include "dati.h"
#include "hardware/gpio.h"
#include "memoria.h"
#include "motore.h"
#include "protocollo.h"
#include "pico/cyw43_arch.h"
#include "pico/binary_info.h"
#include "pico/stdlib.h"
#include "tusb.h"
#include "usb.h"

#define PIN_PULSANTE 15   // pulsante verso GND, resistenza interna verso l'alto

static dati_t dati;           // valori in uso
static dati_t nuovi;          // valori appena ricevuti, controllati qui prima di usarli
static motore_t motore;
static memoria_t mem;
static ricevitore_t ric_ble, ric_usb;
static telaio_t telaio;
static bool caricamento;
static sistema_t sistema = { .dati = &dati, .nuovi = &nuovi, .motore = &motore };

static uint32_t ora_ms(void) { return to_ms_since_boot(get_absolute_time()); }

static bool pulsante_premuto(void) { return !gpio_get(PIN_PULSANTE); }

static void carica_da_memoria(void) {
    memoria_leggi(&mem);
    uint32_t riga;
    if (mem.testo == NULL || dati_analizza(mem.testo, mem.lung, &dati, &riga) != DATI_OK) {
        memset(&dati, 0, sizeof(dati));
        mem.crc = 0;
    }
    sistema.crc = mem.crc;
    sistema.codice = mem.codice;
}

static bool salva_testo(const uint8_t *testo, uint32_t lung, void *ctx) {
    (void)ctx;
    return memoria_salva((const char *)testo, lung, sistema.codice);
}

static bool salva_codice(uint32_t codice, void *ctx) {
    (void)ctx;
    memoria_t m;
    memoria_leggi(&m);   // il testo attuale resta
    return memoria_salva(m.testo, m.testo ? m.lung : 0, codice) && memoria_cancella_abbinamenti();
}

// Pacchetto arrivato (dal Bluetooth o dal cavo). 'cavo' abilita il codice.
static size_t elabora(ricevitore_t *r, bool cavo, const uint8_t *p, size_t n, char *out, size_t max) {
    return protocollo_elabora(&sistema, r, cavo, p, n, out, max, ora_ms());
}

static size_t elabora_ble(const uint8_t *p, size_t n, char *out, size_t max) {
    return elabora(&ric_ble, false, p, n, out, max);
}

static void pacchetto_usb(const uint8_t *p, size_t n, void *ctx) {
    (void)ctx;
    char out[96];
    size_t k = elabora(&ric_usb, true, p, n, out, sizeof(out) - 1);
    if (k == 0) return;
    out[k++] = '\n';
    tud_vendor_write(out, (uint32_t)k);
    tud_vendor_write_flush();
}

#define PAUSA_NUOVO_INVIO_MS 1000u   // il sito manda ogni invio tutto di seguito
static uint32_t ultimo_dato_usb;
static bool ricevuto_usb;

static void ciclo_caricamento(uint32_t ora) {
    uint8_t buf[64];
    while (tud_vendor_available()) {
        uint32_t n = tud_vendor_read(buf, sizeof(buf));
        if (n == 0) break;
        // un invio interrotto a meta' non deve rovinare quello dopo
        if (ricevuto_usb && ora - ultimo_dato_usb > PAUSA_NUOVO_INVIO_MS) {
            telaio_azzera(&telaio);
            ric_azzera(&ric_usb);
        }
        ricevuto_usb = true;
        ultimo_dato_usb = ora;
        if (!telaio_aggiungi(&telaio, buf, n, pacchetto_usb, NULL)) {
            const char *e = "ERRORE PACCHETTO 0\n";
            tud_vendor_write(e, (uint32_t)strlen(e));
            tud_vendor_write_flush();
            ric_azzera(&ric_usb);
        }
    }
}

static bool wireless;

static void imposta_led(bool acceso) {
    static int ultimo = -1;
    if (!wireless) return;
    if (ultimo == (int)acceso) return;   // ogni scrittura passa dal chip wireless
    ultimo = acceso;
    cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, acceso);
}

int main(void) {
    bi_decl(bi_1pin_with_name(PIN_PULSANTE, "Pulsante verso GND"));
    gpio_init(PIN_PULSANTE);
    gpio_set_dir(PIN_PULSANTE, GPIO_IN);
    gpio_pull_up(PIN_PULSANTE);
    sleep_ms(20);
    caricamento = pulsante_premuto();

    sistema.caricamento = caricamento;
    sistema.salva_testo = salva_testo;
    sistema.salva_codice = salva_codice;
    carica_da_memoria();
    ric_azzera(&ric_ble);
    ric_azzera(&ric_usb);
    telaio_azzera(&telaio);
    motore_init(&motore, &dati, ora_ms());

    // Prima il chip wireless (serve anche per il LED; il WiFi non viene mai
    // attivato), poi l'USB: l'avvio del chip dura centinaia di millisecondi e
    // nel frattempo l'USB non risponderebbe al PC.
    wireless = cyw43_arch_init() == 0;   // se non parte, la tastiera funziona lo stesso

    usb_imposta_modo(caricamento);
    tusb_init();

    if (!caricamento && wireless) {
        ble_avvia(mem.codice, elabora_ble);
        if (dati.n) motore_lampi(&motore, 2, ora_ms());   // "pronto"
    }

    uint32_t abbinamenti_visti = 0;
    for (;;) {
        tud_task();
        if (wireless) cyw43_arch_poll();
        uint32_t ora = ora_ms();

        if (caricamento) {
            ciclo_caricamento(ora);
            // un lampo al secondo in attesa; acceso fisso mentre arrivano dati dal sito
            bool riceve = ricevuto_usb && ora - ultimo_dato_usb < 3000u;
            imposta_led(riceve || (ora % 1000) < 250);
            continue;
        }

        if (motore_pulsante(&motore, pulsante_premuto(), ora) == EV_ABBINA && ble_attivo()) {
            ble_apri_abbinamento(ora);
        }
        motore.abbina_fino = ble_abbinamento_fino(ora);
        if (ble_abbinamenti_riusciti() != abbinamenti_visti) {
            abbinamenti_visti = ble_abbinamenti_riusciti();
            motore_lampi(&motore, 5, ora);
        }

        uint8_t tasto = 0;
        switch (motore_passo(&motore, ora, usb_tastiera_pronta(), &tasto)) {
        case AZ_PREMI: usb_tastiera_tasto(tasto); break;
        case AZ_RILASCIA: usb_tastiera_tasto(0); break;
        case AZ_NIENTE: break;
        }
        imposta_led(motore_led(&motore, ora));
    }
}
