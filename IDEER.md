# Brobyggare med keIWs – idéer och tankar

Ett 2D-spel där man bygger broar som keIWs (och kanske bilar) ska ta sig
över. Webbspel (PWA) som Flappy keIWs: spelas på mobilen, ingen app-butik.
Inget är bestämt än – det här är en samlingsplats att bolla idéer i.

## Förebilder (vad vi kan låna tankar från)

| Spel | Hur det funkar | Att ta med oss |
|------|----------------|----------------|
| **Bridge Constructor** (Headup) | Bygg en bro av balkar mellan fästpunkter, inom en budget. Tryck på "testa" – bilar och lastbilar kör över, bron håller eller rasar. | Grundidén: bygg → testa → justera. Budget per bana. Lugn, enkel grafik. |
| **Poly Bridge 2** (Dry Cactus) | Samma grundidé men djupare: flera material (trä, stål, rep, kabel, hydraulik), belastningen syns i färg (grön → röd), fordon med hopp och vägbommar. | Belastningsfärger (det mest pedagogiska och roliga). Flera material med olika styrka/pris. Repris av raset i slowmotion. |
| **Draw Bridge** (Bravestars) | Rita ett enda streck med fingret, sedan rullar en bil/boll över. Kort, snabbt, slumpartat. | Snabbt att komma igång. Kanske ett "rita"-läge för de minsta (Barn-nivå?). |

## Kärnan (förslag)

1. **Bygg:** dra balkar mellan noder på ett rutnät (snäpper fast). Fasta
   fästpunkter på stup/klippor. Budget i kronor (eller klossar).
2. **Testa:** tryck "Kör" – fysiken startar. keIWs går/rullar/kör över.
   Balkarna färgas efter belastning. För mycket → balken går av.
3. **Resultat:** klarade/rasade. Stjärnor efter hur lite det kostade
   (som medaljerna i Flappy: brons/silver/guld).
4. **Justera** och testa igen. Ångra, flytta noder, ta bort balkar.

## keIWs i spelet

- keIWs är den som ska över bron – går, hoppar, eller kör en liten bil/kärra.
- Jublar på andra sidan (rekordjubel finns redan), krock/faller/yr när
  bron rasar (finns redan i exporten!). Ond kan vara "hindret" på vissa
  banor (t.ex. kastar klossar på bron?).
- Kanske: keIWs bygger själv – syns bredvid med verktyg medan man bygger.

## Material och tvärsnitt – enkelt i spelet, riktigt i ingenjörsläget

Inte bara "trä eller stål" som i de flesta brobyggarspel, men inte heller
en hel profilkatalog. Riktiga balkar, inte bara fackverk.

**Tre material, en hållfasthet var:**

| Material | Hållfasthet | Tar |
|----------|-------------|-----|
| Limträ | GL30c | drag, tryck, böjning – lätt och billigt |
| Stål | S355 | drag, tryck, böjning – starkt, tungt, dyrt |
| Kabel | stålvajer | bara drag (slak i tryck) |

**Spelläge: liten, mellan, stor.** Varje storlek är en väl vald riktig
profil, så att lösaren ändå räknar med verkliga A, I, W, vikt och pris.
Förslag (justeras när vi provar):

Spelläget har fem storlekar (från början tre, men hoppen blev för stora):

| Material | Pytte | Liten | Mellan | Stor | Jätte |
|----------|-------|-------|--------|------|-------|
| Limträ | 56×180 | 66×225 | 90×270 | 115×360 | 140×450 |
| Pris $$/m | 70 | 110 | 220 | 510 | 1080 |

Förslag för stål och kabel (tre storlekar, utökas som limträ):

| Material | Liten | Mellan | Stor |
|----------|-------|--------|------|
| Stål | IPE 200 | IPE 400 | HEB 500 |
| Kabel | Ø 16 | Ø 32 | Ø 52 |

**Ingenjörsläge: en handfull riktiga profiler** per material, med sina
tabellvärden synliga, t.ex.:
- Limträ: 66×180, 90×225, 115×315, 140×405, 165×495, 190×630
- Stål: IPE 200, IPE 300, IPE 400, IPE 600, HEB 300, HEB 500, KKR 150×150×8
- Kabel: Ø 16, Ø 24, Ø 32, Ø 40, Ø 52

Spelläget och ingenjörsläget räknar likadant – skillnaden är bara hur
mycket man får välja och se.

- **Riktiga brotyper ska fungera, inte bara fackverk:** balkbro (en stor
  stål- eller limträbalk över spannet), kontinuerlig balk över stöd,
  rambro (styva hörn), bågbro, fackverk, hängbro och snedkabelbro. Det
  följer av FE-lösaren med balkelement och styva förband.
- Profilerna läggs som data (JSON) med värden ur standardtabeller.
- **Bara 2D (beslut):** balken böjs alltid kring sin starka axel.
  Ingen vippning, ingen lokal buckling. Knäckningen (från v64) räknas
  åt det tunnaste hållet (I_min) utom för vägbalkarna, som vägen håller
  i sidled. Lite förenklat, för att det är ett spel.
- Ingenjörsläget kan föreslå en dimension upp/ner och visa vilken
  kontroll som styr (moment, tryck/knäckning, drag, skjuv).
- Pris per meter (och per förband) ungefär som i verkligheten, så att
  budgeten blir en riktig optimering: rätt storlek på rätt ställe.
- Vägbanan: egen del (t.ex. limträ- eller stålplåtsdäck) som keIWs går
  och fordonen kör på; bär sin egenvikt och lasten till balkarna.
- Betong kanske senare, som ett eget steg med sprickmodell.

Senare kanske: hydraulik (rörliga delar), pelare/stöttor ner i vattnet,
pålar, vikt i lasten (keIWs + kompisar, lastbil).

## Banor och svårighet

- Korta banor, 1–2 minuter. Varje bana lär ut en sak: första bara rak väg,
  sedan "fackverk/trianglar håller bättre", sedan hängbro med rep, osv.
- Lätt → svårt via budget, längre spann, tyngre last, färre fästpunkter.
- Teman/världar som i Flappy: äng, natt, vinter? Färger efter klockan?
- Kanske en "sandlåda" utan budget, och/eller en dagens bana.

## Grafik och känsla

- 2D, enkel och ren – inte lika pixlig som Flappy. Platta färger, mjukare
  former, men samma lugna, lite dova palett. keIWs i sin klosstil.
- Belastningsfärger på balkarna (grön → gul → röd) är spelets viktigaste
  visuella sak.
- Raset ska vara roligt att titta på (bitar som flyger, keIWs yr).

## Teknik (tankar)

- Samma upplägg som Flappy: vanilla JS + canvas, inga beroenden, PWA,
  testmiljö på GitHub Pages och skarp sida på Cloudflare.
- Fysik: se avsnittet **Fysik** nedan (fysikaliskt korrekt, inte
  spelfysik).
- Banor som data (JSON): fästpunkter, budget, last, material som finns.
- Testbot som i Flappy: kontrollera att varje bana går att klara (en sparad
  lösning per bana som testerna kör).
