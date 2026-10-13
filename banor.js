// Banorna. Allt i meter, y uppåt, vägbanans nivå är y = 0.
//
//   spann:  avståndet mellan klippkanterna (vänster kant vid x = 0)
//   rutnat: m mellan punkterna man bygger på (1 om det saknas)
//   element, maxLangd, maxKabel, maxZoom: för de stora banorna (fysikens
//           elementlängd, längsta balk och kabel i m, största zoom)
//   ö:      bredden på ön till höger (annars fortsätter landet)
//   fasten: fästpunkterna i berget [x, y] eller [x, y, lager]. Vägbanans
//           fästen är brolager (alltid ledade): 'fast' låser x och y,
//           'glid' bara y (rör sig fritt i sidled, som på riktiga broar,
//           så att en rak balk inte kan hänga som en lina). Övriga fästen
//           låser x och y och kan vara styva eller ledade (två av dem
//           ligger på land, 3 m bakom kanterna). Ett fäste ute i vattnet
//           är ett fundament (ritas som betong ner till botten).
//   vatten: vattenytan, keIWs som hamnar där har misslyckats
//   budget: i $$ (spelets pengar); man får bygga över, men då blir det
//           inga stjärnor
//   keiws:  keIWs höjd i meter (bara utseendet, större på långa banor)
//   omrade: där man får sätta knutpunkter (över land bara ovanför marken)
//   vy:     det som syns utan zoom
//   farled: {x0, x1, y}: under y mellan x0 och x1 får inget byggas (båtarna)
//   pelare: {botten, pris, perMeter}: här får man bygga pelare över vattnet,
//           från botten upp till en knutpunkt (med glidlager överst)
//   losning: en bro som håller (testerna kör den); en nod [x, y, 'pelare']
//           är en pelare, ett fäste [x, y, 'styv'] är styvt, och en balk är
//           [a, b, storlek, väg, material] (limträ om det saknas)

