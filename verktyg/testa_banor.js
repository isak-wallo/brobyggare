// Provkör banorna utan webbläsare (anropas från testa_fysik.js):
// den sparade lösningen ska klara sig, en tom bana och en för klen bro ska
// sluta i vattnet, och en rejäl balk (trä eller stål) ska hålla.
'use strict';
module.exports = function (S, kolla) {
    const BANOR = S('BANOR'), korSim = S('korSim'), nyRitning = S('nyRitning'), losningsRitning = S('losningsRitning');
    const ritningensKostnad = S('ritningensKostnad');
    const enBalk = (bana, storlek, material = 'limtra') => {
        const r = nyRitning(bana);
        r.balkar.push({ a: 0, b: 2, storlek, vag: true, material });
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
        // En rak träbalk räcker bara över det korta spannet.
        sim = korSim(enBalk(bana, 4), bana);
        const raktTra = bana.spann <= 12;
        kolla(namn + (raktTra ? ': en jättebalk av trä håller' : ': en jättebalk av trä räcker inte rakt'),
              raktTra ? sim.resultat === 'klarade' && sim.brott === 0 : sim.resultat === 'vatten',
              sim.resultat + ', max ' + Math.round(sim.maxU * 100) + ' %');
        // Stål Stor räcker rakt över Ån men inte längre.
        sim = korSim(enBalk(bana, 3, 'stal'), bana);
        const raktStal = bana.spann <= 24;
        kolla(namn + (raktStal ? ': en stålbalk Stor (HEA 300) håller' : ': en stålbalk Stor (HEA 300) räcker inte rakt'),
              raktStal ? sim.resultat === 'klarade' && sim.brott === 0 : sim.resultat === 'vatten',
              sim.resultat + ', max ' + Math.round(sim.maxU * 100) + ' %');
        // Glidlagret: en klen balk kan inte hänga som en lina mellan fästena.
        sim = korSim(enBalk(bana, 0, 'stal'), bana);
        kolla(namn + ': en stålbalk Pytte (HEA 120) går av, ingen linverkan', sim.resultat === 'vatten' && sim.brott > 0,
              sim.resultat + ', brott ' + sim.brott);
        const glid = sim.m.punkter.findIndex(p => p.glid), u = sim.m.q[2 * glid];
        kolla(namn + ': glidlagret stannar vid stoppet när bron rasar', glid >= 0 && Math.abs(u) <= 0.3 + 1e-9,
              (u * 1000).toFixed(0) + ' mm');
    });
};
