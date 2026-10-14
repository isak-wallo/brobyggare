# Brobyggare

Ett 2D-webbspel där man bygger broar som keIWs tar sig över. Broarna
räknas med en riktig liten FE-lösare (korotationella balkelement,
implicit tidsstegning), och balkarna är riktiga profiler i limträ, stål (IPE och HEA)
eller betong, plus kablar av stållina.

**Utkast:** sju banor (12 m till 400 m spann, vatten och torra dalar), byt med pilarna. Dra balkar
mellan punkterna och tryck **Kör**. Färgen visar hur hårt balken är
utnyttjad (grön → gul → röd). Över 100 % går den sönder.

- **Rita** (t.ex. "Väg · Mellan"): tryck för att välja väg (balk med
  vägbana som keIWs går på), balk (stöttor, fackverk) eller kabel (bara
  drag, för snedkabel- och hängbroar), och en av tre
  storlekar Liten, Mellan och Stor (med − och +, nio steg).
- **Tryck på en knutpunkt:** växla mellan styvt (fyrkant) och ledat (ring).
- **Ändra:** tryck på en balk och dra i dess ändar, byt storlek eller riv
  den (eller riv allt), eller dra en knutpunkt.
- **Ångra**. Två fingrar zoomar, ett finger utanför rutnätet flyttar vyn.
- **Menyn** (☰): billigaste bron som höll och hur bron räknas.

Spelas i webbläsaren, stående eller liggande. Idéer och beslut finns i
[IDEER.md](IDEER.md).

## Testa

    node verktyg/testa_fysik.js     # lösaren mot handräkningar + banorna
    python verktyg/testa.py         # hela spelet i headless Chrome