- Mobilen först: stora tryckytor, zoom/panorera med två fingrar, snäpp mot
  rutnät så att det går att bygga med tummen.

## Fysik – så nära verkligheten som rimligt

Isaks krav: fysikaliskt korrekt, kanske inte en exakt FE-lösare, men så
nära som möjligt med rimliga medel.

**Varför inte vanlig spelfysik:** de flesta brobyggarspel använder
"fjäder och massa" med Verlet/PBD. Där beror styvheten på antalet
iterationer och tidssteget, inte på materialet. Det ser rätt ut men går
inte att räkna på.

**Förslag: en riktig liten FE-lösare i 2D, i webbläsaren.** Broarna är
små (tiotals till ett par hundra noder), så det går fint i JS i 60 Hz.

1. **Element:** balkelement (Euler–Bernoulli, 3 frihetsgrader per nod:
   x, y, rotation) med verkliga E, A, I. Rep/kabel som stångelement som
   bara tar drag. Knutpunkterna kan vara ledade (som fackverk) eller
   styva (öppen fråga).
2. **Stora förskjutningar:** korotationell formulering. Varje element
   räknas linjärt i sitt eget, medroterande koordinatsystem. Klarar
   hängbroar som sjunker ihop och broar som rasar, utan att bli fel.
3. **Dynamik:** implicit tidsstegning (Newmark/HHT-α) med verklig massa
   (egenvikt + last), lite dämpning (Rayleigh). Stabil även med styva
   stålbalkar och stora tidssteg, och ger verklig dynamisk förstoring när
   keIWs går/hoppar eller ett fordon kör på.
4. **Ekvationslösning:** bandad/gles Cholesky- eller LDLᵀ-faktorisering
   med Newton–Raphson-iterationer per steg. Noderna numreras om (t.ex.
   Cuthill–McKee) för smal bandbredd.
5. **Brott, kontrolleras varje steg:**
   - spänning: σ = N/A ± M/W mot materialets hållfasthet (trä/stål),
   - knäckning i tryck: N mot Euler P_cr = π²EI/L² (eller en
     knäckningskurva med reduktionsfaktor),
   - rep: drag mot brottlast, tryck → slakt (ingen styvhet),
   - knutpunkter: valfri hållfasthet per förband.
   Ett element som går sönder tas bort (eller blir ett ledat/löst stycke)
   och beräkningen fortsätter. Så rasar bron progressivt, som på riktigt.
6. **Utnyttjandegrad som färg:** max(σ/f, N/P_cr) per balk, grön → gul
   → röd. Det är både det roligaste och det mest lärorika i spelet.
7. **Verkliga mått och material:** SI-enheter, banor i meter (t.ex.
   spann 10–40 m), tvärsnitt som riktiga (trä 100×100, stålrör, IPE),
   keIWs och fordon med verklig vikt. Last: egenvikt + keIWs/fordon som
   rörliga punktlaster eller kontakt (hjul/fötter mot vägbanan).
8. **Kontroll mot handräkning (testsviten):** fritt upplagd balk
   (δ = 5qL⁴/384EI), konsolbalk, fackverk (snittmetoden/knutpunktsmetoden),
   Eulerknäckning, pendel/egenfrekvens för dynamiken. Gärna även jämförelse
   mot ett riktigt FE-program för några broar.

**Förenklingar vi nog gör (rimliga medel):** 2D, linjärt elastiskt
material fram till brott (ingen plasticering, eller en enkel), ingen
lokal buckling/vippning, förband som punkter, kontakten mellan hjul och
väg förenklad.

## Namn (förslag)

- Brobyggare – brobyggare.keiws.com (tydligt, svenskt)
- bro.keiws.com – kort, lätt att skriva
- keIWs bro / keIWs bygger
- Byggklossen? Brokloss?

## Beslut (2026-10-11)

- Namn: **Brobyggare**, adress brobyggare.keiws.com (kan ändras).
- Eget nytt publikt repo (som flappy-keiws): GitHub Pages som testmiljö,
  sedan Cloudflare.
- keIWs går (och hoppar) över på de första banorna, bil och lastbil
  kommer senare.
- **Budget finns, men man får alltid bygga klart även över budget.**
  Budgeten är ett mål, inte ett stopp: kostnaden syns hela tiden (och
  blir röd över budget), och man kan testa och klara banan ändå. Förslag:
  klarad över budget = klarad utan stjärnor (eller en stjärna), under
  budget = stjärnor efter hur billigt.

- **Fysikaliskt korrekt, men lite förenklat för spel:** riktig FE i 2D
  (se Fysik). Ingen vippning eller annat utanför planet.
- **Knutpunkter väljs per förband:** ledat eller styvt (styvt dyrare?).
  I lösaren: ett styvt förband delar rotationsfrihetsgraden, ett ledat ger
  varje balkände en egen rotation.
- **Material:** limträ (GL30c), stål (S355) och kabel, en hållfasthet
  per material. Inte både trä och limträ. Betong kanske senare.
- **Storlekar:** spelläge liten/mellan/stor (tre väl valda profiler per
  material), ingenjörsläge en handfull riktiga profiler.
- **Ingenjörsläge** som man slår på: siffror (N, V, M, utnyttjandegrad
  per balk), snittkraftsdiagram och förstorad nedböjning. Till vardags
  syns bara färgerna.

- **Både stående och liggande:** kameran zoomar så att hela banan får
  plats. Verktygen ligger nedtill när mobilen står och till höger när
  den ligger. Liggande blir bäst för breda broar.

## Första utkastet (2026-10-11)

En bana (Bäcken, 12 m spann, budget 12 000 kr), bara limträ i tre
storlekar, verktygen Väg/Balk/Riv/Ångra, styvt/ledat genom att trycka på
en knutpunkt, och provkörning med riktig FE och belastningsfärger.
keIWs går över (80 kg) och ramlar i vattnet om bron rasar.

Samma kväll: längsta balk 12 m (först 6 m) och **bana 2, Ån**: som
Bäcken men 24 m spann, budget 32 000 kr. Två mellanbalkar rasar, två
stora håller men kostar 36 000 kr, och ett fackverk av små balkar håller
för 31 340 kr. Pilar vid banans namn byter bana, och varje bana sparar
sin egen ritning.

Efter test på mobilen (stående): infotexten på tre rader (bana, kostnad,
tips/utnyttjande), keIWs dubbelt så stor (2 m hög, fortfarande 80 kg),
zoom och panorering med två fingrar (mushjulet på datorn, ett finger
flyttar vyn under provkörningen), och verktyget **Flytta**: tryck på en
balk och dra i dess ändar (bara den balken flyttas), eller dra en
knutpunkt (alla balkar följer med, släpps den på en annan slås de ihop).
Med en vald balk byter storleksknappen storlek på just den.

