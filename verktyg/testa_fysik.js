// Kontrollerar FE-lösaren mot handräkningar (och banorna mot sparade
// lösningar). Körs med node:
//
//     node verktyg/testa_fysik.js
//
// Skriver OK/FEL per kontroll och avslutas med kod 1 om något var fel.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROT = path.join(__dirname, '..');
// Spelets filer körs som vanliga skript i den här kontexten (som i
// webbläsaren). En egen vm-kontext gör lösaren ca tio gånger långsammare.
for (const f of ['material.js', 'fysik.js', 'banor.js', 'spel.js']) {
    vm.runInThisContext(fs.readFileSync(path.join(ROT, f), 'utf8'), { filename: f });
}
const S = name => vm.runInThisContext(name);

let fel = 0;
function kolla(namn, ok, text) {
    console.log((ok ? 'OK  ' : 'FEL ') + namn + (text ? '  (' + text + ')' : ''));
    if (!ok) fel++;
}
const nara = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
const pct = (a, b) => ((a / b - 1) * 100).toFixed(2) + ' %';

const { byggModell, losStatiskt, steg, lage } = { byggModell: S('byggModell'), losStatiskt: S('losStatiskt'), steg: S('steg'), lage: S('lage') };
const PROFILER = S('PROFILER'), MATERIAL = S('MATERIAL'), G = S('G');
const mat = MATERIAL.limtra;

// 1. Fritt upplagd balk under egenvikt: δ = 5qL⁴/384EI.
{
    const L = 6, p = PROFILER.limtra[3];
    const m = byggModell({ noder: [{ x: 0, y: 0, fast: true }, { x: L, y: 0, fast: true }],
                           balkar: [{ a: 0, b: 1, storlek: 3 }] });
    losStatiskt(m, 1, 0);
    const q = p.massa * G;
    const mitt = m.punkter.findIndex(pt => Math.abs(pt.x0 - L / 2) < 1e-9);
    const d = -m.q[2 * mitt + 1], hand = 5 * q * L ** 4 / (384 * mat.E * p.I);
    // Massan (och tyngden) klumpas i noderna: knappt 1,5 % för lite.
    kolla('fritt upplagd balk, nedböjning 5qL⁴/384EI', nara(d, hand, 0.02), pct(d, hand));
    const M = Math.max(...m.element.map(e => Math.abs(e.M1))), Mh = q * L * L / 8;
    kolla('fritt upplagd balk, moment qL²/8', nara(M, Mh, 0.03), pct(M, Mh));
}

// 1b. Samma balk på brolager (fast + glid): ingen normalkraft, M = qL²/8
//     även med 12 m spann och stor nedböjning (ingen linverkan).
{
    const L = 12, p = PROFILER.stal[2];
    const m = byggModell({ noder: [{ x: 0, y: 0, fast: true, lager: 'fast' }, { x: L, y: 0, fast: true, lager: 'glid' }],
                           balkar: [{ a: 0, b: 1, storlek: 2, material: 'stal' }] });
    const ok = losStatiskt(m, 1, 0);
    const q = p.massa * G, M = Math.max(...m.element.map(e => Math.abs(e.M1))), Mh = q * L * L / 8;
    const N = Math.max(...m.element.map(e => Math.abs(e.N)));
    kolla('brolager, moment qL²/8', ok && nara(M, Mh, 0.03), pct(M, Mh));
    kolla('brolager, ingen normalkraft', N < 0.01 * q * L, (N / 1000).toFixed(3) + ' kN');
    const g = m.q[2 * m.nodPunkt[1]];
    kolla('glidlagret rör sig i sidled', Math.abs(g) > 1e-6, (g * 1000).toFixed(2) + ' mm');
}

// 2. Konsol med punktlast: δ = PL³/3EI, M = PL vid infästningen.
{
    const L = 4, P = 2000, p = PROFILER.limtra[1];
    const m = byggModell({ noder: [{ x: 0, y: 0, fast: true, styv: true }, { x: L, y: 0 }],
                           balkar: [{ a: 0, b: 1, storlek: 1 }] });
    m.last[2 * m.nodPunkt[1] + 1] = -P;
    losStatiskt(m, 0, 1);
    const d = -m.q[2 * m.nodPunkt[1] + 1], hand = P * L ** 3 / (3 * mat.E * p.I);
    kolla('konsol, nedböjning PL³/3EI', nara(d, hand, 0.01), pct(d, hand));
    const M = Math.abs(m.element[0].M1);
    kolla('konsol, moment PL', nara(M, P * L, 0.01), pct(M, P * L));
}

