# Compila il firmware della chiavetta su Windows: crea chiavetta\build\chiavetta.uf2
# (che "npm run build" mette nel sito).
#
# Gli strumenti si cercano nella cartella dell'estensione "Raspberry Pi Pico" per VS Code
# (%USERPROFILE%\.pico-sdk), oppure in quella indicata da PICO_STRUMENTI o da -Strumenti:
# pico-sdk, arm-none-eabi-gcc, cmake, ninja, picotool, pioasm, python.
# PICO_SDK_PATH, se impostata, sceglie l'SDK.
#
# Uso:  npm run firmware
#       powershell -ExecutionPolicy Bypass -File chiavetta\compila.ps1 [-Strumenti cartella] [-Pulisci]
param(
    [string]$Strumenti = $(if ($env:PICO_STRUMENTI) { $env:PICO_STRUMENTI } else { Join-Path $env:USERPROFILE '.pico-sdk' }),
    [switch]$Pulisci
)
$ErrorActionPreference = 'Stop'
$sorgenti = $PSScriptRoot
$build = Join-Path $sorgenti 'build'

function Esci([string]$messaggio) {
    Write-Host ''
    Write-Host "ERRORE: $messaggio" -ForegroundColor Red
    Write-Host 'Installa l''estensione "Raspberry Pi Pico" in VS Code e crea un progetto di prova una volta:'
    Write-Host 'scarica SDK e strumenti in %USERPROFILE%\.pico-sdk. Vedi chiavetta\LEGGIMI.md, "Compilare sul proprio PC".'
    exit 1
}

# Il file "nome" più recente (per percorso) dentro la cartella degli strumenti, oppure $null.
function Trova([string]$nome, [int]$profondita = 5) {
    Get-ChildItem -Path $Strumenti -Recurse -Depth $profondita -Filter $nome -File -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1
}

if (-not (Test-Path $Strumenti)) { Esci "cartella degli strumenti non trovata: $Strumenti" }
Write-Host "Strumenti in $Strumenti"

# pico-sdk
$sdk = $env:PICO_SDK_PATH
if (-not $sdk) {
    $f = Trova 'pico_sdk_init.cmake' 3
    if (-not $f) { Esci 'pico-sdk non trovato (manca pico_sdk_init.cmake)' }
    $sdk = $f.DirectoryName
}
if (-not (Test-Path (Join-Path $sdk 'lib\btstack\src'))) { Esci "l'SDK in $sdk non ha i sottomoduli (btstack, tinyusb, cyw43-driver)" }

$gcc = Trova 'arm-none-eabi-gcc.exe'
$cmake = Trova 'cmake.exe'
$ninja = Trova 'ninja.exe'
$picotool = Trova 'picotoolConfig.cmake'
$pioasm = Trova 'pioasmConfig.cmake'
if (-not $gcc) { Esci 'compilatore arm-none-eabi-gcc non trovato' }
if (-not $cmake) { Esci 'cmake non trovato' }
if (-not $ninja) { Esci 'ninja non trovato' }
if (-not $picotool) { Esci 'picotool non trovato' }
if (-not $pioasm) { Esci 'pioasm non trovato' }

$percorso = @($gcc.DirectoryName, $cmake.DirectoryName, $ninja.DirectoryName)
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    $python = Trova 'python.exe' 4
    if (-not $python) { Esci 'Python non trovato (serve per il database Bluetooth)' }
    $percorso += $python.DirectoryName
}
$env:PATH = ($percorso -join ';') + ';' + $env:PATH
$env:PICO_SDK_PATH = $sdk

Write-Host "  SDK:       $sdk"
Write-Host "  gcc:       $($gcc.FullName)"
Write-Host "  cmake:     $($cmake.FullName)"
Write-Host "  ninja:     $($ninja.FullName)"
Write-Host "  picotool:  $($picotool.DirectoryName)"
Write-Host "  pioasm:    $($pioasm.DirectoryName)"

if ($Pulisci -and (Test-Path $build)) { Remove-Item -Recurse -Force $build }
if (-not (Test-Path (Join-Path $build 'build.ninja'))) {
    & $cmake.FullName -S $sorgenti -B $build -G Ninja -DCMAKE_BUILD_TYPE=Release `
        "-Dpicotool_DIR=$($picotool.DirectoryName)" "-Dpioasm_DIR=$($pioasm.DirectoryName)"
    if ($LASTEXITCODE -ne 0) { Esci 'configurazione con CMake non riuscita (vedi sopra)' }
}
& $cmake.FullName --build $build
if ($LASTEXITCODE -ne 0) { Esci 'compilazione non riuscita (vedi sopra)' }

$uf2 = Join-Path $build 'chiavetta.uf2'
if (-not (Test-Path $uf2)) { Esci 'chiavetta.uf2 non creato' }
$versione = [regex]::Match((Get-Content (Join-Path $sorgenti 'CMakeLists.txt') -Raw), 'project\(chiavetta VERSION (\S+)').Groups[1].Value
Write-Host ''
Write-Host "Fatto: $uf2 (versione $versione, $([math]::Round((Get-Item $uf2).Length / 1KB)) KB)" -ForegroundColor Green