Sedan: keIWs storlek beror på banan (2 m på Bäcken, 3,5 m på Ån, samma
vikt) och han går fortare (1,2 × sin höjd per sekund). Pengarna heter
**$$** (påhittad valuta, ungefär som kronor). Det man ritar är bara en
ritning: när man trycker Bygg virvlar keIWs fram som en virvelvind och
bygger bron balk för balk från vänster (1–3 s, bara animering, balkarna
får hänga i luften), sedan pyser han ihop till keIWs igen och går över.
Ett tryck på skärmen hoppar över bygget.

Sedan: Flytta och Riv väljs bort med ett tryck till. Infotexten har fast
höjd (banan hoppar inte). Spelet letar efter ny version när man kommer
tillbaka till det och var tionde minut, och laddar om när man bygger (ångra
finns kvar). Versionen syns litet nere till vänster. Menyknapp uppe till
höger: billigaste bron som höll på banan (kan hämtas) och en förklaring av
beräkningen (FE-antagandena).

Liten blev 66×180 (från 90×225), så att det finns mer att optimera på
Bäcken: vägen av mellanbalkar kostar 11 420 $$, ett fackverk av små 9 910 $$
och väg av små med två snedsträvor 8 100 $$ (92 %). Åns budget sänktes till
26 000 $$ (fackverket av små kostar nu 24 830 $$). Bästa resultat i menyn
visar bara kostnaden, och förklaringen är uppdelad i rubriker och listor.
I menyn finns också "Riv allt och börja om" (går att ångra), och keIWs går
20 % fortare (1,44 × sin höjd per sekund).

Sedan: fem storlekar i spelläget (Pytte 56×135 – Jätte 190×630, varje steg
ungefär dubbla priset; gamla sparade ritningar översätts så att balkarna
behåller sina mått). keIWs väger 100 kg och g = 10 m/s² (runda tal: 1 kN).
Med det håller på Bäcken t.ex. väg av Stor (11 420 $$), fackverk av Liten
(9 910 $$), väg 3×4 m + två strävor av Liten (8 220 $$) eller Pytte
(7 340 $$, 80 %). Väg av Mellan rasar. På Ån håller fackverket av Liten
(24 830 $$) och av Pytte (21 110 $$, 95 %).

Inzoomad flyttar ett finger vyn om man drar utanför rutnätet. keIWs (och
virveln) ritas lika stor på skärmen oavsett zoom.

Sedan: keIWs 25 % större i bild. Verktygsraden har bara fyra knappar:
**Rita** (visar t.ex. "Väg · Mellan"; ett tryck öppnar väljaren med
väg/balk och de fem storlekarna med pris per meter), **Ändra** (ersätter
Flytta och Riv: tryck på en balk, dra i ändarna eller knutpunkterna, och
väljaren byter storlek/väg-balk eller river den), **Ångra** och **Kör**.
Väljaren ligger nederst i spelytan när mobilen står och uppe till höger när
den ligger. Material (stål, kablar) kan läggas till i samma väljare.

keIWs går nu 1,8 × sin höjd per sekund (3,6 m/s på Bäcken, 6,3 m/s på Ån).
Riv allt ligger nu bredvid Riv i väljaren (Ändra), inte i menyn.

Menyns förklaring i två delar: "Hur funkar det?" (vardagliga ord, inga
formler) och "Förutsättningar – för nördar" (modell, laster, materialtabell,
brottsregler per materialtyp, profiltabell, förenklingar). Tabellerna byggs
ur material.js. Stål S355 och vajer finns med preliminära värden och
profiler (IPE 100–400, Ø 8–32), gråade som "kommer". Brottsregeln väljs
efter materialets typ (BROTT i fysik.js); vajern behöver också slakna i
tryck innan den kan användas.

Stål med i spelet (v14-test, att prova): väljaren har en rad Trä/Stål
mellan väg/balk och storlekarna, och storleksknapparna visar profilen.
Stål S355 som HEA (Pytte–Jätte = HEA 100, 140, 180, 240, 300), 15 $$/kg
(118 000 $$/m³), grå i bild. Provkört: på Bäcken håller en rak väg av
HEA 100 (8 300 $$) men träfackverket med strävor är billigare (7 340 $$);
på Ån håller en rak väg av HEA 180 (22 820 $$) mot träfackverkets 21 110 $$.
Stål = enkla raka broar, trä = billiga fackverk. Knäckning bara kring
den styva axeln (2D).

Kör inzoomad (v15-test): keIWs hoppar över bygget (virveln flög ur bild)
och kameran följer honom mjukt över bron. Håller man i vyn följer den inte
just då. Bygg ger tillbaka vyn man hade när man tryckte Kör. Utan zoom är
allt som förut, med virveln.

Brolager (v16-test): en rak HEA 140 på Ån höll med ledade fästen men
rasade med styva. Det var linverkan: med x låst i båda ändar hängde den
ledade balken som en lina (672 kN drag), fast den bara klarar en
tredjedel av momentet qL²/8. Dessutom lades tyngden på under 1 s, vilket
gav svängningar (långa veka spann har ~1,5 s period). Nu:
- Vägbanans fästen är landfästen med brolager, alltid ledade: vänster
  fast lager, höger glidlager (rör sig fritt i x). De nedre fästena är
  fasta som förut (valv och strävor funkar). Per bana i `fasten`, så att
  senare banor (mellanstöd m.m.) kan ha andra lager.
- Egentyngden räknas statiskt innan keIWs går; bara om det inte går
  (mekanism) läggs den på under 1 s som förut.
- Raka balkar stämmer nu med handräkning: Ån, HEA 180 rasar (qL²/8 ger
  163 %), HEA 240 håller (81 %).
- Gamla "bästa resultat" nollställs (räknades med den gamla fysiken).
- Linverkan i övrigt är riktig fysik (stora deformationer + stöd låsta i
  sidled) och får vara kvar, t.ex. en underram mellan de nedre fästena
  som dragband. Övervägt men inte valt: nedböjningskrav (L/200),
  fjädrande stöd i sidled, första ordningens teori för brottet.
- Kvar att fundera på: stål är segt, så ett moment över gränsen vid ett
  styvt stöd borde ge en plastisk led (omlagring) i stället för att
  elementet går av. Nu är allt sprött.

Lättare att rita (v17-test). Svårast är att träffa startpunkten (1 m
rutnät, ca 10 px på Ån i stående läge). Ingen lupp eller snäppning av
slutpunkten:
- Längden visas ovanför balken medan man ritar eller flyttar en ände.
- Trycker man inom 24 px (minst en halv ruta) från en knutpunkt eller ett
  fäste börjar balken där, annars i närmaste punkt.
- Började balken i en ny punkt får startänden ett handtag i 2,5 s som går
  att dra rätt (bara då, så att man kan bygga flera balkar från samma
  knutpunkt i följd).

Resultatrutan (v18-test): rubriken är "Bron höll! keIWs kom över." (eller
"Plask! keIWs ramlade i vattnet."), sedan kostnaden och under/över budget
på en rad, utnyttjandet och ev. billigaste bron. Rutan flyttas upp ovanför
keIWs om den annars skulle skymma honom när han jublar.

