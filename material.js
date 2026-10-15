// Material och tvärsnitt.
//
// Trä och stål väljs ur riktiga profiler: limträ bredd × höjd (TRA_BREDD,
// TRA_HOJD) och stålets IPE, HEA och HEB (STAL), så att lösaren räknar med
// verkliga A, I, W, vikt och pris. I ritningen är balkens storlek profilens
// namn ('90×315', 'HEA 200'), eller ett steg 0–5 i STEGEN (betongen,
// kabeln, banornas lösningar och äldre ritningar).
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

// Limträets mått (mm): bredderna och höjderna (lameller på 45 mm).
const TRA_BREDD = [42, 56, 66, 78, 90, 115, 140];
const TRA_HOJD = [180, 225, 270, 315, 360, 405, 450, 495, 540, 585, 630];

// Höjden högst 7 gånger bredden: en högre och smalare balk skulle vippa i
// sidled (det räknar inte 2D-modellen med), så en hög balk kräver bredd.
// traMatt ger ett tillåtet mått: med behallH blir balken bredare, annars lägre.
const TRA_SLANK = 7;
function traMatt(b, h, behallH) {
    if (h > TRA_SLANK * b) {
        if (behallH) b = TRA_BREDD.find(x => TRA_SLANK * x >= h) ?? TRA_BREDD.at(-1);
        else h = TRA_HOJD.filter(x => x <= TRA_SLANK * b).at(-1) ?? TRA_HOJD[0];
    }
    return b + '×' + h;
}

