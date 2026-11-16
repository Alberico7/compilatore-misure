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
tasto_x      = 4.6;    // centro della colonna dei tasti: a sinistra la guida e' il bordo del coperchio
tasti_y      = [39, 23, 7];                    // dall'alto: Scrivi, Ferma, Ricomincia (tra uno e l'altro le viti)
tasti_simbolo = ["play", "pausa", "ripeti"];   // incisi accanto ai tasti
simbolo_lato = 10;     // grandezza dei simboli
incisione    = 0.6;    // profondita' di simboli e anelli

// Viti del Pico (autofilettanti M2)
colonnina_h  = 4;
colonnina_d  = 5;
foro_vite    = 1.6;

// Chiusura del coperchio: a destra ganci fissi, a sinistra due viti M3 in inserti filettati di ottone
// (si aggancia prima il lato destro, poi si abbassa il sinistro e si avvita)
labbro_h     = 4;      // bordo interno del coperchio
labbro_sp    = 1.2;
gancio_w     = 7;      // larghezza dei ganci
gancio_sp    = 0.7;    // quanto sporgono i ganci
viti_y       = [15, 31];       // tra un tasto e l'altro; i ganci a destra stanno alla stessa altezza
vite_x       = 3;              // centro delle viti (la colonnina si fonde con la parete)
inserto_foro = 4.0;    // foro per l'inserto: quello consigliato dal venditore (di solito 4,0 per gli M3)
inserto_l    = 4;      // lunghezza dell'inserto
colonna_d    = 7.2;    // colonnina che tiene l'inserto: almeno 1,6 mm di plastica intorno
vite_foro    = 3.4;    // passaggio della vite M3 nel coperchio
vite_testa   = 6.2;    // testa svasata M3 (DIN 7991 / ISO 10642: 6 mm)

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
pico_x0       = 8.6;    // bordo sinistro del Pico (subito dopo la colonna dei tasti)
gap_destra    = 0.6;    // aria tra il Pico e la parete destra

// ===================== Misure derivate =====================

interno_w = pico_x0 + pico_w + gap_destra;
interno_l = gap_usb + pico_l + gap_antenna;
alto_fondo = fondo_sp + interno_h;           // dove finisce il fondo e appoggia il coperchio
pico_z = fondo_sp + colonnina_h;             // sotto della scheda
usb_z = pico_z + pico_sp + usb_alta / 2;     // centro della presa
function P(p) = [pico_x0 + p[0], interno_l - gap_usb - p[1]];

// Calamite: due al centro, lontano dall'antenna
calamita_d   = 10;
calamita_h   = 3;
calamite     = [[interno_w / 2, 46], [interno_w / 2, 22]];
gancio_z     = alto_fondo - labbro_h + 0.3;    // sotto dei ganci fissi

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
            // colonnine per gli inserti delle viti del coperchio, fuse con la parete sinistra
            for (y = viti_y) translate([vite_x, y, fondo_sp - e]) cylinder(d = colonna_d, h = interno_h + e);
        }
        // fori per gli inserti, e sotto un po' di spazio per la punta della vite
        for (y = viti_y) {
            translate([vite_x, y, alto_fondo - inserto_l - 1]) cylinder(d = inserto_foro, h = inserto_l + 2);
            translate([vite_x, y, alto_fondo - inserto_l - 5]) cylinder(d = vite_foro, h = 5);
        }
        // fori delle viti
        for (f = pico_fori) translate([each P(f), fondo_sp]) cylinder(d = foro_vite, h = colonnina_h + 1);
        // sedi delle calamite, aperte sotto
        for (c = calamite) translate([each c, -e]) cylinder(d = calamita_d + 0.3, h = calamita_h + 0.2 + e);
        apertura_usb();
        // sedi dei ganci: scavate nel lato interno della parete destra, da fuori non si vedono
        for (y = viti_y)
            translate([interno_w - 1, y - gancio_w / 2 - 0.5, gancio_z - 0.3])
                cube([1 + gancio_sp + 0.2, gancio_w + 1, 2.5]);   // 0,2 mm di gioco intorno al gancio
        // prese d'aria su tutti e due i lati lunghi, tranne accanto a viti e ganci
        for (y = [4 : 3.5 : 53], lato = [0, 1])
            if (min([for (v = viti_y) abs(y - v)]) > 5)
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
        r = s / 2; w = max(0.9, s * 0.14);
        difference() {
            circle(r = r);
            circle(r = r - w);
            translate([-0.01, -0.01]) square(r + 1);   // apertura in alto a destra
        }
        translate([0, r - w / 2]) polygon([[0, w * 1.5], [0, -w * 1.5], [w * 2, 0]]);   // punta verso destra
    }
}

module gancio_profilo() {
    // sezione del gancio (x verso l'esterno, z verso l'alto, a coperchio montato):
    // smusso in basso per entrare, faccia piana in alto che aggancia la finestrella
    polygon([[0, 0], [gancio_sp, 1.5], [gancio_sp, 2], [0, 2]]);
}

module coperchio() {
    zl = alto_fondo;   // il coperchio appoggia qui
    difference() {
        union() {
            translate([-parete, -parete, zl]) blocco(interno_w + 2 * parete, interno_l + 2 * parete, coperchio_sp, raggio);
            // bordo interno, interrotto accanto alle colonnine delle viti e davanti alla presa USB.
            // A destra resta sopra il bordo del Pico, piu' in alto dei suoi componenti.
            difference() {
                translate([tolleranza, tolleranza, zl - labbro_h])
                    cube([interno_w - 2 * tolleranza, interno_l - 2 * tolleranza, labbro_h + e]);
                translate([tolleranza + labbro_sp, tolleranza + labbro_sp, zl - labbro_h - 1])
                    cube([interno_w - 2 * (tolleranza + labbro_sp), interno_l - 2 * (tolleranza + labbro_sp), labbro_h + 2]);
                for (y = viti_y)
                    translate([vite_x, y, zl - labbro_h - 1]) cylinder(d = colonna_d + 2 * tolleranza, h = labbro_h + 1);
                apertura_usb(1, 3);
            }
            // a destra: ganci fissi sul bordo
            for (y = viti_y)
                translate([interno_w - tolleranza - e, y - gancio_w / 2, gancio_z])
                    rotate([90, 0, 0]) mirror([0, 0, 1])
                        linear_extrude(gancio_w) gancio_profilo();
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
        // fori svasati per le viti
        for (y = viti_y) {
            translate([vite_x, y, zl - 1]) cylinder(d = vite_foro, h = coperchio_sp + 2);
            translate([vite_x, y, zl + coperchio_sp - (vite_testa - vite_foro) / 2])
                cylinder(d1 = vite_foro, d2 = vite_testa, h = (vite_testa - vite_foro) / 2 + e);
        }
        // anelli e simboli incisi
        zt = zl + coperchio_sp - incisione;
        for (i = [0 : len(tasti_y) - 1]) {
            translate([tasto_x, tasti_y[i], zt]) difference() { cylinder(d = 8.4, h = 1); translate([0, 0, -1]) cylinder(d = 7.2, h = 3); }
            translate([tasto_x + 5.8 + simbolo_lato / 2, tasti_y[i], zt]) linear_extrude(1) simbolo(tasti_simbolo[i], simbolo_lato);
        }
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
