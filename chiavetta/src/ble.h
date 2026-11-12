#ifndef BLE_H
#define BLE_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// Elabora un pacchetto arrivato via Bluetooth; scrive la risposta (0 = nessuna).
typedef size_t (*ble_elabora_t)(const uint8_t *p, size_t n, char *risposta, size_t max);

#define BLE_FINESTRA_ABBINAMENTO_MS 60000u

// Avvia il Bluetooth con il codice di abbinamento fisso (6 cifre).
void ble_avvia(uint32_t codice, ble_elabora_t elabora);
bool ble_attivo(void);
// Apre per 60 s la possibilita' di abbinare un nuovo telefono.
void ble_apri_abbinamento(uint32_t ora);
// Fine dell'abbinamento (0 = chiuso); da chiamare spesso per chiuderlo allo scadere.
uint32_t ble_abbinamento_fino(uint32_t ora);
// Numero di abbinamenti riusciti dall'accensione (per far lampeggiare il LED).
uint32_t ble_abbinamenti_riusciti(void);

#endif
