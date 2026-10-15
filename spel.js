// Provkörningen: bron räknas med fysik.js och keIWs går över. Ingen ritning
// här, så att testerna kan köra samma sak utan webbläsare.
//
// Först räknas bron statiskt under sin egen tyngd (som om den byggts
// färdigt i lugn och ro), sedan går keIWs från vänster klippa. Går det
// inte att räkna statiskt (en mekanism, eller bron håller inte ens sin egen
// tyngd) läggs tyngden på gradvis i stället. keIWs är en rörlig last på vägbanan: tyngden fördelas på
// de två noderna i elementet under fötterna. Finns ingen vägbana under,
// faller keIWs. Hamnar keIWs i vattnet har bron misslyckats, och kommer
// keIWs fram till andra sidan har den klarat sig. På banor med `bil` kör
// keIWs en bil på 2,5 ton: två hjul med halva tyngden var.

const DT = 1 / 120;          // s, ett fysiksteg
const TYNGD_TID = 1.0;       // s, tyngden läggs på under den här tiden (om
                             // bron inte gick att räkna statiskt)
const START_TID = 1.4;       // s, då börjar keIWs gå
const KEIWS_MASSA = 500;     // kg
const BIL_MASSA = 2500;      // kg, bilen med keIWs i
const BIL_AXEL = 2.5;        // m mellan hjulen
const KLIV_UPP = 0.25;       // m, så högt kliver keIWs upp utan att hoppa
const LUFT_TID = 0.15;       // s i luften innan det räknas som att falla
const GLID_MAX = 0.3;        // m, så långt glidlagret kan glida åt varje håll

// keIWs storlek (m, fötter till huvud) beror på banan, så att han syns lika
// bra på långa banor. Vikten är densamma. Startpunkten, målet och farten
// följer storleken (större kliv).
const keiwsHojd = bana => bana.keiws || 2;
const keiwsStart = bana => -1.25 * keiwsHojd(bana);
const keiwsMal = bana => bana.spann + 1.25 * keiwsHojd(bana);
const keiwsFart = bana => 1.8 * keiwsHojd(bana);      // m/s

// Marken: höjden vid x. Utanför spannet är det land (y = 0, eller vatten
// bortom ön). Vattenbanorna har branta kanter (`kant`: m i sidled per m
// ner, rundade överst, ner till `botten` om banan har en), landbanorna en
// mjuk dal (`dal`: {djup, bredd}, där kanten går ner som en cosinusvåg över
// bredden). Banor med `profil` har en ojämn mark ritad punkt för punkt
// (profilY). -Infinity: inget berg.
function markY(bana, x) {
    const L = bana.spann;
    if (bana.ö && x >= L + bana.ö) return -Infinity;
    if (x <= 0 || x >= L) return 0;
    if (bana.profil) return profilY(bana, x);
    const d = Math.min(x, L - x);
    if (bana.dal) {
        const { djup, bredd } = bana.dal;
        return d >= bredd ? -djup : -djup * (1 - Math.cos(Math.PI * d / bredd)) / 2;
    }
    const k = bana.kant || 0;          // rundad över den översta halvmetern
    if (k <= 0) return -Infinity;
    const y = d <= k ? -d * d / (2 * k * k) : -(d - k / 2) / k;
    return bana.botten === undefined ? y : Math.max(y, bana.botten);
}

// Profilen: punkterna [x, y] från vänstra kanten (0, 0) till den högra
// (spann, 0), mjukt emellan (kubisk, monoton mellan punkterna så att inget
// sticker ut, vågrät vid kanterna så att de blir rundade).
function profilY(bana, x) {
    const p = bana.profil, n = p.length;
    if (!bana.profilLutning) {
        const d = p.slice(1).map((q, i) => (q[1] - p[i][1]) / (q[0] - p[i][0]));
        bana.profilLutning = p.map((q, i) => i === 0 || i === n - 1 || d[i - 1] * d[i] <= 0 ? 0
            : 2 / (1 / d[i - 1] + 1 / d[i]));
    }
    const m = bana.profilLutning;
    let i = 0, j = n - 1;
    while (j - i > 1) { const k = (i + j) >> 1; if (p[k][0] <= x) i = k; else j = k; }
    const h = p[j][0] - p[i][0], s = (x - p[i][0]) / h;
    const h00 = (1 + 2 * s) * (1 - s) ** 2, h10 = s * (1 - s) ** 2, h01 = s * s * (3 - 2 * s), h11 = s * s * (s - 1);
    return h00 * p[i][1] + h10 * h * m[i] + h01 * p[j][1] + h11 * h * m[j];
}