v19-test: banan står långt ner (85 % av extra höjden går till himlen, lite
vatten syns; v20), så rutor och text får plats ovanför. Väljaren ligger därför
uppe under infotexten även i stående läge (annars skymde den bron).
Glidlagret har stopp vid ±0,3 m (GLID_MAX i spel.js) och lagren ritas
alltid på sin plats på berget, även när bron rasar.

v21-test: rutnätet går 3 m högre (Bäcken till +7 m, Ån till +9 m) och 3 m
bakåt över land på båda sidor (bara ovanför marken), och det finns ett
fäste på land 3 m bakom varje kant (för höga bågar, stag bakåt osv.).
Gamla sparade ritningar får de nya fästena. Inzoomad flyttar ett finger
vyn även nere i berget (rutnätet tar nu nästan hela bilden). Resultatrutan
flyttas åt sidan om höjden inte räcker för att lägga den ovanför keIWs.

Priser trä/stål (sökt 2026-10-12, ungefärligt): limträ ca 11 000–14 000
kr/m³ i butik (ca 25–30 kr/kg), HEA ca 17–25 kr/kg som material. Per kg
ungefär lika, per m³ är stål 11–14 gånger dyrare. Spelet: trä 9 000 $$/m³
(21 $$/kg), stål 118 000 $$/m³ (15 $$/kg), alltså 13 gånger – rimligt.
Färdigt monterat stål (svetsat, rostskyddat) blir dyrare per kg, så stål
får gärna vara lite dyrare än nu om det ska vänta till senare banor.
Stål vinner i verkligheten när höjden är begränsad (fri höjd under bron,
grund konstruktionshöjd) eller laster/spann är stora – idéer för senare
banor.
v22-test: inget verktyg valt. Ett tryck till på Ändra (eller på Väg när
väljaren är öppen) väljer bort verktyget, och då flyttar ett finger vyn
var man än trycker (när man har zoomat in). Väg eller Ändra väljer igen.

v23-test: menyn visar banans budget i rubriken.

v24-test: en bro som inte ens bär sin egen tyngd räknades förut statiskt
till ett läge som redan hade rasat (en rak träbalk på Ån började 4 m ner,
glidlagret förbi stoppet), och sedan gick den av snett. Nu läggs tyngden
på gradvis när statiken ger brott, knäckning eller glidlager förbi stoppet,
så bron sjunker och går av på mitten. Testsidan (github.io och lokalt, inte
den skarpa) har "Dela konstruktionen (test)" i menyn: text som börjar med
BROBYGGARE och JSON (version, bana, ritning, senaste provkörningen) som
Claude kan återskapa exakt.

v26-test: jämnare trästorlekar. Förut var stegen i tröghetsmoment 2,8×,
4,6×, 5,2× och 5,1×, så knäckningen tog jättekliv (Isaks bro på Ån: två
11 m strävor höll med Mellan, 29 %, men knäcktes med Liten, 133 %). Nu
GL30c 56×180, 66×225, 90×270, 115×360, 140×450, ungefär 2,5× per steg.
En rak Jätte i trä räcker inte längre över Ån (24 m), bara över Bäcken.
Ån-lösningen är nu Pytte överallt (22 970 $$). Gamla "billigaste broar"
nollställs (ritningsversion 4).

v27-test: halvsteg. Fem storlekar på knapparna som förut, och −/+ under
dem stegar i halvsteg (Pytte, Pytte+, Liten … Stor+, Jätte; nio per
material). Halvstegen: trä 66×200, 78×250, 115×300, 140×405; stål HEA
120, 160, 200, 260. Storlek 0,5 … 3,5 i ritningen (PLUS i material.js).

v28-test: kameran siktar på keIWs som han ritas när man zoomat in (liggande
syntes bara toppen av huvudet).

v29-test: bana 3, Kanalen. 48 m spann, rutnät på 2 m (bana.rutnat),
fästen 4 m ner, keIWs 5 m. Farled x 16–32 under y = −2: inga knutpunkter
och inga balkar igenom. Pelare (väljaren: Väg/Balk/Pelare, bara på banor
med bana.pelare): ett tryck på en punkt över vattnet utanför farleden
sätter en betongpelare från botten (−10) upp dit, ett tryck till tar bort
den. Pelaren är en fast, ledad knutpunkt (tryck i Väg/Balk: styv). Pris
3 000 $$ + 150 $$/m (4 500 $$ till vägen). Budget 55 000 $$. Provräknat:
väg Mellan på två pelare 4 m ner med V-strävor Liten 53 040 $$ (lösningen,
79 %); Pratt ovanpå h6 Liten ca 51 400 $$; rak väg Stor+ på två pelare vid
vägen ca 53 600 $$ (102 %, går av); stål Liten+ på pelare ca 60 800 $$.
Kostnaden räknas i ritningensKostnad (banor.js), samma i testerna.

v30-test: Ändra väljer pelare (tryck på den): pris och Riv. Med Ändra
finns Riv och Riv allt alltid i väljaren, gråa när de inte gör något.
Rivs en pelare som balkar sitter i blir knutpunkten kvar.

v31-test: 15 steg per material: varje storlek har − och + (Pytte−,
Pytte, Pytte+ … Jätte+), ca 1,35× styvare per steg, pris och styvhet
ökar alltid. I ritningen storlek ± 0,25; gamla halvsteg (x,5) blir steget
under nästa storlek (1,5 → Mellan−). Trä behåller sina fem
grundstorlekar, mellanstegen 42×180, 56×200, 56×215, 78×230, 90×245,
90×305, 90×345, 115×395, 115×435, 140×495. Stål blev HEA 100–400 i följd
(Isak ville ha HEA/HEB/HEM, men HEB och HEM är tyngre för samma
styvhet, så de blir dyrare och klenare än HEA-steget bredvid): Pytte
HEA 120, Liten 180, Mellan 240, Stor 300, Jätte 360 (förut 100/140/180/
240/300). Pelare får fortsatt gå ända upp (vägar med kullar).

v32-test: pelarna har glidlager överst (låser bara y, glider högst
0,3 m som brolagret). Förut låste de x också, så en HEA 100 över 24 m
mellan två pelare höll som en lina (73 %); nu går den av (Mellan, HEA
240, håller med 82 %). Kanalens lösning håller fortfarande (78 %).

v33-test: nya lagersymboler. Glidlager på land: svart rund nod. Fast
lager: svart fyrkant med vit rund (som ett ledat fäste). Pelare: svart
rund topp (glidlagret) som slutar precis under balkarna i knutpunkten.

