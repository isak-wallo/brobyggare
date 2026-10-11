// Banorna. Allt i meter, y uppåt, vägbanans nivå är y = 0.
//
//   spann:  avståndet mellan klippkanterna (vänster kant vid x = 0)
//   fasten: fästpunkterna i berget [x, y]
//   vatten: vattenytan, keIWs som hamnar där har misslyckats
//   budget: i kronor; man får bygga över, men då blir det inga stjärnor
//   omrade: där man får sätta knutpunkter
//   vy:     det som alltid ska synas på skärmen
//   losning: en bro som håller (testerna kör den)

const BANOR = [
    {
        namn: 'Bäcken',
        spann: 12,
        fasten: [[0, 0], [0, -3], [12, 0], [12, -3]],
        vatten: -6,
        budget: 12000,
        omrade: { x0: 0, x1: 12, y0: -5, y1: 4 },
        vy: { x0: -3, x1: 15, y0: -6.5, y1: 4.5 },
        losning: {
            noder: [[0, 0], [0, -3], [12, 0], [12, -3], [4, 0], [8, 0], [4, -2], [8, -2]],
            balkar: [
                [0, 4, 0, true], [4, 5, 0, true], [5, 2, 0, true],
                [1, 6, 0], [6, 4, 0], [3, 7, 0], [7, 5, 0], [6, 7, 0]
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
