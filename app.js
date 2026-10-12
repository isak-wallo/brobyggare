'use strict';
// Brobyggare: bygg en bro, tryck Kör och se om keIWs kommer över.
//
// Lägen: 'bygg' (dra balkar mellan rutnätspunkter) och 'prov' (fysiken
// räknar, keIWs går). Provkörningen börjar med att keIWs bygger bron som en
// virvelvind (bara animering, ingen fysik), sedan går han över. Spelytan anpassar sig efter skärmen: verktygen ligger
// längst ner när mobilen står och på sidan när den ligger, och kameran
// visar hela banan (bana.vy) från början. Två fingrar (eller mushjulet)
// zoomar och flyttar vyn.

const TEST = new URLSearchParams(location.search).has('test');
const RUTNAT = 1;            // m mellan punkterna man bygger på
const MAX_LANGD = 12;        // m, längsta balken
const MAX_STEG = 8;          // fysiksteg per bildruta (annars går det långsamt)
const MAX_ZOOM = 6;
const BYGG_PER_BALK = 0.2;   // s per balk när keIWs bygger ...
const BYGG_MIN = 1.0;        // ... men hela bygget tar minst ...
const BYGG_MAX = 3.0;        // ... och högst så här länge (s)
const BYGG_HEM = 0.35;       // s, tillbaka till startplatsen efteråt
const POFF_TID = 0.35;       // s, dammet när virveln blir keIWs igen
const SPARA = 'brobyggare-ritning-';   // + banans nummer
const SPARA_BANA = 'brobyggare-bana';
const SPARA_BASTA = 'brobyggare-basta-';  // + banans nummer: billigaste bron som höll
const SPARA_HISTORIK = 'brobyggare-historik';  // ångra-listan över en omladdning
const UPPDATERA_VAR = 10 * 60 * 1000;     // ms, leta efter en ny version

const FARG = {
    himmel: ['#9fcbe0', '#d8ecf2'], berg: '#8b7a66', bergMork: '#6f604f', gras: '#7cae5c',
    vatten: 'rgba(63, 120, 160, 0.82)', vag: '#5d6670', tra: '#c9975b', traMork: '#8a6438',
    nod: '#2f3f4c', punkt: 'rgba(47, 63, 76, 0.28)', fel: '#d0503c', text: '#2f3f4c'
};

const duk = document.getElementById('duk');
const ctx = duk.getContext('2d');
const scen = document.getElementById('scen');
const infoEl = document.getElementById('info');
const rutaEl = document.getElementById('ruta');
const menyEl = document.getElementById('meny');
const versionEl = document.getElementById('version');
const knappar = Object.fromEntries([...document.querySelectorAll('#verktyg button')].map(b => [b.dataset.v, b]));

let banaNr = lasBanaNr();
let bana = BANOR[banaNr];
let ritning = lasRitning();
let historik = [];
let verktyg = 'vag';
let ritverktyg = 'vag';       // senaste av Väg/Balk, dit Flytta och Riv går tillbaka
let storlek = 2;              // Mellan
let lageNu = 'bygg';
let sim = null;
let drag = null;              // {fran: [x, y], till: [x, y]} medan man drar
let vald = -1;                // vald balk (verktyget Flytta)
let flytt = null;             // {balk, ande} eller {nod}, och {till: [x, y]}
let kam = { sk: 30, ox: 0, oy: 0 };
let bas = null;               // kameran utan zoom: {sk, cx, cy, B} (B = det som syns)
let zoom = 1, mitt = null;    // användarens zoom och vyns mitt [x, y] i meter
let dpr = 1;
let version = '';             // appens version (service workerns cache), visas litet
let laddaOmSen = false;       // ny version finns: ladda om när det passar

// ---------- Ritningen (det man bygger) ----------

// Varje bana har sin egen sparade ritning, och spelet minns vilken bana
// man var på.
function lasBanaNr() {
    let nr = 0;
    try { nr = parseInt(localStorage.getItem(SPARA_BANA), 10) || 0; } catch (e) { /* privat läge */ }
    return Math.max(0, Math.min(BANOR.length - 1, nr));
}

// Ritningar från när det fanns tre storlekar (utan version) får de nya
// numren, så att balkarna behåller sina mått.
function uppgradera(r) {
    if (!r.version) {
        for (const b of r.balkar) b.storlek = [1, 3, 4][b.storlek] ?? 2;
        r.version = 2;
    }
    return r;
}

function lasRitning() {
    try {
        const r = JSON.parse(localStorage.getItem(SPARA + banaNr));
        if (r && r.noder && r.balkar) return uppgradera(r);
    } catch (e) { /* ingen sparad */ }
    return nyRitning(bana);
}

function sparaRitning() {
    try { localStorage.setItem(SPARA + banaNr, JSON.stringify(ritning)); } catch (e) { /* privat läge */ }
}

// Billigaste bron som höll på en bana: {kostnad, ritning}.
function lasBasta(nr) {
    try {
        const b = JSON.parse(localStorage.getItem(SPARA_BASTA + nr));
        if (b) uppgradera(b.ritning);
        return b;
    } catch (e) { return null; }
}

function sparaBasta(k) {
    const b = lasBasta(banaNr);
    if (b && b.kostnad <= k) return false;
    try {
        localStorage.setItem(SPARA_BASTA + banaNr, JSON.stringify({ kostnad: k, ritning }));
    } catch (e) { /* privat läge */ }
    return true;
}

function bytBana(nr) {
    if (lageNu !== 'bygg' || nr < 0 || nr >= BANOR.length) return;
    banaNr = nr;
    bana = BANOR[nr];
    ritning = lasRitning();
    historik = [];
    drag = flytt = null;
    vald = -1;
    zoom = 1;
    mitt = null;
    try { localStorage.setItem(SPARA_BANA, nr); } catch (e) { /* privat läge */ }
    anpassa();
    uppdateraInfo();
    laddaOmOmLugnt();
}

function andra(f) {
    historik.push(JSON.stringify(ritning));
    if (historik.length > 100) historik.shift();
    f();
    sparaRitning();
    uppdateraInfo();
}

function nodVid(x, y) {
    return ritning.noder.findIndex(n => Math.abs(n.x - x) < 1e-6 && Math.abs(n.y - y) < 1e-6);
}

// Får man sätta en knutpunkt här? Fästpunkterna, luften över spannet och
// luften rakt ovanför klippkanterna.
function tillaten(x, y) {
    const o = bana.omrade;
    if (bana.fasten.some(([fx, fy]) => fx === x && fy === y)) return true;
    if (y < o.y0 || y > o.y1 || x < o.x0 || x > o.x1) return false;
    if (x === o.x0 || x === o.x1) return y > 0;
    return true;
}

// Närmaste tillåtna rutnätspunkt, eller null.
function snappa(wx, wy) {
    const x = Math.round(wx / RUTNAT) * RUTNAT, y = Math.round(wy / RUTNAT) * RUTNAT;
    return tillaten(x, y) ? [x, y] : null;
}

