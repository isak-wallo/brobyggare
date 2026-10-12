// Provkör banorna utan webbläsare (anropas från testa_fysik.js):
// den sparade lösningen ska klara sig, en tom bana och en för klen bro ska
// sluta i vattnet, och en rejäl balk ska hålla.
'use strict';
module.exports = function (S, kolla) {
    const BANOR = S('BANOR'), korSim = S('korSim'), nyRitning = S('nyRitning'), losningsRitning = S('losningsRitning');
    const enBalk = (bana, storlek) => {
        const r = nyRitning(bana);
        r.balkar.push({ a: 0, b: 2, storlek, vag: true, material: 'limtra' });
        return r;
    };
    BANOR.forEach((bana, i) => {
        const namn = 'bana ' + (i + 1) + ' (' + bana.namn + ')';
        let t0 = Date.now(), sim = korSim(losningsRitning(bana), bana);
        kolla(namn + ': lösningen håller', sim.resultat === 'klarade' && sim.brott === 0,
              sim.resultat + ', brott ' + sim.brott + ', max ' + Math.round(sim.maxU * 100) + ' %, '
              + (Date.now() - t0) + ' ms för ' + sim.t.toFixed(1) + ' s');
        sim = korSim(nyRitning(bana), bana);
        kolla(namn + ': utan bro hamnar keIWs i vattnet', sim.resultat === 'vatten');
        sim = korSim(enBalk(bana, 1), bana);
        kolla(namn + ': en liten balk går av', sim.resultat === 'vatten' && sim.brott > 0,
              sim.resultat + ', brott ' + sim.brott);
        sim = korSim(enBalk(bana, 4), bana);
        kolla(namn + ': en jättebalk håller', sim.resultat === 'klarade' && sim.brott === 0,
              sim.resultat + ', max ' + Math.round(sim.maxU * 100) + ' %');
    });
};
