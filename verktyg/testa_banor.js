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
        sim = korSim(nyRitning(bana), bana);
        kolla(namn + ': utan bro hamnar keIWs i vattnet', sim.resultat === 'vatten');
        sim = korSim(enBalk(bana, 1), bana);
        kolla(namn + ': en liten balk går av', sim.resultat === 'vatten' && sim.brott > 0,
              sim.resultat + ', brott ' + sim.brott);
        // Träet är för de kortare broarna: inte ens Stor+ räcker rakt över.
        sim = korSim(enBalk(bana, 2.25), bana);
        kolla(namn + ': en balk Stor+ av trä räcker inte rakt', sim.resultat === 'vatten',
              sim.resultat + ', max ' + Math.round(sim.maxU * 100) + ' %');
        // Stål Stor+ räcker rakt över Ån men inte längre.
        sim = korSim(enBalk(bana, 2.25, 'stal'), bana);
        const raktStal = bana.spann <= 24;
        kolla(namn + (raktStal ? ': en stålbalk Stor+ (HEA 260) håller' : ': en stålbalk Stor+ (HEA 260) räcker inte rakt'),
              raktStal ? sim.resultat === 'klarade' && sim.brott === 0 : sim.resultat === 'vatten',
              sim.resultat + ', max ' + Math.round(sim.maxU * 100) + ' %');
        // Glidlagret: en klen balk kan inte hänga som en lina mellan fästena.
        sim = korSim(enBalk(bana, 0, 'stal'), bana);
        kolla(namn + ': en stålbalk Liten (HEA 120) går av, ingen linverkan', sim.resultat === 'vatten' && sim.brott > 0,
              sim.resultat + ', brott ' + sim.brott);
        // Pelarna har glidlager: en klen väg mellan två pelare hänger inte
        // som en lina (Isaks HEA 100 över 24 m höll när pelarna låste x).
        if (bana.pelare) {
            const r = nyRitning(bana), L = bana.spann, xs = [0, L / 4, L / 2, 3 * L / 4, L];
            const nod = x => { let i = r.noder.findIndex(n => n.x === x && n.y === 0); if (i < 0) { r.noder.push({ x, y: 0, fast: false, styv: true }); i = r.noder.length - 1; } return i; };
            xs.forEach(x => nod(x));
            for (const x of [L / 4, 3 * L / 4]) Object.assign(r.noder[nod(x)], { fast: true, styv: false, pelare: true, lager: 'glid' });
            for (let i = 0; i < 4; i++) r.balkar.push({ a: nod(xs[i]), b: nod(xs[i + 1]), storlek: -0.25, vag: true, material: 'stal' });
            const p = korSim(r, bana);
            kolla(namn + ': HEA 100 mellan två pelare går av', p.resultat === 'vatten' && p.brott > 0, p.resultat + ', brott ' + p.brott);
        }
        // Bäcken: en rak balk (skarvad i mitten, 14 m > 12 m) räcker inte,
        // inte ens Stor+; det blir ett fackverk.
        if (bana.namn === 'Bäcken') {
            const rak = st => {
                const r = nyRitning(bana);
                r.noder.push({ x: bana.spann / 2, y: 0, fast: false, styv: true });
                r.balkar.push({ a: 0, b: 2, storlek: st, vag: true, material: 'limtra' }, { a: 2, b: 1, storlek: st, vag: true, material: 'limtra' });
                return r;
            };
            const p = korSim(rak(2.25), bana);
            kolla(namn + ': en rak skarvad balk Stor+ går av', p.resultat === 'vatten', p.resultat);
        }
        const glid = sim.m.punkter.findIndex(p => p.glid), u = sim.m.q[2 * glid];
        kolla(namn + ': glidlagret stannar vid stoppet när bron rasar', glid >= 0 && Math.abs(u) <= 0.3 + 1e-9,
              (u * 1000).toFixed(0) + ' mm');
    });
};