function laggTillBalk(p, q) {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 1e-6 || L > MAX_LANGD + 1e-6) return false;
    andra(() => {
        const idx = ([x, y]) => {
            let i = nodVid(x, y);
            if (i < 0) { ritning.noder.push({ x, y, fast: false, styv: true }); i = ritning.noder.length - 1; }
            return i;
        };
        const a = idx(p), b = idx(q);
        const fanns = ritning.balkar.findIndex(k => (k.a === a && k.b === b) || (k.a === b && k.b === a));
        const balk = { a, b, storlek, vag: verktyg === 'vag', material: 'limtra' };
        if (fanns >= 0) ritning.balkar[fanns] = balk;
        else ritning.balkar.push(balk);
    });
    return true;
}

// Tar bort balken och de knutpunkter som inte längre sitter i något.
function rivBalk(i) {
    andra(() => {
        ritning.balkar.splice(i, 1);
        stada();
    });
    vald = -1;
}

// Tar bort balkar som blivit noll långa eller dubbla, och knutpunkter som
// inte sitter i någon balk (fästpunkterna blir kvar).
function stada() {
    const sedda = new Set();
    ritning.balkar = ritning.balkar.filter(b => {
        const nyckel = Math.min(b.a, b.b) + '-' + Math.max(b.a, b.b);
        if (b.a === b.b || sedda.has(nyckel)) return false;
        sedda.add(nyckel);
        return true;
    });
    const anvand = new Set();
    ritning.balkar.forEach(b => { anvand.add(b.a); anvand.add(b.b); });
    const nytt = [];
    let n = 0;
    ritning.noder = ritning.noder.filter((nod, j) => {
        const kvar = nod.fast || anvand.has(j);
        if (kvar) nytt[j] = n++;
        return kvar;
    });
    ritning.balkar.forEach(b => { b.a = nytt[b.a]; b.b = nytt[b.b]; });
}

const langd = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);

// Flyttar ena änden (ande = 'a' eller 'b') av balk i till punkten p. Bara den
// balken flyttas, de andra som satt i samma knutpunkt blir kvar.
function flyttaAnde(i, ande, [x, y]) {
    const b = ritning.balkar[i], annan = ritning.noder[ande === 'a' ? b.b : b.a];
    const L = Math.hypot(x - annan.x, y - annan.y);
    if (L < 1e-6 || L > MAX_LANGD + 1e-6) return false;
    andra(() => {
        let t = nodVid(x, y);
        if (t < 0) { ritning.noder.push({ x, y, fast: false, styv: true }); t = ritning.noder.length - 1; }
        b[ande] = t;
        stada();
    });
    vald = ritning.balkar.indexOf(b);
    return true;
}

// Flyttar en knutpunkt med alla balkar som sitter i den. Hamnar den på en
// annan knutpunkt slås de ihop.
function flyttaNod(i, [x, y]) {
    const nod = ritning.noder[i];
    if (nod.fast) return false;
    const t = nodVid(x, y);
    if (t === i) return false;
    for (const b of ritning.balkar) {
        if (b.a !== i && b.b !== i) continue;
        if (langd({ x, y }, ritning.noder[b.a === i ? b.b : b.a]) > MAX_LANGD + 1e-6) return false;
    }
    const valdBalk = ritning.balkar[vald];
    andra(() => {
        if (t < 0) { nod.x = x; nod.y = y; return; }
        for (const b of ritning.balkar) { if (b.a === i) b.a = t; if (b.b === i) b.b = t; }
        stada();
    });
    vald = ritning.balkar.indexOf(valdBalk);
    return true;
}

function vaxlaForband(i) {
    andra(() => { ritning.noder[i].styv = !ritning.noder[i].styv; });
}

function kostnad() {
    let k = 0;
    for (const b of ritning.balkar) {
        const na = ritning.noder[b.a], nb = ritning.noder[b.b];
        const L = Math.hypot(nb.x - na.x, nb.y - na.y);
        k += L * (PROFILER[b.material || 'limtra'][b.storlek].pris + (b.vag ? VAG.pris : 0));
    }
    for (const n of ritning.noder) if (!n.fast) k += FORBAND.pris[n.styv ? 'styvt' : 'ledat'];
    return Math.round(k / 10) * 10;
}

// Spelets pengar: $$ (påhittad valuta).
const kr = v => v.toLocaleString('sv-SE') + ' $$';

// ---------- Skärmen ----------

const infoLuft = () => infoEl.offsetTop + infoEl.offsetHeight + 4;
let luftNu = 0;

function anpassa() {
    luftNu = infoLuft();
    dpr = window.devicePixelRatio || 1;
    const w = scen.clientWidth, h = scen.clientHeight;
    duk.width = Math.round(w * dpr);
    duk.height = Math.round(h * dpr);
    duk.style.width = w + 'px';
    duk.style.height = h + 'px';
    // Luft för infotexten upptill. Hela bana.vy ska synas, och blir det
    // höjd över (mobilen står) går det mesta till himlen.
    const vy = bana.vy, luft = luftNu;
    const sk = Math.min(w / (vy.x1 - vy.x0), (h - luft) / (vy.y1 - vy.y0));
    const over = h - luft - sk * (vy.y1 - vy.y0);
    const oy = luft + over * 0.7 + sk * vy.y1, cy = (oy - (luft + h) / 2) / sk;
    const cx = (vy.x0 + vy.x1) / 2;
    const hw = w / 2 / sk, hh = (h - luft) / 2 / sk;
    bas = { sk, cx, cy, B: { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh } };
    sattKamera();
}

// Kameran från zoom och mitt. Vyn hålls inom det som syns utan zoom.
function sattKamera() {
    const w = scen.clientWidth, h = scen.clientHeight, luft = luftNu;
    zoom = Math.max(1, Math.min(MAX_ZOOM, zoom));
    const sk = bas.sk * zoom, hw = w / 2 / sk, hh = (h - luft) / 2 / sk, B = bas.B;
    let [cx, cy] = mitt || [bas.cx, bas.cy];
    cx = Math.max(B.x0 + hw, Math.min(B.x1 - hw, cx));
    cy = Math.max(B.y0 + hh, Math.min(B.y1 - hh, cy));
    mitt = zoom > 1 ? [cx, cy] : null;
    kam = { sk, ox: w / 2 - cx * sk, oy: (luft + h) / 2 + cy * sk };
}

// Zoomar (faktor f) så att världspunkten `varld` (annars den som ligger
// under skärmpunkten) hamnar i skärmpunkten (px, py).
function zoomaKring(f, px, py, varld) {
    const [wx, wy] = varld || [(px - kam.ox) / kam.sk, (kam.oy - py) / kam.sk];
    zoom = Math.max(1, Math.min(MAX_ZOOM, zoom * f));
    const sk = bas.sk * zoom, w = scen.clientWidth, h = scen.clientHeight;
    mitt = [wx - (px - w / 2) / sk, wy + (py - (luftNu + h) / 2) / sk];
    sattKamera();
}

