"""Testar spelet i en riktig webbläsare (headless Chrome via Playwright).

Kör först fysiktesterna (node verktyg/testa_fysik.js), startar sedan en egen
lokal webbserver och öppnar spelet med ?test (då finns window.bro att
läsa), stående och liggande. Kontrollerar att:

  - inga JavaScript-fel uppstår,
  - verktygen ligger nedtill när mobilen står och till höger när den ligger,
    och att hela banan syns,
  - infotexten har tre rader när mobilen står (bana, kostnad, tips eller
    utnyttjande) och inget kapas,
  - man kan bygga en väg genom att dra mellan punkterna, trycka på en
    knutpunkt (styvt/ledat), riva en balk och ångra, men inte bygga för
    långa balkar,
  - Flytta: välja en balk och dra ena änden (bara den balken flyttas),
    dra en knutpunkt (alla balkar följer med), byta storlek på vald balk,
  - inzoomad flyttar ett finger utanför rutnätet vyn,
  - zoom med mushjulet och nyp med två fingrar (punkten under fingrarna
    står kvar, inget byggs), och att zoomen nollas vid byte av bana,
  - keIWs bygger bron först (virvelvind, 1–3 s) och ett tryck hoppar över
    bygget,
  - infotexten har samma höjd hur lång texten än är (banan står still),
  - versionen syns, menyn visar billigaste bron som höll (och kan hämta
    den) och förklarar beräkningen,
  - en ny version laddas in utan att ångra-listan försvinner,
  - provkörningar slutar med "Bron höll!" för broar som håller och
    "Plask!" för en som är för klen.

    python verktyg/testa.py                # skriver OK/FEL
    python verktyg/testa.py --bilder ut    # spara skärmbilder i mappen ut/
    python verktyg/testa.py --visa         # med synligt webbläsarfönster

Kräver node och Playwright för Python. Avslutas med kod 0 om allt gick bra.
"""
import argparse
import functools
import http.server
import os
import subprocess
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fel = 0


def kolla(namn, ok, text=''):
    global fel
    print(('OK  ' if ok else 'FEL ') + namn + (f'  ({text})' if text else ''), flush=True)
    if not ok:
        fel += 1


class Tyst(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def starta_server():
    hanterare = functools.partial(Tyst, directory=ROT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), hanterare)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f'http://127.0.0.1:{server.server_port}/?test'


def skarm(sida, varld):
    """Världskoordinater (m) → sidans pixlar."""
    k = sida.evaluate('() => window.bro.kam')
    box = sida.locator('#duk').bounding_box()
    return box['x'] + k['ox'] + varld[0] * k['sk'], box['y'] + k['oy'] - varld[1] * k['sk']


def dra(sida, fran, till):
    x1, y1 = skarm(sida, fran)
    x2, y2 = skarm(sida, till)
    sida.mouse.move(x1, y1)
    sida.mouse.down()
    sida.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, steps=4)
    sida.mouse.move(x2, y2, steps=4)
    sida.mouse.up()


def tryck(sida, punkt):
    x, y = skarm(sida, punkt)
    sida.mouse.click(x, y)


def antal_balkar(sida):
    return sida.evaluate('() => window.bro.ritning.balkar.length')


def vanta_resultat(sida, sekunder=40):
    sida.wait_for_function('() => !document.querySelector("#ruta").classList.contains("dold")',
                           timeout=sekunder * 1000)
    return sida.inner_text('#ruta h1')


def bild(sida, bilder, namn):
    if bilder:
        sida.screenshot(path=os.path.join(bilder, namn + '.png'))


