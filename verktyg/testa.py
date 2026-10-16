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
  - inzoomad flyttar ett finger utanför rutnätet vyn (och var som helst
    när inget verktyg är valt; Väg/Ändra en gång till väljer bort),
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
import json
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


def dra(sida, fran, till, vanta=None):
    """Bygger: från en knutpunkt direkt, på tom yta efter att ha hållit still
    en kort stund (mer än BYGG_HALL men mindre än HALL_TID), och drar.
    vanta=0: ett vanligt drag (panorerar på tom yta)."""
    if vanta is None:
        nara = sida.evaluate('''([x, y]) => { const s = BANOR[window.bro.banaNr].rutnat || 1;
            return window.bro.ritning.noder.some(n => Math.hypot(n.x - x, n.y - y) < 0.95 * s); }''', list(fran))
        vanta = 0 if nara else 275
    x1, y1 = skarm(sida, fran)
    x2, y2 = skarm(sida, till)
    sida.mouse.move(x1, y1)
    sida.mouse.down()
    if vanta:
        sida.wait_for_timeout(vanta)
    sida.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, steps=4)
    sida.mouse.move(x2, y2, steps=4)
    sida.mouse.up()


def tryck(sida, punkt):
    x, y = skarm(sida, punkt)
    sida.mouse.click(x, y)


def hall(sida, punkt, ms=650):
    """Håller fingret still på punkten (väljer det som ligger där)."""
    x, y = skarm(sida, punkt)
    sida.mouse.move(x, y)
    sida.mouse.down()
    sida.wait_for_timeout(ms)
    sida.mouse.up()


def hall_dra(sida, fran, till):
    """Håller på en knutpunkt tills den väljs, och drar den sedan."""
    x1, y1 = skarm(sida, fran)
    x2, y2 = skarm(sida, till)
    sida.mouse.move(x1, y1)
    sida.mouse.down()
    sida.wait_for_timeout(650)
    sida.mouse.move(x2, y2, steps=6)
    sida.mouse.up()


def avmarkera(sida):
    """Ett tryck högt upp på himlen (utanför rutnätet) avmarkerar."""
    if sida.evaluate('() => window.bro.valt'):
        d = sida.locator('#duk').bounding_box()
        sida.mouse.click(d['x'] + d['width'] / 2, d['y'] + sida.evaluate('() => luftNu') + 10)


def ruta(sida, knapp, val):
    """Öppnar rutan vid panelens knapp (material, typ, profil) och väljer."""
    sida.click(f'#valjare [data-p={knapp}]')
    sida.click(f'#popup {val}')
    if sida.evaluate('() => window.bro.popup'):
        sida.click(f'#valjare [data-p={knapp}]')


def valj(sida, typ, profil=None):
    """Bygger med väg/balk/kabel/pelare (och trä 'b×h'), via panelen."""
    avmarkera(sida)
    ruta(sida, 'typ', f'[data-t={typ}]')
    if profil:
        b, h = profil.split('×')
        sida.click('#valjare [data-p=profil]')
        sida.click(f'#popup [data-b="{b}"]')
        sida.click(f'#popup [data-h="{h}"]')
        sida.click('#valjare [data-p=profil]')


def riv_allt(sida):
    """Håller inne Riv och trycker på Riv allt."""
    b = sida.locator('#verktyg [data-v=riv]').bounding_box()
    sida.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)
    sida.mouse.down()
    sida.wait_for_timeout(650)
    sida.mouse.up()
    sida.click('#popup [data-v=rivallt]')