const sx = x => kam.ox + x * kam.sk;
const sy = y => kam.oy - y * kam.sk;
const iDuken = e => {
    const r = duk.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
};
const tillVarld = e => {
    const [px, py] = iDuken(e);
    return [(px - kam.ox) / kam.sk, (kam.oy - py) / kam.sk];
};

function ritaBakgrund() {
    const w = duk.width / dpr, h = duk.height / dpr;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, FARG.himmel[0]);
    g.addColorStop(1, FARG.himmel[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Klipporna: vänster om x = 0 och höger om spannet, ner under botten.
    const botten = sy(bana.vatten - 50);
    for (const [x0, x1] of [[-1000, 0], [bana.spann, 1000]]) {
        ctx.fillStyle = FARG.berg;
        ctx.fillRect(sx(x0), sy(0), sx(x1) - sx(x0), botten - sy(0));
        ctx.fillStyle = FARG.gras;
        ctx.fillRect(sx(x0), sy(0) - 0.12 * kam.sk, sx(x1) - sx(x0), 0.25 * kam.sk);
    }
    // Lite skugga i bergväggarna.
    ctx.fillStyle = FARG.bergMork;
    ctx.fillRect(sx(-0.25), sy(-0.15), 0.25 * kam.sk, botten);
    ctx.fillRect(sx(bana.spann), sy(-0.15), 0.25 * kam.sk, botten);
}

function ritaVatten(t) {
    const w = duk.width / dpr, h = duk.height / dpr;
    const y0 = sy(bana.vatten);
    ctx.fillStyle = FARG.vatten;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) {
        ctx.lineTo(x, y0 + Math.sin(x * 0.05 + t * 1.5) * 0.06 * kam.sk);
    }
    ctx.lineTo(w, h);
    ctx.fill();
}

// Utnyttjandegraden som färg: grön → gul → röd.
function utnyttjandeFarg(u) {
    u = Math.max(0, Math.min(1, u));
    const gron = [92, 178, 96], gul = [236, 196, 64], rod = [214, 70, 52];
    const [a, b, t] = u < 0.6 ? [gron, gul, u / 0.6] : [gul, rod, (u - 0.6) / 0.4];
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
}

// En balkbit från (x1, y1) till (x2, y2): tjocklek efter profilens höjd.
// Utan kant: bara fyllningen, med raka ändar (elementen i provkörningen).
function ritaBit(x1, y1, x2, y2, prof, vag, farg, kant) {
    const bredd = Math.max(3, prof.h * kam.sk);
    ctx.beginPath(); ctx.moveTo(sx(x1), sy(y1)); ctx.lineTo(sx(x2), sy(y2));
    if (kant) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = kant;
        ctx.lineWidth = bredd + 2;
        ctx.stroke();
    } else {
        ctx.lineCap = 'butt';
    }
    ctx.strokeStyle = farg;
    ctx.lineWidth = bredd;
    ctx.stroke();
    if (vag) {
        // Vägbanan ovanpå, förskjuten uppåt vinkelrätt mot balken.
        const L = Math.hypot(x2 - x1, y2 - y1) || 1;
        let nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
        if (ny < 0) { nx = -nx; ny = -ny; }
        const d = (prof.h / 2 + VAG.tjocklek / 2) * kam.sk;
        ctx.strokeStyle = FARG.vag;
        ctx.lineWidth = Math.max(2.5, VAG.tjocklek * kam.sk);
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(sx(x1) + nx * d, sy(y1) - ny * d);
        ctx.lineTo(sx(x2) + nx * d, sy(y2) - ny * d);
        ctx.stroke();
    }
}

