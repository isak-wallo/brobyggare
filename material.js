// Material och tvärsnitt.
//
// Spelläget har tre storlekar per material (liten, mellan, stor). Var och en
// är en riktig profil, så att lösaren räknar med verkliga A, I, W, vikt och
// pris. Enheter: SI (m, kg, N, Pa). Priserna är i spelets pengar, $$
// (ungefär som kronor).

const MATERIAL = {
    limtra: {
        namn: 'Limträ GL30c',
        E: 13000e6,        // elasticitetsmodul, medelvärde (styvheten)
        E05: 10800e6,      // 5 %-fraktil (knäckning)
        densitet: 430,     // kg/m³
        fm: 30e6,          // böjning
        ft: 19.5e6,        // drag längs fibrerna
        fc: 24.5e6,        // tryck längs fibrerna
        fv: 3.5e6,         // skjuvning
        prisM3: 9000       // $$/m³
    }
};

// Ett rektangulärt tvärsnitt b × h i millimeter.
function rektangel(material, b, h) {
    const bm = b / 1000, hm = h / 1000, mat = MATERIAL[material];
    const A = bm * hm;
    return {
        namn: b + '×' + h, material, b: bm, h: hm,
        A, I: bm * hm ** 3 / 12, W: bm * hm ** 2 / 6,
        massa: A * mat.densitet,                       // kg/m
        pris: Math.round(A * mat.prisM3 / 10) * 10     // $$/m
    };
}

const STORLEKAR = ['Pytte', 'Liten', 'Mellan', 'Stor', 'Jätte'];

const PROFILER = {
    limtra: [rektangel('limtra', 56, 135), rektangel('limtra', 66, 180), rektangel('limtra', 90, 270),
             rektangel('limtra', 140, 405), rektangel('limtra', 190, 630)]
};

// Vägbanan: plankor ovanpå balken som keIWs går på. Väger och kostar per
// meter, utöver balken under.
const VAG = { massa: 200, pris: 400, tjocklek: 0.12 };

// Förbanden (knutpunkterna man bygger). Ledat: balkarna kan vrida sig
// fritt mot varandra. Styvt: de sitter ihop och böjer tillsammans.
// Fästpunkterna i berget kostar inget.
const FORBAND = { massa: 20, pris: { ledat: 300, styvt: 500 } };