def provka(webblasare, url, namn, bredd, hojd, bilder):
    sida = webblasare.new_page(viewport={'width': bredd, 'height': hojd}, device_scale_factor=2)
    js_fel = []
    sida.on('pageerror', lambda e: js_fel.append(str(e)))
    sida.goto(url)
    sida.wait_for_function('() => window.bro')
    sida.evaluate('() => { window.bro.ritning = '
                  '{ noder: window.bro.ritning.noder.filter(n => n.fast), balkar: [] }; }')

    # Verktygen: nedtill när den står, till höger när den ligger.
    duk = sida.locator('#duk').bounding_box()
    lista = sida.locator('#verktyg').bounding_box()
    if bredd < hojd:
        kolla(f'{namn}: verktygen ligger nedtill', lista['y'] >= duk['y'] + duk['height'] - 1)
    else:
        kolla(f'{namn}: verktygen ligger till höger', lista['x'] >= duk['x'] + duk['width'] - 1)
    v = sida.evaluate('() => BANOR[0].vy')
    (x0, y0), (x1, y1) = skarm(sida, (v['x0'], v['y1'])), skarm(sida, (v['x1'], v['y0']))
    kolla(f'{namn}: hela banan syns',
          x0 >= duk['x'] - 1 and x1 <= duk['x'] + duk['width'] + 1
          and y0 >= duk['y'] - 1 and y1 <= duk['y'] + duk['height'] + 1)

    # Bygg en väg i två delar (Stor) genom att dra med musen.
    sida.click('#verktyg [data-v=vag]')
    kolla(f'{namn}: fem storlekar, Mellan från början', sida.inner_text('#verktyg [data-v=storlek]') == 'Mellan'
          and sida.evaluate('() => STORLEKAR.length') == 5)
    sida.click('#verktyg [data-v=storlek]')
    dra(sida, (0, 0), (6, 0))
    dra(sida, (6, 0), (12, 0))
    r = sida.evaluate('() => window.bro.ritning')
    kolla(f'{namn}: två vägbalkar byggda', len(r['balkar']) == 2 and all(b['vag'] for b in r['balkar']),
          f"{len(r['balkar'])} balkar")
    sida.click('#verktyg [data-v=balk]')
    dra(sida, (6, 0), (6, 4))
    tryck(sida, (6, 0))
    mitt = next(n for n in sida.evaluate('() => window.bro.ritning.noder') if n['x'] == 6 and n['y'] == 0)
    kolla(f'{namn}: tryck på knutpunkten gör den ledad', not mitt['styv'])
    tryck(sida, (6, 0))
    sida.click('#verktyg [data-v=riv]')
    tryck(sida, (6, 2))
    r = sida.evaluate('() => window.bro.ritning')
    kolla(f'{namn}: riv tar bort balken (och den lösa knutpunkten)',
          len(r['balkar']) == 2 and not any(n['y'] == 4 for n in r['noder']))
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångra tar tillbaka den', antal_balkar(sida) == 3)
    tryck(sida, (6, 2))
    sida.click('#verktyg [data-v=vag]')
    dra(sida, (0, 0), (11, -5))                   # 12,1 m
    kolla(f'{namn}: för lång balk går inte', antal_balkar(sida) == 2)
    if bredd < hojd:
        rader = sida.evaluate('''() => [...document.querySelectorAll('#info .rad')].map(r => {
            const b = r.getBoundingClientRect();
            return { y: b.top, kapad: r.scrollWidth > r.clientWidth + 1, synlig: b.height > 0 };
        })''')
        kolla(f'{namn}: infotexten på tre rader, inget kapat',
              len(rader) == 3 and all(r['synlig'] for r in rader)
              and rader[0]['y'] < rader[1]['y'] < rader[2]['y'] and not any(r['kapad'] for r in rader[:2]))

    info_h = lambda: sida.evaluate("() => document.getElementById('info').offsetHeight")
    hojder = [info_h()]
    v = sida.evaluate("() => document.getElementById('version').textContent")
    kolla(f'{namn}: versionen syns', bool(__import__('re').fullmatch(r'v\d+-test', v)), v)

    # Flytta: en snedbalk som hamnade fel flyttas i ena änden.
    sida.click('#verktyg [data-v=balk]')
    dra(sida, (6, 0), (3, -3))
    sida.click('#verktyg [data-v=flytta]')
    tryck(sida, (4.5, -1.5))
    kolla(f'{namn}: Flytta väljer balken man trycker på', sida.evaluate('() => window.bro.vald') == 2)
    hojder.append(info_h())
    dra(sida, (3, -3), (4, -3))
    r = sida.evaluate('() => window.bro.ritning')
    b = r['balkar'][2]
    andar = sorted([(r['noder'][b['a']]['x'], r['noder'][b['a']]['y']), (r['noder'][b['b']]['x'], r['noder'][b['b']]['y'])])
    kolla(f'{namn}: änden flyttas, den gamla punkten försvinner',
          andar == [(4, -3), (6, 0)] and not any(n['x'] == 3 and n['y'] == -3 for n in r['noder']), str(andar))
    tryck(sida, (3, 0))                           # välj vägen till vänster
    sida.click('#verktyg [data-v=storlek]')
    kolla(f'{namn}: storleksknappen byter storlek på vald balk',
          sida.evaluate('() => window.bro.ritning.balkar[0].storlek') == 4
          and sida.evaluate('() => window.bro.ritning.balkar[1].storlek') == 3)
    sida.click('#verktyg [data-v=angra]')
    tryck(sida, (3, 3))                           # tomt: ingen vald
    dra(sida, (6, 0), (6, 1))                     # knutpunkten med alla balkar
    r = sida.evaluate('() => window.bro.ritning')
    i = next(j for j, n in enumerate(r['noder']) if n['x'] == 6 and n['y'] == 1)
    kolla(f'{namn}: knutpunkten flyttas med alla tre balkarna',
          sum(1 for b in r['balkar'] if i in (b['a'], b['b'])) == 3)
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=riv]')
    tryck(sida, (5, -1.5))
    kolla(f'{namn}: tillbaka till två vägbalkar', antal_balkar(sida) == 2)
    sida.click('#verktyg [data-v=riv]')
    sida.click('#verktyg [data-v=flytta]')
    sida.click('#verktyg [data-v=flytta]')
    kolla(f'{namn}: ett tryck till på Flytta väljer bort den (tillbaka till Balk)',
          sida.evaluate("() => document.querySelector('#verktyg [data-v=balk]').classList.contains('vald')"))

    # Inzoomad: ett finger utanför rutnätet flyttar vyn, bygger inget.
    sida.mouse.move(*skarm(sida, (0, 0)))
    sida.mouse.wheel(0, -600)
    sida.wait_for_timeout(100)
    fore = skarm(sida, (6, 0))
    dra(sida, (-1.5, 1), (-0.5, 1))
    efter = skarm(sida, (6, 0))
    kolla(f'{namn}: inzoomad flyttar ett finger utanför rutnätet vyn',
          sida.evaluate('() => window.bro.zoom') > 1.2 and abs(efter[0] - fore[0]) > 20 and antal_balkar(sida) == 2,
          f'{efter[0] - fore[0]:.0f} px')
    bild(sida, bilder, f'{namn}-0-panorera')
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)

    # Zoom: mushjulet kring en punkt, sedan nyp med två fingrar.
    x, y = skarm(sida, (6, 0))
    sida.mouse.move(x, y)
    sida.mouse.wheel(0, -400)
    sida.wait_for_timeout(100)
    x2, y2 = skarm(sida, (6, 0))
    zoom = sida.evaluate('() => window.bro.zoom')
    kolla(f'{namn}: mushjulet zoomar in kring pekaren', zoom > 1.2 and abs(x2 - x) < 2 and abs(y2 - y) < 2,
          f'zoom {zoom:.2f}')
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)
    kolla(f'{namn}: och ut igen', sida.evaluate('() => window.bro.zoom') == 1)
    x, y = skarm(sida, (6, -2))
    box = sida.locator('#duk').bounding_box()
    sida.evaluate('''([x, y, ox, oy]) => {
        const duk = document.getElementById('duk');
        const h = (typ, id, px, py) => duk.dispatchEvent(new PointerEvent(typ, {
            pointerId: id, pointerType: 'touch', clientX: px + ox, clientY: py + oy, bubbles: true }));
        h('pointerdown', 11, x - 40, y); h('pointerdown', 12, x + 40, y);
        for (let k = 1; k <= 5; k++) { h('pointermove', 11, x - 40 - 16 * k, y); h('pointermove', 12, x + 40 + 16 * k, y); }
        h('pointerup', 11, x - 120, y); h('pointerup', 12, x + 120, y);
    }''', [x - box['x'], y - box['y'], box['x'], box['y']])
    x2, y2 = skarm(sida, (6, -2))
    zoom = sida.evaluate('() => window.bro.zoom')
    kolla(f'{namn}: nyp med två fingrar zoomar (3×), punkten står kvar, inget byggs',
          abs(zoom - 3) < 0.05 and abs(x2 - x) < 2 and abs(y2 - y) < 2 and antal_balkar(sida) == 2,
          f'zoom {zoom:.2f}')
    bild(sida, bilder, f'{namn}-0-zoom')
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)
    sida.click('#verktyg [data-v=vag]')
    bild(sida, bilder, f'{namn}-1-bygg')

    sida.click('#verktyg [data-v=kor]')
    t0 = time.time()
    kolla(f'{namn}: keIWs bygger först', sida.evaluate('() => window.bro.bygger'))
    sida.wait_for_timeout(450)
    bild(sida, bilder, f'{namn}-2-virvel')
    hojder.append(info_h())
    sida.wait_for_function('() => !window.bro.bygger', timeout=6000)
    tid = time.time() - t0
    kolla(f'{namn}: bygget tar 1–3 s', 0.9 < tid < 3.6, f'{tid:.1f} s')
    sida.wait_for_timeout(2500)
    bild(sida, bilder, f'{namn}-2-prov')
    hojder.append(info_h())
    kolla(f'{namn}: infotexten har samma höjd hela tiden', len(set(hojder)) == 1, str(hojder))
    rubrik = vanta_resultat(sida)
    kolla(f'{namn}: vägen av stora balkar håller', rubrik == 'Bron höll!', rubrik)
    bild(sida, bilder, f'{namn}-3-holl')

    # Den sparade lösningen (fackverk av små balkar).
    sida.click('#ruta [data-v=bygg]')
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    bild(sida, bilder, f'{namn}-4-fackverk')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(1000)
    bild(sida, bilder, f'{namn}-5-fackverk-virvel')
    tryck(sida, (6, 3))
    kolla(f'{namn}: ett tryck hoppar över bygget', not sida.evaluate('() => window.bro.bygger'))
    sida.wait_for_timeout(4000)
    bild(sida, bilder, f'{namn}-5-fackverk-prov')
    kolla(f'{namn}: fackverket håller', vanta_resultat(sida) == 'Bron höll!')

    # En liten balk över hela spannet är för klen.
    sida.click('#ruta [data-v=bygg]')
    sida.evaluate('() => { window.bro.ritning = { noder: window.bro.ritning.noder.filter(n => n.fast), '
                  'balkar: [{ a: 0, b: 2, storlek: 0, vag: true, material: "limtra" }] }; }')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(3300)
    bild(sida, bilder, f'{namn}-6-ras')
    kolla(f'{namn}: en för klen bro rasar', vanta_resultat(sida) == 'Plask!')
    bild(sida, bilder, f'{namn}-7-plask')

    # Menyn: billigaste bron som höll, hämta den, förklaringen och versionen.
    sida.click('#ruta [data-v=bygg]')
    sida.click('#menyknapp')
    text = sida.locator('#meny').inner_text()
    kolla(f'{namn}: menyn visar billigaste bron och förklaringen',
          'Billigaste bron som höll' in text and 'Hur räknas bron?' in text and 'Version v' in text)
    sida.click('#meny summary')
    bild(sida, bilder, f'{namn}-7-meny')
    sida.click('#meny [data-v=hamta]')
    kolla(f'{namn}: hämta ger den bästa ritningen och stänger menyn',
          antal_balkar(sida) > 1 and not sida.locator('#meny').is_visible())
    sida.click('#menyknapp')
    sida.click('#meny [data-v=rivallt]')
    kolla(f'{namn}: riv allt tömmer banan, ångra tar tillbaka',
          antal_balkar(sida) == 0 and sida.evaluate('() => window.bro.ritning.noder.length') == 4)
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångra efter riv allt', antal_balkar(sida) > 1)
    sida.click('#menyknapp')
    sida.mouse.click(5, sida.viewport_size['height'] - 120)   # utanför panelen
    kolla(f'{namn}: ett tryck utanför stänger menyn', not sida.locator('#meny').is_visible())

    # Ny version: sidan laddas om, ritningen och ångra-listan finns kvar.
    n = antal_balkar(sida)
    with sida.expect_navigation():
        sida.evaluate('() => window.bro.nyVersion()')
    sida.wait_for_function('() => window.bro')
    kolla(f'{namn}: ny version laddas om med ritning och ångra kvar',
          antal_balkar(sida) == n and sida.evaluate('() => window.bro.historik') > 0)
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångra efter omladdningen', antal_balkar(sida) == 1)

    # Bana 2: dubbelt så långt spann. Pilen byter bana, ritningen sparas
    # per bana, och den sparade lösningen (fackverk) håller.
    sida.mouse.move(*skarm(sida, (6, 0)))
    sida.mouse.wheel(0, -400)
    sida.click('#info [data-v=nasta]')
    kolla(f'{namn}: pilen byter till bana 2', sida.evaluate('() => window.bro.banaNr') == 1
          and antal_balkar(sida) == 0)
    kolla(f'{namn}: zoomen nollas vid byte av bana', sida.evaluate('() => window.bro.zoom') == 1)
    v = sida.evaluate('() => BANOR[1].vy')
    duk = sida.locator('#duk').bounding_box()
    (x0, y0), (x1, y1) = skarm(sida, (v['x0'], v['y1'])), skarm(sida, (v['x1'], v['y0']))
    info = sida.locator('#info').bounding_box()
    kolla(f'{namn}: hela bana 2 syns, under infotexten',
          x0 >= duk['x'] - 1 and x1 <= duk['x'] + duk['width'] + 1
          and y0 >= info['y'] + info['height'] - 1 and y1 <= duk['y'] + duk['height'] + 1)
    sida.click('#verktyg [data-v=vag]')
    dra(sida, (0, 0), (12, 0))
    kolla(f'{namn}: en 12 m balk går att bygga', antal_balkar(sida) == 1)
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    bild(sida, bilder, f'{namn}-8-bana2')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(9000)
    bild(sida, bilder, f'{namn}-9-bana2-prov')
    kolla(f'{namn}: fackverket på bana 2 håller', vanta_resultat(sida, 60) == 'Bron höll!')
    sida.click('#ruta [data-v=bygg]')
    sida.click('#info [data-v=forra]')
    kolla(f'{namn}: bana 1 har kvar sin ritning', sida.evaluate('() => window.bro.banaNr') == 0
          and antal_balkar(sida) == 1)
    kolla(f'{namn}: inga JavaScript-fel', not js_fel, '; '.join(js_fel))
    sida.close()


def main():
    global fel
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--bilder')
    ap.add_argument('--visa', action='store_true')
    arg = ap.parse_args()
    if arg.bilder:
        os.makedirs(arg.bilder, exist_ok=True)

    print('Fysiken:', flush=True)
    if subprocess.run(['node', os.path.join(ROT, 'verktyg', 'testa_fysik.js')]).returncode:
        fel += 1
    print('Spelet:', flush=True)
    server, url = starta_server()
    with sync_playwright() as p:
        try:
            webblasare = p.chromium.launch(channel='chrome', headless=not arg.visa)
        except Exception:
            webblasare = p.chromium.launch(headless=not arg.visa)
        provka(webblasare, url, 'staende', 390, 844, arg.bilder)
        provka(webblasare, url, 'liggande', 844, 390, arg.bilder)
        webblasare.close()
    server.shutdown()
    print('Allt OK' if not fel else f'{fel} FEL')
    sys.exit(1 if fel else 0)


if __name__ == '__main__':
    main()