// Hur långt in från kanten (den högra med hoger) marken når på djupet t > 0
// (markY baklänges); Infinity under botten.
function kantAvstand(bana, t, hoger = false) {
    if (bana.profil) {
        const L = bana.spann, X = d => hoger ? L - d : d;
        let d = 0;
        while (d < L && markY(bana, X(d)) >= -t) d += 0.05;
        if (d >= L) return Infinity;
        let a = Math.max(0, d - 0.05), b = d;
        for (let k = 0; k < 20; k++) { const c = (a + b) / 2; if (markY(bana, X(c)) >= -t) a = c; else b = c; }
        return b;
    }
    if (bana.dal) {
        const { djup, bredd } = bana.dal;
        return t >= djup ? Infinity : bredd / Math.PI * Math.acos(1 - 2 * t / djup);
    }
    const k = bana.kant || 0;
    if (k <= 0) return 0;
    if (bana.botten !== undefined && t >= -bana.botten) return Infinity;
    return t <= 0.5 ? Math.sqrt(2 * k * k * t) : k * t + k / 2;
}

function nySim(ritning, bana) {
    const m = byggModell(ritning, bana.element);
    const statisk = losStatiskt(m, 1, 0) && spannKablar(m) && staTyngden(m);
    if (!statisk) m.q.fill(0);
    m.v.fill(0);
    m.a.fill(0);
    montera(m, false);
    return {
        bana, m, statisk, t: 0, brott: 0, maxU: 0,
        keiws: { x: keiwsStart(bana), y: 0, vy: 0, lage: 'vantar', luft: 0, gatt: 0 },
        resultat: null,     // 'klarade' eller 'vatten', med tiden i sim.slutTid
        forlopp: []         // brotten i ordning (forloppBild), för att stega igenom efteråt
    };
}

// Klarar bron sin egen tyngd statiskt? Annars (något går av, knäcks eller
// glidlagret glider förbi stoppet, som statiken inte vet om) läggs tyngden
// på gradvis i stället, så att man ser bron sjunka och gå av där den är
// svagast, i stället för att den börjar i ett läge som redan har rasat.
function staTyngden(m) {
    utnyttjande(m);
    return m.element.every(e => e.u <= 1) && m.balkar.every(b => b.uk <= 1)
        && m.punkter.every((p, i) => !p.glid || Math.abs(m.q[2 * i]) <= GLID_MAX);
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
    // Tyngden på vägbanan under x (fördelad på elementets två noder).
    const last = (x, F) => {
        const y = ytaUnder(sim, x, k.y + KLIV_UPP);
        if (!y || !y.e || y.y < k.y - KLIV_UPP) return;
        m.last[2 * y.e.i + 1] -= F * (1 - y.t);
        m.last[2 * y.e.j + 1] -= F * y.t;
    };
    if (yta && yta.y >= ny) {
        k.y = yta.y; k.vy = 0; k.luft = 0;
        if (k.lage === 'faller') k.lage = 'gar';
        if (!sim.bana.bil) last(k.x, KEIWS_MASSA * G);
        else for (const d of [-0.5, 0.5]) last(k.x + d * BIL_AXEL, BIL_MASSA / 2 * G);
    } else {
        k.y = ny;
        k.luft += dt;
        if (k.luft > LUFT_TID) k.lage = 'faller';
    }
    const L = sim.bana.spann;
    if (k.y < sim.bana.vatten || (k.x > 0 && k.x < L && k.y < markY(sim.bana, k.x) - 0.05)) {
        k.lage = 'plask';
        if (!sim.resultat) { sim.resultat = 'vatten'; sim.slutTid = sim.t; }
    } else if (k.x > keiwsMal(sim.bana) && k.lage === 'gar') {
        k.lage = 'klar';
        if (!sim.resultat) { sim.resultat = 'klarade'; sim.slutTid = sim.t; }
    }
}

