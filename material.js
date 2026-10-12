// Material och tvärsnitt.
//
// Spelläget har fem storlekar per material (Pytte–Jätte), var och en med
// ett steg under och ett över (Pytte−, Pytte, Pytte+ … Jätte+, 15 steg)
// som man når med −/+ under knapparna. Var och en är en riktig profil, så
// att lösaren räknar med verkliga A, I, W, vikt och pris.
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
        kort: 'Trä',
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
        kort: 'Stål',
        typ: 'stal',
        E: 210000e6,
        densitet: 7850,
        fy: 355e6,         // sträckgräns (drag, tryck, böjning)
        fv: 205e6,         // skjuvning, fy/√3
        prisM3: 118000     // 15 $$/kg
    },
    vajer: {
        namn: 'Vajer',
        kort: 'Vajer',
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

// De 15 stegen per material, från Pytte− till Jätte+. Varje steg är
// ungefär 1,35 gånger styvare (I) än det förra, så att knäckningen inte tar
// för stora kliv, och både pris och styvhet ökar för varje steg.
const STEGEN = {
    limtra: [[42, 180], [56, 180], [56, 200], [56, 215], [66, 225], [78, 230], [90, 245], [90, 270],
             [90, 305], [90, 345], [115, 360], [115, 395], [115, 435], [140, 450], [140, 495]]
        .map(([b, h]) => rektangel('limtra', b, h)),
    // HEA 100–400 i följd, böjning kring den styva axeln (W elastiskt, A_v =
    // livets area). HEB och HEM är tyngre för samma styvhet, så de skulle bli
    // dyrare men klenare än ett HEA-steg bredvid.
    stal: [iprofil('HEA 100', 21.2, 349, 72.8, 7.56, 96), iprofil('HEA 120', 25.3, 606, 106, 8.46, 114),
           iprofil('HEA 140', 31.4, 1033, 155, 10.1, 133), iprofil('HEA 160', 38.8, 1673, 220, 13.2, 152),
           iprofil('HEA 180', 45.3, 2510, 294, 14.5, 171), iprofil('HEA 200', 53.8, 3692, 389, 18.1, 190),
           iprofil('HEA 220', 64.3, 5410, 515, 20.7, 210), iprofil('HEA 240', 76.8, 7763, 675, 25.2, 230),
           iprofil('HEA 260', 86.8, 10450, 836, 28.8, 250), iprofil('HEA 280', 97.3, 13670, 1013, 31.7, 270),
           iprofil('HEA 300', 112.5, 18260, 1260, 37.3, 290), iprofil('HEA 320', 124.4, 22930, 1479, 41.1, 310),
           iprofil('HEA 340', 133.5, 27690, 1678, 45.0, 330), iprofil('HEA 360', 142.8, 33090, 1891, 49.0, 350),
           iprofil('HEA 400', 159.0, 45070, 2311, 57.3, 390)],
    // Preliminär (vajern finns inte i spelet än).
    vajer: [7, 8, 9, 11, 12, 13, 14, 16, 18, 22, 24, 26, 29, 32, 36].map(vajer)
};

// I ritningen är storleken 0–4 (Pytte–Jätte), med − och + som ± 0,25
// (Liten− = 0,75, Liten+ = 1,25). Gamla halvsteg (1,5) räknas som steget
// under nästa storlek (Mellan−).
const stegAv = s => 3 * Math.round(s) + Math.sign(s - Math.round(s)) + 1;     // 0–14
const storlekAv = k => Math.floor(k / 3) + (k % 3 - 1) * 0.25;
const ANTAL_STEG = 15;

// Fem storlekar (knapparna) är mittensteget i varje grupp om tre.
const PROFILER = Object.fromEntries(Object.entries(STEGEN).map(([m, lista]) => [m, lista.filter((p, k) => k % 3 === 1)]));

// Profilen för en storlek och dess namn (Liten−, Liten, Liten+ …).
const profil = (material, s) => STEGEN[material][stegAv(s)];
const storleksNamn = s => {
    const k = stegAv(s);
    return STORLEKAR[Math.floor(k / 3)] + ['−', '', '+'][k % 3];
};

// Vägbanan: plankor ovanpå balken som keIWs går på. Väger och kostar per
// meter, utöver balken under.
const VAG = { massa: 200, pris: 400, tjocklek: 0.12 };

// Förbanden (knutpunkterna man bygger). Ledat: balkarna kan vrida sig
// fritt mot varandra. Styvt: de sitter ihop och böjer tillsammans.
// Fästpunkterna i berget kostar inget.
const FORBAND = { massa: 20, pris: { ledat: 300, styvt: 500 } };