function ritaNod(x, y, fast, styv) {
    const r = Math.max(3.5, 0.13 * kam.sk);
    ctx.fillStyle = FARG.nod;
    if (fast) {
        // Fästpunkt: en kloss i berget.
        ctx.fillRect(sx(x) - r * 1.6, sy(y) - r * 1.6, r * 3.2, r * 3.2);
        ctx.fillStyle = styv ? FARG.nod : '#e8ecef';
        ctx.beginPath(); ctx.arc(sx(x), sy(y), r * 0.8, 0, 7); ctx.fill();
        return;
    }
    if (styv) {
        ctx.fillRect(sx(x) - r, sy(y) - r, 2 * r, 2 * r);
    } else {
        ctx.beginPath(); ctx.arc(sx(x), sy(y), r * 1.15, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8ecef';
        ctx.beginPath(); ctx.arc(sx(x), sy(y), r * 0.55, 0, 7); ctx.fill();
    }
}

function ritaBygg() {
    // Punkterna man kan bygga på.
    const o = bana.omrade, r = Math.max(1.5, 0.05 * kam.sk);
    ctx.fillStyle = FARG.punkt;
    for (let x = o.x0; x <= o.x1; x += RUTNAT) {
        for (let y = o.y0; y <= o.y1; y += RUTNAT) {
            if (tillaten(x, y)) { ctx.beginPath(); ctx.arc(sx(x), sy(y), r, 0, 7); ctx.fill(); }
        }
    }
    for (const b of ritning.balkar) {
        const na = ritning.noder[b.a], nb = ritning.noder[b.b];
        ritaBit(na.x, na.y, nb.x, nb.y, PROFILER[b.material || 'limtra'][b.storlek], b.vag, FARG.tra, FARG.traMork);
    }
    for (const n of ritning.noder) ritaNod(n.x, n.y, n.fast, n.styv);
    ritaVald();
    if (drag && (drag.till[0] !== drag.fran[0] || drag.till[1] !== drag.fran[1])) {
        const [x1, y1] = drag.fran, [x2, y2] = drag.till;
        const ok = Math.hypot(x2 - x1, y2 - y1) <= MAX_LANGD + 1e-6;
        ctx.globalAlpha = 0.6;
        ritaBit(x1, y1, x2, y2, PROFILER.limtra[storlek], verktyg === 'vag', ok ? FARG.tra : FARG.fel, ok ? FARG.traMork : FARG.fel);
        ctx.globalAlpha = 1;
        if (!ok) {
            ctx.fillStyle = FARG.fel;
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Längst ' + MAX_LANGD + ' m', sx((x1 + x2) / 2), sy((y1 + y2) / 2) - 12);
        }
    }
}

// Verktyget Flytta: den valda balken lyses upp och får handtag i ändarna.
// Medan man drar visas var balkarna hamnar.
function ritaVald() {
    const linje = (p, q) => {
        ctx.beginPath(); ctx.moveTo(sx(p.x), sy(p.y)); ctx.lineTo(sx(q.x), sy(q.y)); ctx.stroke();
    };
    ctx.lineCap = 'round';
    if (vald >= 0 && ritning.balkar[vald]) {
        const b = ritning.balkar[vald], na = ritning.noder[b.a], nb = ritning.noder[b.b];
        ctx.strokeStyle = 'rgba(61, 139, 253, 0.45)';
        ctx.lineWidth = Math.max(3, PROFILER.limtra[b.storlek].h * kam.sk) + 10;
        linje(na, nb);
        const r = Math.max(9, 0.3 * kam.sk);
        for (const n of [na, nb]) {
            ctx.fillStyle = 'rgba(61, 139, 253, 0.35)';
            ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.fill();
            ctx.strokeStyle = '#3d8bfd'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.stroke();
        }
    }
    if (!flytt) return;
    const till = { x: flytt.till[0], y: flytt.till[1] };
    const andar = [];
    if (flytt.nod !== undefined) {
        for (const b of ritning.balkar) {
            if (b.a === flytt.nod) andar.push(ritning.noder[b.b]);
            else if (b.b === flytt.nod) andar.push(ritning.noder[b.a]);
        }
    } else {
        const b = ritning.balkar[flytt.balk];
        andar.push(ritning.noder[flytt.ande === 'a' ? b.b : b.a]);
    }
    const ok = andar.every(n => langd(n, till) <= MAX_LANGD + 1e-6);
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = ok ? '#3d8bfd' : FARG.fel;
    ctx.lineWidth = 3;
    for (const n of andar) linje(n, till);
    ctx.setLineDash([]);
    ctx.fillStyle = ok ? '#3d8bfd' : FARG.fel;
    ctx.beginPath(); ctx.arc(sx(till.x), sy(till.y), Math.max(5, 0.15 * kam.sk), 0, 7); ctx.fill();
}

// Medan keIWs bygger: de färdiga balkarna, och den som växer fram.
function ritaBygget() {
    const lage = byggLage(sim.bygge);
    ritning.balkar.forEach((b, i) => {
        if (!sim.bygge.klara.has(i)) return;
        const na = ritning.noder[b.a], nb = ritning.noder[b.b];
        ritaBit(na.x, na.y, nb.x, nb.y, PROFILER.limtra[b.storlek], b.vag, FARG.tra, FARG.traMork);
    });
    if (lage.vaxer) {
        const b = ritning.balkar[lage.vaxer.balk], [x1, y1] = lage.vaxer.fran;
        ritaBit(x1, y1, x1 + (lage.x - x1), y1 + (lage.y - y1), PROFILER.limtra[b.storlek], b.vag, FARG.tra, FARG.traMork);
    }
    ritning.noder.forEach(n => {
        if (n.fast || ritning.balkar.some((b, i) => sim.bygge.klara.has(i) && (ritning.noder[b.a] === n || ritning.noder[b.b] === n))) {
            ritaNod(n.x, n.y, n.fast, n.styv);
        }
    });
}

// keIWs som virvelvind: en snurrande tratt i keIWs färger, med ögon som
// skymtar fram, och damm som virvlar runt nertill.
function ritaVirvel(x, y, t) {
    const H = keiwsBild() * 1.3, s = kam.sk;
    const cx = sx(x), botten = sy(y) + 0.25 * H * s;
    const farger = [FIG.farger.bla, FIG.farger.mellan, FIG.farger.ljus, FIG.farger.mork];
    const lager = 9;
    for (let k = 0; k < lager; k++) {
        const f = k / (lager - 1);
        const ry = botten - f * H * s;
        const rx = (0.12 + 0.42 * f * f) * H * s;
        const svaj = Math.sin(t * 17 + k * 0.9) * 0.07 * H * s;
        ctx.fillStyle = farger[(k + Math.floor(t * 24)) % farger.length];
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(cx + svaj, ry, rx, Math.max(2, 0.07 * H * s), 0, 0, 7);
        ctx.fill();
        // Vita fartstreck runt tratten.
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = Math.max(1, 0.012 * H * s);
        const v = t * 22 + k * 1.7;
        ctx.beginPath();
        ctx.ellipse(cx + svaj, ry, rx * 1.15, Math.max(2, 0.09 * H * s), 0, v % 6.28, v % 6.28 + 1.4);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Ögonen skymtar fram ibland.
    if (Math.sin(t * 9) > 0.2) {
        const oy = botten - 0.62 * H * s, d = 0.09 * H * s, e = 0.07 * H * s;
        const dx = Math.sin(t * 17 + 5) * 0.07 * H * s;
        ctx.fillStyle = FIG.farger.oga;
        ctx.fillRect(cx + dx - d - e / 2, oy, e, e);
        ctx.fillRect(cx + dx + d - e / 2, oy, e, e);
    }
    // Damm.
    ctx.fillStyle = 'rgba(170, 160, 145, 0.75)';
    for (let k = 0; k < 7; k++) {
        const v = t * 11 + k * 0.9;
        const r = (0.3 + 0.08 * Math.sin(k * 3.1 + t * 5)) * H * s;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(v) * r, botten + Math.sin(v) * 0.08 * H * s, Math.max(2, 0.04 * H * s), 0, 7);
        ctx.fill();
    }
}

// Damm som pyser ut när virveln blir keIWs igen.
function ritaPoff(x, y, t) {
    const H = keiwsBild(), f = t / POFF_TID;
    ctx.fillStyle = 'rgba(200, 192, 180, ' + (0.8 * (1 - f)) + ')';
    for (let k = 0; k < 8; k++) {
        const v = k / 8 * 6.28;
        const r = (0.3 + 0.7 * f) * H * 0.7;
        ctx.beginPath();
        ctx.arc(sx(x + Math.cos(v) * r), sy(y + 0.4 * H + Math.sin(v) * r * 0.6), Math.max(2, 0.12 * H * kam.sk * (1 - f * 0.5)), 0, 7);
        ctx.fill();
    }
}

function ritaProv() {
    if (sim.bygge) { ritaBygget(); return; }
    const m = sim.m;
    // Varje balk: först kanten som en hel linje (för de bitar som sitter
    // ihop), sedan varje element i sin färg. Då syns inga skarvar.
    m.balkar.forEach(balk => {
        let bit = [];
        const kant = () => {
            if (bit.length < 2) { bit = []; return; }
            ctx.strokeStyle = 'rgba(47,63,76,0.55)';
            ctx.lineWidth = Math.max(3, balk.prof.h * kam.sk) + 2;
            ctx.lineCap = ctx.lineJoin = 'round';
            ctx.beginPath();
            bit.forEach(([x, y], i) => i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)));
            ctx.stroke();
            bit = [];
        };
        for (const i of balk.element) {
            const e = m.element[i];
            if (e.dod) { kant(); continue; }
            if (!bit.length) bit.push(lage(m, e.i));
            bit.push(lage(m, e.j));
        }
        kant();
    });
    ctx.lineJoin = 'miter';
    for (const e of m.element) {
        if (e.dod) continue;
        const balk = m.balkar[e.balk];
        const [x1, y1] = lage(m, e.i), [x2, y2] = lage(m, e.j);
        ritaBit(x1, y1, x2, y2, balk.prof, e.vag, utnyttjandeFarg(Math.max(e.u, balk.uk)), null);
    }
    ritning.noder.forEach((n, i) => {
        const [x, y] = lage(m, m.nodPunkt[i]);
        ritaNod(x, y, n.fast, n.styv);
    });
}

