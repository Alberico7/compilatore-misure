// Case per la chiavetta del Compilatore misure: Pico 2 W + tre pulsantini tattili 6 x 6 mm.
// Progetto: docs/2026-11-15-case-chiavetta.md - Istruzioni: case/LEGGIMI.md
// Licenza: PolyForm Noncommercial 1.0.0 (vedi LICENSE nella radice del repository).
//
// Uso: aprire in OpenSCAD, scegliere "parte" qui sotto, F6, poi File > Export > STL.
// Da riga di comando: openscad -o case-fondo.stl -D 'parte="fondo"' case-chiavetta.scad
//
// Coordinate: visto dall'alto con la presa USB in alto. Origine nell'angolo in basso a sinistra
// della cavita' interna, z = 0 sotto il fondo. Misure in millimetri.

parte = "insieme";   // "fondo", "coperchio" (gia' capovolto per la stampa), "insieme", "esploso"

// ===================== Misure da adattare =====================

tolleranza   = 0.2;    // gioco tra pezzi che si incastrano
parete       = 2;      // spessore delle pareti
fondo_sp     = 1.6;    // spessore del fondo
coperchio_sp = 2;      // spessore del coperchio
raggio       = 3;      // raggio degli angoli esterni
interno_h    = 12;     // altezza interna (dal fondo al coperchio)

// Pulsantini tattili
tasto_lato   = 6;      // lato del corpo
tasto_corpo  = 3.5;    // altezza del solo corpo (senza pulsante)
tasto_d      = 3.5;    // diametro del pulsante
tasto_x      = 6;      // centro della colonna dei tasti
tasti_y      = [38, 23, 8];                    // dall'alto: Scrivi, Ferma, Ricomincia
tasti_simbolo = ["play", "pausa", "ripeti"];   // incisi accanto ai tasti
simbolo_lato = 5;      // grandezza dei simboli
incisione    = 0.6;    // profondita' di simboli e anelli
carattere    = "Liberation Sans:style=Bold";   // solo per la scritta LED

// Viti del Pico (autofilettanti M2)
colonnina_h  = 4;
colonnina_d  = 5;
foro_vite    = 1.6;

// Incastro del coperchio
labbro_h     = 4;      // bordo interno del coperchio
labbro_sp    = 1.2;
linguetta_l  = 9;      // lunghezza delle linguette elastiche
linguetta_w  = 7;
dentino      = 0.7;    // quanto sporge il dentino
linguette_y  = [15.5, 30.5];   // tra un tasto e l'altro: le guide dei tasti sono vicine alla parete

// ===================== Pico 2 W (datasheet, figura 3) =====================
// [px, py]: px dal lato dei pin 1-20, py dal lato della presa USB.

pico_l = 51; pico_w = 21; pico_sp = 1;
pico_fori     = [[4.8, 2], [16.2, 2], [4.8, 49], [16.2, 49]];
pico_led      = [4.75, 4.6];
pico_bootsel  = [6.93, 11.76];
usb_px        = 10.45;  // centro della presa
usb_sporgenza = 1.3;    // la presa sporge oltre il bordo della scheda
usb_alta      = 2.9;
gap_usb       = usb_sporgenza + 0.5;
gap_antenna   = 5;      // aria davanti all'antenna
pico_x0       = 10;     // bordo sinistro del Pico (subito dopo la colonna dei tasti)

// ===================== Misure derivate =====================

interno_w = pico_x0 + pico_w + 3;
interno_l = gap_usb + pico_l + gap_antenna;
alto_fondo = fondo_sp + interno_h;           // dove finisce il fondo e appoggia il coperchio
pico_z = fondo_sp + colonnina_h;             // sotto della scheda
usb_z = pico_z + pico_sp + usb_alta / 2;     // centro della presa
function P(p) = [pico_x0 + p[0], interno_l - gap_usb - p[1]];

// Calamite: due sotto la colonna dei tasti, due sotto il Pico (lontano dall'antenna)
calamita_d   = 10;
calamita_h   = 3;
calamite     = [[tasto_x, 48], [tasto_x, 9.5], [pico_x0 + pico_w / 2, 40], [pico_x0 + pico_w / 2, 22]];

$fn = 48;
e = 0.01;

// ===================== Pezzi =====================

module blocco(w, l, h, r) {
    hull() for (x = [r, w - r], y = [r, l - r]) translate([x, y, 0]) cylinder(r = r, h = h);
}

// apertura per la spina micro-USB (anche il guscio entra nella parete);
// "dentro": quanto prosegue verso l'interno (nel fondo solo la parete, per non intaccare le colonnine)
module apertura_usb(margine = 0, dentro = e) {
    translate([P([usb_px, 0])[0] - 6 - margine, interno_l - dentro, usb_z - 4 - margine])
        cube([12 + 2 * margine, parete + dentro + 1, 8 + 2 * margine]);
}

