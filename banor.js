// Banorna. Allt i meter, y uppåt, vägbanans nivå är y = 0.
//
//   spann:  avståndet mellan klippkanterna (vänster kant vid x = 0)
//   rutnat: m mellan punkterna man bygger på (1 om det saknas)
//   element, maxLangd, maxKabel, maxZoom: för de stora banorna (fysikens
//           elementlängd, längsta balk och kabel i m, största zoom)
//   ö:      bredden på ön till höger (annars fortsätter landet)
//   kant:   vattenbanornas kanter: m i sidled per m ner (branta, rundade
//           överst); dal: {djup, bredd} för landbanornas mjuka dal (se
//           markY i spel.js)
//   material: vilka material som finns (trä och stål om det saknas);
//           betongen och kablarna kommer på Älven
//   fasten: fästpunkterna i berget [x, y] eller [x, y, lager]. Vägbanans
//           fästen är brolager (alltid ledade): 'fast' låser x och y,
//           'glid' bara y (rör sig fritt i sidled, som på riktiga broar,
//           så att en rak balk inte kan hänga som en lina). Övriga fästen
//           låser x och y och kan vara styva eller ledade (två av dem
//           ligger på land, 3 m bakom kanterna). Ett fäste ute i vattnet
//           är ett fundament (ritas som betong ner till botten).
//   vatten: vattenytan, keIWs som hamnar där har misslyckats
//   torr:   inget vatten, bara marken i dalen (vatten = dalens botten)
//   budget: i $$ (spelets pengar); man får bygga över, men då blir det
//           inga stjärnor
//   keiws:  keIWs höjd i meter (bara utseendet, större på långa banor)
//   keiwsInzoomad: så mycket större keIWs ritas vid största zoom (1 om det saknas)
//   bil:    keIWs kör bil (2,5 ton på två hjul) i stället för att gå
//   omrade: där man får sätta knutpunkter (över land bara ovanför marken)
//   vy:     det som syns utan zoom
//   farled: {x0, x1, y}: under y mellan x0 och x1 får inget byggas (båtarna)
//   pelare: {botten, pris, perMeter}: här får man bygga pelare över vattnet,
//           från botten upp till en knutpunkt (med glidlager överst)
//   losning: en bro som håller (testerna kör den); en nod [x, y, 'pelare']
//           är en pelare, ett fäste [x, y, 'styv'] är styvt, och en balk är
//           [a, b, storlek (0–5, knapparna 1–6), väg, material] (limträ om det saknas)

