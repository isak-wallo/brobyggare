// Provkör banorna utan webbläsare (anropas från testa_fysik.js):
// den sparade lösningen ska klara sig, en tom bana och en för klen bro ska
// sluta i vattnet, och en rejäl balk (trä eller stål) ska hålla.
'use strict';
module.exports = function (S, kolla) {
    const BANOR = S('BANOR'), korSim = S('korSim'), nyRitning = S('nyRitning'), losningsRitning = S('losningsRitning');
    const ritningensKostnad = S('ritningensKostnad');
    const enBalk = (bana, storlek, material = 'limtra') => {
        const r = nyRitning(bana);
        r.balkar.push({ a: 0, b: bana.fasten.findIndex(f => f[2] === 'glid'), storlek, vag: true, material });
        return r;
    };
    BANOR.forEach((bana, i) => {
        const namn = 'bana ' + (i + 1) + ' (' + bana.namn + ')';
        let t0 = Date.now(), sim = korSim(losningsRitning(bana), bana);
        kolla(namn + ': lösningen håller', sim.resultat === 'klarade' && sim.brott === 0,
              sim.resultat + ', brott ' + sim.brott + ', max ' + Math.round(sim.maxU * 100) + ' %, '
              + (Date.now() - t0) + ' ms för ' + sim.t.toFixed(1) + ' s');
        const k = ritningensKostnad(losningsRitning(bana), bana);
        kolla(namn + ': lösningen ryms i budgeten', k <= bana.budget, k + ' av ' + bana.budget + ' $$');
        // Träet i lösningarna finns att välja på banan (och är inte för slankt).
        const bredder = bana.tra ? bana.tra.bredd : TRA_BREDD, hojder = bana.tra ? bana.tra.hojd : TRA_HOJD;
        const fel = [bana.losning, ...Object.values(bana.facit || {})].flatMap(l => l.balkar)
            .filter(b => (b[4] || 'limtra') === 'limtra' && /×/.test(b[2])).map(b => b[2]).filter(st => {
                const [bb, h] = st.split('×').map(Number);
                return !bredder.includes(bb) || !hojder.includes(h) || traMatt(bb, h, false) !== st;
            });
        kolla(namn + ': träet i lösningarna finns på banan', fel.length === 0, fel.join(', '));
        // Facit: två möjliga lösningar som håller. Den enkla (en för grov
        // balk) går över budget, den kostnadseffektiva ryms men är inte bäst.
        if (bana.facit) {
            const pris = {};
            for (const sort of ['enkel', 'effektiv']) {
                const r = losningsRitning(bana, bana.facit[sort]), f = korSim(r, bana);
                pris[sort] = ritningensKostnad(r, bana);
                kolla(namn + ': facit ' + sort + ' håller', f.resultat === 'klarade' && f.brott === 0,
                      f.resultat + ', max ' + Math.round(f.maxU * 100) + ' %, ' + pris[sort] + ' $$');
            }
            kolla(namn + ': facit enkel går över budget, den kostnadseffektiva ryms men är dyrare än lösningen',
                  pris.enkel > bana.budget && pris.effektiv <= bana.budget && pris.effektiv > k,
                  pris.enkel + ', ' + pris.effektiv + ', lösningen ' + k + ' av ' + bana.budget);
        }
        sim = korSim(nyRitning(bana), bana);
        kolla(namn + ': utan bro hamnar keIWs i vattnet', sim.resultat === 'vatten');
        sim = korSim(enBalk(bana, 1), bana);         // 56×215
        kolla(namn + ': en liten balk går av', sim.resultat === 'vatten' && sim.brott > 0,
              sim.resultat + ', brott ' + sim.brott);
        // Träet är för de kortare broarna: inte ens den största räcker rakt över.
        sim = korSim(enBalk(bana, 5), bana);
        kolla(namn + ': den största träbalken räcker inte rakt', sim.resultat === 'vatten',
              sim.resultat + ', max ' + Math.round(sim.maxU * 100) + ' %');
        // Det största stålet i stegen räcker rakt över Bäcken (men går över
        // budget), inte längre.
        sim = korSim(enBalk(bana, 5, 'stal'), bana);
        const raktStal = bana.spann <= 14;
        kolla(namn + (raktStal ? ': en stålbalk HEA 200 håller' : ': en stålbalk HEA 200 räcker inte rakt'),
              raktStal ? sim.resultat === 'klarade' && sim.brott === 0 : sim.resultat === 'vatten',
              sim.resultat + ', max ' + Math.round(sim.maxU * 100) + ' %');
        // Glidlagret: en klen balk kan inte hänga som en lina mellan fästena.
        sim = korSim(enBalk(bana, 2, 'stal'), bana);
        kolla(namn + ': en stålbalk HEA 100 går av, ingen linverkan', sim.resultat === 'vatten' && sim.brott > 0,
              sim.resultat + ', brott ' + sim.brott);
        // Pelarna har glidlager: en klen väg mellan två pelare hänger inte
        // som en lina (Isaks HEA 100 över 24 m höll när pelarna låste x).
        if (bana.pelare) {
            const r = nyRitning(bana), L = bana.spann, xs = [0, L / 4, L / 2, 3 * L / 4, L];
            const nod = x => { let i = r.noder.findIndex(n => n.x === x && n.y === 0); if (i < 0) { r.noder.push({ x, y: 0, fast: false, styv: true }); i = r.noder.length - 1; } return i; };
            xs.forEach(x => nod(x));
            for (const x of [L / 4, 3 * L / 4]) Object.assign(r.noder[nod(x)], { fast: true, styv: false, pelare: true, lager: 'glid' });
            for (let i = 0; i < 4; i++) r.balkar.push({ a: nod(xs[i]), b: nod(xs[i + 1]), storlek: 2, vag: true, material: 'stal' });
            const p = korSim(r, bana);
            kolla(namn + ': HEA 100 mellan två pelare går av', p.resultat === 'vatten' && p.brott > 0, p.resultat + ', brott ' + p.brott);
        }
        // Bäcken: en rak balk (skarvad i mitten, 14 m > 12 m) måste vara av
        // grovt trä (90×450) eller stål (HEA 200, över budget); fackverket
        // är billigast.
        if (bana.namn === 'Bäcken') {
            const rak = (st, material) => {
                const r = nyRitning(bana);
                r.noder.push({ x: bana.spann / 2, y: 0, fast: false, styv: true });
                r.balkar.push({ a: 0, b: 2, storlek: st, vag: true, material }, { a: 2, b: 1, storlek: st, vag: true, material });
                return r;
            };
            const t = korSim(rak('90×405', 'limtra'), bana), u = korSim(rak('90×450', 'limtra'), bana);
            const p = korSim(rak(4, 'stal'), bana), q = korSim(rak(5, 'stal'), bana);
            const ku = ritningensKostnad(rak('90×450', 'limtra'), bana), kq = ritningensKostnad(rak(5, 'stal'), bana);
            const kf = ritningensKostnad(losningsRitning(bana), bana);
            kolla(namn + ': en rak skarvad balk: 90×405 går av, 90×450 håller men kostar mer än fackverket',
                  t.resultat === 'vatten' && u.resultat === 'klarade' && u.brott === 0 && ku > kf,
                  '90×405 ' + t.resultat + ', 90×450 ' + u.resultat + ' för ' + ku + ' $$, fackverket ' + kf + ' $$');
            kolla(namn + ': en rak skarvad balk: HEA 160 går av, HEA 200 håller men går över budget',
                  p.resultat === 'vatten' && q.resultat === 'klarade' && q.brott === 0 && kq > bana.budget,
                  'HEA 160 ' + p.resultat + ', HEA 200 ' + q.resultat + ' för ' + kq + ' $$');
        }
        const glid = sim.m.punkter.findIndex(p => p.glid), u = sim.m.q[2 * glid];
        kolla(namn + ': glidlagret stannar vid stoppet när bron rasar', glid >= 0 && Math.abs(u) <= 0.3 + 1e-9,
              (u * 1000).toFixed(0) + ' mm');
    });
};
