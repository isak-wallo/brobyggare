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
- **Bygg / Panorera** nedtill: med Panorera flyttar ett finger vyn.
  **Ångra** och **Kör**. Två fingrar zoomar och flyttar vyn.
- **Menyn** (☰): billigaste bron som höll och hur bron räknas.

Spelas i webbläsaren, stående eller liggande. Idéer och beslut finns i
[IDEER.md](IDEER.md).

## Testa

    node verktyg/testa_fysik.js     # lösaren mot handräkningar + banorna
    python verktyg/testa.py         # hela spelet i headless Chrome