// ---------- keIWs ----------

const FIG = FIGUR_DATA.keiws;

// keIWs ritas lika stor på skärmen hur man än zoomar: hans höjd i meter
// i bilden (fysiken bryr sig inte om storleken).
const keiwsBild = () => keiwsHojd(bana) / zoom;

// Rektanglar [x0, y0, x1, y1, färg, del] med fötternas mitt i (x, y).
function ritaFigur(rekt, x, y, lyft) {
    const s = keiwsBild() / 204 * kam.sk;         // figuren är 204 px hög
    const ox = sx(x) - 80 * s, oy = sy(y) - 204 * s;
    for (const [x0, y0, x1, y1, farg, del] of rekt) {
        const dy = lyft ? lyft(del) : 0;
        ctx.fillStyle = FIG.farger[farg];
        ctx.fillRect(ox + x0 * s, oy + (y0 + dy) * s, (x1 - x0) * s + 0.5, (y1 - y0) * s + 0.5);
    }
}

function ruta(anim, t) {
    const total = anim.reduce((s, r) => s + r.tid, 0);
    let ms = (t * 1000) % total;
    for (const r of anim) { if (ms < r.tid) return r.rekt; ms -= r.tid; }
    return anim[anim.length - 1].rekt;
}

function ritaKeiws() {
    const k = sim ? sim.keiws : null;
    if (!k) {
        // På klippan och väntar medan man bygger.
        ritaFigur(ruta(FIG.idle, performance.now() / 1000), keiwsStart(bana), 0);
        return;
    }
    if (sim.bygge) {
        const lage = byggLage(sim.bygge);
        ritaVirvel(lage.x, lage.y, sim.bygge.t);
        return;
    }
    if (k.lage === 'plask') return;
    if (k.lage === 'faller') { ritaFigur(ruta(FIG.faller, sim.t), k.x, k.y); return; }
    if (k.lage === 'klar') { ritaFigur(ruta(FIG.rekordjubel, sim.t - sim.slutTid), k.x, k.y); return; }
    if (k.lage === 'vantar') { ritaFigur(FIG.vrid[3], k.x, k.y); return; }
    // Går: benen kliver i takt med sträckan, armarna pendlar emot.
    const fas = Math.floor(k.gatt / (0.11 * keiwsHojd(bana))) % 2;
    ritaFigur(FIG.vrid[3], k.x, k.y, del => {
        if (del === 'nara_ben') return fas ? -12 : 0;
        if (del === 'bortre_ben') return fas ? 0 : -12;
        if (del === 'nara_arm') return fas ? 6 : -6;
        if (del === 'bortre_arm') return fas ? -6 : 6;
        return -4 * fas;
    });
}

function ritaPlask() {
    if (sim && sim.poff !== undefined && sim.poff < POFF_TID) ritaPoff(keiwsStart(bana), 0, sim.poff);
    if (!sim || sim.resultat !== 'vatten') return;
    const t = sim.t - sim.slutTid;
    if (t > 1.2) return;
    ctx.fillStyle = 'rgba(230, 244, 250, ' + (1 - t / 1.2) + ')';
    for (let i = -3; i <= 3; i++) {
        const x = sim.keiws.x + i * 0.18, h = (1 - Math.abs(i) / 4) * Math.sin(Math.min(Math.PI, t * 4)) * 1.2;
        ctx.beginPath();
        ctx.arc(sx(x), sy(bana.vatten + h), Math.max(2, 0.1 * kam.sk), 0, 7);
        ctx.fill();
    }
}

// ---------- Info och knappar ----------

const TIPS = {
    vag: 'Dra mellan två punkter: väg som keIWs går på. Tryck på en knutpunkt: styv/ledad.',
    balk: 'Dra mellan två punkter: balk. Tryck på en knutpunkt: styv/ledad.',
    flytta: 'Tryck på en balk och dra i dess ändar, eller dra en knutpunkt.',
    flyttaVald: 'Dra en ände dit den ska. Storleksknappen byter storlek på balken.',
    riv: 'Tryck på en balk för att riva den.'
};

// Infotexten: bana, kostnad och en tredje rad (tips medan man bygger,
// utnyttjandet under provkörningen). Tre rader när mobilen står.
function uppdateraInfo() {
    const k = kostnad(), over = k > bana.budget;
    const pil = (v, t, av) => '<button data-v="' + v + '"' + (av ? ' disabled' : '') + '>' + t + '</button>';
    const bygger = lageNu === 'bygg';
    let tredje;
    if (!bygger && sim && sim.bygge) {
        tredje = 'keIWs bygger …';
    } else if (!bygger && sim) {
        tredje = sim.brott ? '<span class="over">Bron gick sönder</span>'
            : 'Högsta utnyttjande ' + Math.round(sim.maxU * 100) + ' %';
    } else {
        tredje = TIPS[verktyg === 'flytta' && vald >= 0 ? 'flyttaVald' : verktyg];
    }
    infoEl.innerHTML = '<div class="rad">' + pil('forra', '‹', !bygger || banaNr === 0)
        + '<b>Bana ' + (banaNr + 1) + ' · ' + bana.namn + '</b>'
        + pil('nasta', '›', !bygger || banaNr === BANOR.length - 1) + '</div>'
        + '<div class="rad"><span class="' + (over ? 'over' : '') + '">' + kr(k) + '</span> av ' + kr(bana.budget) + '</div>'
        + '<div class="rad tredje' + (bygger ? ' tips' : '') + '">' + tredje + '</div>';
    for (const v of ['vag', 'balk', 'flytta', 'riv']) knappar[v].classList.toggle('vald', verktyg === v);
    const valdBalk = verktyg === 'flytta' && vald >= 0 ? ritning.balkar[vald] : null;
    knappar.storlek.textContent = STORLEKAR[valdBalk ? valdBalk.storlek : storlek];
    knappar.kor.textContent = lageNu === 'bygg' ? 'Kör' : 'Bygg';
    knappar.kor.classList.toggle('stopp', lageNu !== 'bygg');
    for (const v of ['vag', 'balk', 'flytta', 'riv', 'storlek', 'angra']) knappar[v].disabled = lageNu !== 'bygg';
    knappar.angra.disabled = lageNu !== 'bygg' || !historik.length;
    if (infoLuft() !== luftNu) anpassa();
}

function visaRuta(rubrik, text, knapptext) {
    rutaEl.innerHTML = '<h1>' + rubrik + '</h1><p>' + text + '</p>'
        + knapptext.map(([v, t]) => '<button data-v="' + v + '">' + t + '</button>').join(' ');
    rutaEl.classList.remove('dold');
}

function doljRuta() { rutaEl.classList.add('dold'); }

