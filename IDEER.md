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
| Limträ | 56×135 | 66×180 | 90×270 | 140×405 | 190×630 |
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

Att fundera på efter utkastet:
- Fästpunkterna låser både x och y, så en balk mellan två fästen hänger
  delvis i drag som en lina och håller mer än en fritt upplagd balk.
  Fysikaliskt riktigt, men ska en fästpunkt kunna vara glidlager?
- Vägbanan väger 200 kg/m (plankor + beläggning), så att egenvikten är
  det som styr. keIWs väger lite i jämförelse – tyngre last senare?
- Stjärnor efter kostnad, fler banor, kablar och stål.

## Öppna frågor

- Bara Bridge Constructor-stil, eller också ett "rita"-läge?
- Hur många banor till första versionen? (förslag: 8–10 korta)
