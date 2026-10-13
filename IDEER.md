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
  Ingen vippning, ingen knäckning ut ur planet, ingen lokal buckling –
  balkarna antas stagade i sidled. Lite förenklat, för att det är ett spel.
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
