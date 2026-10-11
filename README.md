# Brobyggare

Ett 2D-webbspel där man bygger broar som keIWs tar sig över. Broarna
räknas med en riktig liten FE-lösare (korotationella balkelement,
implicit tidsstegning), och balkarna är riktiga limträprofiler.

**Första utkastet:** en bana. Dra balkar mellan punkterna, välj liten,
mellan eller stor, och tryck **Kör**. Färgen visar hur hårt balken är
utnyttjad (grön → gul → röd). Över 100 % går den sönder.

- **Väg:** en balk med vägbana ovanpå, som keIWs går på.
- **Balk:** bara balken (stöttor, fackverk).
- **Tryck på en knutpunkt:** växla mellan styvt (fyrkant) och ledat (ring).
- **Riv** och **Ångra**.

Spelas i webbläsaren, stående eller liggande. Idéer och beslut finns i
[IDEER.md](IDEER.md).

## Testa

    node verktyg/testa_fysik.js     # lösaren mot handräkningar + banorna
    python verktyg/testa.py         # hela spelet i headless Chrome
