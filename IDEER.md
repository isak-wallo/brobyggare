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

## Material och tvärsnitt – riktiga balkar, inte bara "trä eller stål"

Isaks önskemål: inte bara välja trä, stål eller betong som i de flesta
brobyggarspel, utan olika dimensioner och regelrätta balkar, och inte
bara fackverk.

**Man väljer i tre steg: material → profiltyp → dimension.** Varje val ger
verkliga tvärsnittsvärden (A, I, W, i), vikt per meter och pris per meter.
Lösaren räknar med dem, så en grövre balk är styvare, starkare och tyngre,
och dyrare.

| Material | Hållfasthet | Profiltyper (exempel) |
|----------|-------------|-----------------------|
| Trä | C24 (konstruktionsvirke) | 45×95, 45×145, 45×195, 70×220 ... |
| Limträ | GL30c | 90×225, 115×315, 140×450, 190×630 ... |
| Stål | S235 / S355 | IPE 100–600, HEA/HEB 100–400, VKR/KKR-rör, UPE, plattstång |
| Kabel/rep | brottlast | stålvajer Ø 10–60, fiberrep (bara drag) |
| Betong (senare?) | C30/37 + armering | rektangel, T-balk; kräver sprickmodell |
| Vägbana | – | trä, stålplåt, betongplatta (egenvikt + bärighet) |

- **Riktiga brotyper ska fungera, inte bara fackverk:** balkbro (en
  kraftig IPE/HEB eller limträbalk över spannet), kontinuerlig balk över
  stöd, rambro (styva hörn), bågbro, fackverk, hängbro och snedkabelbro.
  Det följer av FE-lösaren med balkelement och styva förband.
- Profiltabellerna läggs som data (JSON), med värden ur standardtabeller
  (t.ex. EN 10365 för IPE/HE, tillverkartabeller för limträ och VKR).
- **I 2D böjs balken alltid kring sin starka axel.** Vippning och
  knäckning ut ur planet räknas inte; vi kan ev. lägga in en förenklad
  kontroll (eller förutsätta att balkarna är stagade i sidled).
- Ingenjörsläget kan föreslå "en dimension upp/ner" för en balk, och
  visa vilken kontroll som styr (moment, tryck/knäckning, drag, skjuv).
- Pris per meter (och per förband) ungefär som i verkligheten, så att
  budgeten blir en riktig optimering: rätt profil på rätt ställe.

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

- **Fysikaliskt korrekt:** riktig FE i 2D, se Fysik.
- **Knutpunkter väljs per förband:** ledat eller styvt (styvt dyrare?).
  I lösaren: ett styvt förband delar rotationsfrihetsgraden, ett ledat ger
  varje balkände en egen rotation.
- **Material:** trä (C24), limträ (GL30c), stål (S235/S355) och
  kabel från början. **Betong senare**, som ett eget steg med
  sprickmodell, så att den blir rätt.
- **Dimensioner:** ett urval per profiltyp (ca 5–8, t.ex. IPE 100, 160,
  220, 300, 400, 500, 600) i vanliga läget. Hela tabellen finns i
  ingenjörsläget.
- **Ingenjörsläge** som man slår på: siffror (N, V, M, utnyttjandegrad
  per balk), snittkraftsdiagram och förstorad nedböjning. Till vardags
  syns bara färgerna.

## Öppna frågor


- Bara Bridge Constructor-stil, eller också ett "rita"-läge?
- Hur många banor till första versionen? (förslag: 8–10 korta)
