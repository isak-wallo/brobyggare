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

- `material.js` – material (limträ GL30c, stål S355, betong C35/45, kabel) och profilerna:
  trä bredd × höjd (TRA_BREDD, TRA_HOJD), stål IPE/HEA/HEB och fyrkantsrör KKR (STAL_SERIER), betong och kabel
  6 steg (STEGEN). Balkens `storlek` är profilens namn ('90×315', 'HEA 200') eller ett steg
  0–5 i STEGEN (banornas lösningar, äldre ritningar; före version 7 9 steg, se GAMLA_STEG).
  `profil(material, storlek)` ger A, I, W, vikt och pris. Vägbanan och förbanden (vikt och pris;
  `forbandet(ritning, i)` växer med den grövsta balkens dragkraft A·f i knuten).
- `fysik.js` – FE-lösaren: korotationella Euler–Bernoulli-element, Newmark
  + Newton–Raphson, bandad Cholesky med Cuthill–McKee, brott (spänning,
  skjuvning, Euler-knäckning med I_min, det tunnaste hållet; vägbalkarna hålls i sidled av
  vägen och knäcks med I). SI-enheter, y uppåt. Blir Newtonmatrisen indefinit
  (knäckta bitar) förstoras diagonalen; ett Newtonsteg högst MAX_DU.
- Pengar: mynt (1 mynt = 10 $$). Allt i koden räknas i $$; `kr` i app.js visar /10 med myntet (`.mynt`).
- `banor.js` – banorna (spann, fästpunkter, marken (`kant`/`dal`, eller `profil`: ojämn mark punkt för punkt), budget, en sparad lösning, `tra`: trädimensionerna på banan, färre på de två första).
- `spel.js` – provkörningen utan ritning: keIWs som rörlig last, faller
  utan vägbana, marken (`markY`) stoppar fallande bitar. Har något gått sönder när keIWs
  ska gå (START_TID) stannar han (`'hoppsan'`, resultatet `'rasade'`). Brotten sparas i `sim.forlopp`
  (Förlopp i app.js stegar igenom dem: en liten ruta, stående nere på panelen, `placeraForlopp`). Testerna kör den i node.
- `app.js` – ritning, verktyg, bygga med fingret, kamera och layout
  (`#styrning` = panelen Material/Typ/Profil + Ångra/Riv/Kör i samma rutnät; stående: två
  rader nedtill; liggande: två kolumner till höger; `#popup` = rutan med val).
  Ett tryck (och släpp) väljer en balk/knut; den valda knuten flyttas med ett drag. Ett drag från en (annan) knutpunkt
  bygger; på tom yta panorerar det, utom efter BYGG_HALL ms stilla (då börjar en balk där).
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
egna `element`, `maxLangd`, `maxKabel` (se banor.js). Största zoom: NARMAST m (minst 3 rutor) på skärmens kortaste sida, men minst MIN_ZOOM (2) gånger.
Massan klumpas i noderna. Egentyngden räknas statiskt (losStatiskt; går
det inte läggs den på under 1 s), sedan går keIWs (500 kg; bilen 2,5 ton) över. keIWs ritas lika stor på skärmen på alla banor
(8 % av kortaste sidan utzoomad, `keiwsBild`) och går lika fort på skärmen (`keiwsFart`, från `keiwsBildHojd`).
Marken (y = 0) ligger på samma höjd på skärmen på alla banor (`markNiva` i app.js: halva höjden stående, längre ner liggande), och keIWs i sidled nära vänsterkanten (`keiwsX`). g = 10 m/s². Ett element över 100 %
utnyttjande tas bort; en balk som knäcks tappar mittelementet. Lösa bitar (inte ihop med
något fäste, `iFastet`) går inte sönder; över SMUL_GRANS smulas de bort (`smula`), annars
fastnar Newton när de krossas mot marken.

Banorna (v64): Bäcken 14 m, Ån 26 m, Sundet 38 m (bara trä), Kanalen 50 m (stål och
rör kommer, stålet ska vinna), Ravinen, Dalgången, Älven (betong, kablar, farled, pelare),
Havet. Varje bana har en lösning som ska hålla under budget (testa_banor.js).
Alla banor har `facit` {enkel, effektiv} (från Kanalen lösningen med andra profiler, `andraLosning`): möjliga lösningar som spelaren hämtar i menyn
(banans veck, "Visa möjliga lösningar"); de ska hålla, den enkla gå över budget och den effektiva rymmas.
Guiden (`GUIDE` i app.js, knappen "?" under menyn eller i menyn) lyser upp ett mål i taget;
steg vars mål saknas på banan hoppas över.
Menyn (`visaMeny`) är fem likadana veck (`data-veck`: bana, guide, installningar, lekman, nord); guidens
veck visar stegen som text. Knappen "!" under "?" (bara `FELSOK`) delar konstruktionen som text (`#dela`).
Nyheter (`NYHETER` i app.js): första gången på en bana med något nytt visar professor keIWs det med
guidens rutor (`visaGuide(lista)`); i testerna bara med `?test&nyheter`.
