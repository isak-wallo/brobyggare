// Banorna. Allt i meter, y uppåt, vägbanans nivå är y = 0.
//
//   spann:  avståndet mellan klippkanterna (vänster kant vid x = 0)
//   rutnat: m mellan punkterna man bygger på (1 om det saknas)
//   fasten: fästpunkterna i berget [x, y] eller [x, y, lager]. Vägbanans
//           fästen är brolager (alltid ledade): 'fast' låser x och y,
//           'glid' bara y (rör sig fritt i sidled, som på riktiga broar,
//           så att en rak balk inte kan hänga som en lina). Övriga fästen
//           låser x och y och kan vara styva eller ledade (två av dem
//           ligger på land, 3 m bakom kanterna).
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
//           är en pelare

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
        noder: l.noder.map(([x, y, typ], i) => i < bana.fasten.length ? fastNod(x, y, bana.fasten[i][2])
            : typ === 'pelare' ? { x, y, fast: true, styv: false, pelare: true, lager: 'glid' } : { x, y, fast: false, styv: true }),
        balkar: l.balkar.map(([a, b, storlek, vag]) => ({ a, b, storlek, vag: !!vag, material: 'limtra' }))
    };
}
