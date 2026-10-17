// Banorna. Allt i meter, y uppåt, vägbanans nivå är y = 0.
//
//   spann:  avståndet mellan klippkanterna (vänster kant vid x = 0)
//   rutnat: m mellan punkterna man bygger på (1 om det saknas)
//   element, maxLangd, maxKabel: för de stora banorna (fysikens
//           elementlängd, längsta balk och kabel i m)
//   ö:      bredden på ön till höger (annars fortsätter landet)
//   kant:   vattenbanornas kanter: m i sidled per m ner (branta, rundade
//           överst); dal: {djup, bredd} för landbanornas mjuka dal (se
//           markY i spel.js)
//   tra:    {bredd, hojd} i mm: de trädimensioner som finns (de två första
//           banorna har färre, för att göra det enklare; alla om det saknas)
//   material: vilka material som finns (trä och stål om det saknas);
//           Bäcken, Ån och Sundet har bara trä, stålet (och rören) kommer
//           på Kanalen, betongen och kablarna på Älven
//   fasten: fästpunkterna i berget [x, y] eller [x, y, lager]. Vägbanans
//           fästen är brolager (alltid ledade): 'fast' låser x och y,
//           'glid' bara y (rör sig fritt i sidled, som på riktiga broar,
//           så att en rak balk inte kan hänga som en lina). Övriga fästen
//           låser x och y och kan vara styva eller ledade (två av dem
//           ligger på land, 3 m bakom kanterna). Ett fäste ute i vattnet
//           är ett fundament (ritas som betong ner till botten).
//   vatten: vattenytan, keIWs som hamnar där har misslyckats
//   torr:   inget vatten, bara marken i dalen (vatten = dalens botten)
//   botten: en grund botten under vattnet (annars fortsätter kanterna
//           neråt); keIWs har ändå misslyckats när han når vattnet
//   profil: i stället för kant och botten: marken som punkter [x, y] från
//           (0, 0) till (spann, 0), ojämna kanter och botten (mjukt
//           emellan, se profilY i spel.js)
//   budget: i $$ (spelets pengar); man får bygga över, men då blir det
//           inga stjärnor
//   bil:    keIWs kör bil (2,5 ton på två hjul) i stället för att gå
//   omrade: där man får sätta knutpunkter (över land bara ovanför marken)
//   vy:     det som syns utan zoom: bredden x0–x1 och upp till y1 (marken på samma
//           höjd på skärmen på alla banor, nedåt syns det som får plats)
//   farled: {x0, x1, y}: under y mellan x0 och x1 får inget byggas (båtarna)
//   pelare: {botten, pris, perMeter}: här får man bygga pelare över vattnet,
//           från botten upp till en knutpunkt (med glidlager överst)
//   losning: en bro som håller (testerna kör den); en nod [x, y, 'pelare']
//           är en pelare, [x, y, 'ledad'] en ledad knut, ett fäste [x, y, 'styv'] är styvt, och en balk är
//           [a, b, storlek (0–5, knapparna 1–6), väg, material] (limträ om det saknas)
//   facit:  {enkel, effektiv}: två möjliga lösningar som spelaren kan hämta
//           i menyn (som losning, med en text), något att utgå ifrån. Den
//           enkla är en alldeles för grov balk (över budget), den
//           kostnadseffektiva ett fackverk med tydliga trianglar och ledade
//           knutar, under budget men inte bäst (det får man hitta själv).

// Trädimensionerna på de två första banorna (färre att välja bland).
const TRA_ENKEL = { bredd: [42, 56, 66, 90, 115], hojd: [180, 270, 360, 450, 540] };