// Bitar som faller in i marken stannar på ytan (enkelt: noden flyttas ut
// till närmaste yta, uppåt eller i sidled, och tappar farten in i berget).
// Glidlagret har stopp: det rör sig bara några dm (även när bron rasar).
function lagerStopp(sim) {
    const m = sim.m;
    for (let p = 0; p < m.np; p++) {
        if (!m.punkter[p].glid) continue;
        const ix = 2 * p, u = m.q[ix];
        if (Math.abs(u) <= GLID_MAX) continue;
        m.q[ix] = Math.sign(u) * GLID_MAX;
        if (m.v[ix] * u > 0) m.v[ix] = 0;
        m.a[ix] = 0;
    }
}

function berget(sim) {
    const m = sim.m, b = sim.bana, L = b.spann;
    for (let p = 0; p < m.np; p++) {
        if (m.punkter[p].fast) continue;
        const [x, y] = lage(m, p);
        const g = markY(b, x);
        if (y >= g) continue;
        const ix = 2 * p, iy = 2 * p + 1;
        // I sidled: ut till kanten på samma höjd (mot spannets mitt).
        const a = y < 0 ? kantAvstand(b, -y, x > L / 2) : 0, mot = x < L / 2 ? 1 : -1;
        const sida = Math.max(0, x < L / 2 ? a - x : x - (L - a));
        if (g - y <= sida) {
            m.q[iy] += g - y; m.v[iy] = Math.max(0, m.v[iy]); m.a[iy] = 0;
        } else {
            m.q[ix] += mot * sida;
            m.v[ix] = mot > 0 ? Math.max(0, m.v[ix]) : Math.min(0, m.v[ix]); m.a[ix] = 0;
        }
    }
}

// Ett steg i provkörningen.
function simSteg(sim, dt = DT) {
    const s = sim.statisk ? 1 : Math.min(1, sim.t / TYNGD_TID);
    sim.m.tyngd = s * s * (3 - 2 * s);
    keiwsSteg(sim, dt);
    steg(sim.m, dt);
    lagerStopp(sim);
    berget(sim);
    // När keIWs har ramlat i är provet avgjort: inget mer går sönder (bitarna
    // som faller och slår i marken skulle annars smulas sönder i onödan).
    let n = 0;
    if (!sim.resultat) n = brott(sim.m);
    else { montera(sim.m, false); utnyttjande(sim.m); sim.m.brutna = []; }
    sim.brott += n;
    if (n && sim.forlopp.length < FORLOPP_MAX) sim.forlopp.push(forloppBild(sim));
    if (!sim.resultat) for (const e of sim.m.element) if (!e.dod) sim.maxU = Math.max(sim.maxU, e.u, sim.m.balkar[e.balk].uk);
    sim.t += dt;
}

// Ett ögonblick då något gick sönder: vad (m.brutna), tiden, alla lägen,
// utnyttjandet i varje element och balk (de som just gick sönder med sitt
// värde före brottet) och keIWs. Bara de första FORLOPP_MAX.
const FORLOPP_MAX = 40;
function forloppBild(sim) {
    const m = sim.m;
    return {
        t: sim.t, brutna: m.brutna, q: Float64Array.from(m.q),
        dod: Uint8Array.from(m.element, e => e.dod ? 1 : 0),
        u: Float32Array.from(m.element, e => e.u), uk: Float32Array.from(m.balkar, b => b.uk),
        keiws: { x: sim.keiws.x, y: sim.keiws.y, lage: sim.keiws.lage }
    };
}

// Kör en hel provkörning utan att rita (för testerna). Slutar när keIWs
// har klarat sig eller hamnat i vattnet, eller efter maxTid sekunder.
function korSim(ritning, bana, maxTid = 30) {
    const sim = nySim(ritning, bana);
    while (!sim.resultat && sim.t < maxTid) simSteg(sim);
    return sim;
}