const BANOR = [
    {
        namn: 'Bäcken',
        // 14 m: längre än en balk (12 m), så man måste skarva. En rak balk
        // måste vara av grovt trä (90×450) eller stål (HEA 200, över
        // budget); ett litet fackverk av trä är billigast.
        spann: 14,
        fasten: [[0, 0, 'fast'], [14, 0, 'glid']],
        kant: 1 / 3,
        vatten: -2,
        budget: 12000,
        keiws: 2,
        keiwsInzoomad: 1.35,
        omrade: { x0: -3, x1: 17, y0: -1, y1: 7 },
        vy: { x0: -4, x1: 18, y0: -3, y1: 7.5 },
        losning: {
            // Väg 2 (56×215) med ett fackverk av 1 (56×180) ovanpå, 2 m högt (10 830 $$).
            noder: [
                [0, 0], [14, 0], [5, 0], [9, 0], [5, 2], [9, 2]
            ],
            balkar: [
                [0, 2, 1, true], [2, 3, 1, true], [3, 1, 1, true], [0, 4, 0], [4, 5, 0], [5, 1, 0],
                [2, 4, 0], [3, 5, 0]
            ]
        }
    },
    {
        // Som Bäcken, men dubbelt så långt spann.
        namn: 'Ån',
        spann: 24,
        fasten: [[0, 0, 'fast'], [1, -3], [24, 0, 'glid'], [23, -3]],
        kant: 1 / 3,
        vatten: -6,
        budget: 26000,
        keiws: 3.5,
        omrade: { x0: -3, x1: 27, y0: -5, y1: 9 },
        vy: { x0: -7, x1: 31, y0: -6.5, y1: 9.5 },
        losning: {
            // Fackverk av 1 (56×180): väg överst, underram 3 m ner (22 650 $$).
            noder: [[0, 0], [1, -3], [24, 0], [23, -3], [4, 0], [8, 0], [12, 0], [16, 0], [20, 0],
                    [4, -3], [8, -3], [12, -3], [16, -3], [20, -3]],
            balkar: [
                [0, 4, 0, true], [4, 5, 0, true], [5, 6, 0, true], [6, 7, 0, true], [7, 8, 0, true], [8, 2, 0, true],
                [1, 9, 0], [9, 10, 0], [10, 11, 0], [11, 12, 0], [12, 13, 0], [13, 3, 0],
                [4, 9, 0], [5, 10, 0], [6, 11, 0], [7, 12, 0], [8, 13, 0],
                [1, 4, 0], [9, 5, 0], [10, 6, 0], [6, 12, 0], [7, 13, 0], [8, 3, 0]
            ]
        }
    },
    {
        // En kort ravin utan vatten, med mjuka sluttningar och ett fäste
        // halvvägs ner på var sida.
        namn: 'Ravinen',
        spann: 20,
        fasten: [[0, 0, 'fast'], [4, -5], [20, 0, 'glid'], [16, -5]],
        dal: { djup: 10, bredd: 8 },
        vatten: -10,
        torr: true,
        budget: 16000,
        keiws: 3,
        omrade: { x0: -3, x1: 23, y0: -9, y1: 8 },
        vy: { x0: -5, x1: 25, y0: -11, y1: 8.5 },
        losning: {
            // Väg 3 (66×225) på strävor av 1 från fästena i sluttningarna (14 650 $$).
            noder: [
                [0, 0], [4, -5], [20, 0], [16, -5], [4, 0], [8, 0], [12, 0], [16, 0]
            ],
            balkar: [
                [0, 4, 2, true], [4, 5, 2, true], [5, 6, 2, true], [6, 7, 2, true], [7, 2, 2, true], [1, 4, 0],
                [1, 5, 0], [3, 7, 0], [3, 6, 0]
            ]
        }
    },
    {
        // En bred och djup dalgång utan vatten, med långa sluttningar där
        // man kan ställa stöd.
        namn: 'Dalgången',
        spann: 60,
        rutnat: 2,
        material: ['limtra', 'stal'],
        fasten: [[0, 0, 'fast'], [12, -12], [60, 0, 'glid'], [48, -12], [16, -18], [44, -18]],
        dal: { djup: 24, bredd: 24 },
        vatten: -24,
        torr: true,
        budget: 87000,
        keiws: 5.5,
        omrade: { x0: -4, x1: 64, y0: -22, y1: 16 },
        vy: { x0: -8, x1: 68, y0: -25, y1: 17 },
        losning: {
            // Båge av 4 (90×245) med pelare av 1 till vägen (4), och
            // snedsträvor av 4 och stöd av 2 (56×215) från de övre
            // fästena (83 090 $$).
            noder: [
                [0, 0], [12, -12], [60, 0], [48, -12], [16, -18], [44, -18], [2, 0], [4, 0],
                [6, 0], [8, 0], [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0],
                [22, 0], [24, 0], [26, 0], [28, 0], [30, 0], [32, 0], [34, 0], [36, 0],
                [38, 0], [40, 0], [42, 0], [44, 0], [46, 0], [48, 0], [50, 0], [52, 0],
                [54, 0], [56, 0], [58, 0], [20, -12], [24, -8], [28, -6], [32, -6], [36, -8],
                [40, -12]
            ],
            balkar: [
                [0, 6, 3, true], [6, 7, 3, true], [7, 8, 3, true], [8, 9, 3, true], [9, 10, 3, true], [10, 11, 3, true],
                [11, 12, 3, true], [12, 13, 3, true], [13, 14, 3, true], [14, 15, 3, true], [15, 16, 3, true], [16, 17, 3, true],
                [17, 18, 3, true], [18, 19, 3, true], [19, 20, 3, true], [20, 21, 3, true], [21, 22, 3, true], [22, 23, 3, true],
                [23, 24, 3, true], [24, 25, 3, true], [25, 26, 3, true], [26, 27, 3, true], [27, 28, 3, true], [28, 29, 3, true],
                [29, 30, 3, true], [30, 31, 3, true], [31, 32, 3, true], [32, 33, 3, true], [33, 34, 3, true], [34, 2, 3, true],
                [4, 35, 3], [35, 36, 3], [36, 37, 3], [37, 38, 3], [38, 39, 3], [39, 40, 3],
                [40, 5, 3], [35, 15, 0], [36, 17, 0], [37, 19, 0], [38, 21, 0], [39, 23, 0],
                [40, 25, 0], [1, 11, 1], [1, 8, 3], [1, 4, 1], [3, 29, 1], [3, 32, 3],
                [3, 5, 1]
            ]
        }
    },
    {
        // Längre spann med en farled i mitten. Här får man bygga pelare från
        // botten (dyrt), men inte i farleden.
        namn: 'Kanalen',
        spann: 48,
        rutnat: 2,
        fasten: [[0, 0, 'fast'], [2, -4], [48, 0, 'glid'], [46, -4], [-4, 0], [52, 0]],
        kant: 0.5,
        vatten: -6,
        budget: 68000,
        keiws: 5,
        omrade: { x0: -4, x1: 52, y0: -4, y1: 12 },
        vy: { x0: -9, x1: 57, y0: -7.5, y1: 12.5 },
        farled: { x0: 16, x1: 32, y: -2 },
        material: ['limtra', 'stal'],
        pelare: { botten: -10, pris: 3000, perMeter: 150 },
        losning: {
            // Väg 90×315 på två pelare 4 m ner, med strävor av 3 (66×225) (64 650 $$).
            noder: [[0, 0], [0, -4], [48, 0], [48, -4], [-4, 0], [52, 0], [2, 0], [4, 0], [6, 0], [8, 0],
                    [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0], [22, 0], [24, 0], [26, 0], [28, 0],
                    [30, 0], [32, 0], [34, 0], [36, 0], [38, 0], [40, 0], [42, 0], [44, 0], [46, 0],
                    [14, -4, 'pelare'], [34, -4, 'pelare']],
            balkar: [
                [0, 6, '90×315', true], [6, 7, '90×315', true], [7, 8, '90×315', true], [8, 9, '90×315', true], [9, 10, '90×315', true],
                [10, 11, '90×315', true], [11, 12, '90×315', true], [12, 13, '90×315', true], [13, 14, '90×315', true], [14, 15, '90×315', true],
                [15, 16, '90×315', true], [16, 17, '90×315', true], [17, 18, '90×315', true], [18, 19, '90×315', true], [19, 20, '90×315', true],
                [20, 21, '90×315', true], [21, 22, '90×315', true], [22, 23, '90×315', true], [23, 24, '90×315', true], [24, 25, '90×315', true],
                [25, 26, '90×315', true], [26, 27, '90×315', true], [27, 28, '90×315', true], [28, 2, '90×315', true],
                [29, 10, 2], [29, 12, 2], [29, 14, 2], [30, 20, 2], [30, 22, 2], [30, 24, 2]
            ]
        }
    },
    {
        // En bred älv med en farled på 70 m, och två fundament i vattnet
        // för pyloner: en snedkabelbro.
        namn: 'Älven',
        spann: 160,
        rutnat: 5,
        material: ['limtra', 'stal', 'betong', 'vajer'],
        element: 2.5,
        maxLangd: 20,
        maxKabel: 100,
        maxZoom: 12,
        fasten: [[0, 0, 'fast'], [160, 0, 'glid'], [-5, 0], [165, 0], [40, -8], [120, -8]],
        kant: 0.4,
        vatten: -8,
        budget: 240000,
        bil: true,
        keiws: 8,
        omrade: { x0: -5, x1: 165, y0: -8, y1: 50 },
        vy: { x0: -15, x1: 175, y0: -10, y1: 52 },
        farled: { x0: 45, x1: 115, y: -1 },
        pelare: { botten: -16, pris: 3000, perMeter: 150 },
        losning: {
            // Väg av stål IPE 220 (för bilen), pyloner av betong 2 38 m
            // höga på fundamenten, fyra kablar 2 (Ø 14) åt var håll (228 850 $$).
            noder: [
                [0, 0], [160, 0], [-5, 0], [165, 0], [40, -8, 'styv'], [120, -8, 'styv'], [5, 0], [10, 0],
                [15, 0], [20, 0], [25, 0], [30, 0], [35, 0], [40, 0], [45, 0], [50, 0],
                [55, 0], [60, 0], [65, 0], [70, 0], [75, 0], [80, 0], [85, 0], [90, 0],
                [95, 0], [100, 0], [105, 0], [110, 0], [115, 0], [120, 0], [125, 0], [130, 0],
                [135, 0], [140, 0], [145, 0], [150, 0], [155, 0], [40, 10], [40, 20], [40, 30],
                [120, 10], [120, 20], [120, 30]
            ],
            balkar: [
                [0, 6, 'IPE 220', true, 'stal'], [6, 7, 'IPE 220', true, 'stal'], [7, 8, 'IPE 220', true, 'stal'], [8, 9, 'IPE 220', true, 'stal'], [9, 10, 'IPE 220', true, 'stal'],
                [10, 11, 'IPE 220', true, 'stal'], [11, 12, 'IPE 220', true, 'stal'], [12, 13, 'IPE 220', true, 'stal'], [13, 14, 'IPE 220', true, 'stal'], [14, 15, 'IPE 220', true, 'stal'],
                [15, 16, 'IPE 220', true, 'stal'], [16, 17, 'IPE 220', true, 'stal'], [17, 18, 'IPE 220', true, 'stal'], [18, 19, 'IPE 220', true, 'stal'], [19, 20, 'IPE 220', true, 'stal'],
                [20, 21, 'IPE 220', true, 'stal'], [21, 22, 'IPE 220', true, 'stal'], [22, 23, 'IPE 220', true, 'stal'], [23, 24, 'IPE 220', true, 'stal'], [24, 25, 'IPE 220', true, 'stal'],
                [25, 26, 'IPE 220', true, 'stal'], [26, 27, 'IPE 220', true, 'stal'], [27, 28, 'IPE 220', true, 'stal'], [28, 29, 'IPE 220', true, 'stal'], [29, 30, 'IPE 220', true, 'stal'],
                [30, 31, 'IPE 220', true, 'stal'], [31, 32, 'IPE 220', true, 'stal'], [32, 33, 'IPE 220', true, 'stal'], [33, 34, 'IPE 220', true, 'stal'], [34, 35, 'IPE 220', true, 'stal'],
                [35, 36, 'IPE 220', true, 'stal'], [36, 1, 'IPE 220', true, 'stal'], [4, 13, 1, false, 'betong'], [13, 37, 1, false, 'betong'], [37, 38, 1, false, 'betong'],
                [38, 39, 1, false, 'betong'], [39, 11, 1, false, 'vajer'], [39, 15, 1, false, 'vajer'], [39, 9, 1, false, 'vajer'], [39, 17, 1, false, 'vajer'],
                [39, 7, 1, false, 'vajer'], [39, 19, 1, false, 'vajer'], [39, 0, 1, false, 'vajer'], [39, 21, 1, false, 'vajer'], [5, 29, 1, false, 'betong'],
                [29, 40, 1, false, 'betong'], [40, 41, 1, false, 'betong'], [41, 42, 1, false, 'betong'], [42, 27, 1, false, 'vajer'], [42, 31, 1, false, 'vajer'],
                [42, 25, 1, false, 'vajer'], [42, 33, 1, false, 'vajer'], [42, 23, 1, false, 'vajer'], [42, 35, 1, false, 'vajer'], [42, 21, 1, false, 'vajer'],
                [42, 1, 1, false, 'vajer']
            ]
        }
    },
    {
        // Ut till en ö: 400 m över havet, med en farled på 200 m för
        // de stora fartygen. En hängbro.
        namn: 'Havet',
        spann: 400,
        rutnat: 10,
        material: ['limtra', 'stal', 'betong', 'vajer'],
        element: 5,
        maxLangd: 30,
        maxKabel: 150,
        maxZoom: 16,
        fasten: [[0, 0, 'fast'], [400, 0, 'glid'], [-40, 0], [440, 0], [80, -30], [320, -30]],
        kant: 0.4,
        vatten: -30,
        budget: 1000000,
        bil: true,
        keiws: 12,
        ö: 60,
        omrade: { x0: -40, x1: 440, y0: -30, y1: 100 },
        vy: { x0: -50, x1: 470, y0: -32, y1: 102 },
        farled: { x0: 100, x1: 300, y: -5 },
        pelare: { botten: -60, pris: 3000, perMeter: 150 },
        losning: {
            // Hängbro: pyloner av betong 5 (90 m), huvudkabel 6 (Ø 32)
            // förankrad på land, hängare 2 (Ø 14) var 20 m, väg av stål
            // IPE 330 och pelare var 10 m under sidospannen (961 250 $$).
            noder: [
                [0, 0], [400, 0], [-40, 0], [440, 0], [80, -30, 'styv'], [320, -30, 'styv'], [10, 0, 'pelare'], [20, 0, 'pelare'],
                [30, 0, 'pelare'], [40, 0, 'pelare'], [50, 0, 'pelare'], [60, 0, 'pelare'], [70, 0, 'pelare'], [80, 0], [90, 0], [100, 0],
                [110, 0], [120, 0], [130, 0], [140, 0], [150, 0], [160, 0], [170, 0], [180, 0],
                [190, 0], [200, 0], [210, 0], [220, 0], [230, 0], [240, 0], [250, 0], [260, 0],
                [270, 0], [280, 0], [290, 0], [300, 0], [310, 0], [320, 0], [330, 0, 'pelare'], [340, 0, 'pelare'],
                [350, 0, 'pelare'], [360, 0, 'pelare'], [370, 0, 'pelare'], [380, 0, 'pelare'], [390, 0, 'pelare'], [80, -20], [80, -10], [80, 20],
                [80, 40], [80, 60], [320, -20], [320, -10], [320, 20], [320, 40], [320, 60], [100, 40],
                [120, 30], [140, 20], [160, 20], [180, 10], [200, 10], [220, 10], [240, 20], [260, 20],
                [280, 30], [300, 40]
            ],
            balkar: [
                [0, 6, 'IPE 330', true, 'stal'], [6, 7, 'IPE 330', true, 'stal'], [7, 8, 'IPE 330', true, 'stal'], [8, 9, 'IPE 330', true, 'stal'], [9, 10, 'IPE 330', true, 'stal'],
                [10, 11, 'IPE 330', true, 'stal'], [11, 12, 'IPE 330', true, 'stal'], [12, 13, 'IPE 330', true, 'stal'], [13, 14, 'IPE 330', true, 'stal'], [14, 15, 'IPE 330', true, 'stal'],
                [15, 16, 'IPE 330', true, 'stal'], [16, 17, 'IPE 330', true, 'stal'], [17, 18, 'IPE 330', true, 'stal'], [18, 19, 'IPE 330', true, 'stal'], [19, 20, 'IPE 330', true, 'stal'],
                [20, 21, 'IPE 330', true, 'stal'], [21, 22, 'IPE 330', true, 'stal'], [22, 23, 'IPE 330', true, 'stal'], [23, 24, 'IPE 330', true, 'stal'], [24, 25, 'IPE 330', true, 'stal'],
                [25, 26, 'IPE 330', true, 'stal'], [26, 27, 'IPE 330', true, 'stal'], [27, 28, 'IPE 330', true, 'stal'], [28, 29, 'IPE 330', true, 'stal'], [29, 30, 'IPE 330', true, 'stal'],
                [30, 31, 'IPE 330', true, 'stal'], [31, 32, 'IPE 330', true, 'stal'], [32, 33, 'IPE 330', true, 'stal'], [33, 34, 'IPE 330', true, 'stal'], [34, 35, 'IPE 330', true, 'stal'],
                [35, 36, 'IPE 330', true, 'stal'], [36, 37, 'IPE 330', true, 'stal'], [37, 38, 'IPE 330', true, 'stal'], [38, 39, 'IPE 330', true, 'stal'], [39, 40, 'IPE 330', true, 'stal'],
                [40, 41, 'IPE 330', true, 'stal'], [41, 42, 'IPE 330', true, 'stal'], [42, 43, 'IPE 330', true, 'stal'], [43, 44, 'IPE 330', true, 'stal'], [44, 1, 'IPE 330', true, 'stal'],
                [4, 45, 4, false, 'betong'], [45, 46, 4, false, 'betong'], [46, 13, 4, false, 'betong'], [13, 47, 4, false, 'betong'], [47, 48, 4, false, 'betong'],
                [48, 49, 4, false, 'betong'], [5, 50, 4, false, 'betong'], [50, 51, 4, false, 'betong'], [51, 37, 4, false, 'betong'], [37, 52, 4, false, 'betong'],
                [52, 53, 4, false, 'betong'], [53, 54, 4, false, 'betong'], [2, 49, 5, false, 'vajer'], [49, 55, 5, false, 'vajer'], [55, 56, 5, false, 'vajer'],
                [56, 57, 5, false, 'vajer'], [57, 58, 5, false, 'vajer'], [58, 59, 5, false, 'vajer'], [59, 60, 5, false, 'vajer'], [60, 61, 5, false, 'vajer'],
                [61, 62, 5, false, 'vajer'], [62, 63, 5, false, 'vajer'], [63, 64, 5, false, 'vajer'], [64, 65, 5, false, 'vajer'], [65, 54, 5, false, 'vajer'],
                [54, 3, 5, false, 'vajer'], [55, 15, 1, false, 'vajer'], [56, 17, 1, false, 'vajer'], [57, 19, 1, false, 'vajer'], [58, 21, 1, false, 'vajer'],
                [59, 23, 1, false, 'vajer'], [60, 25, 1, false, 'vajer'], [61, 27, 1, false, 'vajer'], [62, 29, 1, false, 'vajer'], [63, 31, 1, false, 'vajer'],
                [64, 33, 1, false, 'vajer'], [65, 35, 1, false, 'vajer']
            ]
        }
    }
];