const BANOR = [
    {
        namn: 'Bäcken',
        // 14 m: längre än en balk (12 m), så man måste skarva. Bara trä.
        // En rak balk måste vara grov (90×450) och går ändå (stålet, som
        // kommer på Ravinen, skulle behöva HEA 200 och gå över budget); ett litet
        // fackverk är billigast.
        spann: 14,
        material: ['limtra'],
        tra: TRA_ENKEL,
        fasten: [[0, 0, 'fast'], [14, 0, 'glid']],
        // Branta kanter, en grund botten som går lite upp och ner.
        profil: [[0, 0], [0.25, -0.35], [0.5, -1.05], [0.75, -1.85], [1.25, -2.55], [2.2, -2.95], [4, -3.15],
                 [6, -2.95], [7.6, -3.3], [9.6, -3.1], [11.4, -2.9], [12.4, -2.55], [13.0, -1.75],
                 [13.45, -0.9], [13.75, -0.3], [14, 0]],
        vatten: -2,
        budget: 13000,
        omrade: { x0: 0, x1: 14, y0: -1, y1: 7 },
        vy: { x0: -4, x1: 18, y0: -3.5, y1: 7.5 },
        losning: {
            // Väg 42×270 med ett fackverk ovanpå, 3 m högt, ledade knutar och en
            // diagonal i mittfacket: överramen trycks och måste vara tjock åt
            // sidan (90×180), stängerna 42×180 (11 350 $$).
            noder: [
                [0, 0], [14, 0], [5, 0, 'ledad'], [9, 0, 'ledad'], [5, 3, 'ledad'], [9, 3, 'ledad']
            ],
            balkar: [
                [0, 2, '42×270', true], [2, 3, '42×270', true], [3, 1, '42×270', true], [0, 4, '90×180'], [4, 5, '90×180'],
                [5, 1, '90×180'], [2, 4, '42×180'], [3, 5, '42×180'], [4, 3, '42×180']
            ]
        },
        facit: {
            enkel: {
                text: 'En rak balk, skarvad i mitten. Den håller med råge, men är alldeles för grov och dyr.',
                noder: [[0, 0], [14, 0], [7, 0]],
                balkar: [[0, 2, '115×540', true], [2, 1, '115×540', true]]
            },
            effektiv: {
                text: 'Ett fackverk ovanpå vägen: trianglar, som inte kan tryckas sneda, och ledade knutar, '
                    + 'så att balkarna dras eller trycks i stället för att böjas. Det går att göra billigare.',
                noder: [[0, 0], [14, 0], [5, 0, 'ledad'], [9, 0, 'ledad'], [5, 3, 'ledad'], [9, 3, 'ledad']],
                balkar: [
                    [0, 2, '56×270', true], [2, 3, '56×270', true], [3, 1, '56×270', true], [0, 4, '90×180'], [4, 5, '90×180'],
                    [5, 1, '90×180'], [2, 4, '42×180'], [3, 5, '42×180'], [4, 3, '42×180']
                ]
            }
        }
    },
    {
        // Ett bredare och djupare vatten (5–9 m), också bara trä. Ett fäste
        // 3 m ner i vardera slänten.
        namn: 'Ån',
        spann: 26,
        material: ['limtra'],
        tra: TRA_ENKEL,
        fasten: [[0, 0, 'fast'], [1, -3], [26, 0, 'glid'], [25, -3]],
        profil: [[0, 0], [0.3, -0.4], [0.7, -1.5], [0.9, -2.4], [1.15, -3], [1.6, -4], [1.9, -5], [2.6, -6],
                 [3.2, -7.2], [4.5, -8.1], [6, -8.8], [8, -9.7], [10.5, -10.4], [13, -10.8], [15.5, -10.5],
                 [17.5, -9.9], [19.5, -9.3], [21.5, -8.4], [23, -7.5], [23.8, -6.4], [24.2, -5.2], [24.55, -4],
                 [24.85, -3], [25.15, -2], [25.45, -1], [25.75, -0.35], [26, 0]],
        vatten: -4,
        budget: 22000,
        omrade: { x0: -3, x1: 29, y0: -4, y1: 9 },
        vy: { x0: -7, x1: 33, y0: -11.5, y1: 9.5 },
        losning: {
            // Väg med två knutpunkter (7 och 19 m), var och en buren av en sträva
            // från fästet i slänten (som Isaks bro). Strävorna trycks och knäcks
            // åt sidan om de är smala: 115×270 (21 210 $$).
            noder: [[0, 0], [1, -3], [26, 0], [25, -3], [7, 0], [19, 0]],
            balkar: [[0, 4, '56×360', true], [4, 5, '66×360', true], [5, 2, '56×360', true], [1, 4, '115×270'], [3, 5, '115×270']]
        },
        facit: {
            enkel: {
                text: 'En grov väg på två grova strävor från fästena i slänterna. Den håller med råge, men är för dyr.',
                noder: [[0, 0], [1, -3], [26, 0], [25, -3], [7, 0], [19, 0]],
                balkar: [[0, 4, '90×450', true], [4, 5, '90×450', true], [5, 2, '90×450', true], [1, 4, '115×360'], [3, 5, '115×360']]
            },
            effektiv: {
                text: 'Två strävor från varje fäste bildar trianglar med vägen, och knutarna är ledade, så att '
                    + 'strävorna bara trycks. Det går att göra billigare.',
                noder: [[0, 0], [1, -3], [26, 0], [25, -3], [3, 0, 'ledad'], [8, 0, 'ledad'], [18, 0, 'ledad'], [23, 0, 'ledad']],
                balkar: [[0, 4, '42×270', true], [4, 5, '42×270', true], [5, 6, '66×450', true], [6, 7, '42×270', true],
                         [7, 2, '42×270', true], [1, 4, '56×180'], [1, 5, '115×270'], [3, 6, '115×270'], [3, 7, '56×180']]
            }
        }
    },
    {
        // 38 m: för långt för vägen på strävor från slänterna, så det blir
        // ett fackverk (bara trä). Ojämna slänter och botten, 8–11 m djupt.
        namn: 'Sundet',
        spann: 38,
        material: ['limtra'],
        fasten: [[0, 0, 'fast'], [2, -4], [38, 0, 'glid'], [36, -4]],
        // Vattnet 2 m under de nedre fästena (-4), så att man inte bygger ner i vattnet.
        profil: [[0, 0], [0.4, -0.6], [0.9, -1.8], [1.4, -2.9], [2, -4], [2.5, -6.2], [3.3, -8], [4.6, -9.6],
                 [6.5, -10.5], [9, -11.6], [12, -12.4], [15, -12.9], [18, -13.4], [21, -13], [24, -12.6], [27, -12.9],
                 [30, -11.8], [32.5, -10.4], [34.2, -8.6], [35.2, -6.4], [36, -4], [36.6, -2.8], [37.2, -1.5],
                 [37.7, -0.5], [38, 0]],
        vatten: -5,
        budget: 48000,
        omrade: { x0: -3, x1: 41, y0: -4, y1: 12 },
        vy: { x0: -7, x1: 45, y0: -15, y1: 12 },
        losning: {
            // Fackverk 4 m högt med fack på 4 m (3 m kring mitten): väg 42×270,
            // överram 115×180 och stolpar 78×180 (de trycks), diagonaler 42×180
            // (dragna) (45 160 $$).
            noder: [[0, 0], [2, -4], [38, 0], [36, -4], [4, 0], [8, 0], [12, 0], [16, 0], [19, 0], [22, 0], [26, 0],
                    [30, 0], [34, 0], [4, 4], [8, 4], [12, 4], [16, 4], [19, 4], [22, 4], [26, 4], [30, 4], [34, 4]],
            balkar: [
                ...[0, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a, i, v) => [a, v[i + 1] ?? 2, '42×270', true]),
                ...[13, 14, 15, 16, 17, 18, 19, 20].map(a => [a, a + 1, '115×180']),
                [0, 13, '115×180'], [2, 21, '115×180'],
                ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map(a => [a, a + 9, '78×180']),
                [13, 5, '42×180'], [14, 6, '42×180'], [15, 7, '42×180'], [16, 8, '42×180'],
                [8, 18, '42×180'], [9, 19, '42×180'], [10, 20, '42×180'], [11, 21, '42×180']
            ]
        }
    },
    {
        // 50 m med raka kanaler: här kommer stålet, och rören (KKR). Trä finns
        // kvar, men ett fackverk av trä går över budget (ca 65 700).
        namn: 'Kanalen',
        spann: 50,
        material: ['limtra', 'stal'],
        fasten: [[0, 0, 'fast'], [2, -4], [50, 0, 'glid'], [48, -4], [-4, 0], [54, 0]],
        kant: 0.5,
        vatten: -6,
        budget: 64000,
        omrade: { x0: -4, x1: 54, y0: -4, y1: 12 },
        vy: { x0: -9, x1: 59, y0: -7.5, y1: 12.5 },
        losning: {
            // Bågfackverk, 6 m högt på mitten, fack på 5 m: väg IPE 100, båge
            // KKR 100×5 (trycks), hängare KKR 40×3 och diagonaler KKR 60×4 (60 900 $$).
            noder: [[0, 0], [2, -4], [50, 0], [48, -4], [-4, 0], [54, 0],
                    [5, 0], [10, 0], [15, 0], [20, 0], [25, 0], [30, 0], [35, 0], [40, 0], [45, 0],
                    [5, 2], [10, 4], [15, 5], [20, 6], [25, 6], [30, 6], [35, 5], [40, 4], [45, 2]],
            balkar: [
                ...[0, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((a, i, v) => [a, v[i + 1] ?? 2, 'IPE 100', true, 'stal']),
                ...[15, 16, 17, 18, 19, 20, 21, 22].map(a => [a, a + 1, 'KKR 100×5', false, 'stal']),
                [0, 15, 'KKR 100×5', false, 'stal'], [2, 23, 'KKR 100×5', false, 'stal'],
                ...[6, 7, 8, 9, 10, 11, 12, 13, 14].map(a => [a, a + 9, 'KKR 40×3', false, 'stal']),
                [15, 7, 'KKR 60×4', false, 'stal'], [16, 8, 'KKR 60×4', false, 'stal'], [17, 9, 'KKR 60×4', false, 'stal'],
                [18, 10, 'KKR 60×4', false, 'stal'], [10, 20, 'KKR 60×4', false, 'stal'], [11, 21, 'KKR 60×4', false, 'stal'],
                [12, 22, 'KKR 60×4', false, 'stal'], [13, 23, 'KKR 60×4', false, 'stal']
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
        omrade: { x0: -3, x1: 23, y0: -9, y1: 8 },
        vy: { x0: -5, x1: 25, y0: -11, y1: 8.5 },
        losning: {
            // Väg 42×225 på strävor från fästena i sluttningarna, tjocka åt sidan
            // (66×180 och 90×180) så att de inte knäcks (14 870 $$).
            noder: [
                [0, 0], [4, -5], [20, 0], [16, -5], [4, 0], [8, 0], [12, 0], [16, 0]
            ],
            balkar: [
                [0, 4, '42×225', true], [4, 5, '42×225', true], [5, 6, '42×225', true], [6, 7, '42×225', true],
                [7, 2, '42×225', true], [1, 4, '66×180'], [1, 5, '90×180'], [3, 7, '66×180'], [3, 6, '90×180']
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
        budget: 104000,
        omrade: { x0: -4, x1: 64, y0: -22, y1: 16 },
        vy: { x0: -9.5, x1: 69.5, y0: -25, y1: 17 },
        losning: {
            // Båge av 140×180 med stolpar av 140×180 till vägen (4), och
            // snedsträvor (140×225) och stöd från de övre fästena (100 620 $$; vägen steg 4, steg 3 går av när keIWs går fort).
            // Allt som trycks är tjockt åt sidan, annars knäcks det.
            noder: [
                [0, 0], [12, -12], [60, 0], [48, -12], [16, -18], [44, -18], [2, 0], [4, 0],
                [6, 0], [8, 0], [10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0],
                [22, 0], [24, 0], [26, 0], [28, 0], [30, 0], [32, 0], [34, 0], [36, 0],
                [38, 0], [40, 0], [42, 0], [44, 0], [46, 0], [48, 0], [50, 0], [52, 0],
                [54, 0], [56, 0], [58, 0], [20, -12], [24, -8], [28, -6], [32, -6], [36, -8],
                [40, -12]
            ],
            balkar: [
                [0, 6, 4, true], [6, 7, 4, true], [7, 8, 4, true], [8, 9, 4, true], [9, 10, 4, true], [10, 11, 4, true],
                [11, 12, 4, true], [12, 13, 4, true], [13, 14, 4, true], [14, 15, 4, true], [15, 16, 4, true], [16, 17, 4, true],
                [17, 18, 4, true], [18, 19, 4, true], [19, 20, 4, true], [20, 21, 4, true], [21, 22, 4, true], [22, 23, 4, true],
                [23, 24, 4, true], [24, 25, 4, true], [25, 26, 4, true], [26, 27, 4, true], [27, 28, 4, true], [28, 29, 4, true],
                [29, 30, 4, true], [30, 31, 4, true], [31, 32, 4, true], [32, 33, 4, true], [33, 34, 4, true], [34, 2, 4, true],
                [4, 35, '140×180'], [35, 36, '140×180'], [36, 37, '140×180'], [37, 38, '140×180'], [38, 39, '140×180'],
                [39, 40, '140×180'], [40, 5, '140×180'], [35, 15, '140×180'], [36, 17, '140×180'], [37, 19, '140×180'],
                [38, 21, '140×180'], [39, 23, '140×180'], [40, 25, '140×180'], [1, 11, '140×180'], [1, 8, '140×225'],
                [1, 4, '42×180'], [3, 29, '140×180'], [3, 32, '140×225'], [3, 5, '42×180']
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
        fasten: [[0, 0, 'fast'], [160, 0, 'glid'], [-5, 0], [165, 0], [40, -8], [120, -8]],
        kant: 0.4,
        vatten: -8,
        budget: 240000,
        bil: true,
        omrade: { x0: -5, x1: 165, y0: -8, y1: 50 },
        vy: { x0: -31, x1: 191, y0: -10, y1: 52 },
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
        fasten: [[0, 0, 'fast'], [400, 0, 'glid'], [-40, 0], [440, 0], [80, -30], [320, -30]],
        kant: 0.4,
        vatten: -30,
        budget: 1050000,
        bil: true,
        ö: 60,
        omrade: { x0: -40, x1: 440, y0: -30, y1: 100 },
        vy: { x0: -78, x1: 478, y0: -32, y1: 102 },
        farled: { x0: 100, x1: 300, y: -5 },
        pelare: { botten: -60, pris: 3000, perMeter: 150 },
        losning: {
            // Hängbro: pyloner av betong 5 (90 m), huvudkabel 6 (Ø 32)
            // förankrad på land, hängare 2 (Ø 14) var 20 m, väg av stål
            // IPE 360 och pelare var 10 m under sidospannen (1 024 190 $$; IPE 330
            // går av när bilen kör fort).
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
                [0, 6, 'IPE 360', true, 'stal'], [6, 7, 'IPE 360', true, 'stal'], [7, 8, 'IPE 360', true, 'stal'], [8, 9, 'IPE 360', true, 'stal'], [9, 10, 'IPE 360', true, 'stal'],
                [10, 11, 'IPE 360', true, 'stal'], [11, 12, 'IPE 360', true, 'stal'], [12, 13, 'IPE 360', true, 'stal'], [13, 14, 'IPE 360', true, 'stal'], [14, 15, 'IPE 360', true, 'stal'],
                [15, 16, 'IPE 360', true, 'stal'], [16, 17, 'IPE 360', true, 'stal'], [17, 18, 'IPE 360', true, 'stal'], [18, 19, 'IPE 360', true, 'stal'], [19, 20, 'IPE 360', true, 'stal'],
                [20, 21, 'IPE 360', true, 'stal'], [21, 22, 'IPE 360', true, 'stal'], [22, 23, 'IPE 360', true, 'stal'], [23, 24, 'IPE 360', true, 'stal'], [24, 25, 'IPE 360', true, 'stal'],
                [25, 26, 'IPE 360', true, 'stal'], [26, 27, 'IPE 360', true, 'stal'], [27, 28, 'IPE 360', true, 'stal'], [28, 29, 'IPE 360', true, 'stal'], [29, 30, 'IPE 360', true, 'stal'],
                [30, 31, 'IPE 360', true, 'stal'], [31, 32, 'IPE 360', true, 'stal'], [32, 33, 'IPE 360', true, 'stal'], [33, 34, 'IPE 360', true, 'stal'], [34, 35, 'IPE 360', true, 'stal'],
                [35, 36, 'IPE 360', true, 'stal'], [36, 37, 'IPE 360', true, 'stal'], [37, 38, 'IPE 360', true, 'stal'], [38, 39, 'IPE 360', true, 'stal'], [39, 40, 'IPE 360', true, 'stal'],
                [40, 41, 'IPE 360', true, 'stal'], [41, 42, 'IPE 360', true, 'stal'], [42, 43, 'IPE 360', true, 'stal'], [43, 44, 'IPE 360', true, 'stal'], [44, 1, 'IPE 360', true, 'stal'],
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

// En sparad lösning ([x, y] och [a, b, storlek, väg]) som ritning (banans
// lösning, eller en ur facit).
function losningsRitning(bana, l = bana.losning) {
    return {
        version: 7,
        noder: l.noder.map(([x, y, typ], i) => i < bana.fasten.length ? Object.assign(fastNod(x, y, bana.fasten[i][2]), typ === 'styv' ? { styv: true } : {})
            : typ === 'pelare' ? { x, y, fast: true, styv: false, pelare: true, lager: 'glid' } : { x, y, fast: false, styv: typ !== 'ledad' }),
        balkar: l.balkar.map(([a, b, storlek, vag, material = 'limtra']) => ({ a, b, storlek, vag: !!vag, material }))
    };
}