module fondo() {
    difference() {
        union() {
            difference() {
                translate([-parete, -parete, 0])
                    blocco(interno_w + 2 * parete, interno_l + 2 * parete, alto_fondo, raggio);
                translate([0, 0, fondo_sp]) cube([interno_w, interno_l, interno_h + 1]);
            }
            for (f = pico_fori) translate([each P(f), fondo_sp - e]) cylinder(d = colonnina_d, h = colonnina_h + e);
            // rialzi per le sedi delle calamite: vicino alla parete si fondono con lei (mai tangenti, se no il pezzo e' difettoso)
            for (c = calamite) translate([each c, fondo_sp - e]) cylinder(d = calamita_d + 2.6, h = calamita_h + 1 - fondo_sp + e);
        }
        // fori delle viti
        for (f = pico_fori) translate([each P(f), fondo_sp]) cylinder(d = foro_vite, h = colonnina_h + 1);
        // sedi delle calamite, aperte sotto
        for (c = calamite) translate([each c, -e]) cylinder(d = calamita_d + 0.3, h = calamita_h + 0.2 + e);
        apertura_usb();
        // finestrelle per i dentini delle linguette
        for (y = linguette_y, lato = [0, 1])
            translate([lato == 0 ? -parete - 1 : interno_w - 1,
                       y - linguetta_w / 2 - 0.5,
                       alto_fondo - linguetta_l - 0.5])
                cube([parete + 2, linguetta_w + 1, 3.2]);   // 0,2 mm di gioco sopra il dentino
        // prese d'aria sui lati lunghi, tra le finestrelle e la presa USB
        for (y = [39 : 3.5 : 53], lato = [0, 1])
            translate([lato == 0 ? -parete - 1 : interno_w - 1, y - 0.8, fondo_sp + 2.5]) cube([parete + 2, 1.6, 6]);
        // prese d'aria in fondo, davanti all'antenna
        for (x = [6 : 3.5 : interno_w - 5])
            translate([x - 0.8, -parete - 1, fondo_sp + 2.5]) cube([1.6, parete + 2, 6]);
    }
}

// Simboli dei tasti, centrati e larghi circa "s" mm. Tratti di almeno 0,9 mm, stampabili.
module simbolo(nome, s) {
    if (nome == "play")          // Scrivi
        polygon([[-s * 0.4, -s / 2], [-s * 0.4, s / 2], [s * 0.5, 0]]);
    else if (nome == "pausa")    // Ferma
        for (x = [-s * 0.3, s * 0.3]) translate([x - s * 0.14, -s / 2]) square([s * 0.28, s]);
    else if (nome == "ripeti") { // Ricomincia: freccia in giro, in senso orario
        r = s / 2; w = 0.9;
        difference() {
            circle(r = r);
            circle(r = r - w);
            translate([-0.01, -0.01]) square(r + 1);   // apertura in alto a destra
        }
        translate([0, r - w / 2]) polygon([[0, 1.4], [0, -1.4], [1.8, 0]]);   // punta verso destra
    }
}

module dentino_profilo() {
    // sezione del dentino (x verso l'esterno, z verso l'alto, a coperchio montato):
    // scivolo in basso per entrare, faccia piana in alto che aggancia la finestrella
    polygon([[0, 0], [dentino, 1.5], [dentino, 2], [0, 2]]);
}