// Bygget som keIWs gör innan provkörningen: en lista med sträckor som
// virveln flyger (flyg) eller bygger längs (balk = vilken balk som växer
// fram). Balkarna byggs från vänster till höger, och varje balk från den
// ände som ligger närmast.
function nyttBygge() {
    const start = [keiwsStart(bana), 0];
    const ordning = ritning.balkar.map((b, i) => i).sort((i, j) => {
        const mi = Math.min(ritning.noder[ritning.balkar[i].a].x, ritning.noder[ritning.balkar[i].b].x);
        const mj = Math.min(ritning.noder[ritning.balkar[j].a].x, ritning.noder[ritning.balkar[j].b].x);
        return mi - mj;
    });
    const n = ordning.length;
    const per = n ? Math.min(BYGG_MAX, Math.max(BYGG_MIN, n * BYGG_PER_BALK)) / n : 0;
    const stracka = [];
    let p = start, t = 0;
    const flyg = (till, tid, balk, fran) => {
        stracka.push({ fran: fran || p, till, t0: t, t1: t + tid, balk });
        p = till; t += tid;
    };
    for (const i of ordning) {
        const b = ritning.balkar[i], na = ritning.noder[b.a], nb = ritning.noder[b.b];
        const [A, B] = Math.hypot(na.x - p[0], na.y - p[1]) <= Math.hypot(nb.x - p[0], nb.y - p[1])
            ? [[na.x, na.y], [nb.x, nb.y]] : [[nb.x, nb.y], [na.x, na.y]];
        flyg(A, 0.3 * per);
        flyg(B, 0.7 * per, i);
    }
    flyg(start, BYGG_HEM);
    return { t: 0, stracka, slut: t, klara: new Set() };
}

// Var virveln är just nu, och hur långt den växande balken har kommit.
function byggLage(bygge) {
    const s = bygge.stracka.find(s => bygge.t < s.t1) || bygge.stracka[bygge.stracka.length - 1];
    const f = s.t1 > s.t0 ? Math.min(1, Math.max(0, (bygge.t - s.t0) / (s.t1 - s.t0))) : 1;
    bygge.klara = new Set(bygge.stracka.filter(x => x.balk !== undefined && x.t1 <= bygge.t).map(x => x.balk));
    return {
        x: s.fran[0] + (s.till[0] - s.fran[0]) * f, y: s.fran[1] + (s.till[1] - s.fran[1]) * f,
        vaxer: s.balk !== undefined && f < 1 ? { balk: s.balk, fran: s.fran, f } : null
    };
}

function kor() {
    doljRuta();
    sim = nySim(ritning, bana);
    sim.bygge = nyttBygge();
    lageNu = 'prov';
    uppdateraInfo();
}

// Bygget är klart (eller överhoppat): keIWs står på startplatsen och
// provkörningen börjar.
function byggKlart() {
    if (!sim || !sim.bygge) return;
    sim.bygge = null;
    sim.poff = 0;
    ackumulerat = 0;
    uppdateraInfo();
}

function bygg() {
    doljRuta();
    sim = null;
    lageNu = 'bygg';
    uppdateraInfo();
    laddaOmOmLugnt();
}

// ---------- Menyn ----------

// Förklaringen i menyn. Materialvärdena och profilerna hämtas ur material.js.
function feText() {
    const m = MATERIAL.limtra, MPa = v => (v / 1e6).toLocaleString('sv-SE') + ' MPa';
    const profiler = PROFILER.limtra.map((p, i) => '<li>' + STORLEKAR[i] + ': ' + p.namn + ' mm, '
        + p.massa.toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + ' kg/m, ' + kr(p.pris) + '/m</li>').join('');
    return `
<h4>Modellen</h4>
<ul>
<li>Varje balk delas i balkelement på ca 0,75 m (Euler–Bernoulli): de tar
drag, tryck, böjning och tvärkraft.</li>
<li>Elementen är korotationella: bron får röra och vrida sig mycket (till
exempel när den rasar), medan träet töjs lite och är linjärt elastiskt.
Därför kommer linverkan med – en balk mellan två fästen bär delvis i drag.</li>
</ul>
<h4>Förband och fästen</h4>
<ul>
<li><b>Styvt:</b> balkarna delar vridningen i knutpunkten, moment förs över.</li>
<li><b>Ledat:</b> varje balkände vrider sig fritt.</li>
<li><b>Fästpunkterna</b> i berget låser både x och y.</li>
</ul>
<h4>Laster och tid</h4>
<ul>
<li>Egenvikt: balkarna, vägbanan ${VAG.massa} kg/m och förbanden ${FORBAND.massa} kg styck,
samlade i knutpunkterna.</li>
<li>Tyngden läggs på under 1 s, sedan går keIWs (${KEIWS_MASSA} kg) över som en rörlig last.</li>
<li>g = ${G} m/s² (avrundat).</li>
<li>Tiden stegas fram 120 gånger per sekund (Newmark) med Newton–Raphson i
varje steg, och lite dämpning.</li>
</ul>
<h4>Brott</h4>
<ul>
<li>Normalkraft och böjning: N/(A·f<sub>t,c</sub>) + M/(W·f<sub>m</sub>) &gt; 100 %.</li>
<li>Skjuvning: 1,5·V/(A·f<sub>v</sub>) &gt; 100 %.</li>
<li>Knäckning: tryckkraften i en balk når π²·E<sub>05</sub>·I/L².</li>
<li>Ett element som går sönder försvinner, en balk som knäcks går av på mitten.</li>
</ul>
<h4>Limträ GL30c</h4>
<ul>
<li>Elasticitetsmodul E: ${MPa(m.E)} (E<sub>05</sub> ${MPa(m.E05)})</li>
<li>Böjhållfasthet f<sub>m</sub>: ${MPa(m.fm)}</li>
<li>Draghållfasthet f<sub>t</sub>: ${MPa(m.ft)}</li>
<li>Tryckhållfasthet f<sub>c</sub>: ${MPa(m.fc)}</li>
<li>Skjuvhållfasthet f<sub>v</sub>: ${MPa(m.fv)}</li>
<li>Densitet: ${m.densitet} kg/m³</li>
</ul>
<h4>Profiler</h4>
<ul>${profiler}</ul>
<h4>Förenklingar</h4>
<ul>
<li>Ingen skjuvdeformation (Timoshenko).</li>
<li>Ingen vippning eller knäckning ut ur planet.</li>
<li>Inga partialkoefficienter eller lastkombinationer som i Eurokod.</li>
</ul>`;
}

function visaMeny() {
    const b = lasBasta(banaNr);
    const basta = b
        ? '<p>Billigaste bron som höll: <b>' + kr(b.kostnad) + '</b>'
            + (b.kostnad > bana.budget ? ' (över budget)' : '') + '.</p>'
            + '<button data-v="hamta"' + (lageNu === 'bygg' ? '' : ' disabled') + '>Hämta den ritningen</button>'
        : '<p>Ingen bro har hållit här än.</p>';
    const tom = !ritning.balkar.length && ritning.noder.every(n => n.fast);
    const rivAllt = '<p><button data-v="rivallt"' + (lageNu === 'bygg' && !tom ? '' : ' disabled')
        + '>Riv allt och börja om</button></p>';
    menyEl.firstChild.innerHTML = '<button class="stang" data-v="stang">✕</button>'
        + '<h2>Brobyggare</h2>'
        + '<h3>Bana ' + (banaNr + 1) + ' · ' + bana.namn + '</h3>' + basta + rivAllt
        + '<details><summary>Hur räknas bron?</summary>' + feText() + '</details>'
        + '<p class="liten">Version ' + (version || 'okänd') + '</p>';
    menyEl.classList.remove('dold');
}