const BANOR = [
    {
        namn: 'Bäcken',
        spann: 12,
        fasten: [[0, 0, 'fast'], [0, -3], [12, 0, 'glid'], [12, -3], [-3, 0], [15, 0]],
        vatten: -6,
        budget: 12000,
        keiws: 2,
        omrade: { x0: -3, x1: 15, y0: -5, y1: 7 },
        vy: { x0: -4, x1: 16, y0: -6.5, y1: 7.5 },
        losning: {
            noder: [[0, 0], [0, -3], [12, 0], [12, -3], [-3, 0], [15, 0], [4, 0], [8, 0], [4, -2], [8, -2]],
            balkar: [
                [0, 6, 1, true], [6, 7, 1, true], [7, 2, 1, true],
                [1, 8, 1], [8, 6, 1], [3, 9, 1], [9, 7, 1], [8, 9, 1]
            ]
        }
    },
    {
        // Som Bäcken, men dubbelt så långt spann.
        namn: 'Ån',
        spann: 24,
        fasten: [[0, 0, 'fast'], [0, -3], [24, 0, 'glid'], [24, -3], [-3, 0], [27, 0]],
        vatten: -6,
        budget: 26000,
        keiws: 3.5,
        omrade: { x0: -3, x1: 27, y0: -5, y1: 9 },
        vy: { x0: -7, x1: 31, y0: -6.5, y1: 9.5 },
        losning: {
            // Fackverk av Pytte: väg överst, underram 3 m ner (22 970 $$).
            noder: [[0, 0], [0, -3], [24, 0], [24, -3], [-3, 0], [27, 0], [4, 0], [8, 0], [12, 0], [16, 0], [20, 0],
                    [4, -3], [8, -3], [12, -3], [16, -3], [20, -3]],
            balkar: [
                [0, 6, 0, true], [6, 7, 0, true], [7, 8, 0, true], [8, 9, 0, true], [9, 10, 0, true], [10, 2, 0, true],
                [1, 11, 0], [11, 12, 0], [12, 13, 0], [13, 14, 0], [14, 15, 0], [15, 3, 0],
                [6, 11, 0], [7, 12, 0], [8, 13, 0], [9, 14, 0], [10, 15, 0],
                [1, 6, 0], [11, 7, 0], [12, 8, 0], [8, 14, 0], [9, 15, 0], [10, 3, 0]
            ]
        }
    },
    {
        // Längre spann med en farled i mitten. Här får man bygga pelare från
        // botten (dyrt), men inte i farleden.
        namn: 'Kanalen',
        spann: 48,
        rutnat: 2,
        fasten: [[0, 0, 'fast'], [0, -4], [48, 0, 'glid'], [48, -4], [-4, 0], [52, 0]],
        vatten: -6,
        budget: 55000,
        keiws: 5,
        omrade: { x0: -4, x1: 52, y0: -4, y1: 12 },
        vy: { x0: -9, x1: 57, y0: -7.5, y1: 12.5 },
        farled: { x0: 16, x1: 32, y: -2 },
        pelare: { botten: -10, pris: 3000, perMeter: 150 },
        losning: {
            // Väg Mellan på två pelare 4 m ner, med strävor av Liten (53 040 $$).
            noder: [[0, 0], [0, -4], [48, 0], [48, -4], [-4, 0], [52, 0], [2, 0], [4, 0], [6, 0], [8, 0],
                    [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0], [22, 0], [24, 0], [26, 0], [28, 0],
                    [30, 0], [32, 0], [34, 0], [36, 0], [38, 0], [40, 0], [42, 0], [44, 0], [46, 0],
                    [14, -4, 'pelare'], [34, -4, 'pelare']],
            balkar: [
                [0, 6, 2, true], [6, 7, 2, true], [7, 8, 2, true], [8, 9, 2, true], [9, 10, 2, true],
                [10, 11, 2, true], [11, 12, 2, true], [12, 13, 2, true], [13, 14, 2, true], [14, 15, 2, true],
                [15, 16, 2, true], [16, 17, 2, true], [17, 18, 2, true], [18, 19, 2, true], [19, 20, 2, true],
                [20, 21, 2, true], [21, 22, 2, true], [22, 23, 2, true], [23, 24, 2, true], [24, 25, 2, true],
                [25, 26, 2, true], [26, 27, 2, true], [27, 28, 2, true], [28, 2, 2, true],
                [29, 10, 1], [29, 12, 1], [29, 14, 1], [30, 20, 1], [30, 22, 1], [30, 24, 1]
            ]
        }
    },
    {
        // En djup dalgång med en bäck i botten och fästen långt ner i
        // bergväggarna: här passar en båge (betongen tål tryck).
        namn: 'Dalgången',
        spann: 36,
        rutnat: 2,
        fasten: [[0, 0, 'fast'], [0, -12], [36, 0, 'glid'], [36, -12], [-4, 0], [40, 0], [0, -6], [36, -6]],
        vatten: -20,
        budget: 45000,
        keiws: 4.5,
        omrade: { x0: -4, x1: 40, y0: -12, y1: 12 },
        vy: { x0: -8, x1: 44, y0: -21, y1: 12.5 },
        losning: {
            // Båge av betong Pytte+ från −12, pelare och väg av trä (43 900 $$).
            noder: [
                [0, 0], [0, -12], [36, 0], [36, -12], [-4, 0], [40, 0], [0, -6], [36, -6],
                [2, 0], [4, 0], [6, 0], [8, 0], [10, 0], [12, 0], [14, 0], [16, 0],
                [18, 0], [20, 0], [22, 0], [24, 0], [26, 0], [28, 0], [30, 0], [32, 0],
                [34, 0], [4, -8], [8, -6], [12, -4], [16, -2], [20, -2], [24, -4], [28, -6],
                [32, -8]
            ],
            balkar: [
                [0, 8, 0, true], [8, 9, 0, true], [9, 10, 0, true], [10, 11, 0, true], [11, 12, 0, true],
                [12, 13, 0, true], [13, 14, 0, true], [14, 15, 0, true], [15, 16, 0, true], [16, 17, 0, true],
                [17, 18, 0, true], [18, 19, 0, true], [19, 20, 0, true], [20, 21, 0, true], [21, 22, 0, true],
                [22, 23, 0, true], [23, 24, 0, true], [24, 2, 0, true], [1, 25, 0.75, false, 'betong'], [25, 26, 0.75, false, 'betong'],
                [26, 27, 0.75, false, 'betong'], [27, 28, 0.75, false, 'betong'], [28, 29, 0.75, false, 'betong'], [29, 30, 0.75, false, 'betong'], [30, 31, 0.75, false, 'betong'],
                [31, 32, 0.75, false, 'betong'], [32, 3, 0.75, false, 'betong'], [25, 9, -0.25], [26, 11, -0.25], [27, 13, -0.25],
                [28, 15, -0.25], [29, 17, -0.25], [30, 19, -0.25], [31, 21, -0.25], [32, 23, -0.25]
            ]
        }
    },
    {
        // En bred älv med en farled på 70 m, och två fundament i vattnet
        // för pyloner: en snedkabelbro.
        namn: 'Älven',
        spann: 160,
        rutnat: 5,
        element: 2.5,
        maxLangd: 20,
        maxKabel: 100,
        maxZoom: 12,
        fasten: [[0, 0, 'fast'], [0, -5], [160, 0, 'glid'], [160, -5], [-5, 0], [165, 0], [40, -8], [120, -8]],
        vatten: -8,
        budget: 165000,
        keiws: 8,
        omrade: { x0: -5, x1: 165, y0: -8, y1: 50 },
        vy: { x0: -15, x1: 175, y0: -10, y1: 52 },
        farled: { x0: 45, x1: 115, y: -1 },
        pelare: { botten: -16, pris: 3000, perMeter: 150 },
        losning: {
            // Väg av stål Pytte, pyloner av betong Pytte 38 m höga på
            // fundamenten, fyra kablar Pytte åt var håll (153 150 $$).
            noder: [
                [0, 0], [0, -5], [160, 0], [160, -5], [-5, 0], [165, 0], [40, -8, 'styv'], [120, -8, 'styv'],
                [5, 0], [10, 0], [15, 0], [20, 0], [25, 0], [30, 0], [35, 0], [40, 0],
                [45, 0], [50, 0], [55, 0], [60, 0], [65, 0], [70, 0], [75, 0], [80, 0],
                [85, 0], [90, 0], [95, 0], [100, 0], [105, 0], [110, 0], [115, 0], [120, 0],
                [125, 0], [130, 0], [135, 0], [140, 0], [145, 0], [150, 0], [155, 0], [40, 10],
                [40, 20], [40, 30], [120, 10], [120, 20], [120, 30]
            ],
            balkar: [
                [0, 8, 0, true, 'stal'], [8, 9, 0, true, 'stal'], [9, 10, 0, true, 'stal'], [10, 11, 0, true, 'stal'], [11, 12, 0, true, 'stal'],
                [12, 13, 0, true, 'stal'], [13, 14, 0, true, 'stal'], [14, 15, 0, true, 'stal'], [15, 16, 0, true, 'stal'], [16, 17, 0, true, 'stal'],
                [17, 18, 0, true, 'stal'], [18, 19, 0, true, 'stal'], [19, 20, 0, true, 'stal'], [20, 21, 0, true, 'stal'], [21, 22, 0, true, 'stal'],
                [22, 23, 0, true, 'stal'], [23, 24, 0, true, 'stal'], [24, 25, 0, true, 'stal'], [25, 26, 0, true, 'stal'], [26, 27, 0, true, 'stal'],
                [27, 28, 0, true, 'stal'], [28, 29, 0, true, 'stal'], [29, 30, 0, true, 'stal'], [30, 31, 0, true, 'stal'], [31, 32, 0, true, 'stal'],
                [32, 33, 0, true, 'stal'], [33, 34, 0, true, 'stal'], [34, 35, 0, true, 'stal'], [35, 36, 0, true, 'stal'], [36, 37, 0, true, 'stal'],
                [37, 38, 0, true, 'stal'], [38, 2, 0, true, 'stal'], [6, 15, 0, false, 'betong'], [15, 39, 0, false, 'betong'], [39, 40, 0, false, 'betong'],
                [40, 41, 0, false, 'betong'], [41, 13, 0, false, 'vajer'], [41, 17, 0, false, 'vajer'], [41, 11, 0, false, 'vajer'], [41, 19, 0, false, 'vajer'],
                [41, 9, 0, false, 'vajer'], [41, 21, 0, false, 'vajer'], [41, 0, 0, false, 'vajer'], [41, 23, 0, false, 'vajer'], [7, 31, 0, false, 'betong'],
                [31, 42, 0, false, 'betong'], [42, 43, 0, false, 'betong'], [43, 44, 0, false, 'betong'], [44, 29, 0, false, 'vajer'], [44, 33, 0, false, 'vajer'],
                [44, 27, 0, false, 'vajer'], [44, 35, 0, false, 'vajer'], [44, 25, 0, false, 'vajer'], [44, 37, 0, false, 'vajer'], [44, 23, 0, false, 'vajer'],
                [44, 2, 0, false, 'vajer']
            ]
        }
    },
    {
        // Ut till en ö: 400 m över havet, med en farled på 200 m för
        // de stora fartygen. En hängbro.
        namn: 'Havet',
        spann: 400,
        rutnat: 10,
        element: 5,
        maxLangd: 30,
        maxKabel: 150,
        maxZoom: 16,
        fasten: [[0, 0, 'fast'], [0, -10], [400, 0, 'glid'], [400, -10], [-40, 0], [440, 0], [80, -30], [320, -30]],
        vatten: -30,
        budget: 820000,
        keiws: 12,
        ö: 60,
        omrade: { x0: -40, x1: 440, y0: -30, y1: 100 },
        vy: { x0: -50, x1: 470, y0: -32, y1: 102 },
        farled: { x0: 100, x1: 300, y: -5 },
        pelare: { botten: -60, pris: 3000, perMeter: 150 },
        losning: {
            // Hängbro: pyloner av betong Mellan+ (90 m), huvudkabel Stor−
            // förankrad på land, hängare Pytte var 20 m, väg av stål
            // Mellan− och pelare under sidospannen (774 260 $$).
            noder: [
                [0, 0], [0, -10], [400, 0], [400, -10], [-40, 0], [440, 0], [80, -30, 'styv'], [320, -30, 'styv'],
                [10, 0], [20, 0, 'pelare'], [30, 0], [40, 0, 'pelare'], [50, 0], [60, 0, 'pelare'], [70, 0], [80, 0],
                [90, 0], [100, 0], [110, 0], [120, 0], [130, 0], [140, 0], [150, 0], [160, 0],
                [170, 0], [180, 0], [190, 0], [200, 0], [210, 0], [220, 0], [230, 0], [240, 0],
                [250, 0], [260, 0], [270, 0], [280, 0], [290, 0], [300, 0], [310, 0], [320, 0],
                [330, 0], [340, 0, 'pelare'], [350, 0], [360, 0, 'pelare'], [370, 0], [380, 0, 'pelare'], [390, 0], [80, -20],
                [80, -10], [80, 20], [80, 40], [80, 60], [320, -20], [320, -10], [320, 20], [320, 40],
                [320, 60], [100, 40], [120, 30], [140, 20], [160, 20], [180, 10], [200, 10], [220, 10],
                [240, 20], [260, 20], [280, 30], [300, 40]
            ],
            balkar: [
                [0, 8, 1.75, true, 'stal'], [8, 9, 1.75, true, 'stal'], [9, 10, 1.75, true, 'stal'], [10, 11, 1.75, true, 'stal'], [11, 12, 1.75, true, 'stal'],
                [12, 13, 1.75, true, 'stal'], [13, 14, 1.75, true, 'stal'], [14, 15, 1.75, true, 'stal'], [15, 16, 1.75, true, 'stal'], [16, 17, 1.75, true, 'stal'],
                [17, 18, 1.75, true, 'stal'], [18, 19, 1.75, true, 'stal'], [19, 20, 1.75, true, 'stal'], [20, 21, 1.75, true, 'stal'], [21, 22, 1.75, true, 'stal'],
                [22, 23, 1.75, true, 'stal'], [23, 24, 1.75, true, 'stal'], [24, 25, 1.75, true, 'stal'], [25, 26, 1.75, true, 'stal'], [26, 27, 1.75, true, 'stal'],
                [27, 28, 1.75, true, 'stal'], [28, 29, 1.75, true, 'stal'], [29, 30, 1.75, true, 'stal'], [30, 31, 1.75, true, 'stal'], [31, 32, 1.75, true, 'stal'],
                [32, 33, 1.75, true, 'stal'], [33, 34, 1.75, true, 'stal'], [34, 35, 1.75, true, 'stal'], [35, 36, 1.75, true, 'stal'], [36, 37, 1.75, true, 'stal'],
                [37, 38, 1.75, true, 'stal'], [38, 39, 1.75, true, 'stal'], [39, 40, 1.75, true, 'stal'], [40, 41, 1.75, true, 'stal'], [41, 42, 1.75, true, 'stal'],
                [42, 43, 1.75, true, 'stal'], [43, 44, 1.75, true, 'stal'], [44, 45, 1.75, true, 'stal'], [45, 46, 1.75, true, 'stal'], [46, 2, 1.75, true, 'stal'],
                [6, 47, 2.25, false, 'betong'], [47, 48, 2.25, false, 'betong'], [48, 15, 2.25, false, 'betong'], [15, 49, 2.25, false, 'betong'], [49, 50, 2.25, false, 'betong'],
                [50, 51, 2.25, false, 'betong'], [7, 52, 2.25, false, 'betong'], [52, 53, 2.25, false, 'betong'], [53, 39, 2.25, false, 'betong'], [39, 54, 2.25, false, 'betong'],
                [54, 55, 2.25, false, 'betong'], [55, 56, 2.25, false, 'betong'], [4, 51, 2.75, false, 'vajer'], [51, 57, 2.75, false, 'vajer'], [57, 58, 2.75, false, 'vajer'],
                [58, 59, 2.75, false, 'vajer'], [59, 60, 2.75, false, 'vajer'], [60, 61, 2.75, false, 'vajer'], [61, 62, 2.75, false, 'vajer'], [62, 63, 2.75, false, 'vajer'],
                [63, 64, 2.75, false, 'vajer'], [64, 65, 2.75, false, 'vajer'], [65, 66, 2.75, false, 'vajer'], [66, 67, 2.75, false, 'vajer'], [67, 56, 2.75, false, 'vajer'],
                [56, 5, 2.75, false, 'vajer'], [57, 17, 0, false, 'vajer'], [58, 19, 0, false, 'vajer'], [59, 21, 0, false, 'vajer'], [60, 23, 0, false, 'vajer'],
                [61, 25, 0, false, 'vajer'], [62, 27, 0, false, 'vajer'], [63, 29, 0, false, 'vajer'], [64, 31, 0, false, 'vajer'], [65, 33, 0, false, 'vajer'],
                [66, 35, 0, false, 'vajer'], [67, 37, 0, false, 'vajer']
            ]
        }
    }
];

