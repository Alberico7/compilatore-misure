// Descrittori USB. Due modi, scelti all'accensione:
//  - normale: un solo dispositivo, tastiera HID "boot" (la piu' semplice:
//    la riconoscono anche BIOS e sistemi ridotti). Niente disco, niente seriale.
//  - caricamento: una sola interfaccia WebUSB (vendor) per ricevere i valori
//    dal sito, con i descrittori Microsoft OS 2.0 per WinUSB: su Windows
//    non serve installare driver.
// VID 0x1209 (pid.codes) con PID di prova 0x0005 e 0x0006: vanno bene per un
// dispositivo privato. Modi diversi = PID diversi, cosi' Windows non confonde
// i descrittori salvati.
#include "usb.h"

#include <string.h>

#include "dati.h"
#include "pico/unique_id.h"
#include "tusb.h"

#define USB_VID         0x1209
#define PID_TASTIERA    0x0005
#define PID_CARICAMENTO 0x0006

#define RICHIESTA_WEBUSB    1
#define RICHIESTA_MICROSOFT 2

static bool caricamento;

void usb_imposta_modo(bool c) { caricamento = c; }

// --- dispositivo -------------------------------------------------------------

static const tusb_desc_device_t desc_tastiera = {
    .bLength = sizeof(tusb_desc_device_t),
    .bDescriptorType = TUSB_DESC_DEVICE,
    .bcdUSB = 0x0200,
    .bDeviceClass = 0x00,
    .bDeviceSubClass = 0x00,
    .bDeviceProtocol = 0x00,
    .bMaxPacketSize0 = CFG_TUD_ENDPOINT0_SIZE,
    .idVendor = USB_VID,
    .idProduct = PID_TASTIERA,
    .bcdDevice = 0x0100,
    .iManufacturer = 1,
    .iProduct = 2,
    .iSerialNumber = 3,
    .bNumConfigurations = 1,
};

static const tusb_desc_device_t desc_caricamento = {
    .bLength = sizeof(tusb_desc_device_t),
    .bDescriptorType = TUSB_DESC_DEVICE,
    .bcdUSB = 0x0210,               // 2.1: serve per il BOS (WebUSB)
    .bDeviceClass = 0x00,
    .bDeviceSubClass = 0x00,
    .bDeviceProtocol = 0x00,
    .bMaxPacketSize0 = CFG_TUD_ENDPOINT0_SIZE,
    .idVendor = USB_VID,
    .idProduct = PID_CARICAMENTO,
    .bcdDevice = 0x0100,
    .iManufacturer = 1,
    .iProduct = 4,
    .iSerialNumber = 3,
    .bNumConfigurations = 1,
};

const uint8_t *tud_descriptor_device_cb(void) {
    return (const uint8_t *)(caricamento ? &desc_caricamento : &desc_tastiera);
}

// --- tastiera ---------------------------------------------------------------

static const uint8_t desc_rapporto[] = { TUD_HID_REPORT_DESC_KEYBOARD() };

#define LUNG_CONF_TASTIERA (TUD_CONFIG_DESC_LEN + TUD_HID_DESC_LEN)
static const uint8_t conf_tastiera[] = {
    TUD_CONFIG_DESCRIPTOR(1, 1, 0, LUNG_CONF_TASTIERA, 0x00, 100),
    TUD_HID_DESCRIPTOR(0, 0, HID_ITF_PROTOCOL_KEYBOARD, sizeof(desc_rapporto), 0x81, 8, 5),
};

const uint8_t *tud_hid_descriptor_report_cb(uint8_t instance) {
    (void)instance;
    return desc_rapporto;
}

uint16_t tud_hid_get_report_cb(uint8_t instance, uint8_t report_id, hid_report_type_t report_type,
                               uint8_t *buffer, uint16_t reqlen) {
    (void)instance; (void)report_id; (void)report_type; (void)buffer; (void)reqlen;
    return 0;
}

void tud_hid_set_report_cb(uint8_t instance, uint8_t report_id, hid_report_type_t report_type,
                           const uint8_t *buffer, uint16_t bufsize) {
    // LED della tastiera (Bloc Num, ecc.): non servono.
    (void)instance; (void)report_id; (void)report_type; (void)buffer; (void)bufsize;
}

bool usb_tastiera_pronta(void) {
    return !caricamento && tud_mounted() && !tud_suspended() && tud_hid_ready();
}

void usb_tastiera_tasto(uint8_t tasto) {
    if (caricamento) return;
    if (tasto) {
        uint8_t tasti[6] = { tasto, 0, 0, 0, 0, 0 };
        tud_hid_keyboard_report(0, 0, tasti);   // modificatori sempre 0
    } else {
        tud_hid_keyboard_report(0, 0, NULL);
    }
}

// --- caricamento (WebUSB) -----------------------------------------------------

#define LUNG_CONF_CARICAMENTO (TUD_CONFIG_DESC_LEN + TUD_VENDOR_DESC_LEN)
static const uint8_t conf_caricamento[] = {
    TUD_CONFIG_DESCRIPTOR(1, 1, 0, LUNG_CONF_CARICAMENTO, 0x00, 100),
    TUD_VENDOR_DESCRIPTOR(0, 5, 0x02, 0x82, 64),
};

const uint8_t *tud_descriptor_configuration_cb(uint8_t index) {
    (void)index;
    return caricamento ? conf_caricamento : conf_tastiera;
}

#define LUNG_BOS (TUD_BOS_DESC_LEN + TUD_BOS_WEBUSB_DESC_LEN + TUD_BOS_MICROSOFT_OS_DESC_LEN)
#define LUNG_MS_OS_20 0xA2