const menyOppen = () => !menyEl.classList.contains('dold');

function stangMeny() {
    menyEl.classList.add('dold');
    laddaOmOmLugnt();
}

document.getElementById('menyknapp').addEventListener('click', () => {
    if (menyOppen()) stangMeny(); else visaMeny();
});

menyEl.addEventListener('click', e => {
    if (e.target === menyEl) { stangMeny(); return; }   // utanför panelen
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.v === 'rivallt' && lageNu === 'bygg') {
        andra(() => { ritning = nyRitning(bana); vald = -1; });   // går att ångra
    }
    if (b.dataset.v === 'hamta') {
        const basta = lasBasta(banaNr);
        if (basta && lageNu === 'bygg') {
            andra(() => { ritning = JSON.parse(JSON.stringify(basta.ritning)); vald = -1; });
        }
    }
    stangMeny();
});

// ---------- Ny version ----------

// En ny version laddas in när det passar: man bygger, drar inget och har
// inte menyn öppen. Ångra-listan sparas över omladdningen (ritningen är
// redan sparad).
function laddaOmOmLugnt() {
    if (!laddaOmSen || lageNu !== 'bygg' || drag || flytt || menyOppen()) return;
    try { sessionStorage.setItem(SPARA_HISTORIK, JSON.stringify({ bana: banaNr, historik })); } catch (e) { /* privat läge */ }
    location.reload();
}

function lasHistorik() {
    try {
        const h = JSON.parse(sessionStorage.getItem(SPARA_HISTORIK));
        sessionStorage.removeItem(SPARA_HISTORIK);
        if (h && h.bana === banaNr && Array.isArray(h.historik)) historik = h.historik;
    } catch (e) { /* ingen sparad */ }
}

function visaResultat() {
    const k = kostnad(), under = k <= bana.budget;
    if (sim.resultat === 'klarade') {
        const basta = sparaBasta(k);
        visaRuta('Bron höll!', 'keIWs kom över. Kostnad ' + kr(k) + (under ? ', under budget.' : ', över budget.')
            + '<br>Högsta utnyttjande ' + Math.round(sim.maxU * 100) + ' %.'
            + (basta ? '<br><b>Din billigaste bro hittills på den här banan!</b>' : ''),
            [['bygg', 'Bygg vidare'], ['kor', 'Kör igen']]);
    } else {
        visaRuta('Plask!', sim.brott ? 'Bron gick sönder och keIWs ramlade i vattnet.' : 'keIWs ramlade i vattnet.',
            [['bygg', 'Bygg om'], ['kor', 'Kör igen']]);
    }
}

document.getElementById('verktyg').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const v = b.dataset.v;
    if (v === 'vag' || v === 'balk') { verktyg = ritverktyg = v; vald = -1; }
    else if (v === 'flytta' || v === 'riv') {
        // Ett tryck till på samma knapp väljer bort den (tillbaka till Väg/Balk).
        verktyg = verktyg === v ? ritverktyg : v;
        vald = -1;
    }
    else if (v === 'storlek') {
        // Med en vald balk (Flytta) byter knappen storlek på den.
        const b = verktyg === 'flytta' && vald >= 0 ? ritning.balkar[vald] : null;
        if (b) andra(() => { b.storlek = (b.storlek + 1) % STORLEKAR.length; });
        else storlek = (storlek + 1) % STORLEKAR.length;
    }
    else if (v === 'angra' && historik.length) { ritning = JSON.parse(historik.pop()); vald = -1; sparaRitning(); }
    else if (v === 'kor') { if (lageNu === 'bygg') kor(); else bygg(); }
    uppdateraInfo();
});

infoEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    bytBana(banaNr + (b.dataset.v === 'nasta' ? 1 : -1));
});

rutaEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.v === 'kor') kor(); else bygg();
});

// ---------- Bygga med fingret ----------

// Närmaste balk inom `max` m från punkten, eller -1.
function narmasteBalk(wx, wy, max) {
    let bast = -1, bastD = max;
    ritning.balkar.forEach((b, i) => {
        const na = ritning.noder[b.a], nb = ritning.noder[b.b];
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const t = Math.max(0, Math.min(1, ((wx - na.x) * dx + (wy - na.y) * dy) / (dx * dx + dy * dy)));
        const d = Math.hypot(wx - na.x - t * dx, wy - na.y - t * dy);
        if (d < bastD) { bastD = d; bast = i; }
    });
    return bast;
}

// Närmaste knutpunkt inom `max` m (utan fästpunkterna), eller -1.
function narmasteNod(wx, wy, max) {
    let bast = -1, bastD = max;
    ritning.noder.forEach((n, i) => {
        const d = Math.hypot(wx - n.x, wy - n.y);
        if (!n.fast && d < bastD) { bastD = d; bast = i; }
    });
    return bast;
}

// Fingrarna på skärmen just nu: pointerId → [x, y] i duken. Två fingrar
// zoomar och flyttar vyn (och avbryter det man höll på att bygga). Ett
// finger under provkörningen flyttar vyn.
const pekare = new Map();
let nyp = null, panorera = null;

function nypLage() {
    const [[x1, y1], [x2, y2]] = [...pekare.values()];
    return { mx: (x1 + x2) / 2, my: (y1 + y2) / 2, d: Math.hypot(x2 - x1, y2 - y1) || 1 };
}

const vynsMitt = () => [(scen.clientWidth / 2 - kam.ox) / kam.sk, (kam.oy - (luftNu + scen.clientHeight) / 2) / kam.sk];

