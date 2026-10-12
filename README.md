# Brobyggare

Ett 2D-webbspel där man bygger broar som keIWs tar sig över. Broarna
räknas med en riktig liten FE-lösare (korotationella balkelement,
implicit tidsstegning), och balkarna är riktiga limträprofiler.

**Första utkastet:** två banor (12 och 24 m spann), byt med pilarna. Dra balkar
mellan punkterna och tryck **Kör**. Färgen visar hur hårt balken är
utnyttjad (grön → gul → röd). Över 100 % går den sönder.

- **Rita** (t.ex. "Väg · Mellan"): tryck för att välja väg (balk med
  vägbana som keIWs går på) eller balk (stöttor, fackverk), och en av fem
  storlekar från Pytte till Jätte.
- **Tryck på en knutpunkt:** växla mellan styvt (fyrkant) och ledat (ring).
- **Ändra:** tryck på en balk och dra i dess ändar, byt storlek eller riv
  den, eller dra en knutpunkt.
- **Ångra**. Två fingrar zoomar, ett finger utanför rutnätet flyttar vyn.
- **Menyn** (☰): billigaste bron som höll, riv allt och hur bron räknas.

Spelas i webbläsaren, stående eller liggande. Idéer och beslut finns i
[IDEER.md](IDEER.md).

## Testa

    node verktyg/testa_fysik.js     # lösaren mot handräkningar + banorna
    python verktyg/testa.py         # hela spelet i headless Chrome