def riv_av(sida):
    return 'av' in (sida.get_attribute('#verktyg [data-v=riv]', 'class') or '')


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

    # Man bygger väg av trä 66×225 från start. Panelen: Material, Typ och
    # Profil, och under (bredvid när den ligger) Ångra, Riv och Kör i samma rutnät.
    panel = lambda p: sida.inner_text(f'#valjare [data-p={p}]').replace('\n', ' ')
    kolla(f'{namn}: man bygger väg av trä 66×225 från start', panel('material') == 'Material Trä' and panel('typ') == 'Typ Väg'
          and '66×225' in panel('profil') and '$$/m' in panel('profil'))
    vb = sida.locator('#styrning').bounding_box()
    rader = sida.evaluate("([kant]) => new Set([...document.querySelectorAll('#styrning button')].map(b => Math.round(b.getBoundingClientRect()[kant]))).size",
                          ['top' if bredd < hojd else 'left'])
    kor = sida.locator('#verktyg [data-v=kor]').bounding_box()
    prof = sida.locator('#valjare [data-p=profil]').bounding_box()
    rutnat = (abs(kor['x'] - prof['x']) < 1 and abs(kor['width'] - prof['width']) < 1 if bredd < hojd
              else abs(kor['y'] - prof['y']) < 1 and abs(kor['height'] - prof['height']) < 1)
    kolla(f'{namn}: Material, Typ, Profil och Ångra Riv Kör i ett rutnät på två ' + ('rader' if bredd < hojd else 'kolumner') + ', utanför spelytan',
          sida.locator('#styrning button').count() == 6 and rader == 2 and riv_av(sida) and rutnat
          and sida.inner_text('#verktyg [data-v=angra]') == 'Ångra'
          and (vb['y'] >= duk['y'] + duk['height'] - 1 if bredd < hojd else vb['x'] >= duk['x'] + duk['width'] - 1))
    if bredd < hojd:
        kolla(f'{namn}: luft under knapparna (telefonens streck)', kor['y'] + kor['height'] <= hojd - 20,
              f"{hojd - kor['y'] - kor['height']:.0f} px")
    bild(sida, bilder, f'{namn}-0-valjare')
    sida.click('#valjare [data-p=profil]')
    kolla(f'{namn}: Profil visar trä i bredder och höjder', sida.locator('#popup [data-b]').count() == 7
          and sida.locator('#popup [data-h]').count() == 11 and sida.locator('#popup [data-b="66"].vald').count() == 1)
    bild(sida, bilder, f'{namn}-0-profil')
    sida.click('#popup [data-b="90"]')
    sida.click('#popup [data-h="270"]')
    kolla(f'{namn}: bredd och höjd väljs, rutan är kvar med pris', sida.evaluate('() => window.bro.ritProfil.limtra') == '90×270'
          and sida.evaluate('() => window.bro.popup') == 'profil' and '90×270' in sida.inner_text('#popup .rubrik')
          and '$$/m' in sida.inner_text('#popup .rubrik') and '90×270' in panel('profil'))
    slank = []
    for k in ['b="56"', 'h="450"', 'h="630"', 'b="42"', 'b="90"', 'h="270"']:
        sida.click(f'#popup [data-{k}]')
        slank.append(sida.evaluate('() => window.bro.ritProfil.limtra'))
    kolla(f'{namn}: höjden högst 7 gånger bredden', slank == ['56×270', '66×450', '90×630', '42×270', '90×270', '90×270'], slank)
    if namn == 'staende':
        luft = sida.evaluate('''() => [document.querySelector('#popup').getBoundingClientRect().top
            - document.querySelector('#duk').getBoundingClientRect().top - sy(bana.vy.y0), profilRutansHojd()]''')
        kolla(f'{namn}: profilrutan skymmer inte banan', luft[0] >= 0, luft)
    d = sida.locator('#duk').bounding_box()
    sida.mouse.click(d['x'] + 15, d['y'] + sida.evaluate('() => luftNu') + 15)
    kolla(f'{namn}: ett tryck på spelytan stänger rutan och bygger inget',
          not sida.evaluate('() => window.bro.popup') and antal_balkar(sida) == 0)
    dra(sida, (0, 0), (7, 0))
    dra(sida, (7, 0), (14, 0))
    r = sida.evaluate('() => window.bro.ritning')
    kolla(f'{namn}: två vägbalkar byggda', len(r['balkar']) == 2 and all(b['vag'] for b in r['balkar']),
          f"{len(r['balkar'])} balkar")
    valj(sida, 'balk')
    dra(sida, (7, 0), (7, 4))
    tryck(sida, (7, 0))
    mitt = next(n for n in sida.evaluate('() => window.bro.ritning.noder') if n['x'] == 7 and n['y'] == 0)
    kolla(f'{namn}: tryck på knutpunkten gör den ledad', not mitt['styv'])
    tryck(sida, (7, 0))
    tryck(sida, (7, 2))
    kolla(f'{namn}: ett kort tryck på en balk väljer inget', sida.evaluate('() => window.bro.vald') == -1
          and antal_balkar(sida) == 3)
    hall(sida, (7, 2))
    kolla(f'{namn}: håll på balken väljer den, Riv blir röd', sida.evaluate('() => window.bro.vald') == 2
          and not riv_av(sida) and 'redigerar' in sida.get_attribute('#valjare', 'class')
          and 'Balk' in panel('typ') and '90×270' in panel('profil'))
    bild(sida, bilder, f'{namn}-0-andra')
    sida.click('#verktyg [data-v=riv]')
    r = sida.evaluate('() => window.bro.ritning')
    kolla(f'{namn}: riv tar bort balken (och den lösa knutpunkten)',
          len(r['balkar']) == 2 and not any(n['y'] == 4 for n in r['noder']))
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångra tar tillbaka den', antal_balkar(sida) == 3)
    hall(sida, (7, 2))
    sida.click('#verktyg [data-v=riv]')
    valj(sida, 'vag')
    dra(sida, (-2, 1), (10, 4))                   # 12,4 m
    kolla(f'{namn}: för lång balk går inte', antal_balkar(sida) == 2)

    # Startpunkten: nära en knutpunkt börjar balken i den, fast närmaste
    # rutnätspunkt är en annan.
    valj(sida, 'balk')
    sk = sida.evaluate('() => window.bro.kam.sk')
    d = min(0.9, 20 / sk)
    dra(sida, (7 + d, 0.15), (10, 3))
    r = sida.evaluate('() => window.bro.ritning')
    b = r['balkar'][-1]
    kolla(f'{namn}: balken börjar i knutpunkten intill', (r['noder'][b['a']]['x'], r['noder'][b['a']]['y']) == (7, 0),
          f'{d:.2f} m bredvid')
    sida.click('#verktyg [data-v=angra]')
    # En ny balk som började i en ny punkt går att rätta i startänden.
    dra(sida, (4, 3), (7, 0))
    kolla(f'{namn}: ny balk från en ny punkt får ett handtag', sida.evaluate('() => !!window.bro.ratta'))
    bild(sida, bilder, f'{namn}-0-langd')
    dra(sida, (4, 3), (5, 3))
    r = sida.evaluate('() => window.bro.ritning')
    b = r['balkar'][-1]
    kolla(f'{namn}: handtaget flyttar startänden', len(r['balkar']) == 3
          and (r['noder'][b['a']]['x'], r['noder'][b['a']]['y']) == (5, 3)
          and not any(n['x'] == 4 and n['y'] == 3 for n in r['noder']))
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångrat tillbaka', antal_balkar(sida) == 2)
    if bredd < hojd:
        rader = sida.evaluate('''() => [...document.querySelectorAll('#info .rad')].map(r => {
            const b = r.getBoundingClientRect();
            return { y: b.top, kapad: r.scrollWidth > r.clientWidth + 1, synlig: b.height > 0 };
        })''')
        kolla(f'{namn}: infotexten på två rader, inget kapat',
              len(rader) == 2 and all(r['synlig'] for r in rader)
              and rader[0]['y'] < rader[1]['y'] and not any(r['kapad'] for r in rader))

    info_h = lambda: sida.evaluate("() => document.getElementById('info').offsetHeight")
    hojder = [info_h()]
    v = sida.evaluate("() => document.getElementById('version').textContent")
    kolla(f'{namn}: versionen syns', bool(__import__('re').fullmatch(r'v\d+-test', v)), v)

    # Ändra: en snedbalk som hamnade fel flyttas i ena änden.
    valj(sida, 'balk')
    dra(sida, (7, 0), (4, 3))
    hall(sida, (5.5, 1.5))
    kolla(f'{namn}: håll väljer balken man trycker på', sida.evaluate('() => window.bro.vald') == 2)
    hojder.append(info_h())
    dra(sida, (4, 3), (5, 3))
    r = sida.evaluate('() => window.bro.ritning')
    b = r['balkar'][2]
    andar = sorted([(r['noder'][b['a']]['x'], r['noder'][b['a']]['y']), (r['noder'][b['b']]['x'], r['noder'][b['b']]['y'])])
    kolla(f'{namn}: änden flyttas, den gamla punkten försvinner',
          andar == [(5, 3), (7, 0)] and not any(n['x'] == 4 and n['y'] == 3 for n in r['noder']), str(andar))
    hall(sida, (3, 0))                            # välj vägen till vänster
    ruta(sida, 'profil', '[data-h="225"]')
    kolla(f'{namn}: profilen byts på vald balk',
          sida.evaluate('() => window.bro.ritning.balkar[0].storlek') == '90×225'
          and sida.evaluate('() => window.bro.ritning.balkar[1].storlek') == '90×270'
          and sida.evaluate('() => window.bro.ritProfil.limtra') == '90×270')
    ruta(sida, 'typ', '[data-t=balk]')
    kolla(f'{namn}: och gör väg till balk', not sida.evaluate('() => window.bro.ritning.balkar[0].vag'))
    sida.click('#valjare [data-p=material]')
    mat = sida.locator('#popup [data-m]').count(), sida.locator('#popup [data-m=stal]').count()
    sida.click('#valjare [data-p=typ]')
    kolla(f'{namn}: bara trä på Bäcken, ingen kabel', mat == (1, 0) and sida.evaluate('() => window.bro.popup') == 'typ'
          and sida.locator('#popup [data-t=kabel]').count() == 0 and sida.locator('#popup [data-t=pelare]').count() == 0)
    sida.click('#valjare [data-p=typ]')
    kolla(f'{namn}: rubriken har spannet', 'Bäcken (14 m)' in sida.inner_text('#info'))
    bild(sida, bilder, f'{namn}-0-andra')
    for _ in range(2):
        sida.click('#verktyg [data-v=angra]')
    hall_dra(sida, (7, 0), (7, 1))                # knutpunkten med alla balkar
    r = sida.evaluate('() => window.bro.ritning')
    i = next(j for j, n in enumerate(r['noder']) if n['x'] == 7 and n['y'] == 1)
    kolla(f'{namn}: knutpunkten flyttas med alla tre balkarna',
          sum(1 for b in r['balkar'] if i in (b['a'], b['b'])) == 3)
    sida.click('#verktyg [data-v=angra]')
    # Håll på en knutpunkt väljer den: styv/ledad och Riv (med balkarna).
    hall(sida, (7, 0))
    kolla(f'{namn}: håll väljer en knutpunkt', sida.evaluate('() => window.bro.vald') == -1
          and 'Förband' in sida.inner_text('#valjare') and sida.locator('#valjare [data-fb=ledad]').count() == 1)
    bild(sida, bilder, f'{namn}-0-knutpunkt')
    sida.click('#valjare [data-fb=ledad]')
    kolla(f'{namn}: knutpunkten blir ledad i panelen', sida.evaluate(
        '() => window.bro.ritning.noder.find(n => n.x === 7 && n.y === 0).styv') is False)
    sida.click('#verktyg [data-v=angra]')
    hall(sida, (7, 0))
    sida.click('#verktyg [data-v=riv]')
    kolla(f'{namn}: Riv tar bort knutpunkten med balkarna', antal_balkar(sida) == 0)
    sida.click('#verktyg [data-v=angra]')
    hall(sida, (6, 1.5))
    sida.click('#verktyg [data-v=riv]')
    kolla(f'{namn}: tillbaka till två vägbalkar', antal_balkar(sida) == 2
          and all(b['vag'] and b['storlek'] == '90×270' for b in sida.evaluate('() => window.bro.ritning.balkar')))
    kolla(f'{namn}: utan val heter knappen Riv allt', sida.inner_text('#verktyg [data-v=riv]') == 'Riv allt'
          and not riv_av(sida))
    sida.click('#verktyg [data-v=riv]')
    kolla(f'{namn}: Riv allt frågar först (inget rivs)', antal_balkar(sida) == 2
          and sida.locator('#popup [data-v=rivallt]').is_visible())
    sida.click('#verktyg [data-v=riv]')
    kolla(f'{namn}: ett tryck till på Riv allt stänger frågan', antal_balkar(sida) == 2
          and not sida.locator('#popup [data-v=rivallt]').is_visible())
    hall(sida, (3, 0))
    kolla(f'{namn}: med en balk vald heter den Riv', sida.inner_text('#verktyg [data-v=riv]') == 'Riv')
    tryck(sida, (10, 6))
    kolla(f'{namn}: ett tryck bredvid släpper valet: Riv allt igen', antal_balkar(sida) == 2
          and sida.inner_text('#verktyg [data-v=riv]') == 'Riv allt')

    # Inzoomad: ett drag på tom yta i rutnätet flyttar vyn och bygger inget;
    # håller man still först börjar en balk där; från en knutpunkt bygger
    # man direkt.
    sida.mouse.move(*skarm(sida, (7, 0)))
    sida.mouse.wheel(0, -600)
    sida.wait_for_timeout(100)
    fore = skarm(sida, (7, 0))
    dra(sida, (5, 2), (7, 2), vanta=0)
    efter = skarm(sida, (7, 0))
    kolla(f'{namn}: ett drag på tom yta panorerar, bygger inget',
          abs(efter[0] - fore[0]) > 20 and antal_balkar(sida) == 2, f'{efter[0] - fore[0]:.0f} px')
    fore = skarm(sida, (7, 0))
    dra(sida, (5, 2), (7, 2))
    efter = skarm(sida, (7, 0))
    kolla(f'{namn}: håll still på tom yta och dra: en ny balk, vyn står kvar',
          antal_balkar(sida) == 3 and abs(efter[0] - fore[0]) < 1)
    sida.click('#verktyg [data-v=angra]')
    dra(sida, (7, 0), (7, 1.5), vanta=0)
    kolla(f'{namn}: ett drag från en knutpunkt bygger direkt', antal_balkar(sida) == 3)
    sida.click('#verktyg [data-v=angra]')
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)

    # Inzoomad: ett finger utanför rutnätet (här i berget) flyttar vyn,
    # bygger inget.
    sida.mouse.move(*skarm(sida, (0, 0)))
    sida.mouse.wheel(0, -600)
    sida.wait_for_timeout(100)
    fore = skarm(sida, (7, 0))
    d = sida.locator('#duk').bounding_box()
    sida.mouse.move(d['x'] + 12, d['y'] + d['height'] - 40)
    sida.mouse.down()
    sida.mouse.move(d['x'] + 70, d['y'] + d['height'] - 40, steps=6)
    sida.mouse.up()
    efter = skarm(sida, (7, 0))
    kolla(f'{namn}: inzoomad flyttar ett finger utanför rutnätet vyn',
          sida.evaluate('() => window.bro.zoom') > 1.2 and abs(efter[0] - fore[0]) > 20 and antal_balkar(sida) == 2,
          f'{efter[0] - fore[0]:.0f} px')
    bild(sida, bilder, f'{namn}-0-panorera')
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)

    # Zoom: mushjulet kring en punkt, sedan nyp med två fingrar.
    x, y = skarm(sida, (7, 0))
    sida.mouse.move(x, y)
    sida.mouse.wheel(0, -400)
    sida.wait_for_timeout(100)
    x2, y2 = skarm(sida, (7, 0))
    zoom = sida.evaluate('() => window.bro.zoom')
    kolla(f'{namn}: mushjulet zoomar in kring pekaren', zoom > 1.2 and abs(x2 - x) < 2 and abs(y2 - y) < 2,
          f'zoom {zoom:.2f}')
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)
    kolla(f'{namn}: och ut igen', sida.evaluate('() => window.bro.zoom') == 1)
    x, y = skarm(sida, (7, 2))
    box = sida.locator('#duk').bounding_box()
    sida.evaluate('''([x, y, ox, oy]) => {
        const duk = document.getElementById('duk');
        const h = (typ, id, px, py) => duk.dispatchEvent(new PointerEvent(typ, {
            pointerId: id, pointerType: 'touch', clientX: px + ox, clientY: py + oy, bubbles: true }));
        h('pointerdown', 11, x - 40, y); h('pointerdown', 12, x + 40, y);
        for (let k = 1; k <= 5; k++) { h('pointermove', 11, x - 40 - 2 * k, y); h('pointermove', 12, x + 40 + 2 * k, y); }
        h('pointerup', 11, x - 50, y); h('pointerup', 12, x + 50, y);
    }''', [x - box['x'], y - box['y'], box['x'], box['y']])
    x2, y2 = skarm(sida, (7, 2))
    zoom = sida.evaluate('() => window.bro.zoom')
    kolla(f'{namn}: nyp med två fingrar zoomar (1,25×), punkten står kvar, inget byggs',
          abs(zoom - 1.25) < 0.02 and abs(x2 - x) < 2 and abs(y2 - y) < 2 and antal_balkar(sida) == 2,
          f'zoom {zoom:.2f}')
    bild(sida, bilder, f'{namn}-0-zoom')
    m = sida.evaluate('''() => { const z = zoom; zoom = 99; sattKamera();
        const m = Math.min(innerWidth, innerHeight) / kam.sk; zoom = z; sattKamera(); return m; }''')
    kolla(f'{namn}: största zoom visar 10 m på skärmens kortaste sida', abs(m - 10) < 0.01, m)
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)
    # Snedbalkarna trycks och knäcks åt sidan om de är smala: 140×180.
    sida.click('#valjare [data-p=profil]')
    sida.click('#popup [data-b="140"]')
    sida.click('#popup [data-h="180"]')
    sida.click('#valjare [data-p=profil]')
    valj(sida, 'balk')
    dra(sida, (0, 0), (7, 2))
    dra(sida, (7, 2), (14, 0))
    dra(sida, (7, 0), (7, 2))
    valj(sida, 'vag')
    sida.click('#valjare [data-p=profil]')
    sida.click('#popup [data-b="90"]')
    sida.click('#popup [data-h="270"]')
    sida.click('#valjare [data-p=profil]')
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
    rader = sida.evaluate("""() => [...document.querySelectorAll('#info .rad')].map(r => {
        const b = r.getBoundingClientRect(); return { y: b.top, text: r.textContent }; })""")
    if namn == 'staende':
        kolla(f'{namn}: utnyttjandet står på en rad under budgeten',
              len(rader) == 3 and 'utnyttjande' in rader[2]['text'] and rader[2]['y'] > rader[1]['y'] + 10, str(rader))
    rubrik = vanta_resultat(sida)
    kolla(f'{namn}: vägen med en stolpe och två snedbalkar ovanpå håller', rubrik.startswith('Bron höll!'), rubrik)
    k = sida.evaluate('() => window.bro.sim.keiws')
    fx, fy = skarm(sida, (k['x'], k['y']))
    fig = sida.evaluate('() => window.bro.keiwsPx')
    rb = sida.locator('#ruta').bounding_box()
    kolla(f'{namn}: rutan skymmer inte keIWs',
          fx + fig / 2 < rb['x'] or fx - fig / 2 > rb['x'] + rb['width'] or rb['y'] + rb['height'] < fy - fig,
          f"ruta {rb['y']:.0f}–{rb['y'] + rb['height']:.0f}, keIWs {fy - fig:.0f}–{fy:.0f}")
    bild(sida, bilder, f'{namn}-3-holl')

    sida.click('#ruta [data-v=bygg]')
    spara = sida.evaluate('() => JSON.stringify(window.bro.ritning)')

    # När vägen når hela vägen mellan brolagren byts typen till balk.
    sida.evaluate('() => { const f = window.bro.ritning.noder.filter(n => n.fast); window.bro.ritning = { noder: f, balkar: [] }; }')
    valj(sida, 'vag')
    dra(sida, (0, 0), (7, 0))
    halv = sida.evaluate('() => window.bro.ritVag')
    dra(sida, (7, 0), (14, 0))
    kolla(f'{namn}: vägen hel mellan lagren byter till balk', halv and not sida.evaluate('() => window.bro.ritVag'))
    valj(sida, 'vag')
    sida.reload()
    sida.wait_for_function('() => window.bro')
    kolla(f'{namn}: med hel väg börjar man med balk efter omladdning', not sida.evaluate('() => window.bro.ritVag')
          and 'Balk' in panel('typ'))
    # Något valt och ett tryck på något annat: väljs direkt.
    hall(sida, (3.5, 0))
    forsta = sida.evaluate('() => window.bro.vald')
    tryck(sida, (10.5, 0))
    kolla(f'{namn}: ett tryck på en annan balk väljer den direkt',
          forsta == 0 and sida.evaluate('() => window.bro.vald') == 1, str(sida.evaluate('() => window.bro.vald')))
    sida.click('#valjare [data-p=profil]')
    tryck(sida, (3.5, 0))
    kolla(f'{namn}: med profilrutan öppen väljer ett tryck en annan balk, rutan står kvar',
          sida.evaluate('() => window.bro.vald') == 0 and sida.evaluate('() => window.bro.popup') == 'profil')
    sida.click('#valjare [data-p=profil]')
    tryck(sida, (7, 0))
    kolla(f'{namn}: och på en knutpunkt väljer den', sida.evaluate('() => window.bro.vald') == -1
          and sida.evaluate('() => window.bro.valt'))
    avmarkera(sida)
    sida.evaluate(f'() => {{ window.bro.ritning = JSON.parse({spara!r}); }}')

    # Den sparade lösningen (fackverk av små balkar).
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
    utzoomad = sida.evaluate('() => window.bro.keiwsPx')
    sida.mouse.wheel(0, -3000)                    # full zoom
    sida.wait_for_timeout(100)
    inzoomad = sida.evaluate('() => window.bro.keiwsPx')
    kolla(f'{namn}: keIWs är större fullt inzoomad på Bäcken', abs(inzoomad / utzoomad - 1.35 / 0.7) < 0.02,
          f'{utzoomad:.0f} -> {inzoomad:.0f} px')
    fore = sida.evaluate('() => [window.bro.zoom, window.bro.mitt]')
    sida.click('#verktyg [data-v=kor]')
    kolla(f'{namn}: inzoomad hoppar keIWs över bygget', not sida.evaluate('() => window.bro.bygger'))
    sida.wait_for_timeout(3000)
    x, k = sida.evaluate('() => [window.bro.mitt[0], window.bro.sim.keiws.x]')
    bild(sida, bilder, f'{namn}-5-folj')
    kolla(f'{namn}: kameran följer keIWs', abs(x - k) < 1.5, f'vyn {x:.1f} m, keIWs {k:.1f} m')
    kk = sida.evaluate('() => window.bro.sim.keiws')
    fy = skarm(sida, (kk['x'], kk['y']))[1]
    fig = sida.evaluate('() => window.bro.keiwsPx')
    duk = sida.locator('#duk').bounding_box()
    topp = duk['y'] + sida.evaluate('() => luftNu')
    botten = duk['y'] + duk['height']
    mitten = fy - fig / 2
    kolla(f'{namn}: keIWs står mitt i bild inzoomad', topp + (botten - topp) * 0.25 < mitten < botten - (botten - topp) * 0.25,
          f'figurens mitt {mitten:.0f}, synligt {topp:.0f}–{botten:.0f}')
    vanta_resultat(sida)
    sida.click('#ruta [data-v=bygg]')
    efter = sida.evaluate('() => [window.bro.zoom, window.bro.mitt]')
    kolla(f'{namn}: Bygg ger tillbaka vyn', fore == efter, str(efter))
    sida.mouse.wheel(0, 3000)
    sida.wait_for_timeout(100)

    # En liten balk över hela spannet är för klen.
    sida.evaluate('() => { const f = window.bro.ritning.noder.filter(n => n.fast); window.bro.ritning = { noder: f, '
                  'balkar: [{ a: 0, b: f.findIndex(n => n.lager === "glid"), storlek: 0, vag: true, material: "limtra" }] }; }')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(3300)
    bild(sida, bilder, f'{namn}-6-ras')
    kolla(f'{namn}: en för klen bro rasar', vanta_resultat(sida).startswith('Plask!'))
    bild(sida, bilder, f'{namn}-7-plask')

    # Förloppet: brott för brott, ett tryck på en balk visar utnyttjandet.
    sida.click('#ruta [data-v=forlopp]')
    f = sida.evaluate('() => window.bro.forlopp')
    text = sida.evaluate('() => document.querySelector("#ruta").textContent')
    kolla(f'{namn}: Förlopp visar första brottet', f and f['nr'] == 0 and text.startswith('Brott 1 av')
          and 'Väg ' in text and 'böjning' in text and 'egentyngden' in text, text)
    if f['antal'] > 1:
        sida.click('#ruta [data-v=forlopp-nasta]')
    kolla(f'{namn}: › går till nästa brott', f['antal'] == 1 or sida.evaluate('() => window.bro.forlopp.nr') == 1)
    sida.click('#ruta [data-v=forlopp-forra]') if f['antal'] > 1 else None
    tryck(sida, (2, 0))
    kolla(f'{namn}: ett tryck på balken visar dess utnyttjande', sida.evaluate('() => window.bro.forlopp.valt') == 0
          and 'Väg ' in sida.inner_text('#ruta .valt') and '%' in sida.inner_text('#ruta .valt'))
    bild(sida, bilder, f'{namn}-7-forlopp')
    sida.click('#ruta [data-v=forlopp-klar]')
    kolla(f'{namn}: Klar går tillbaka till resultatet', sida.inner_text('#ruta h1').startswith('Plask!')
          and not sida.evaluate('() => window.bro.forlopp'))

    # Menyn: billigaste bron som höll, hämta den, förklaringen och versionen.
    sida.click('#ruta [data-v=bygg]')
    sida.click('#menyknapp')
    text = sida.locator('#meny').inner_text()
    kolla(f'{namn}: menyn visar billigaste bron och förklaringen',
          'Billigaste bron som höll' in text and '(budget 13 000 $$)' in text.replace(' ', ' ') and 'Hur funkar det?' in text
          and 'Förutsättningar – för nördar' in text and 'Version v' in text)
    sida.click('#meny [data-v=dela]')
    dela = sida.locator('#meny .dela').input_value()
    kolla(f'{namn}: dela konstruktionen ger ritningen som text', dela.startswith('BROBYGGARE ')
          and json.loads(dela[11:])['ritning'] == sida.evaluate('() => window.bro.ritning'))
    sida.click('#meny details:nth-of-type(2) summary')
    kolla(f'{namn}: materialtabellen har limträ, stål, betong och kabel',
          sida.locator('#meny .tabell th:has-text("Limträ GL30c")').count() == 1
          and sida.locator('#meny .tabell th:has-text("Betong C35/45")').count() == 1
          and sida.locator('#meny .tabell th:has-text("Kabel (stållina)")').count() == 1
          and sida.locator('#meny .tabell th.kommer').count() == 0)
    bild(sida, bilder, f'{namn}-7-meny')
    sida.click('#meny [data-v=hamta]')
    kolla(f'{namn}: hämta ger den bästa ritningen och stänger menyn',
          antal_balkar(sida) > 1 and not sida.locator('#meny').is_visible())
    kolla(f'{namn}: rekord från före de sex storlekarna (version 7) glöms', sida.evaluate('''() => {
          localStorage.setItem('brobyggare-basta-Ån', JSON.stringify({ kostnad: 1, ritning: { version: 6, noder: [], balkar: [] } }));
          return lasBasta(1) === null; }'''))
    # Möjliga lösningar i menyn: enkel byter ritningen, Ångra tar tillbaka den.
    fore = sida.evaluate('() => JSON.stringify(window.bro.ritning)')
    sida.click('#menyknapp')
    kolla(f'{namn}: möjliga lösningar är gömda tills man öppnar dem', not sida.locator('#meny [data-facit=enkel]').is_visible())
    sida.click('#meny .facit summary')
    bild(sida, bilder, f'{namn}-7-facit')
    sida.click('#meny [data-facit=enkel]')
    kolla(f'{namn}: först en fusk-varning, ritningen är kvar', sida.locator('#meny .varning').is_visible()
          and 'ersätter din nuvarande ritning' in sida.inner_text('#meny .varning')
          and sida.evaluate('() => JSON.stringify(window.bro.ritning)') == fore)
    bild(sida, bilder, f'{namn}-7-fusk')
    sida.click('#meny [data-v=ingetfusk]')
    kolla(f'{namn}: "Jag provar själv" stänger varningen', not sida.locator('#meny .varning').is_visible()
          and sida.locator('#meny').is_visible())
    sida.click('#meny [data-facit=enkel]')
    sida.click('#meny [data-fusk=enkel]')
    kolla(f'{namn}: en möjlig lösning (enkel) hämtas och menyn stängs', not sida.locator('#meny').is_visible()
          and sida.evaluate('() => window.bro.kostnad()')
          == sida.evaluate('() => ritningensKostnad(losningsRitning(BANOR[0], BANOR[0].facit.enkel), BANOR[0])'))
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: Ångra tar tillbaka ritningen', sida.evaluate('() => JSON.stringify(window.bro.ritning)') == fore)
    # Guiden: ? under menyknappen, ett steg i taget, Klar stänger.
    sida.click('#guideknapp')
    kolla(f'{namn}: guiden börjar med en välkomst', sida.locator('#guide').is_visible()
          and 'Välkommen' in sida.inner_text('#guide .bubbla'))
    steg = 1
    while sida.locator('#guide').is_visible() and steg < 40:
        if steg in (2, 4, 7, 10, 14):
            bild(sida, bilder, f'{namn}-8-guide{steg}')
        sida.click('#guide [data-g=nasta]')
        steg += 1
    kolla(f'{namn}: guiden går igenom stegen och stängs med Klar', not sida.locator('#guide').is_visible() and 10 < steg < 40, steg)
    sida.click('#guideknapp')
    sida.click('#guide [data-g=stang]')
    kolla(f'{namn}: ✕ stänger guiden', not sida.locator('#guide').is_visible())
    riv_allt(sida)
    kolla(f'{namn}: håll inne Riv: Riv allt tömmer banan',
          antal_balkar(sida) == 0 and sida.evaluate('() => window.bro.ritning.noder.length')
          == sida.evaluate('() => BANOR[window.bro.banaNr].fasten.length'))
    # Rutnätet går bakåt över land (bara ovanför marken) och högre upp.
    # Bäcken har bara vägens två lager som fästen.
    o = sida.evaluate('() => BANOR[window.bro.banaNr].omrade')
    dra(sida, (0, 0), (-1, 4))
    dra(sida, (-1, 4), (2, o['y1']))
    r = sida.evaluate('() => window.bro.ritning')
    a = r['noder'][r['balkar'][0]['a']]
    kolla(f'{namn}: balkar från lagret över land upp till rutnätets topp', len(r['balkar']) == 2
          and a['fast'] and (a['x'], a['y']) == (0, 0)
          and any((n['x'], n['y']) == (2, o['y1']) for n in r['noder']), f"{len(r['balkar'])} balkar")
    kolla(f'{namn}: inga knutpunkter i marken (kanten lutar lite)', sida.evaluate(
        '() => tillaten(-2, 1) && !tillaten(-2, 0) && !tillaten(-2, -1) && !tillaten(-3, 0) && !tillaten(-4, 1)'
        ' && !tillaten(0, -1) && tillaten(1, -1) && !tillaten(3, -2) && BANOR[0].fasten.length === 2'))
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=angra]')
    kolla(f'{namn}: ångra efter riv allt', antal_balkar(sida) > 1)
    # En ritning sparad före fästena på land får dem.
    kolla(f'{namn}: gamla storlekar (15 och 9 steg) blir närmaste av de sex', sida.evaluate('''() =>
          uppgradera({ version: 4, noder: [], balkar: [{ storlek: 0 }, { storlek: 1.5 }, { storlek: 2 }, { storlek: 3.5 },
          { storlek: 0, material: 'stal' }, { storlek: -0.25, material: 'stal' }] }).balkar
          .map(b => b.storlek + ' ' + profil(b.material || 'limtra', b.storlek).namn).join()''')
          == '0 56×180,3 90×245,4 90×270,5 90×345,3 HEA 140,2 HEA 100')
    kolla(f'{namn}: ritningar med 9 steg får sex', sida.evaluate('''() =>
          uppgradera({ version: 6, noder: [], balkar: [{ storlek: 0.75 }, { storlek: 1.75, material: 'stal' }] }).balkar
          .map(b => b.storlek).join()''') == '2,4')
    kolla(f'{namn}: nya ritningar behåller storleken (steg eller profilens namn)', sida.evaluate('''() =>
          uppgradera({ version: 7, noder: [], balkar: [{ storlek: 3 }, { storlek: 'HEB 300', material: 'stal' }] }).balkar
          .map(b => b.storlek).join()''') == '3,HEB 300')
    kolla(f'{namn}: profilerna har riktiga värden', sida.evaluate('''() => profil('stal', 'HEB 300').pris > profil('stal', 'HEA 300').pris
          && profil('stal', 'IPE 600').I > profil('stal', 'HEA 400').I && profil('limtra', '140×630').h === 0.63
          && profil('limtra', 'nej').namn === '66×225' && Object.keys(STAL).length === 66'''))
    kolla(f'{namn}: gamla ritningar tappar fästena som tagits bort', sida.evaluate('''() => { const b = BANOR[0];
        const gamla = [[0, 0, 'fast'], [0, -3], [14, 0, 'glid'], [14, -3], [-3, 0], [17, 0]];
        const r = uppgradera({ version: 4, noder: gamla.map(([x, y, l]) => fastNod(x, y, l)),
                               balkar: [{ a: 3, b: 2, storlek: 1, vag: false, material: 'limtra' }] }, b);
        const k = r.balkar[0], n = r.noder[k.a];
        return r.noder.length === 3 && !n.fast && n.x === 14 && n.y === -3 && r.noder[k.b].lager === 'glid'; }'''))
    sida.click('#menyknapp')
    d = sida.locator('#duk').bounding_box()
    sida.mouse.click(d['x'] + 5, d['y'] + d['height'] - 20)   # utanför menyns panel
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
    valj(sida, 'vag')
    dra(sida, (0, 0), (12, 0))
    kolla(f'{namn}: en 12 m balk går att bygga', antal_balkar(sida) == 1)
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    bild(sida, bilder, f'{namn}-8-bana2')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(9000)
    bild(sida, bilder, f'{namn}-9-bana2-prov')
    kolla(f'{namn}: fackverket på bana 2 håller', vanta_resultat(sida, 60).startswith('Bron höll!'))
    kolla(f'{namn}: rutan har Bygg vidare och Nästa bana',
          sida.locator('#ruta [data-v=bygg]').count() == 1 and sida.inner_text('#ruta [data-v=nasta]') == 'Nästa bana')
    sida.click('#ruta [data-v=nasta]')
    kolla(f'{namn}: Nästa bana går till bana 3 och bygget',
          sida.evaluate('() => window.bro.banaNr') == 2 and sida.locator('#ruta.dold').count() == 1
          and sida.evaluate('() => window.bro.lage') == 'bygg')
    pil = [sida.locator(f'#info [data-v={v}]').bounding_box()['x'] for v in ('forra', 'nasta', 'banor')]
    sida.click('#info [data-v=banor]')
    kolla(f'{namn}: pilarna bredvid varandra, namnet visar alla banor', pil[0] < pil[1] < pil[2]
          and sida.locator('#popup [data-bana]').count() == 8 and sida.locator('#popup [data-bana="2"].vald').count() == 1
          and '✓' in sida.inner_text('#popup [data-bana="1"]'))
    bild(sida, bilder, f'{namn}-9-banor')
    sida.click('#popup [data-bana="0"]')
    kolla(f'{namn}: bana 1 har kvar sin ritning', sida.evaluate('() => window.bro.banaNr') == 0
          and antal_balkar(sida) == 1 and not sida.evaluate('() => window.bro.popup'))

    # Bana 3, Sundet: 38 m, bara trä, ett fackverk. Lösningen håller.
    sida.click('#info [data-v=nasta]')
    sida.click('#info [data-v=nasta]')
    kolla(f'{namn}: pilen byter till bana 3 (Sundet)', sida.evaluate('() => window.bro.banaNr') == 2
          and antal_balkar(sida) == 0)
    sida.click('#valjare [data-p=material]')
    kolla(f'{namn}: Sundet har bara trä', sida.locator('#popup [data-m=stal]').count() == 0)
    sida.click('#valjare [data-p=material]')
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    kolla(f'{namn}: lösningen på bana 3 (Sundet) ryms i budgeten', sida.evaluate('() => window.bro.kostnad()')
          <= sida.evaluate('() => BANOR[2].budget'))
    bild(sida, bilder, f'{namn}-10-sundet')
    sida.click('#verktyg [data-v=kor]')
    kolla(f'{namn}: träfackverket över Sundet håller', vanta_resultat(sida, 60).startswith('Bron höll!'))
    sida.click('#ruta [data-v=bygg]')

    # Bana 4, Kanalen: 50 m, här kommer stålet och rören (ingen farled
    # eller pelare). Lösningen (ett bågfackverk av stål) håller.
    sida.click('#info [data-v=nasta]')
    kolla(f'{namn}: pilen byter till bana 4 (Kanalen)', sida.evaluate('() => window.bro.banaNr') == 3
          and antal_balkar(sida) == 0)
    valj(sida, 'vag')
    dra(sida, (0, 0), (2.7, 0.3))
    r = sida.evaluate('() => window.bro.ritning')
    kolla(f'{namn}: rutnätet på Kanalen är 1 m', antal_balkar(sida) == 1
          and (r['noder'][r['balkar'][0]['b']]['x'], r['noder'][r['balkar'][0]['b']]['y']) == (3, 0))
    kolla(f'{namn}: ingen farled på Kanalen', sida.evaluate('() => tillaten(20, -3) && laggTillBalk([18, -2], [24, 0])'))
    sida.click('#verktyg [data-v=angra]')
    sida.click('#verktyg [data-v=angra]')
    sida.click('#valjare [data-p=material]')
    mat = sida.locator('#popup [data-m=stal]').count(), sida.locator('#popup [data-m=betong]').count()
    sida.click('#valjare [data-p=typ]')
    kolla(f'{namn}: Kanalen har trä och stål, inte betong, kabel eller pelare', mat == (1, 0)
          and sida.locator('#popup [data-t=kabel]').count() == 0 and sida.locator('#popup [data-t=pelare]').count() == 0)
    sida.click('#valjare [data-p=typ]')
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    kolla(f'{namn}: lösningen på bana 4 (Kanalen) ryms i budgeten', sida.evaluate('() => window.bro.kostnad()')
          <= sida.evaluate('() => BANOR[3].budget'))
    bild(sida, bilder, f'{namn}-10-kanalen')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(9000)
    bild(sida, bilder, f'{namn}-10-kanalen-prov')
    kolla(f'{namn}: stålfackverket över Kanalen håller', vanta_resultat(sida, 60).startswith('Bron höll!'))
    sida.click('#ruta [data-v=bygg]')

    # Bana 5, Ravinen (torr, mjuka sluttningar): trä och stål, ett fäste på var
    # sluttning. Lösningen ryms i budgeten.
    sida.click('#info [data-v=nasta]')
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    sida.click('#valjare [data-p=material]')
    kolla(f'{namn}: Ravinen har trä och stål, inte betong', sida.locator('#popup [data-m=stal]').count() == 1
          and sida.locator('#popup [data-m=betong]').count() == 0)
    sida.click('#valjare [data-p=material]')
    kolla(f'{namn}: lösningen på bana 5 (Ravinen) ryms i budgeten', sida.evaluate('() => window.bro.banaNr') == 4
          and sida.evaluate('() => window.bro.kostnad()') <= sida.evaluate('() => BANOR[4].budget'))
    kolla(f'{namn}: inga knutpunkter i sluttningen', sida.evaluate('() => tillaten(2, -1) && !tillaten(2, -2) && tillaten(4, -5)'))
    bild(sida, bilder, f'{namn}-10-ravinen')
    # Ingen bro har hållit på Ravinen: pilen varnar först, nästa tryck går
    # vidare.
    sida.click('#info [data-v=nasta]')
    kolla(f'{namn}: pilen varnar när ingen bro har hållit', sida.evaluate('() => window.bro.banaNr') == 4
          and 'Ingen bro har hållit än' in sida.inner_text('#info'), sida.inner_text('#info'))

    # Bana 6, Dalgången: lösningen (båge) ryms i budgeten.
    sida.click('#info [data-v=nasta]')
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    sida.click('#valjare [data-p=material]')
    mat = sida.locator('#popup [data-m=stal]').count(), sida.locator('#popup [data-m=betong]').count()
    sida.click('#popup [data-m=stal]')
    sida.click('#valjare [data-p=typ]')
    kolla(f'{namn}: stål på Dalgången, betong och kabel inte än', mat == (1, 0)
          and sida.locator('#popup [data-t=kabel]').count() == 0 and 'Stål' in panel('material'))
    sida.click('#valjare [data-p=profil]')
    serier = sida.locator('#popup [data-serie]').count()
    sida.click('#popup [data-serie=IPE]')
    sida.click('#popup [data-nr="100"]')
    ipe = sida.evaluate('() => window.bro.ritProfil.stal')
    sida.click('#popup [data-serie=HEB]')
    heb = sida.evaluate('() => window.bro.ritProfil.stal')
    sida.click('#popup [data-nr="600"]')
    bild(sida, bilder, f'{namn}-10-stal')
    kolla(f'{namn}: stål är IPE, HEA, HEB och KKR, serien behåller höjden', serier == 4 and ipe == 'IPE 100' and heb == 'HEB 100'
          and sida.locator('#popup [data-nr]').count() == 19 and 'HEB 600' in sida.inner_text('#popup .rubrik')
          and 'HEB 600' in panel('profil'), f'{ipe}, {heb}')
    sida.click('#popup [data-serie=KKR]')
    kkr = sida.evaluate('() => window.bro.ritProfil.stal')
    sida.click('#popup [data-nr="60×4"]')
    kolla(f'{namn}: fyrkantsrören KKR, närmast i höjd', kkr == 'KKR 200×8' and sida.locator('#popup [data-nr]').count() == 10
          and sida.evaluate('() => window.bro.ritProfil.stal') == 'KKR 60×4' and 'Mått' in sida.inner_text('#popup'), kkr)
    sida.click('#valjare [data-p=profil]')
    ruta(sida, 'material', '[data-m=limtra]')
    kolla(f'{namn}: lösningen på bana 6 (Dalgången) ryms i budgeten', sida.evaluate('() => window.bro.banaNr') == 5
          and sida.evaluate('() => window.bro.kostnad()') <= sida.evaluate('() => BANOR[5].budget'))
    bild(sida, bilder, f'{namn}-10-dalgangen')
    sida.click('#info [data-v=nasta]')

    # Bana 7, Älven: betong och kablar kommer, kablar får vara längre än balkarna, ingen materialrad
    # för kabeln, och en balk kan göras om till kabel. Lösningen
    # (snedkabelbro) ritas, provkörningen är testad i testa_banor.js.
    # Här finns också farleden (inget får byggas där) och pelare från botten (som kostar).
    sida.click('#info [data-v=nasta]')
    kolla(f'{namn}: pilen byter till bana 7 (Älven)', sida.evaluate('() => window.bro.banaNr') == 6
          and antal_balkar(sida) == 0)
    kolla(f'{namn}: inget i farleden', sida.evaluate('''() => !tillaten(80, -5) && tillaten(80, 0)
          && tillaten(40, -5) && !laggTillBalk([40, -5], [80, 0]) && laggTillBalk([40, -5], [45, 0])
          && !flyttaNod(nodVid(45, 0), [50, -5])'''), f'{antal_balkar(sida)} balkar')
    sida.click('#verktyg [data-v=angra]')
    fore = sida.evaluate('() => window.bro.kostnad()')
    valj(sida, 'pelare')
    kolla(f'{namn}: panelen har Pelare med pris', 'Pelare' in panel('typ')
          and '5 400' in sida.inner_text('#valjare').replace('\xa0', ' '), sida.inner_text('#valjare'))
    tryck(sida, (30, -5))
    n = sida.evaluate('() => window.bro.ritning.noder.find(n => n.x === 30 && n.y === -5)')
    kolla(f'{namn}: ett tryck sätter en pelare (3 000 + 11 m × 150 $$)', n and n.get('pelare') and n['fast']
          and sida.evaluate('() => window.bro.kostnad()') == fore + 4650)
    tryck(sida, (80, -5))
    tryck(sida, (-5, 5))
    kolla(f'{namn}: Riv heter Riv allt utan val', sida.inner_text('#verktyg [data-v=riv]') == 'Riv allt')
    hall(sida, (30, -5))
    kolla(f'{namn}: håll väljer en pelare', '4 650' in sida.inner_text('#valjare').replace('\xa0', ' ')
          and not riv_av(sida), sida.inner_text('#valjare'))
    sida.click('#verktyg [data-v=riv]')
    kolla(f'{namn}: pelaren tas bort igen, och går inte i farleden eller på land',
          not sida.evaluate('() => window.bro.ritning.noder.some(n => n.pelare)')
          and sida.evaluate('() => window.bro.kostnad()') == fore)
    valj(sida, 'kabel')
    kolla(f'{namn}: kabeln är stållina (inget material att välja)', sida.locator('#valjare [data-p=material]').is_disabled()
          and 'Stållina' in panel('material') and 'Kabel' in panel('typ') and 'Ø' in panel('profil'))
    kolla(f'{namn}: en kabel får vara 60 m men inte en balk', sida.evaluate('''() => laggTillBalk([0, 0], [40, 45])
          && window.bro.ritning.balkar.at(-1).material === 'vajer' && !window.bro.ritning.balkar.at(-1).vag'''))
    valj(sida, 'balk')
    kolla(f'{namn}: balken är högst 20 m på Älven', sida.evaluate('''() => !laggTillBalk([0, 0], [25, 0])
          && laggTillBalk([0, 0], [20, 0]) && window.bro.ritning.balkar.at(-1).material !== 'vajer' '''))
    hall(sida, (10, 0))
    ruta(sida, 'typ', '[data-t=kabel]')
    kolla(f'{namn}: Typ gör om en vald balk till kabel', sida.evaluate(
        '() => window.bro.ritning.balkar.at(-1).material') == 'vajer')
    riv_allt(sida)
    valj(sida, 'vag')
    for nr, bnamn in [(6, 'alven'), (7, 'havet')]:
        if nr > 6:
            sida.click('#info [data-v=nasta]')
            sida.click('#info [data-v=nasta]')    # förbi varningen
        sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
        kolla(f'{namn}: lösningen på bana {nr + 1} ryms i budgeten', sida.evaluate('() => window.bro.banaNr') == nr
              and sida.evaluate('() => window.bro.kostnad()') <= sida.evaluate(f'() => BANOR[{nr}].budget'))
        bild(sida, bilder, f'{namn}-12-{bnamn}')
    # Havet: keIWs kör bil (2,5 ton) över hängbron.
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(8000)
    bild(sida, bilder, f'{namn}-13-bil')
    kolla(f'{namn}: keIWs kör bil över hängbron på Havet', vanta_resultat(sida, 90).startswith('Bron höll!'))
    # Rekordet går att hämta direkt efter provet, och att nollställa (två tryck).
    sida.click('#menyknapp')
    sida.click('#meny [data-v=hamta]')
    kolla(f'{namn}: hämta rekordet efter provet går tillbaka till att bygga', sida.evaluate('() => window.bro.lage') == 'bygg'
          and not sida.locator('#ruta').is_visible() and antal_balkar(sida) > 1)
    sida.click('#menyknapp')
    sida.click('#meny [data-v=nollstall]')
    forst = 'Billigaste bron som höll' in sida.inner_text('#meny')
    sida.click('#meny [data-v=nollstall]')
    kolla(f'{namn}: nollställ rekordet frågar först, sedan är det borta', forst
          and 'Ingen bro har hållit här än.' in sida.inner_text('#meny') and sida.evaluate('() => lasBasta(6)') is None)
    sida.click('#meny [data-v=stang]')
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
