// Banorna. Allt i meter, y uppåt, vägbanans nivå är y = 0.
//
//   spann:  avståndet mellan klippkanterna (vänster kant vid x = 0)
//   fasten: fästpunkterna i berget [x, y]
//   vatten: vattenytan, keIWs som hamnar där har misslyckats
//   budget: i $$ (spelets pengar); man får bygga över, men då blir det
//           inga stjärnor
//   keiws:  keIWs höjd i meter (bara utseendet, större på långa banor)
//   omrade: där man får sätta knutpunkter
//   vy:     det som syns utan zoom
//   losning: en bro som håller (testerna kör den)

const BANOR = [
    {
        namn: 'Bäcken',
        spann: 12,
        fasten: [[0, 0], [0, -3], [12, 0], [12, -3]],
        vatten: -6,
        budget: 12000,
        keiws: 2,
        omrade: { x0: 0, x1: 12, y0: -5, y1: 4 },
        vy: { x0: -4, x1: 16, y0: -6.5, y1: 4.5 },
        losning: {
            noder: [[0, 0], [0, -3], [12, 0], [12, -3], [4, 0], [8, 0], [4, -2], [8, -2]],
            balkar: [
                [0, 4, 1, true], [4, 5, 1, true], [5, 2, 1, true],
                [1, 6, 1], [6, 4, 1], [3, 7, 1], [7, 5, 1], [6, 7, 1]
            ]
        }
    },
    {
        // Som Bäcken, men dubbelt så långt spann.
        namn: 'Ån',
        spann: 24,
        fasten: [[0, 0], [0, -3], [24, 0], [24, -3]],
        vatten: -6,
        budget: 26000,
        keiws: 3.5,
        omrade: { x0: 0, x1: 24, y0: -5, y1: 6 },
        vy: { x0: -7, x1: 31, y0: -6.5, y1: 6.5 },
        losning: {
            // Fackverk av små balkar: väg överst, underram 3 m ner (24 830 $$).
            noder: [[0, 0], [0, -3], [24, 0], [24, -3], [4, 0], [8, 0], [12, 0], [16, 0], [20, 0],
                    [4, -3], [8, -3], [12, -3], [16, -3], [20, -3]],
            balkar: [
                [0, 4, 1, true], [4, 5, 1, true], [5, 6, 1, true], [6, 7, 1, true], [7, 8, 1, true], [8, 2, 1, true],
                [1, 9, 1], [9, 10, 1], [10, 11, 1], [11, 12, 1], [12, 13, 1], [13, 3, 1],
                [4, 9, 1], [5, 10, 1], [6, 11, 1], [7, 12, 1], [8, 13, 1],
                [1, 4, 1], [9, 5, 1], [10, 6, 1], [6, 12, 1], [7, 13, 1], [8, 3, 1]
            ]
        }
    }
];

// En banas fästpunkter som noder i en ny ritning.
function nyRitning(bana) {
    return { version: 2, noder: bana.fasten.map(([x, y]) => ({ x, y, fast: true, styv: false })), balkar: [] };
}

// En sparad lösning ([x, y] och [a, b, storlek, väg]) som ritning.
function losningsRitning(bana) {
    const l = bana.losning;
    return {
        version: 2,
        noder: l.noder.map(([x, y], i) => ({ x, y, fast: i < bana.fasten.length, styv: i >= bana.fasten.length })),
        balkar: l.balkar.map(([a, b, storlek, vag]) => ({ a, b, storlek, vag: !!vag, material: 'limtra' }))
    };
}
