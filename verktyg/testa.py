"""Testar spelet i en riktig webbläsare (headless Chrome via Playwright).

Kör först fysiktesterna (node verktyg/testa_fysik.js), startar sedan en egen
lokal webbserver och öppnar spelet med ?test (då finns window.bro att
läsa), stående och liggande. Kontrollerar att:

  - inga JavaScript-fel uppstår,
  - verktygen ligger nedtill när mobilen står och till höger när den ligger,
    och att hela banan syns,
  - man kan bygga en väg genom att dra mellan punkterna, trycka på en
    knutpunkt (styvt/ledat), riva en balk och ångra, men inte bygga för
    långa balkar,
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

    # Bygg en väg i två delar (Mellan) genom att dra med musen.
    sida.click('#verktyg [data-v=vag]')
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
    dra(sida, (0, 0), (7, 0))
    kolla(f'{namn}: för lång balk går inte', antal_balkar(sida) == 2)
    bild(sida, bilder, f'{namn}-1-bygg')

    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(5000)
    bild(sida, bilder, f'{namn}-2-prov')
    rubrik = vanta_resultat(sida)
    kolla(f'{namn}: vägen av mellanbalkar håller', rubrik == 'Bron höll!', rubrik)
    bild(sida, bilder, f'{namn}-3-holl')

    # Den sparade lösningen (fackverk av små balkar).
    sida.click('#ruta [data-v=bygg]')
    sida.evaluate('() => { window.bro.ritning = window.bro.losningsRitning(); }')
    bild(sida, bilder, f'{namn}-4-fackverk')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(6000)
    bild(sida, bilder, f'{namn}-5-fackverk-prov')
    kolla(f'{namn}: fackverket håller', vanta_resultat(sida) == 'Bron höll!')

    # En liten balk över hela spannet är för klen.
    sida.click('#ruta [data-v=bygg]')
    sida.evaluate('() => { window.bro.ritning = { noder: window.bro.ritning.noder.filter(n => n.fast), '
                  'balkar: [{ a: 0, b: 2, storlek: 0, vag: true, material: "limtra" }] }; }')
    sida.click('#verktyg [data-v=kor]')
    sida.wait_for_timeout(2500)
    bild(sida, bilder, f'{namn}-6-ras')
    kolla(f'{namn}: en för klen bro rasar', vanta_resultat(sida) == 'Plask!')
    bild(sida, bilder, f'{namn}-7-plask')
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