static const uint8_t desc_bos[] = {
    TUD_BOS_DESCRIPTOR(LUNG_BOS, 2),
    TUD_BOS_WEBUSB_DESCRIPTOR(RICHIESTA_WEBUSB, 0),           // senza pagina di benvenuto
    TUD_BOS_MS_OS_20_DESCRIPTOR(LUNG_MS_OS_20, RICHIESTA_MICROSOFT),
};

const uint8_t *tud_descriptor_bos_cb(void) {
    return caricamento ? desc_bos : NULL;
}

// Microsoft OS 2.0 per un dispositivo con una sola interfaccia: intestazione,
// ID compatibile WINUSB e il GUID dell'interfaccia (generato apposta).
static const uint8_t desc_ms_os_20[] = {
    U16_TO_U8S_LE(0x000A), U16_TO_U8S_LE(MS_OS_20_SET_HEADER_DESCRIPTOR), U32_TO_U8S_LE(0x06030000),
    U16_TO_U8S_LE(LUNG_MS_OS_20),
    U16_TO_U8S_LE(0x0014), U16_TO_U8S_LE(MS_OS_20_FEATURE_COMPATBLE_ID),
    'W', 'I', 'N', 'U', 'S', 'B', 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    U16_TO_U8S_LE(LUNG_MS_OS_20 - 0x0A - 0x14), U16_TO_U8S_LE(MS_OS_20_FEATURE_REG_PROPERTY),
    U16_TO_U8S_LE(0x0007), U16_TO_U8S_LE(0x002A),
    'D', 0, 'e', 0, 'v', 0, 'i', 0, 'c', 0, 'e', 0, 'I', 0, 'n', 0, 't', 0, 'e', 0,
    'r', 0, 'f', 0, 'a', 0, 'c', 0, 'e', 0, 'G', 0, 'U', 0, 'I', 0, 'D', 0, 's', 0, 0, 0,
    U16_TO_U8S_LE(0x0050),
    '{', 0, '0', 0, 'F', 0, '6', 0, '0', 0, '6', 0, '9', 0, 'A', 0, '8', 0, '-', 0,
    '7', 0, 'D', 0, '5', 0, 'C', 0, '-', 0, '4', 0, 'A', 0, 'B', 0, '1', 0, '-', 0,
    'A', 0, '5', 0, 'A', 0, 'A', 0, '-', 0, 'D', 0, 'F', 0, '4', 0, 'E', 0, '1', 0,
    'C', 0, '9', 0, '9', 0, 'D', 0, '7', 0, 'C', 0, '1', 0, '}', 0, 0, 0, 0, 0,
};
TU_VERIFY_STATIC(sizeof(desc_ms_os_20) == LUNG_MS_OS_20, "lunghezza MS OS 2.0 sbagliata");

bool tud_vendor_control_xfer_cb(uint8_t rhport, uint8_t stage, const tusb_control_request_t *richiesta) {
    if (stage != CONTROL_STAGE_SETUP) return true;
    if (!caricamento) return false;
    if (richiesta->bmRequestType_bit.type == TUSB_REQ_TYPE_VENDOR &&
        richiesta->bRequest == RICHIESTA_MICROSOFT && richiesta->wIndex == 7) {
        return tud_control_xfer(rhport, richiesta, (void *)(uintptr_t)desc_ms_os_20, sizeof(desc_ms_os_20));
    }
    return false;   // tutto il resto: STALL
}

// --- stringhe ------------------------------------------------------------------

static const char *const stringhe[] = {
    NULL,                                   // 0: lingua
    "Compilatore misure",                  // 1: produttore
    NULL,                                   // 2: prodotto (tastiera): "Chiavetta misure 3F2A"
    NULL,                                   // 3: numero di serie (ID del chip)
    NULL,                                   // 4: prodotto (caricamento): "Chiavetta misure 3F2A - caricamento"
    "Caricamento valori",                   // 5: interfaccia WebUSB
};

static uint16_t buf_stringa[40];

const uint16_t *tud_descriptor_string_cb(uint8_t indice, uint16_t lingua) {
    (void)lingua;
    size_t n;
    if (indice == 0) {
        buf_stringa[1] = 0x0409;
        n = 1;
    } else if (indice == 3) {
        char seriale[2 * PICO_UNIQUE_BOARD_ID_SIZE_BYTES + 1];
        pico_get_unique_board_id_string(seriale, sizeof(seriale));
        n = strlen(seriale);
        for (size_t i = 0; i < n; i++) buf_stringa[1 + i] = (uint16_t)seriale[i];
    } else if (indice == 2 || indice == 4) {
        // il nome con le ultime 4 cifre dell'ID del chip, come nel Bluetooth
        char seriale[2 * PICO_UNIQUE_BOARD_ID_SIZE_BYTES + 1], s[40];
        pico_get_unique_board_id_string(seriale, sizeof(seriale));
        n = dati_nome(s, sizeof(s), seriale);
        static const char caricamento[] = " - caricamento";
        if (indice == 4 && n + sizeof(caricamento) <= sizeof(s)) {
            memcpy(s + n, caricamento, sizeof(caricamento));
            n += sizeof(caricamento) - 1;
        }
        if (n > 39) n = 39;
        for (size_t i = 0; i < n; i++) buf_stringa[1 + i] = (uint16_t)s[i];
    } else if (indice < sizeof(stringhe) / sizeof(stringhe[0])) {
        const char *s = stringhe[indice];
        n = strlen(s);
        if (n > 39) n = 39;
        for (size_t i = 0; i < n; i++) buf_stringa[1 + i] = (uint16_t)s[i];
    } else {
        return NULL;
    }
    buf_stringa[0] = (uint16_t)((TUSB_DESC_STRING << 8) | (2 * n + 2));
    return buf_stringa;
}
