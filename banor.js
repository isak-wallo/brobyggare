// Banorna. Allt i meter, y uppåt, vägbanans nivå är y = 0.
//
//   spann:  avståndet mellan klippkanterna (vänster kant vid x = 0)
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
//   losning: en bro som håller (testerna kör den)

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
    }
];

// En banas fästpunkter som noder i en ny ritning.
function nyRitning(bana) {
    return { version: 4, noder: bana.fasten.map(([x, y, lager]) => fastNod(x, y, lager)), balkar: [] };
}

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
        noder: l.noder.map(([x, y], i) => i < bana.fasten.length ? fastNod(x, y, bana.fasten[i][2])
                                                                 : { x, y, fast: false, styv: true }),
        balkar: l.balkar.map(([a, b, storlek, vag]) => ({ a, b, storlek, vag: !!vag, material: 'limtra' }))
    };
}
