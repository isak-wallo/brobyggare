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
  - Rita: väljaren för väg/balk, trä/stål och storlek öppnas och stängs,
    och man kan rita i stål; en balk börjar i en knutpunkt intill, och en
    ny balk från en ny punkt går att rätta i startänden,
  - Ändra: välja en balk (väljaren byter storlek, väg/balk och trä/stål, eller river) och dra ena änden (bara den balken flyttas),
    dra en knutpunkt (alla balkar följer med), byta storlek på vald balk,
  - inzoomad flyttar ett finger utanför rutnätet vyn,
  - zoom med mushjulet och nyp med två fingrar (punkten under fingrarna
    står kvar, inget byggs), och att zoomen nollas vid byte av bana,
  - keIWs bygger bron först (virvelvind, 1–3 s) och ett tryck hoppar över
    bygget; inzoomad hoppar han över bygget och kameran följer honom,
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


def valj(sida, typ, storlek):
    """Verktyget Rita med väg/balk och storlek (0–4), via väljaren."""
    if not (sida.evaluate('() => window.bro.verktyg') == 'rita' and sida.locator('#valjare').is_visible()):
        sida.click('#verktyg [data-v=rita]')
    sida.click(f'#valjare [data-t={typ}]')
    sida.click(f'#valjare [data-s="{storlek}"]')


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

    # Rita börjar med väg av Mellan. Väljaren har fem storlekar och stängs
    # när man valt. Bygg en väg i två delar (Stor) genom att dra med musen.
    text = sida.inner_text('#verktyg [data-v=rita]')
    kolla(f'{namn}: Rita börjar med väg, Mellan', text.startswith('Väg') and 'Mellan' in text, text.replace('\n', ' '))
    sida.click('#verktyg [data-v=rita]')
    kolla(f'{namn}: väljaren öppnas med fem storlekar', sida.locator('#valjare').is_visible()
          and sida.locator('#valjare [data-s]').count() == 5)
    bild(sida, bilder, f'{namn}-0-valjare')
    sida.click('#valjare [data-s="3"]')
    kolla(f'{namn}: väljaren stängs när man valt storlek', not sida.locator('#valjare').is_visible()
          and 'Stor' in sida.inner_text('#verktyg [data-v=rita]'))
    dra(sida, (0, 0), (6, 0))
    dra(sida, (6, 0), (12, 0))
    r = sida.evaluate('() => window.bro.ritning')
    kolla(f'{namn}: två vägbalkar byggda', len(r['balkar']) == 2 and all(b['vag'] for b in r['balkar']),
          f"{len(r['balkar'])} balkar")
    valj(sida, 'balk', 3)
    dra(sida, (6, 0), (6, 4))
    tryck(sida, (6, 0))
    mitt = next(n for n in sida.evaluate('() => window.bro.ritning.noder') if n['x'] == 6 and n['y'] == 0)
    kolla(f'{namn}: tryck på knutpunkten gör den ledad', not mitt['styv'])
    tryck(sida, (6, 0))
    sida.click('#verktyg [data-v=andra]')
    tryck(sida, (6, 2))
    kolla(f'{namn}: Ändra väljer balken och visar väljaren med Riv', sida.evaluate('() => window.bro.vald') == 2
          and sida.locator('#valjare [data-t=riv]').is_visible())
    bild(sida, bilder, f'{namn}-0-andra')
    sida.click('#valjare [data-t=riv]')
    r = sida.evaluate('() => window.bro.ritning')
    kolla(f'{namn}: riv tar bort balken (och den lösa knutpunkten)',
          len(r['balkar']) == 2 and not any(n['y'] == 4 for n in r['noder']))
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångra tar tillbaka den', antal_balkar(sida) == 3)
    tryck(sida, (6, 2))
    sida.click('#valjare [data-t=riv]')
    valj(sida, 'vag', 3)
    dra(sida, (0, 0), (11, -5))                   # 12,1 m
    kolla(f'{namn}: för lång balk går inte', antal_balkar(sida) == 2)

    # Startpunkten: nära en knutpunkt börjar balken i den, fast närmaste
    # rutnätspunkt är en annan.
    valj(sida, 'balk', 3)
    sk = sida.evaluate('() => window.bro.kam.sk')
    d = min(0.9, 20 / sk)
    dra(sida, (6 + d, -0.15), (9, -3))
    r = sida.evaluate('() => window.bro.ritning')
    b = r['balkar'][-1]
    kolla(f'{namn}: balken börjar i knutpunkten intill', (r['noder'][b['a']]['x'], r['noder'][b['a']]['y']) == (6, 0),
          f'{d:.2f} m bredvid')
    sida.click('#verktyg [data-v=angra]')
    # En ny balk som började i en ny punkt går att rätta i startänden.
    dra(sida, (3, -3), (6, 0))
    kolla(f'{namn}: ny balk från en ny punkt får ett handtag', sida.evaluate('() => !!window.bro.ratta'))
    bild(sida, bilder, f'{namn}-0-langd')
    dra(sida, (3, -3), (4, -3))
    r = sida.evaluate('() => window.bro.ritning')
    b = r['balkar'][-1]
    kolla(f'{namn}: handtaget flyttar startänden', len(r['balkar']) == 3
          and (r['noder'][b['a']]['x'], r['noder'][b['a']]['y']) == (4, -3)
          and not any(n['x'] == 3 and n['y'] == -3 for n in r['noder']))
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångrat tillbaka', antal_balkar(sida) == 2)
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

    # Ändra: en snedbalk som hamnade fel flyttas i ena änden.
    valj(sida, 'balk', 3)
    dra(sida, (6, 0), (3, -3))
    sida.click('#verktyg [data-v=andra]')
    tryck(sida, (4.5, -1.5))
    kolla(f'{namn}: Ändra väljer balken man trycker på', sida.evaluate('() => window.bro.vald') == 2)
    hojder.append(info_h())
    dra(sida, (3, -3), (4, -3))
    r = sida.evaluate('() => window.bro.ritning')
    b = r['balkar'][2]
    andar = sorted([(r['noder'][b['a']]['x'], r['noder'][b['a']]['y']), (r['noder'][b['b']]['x'], r['noder'][b['b']]['y'])])
    kolla(f'{namn}: änden flyttas, den gamla punkten försvinner',
          andar == [(4, -3), (6, 0)] and not any(n['x'] == 3 and n['y'] == -3 for n in r['noder']), str(andar))
    tryck(sida, (3, 0))                           # välj vägen till vänster
    sida.click('#valjare [data-s="4"]')
    kolla(f'{namn}: väljaren byter storlek på vald balk',
          sida.evaluate('() => window.bro.ritning.balkar[0].storlek') == 4
          and sida.evaluate('() => window.bro.ritning.balkar[1].storlek') == 3)
    sida.click('#valjare [data-t=balk]')
    kolla(f'{namn}: och gör väg till balk', not sida.evaluate('() => window.bro.ritning.balkar[0].vag'))
    sida.click('#valjare [data-m=stal]')
    kolla(f'{namn}: och byter material till stål (HEA)', sida.evaluate('() => window.bro.ritning.balkar[0].material') == 'stal'
          and 'HEA 300' in sida.inner_text('#valjare [data-s="4"]'))
    bild(sida, bilder, f'{namn}-0-stal')
    for _ in range(3):
        sida.click('#verktyg [data-v=angra]')
    tryck(sida, (3, 3))                           # tomt: ingen vald
    dra(sida, (6, 0), (6, 1))                     # knutpunkten med alla balkar
    r = sida.evaluate('() => window.bro.ritning')
    i = next(j for j, n in enumerate(r['noder']) if n['x'] == 6 and n['y'] == 1)
    kolla(f'{namn}: knutpunkten flyttas med alla tre balkarna',
          sum(1 for b in r['balkar'] if i in (b['a'], b['b'])) == 3)
    sida.click('#verktyg [data-v=angra]')
    tryck(sida, (5, -1.5))
    sida.click('#valjare [data-t=riv]')
    kolla(f'{namn}: tillbaka till två vägbalkar', antal_balkar(sida) == 2
          and all(b['vag'] and b['storlek'] == 3 for b in sida.evaluate('() => window.bro.ritning.balkar')))
    sida.click('#verktyg [data-v=andra]')
    kolla(f'{namn}: ett tryck till på Ändra går tillbaka till Rita',
          sida.evaluate('() => window.bro.verktyg') == 'rita' and not sida.locator('#valjare').is_visible())

    # Inzoomad: ett finger utanför rutnätet (här i berget) flyttar vyn,
    # bygger inget.
    sida.mouse.move(*skarm(sida, (0, 0)))
    sida.mouse.wheel(0, -600)
    sida.wait_for_timeout(100)
    fore = skarm(sida, (6, 0))
    dra(sida, (-1.5, -1.5), (-0.5, -1.5))
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
    valj(sida, 'vag', 3)
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
    kolla(f'{namn}: vägen av stora balkar håller', rubrik.startswith('Bron höll!'), rubrik)
    k = sida.evaluate('() => window.bro.sim.keiws')
    fx, fy = skarm(sida, (k['x'], k['y']))
    fig = sida.evaluate('() => window.bro.keiwsPx')
    rb = sida.locator('#ruta').bounding_box()
    kolla(f'{namn}: rutan skymmer inte keIWs',
          fx + fig / 2 < rb['x'] or fx - fig / 2 > rb['x'] + rb['width'] or rb['y'] + rb['height'] < fy - fig,
          f"ruta {rb['y']:.0f}–{rb['y'] + rb['height']:.0f}, keIWs {fy - fig:.0f}–{fy:.0f}")
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
    kolla(f'{namn}: fackverket håller', vanta_resultat(sida).startswith('Bron höll!'))

    # Inzoomad: inget bygge, kameran följer keIWs, och Bygg ger tillbaka vyn.
    sida.click('#ruta [data-v=bygg]')
    sida.mouse.move(*skarm(sida, (0, 0)))
    sida.mouse.wheel(0, -600)
    sida.wait_for_timeout(100)
    fore = sida.evaluate('() => [window.bro.zoom, window.bro.mitt]')
    sida.click('#verktyg [data-v=kor]')
    kolla(f'{namn}: inzoomad hoppar keIWs över bygget', not sida.evaluate('() => window.bro.bygger'))
    sida.wait_for_timeout(3000)
    x, k = sida.evaluate('() => [window.bro.mitt[0], window.bro.sim.keiws.x]')
    bild(sida, bilder, f'{namn}-5-folj')
    kolla(f'{namn}: kameran följer keIWs', abs(x - k) < 1.5, f'vyn {x:.1f} m, keIWs {k:.1f} m')
    vanta_resultat(sida)
    sida.click('#ruta [data-v=bygg]')
    efter = sida.evaluate('() => [window.bro.zoom, window.bro.mitt]')
    kolla(f'{namn}: Bygg ger tillbaka vyn', fore == efter, str(efter))
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)

    # En liten balk över hela spannet är för klen.
    sida.evaluate('() => { window.bro.ritning = { noder: window.bro.ritning.noder.filter(n => n.fast), '
                  'balkar: [{ a: 0, b: 2, storlek: 0, vag: true, material: "limtra" }] }; }')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(3300)
    bild(sida, bilder, f'{namn}-6-ras')
    kolla(f'{namn}: en för klen bro rasar', vanta_resultat(sida).startswith('Plask!'))
    bild(sida, bilder, f'{namn}-7-plask')

    # Menyn: billigaste bron som höll, hämta den, förklaringen och versionen.
    sida.click('#ruta [data-v=bygg]')
    sida.click('#menyknapp')
    text = sida.locator('#meny').inner_text()
    kolla(f'{namn}: menyn visar billigaste bron och förklaringen',
          'Billigaste bron som höll' in text and 'Hur funkar det?' in text
          and 'Förutsättningar – för nördar' in text and 'Version v' in text)
    sida.click('#meny details:nth-of-type(2) summary')
    kolla(f'{namn}: materialtabellen har limträ, stål och vajer',
          sida.locator('#meny .tabell th:has-text("Limträ GL30c")').count() == 1
          and sida.locator('#meny .tabell th.kommer').count() == 1)
    bild(sida, bilder, f'{namn}-7-meny')
    sida.click('#meny [data-v=hamta]')
    kolla(f'{namn}: hämta ger den bästa ritningen och stänger menyn',
          antal_balkar(sida) > 1 and not sida.locator('#meny').is_visible())
    sida.click('#verktyg [data-v=andra]')
    b = sida.evaluate('() => { const r = window.bro.ritning, b = r.balkar[0]; '
                      'return [(r.noder[b.a].x + r.noder[b.b].x) / 2, (r.noder[b.a].y + r.noder[b.b].y) / 2]; }')
    tryck(sida, b)
    sida.click('#valjare [data-t=rivallt]')
    kolla(f'{namn}: riv allt (bredvid Riv) tömmer banan',
          antal_balkar(sida) == 0 and sida.evaluate('() => window.bro.ritning.noder.length')
          == sida.evaluate('() => BANOR[window.bro.banaNr].fasten.length'))
    # Rutnätet går bakåt över land (bara ovanför marken) och högre upp, och
    # det finns ett fäste på land.
    sida.click('#verktyg [data-v=rita]')
    o = sida.evaluate('() => BANOR[window.bro.banaNr].omrade')
    dra(sida, (-3, 0), (-1, 4))
    dra(sida, (-1, 4), (2, o['y1']))
    r = sida.evaluate('() => window.bro.ritning')
    a = r['noder'][r['balkar'][0]['a']]
    kolla(f'{namn}: balkar från fästet på land upp till rutnätets topp', len(r['balkar']) == 2
          and a['fast'] and (a['x'], a['y']) == (-3, 0)
          and any((n['x'], n['y']) == (2, o['y1']) for n in r['noder']), f"{len(r['balkar'])} balkar")
    kolla(f'{namn}: inga knutpunkter i marken', sida.evaluate(
        '() => tillaten(-2, 1) && !tillaten(-2, 0) && !tillaten(-2, -1) && tillaten(-3, 0) && !tillaten(-4, 1)'))
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångra efter riv allt', antal_balkar(sida) > 1)
    # En ritning sparad före fästena på land får dem.
    kolla(f'{namn}: gamla ritningar får fästena på land', sida.evaluate('''() => { const b = BANOR[0];
        const r = uppgradera({ version: 3, balkar: [], noder: b.fasten.slice(0, 4).map(([x, y, l]) => fastNod(x, y, l)) }, b);
        return r.noder.length === b.fasten.length && r.noder.every(n => n.fast); }'''))
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
    valj(sida, 'vag', 3)
    dra(sida, (0, 0), (12, 0))
    kolla(f'{namn}: en 12 m balk går att bygga', antal_balkar(sida) == 1)
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    bild(sida, bilder, f'{namn}-8-bana2')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(9000)
    bild(sida, bilder, f'{namn}-9-bana2-prov')
    kolla(f'{namn}: fackverket på bana 2 håller', vanta_resultat(sida, 60).startswith('Bron höll!'))
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
