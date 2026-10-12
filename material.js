// Material och tvärsnitt.
//
// Spelläget har fem storlekar per material (Pytte–Jätte). Var och en är en
// riktig profil, så att lösaren räknar med verkliga A, I, W, vikt och pris.
// Enheter: SI (m, kg, N, Pa). Priserna är i spelets pengar, $$ (ungefär som
// kronor).
//
// typ:     styr brottsregeln (BROTTREGLER här, BROTT i fysik.js):
//          'tra', 'stal' eller 'vajer'
// kommer:  finns inte i spelet än; visas gråat i menyn med preliminära
//          värden

const MATERIAL = {
    limtra: {
        namn: 'Limträ GL30c',
        typ: 'tra',
        E: 13000e6,        // elasticitetsmodul, medelvärde (styvheten)
        E05: 10800e6,      // 5 %-fraktil (knäckning)
        densitet: 430,     // kg/m³
        fm: 30e6,          // böjning
        ft: 19.5e6,        // drag längs fibrerna
        fc: 24.5e6,        // tryck längs fibrerna
        fv: 3.5e6,         // skjuvning
        prisM3: 9000       // $$/m³
    },
    stal: {
        namn: 'Stål S355',
        typ: 'stal',
        kommer: true,
        E: 210000e6,
        densitet: 7850,
        fy: 355e6,         // sträckgräns (drag, tryck, böjning)
        fv: 205e6,         // skjuvning, fy/√3
        prisM3: 200000     // ca 25 $$/kg
    },
    vajer: {
        namn: 'Vajer',
        typ: 'vajer',
        kommer: true,
        E: 160000e6,       // lägre än stål: trådarna ligger i spiral
        densitet: 7850,    // räknat på metallarean
        fu: 1570e6,        // brottgräns för trådarna
        prisM3: 600000     // ca 75 $$/kg
    }
};

// Brottsreglerna per typ, som de visas i menyn (räknas i fysik.js, BROTT).
const BROTTREGLER = {
    tra: ['N/(A·f<sub>t</sub> eller f<sub>c</sub>) + M/(W·f<sub>m</sub>) ≤ 100 %',
          '1,5·V/(A·f<sub>v</sub>) ≤ 100 %',
          'Knäckning: tryckkraften < π²·E<sub>05</sub>·I/L²'],
    stal: ['N/(A·f<sub>y</sub>) + M/(W·f<sub>y</sub>) ≤ 100 %',
           'V/(A<sub>v</sub>·f<sub>v</sub>) ≤ 100 % (A<sub>v</sub> = livets area)',
           'Knäckning: tryckkraften < π²·E·I/L²'],
    vajer: ['Bara drag: N/(A·f<sub>u</sub>) ≤ 100 %',
            'Tryck: vajern slaknar, bär ingen böjning']
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

// En I-balk ur tabell (cm², cm⁴, cm³, livets area cm², höjd mm).
function iprofil(namn, A, I, W, Av, h) {
    const mat = MATERIAL.stal;
    A /= 1e4;
    return {
        namn, material: 'stal', h: h / 1000, A, I: I / 1e8, W: W / 1e6, Av: Av / 1e4,
        massa: A * mat.densitet, pris: Math.round(A * mat.prisM3 / 10) * 10
    };
}

// En vajer med diametern d mm. Metallarean ca 60 % av cirkeln (spiralslagen
// lina), ingen böjstyvhet att tala om.
function vajer(d) {
    const mat = MATERIAL.vajer, A = 0.6 * Math.PI * (d / 1000) ** 2 / 4;
    return {
        namn: 'Ø ' + d, material: 'vajer', h: d / 1000, A, I: 0, W: 0,
        massa: A * mat.densitet, pris: Math.round(A * mat.prisM3 / 10) * 10
    };
}

const STORLEKAR = ['Pytte', 'Liten', 'Mellan', 'Stor', 'Jätte'];

const PROFILER = {
    limtra: [rektangel('limtra', 56, 135), rektangel('limtra', 66, 180), rektangel('limtra', 90, 270),
             rektangel('limtra', 140, 405), rektangel('limtra', 190, 630)],
    // Preliminära (stål och vajer finns inte i spelet än).
    stal: [iprofil('IPE 100', 10.3, 171, 34.2, 5.08, 100), iprofil('IPE 140', 16.4, 541, 77.3, 7.64, 140),
           iprofil('IPE 200', 28.5, 1943, 194, 14.0, 200), iprofil('IPE 300', 53.8, 8356, 557, 25.7, 300),
           iprofil('IPE 400', 84.5, 23130, 1156, 42.7, 400)],
    vajer: [vajer(8), vajer(12), vajer(16), vajer(24), vajer(32)]
};

// Vägbanan: plankor ovanpå balken som keIWs går på. Väger och kostar per
// meter, utöver balken under.
const VAG = { massa: 200, pris: 400, tjocklek: 0.12 };

// Förbanden (knutpunkterna man bygger). Ledat: balkarna kan vrida sig
// fritt mot varandra. Styvt: de sitter ihop och böjer tillsammans.
// Fästpunkterna i berget kostar inget.
const FORBAND = { massa: 20, pris: { ledat: 300, styvt: 500 } };