// 3. Fackverk (två stänger, ledat): N = P / (2 sin 45°) tryck.
{
    const P = 10000;
    const m = byggModell({ noder: [{ x: 0, y: 0, fast: true }, { x: 4, y: 0, fast: true }, { x: 2, y: 2 }],
                           balkar: [{ a: 0, b: 2, storlek: 3 }, { a: 2, b: 1, storlek: 3 }] });
    m.last[2 * m.nodPunkt[2] + 1] = -P;
    losStatiskt(m, 0, 1);
    const N = m.element[m.balkar[0].element[0]].N, hand = -P / (2 * Math.SQRT1_2);
    kolla('fackverk, normalkraft', nara(N, hand, 0.01), pct(N, hand));
}

// 4. Knäckning: tryck 0,5 · Pcr ger utnyttjandet 0,5 mot knäckning.
{
    const L = 4, p = PROFILER.limtra[1];
    const Pcr = Math.PI ** 2 * mat.E05 * p.I / (L * L);
    const m = byggModell({ noder: [{ x: 0, y: 0, fast: true }, { x: 0, y: L }, { x: 1, y: L, fast: true }],
                           balkar: [{ a: 0, b: 1, storlek: 1 }, { a: 1, b: 2, storlek: 4 }] });
    m.last[2 * m.nodPunkt[1] + 1] = -0.5 * Pcr;
    losStatiskt(m, 0, 1);
    S('utnyttjande')(m);
    kolla('knäckning, N/Pcr', nara(m.balkar[0].uk, 0.5, 0.02), m.balkar[0].uk.toFixed(3));
}

// 5. Dynamik: konsolens egenfrekvens f = 1,875²/(2π) · √(EI/(mL⁴)).
{
    const L = 4, p = PROFILER.limtra[1];
    const m = byggModell({ noder: [{ x: 0, y: 0, fast: true, styv: true }, { x: L, y: 0 }],
                           balkar: [{ a: 0, b: 1, storlek: 1 }] });
    m.massa[2 * m.nodPunkt[1]] -= 20; m.massa[2 * m.nodPunkt[1] + 1] -= 20;   // inget förband i änden
    const spets = 2 * m.nodPunkt[1] + 1;
    m.last[spets] = -500; losStatiskt(m, 0, 1); m.last[spets] = 0; m.tyngd = 0;
    const dt = 1 / 4000, nollor = [];
    let forra = m.q[spets];
    for (let i = 0; i < 4000 && nollor.length < 5; i++) {
        steg(m, dt);
        if (forra < 0 && m.q[spets] >= 0 || forra > 0 && m.q[spets] <= 0) nollor.push(m.t);
        forra = m.q[spets];
    }
    const T = (nollor[4] - nollor[0]) / 2;
    const hand = 2 * Math.PI / (1.8751 ** 2 * Math.sqrt(mat.E * p.I / (p.massa * L ** 4)));
    kolla('konsol, egenperiod', nara(T, hand, 0.03), pct(T, hand));
}

// 6. Stora förskjutningar: konsolen under stor last sjunker mindre än
// den linjära teorin och kortas av i x (geometrisk olinjäritet).
{
    const L = 4, p = PROFILER.limtra[1];
    const m = byggModell({ noder: [{ x: 0, y: 0, fast: true, styv: true }, { x: L, y: 0 }],
                           balkar: [{ a: 0, b: 1, storlek: 1 }] });
    const P = 3 * mat.E * p.I / L ** 2;          // linjärt: δ = L (orimligt)
    m.last[2 * m.nodPunkt[1] + 1] = -P;
    losStatiskt(m, 0, 1, 40);
    const [x, y] = lage(m, m.nodPunkt[1]);
    // Elastica för PL²/EI = 3: δ/L ≈ 0,603, x/L ≈ 0,75 (Bisshopp & Drucker).
    kolla('konsol, stor nedböjning (elastica)', nara(-y / L, 0.603, 0.02) && nara(x / L, 0.75, 0.02),
          'δ/L ' + (-y / L).toFixed(3) + ', x/L ' + (x / L).toFixed(3));
}

require(path.join(__dirname, 'testa_banor.js'))(S, kolla);

console.log(fel ? fel + ' FEL' : 'Allt OK');
process.exit(fel ? 1 : 0);