// En banas fästpunkter som noder i en ny ritning.
function nyRitning(bana) {
    return { version: 4, noder: bana.fasten.map(([x, y, lager]) => fastNod(x, y, lager)), balkar: [] };
}

// Vad en ritning kostar: balkarna (och vägbanan) per meter, förbanden och
// pelarna (rundat till tiotal).
function ritningensKostnad(r, bana) {
    let k = 0;
    for (const b of r.balkar) {
        const na = r.noder[b.a], nb = r.noder[b.b];
        k += Math.hypot(nb.x - na.x, nb.y - na.y) * (profil(b.material || 'limtra', b.storlek).pris + (b.vag ? VAG.pris : 0));
    }
    for (const n of r.noder) {
        if (n.pelare) k += pelarensPris(bana, n.y);
        else if (!n.fast) k += FORBAND.pris[n.styv ? 'styvt' : 'ledat'];
    }
    return Math.round(k / 10) * 10;
}

// En pelare från botten upp till höjden y.
const pelarensPris = (bana, y) => bana.pelare.pris + bana.pelare.perMeter * (y - bana.pelare.botten);

function fastNod(x, y, lager) {
    const n = { x, y, fast: true, styv: false };
    if (lager) n.lager = lager;
    return n;
}

// En sparad lösning ([x, y] och [a, b, storlek, väg]) som ritning.
function losningsRitning(bana) {
    const l = bana.losning;
    return {
        version: 4,
        noder: l.noder.map(([x, y, typ], i) => i < bana.fasten.length ? Object.assign(fastNod(x, y, bana.fasten[i][2]), typ === 'styv' ? { styv: true } : {})
            : typ === 'pelare' ? { x, y, fast: true, styv: false, pelare: true, lager: 'glid' } : { x, y, fast: false, styv: true }),
        balkar: l.balkar.map(([a, b, storlek, vag, material = 'limtra']) => ({ a, b, storlek, vag: !!vag, material }))
    };
}