// Stålprofilerna: [nummer, h, b, tw, tf, r (mm), A (cm²), Iy (cm⁴), Wy (cm³)].
// Böjning kring den styva axeln; livets area A_v enligt Eurokod
// (A − 2·b·tf + (tw + 2r)·tf).
const STAL_SERIER = {
    IPE: [[80, 80, 46, 3.8, 5.2, 5, 7.64, 80.1, 20.0], [100, 100, 55, 4.1, 5.7, 7, 10.3, 171, 34.2],
          [120, 120, 64, 4.4, 6.3, 7, 13.2, 318, 53.0], [140, 140, 73, 4.7, 6.9, 7, 16.4, 541, 77.3],
          [160, 160, 82, 5.0, 7.4, 9, 20.1, 869, 109], [180, 180, 91, 5.3, 8.0, 9, 23.9, 1317, 146],
          [200, 200, 100, 5.6, 8.5, 12, 28.5, 1943, 194], [220, 220, 110, 5.9, 9.2, 12, 33.4, 2772, 252],
          [240, 240, 120, 6.2, 9.8, 15, 39.1, 3892, 324], [270, 270, 135, 6.6, 10.2, 15, 45.9, 5790, 429],
          [300, 300, 150, 7.1, 10.7, 15, 53.8, 8356, 557], [330, 330, 160, 7.5, 11.5, 18, 62.6, 11770, 713],
          [360, 360, 170, 8.0, 12.7, 18, 72.7, 16270, 904], [400, 400, 180, 8.6, 13.5, 21, 84.5, 23130, 1156],
          [450, 450, 190, 9.4, 14.6, 21, 98.8, 33740, 1500], [500, 500, 200, 10.2, 16.0, 21, 116, 48200, 1928],
          [550, 550, 210, 11.1, 17.2, 24, 134, 67120, 2441], [600, 600, 220, 12.0, 19.0, 24, 156, 92080, 3069]],
    HEA: [[100, 96, 100, 5, 8, 12, 21.2, 349, 72.8], [120, 114, 120, 5, 8, 12, 25.3, 606, 106],
          [140, 133, 140, 5.5, 8.5, 12, 31.4, 1033, 155], [160, 152, 160, 6, 9, 15, 38.8, 1673, 220],
          [180, 171, 180, 6, 9.5, 15, 45.3, 2510, 294], [200, 190, 200, 6.5, 10, 18, 53.8, 3692, 389],
          [220, 210, 220, 7, 11, 18, 64.3, 5410, 515], [240, 230, 240, 7.5, 12, 21, 76.8, 7763, 675],
          [260, 250, 260, 7.5, 12.5, 24, 86.8, 10450, 836], [280, 270, 280, 8, 13, 24, 97.3, 13670, 1013],
          [300, 290, 300, 8.5, 14, 27, 112.5, 18260, 1260], [320, 310, 300, 9, 15.5, 27, 124.4, 22930, 1479],
          [340, 330, 300, 9.5, 16.5, 27, 133.5, 27690, 1678], [360, 350, 300, 10, 17.5, 27, 142.8, 33090, 1891],
          [400, 390, 300, 11, 19, 27, 159.0, 45070, 2311], [450, 440, 300, 11.5, 21, 27, 178.0, 63720, 2896],
          [500, 490, 300, 12, 23, 27, 197.5, 86970, 3550], [550, 540, 300, 12.5, 24, 27, 211.8, 111900, 4146],
          [600, 590, 300, 13, 25, 27, 226.5, 141200, 4787]],
    HEB: [[100, 100, 100, 6, 10, 12, 26.0, 450, 89.9], [120, 120, 120, 6.5, 11, 12, 34.0, 864, 144],
          [140, 140, 140, 7, 12, 12, 43.0, 1509, 216], [160, 160, 160, 8, 13, 15, 54.3, 2492, 311],
          [180, 180, 180, 8.5, 14, 15, 65.3, 3831, 426], [200, 200, 200, 9, 15, 18, 78.1, 5696, 570],
          [220, 220, 220, 9.5, 16, 18, 91.0, 8091, 736], [240, 240, 240, 10, 17, 21, 106, 11260, 938],
          [260, 260, 260, 10, 17.5, 24, 118.4, 14920, 1148], [280, 280, 280, 10.5, 18, 24, 131.4, 19270, 1376],
          [300, 300, 300, 11, 19, 27, 149.1, 25170, 1678], [320, 320, 300, 11.5, 20.5, 27, 161.3, 30820, 1926],
          [340, 340, 300, 12, 21.5, 27, 170.9, 36660, 2156], [360, 360, 300, 12.5, 22.5, 27, 180.6, 43190, 2400],
          [400, 400, 300, 13.5, 24, 27, 197.8, 57680, 2884], [450, 450, 300, 14, 26, 27, 218.0, 79890, 3551],
          [500, 500, 300, 14.5, 28, 27, 238.6, 107200, 4287], [550, 550, 300, 15, 29, 27, 254.1, 136700, 4971],
          [600, 600, 300, 15.5, 30, 27, 270.0, 171000, 5701]]
};
const STAL = {};
for (const [serie, rader] of Object.entries(STAL_SERIER)) {
    for (const [nr, h, b, tw, tf, r, A, I, W] of rader) {
        const Av = (A * 100 - 2 * b * tf + (tw + 2 * r) * tf) / 100;
        STAL[serie + ' ' + nr] = iprofil(serie + ' ' + nr, A, I, W, Av, h);
    }
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

// Balkens profil: ett steg 0–5 i STEGEN, eller profilens namn (trä 'b×h',
// stål 'HEA 200'). Ett namn som inte finns blir steg 2.
const ANTAL_STEG = 6;
const PROFILER = STEGEN;
const tramatt = {};
function profil(material, s) {
    if (typeof s === 'string') {
        if (material === 'stal' && STAL[s]) return STAL[s];
        const m = /^(\d+)×(\d+)$/.exec(s);
        if (m && (material === 'limtra' || material === 'betong')) {
            const nyckel = material + s;
            return tramatt[nyckel] || (tramatt[nyckel] = rektangel(material, +m[1], +m[2]));
        }
        s = 2;
    }
    return STEGEN[material][Math.max(0, Math.min(ANTAL_STEG - 1, Math.round(s)))];
}

// Materialen där man väljer ur hela profilutbudet (de andra har STEGEN).
const MED_PROFILER = ['limtra', 'stal'];

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
// Förbandet görs för den grövsta balken i knuten: plåtar, bultar och
// dymlingar för balkens dragkraft A·f (trä ft, stål fy, betong armeringen
// ft, kabel fu). Upp till N0 gäller grundvikten och grundpriset, därefter
// växer båda i proportion till kraften.
const FORBAND = { massa: { ledat: 20, styvt: 40 }, pris: { ledat: 300, styvt: 500 }, N0: 300e3 };

// Förbandets storlek i knutpunkt i (1 = grundförbandet).
function forbandsFaktor(r, i) {
    let N = 0;
    for (const b of r.balkar) {
        if (b.a !== i && b.b !== i) continue;
        const mat = b.material || 'limtra', m = MATERIAL[mat];
        N = Math.max(N, profil(mat, b.storlek).A * (m.ft || m.fy || m.fu));
    }
    return Math.max(1, N / FORBAND.N0);
}

// Förbandet i knutpunkt i: {massa (kg), pris ($$)}.
function forbandet(r, i) {
    const typ = r.noder[i].styv ? 'styvt' : 'ledat', f = forbandsFaktor(r, i);
    return { massa: FORBAND.massa[typ] * f, pris: FORBAND.pris[typ] * f };
}