v34-test (utkast): betong och kablar, och tre nya banor (Isak
2026-10-13: "två nya material och tre nya banor, ett utkast så ser vi
vart vi landar"; skarp första version när de sex banorna är testade).
- Betong C35/45, förenklat armerad (homogen rektangel, samma brottregel
  som trä: fc 30, ft 4, fm 15, fv 2 MPa), 200×250 … 800×1100. Pris 3 000
  $$/m³ (5 000 gjorde bågarna för dyra).
- Kabel (stållina, Ø 8 … 60): ett enda rakt element utan böjstyvhet, bara
  drag (i tryck 1e-6 av styvheten kvar), knäcks inte. Kablar som sitter i
  vägen spänns vid bygget (spannKablar i fysik.js): längden justeras tills
  vägen ligger där den är ritad under egentyngden. Därför hittar
  hängbrons bärkabel sin form själv. Väljaren: Väg / Balk / Kabel
  (/ Pelare); kabeln har ingen materialrad, och Ändra gör om balk ↔ kabel.
- Banorna kan ha egen elementlängd, längsta balk/kabel, största zoom, en
  ö på andra sidan och fundament (fästen ute i vattnet).
- Bana 4 Dalgången: 36 m, 32 m djup, budget 45 000. Lösning först en
  betongbåge med träpelare (43 900 $$, 81 %), se v36.
- Bana 5 Älven: 160 m, farled 70 m, fundament vid 40 och 120, balk ≤ 20 m,
  kabel ≤ 100 m. Lösning: snedkabelbro med 30 m höga betongpyloner (153 150
  $$ av 165 000, 67 %). Tung att räkna (ca 4 s för en provkörning på datorn).
- Bana 6 Havet: 400 m ut till en ö, farled 200 m, fundament vid 80 och
  320 på 30 m djup. Lösning: hängbro med 60 m pyloner, bärkabel ankrad på
  land och pelare närmast stränderna (774 260 $$ av 820 000, 84 %).

Beslut 2026-10-13 (Isak): ordningen Bäcken, Ån, Kanalen, Dalgången,
Älven, Havet. Materialen låses upp per bana (banans `material`).

v36-test (Isak 2026-10-13): bara trä på Bäcken och Ån, stål från
Kanalen, betong och kablar från Älven. Dalgångens lösning blev därför ett
träfackverk (Liten−, 6 m högt, 42 220 $$, 90 %) i stället för betongbågen.
Ingen bana är låst, men pilen › varnar först om ingen bro har hållit på
banan ("Tryck › igen för att gå vidare ändå").

v37-test (Isak 2026-10-13): Dalgången blir bana 3 (före Kanalen) och är
torr: marken i botten i stället för vatten ("Aj! keIWs ramlade ner i
dalen."). Det sparade för bana 3 och 4 byter plats en gång
(`flyttaSparat`). Stål kommer på Dalgången. Texterna i "Hur funkar det?"
genomgångna stycke för stycke med Isak (kortare, kablar från Älven).

v38-test (Isak 2026-10-13): från Älven kör keIWs en pixlig bil (röd, keIWs
sitter i den) som väger 1 000 kg, på två hjul 2,5 m isär (500 kg per hjul
på vägbanan, banans `bil`). Bilen ritas i keIWs skala (större än 2,5 m),
fysiken använder de riktiga 2,5 m. Älvens lösning fick väg Pytte+ i stål
(164 350 $$, 76 %) och budget 175 000; Havets lösning håller (95 %).

Att fundera på: Havets stora belopp och om Älven räknas fort nog på
mobilen (annars en snabbare lösare).

v39-test (Isak 2026-10-13): sju banor – två korta vattendrag (Bäcken 12 m,
Ån 24 m), två över land (Ravinen 20 m, Dalgången 60 m), sedan Kanalen,
Älven och Havet. Olika många fästen: Bäcken bara vägens två lager, Ån
lagren och ett fäste 3 m ner i var kant, Ravinen och Dalgången fästen på
sluttningarna (Dalgången två på var sida). Marken (`markY` i spel.js):
vattenbanorna har branta, lite lutande kanter (`kant`, rundade överst),
landbanorna en mjuk dal (`dal`, cosinus). Inga knutpunkter i marken,
keIWs och bitar stoppas av den. Stålet kommer på Dalgången. Allt sparat
ligger nu per banans namn (gamla nummer flyttas en gång; det som sparats på
gamla Dalgången kastas), och fästen som tagits bort blir vanliga
knutpunkter i gamla ritningar. Nya lösningar: Bäcken 9 380 $$, Ån
22 650 $$, Ravinen 14 650 $$, Dalgången (båge) 71 850 $$.

v40-test (Isak 2026-10-13): ett styvt förband väger 40 kg (knutplåtar och
fler bultar), ett ledat 20 kg; priset 500/300 $$ som förut. Dalgångens
lösning går upp till 96 % men håller.

v41-test (Isak 2026-10-13): Bäcken görs "perfekt", en bana i taget. Grund
bäck: vattnet 2 m under marken, rutnätet ner till 1 m under vägen. Spannet
14 m (längre än en balk, 12 m), så man måste skarva. En rak skarvad balk
måste vara Stor och kostar 11 280 $$, över budgeten 11 000; ett litet
fackverk (väg Pytte, Pytte− ovanpå, 2 m högt) kostar 10 170 $$ (74 %), med
ledade knutpunkter ca 9 400 $$. Ett fackverk under vägen är svagare än
samma ovanpå: vägen blir tryckt och böjd samtidigt, och trycket förstärker
böjningen (andra ordningens effekt), medan dragen väg rätas ut.

v42-test (Isak 2026-10-13): tre storlekar (Liten, Mellan, Stor) med − och
+, nio steg i stället för femton. Trä är för de kortare broarna: gamla
Pytte till Stor− (56×180–90×345); stålet är de nio minsta HEA (100–260),
så stålet tar naturligt över där träet slutar. Betong och kabel: gamla
Pytte–Stor−. Ritningar (version 5) behåller sina profiler, det som inte
finns kvar blir närmaste steg. Bäckens fackverk blev Liten− rakt igenom
(10 550 $$). Träets sista steg är ett större kliv (Stor+ = 115×360 i
stället för 90×345): precis nog för en rak skarvad balk över Bäcken, men
den kostar 11 280 $$, över budgeten.

v44-test (Isak 2026-10-14): stål och trä finns från första banan (stål är
starkare än trä, det står i texten). Träets Stor+ tillbaka till 90×345.
Stålet: Liten = IPE 80/100/120, Mellan och Stor = HEA 100–200. Gamla
ritningar (version 6) flyttar stålet tre steg upp så att profilen blir
densamma. Rubriken visar spannet: "Bana 1 · Bäcken (14 m)". Bäcken: budget
12 000, fackverket av trä kostar 10 550 $$ (marginal 1 450); en rak skarvad
balk måste vara av stål, HEA 160 (12 540 $$, över budget), HEA 140 och trä
går av. Ravinen: rak skarvad HEA 200 håller men kostar 21 100 $$ (budget
16 000). Havet: vägen är HEA 200 (största stålet nu), med pelare var 10 m
under sidospannen (814 260 av 820 000 $$, 95 %).

Beslut 2026-10-13: linverkan hanteras bara med glidlager (brofästen och
pelare). Kontrollerna räknar rätt: HEA 100 över 24 m mellan två fästen
som låser x sjunker 0,42 m och bär som en lina (ca 370 kN drag, 65 %
utnyttjande, momentet litet). Inget nedböjningskrav och ingen gräns för
dragkraft i fästena.

Senare (Isak 2026-10-13): pelare ihopgjutna med bron (styv inspänning),
men då måste pelaren deformeras också: pelaren som ett eget balkelement
i betong från botten, med böjstyvhet, så att den lutar och böjs när
bron rör sig. Kanske ett val per pelare: glidlager eller ingjuten.

Beslut 2026-10-12: Kanalen med pelare från botten och farled. Älven
(minst 100 m) blir sista vattendraget, senare.

Beslut 2026-10-12: stålpriset behålls (15 $$/kg). Plastiska leder i stål
(moment begränsat till Mpl, brott först vid en vridgräns) väntar tills vi
gör banor där stål ska löna sig.

Att fundera på efter utkastet:
- Vägbanan väger 200 kg/m (plankor + beläggning), så att egenvikten är
  det som styr. keIWs väger lite i jämförelse – tyngre last senare?
- Stjärnor efter kostnad, fler banor, kablar.

## Öppna frågor

- Bara Bridge Constructor-stil, eller också ett "rita"-läge?
- Hur många banor till första versionen? (förslag: 8–10 korta)

v46-test (Isak 2026-10-14): en panel hela tiden i stället för Rita/Ändra.
Panelen ligger under spelytan (stående) eller i en kolumn bredvid verktygen
(liggande): Välj, Väg, Balk (Kabel, Pelare), material med Riv och Riv allt,
storlek. Med Välj väljer ett tryck en balk, knutpunkt (styv/ledad, Riv tar
den med balkarna) eller pelare, och ett drag i en knutpunkt flyttar den.
Verktygsraden: Bygg, Panorera, Ångra, Kör (Stopp under provkörningen).
v45-test: Nästa bana i rutan när bron höll; keIWs 1,35 gånger större fullt
inzoomad på Bäcken (keiwsInzoomad).
v47-test (Isak 2026-10-14): panelen på tre rader. Storleken är 6 knappar
1–6 på en rad med profilen och priset per meter längst till höger (inga
namn, inget −/+). Stegen: trä 56×180, 56×215, 66×225, 90×245, 90×270,
90×345; stål IPE 80, IPE 100, HEA 100, 140, 160, 200; betong 200×300 …
450×650; kabel Ø 10–32. Gamla ritningar (version 6, 9 steg) får närmaste
steg (det större vid lika). Banornas lösningar behöll sina profiler.
v48-test (Isak 2026-10-14): ingen verktygsrad. Ångra och Kör i en smal
kolumn till höger om panelen (stående); liggande är panelen vriden 90°, tre
kolumner, med Ångra och Kör på en rad under. Panorera är ✋ sist i första
raden (ett verktyg: Välj, Väg, Balk … bygger igen). Rekord från före
version 7 glöms; menyn har Nollställ rekordet (två tryck), och Hämta går
även direkt efter ett prov.
v49-test (Isak 2026-10-14): panelen är två rader: Material, Typ, Profil
(knappar med liten rubrik, varje öppnar en ruta vid knappen) och ✋, Ångra,
Riv (håll inne: Riv allt), Kör, med luft nedtill för Androids streck.
Liggande två kolumner. Välj är borta: håll fingret på en balk, knutpunkt
eller pelare för att välja den. Profilerna: limträ bredd 42–140 × höjd
180–630 (45 mm lameller), stål IPE 80–600, HEA och HEB 100–600 (tabell i
material.js); betong och kabel har kvar sina sex steg. Balkens storlek är
profilens namn (eller steget 0–5). Inga tips under kostnaden. Pilarna
bredvid varandra till vänster om namnet, och namnet visar alla banor.
v50-test (Isak 2026-10-15): ✋ är borta. Ett drag från en knutpunkt eller ett
fäste bygger direkt; ett drag på tom yta panorerar; håller man still 0,25 s
på tom yta börjar balken där (en blå prick, det surrar). Nedersta raden är
Ångra, Riv, Kör i text, i samma rutnät som Material, Typ, Profil (liggande
lika höga rader). Banlistan: lägre knappar med centrerad text.

## Nästa: balansen (Isak 2026-10-15, pausat medan vi gör GIF:ar)

En rak träbalk på bana 1 blev billigare än ett litet fackverk
(bärförmågan växer med höjden², priset bara med höjden). Beslutat, alla tre:
- keIWs väger 500 kg (i dag 100 kg, ca 3 % av lasten mot vägens 200 kg/m).
  Bilen (Älven, Havet) höjs i samma takt, t.ex. 2,5 ton; LEKMAN-texten
  ("tio gånger så mycket") och banornas budgetar och lösningar ses över.
- Förbanden kostar efter den största balken i knuten (plåtar, dymlingar).
- Höga limträ dyrare per m³ över ca 405 mm: större maskiner och verktyg för
  att tillverka och hantera dem.

v51-test (2026-10-15): de två första gjorda, priset på höga limträ väntar
(Isak vill först testa de andra). keIWs 500 kg, bilen 2,5 ton. Förbandet
får grundvikten och grundpriset (20/40 kg, 300/500 $$) upp till en
dragkraft A·f = 300 kN i den grövsta balken i knuten, sedan i proportion
(56×180 trä: 1×, 90×450: 2,6×, HEA 140: 3,7×, HEA 200: 6,4×). Lösningarna
dimensionerades om och budgetarna höjdes:
- Bäcken: väg 2 + fackverk 1, 10 830 av 12 000 $$ (budgeten kvar). En rak
  skarvad 90×450 håller för 11 960 $$: dyrare än fackverket men inom
  budget, så priset på höga trä behövs nog ändå.
- Ån och Ravinen: lösningarna håller som de var.
- Dalgången 83 090 av 87 000 (förr 75 000), Kanalen väg 90×315 64 650 av
  68 000 (55 000), Älven väg IPE 220 228 850 av 240 000 (175 000), Havet
  väg IPE 330 och hängare Ø 14 961 250 av 1 000 000 (820 000).
- Stålförbanden blev dyra (Älven, IPE 220: ca 2 000 $$ och 160 kg per knut i vägen).

v52-test (Isak 2026-10-15): en rak balk på Bäcken får gärna gå (för att
komma in i spelet). Bäcken har en grund botten (`botten` i banor.js, 1 m
vatten). Banlistan i tre kolumner (nummer, namn med spann, bästa pris),
en linje mellan raderna i profilrutan, knappen till den öppna rutan har
gul ram, och HALL_TID 450 → 350 ms.

v53-test: Bäcken har bara trä (Isak valde bana 1, inte 1–2); stålet kommer på Ån.

v54-test: under provkörningen står bygget/utnyttjandet på en egen rad under budgeten (båda
lägena). Hålltiden 300 ms. Är något redan valt väljer ett tryck på en annan balk eller
knutpunkt den direkt. När vägbanan blir hel mellan brolagren byts verktyget till balk.
Fråga: trä i bredd lönar sig bara vid maxhöjd (I och W växer med h², priset med b·h, ingen
vippning i 2D).

v55-test: limträets höjd högst 7 × bredden (TRA_SLANK, i stället för vippning som 2D-modellen
saknar). Väljer man en för hög höjd blir balken bredare, en för smal bredd gör den lägre;
gamla ritningar blir bredare. Isak valde slankhetskravet framför dyrare höga balkar.

v56-test: stående ligger banan så högt att profilrutan (den högsta rutan, mätt i en osynlig
kopia: stålets HEA eller trä) får plats under den; resten av luften blir himmel. Banan står
still när rutan öppnas, men det syns mer mark under.

v57-test: med en balk vald och rutan för material, typ eller profil öppen väljer ett tryck
på en annan balk den direkt, och rutan står kvar (nu för den balken). Tryck på tom yta eller
en knutpunkt stänger rutan som förut.

v58-test: bytet till balk gällde bara när vägen blev hel, inte om den redan var det när
sidan eller banan laddades (Isak byggde fortfarande väg i fackverket). Nu: Väg om vägen inte
är hel och annars Balk när sidan laddas, vid byte av bana och Hämta bästa; Balk efter Ångra
om vägen är hel; Väg efter Riv allt.

v59-test: Ån omgjord: 26 m, bara trä, vatten 5–9 m djupt i en skål (ingen kant som fortsätter
under land), fästen 3 m ner i slänterna, budget 26 000 (lösningen 24 480). Bäcken och Ån har
ojämn mark (`profil`: punkter, mjukt emellan med monoton kubisk interpolation; markY,
kantAvstand per sida). Sparat på Ån kastas (ordning 4).

v60-test: största zoom lika på alla banor: skärmens kortaste sida visar 10 m (NARMAST; minst 3
rutor, Älven 15 m, Havet 30 m), samma pixlar per meter stående och liggande. Isak tyckte 10 m
i bredd stående var lagom. Banornas maxZoom borttaget.

v61-test: Förlopp efter Plask: knappen Förlopp i resultatrutan, sedan brott för brott (‹ ›,
Klar). Bron visas som den var vid brottet, det som gick sönder rött och inringat, med orsak
(drag, tryck, böjning, skjuvning, knäckning) och utnyttjande; ett tryck på en balk visar dess
utnyttjande just då. Sparas i sim.forlopp (forloppBild, högst 40). Rutan ligger nedtill
(stående) eller upptill (liggande).
Bitar som flög iväg när bron rasade (Isaks bro över Ån): knäckta strävor gjorde
Newtonmatrisen indefinit och Cholesky gav skräp. Nu förstoras diagonalen tills den går att
faktorisera (bara vägen dit ändras), och ett Newtonsteg flyttar högst MAX_DU = 0,2 m.

v62-test: "7 brott" på Isaks bro över Ån: en balk är flera element (ca 0,75 m) och kan gå av
på flera ställen, men de flesta brotten kom efter att keIWs ramlat i, när bitarna slog i
slänten. Nu går inget sönder efter Plask, och lösa bitar (som inte sitter ihop med något
fäste, iFastet) går inte sönder; Förloppet visar var på balken det gick (x = … m).
Ån: budget 18 500 (var 26 000); Isaks bro (tre vägbalkar 56×315 på två strävor 42×270 från
fästena i slänterna, 17 420) är lösningen.

v63-test: Ny ordning: Bäcken, Ån, Kanalen, Ravinen, Dalgången, Älven, Havet. Kanalen (bana 3)
utan farled och pelare: här kommer stålet. 48 m är för långt för balkar på strävor, så det
blir ett fackverk. Med både trä och stål blir trä billigast (fackverk ca 44 500) mot stålets
bästa (53 580: 4 m högt, fack på 4 m, väg och överram IPE 100, stänger IPE 80): IPE 80 är
dyrare per meter än 42×180, och på 48 m med keIWs blir stängerna klena. Isak ville ha kvar
både trä och stål; lösningen är stålfackverket, budget 58 000. Farleden och pelarna provas nu
på Älven (testa.py). Sparade ritningar på Kanalen kastas (ordning 5).

v64-test (Isak 2026-10-16): ny ordning Bäcken 14 m, Ån 26 m, **Sundet 38 m** (ny, bara trä,
ett fackverk), **Kanalen 50 m** (stål och fyrkantsrör KKR 40×3–200×8 kommer; trä finns kvar
men stålet ska vinna), Ravinen, Dalgången, Älven, Havet.
Knäckning åt det tunnaste hållet (Isak: "förenklad knäckningskontroll som bygger på tunnaste
tvärsnittet"): P_cr = π²·E·I_min/L², I_min = b³h/12 för trä, Iz för IPE/HEA/HEB, I för rör.
Vägbalkarna knäcks bara i planet (vägen stagar dem). Utan detta vann trä alltid i 2D (smala
höga strävor var lika starka som rör). Nu: Kanalen stål (bågfackverk, båge KKR 100×5, 60 900)
mot trä ca 65 700, budget 64 000. Dalgången och Ravinen förblir trä.
Följder: tryckta trästrävor måste vara tjocka åt sidan (140×180 osv). Nya lösningar och
budgetar: Bäcken 11 660 / 13 000 (fackverk 3 m högt), Ån 19 880 / 21 500 (strävor 140×180 vid
7 och 19 m; Isaks gamla bro kostar nu ca 23 350), Sundet 45 160 / 48 000, Kanalen 60 900 /
64 000, Ravinen 14 870 / 16 000, Dalgången 98 030 / 104 000.
Lösa bitar som krossades mot marken fick Newton att fastna (bitar flög med 4e6 m/s); nu
smulas lösa element över 300 % bort (smula). Sparade ritningar på Kanalen kastas och alla
bästa broar glöms (ordning 6), ritningarna på övriga banor är kvar.

Senare (Isak 2026-10-16):
- **Facit:** i menyn "Visa möjliga lösningar", välj "enkel" (enkel men dyr) eller
  "kostnadseffektiv". Inte optimerade, bara något att utgå ifrån; ska inte gå att råka få fram.
- **Guide:** interaktiv, lyser upp en knapp i taget och beskriver den. Aldrig påtvingad, nås
  från menyn eller ett "?" bredvid menyn.
- **Grafik:** fasta lagret = noden själv som svart triangel (ungefär som andra noder), glidlagret
  en svart triangel med två rullar (eller svart cirkel). Egna knutar: fyrkant (styv) eller rund
  (ledad) i en färg, svart för det som inte går att ändra.

v65-test: ny grafik för knutarna (Isak 2026-10-16). Svart = går inte att flytta (fästen i
berget: fyrkant styv, rund ledad), vitt med mörk kant = egna knutar (fyrkant styv, rund ledad).
Vägens lager är noden själv som en svart triangel, glidlagret med två rullar under.

v66-test (Isak 2026-10-16, utkast): **möjliga lösningar** för Bäcken och Ån i menyn ("Visa
möjliga lösningar", gömt i en utfällbar rad): Enkel (Bäcken: rak 90×495, 12 650; Ån: vägen
66×360 rakt igenom på två strävor 140×180, 20 580) och Kostnadseffektiv (Bäcken: litet
fackverk, 11 820; Ån: tunnare väg vid lagren, 19 880). Ritningen byts ut, Ångra tar tillbaka.
**Guiden**: "?" under menyknappen (och "Visa guiden" i menyn), 15–16 steg: banan, kostnaden,
lagren, fästena, rutnätet och knutarna, Typ, Material, Profil, välja (håll fingret), Ångra,
Riv, Kör, menyn. Allt annat mörkt; ‹ Förra, Nästa ›, ✕.

v67-test (Isak 2026-10-16): möjliga lösningar omgjorda. Enkel = en alldeles för grov balk,
över budget, bara för att visa att det går (Bäcken rak 115×540, 15 460 av 13 000; Ån väg 90×450
på strävor 140×225, 26 150 av 21 500). Kostnadseffektiv = trianglar och ledade knutar, under
budget men inte bäst (Bäcken fackverk 11 910; Ån två strävor från varje fäste, 20 620). Noder i
lösningar kan vara ledade ([x, y, 'ledad']). Bäckens lösning blev fackverket med ledade knutar
och en diagonal i mittfacket (11 350).

v68-test (Isak 2026-10-16): i guiden berättar keIWs som professor (studentmössa, vinkar först,
sedan handen upp) i en pratbubbla. Glidlagrets rullar större och fast i triangelns fot.

v69-test (Isak 2026-10-16): en möjlig lösning visas först efter en skämtsam fusk-varning
(ersätter ritningen, Ångra tar tillbaka den): "Visa ändå" eller "Jag provar själv".

v70-test (Isak 2026-10-16): Riv heter Riv allt när inget är valt (frågar först, ett tryck till
stänger frågan), Riv när en balk eller knut är vald. Att hålla inne Riv fungerar som förut.

v71-test (Isak 2026-10-16): ett snabbt tryck på en balk, knut, pelare eller ett fäste väljer
den (ett tryck till på samma släpper den); att hålla väljer som förut. Ett drag från en knut
bygger, ett drag på tom yta panorerar, håll still och dra så börjar en balk där. Styv/ledad
byts nu i panelen (inte med ett tryck på knuten). Bäcken har bara trä upp till 115×540
(`traMax` i banor.js), de grövsta behövs inte på första banan.

v72-test (Isak 2026-10-16): Bäcken och Ån har samma färre trä, bredd 42, 56, 66, 90, 115 och
höjd 180, 270, 360, 450, 540 (`TRA_ENKEL`, banans `tra`), full katalog från Sundet. Åns lösning
och förslag gjordes om (strävorna 115 breda). Bara ett tryck och släpp väljer: att hålla på en
knut och dra bygger en balk, den valda knuten flyttas med ett drag. Lagren är lika stora
trianglar med knutpunkten i tyngdpunkten, glidlagret med rullarna under. Fästena som går att
ändra (styv/ledad) är vita, bara vägens lager svarta.

v73-test (Isak 2026-10-16): rasar bron av sin egen tyngd innan keIWs ska gå ut hoppar han till
och stannar på klippan ("Hoppsan!", resultatet 'rasade'; bron fortsätter att rasa). I menyn
går det att stänga av att keIWs bygger bron först (sparas i webbläsaren).

v74-test (Isak 2026-10-16): typen byts från väg till balk så fort vägen blir hel mellan lagren,
hur den än byggdes (kollas i `andra`, vid varje ändring; förut bara när en ny vägbalk lades
till, inte när en ände eller knut flyttades så att vägen kopplades ihop).

v75–v77 (Isak 2026-10-16): keIWs hoppar till på riktigt när bron rasar av egentyngden (sjunker
ihop, skuttar bakåt med armarna upp och stora ögon, utropstecken). Efter resultatet smulas det
som krossas bort, också bitar fast i ett fäste (Isaks fackverk över Bäcken flög annars iväg).
Förloppet visar bara första brottet i varje balk (`forloppSteg` i app.js; fysiken oförändrad).

v78–v79 (Isak 2026-10-16): rullagret är samma triangel som det fasta, rullarna helt under.
Den valda balkens längd står under budgeten. Ligger en balk under fingret träffas knutarna bara
på halva avståndet (korta balkar gick inte att välja). Träprofilen anpassas till banan också när
sidan laddas (Ån visade 66×225); man börjar med 66×270.

v80–v81 (Isak 2026-10-16): rullagrets triangel halva höjden men lika bred, rullarna under; toppen
på samma höjd som det fasta lagrets.

v82-test (Isak 2026-10-16): pengarna heter **mynt** (en nolla mindre, guldmynt med keIWs, `.mynt`
i style.css). Bara visningen (`kr` i app.js delar med 10): priser och budgetar i material.js och
banor.js och sparade rekord står kvar i gamla $$. Åns budget 22 000 $$ = 2 200 mynt.

v83-test (Isak 2026-10-17): keIWs på myntet är blå (samma blå som figuren, mörka ögon). Ett tryck
på ett mynt i budgeten visar ett stort mynt (`#stortMynt`); ett tryck var som helst stänger det.

v84-test (Isak 2026-10-17): keIWs är lika stor på skärmen på alla banor: 8 % av skärmens kortaste
sida när hela banan syns, 1,6 gånger så stor fullt inzoomad (`keiwsBild` i app.js; banans `keiws`
styr bara farten nu, `keiwsInzoomad` borta). Han står nära kanten, så att han syns helt
(`keiwsStart`/`keiwsMal` från storleken i bild, `keiwsBildHojd` = 8 % av vyns bredd). Bilen ritas
i 75 % storlek (den är bred). Vyn breddades på Sundet, Dalgången, Älven och Havet så att han får
plats på klippan (testas i testa_banor.js).

v85-test (Isak 2026-10-17): keIWs går lika fort på skärmen på alla banor (`keiwsFart` = 2,05 ×
storleken i bild; banornas `keiws` borta). Det blev fortare på de långa banorna: Dalgångens
lösning fick vägen steg 4 (100 620 $$) och Havets väg IPE 360 (1 024 190 $$, budgeten höjd till
1 050 000 $$). Marken ligger på samma höjd på skärmen på alla banor (`MARK_NIVA` = 0,5 av höjden
under infotexten; vattnet längst ner får hamna bakom profilrutan). Ån 20 % grundare under −3 m.

v86-test (Isak 2026-10-17): första gången man kommer till en bana med något nytt berättar
professor keIWs om det och pekar (`NYHETER` i app.js, samma rutor som guiden; sedda banor i
localStorage `brobyggare-nyheter`): Sundet fler profiler, Kanalen stål och rör, Dalgången glesare
prickar, Älven betong, kablar, pelare, farleden och bilen. Marken liggande på 0,72 av höjden
(profilrutan står mitt på skärmen där), stående 0,5.
