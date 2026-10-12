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
                [0, 4, 0, true], [4, 5, 0, true], [5, 2, 0, true],
                [1, 6, 0], [6, 4, 0], [3, 7, 0], [7, 5, 0], [6, 7, 0]
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
                [0, 4, 0, true], [4, 5, 0, true], [5, 6, 0, true], [6, 7, 0, true], [7, 8, 0, true], [8, 2, 0, true],
                [1, 9, 0], [9, 10, 0], [10, 11, 0], [11, 12, 0], [12, 13, 0], [13, 3, 0],
                [4, 9, 0], [5, 10, 0], [6, 11, 0], [7, 12, 0], [8, 13, 0],
                [1, 4, 0], [9, 5, 0], [10, 6, 0], [6, 12, 0], [7, 13, 0], [8, 3, 0]
            ]
        }
    }
];

// En banas fästpunkter som noder i en ny ritning.
function nyRitning(bana) {
    return { noder: bana.fasten.map(([x, y]) => ({ x, y, fast: true, styv: false })), balkar: [] };
}

// En sparad lösning ([x, y] och [a, b, storlek, väg]) som ritning.
function losningsRitning(bana) {
    const l = bana.losning;
    return {
        noder: l.noder.map(([x, y], i) => ({ x, y, fast: i < bana.fasten.length, styv: i >= bana.fasten.length })),
        balkar: l.balkar.map(([a, b, storlek, vag]) => ({ a, b, storlek, vag: !!vag, material: 'limtra' }))
    };
}
