// Bluetooth LE: una periferica con un servizio per caricare i valori.
// Sicurezza:
//  - solo LE Secure Connections, con protezione MITM: il telefono deve
//    inserire il codice fisso di 6 cifre (la chiavetta non ha uno schermo);
//  - un nuovo abbinamento e' accettato solo con la finestra aperta (pulsante
//    tenuto premuto 5 s); fuori dalla finestra chi prova ad abbinarsi viene
//    scollegato;
//  - a abbinamento riuscito si cancellano tutti gli altri: un solo telefono;
//  - le caratteristiche si leggono e scrivono solo con collegamento autenticato.
// Dal Bluetooth si caricano solo valori: la scrittura parte solo dal pulsante.
#include "ble.h"

#include <string.h>

#include "btstack.h"
#include "chiavetta.h"   // generato da chiavetta.gatt
#include "dati.h"

#define H_COMANDO      ATT_CHARACTERISTIC_0f600002_7d5c_4ab1_a5aa_df4e1c99d7c0_01_VALUE_HANDLE
#define H_RISPOSTA     ATT_CHARACTERISTIC_0f600003_7d5c_4ab1_a5aa_df4e1c99d7c0_01_VALUE_HANDLE
#define H_RISPOSTA_CCC ATT_CHARACTERISTIC_0f600003_7d5c_4ab1_a5aa_df4e1c99d7c0_01_CLIENT_CONFIGURATION_HANDLE

static const uint8_t dati_annuncio[] = {
    0x02, BLUETOOTH_DATA_TYPE_FLAGS, 0x06,
    0x11, BLUETOOTH_DATA_TYPE_COMPLETE_LIST_OF_128_BIT_SERVICE_CLASS_UUIDS,
    // 0f600001-7d5c-4ab1-a5aa-df4e1c99d7c0, al contrario (little endian)
    0xc0, 0xd7, 0x99, 0x1c, 0x4e, 0xdf, 0xaa, 0xa5, 0xb1, 0x4a, 0x5c, 0x7d, 0x01, 0x00, 0x60, 0x0f,
};
static const uint8_t dati_risposta_scansione[] = {
    0x11, BLUETOOTH_DATA_TYPE_COMPLETE_LOCAL_NAME,
    'C', 'h', 'i', 'a', 'v', 'e', 't', 't', 'a', ' ', 'm', 'i', 's', 'u', 'r', 'e',
};

static bool attivo;
static ble_elabora_t elabora;
static hci_con_handle_t collegamento = HCI_CON_HANDLE_INVALID;
static bool notifiche;
static char risposta[96];
static uint16_t lung_risposta;
static uint32_t finestra_fino;   // 0 = chiusa
static uint32_t riusciti;

// scritture lunghe (Prepare Write), se il telefono non ha alzato l'MTU
static uint8_t lungo[600];
static uint16_t lung_lungo;
static bool lungo_ok;

static btstack_packet_callback_registration_t reg_hci, reg_sm;

static void rispondi(const uint8_t *p, size_t n) {
    size_t k = elabora(p, n, risposta, sizeof(risposta));
    if (k == 0) return;
    lung_risposta = (uint16_t)k;
    if (notifiche && collegamento != HCI_CON_HANDLE_INVALID)
        att_server_request_can_send_now_event(collegamento);
}

static void gestore_hci(uint8_t tipo, uint16_t canale, uint8_t *pacchetto, uint16_t dim) {
    (void)canale; (void)dim;
    if (tipo != HCI_EVENT_PACKET) return;
    switch (hci_event_packet_get_type(pacchetto)) {
    case BTSTACK_EVENT_STATE: {
        if (btstack_event_state_get_state(pacchetto) != HCI_STATE_WORKING) break;
        bd_addr_t nullo = { 0 };
        gap_advertisements_set_params(160, 320, 0, 0, nullo, 0x07, 0x00);  // 100-200 ms
        gap_advertisements_set_data(sizeof(dati_annuncio), (uint8_t *)dati_annuncio);
        gap_scan_response_set_data(sizeof(dati_risposta_scansione), (uint8_t *)dati_risposta_scansione);
        gap_advertisements_enable(1);
        break;
    }
    case HCI_EVENT_META_GAP:
        if (hci_event_gap_meta_get_subevent_code(pacchetto) == GAP_SUBEVENT_LE_CONNECTION_COMPLETE) {
            collegamento = gap_subevent_le_connection_complete_get_connection_handle(pacchetto);
            sm_request_pairing(collegamento);   // cifra subito (o abbina, se la finestra e' aperta)
        }
        break;
    case HCI_EVENT_DISCONNECTION_COMPLETE:
        collegamento = HCI_CON_HANDLE_INVALID;
        notifiche = false;
        lung_lungo = 0;
        lungo_ok = true;
        break;
    case ATT_EVENT_CAN_SEND_NOW:
        if (collegamento != HCI_CON_HANDLE_INVALID && lung_risposta)
            att_server_notify(collegamento, H_RISPOSTA, (uint8_t *)risposta, lung_risposta);
        break;
    default:
        break;
    }
}

static bool finestra_aperta(void) { return finestra_fino != 0; }

static void tieni_solo(int indice) {
    for (int i = 0; i < le_device_db_max_count(); i++)
        if (i != indice) le_device_db_remove(i);
}

