#ifndef USB_H
#define USB_H

#include <stdbool.h>
#include <stdint.h>

// Da chiamare prima di tusb_init(): sceglie i descrittori.
void usb_imposta_modo(bool caricamento);

// Tastiera: true se si puo' mandare un rapporto adesso.
bool usb_tastiera_pronta(void);
// Un solo tasto premuto (mai modificatori), oppure 0 = nessun tasto.
void usb_tastiera_tasto(uint8_t tasto);

#endif
