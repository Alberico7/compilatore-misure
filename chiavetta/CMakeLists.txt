cmake_minimum_required(VERSION 3.13)

set(PICO_BOARD pico2_w CACHE STRING "Scheda")
include(pico_sdk_import.cmake)

# La versione del firmware si cambia solo qui: arriva al firmware, a picotool e al sito.
project(chiavetta VERSION 1.1.0 LANGUAGES C CXX ASM)
set(CMAKE_C_STANDARD 11)

if (PICO_SDK_VERSION_STRING VERSION_LESS "2.1.0")
    message(FATAL_ERROR "Serve pico-sdk 2.1.0 o successivo")
endif()

pico_sdk_init()

add_executable(chiavetta
    src/main.c
    src/usb.c
    src/ble.c
    src/memoria.c
    src/dati.c
    src/motore.c
    src/protocollo.c
)
target_include_directories(chiavetta PRIVATE ${CMAKE_CURRENT_LIST_DIR}/src)
target_compile_options(chiavetta PRIVATE -Wall -Wextra)
# Niente rete: il chip wireless serve solo per Bluetooth e LED
target_compile_definitions(chiavetta PRIVATE CYW43_LWIP=0 FIRMWARE_VERSIONE="${PROJECT_VERSION}")
target_link_libraries(chiavetta
    pico_stdlib
    pico_unique_id
    pico_flash
    hardware_flash
    tinyusb_device
    pico_cyw43_arch_poll
    pico_btstack_ble
    pico_btstack_cyw43
)
pico_btstack_make_gatt_header(chiavetta PRIVATE "${CMAKE_CURRENT_LIST_DIR}/src/chiavetta.gatt")

pico_set_program_name(chiavetta "Chiavetta misure")
pico_set_program_description(chiavetta "Tastiera USB che scrive i valori del Compilatore misure")
pico_set_program_version(chiavetta "${PROJECT_VERSION}")
pico_set_program_url(chiavetta "https://alberico7.github.io/compilatore-misure/")

pico_enable_stdio_usb(chiavetta 0)
pico_enable_stdio_uart(chiavetta 0)
pico_add_extra_outputs(chiavetta)
