# Brobyggare

Ett 2D-webbspel där man bygger broar som keIWs tar sig över. Broarna
räknas med en riktig liten FE-lösare (korotationella balkelement,
implicit tidsstegning), och balkarna är riktiga profiler i limträ, stål (IPE och HEA)
eller betong, plus kablar av stållina.

**Utkast:** sju banor (12 m till 400 m spann, vatten och torra dalar), byt med pilarna. Dra balkar
mellan punkterna och tryck **Kör**. Färgen visar hur hårt balken är
utnyttjad (grön → gul → röd). Över 100 % går den sönder.

- **Panelen** (två rader under spelytan, två kolumner till höger när
  mobilen ligger): **Material** (trä, stål …), **Typ** (väg som keIWs går
  på, balk, kabel som bara tar drag, pelare) och **Profil** (trä: bredd
  42–140 och höjd 180–630 mm; stål: IPE, HEA, HEB). Varje knapp öppnar en
  ruta med val. Under: **✋** (ett finger flyttar vyn), **Ångra**, **Riv**
  (håll inne: Riv allt) och **Kör**.
- **Tryck på en knutpunkt** när man bygger: växla mellan styvt (fyrkant) och ledat (ring).
- **Håll fingret** på en balk, knutpunkt eller pelare för att välja den:
  panelen gäller då den (byt material, typ, profil, styv/ledad), Riv tar
  bort den, och man drar i balkens ändar eller i knutpunkten för att
  flytta. Ett tryck någon annanstans avmarkerar. Två fingrar zoomar.
- **Banorna**: pilarna ‹ › eller ett tryck på banans namn (alla banor).
- **Menyn** (☰): billigaste bron som höll (hämta den eller nollställ
  rekordet) och hur bron räknas.

Spelas i webbläsaren, stående eller liggande. Idéer och beslut finns i
[IDEER.md](IDEER.md).

## Testa

    node verktyg/testa_fysik.js     # lösaren mot handräkningar + banorna
    python verktyg/testa.py         # hela spelet i headless Chrome
