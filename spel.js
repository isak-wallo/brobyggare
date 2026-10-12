// Provkörningen: bron räknas med fysik.js och keIWs går över. Ingen ritning
// här, så att testerna kan köra samma sak utan webbläsare.
//
// Först läggs tyngden på gradvis (bron sätter sig), sedan går keIWs från
// vänster klippa. keIWs är en rörlig last på vägbanan: tyngden fördelas på
// de två noderna i elementet under fötterna. Finns ingen vägbana under,
// faller keIWs. Hamnar keIWs i vattnet har bron misslyckats, och kommer
// keIWs fram till andra sidan har den klarat sig.

const DT = 1 / 120;          // s, ett fysiksteg
const TYNGD_TID = 1.0;       // s, tyngden läggs på under den här tiden
const START_TID = 1.4;       // s, då börjar keIWs gå
const KEIWS_MASSA = 100;     // kg
const KLIV_UPP = 0.25;       // m, så högt kliver keIWs upp utan att hoppa
const LUFT_TID = 0.15;       // s i luften innan det räknas som att falla

// keIWs storlek (m, fötter till huvud) beror på banan, så att han syns lika
// bra på långa banor. Vikten är densamma. Startpunkten, målet och farten
// följer storleken (större kliv).
const keiwsHojd = bana => bana.keiws || 2;
const keiwsStart = bana => -1.25 * keiwsHojd(bana);
const keiwsMal = bana => bana.spann + 1.25 * keiwsHojd(bana);
const keiwsFart = bana => 1.44 * keiwsHojd(bana);     // m/s

function nySim(ritning, bana) {
    return {
        bana, m: byggModell(ritning), t: 0, brott: 0, maxU: 0,
        keiws: { x: keiwsStart(bana), y: 0, vy: 0, lage: 'vantar', luft: 0, gatt: 0 },
        resultat: null      // 'klarade' eller 'vatten', med tiden i sim.slutTid
    };
}

// Den högsta vägbanan vid x som ligger högst ymax. Klipporna räknas också
// (y = 0 utanför spannet). Returnerar {y, e, t} eller null.
function ytaUnder(sim, x, ymax) {
    const m = sim.m;
    let bast = null;
    if ((x <= 0 || x >= sim.bana.spann) && ymax >= 0) bast = { y: 0, e: null, t: 0 };
    for (const e of m.element) {
        if (e.dod || !e.vag) continue;
        const [xi, yi] = lage(m, e.i), [xj, yj] = lage(m, e.j);
        if (Math.abs(xj - xi) < 1e-6) continue;
        const t = (x - xi) / (xj - xi);
        if (t < 0 || t > 1) continue;
        const y = yi + t * (yj - yi) + VAG.tjocklek;
        if (y <= ymax && (!bast || y > bast.y)) bast = { y, e, t };
    }
    return bast;
}

// keIWs flyttar sig ett steg och lägger sin tyngd på bron.
function keiwsSteg(sim, dt) {
    const k = sim.keiws, m = sim.m;
    m.last.fill(0);
    if (k.lage === 'vantar') {
        if (sim.t >= START_TID) k.lage = 'gar';
        else return;
    }
    if (k.lage === 'klar' || k.lage === 'plask') return;

    const fart = keiwsFart(sim.bana);
    if (k.lage !== 'faller') { k.x += fart * dt; k.gatt += fart * dt; }
    else k.x += fart * 0.4 * dt;
    k.vy -= G * dt;
    const ny = k.y + k.vy * dt;
    const yta = ytaUnder(sim, k.x, k.y + KLIV_UPP);
    if (yta && yta.y >= ny) {
        k.y = yta.y; k.vy = 0; k.luft = 0;
        if (k.lage === 'faller') k.lage = 'gar';
        if (yta.e) {
            const F = KEIWS_MASSA * G;
            m.last[2 * yta.e.i + 1] -= F * (1 - yta.t);
            m.last[2 * yta.e.j + 1] -= F * yta.t;
        }
    } else {
        k.y = ny;
        k.luft += dt;
        if (k.luft > LUFT_TID) k.lage = 'faller';
    }
    if (k.y < sim.bana.vatten) {
        k.lage = 'plask';
        if (!sim.resultat) { sim.resultat = 'vatten'; sim.slutTid = sim.t; }
    } else if (k.x > keiwsMal(sim.bana) && k.lage === 'gar') {
        k.lage = 'klar';
        if (!sim.resultat) { sim.resultat = 'klarade'; sim.slutTid = sim.t; }
    }
}

// Bitar som faller in i klipporna stannar på ytan (enkelt: noden flyttas
// ut till närmaste yta och tappar farten in i berget).
function berget(sim) {
    const m = sim.m, L = sim.bana.spann;
    for (let p = 0; p < m.np; p++) {
        if (m.punkter[p].fast) continue;
        const [x, y] = lage(m, p);
        if (y >= 0 || (x > 0 && x < L)) continue;
        const ix = 2 * p, iy = 2 * p + 1;
        const tillKant = x <= 0 ? -x : x - L;
        if (-y < tillKant) {
            m.q[iy] -= y; m.v[iy] = Math.max(0, m.v[iy]); m.a[iy] = 0;
        } else {
            m.q[ix] += x <= 0 ? -x : L - x;
            m.v[ix] = x <= 0 ? Math.max(0, m.v[ix]) : Math.min(0, m.v[ix]); m.a[ix] = 0;
        }
    }
}

// Ett steg i provkörningen.
function simSteg(sim, dt = DT) {
    const s = Math.min(1, sim.t / TYNGD_TID);
    sim.m.tyngd = s * s * (3 - 2 * s);
    keiwsSteg(sim, dt);
    steg(sim.m, dt);
    berget(sim);
    sim.brott += brott(sim.m);
    for (const e of sim.m.element) if (!e.dod) sim.maxU = Math.max(sim.maxU, e.u, sim.m.balkar[e.balk].uk);
    sim.t += dt;
}

// Kör en hel provkörning utan att rita (för testerna). Slutar när keIWs
// har klarat sig eller hamnat i vattnet, eller efter maxTid sekunder.
function korSim(ritning, bana, maxTid = 30) {
    const sim = nySim(ritning, bana);
    while (!sim.resultat && sim.t < maxTid) simSteg(sim);
    return sim;
}