duk.addEventListener('pointerdown', e => {
    pekare.set(e.pointerId, iDuken(e));
    try { duk.setPointerCapture(e.pointerId); } catch (err) { /* syntetiska händelser i testerna */ }
    if (pekare.size >= 2) {
        drag = flytt = panorera = null;
        const n = nypLage();
        nyp = { d: n.d, zoom, varld: [(n.mx - kam.ox) / kam.sk, (kam.oy - n.my) / kam.sk] };
        return;
    }
    if (lageNu !== 'bygg') {
        if (sim && sim.bygge) byggKlart();       // ett tryck hoppar över bygget
        panorera = { p: iDuken(e), mitt: vynsMitt() };
        return;
    }
    const [wx, wy] = tillVarld(e);
    const nara = Math.max(0.45, 22 / kam.sk);
    // Utanför rutnätet flyttar ett finger vyn (när man har zoomat in).
    const o = bana.omrade;
    if (wx < o.x0 - nara || wx > o.x1 + nara || wy < o.y0 - nara || wy > o.y1 + nara) {
        panorera = { p: iDuken(e), mitt: vynsMitt() };
        return;
    }
    if (verktyg === 'riv') {
        const i = narmasteBalk(wx, wy, Math.max(0.4, 16 / kam.sk));
        if (i >= 0) rivBalk(i);
        return;
    }
    if (verktyg === 'flytta') {
        // Först handtagen på den valda balken, sedan knutpunkterna, annars
        // väljs balken man tryckte på.
        const b = vald >= 0 ? ritning.balkar[vald] : null;
        for (const ande of b ? ['a', 'b'] : []) {
            const n = ritning.noder[b[ande]];
            if (Math.hypot(wx - n.x, wy - n.y) < nara) {
                flytt = { balk: vald, ande, till: [n.x, n.y] };
                return;
            }
        }
        const nod = narmasteNod(wx, wy, nara * 0.8);
        if (nod >= 0) {
            flytt = { nod, till: [ritning.noder[nod].x, ritning.noder[nod].y] };
            return;
        }
        vald = narmasteBalk(wx, wy, Math.max(0.4, 16 / kam.sk));
        uppdateraInfo();
        return;
    }
    const p = snappa(wx, wy);
    if (p) drag = { fran: p, till: p };
});

duk.addEventListener('pointermove', e => {
    if (!pekare.has(e.pointerId)) return;
    pekare.set(e.pointerId, iDuken(e));
    if (nyp && pekare.size >= 2) {
        const n = nypLage();
        zoom = nyp.zoom;
        zoomaKring(n.d / nyp.d, n.mx, n.my, nyp.varld);
        return;
    }
    if (panorera) {
        const [px, py] = iDuken(e);
        mitt = [panorera.mitt[0] - (px - panorera.p[0]) / kam.sk, panorera.mitt[1] + (py - panorera.p[1]) / kam.sk];
        sattKamera();
        return;
    }
    const p = snappa(...tillVarld(e));
    if (!p) return;
    if (drag) drag.till = p;
    if (flytt) flytt.till = p;
});

function slapp(e) {
    pekare.delete(e.pointerId);
    if (pekare.size < 2) nyp = null;
    if (!pekare.size) panorera = null;
    if (flytt) {
        const f = flytt;
        flytt = null;
        if (f.nod !== undefined) flyttaNod(f.nod, f.till);
        else flyttaAnde(f.balk, f.ande, f.till);
        uppdateraInfo();
        return;
    }
    if (!drag) return;
    const { fran, till } = drag;
    drag = null;
    if (fran[0] === till[0] && fran[1] === till[1]) {
        // Ett tryck på en knutpunkt: växla mellan styvt och ledat.
        const i = nodVid(fran[0], fran[1]);
        if (i >= 0) vaxlaForband(i);
    } else {
        laggTillBalk(fran, till);
    }
}
duk.addEventListener('pointerup', slapp);
duk.addEventListener('pointercancel', e => {
    pekare.delete(e.pointerId);
    if (pekare.size < 2) nyp = null;
    drag = flytt = panorera = null;
});

// Mushjulet zoomar kring muspekaren (på datorn).
duk.addEventListener('wheel', e => {
    e.preventDefault();
    const [px, py] = iDuken(e);
    zoomaKring(Math.exp(-e.deltaY * 0.0015), px, py);
}, { passive: false });

// ---------- Spelloopen ----------

let forra = performance.now(), ackumulerat = 0;

function loop(nu) {
    const dt = Math.min(0.1, (nu - forra) / 1000);
    forra = nu;
    if (lageNu === 'prov' && sim && sim.bygge) {
        sim.bygge.t += dt;
        if (sim.bygge.t >= sim.bygge.slut) byggKlart();
    } else if (lageNu === 'prov' && sim) {
        if (sim.poff !== undefined) sim.poff += dt;
        ackumulerat += dt;
        let n = 0;
        while (ackumulerat >= DT && n < MAX_STEG) { simSteg(sim); ackumulerat -= DT; n++; }
        if (n === MAX_STEG) ackumulerat = 0;
        if (sim.resultat && !sim.visad && sim.t - sim.slutTid > 1.2) { sim.visad = true; visaResultat(); }
        if (Math.round(nu / 250) !== Math.round((nu - dt * 1000) / 250)) uppdateraInfo();
    } else {
        ackumulerat = 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ritaBakgrund();
    if (lageNu === 'bygg') ritaBygg(); else ritaProv();
    ritaKeiws();
    ritaVatten(nu / 1000);
    ritaPlask();
    requestAnimationFrame(loop);
}

new ResizeObserver(anpassa).observe(scen);
lasHistorik();
anpassa();
uppdateraInfo();
requestAnimationFrame(loop);

// Versionen = namnet på service workerns cache (brobyggare-v6-test -> v6-test).
// Gamla cacher tas bort när en ny version tar över, så den högsta körs.
// Utan cache (första besöket, testerna) läses den ur sw.js.
function visaVersion(v) {
    version = v;
    versionEl.textContent = v;
}
(async () => {
    try {
        const namn = 'caches' in window ? await caches.keys() : [];
        const v = namn.map(n => /^brobyggare-v(\d+)(-test)?$/.exec(n)).filter(Boolean).sort((a, b) => b[1] - a[1])[0];
        if (v) { visaVersion('v' + v[1] + (v[2] || '')); return; }
        const m = /VERSION = '([^']+)'/.exec(await (await fetch('sw.js')).text());
        if (m) visaVersion(m[1]);
    } catch (e) { /* ingen version att visa */ }
})();

// Service worker: webbläsaren letar själv efter en ny version bara när
// sidan öppnas, så spelet letar också när man kommer tillbaka till det och
// var tionde minut medan det är öppet. Den nya versionen laddas in direkt om
// det passar, annars vid nästa byte av bana eller tillbaka från provkörningen.
if ('serviceWorker' in navigator && !TEST) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        const leta = () => reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') leta();
        });
        setInterval(leta, UPPDATERA_VAR);
        reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
                if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                    laddaOmSen = true;
                    laddaOmOmLugnt();
                }
            });
        });
    }).catch(() => {});
}

// Testerna kommer åt spelet här (bara med ?test).
if (TEST) {
    window.bro = {
        get ritning() { return ritning; },
        set ritning(r) { ritning = r; historik = []; sparaRitning(); uppdateraInfo(); },
        get sim() { return sim; },
        get lage() { return lageNu; },
        get kam() { return kam; },
        get zoom() { return zoom; },
        get vald() { return vald; },
        get banaNr() { return banaNr; },
        get bygger() { return !!(sim && sim.bygge); },
        get version() { return version; },
        get historik() { return historik.length; },
        nyVersion() { laddaOmSen = true; laddaOmOmLugnt(); },
        kostnad, kor, bygg, bytBana, byggKlart, losningsRitning: () => losningsRitning(bana)
    };
}
