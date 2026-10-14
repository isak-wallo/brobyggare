# Brobyggare

Ett 2D-webbspel där man bygger broar som keIWs tar sig över. Broarna
räknas med en riktig liten FE-lösare (korotationella balkelement,
implicit tidsstegning), och balkarna är riktiga profiler i limträ, stål (IPE och HEA)
eller betong, plus kablar av stållina.

**Utkast:** sju banor (12 m till 400 m spann, vatten och torra dalar), byt med pilarna. Dra balkar
mellan punkterna och tryck **Kör**. Färgen visar hur hårt balken är
utnyttjad (grön → gul → röd). Över 100 % går den sönder.

- **Panelen** (alltid framme medan man bygger): välj väg (balk med vägbana
  som keIWs går på), balk (stöttor, fackverk), kabel (bara drag, för
  snedkabel- och hängbroar) eller pelare, material med Riv och Riv allt, och
  en av sex storlekar (1–6, profilen och priset per meter till höger).
- **Tryck på en knutpunkt** när man bygger: växla mellan styvt (fyrkant) och ledat (ring).
- **Välj** (i panelen): tryck på en balk, knutpunkt eller pelare för att
  ändra eller riva den, dra i balkens ändar eller i en knutpunkt för att
  flytta. Välj igen (eller Väg, Balk … utan något valt) bygger igen.
- **✋** (sist i panelens första rad): ett finger flyttar vyn. ✋ igen,
  Välj, Väg eller Balk bygger igen. Två fingrar zoomar och flyttar vyn.
- **Ångra** och **Kör** bredvid panelen (en smal kolumn till höger när
  mobilen står, en rad under när den ligger; panelen ligger då i tre kolumner).
- **Menyn** (☰): billigaste bron som höll (hämta den eller nollställ
  rekordet) och hur bron räknas.

Spelas i webbläsaren, stående eller liggande. Idéer och beslut finns i
[IDEER.md](IDEER.md).

## Testa

    node verktyg/testa_fysik.js     # lösaren mot handräkningar + banorna
    python verktyg/testa.py         # hela spelet i headless Chrome