module coperchio() {
    zl = alto_fondo;   // il coperchio appoggia qui
    difference() {
        union() {
            translate([-parete, -parete, zl]) blocco(interno_w + 2 * parete, interno_l + 2 * parete, coperchio_sp, raggio);
            // bordo interno, interrotto accanto alle linguette e davanti alla presa USB
            difference() {
                translate([tolleranza, tolleranza, zl - labbro_h])
                    cube([interno_w - 2 * tolleranza, interno_l - 2 * tolleranza, labbro_h + e]);
                translate([tolleranza + labbro_sp, tolleranza + labbro_sp, zl - labbro_h - 1])
                    cube([interno_w - 2 * (tolleranza + labbro_sp), interno_l - 2 * (tolleranza + labbro_sp), labbro_h + 2]);
                for (y = linguette_y, lato = [0, 1])
                    translate([lato == 0 ? -1 : interno_w - 3, y - linguetta_w / 2 - 1, zl - labbro_h - 1])
                        cube([4, linguetta_w + 2, labbro_h + 1]);
                apertura_usb(1, 3);
            }
            // linguette elastiche con dentino
            for (y = linguette_y, lato = [0, 1]) {
                xs = lato == 0 ? tolleranza : interno_w - tolleranza - labbro_sp;
                translate([xs, y - linguetta_w / 2, zl - linguetta_l]) cube([labbro_sp, linguetta_w, linguetta_l + e]);
                translate([lato == 0 ? tolleranza : interno_w - tolleranza, y - linguetta_w / 2, zl - linguetta_l + 0.5])
                    mirror([lato == 0 ? 1 : 0, 0, 0]) rotate([90, 0, 0]) mirror([0, 0, 1])
                        linear_extrude(linguetta_w) dentino_profilo();
            }
            // guide dei pulsantini: tengono il corpo sui due lati senza zampine
            for (y = tasti_y, s = [-1, 1])
                translate([tasto_x + s * (tasto_lato / 2 + 0.15) + (s < 0 ? -1.2 : 0), y - tasto_lato / 2, zl - tasto_corpo + 0.5])
                    cube([1.2, tasto_lato, tasto_corpo - 0.5 + e]);
            // tubetti sopra LED e BOOTSEL
            translate([each P(pico_led), pico_z + pico_sp + usb_alta + 0.6]) cylinder(d = 4.4, h = zl - (pico_z + pico_sp + usb_alta + 0.6) + e);
            translate([each P(pico_bootsel), pico_z + pico_sp + 3]) cylinder(d = 4, h = zl - (pico_z + pico_sp + 3) + e);
        }
        // fori dei pulsanti, del LED e del BOOTSEL
        for (y = tasti_y) translate([tasto_x, y, zl - 1]) cylinder(d = tasto_d + 0.6, h = coperchio_sp + 2);
        translate([each P(pico_led), 0]) cylinder(d = 3, h = 50);
        translate([each P(pico_bootsel), 0]) cylinder(d = 2.2, h = 50);
        // anelli e simboli incisi
        zt = zl + coperchio_sp - incisione;
        for (i = [0 : len(tasti_y) - 1]) {
            translate([tasto_x, tasti_y[i], zt]) difference() { cylinder(d = 8.4, h = 1); translate([0, 0, -1]) cylinder(d = 7.2, h = 3); }
            translate([tasto_x + 8, tasti_y[i], zt]) linear_extrude(1) simbolo(tasti_simbolo[i], simbolo_lato);
        }
        translate([P(pico_led)[0] + 3, P(pico_led)[1], zt]) linear_extrude(1) text("LED", size = 2.2, font = carattere, valign = "center");
    }
}

// ===================== Controllo =====================
// Ingombri del Pico, della presa USB, della spina e dei pulsantini: "controllo" mostra cosa tocca il case
// (deve risultare vuoto), "ingombri" li mostra insieme al case.

module ingombri() {
    // scheda e presa USB
    translate([pico_x0, interno_l - gap_usb - pico_l, pico_z]) cube([pico_w, pico_l, pico_sp]);
    translate([P([usb_px, 0])[0] - 4, interno_l - gap_usb - 4.5, pico_z + pico_sp]) cube([8, 4.5 + usb_sporgenza, usb_alta]);
    // guscio della spina (11 x 7,5 mm), infilato fino alla presa
    translate([P([usb_px, 0])[0] - 5.5, interno_l - gap_usb + usb_sporgenza + 0.1, usb_z - 3.75]) cube([11, 15, 7.5]);
    // pulsantini: corpo, pulsante e zampine (verso i lati senza guide)
    for (y = tasti_y) {
        zc = alto_fondo - tasto_corpo;
        translate([tasto_x - tasto_lato / 2, y - tasto_lato / 2, zc]) cube([tasto_lato, tasto_lato, tasto_corpo - e]);
        translate([tasto_x, y, zc]) cylinder(d = tasto_d, h = 8);
        for (sx = [-2.25, 2.25], sy = [-1, 1]) translate([tasto_x + sx - 0.4, y + sy * 3.25 - 0.4, zc - 3.5]) cube([0.8, 0.8, 3.5]);
    }
}

// ===================== Scelta della parte =====================

if (parte == "controllo") intersection() { union() { fondo(); coperchio(); } ingombri(); }
else if (parte == "ingombri") { color("SteelBlue", 0.4) fondo(); color("Gainsboro", 0.4) coperchio(); color("Green") ingombri(); }
else if (parte == "fondo") fondo();
else if (parte == "coperchio") translate([0, 0, alto_fondo + coperchio_sp]) rotate([180, 0, 0]) coperchio();
else if (parte == "esploso") { color("SteelBlue") fondo(); color("Gainsboro") translate([0, 0, 15]) coperchio(); }
else { color("SteelBlue") fondo(); color("Gainsboro") coperchio(); }
