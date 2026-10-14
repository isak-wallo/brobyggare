# Brobyggare – anteckningar för Claude

Ett brobyggarspel med keIWs: vanilla JS + canvas, inga beroenden, PWA.
Idéer och beslut i `IDEER.md` (läs den först).

## Regler

- Svenska överallt: kod (namn), kommentarer, commit-meddelanden, texter.
- Jobba direkt på `main`, inga grenar eller PR. Isak testar från GitHub
  Pages (https://isak-wallo.github.io/brobyggare/), så pusha när något
  är klart och testat.
- Höj `VERSION` i `sw.js` (v1-test → v2-test …) vid varje push som ändrar
  filer som laddas.
- Ingen skarp sida (brobyggare.keiws.com) förrän Isak säger till.
- Kör testerna före varje push: `python verktyg/testa.py` (kör även
  `node verktyg/testa_fysik.js`).

## Filer

- `material.js` – material (limträ GL30c, stål S355 med HEA, betong C35/45, kabel) och de 9
  stegen per material (Liten−, Liten, Liten+ … Stor+; storlek 0–2 ± 0,25; trä 56×180–90×305 och ett större kliv till 115×360,
  stål HEA 100–260),
  vägbanan och förbanden (vikt och pris).
- `fysik.js` – FE-lösaren: korotationella Euler–Bernoulli-element, Newmark
  + Newton–Raphson, bandad Cholesky med Cuthill–McKee, brott (spänning,
  skjuvning, Euler-knäckning). SI-enheter, y uppåt.
- `banor.js` – banorna (spann, fästpunkter, marken (`kant`/`dal`), budget, en sparad lösning).
- `spel.js` – provkörningen utan ritning: keIWs som rörlig last, faller
  utan vägbana, marken (`markY`) stoppar fallande bitar. Testerna kör den i node.
- `app.js` – ritning, verktyg, bygga med fingret, kamera och layout
  (stående: verktyg nedtill; liggande: till höger).
- `figur_data.js` – keIWs rektanglar och animationer. Kopierad från
  flappy-keiws (samma fil); ändra inte för hand.

## Fysiken i korthet

Varje balk delas i element på ca 0,75 m. Styvt förband = balkändarna delar
vridningen, ledat = egen vridning per ände. Fästpunkterna låser x och y
(och vridningen om de är styva), utom brolagren i vägbanans nivå (banans
`fasten` [x, y, 'fast'|'glid']): alltid ledade, glidlagret låser bara y.
Nya fästen läggs sist i `fasten` (lösningarnas nodindex och gamla
ritningar, se `uppgradera` i app.js).
Pelare (banor med `pelare`) är fasta knutpunkter med glidlager (`lager: 'glid'`, `pelare: true`)
i ritningen; de kostar efter höjden över botten (`ritningensKostnad`).
Farleden (`farled`) stoppar knutpunkter och balkar i app.js, inte i fysiken.
Kablar (`material: 'vajer'`) är ett enda element utan böjstyvhet som bara
tar drag; kablar i vägen spänns vid bygget (`spannKablar`). Stora banor har
egna `element`, `maxLangd`, `maxKabel`, `maxZoom` (se banor.js).
Massan klumpas i noderna. Egentyngden räknas statiskt (losStatiskt; går
det inte läggs den på under 1 s), sedan går keIWs (100 kg) över. g = 10 m/s². Ett element över 100 %
utnyttjande tas bort; en balk som knäcks tappar mittelementet.
