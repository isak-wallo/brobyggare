// Material och tvärsnitt.
//
// Spelläget har sex storlekar per material (1–6 på knapparna). Träet är för
// de kortare broarna (56×180–90×345). Stålet är starkare: IPE 80 och 100,
// sedan HEA 100–200. Var och en är en riktig profil, så att lösaren räknar
// med verkliga A, I, W, vikt och pris.
// Enheter: SI (m, kg, N, Pa). Priserna är i spelets pengar, $$ (ungefär som
// kronor).
//
// typ:     styr brottsregeln (BROTTREGLER här, BROTT i fysik.js):
//          'tra', 'stal', 'betong' eller 'vajer' (kabeln: bara drag, ett
//          enda rakt element utan böjstyvhet)
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
    // Armerad betong, förenklat: tryck i betongen, drag och böjning i
    // armeringen (ungefär 1 %), räknat som om tvärsnittet vore homogent.
    betong: {
        namn: 'Betong C35/45',
        kort: 'Betong',
        typ: 'betong',
        E: 34000e6,
        densitet: 2500,
        fm: 15e6,          // böjning (armeringen tar draget)
        ft: 4e6,           // drag: armeringen, ca 1 % av arean
        fc: 30e6,          // tryck
        fv: 2e6,           // skjuvning (med byglar)
        prisM3: 3000       // billig per m³ (betong + armering), men tung
    },
    vajer: {
        namn: 'Kabel (stållina)',
        kort: 'Kabel',
        typ: 'vajer',
        E: 160000e6,       // lägre än stål: trådarna ligger i spiral
        densitet: 7850,    // räknat på metallarean
        fu: 1570e6,        // brottgräns för trådarna
        prisM3: 300000     // ca 38 $$/kg
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
    betong: ['N/(A·f<sub>t</sub> eller f<sub>c</sub>) + M/(W·f<sub>m</sub>) ≤ 100 %',
             '1,5·V/(A·f<sub>v</sub>) ≤ 100 %',
             'Knäckning: tryckkraften < π²·E·I/L²'],
    vajer: ['Bara drag: N/(A·f<sub>u</sub>) ≤ 100 %',
            'Tryck: kabeln slaknar, den bär ingen böjning']
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

// En kabel med diametern d mm. Metallarean ca 60 % av cirkeln (spiralslagen
// lina), ingen böjstyvhet att tala om. Priset i hela $$ (de klenaste
// kablarna kostar bara några $$/m).
function vajer(d) {
    const mat = MATERIAL.vajer, A = 0.6 * Math.PI * (d / 1000) ** 2 / 4;
    return {
        namn: 'Ø ' + d, material: 'vajer', h: d / 1000, A, I: 0, W: 0,
        massa: A * mat.densitet, pris: Math.round(A * mat.prisM3)
    };
}

// De 6 storlekarna per material. Varje steg är ungefär 1,3–2 gånger
// styvare (I) än det förra, och både pris och styvhet ökar för varje steg.
const STEGEN = {
    limtra: [[56, 180], [56, 215], [66, 225], [90, 245], [90, 270], [90, 345]]
        .map(([b, h]) => rektangel('limtra', b, h)),
    // IPE 80 och 100, sedan HEA 100–200. Böjning kring den styva axeln (W
    // elastiskt, A_v = livets area). HEB och HEM är tyngre för samma
    // styvhet, så de skulle bli dyrare men klenare än ett HEA-steg bredvid.
    stal: [iprofil('IPE 80', 7.64, 80.1, 20.0, 3.58, 80), iprofil('IPE 100', 10.3, 171, 34.2, 5.08, 100),
           iprofil('HEA 100', 21.2, 349, 72.8, 7.56, 96), iprofil('HEA 140', 31.4, 1033, 155, 10.1, 133),
           iprofil('HEA 160', 38.8, 1673, 220, 13.2, 152), iprofil('HEA 200', 53.8, 3692, 389, 18.1, 190)],
    // Betong: rektanglar b × h, från en smal sträva till en rejäl pylon.
    betong: [[200, 300], [250, 350], [300, 350], [350, 450], [400, 600], [450, 650]]
        .map(([b, h]) => rektangel('betong', b, h)),
    vajer: [10, 14, 16, 20, 24, 32].map(vajer)
};

// I ritningen är storleken 0–5 (knapparna 1–6).
const ANTAL_STEG = 6;
const PROFILER = STEGEN;
const profil = (material, s) => STEGEN[material][Math.max(0, Math.min(ANTAL_STEG - 1, Math.round(s)))];

// Före version 7 av ritningarna fanns 9 steg (0–8, sparade som 0–2 ± 0,25):
// vilka av dem som blev kvar. Ett borttaget steg blir det närmaste (det
// större om två är lika nära).
const GAMLA_STEG = { limtra: [0, 2, 3, 5, 6, 8], stal: [0, 1, 3, 5, 6, 8], betong: [0, 2, 3, 5, 7, 8], vajer: [0, 2, 3, 5, 6, 8] };
const nyttSteg = (k, material) => {
    const kvar = GAMLA_STEG[material] || GAMLA_STEG.limtra;
    let bast = 0;
    kvar.forEach((g, i) => { if (Math.abs(g - k) <= Math.abs(kvar[bast] - k)) bast = i; });
    return bast;
};

// Vägbanan: plankor ovanpå balken som keIWs går på. Väger och kostar per
// meter, utöver balken under.
const VAG = { massa: 200, pris: 400, tjocklek: 0.12 };

// Förbanden (knutpunkterna man bygger). Ledat: balkarna kan vrida sig
// fritt mot varandra. Styvt: de sitter ihop och böjer tillsammans, med
// knutplåtar och fler bultar (dyrare och tyngre).
// Fästpunkterna i berget kostar inget.
const FORBAND = { massa: { ledat: 20, styvt: 40 }, pris: { ledat: 300, styvt: 500 } };