static void gestore_sm(uint8_t tipo, uint16_t canale, uint8_t *pacchetto, uint16_t dim) {
    (void)canale; (void)dim;
    if (tipo != HCI_EVENT_PACKET) return;
    switch (hci_event_packet_get_type(pacchetto)) {
    case SM_EVENT_PAIRING_STARTED:
        if (!finestra_aperta())
            gap_disconnect(sm_event_pairing_started_get_handle(pacchetto));
        break;
    case SM_EVENT_JUST_WORKS_REQUEST:   // senza codice: mai
        sm_bonding_decline(sm_event_just_works_request_get_handle(pacchetto));
        break;
    case SM_EVENT_NUMERIC_COMPARISON_REQUEST:
        sm_bonding_decline(sm_event_numeric_comparison_request_get_handle(pacchetto));
        break;
    case SM_EVENT_PAIRING_COMPLETE:
        if (sm_event_pairing_complete_get_status(pacchetto) == ERROR_CODE_SUCCESS) {
            hci_con_handle_t h = sm_event_pairing_complete_get_handle(pacchetto);
            if (!finestra_aperta()) { gap_disconnect(h); break; }
            tieni_solo(sm_le_device_index(h));
            finestra_fino = 0;
            riusciti++;
        }
        break;
    case SM_EVENT_REENCRYPTION_COMPLETE:
        if (sm_event_reencryption_complete_get_status(pacchetto) == ERROR_CODE_PIN_OR_KEY_MISSING) {
            // il telefono ha dimenticato l'abbinamento: lo togliamo anche qui
            bd_addr_t ind;
            sm_event_reencryption_complete_get_address(pacchetto, ind);
            gap_delete_bonding((bd_addr_type_t)sm_event_reencryption_complete_get_addr_type(pacchetto), ind);
        }
        break;
    default:
        break;
    }
}

static uint16_t leggi_att(hci_con_handle_t h, uint16_t att, uint16_t offset, uint8_t *buf, uint16_t dim) {
    (void)h;
    if (att == H_RISPOSTA)
        return att_read_callback_handle_blob((const uint8_t *)risposta, lung_risposta, offset, buf, dim);
    return 0;
}

static int scrivi_att(hci_con_handle_t h, uint16_t att, uint16_t modo, uint16_t offset, uint8_t *buf, uint16_t dim) {
    (void)h;
    switch (modo) {
    case ATT_TRANSACTION_MODE_NONE:
        if (att == H_RISPOSTA_CCC) {
            notifiche = little_endian_read_16(buf, 0) == GATT_CLIENT_CHARACTERISTICS_CONFIGURATION_NOTIFICATION;
            return 0;
        }
        if (att == H_COMANDO) rispondi(buf, dim);
        return 0;
    case ATT_TRANSACTION_MODE_ACTIVE:
        if (att != H_COMANDO) return 0;
        if (offset == 0) { lung_lungo = 0; lungo_ok = true; }
        if (!lungo_ok || (uint32_t)offset + dim > sizeof(lungo) || offset != lung_lungo) {
            lungo_ok = false;
            return ATT_ERROR_INVALID_ATTRIBUTE_VALUE_LENGTH;
        }
        memcpy(lungo + offset, buf, dim);
        lung_lungo = (uint16_t)(offset + dim);
        return 0;
    case ATT_TRANSACTION_MODE_VALIDATE:
        return lungo_ok ? 0 : ATT_ERROR_INVALID_ATTRIBUTE_VALUE_LENGTH;
    case ATT_TRANSACTION_MODE_EXECUTE:
        if (lung_lungo) rispondi(lungo, lung_lungo);
        lung_lungo = 0;
        return 0;
    case ATT_TRANSACTION_MODE_CANCEL:
        lung_lungo = 0;
        lungo_ok = true;
        return 0;
    default:
        return 0;
    }
}

void ble_avvia(uint32_t codice, ble_elabora_t f) {
    if (!dati_codice_valido(codice)) return;
    elabora = f;
    lungo_ok = true;

    l2cap_init();
    sm_init();
    sm_set_secure_connections_only_mode(true);
    sm_set_io_capabilities(IO_CAPABILITY_DISPLAY_ONLY);
    sm_set_authentication_requirements(SM_AUTHREQ_SECURE_CONNECTION | SM_AUTHREQ_MITM_PROTECTION | SM_AUTHREQ_BONDING);
    sm_set_encryption_key_size_range(16, 16);
    sm_use_fixed_passkey_in_display_role(codice);

    att_server_init(profile_data, leggi_att, scrivi_att);

    reg_hci.callback = gestore_hci;
    hci_add_event_handler(&reg_hci);
    reg_sm.callback = gestore_sm;
    sm_add_event_handler(&reg_sm);
    att_server_register_packet_handler(gestore_hci);

    hci_power_control(HCI_POWER_ON);
    attivo = true;
}

bool ble_attivo(void) { return attivo; }

void ble_apri_abbinamento(uint32_t ora) {
    if (!attivo) return;
    finestra_fino = ora + BLE_FINESTRA_ABBINAMENTO_MS;
    if (finestra_fino == 0) finestra_fino = 1;
}

uint32_t ble_abbinamento_fino(uint32_t ora) {
    if (finestra_fino && (int32_t)(ora - finestra_fino) >= 0) finestra_fino = 0;
    return finestra_fino;
}

uint32_t ble_abbinamenti_riusciti(void) { return riusciti; }