// En banas fästpunkter som noder i en ny ritning.
function nyRitning(bana) {
    return { version: 7, noder: bana.fasten.map(([x, y, lager]) => fastNod(x, y, lager)), balkar: [] };
}

// Vad en ritning kostar: balkarna (och vägbanan) per meter, förbanden och
// pelarna (rundat till tiotal).
function ritningensKostnad(r, bana) {
    let k = 0;
    for (const b of r.balkar) {
        const na = r.noder[b.a], nb = r.noder[b.b];
        k += Math.hypot(nb.x - na.x, nb.y - na.y) * (profil(b.material || 'limtra', b.storlek).pris + (b.vag ? VAG.pris : 0));
    }
    r.noder.forEach((n, i) => {
        if (n.pelare) k += pelarensPris(bana, n.y);
        else if (!n.fast) k += forbandet(r, i).pris;
    });
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
        version: 7,
        noder: l.noder.map(([x, y, typ], i) => i < bana.fasten.length ? Object.assign(fastNod(x, y, bana.fasten[i][2]), typ === 'styv' ? { styv: true } : {})
            : typ === 'pelare' ? { x, y, fast: true, styv: false, pelare: true, lager: 'glid' } : { x, y, fast: false, styv: true }),
        balkar: l.balkar.map(([a, b, storlek, vag, material = 'limtra']) => ({ a, b, storlek, vag: !!vag, material }))
    };
}
