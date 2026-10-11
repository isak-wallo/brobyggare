'use strict';
// Brobyggare: bygg en bro, tryck Kör och se om keIWs kommer över.
//
// Lägen: 'bygg' (dra balkar mellan rutnätspunkter) och 'prov' (fysiken
// räknar, keIWs går). Spelytan anpassar sig efter skärmen: verktygen ligger
// längst ner när mobilen står och på sidan när den ligger, och kameran
// zoomar så att hela banan (bana.vy) alltid får plats.

const TEST = new URLSearchParams(location.search).has('test');
const RUTNAT = 1;            // m mellan punkterna man bygger på
const MAX_LANGD = 12;        // m, längsta balken
const MAX_STEG = 8;          // fysiksteg per bildruta (annars går det långsamt)
const KEIWS_HOJD = 1.0;      // m, keIWs från fötterna till huvudet
const SPARA = 'brobyggare-ritning-';   // + banans nummer
const SPARA_BANA = 'brobyggare-bana';

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
const knappar = Object.fromEntries([...document.querySelectorAll('#verktyg button')].map(b => [b.dataset.v, b]));

let banaNr = lasBanaNr();
let bana = BANOR[banaNr];
let ritning = lasRitning();
let historik = [];
let verktyg = 'vag';
let storlek = 1;
let lageNu = 'bygg';
let sim = null;
let drag = null;              // {fran: [x, y], till: [x, y]} medan man drar
let kam = { sk: 30, ox: 0, oy: 0 };
let dpr = 1;

// ---------- Ritningen (det man bygger) ----------

// Varje bana har sin egen sparade ritning, och spelet minns vilken bana
// man var på.
function lasBanaNr() {
    let nr = 0;
    try { nr = parseInt(localStorage.getItem(SPARA_BANA), 10) || 0; } catch (e) { /* privat läge */ }
    return Math.max(0, Math.min(BANOR.length - 1, nr));
}

function lasRitning() {
    try {
        const r = JSON.parse(localStorage.getItem(SPARA + banaNr));
        if (r && r.noder && r.balkar) return r;
    } catch (e) { /* ingen sparad */ }
    return nyRitning(bana);
}

function sparaRitning() {
    try { localStorage.setItem(SPARA + banaNr, JSON.stringify(ritning)); } catch (e) { /* privat läge */ }
}

function bytBana(nr) {
    if (lageNu !== 'bygg' || nr < 0 || nr >= BANOR.length) return;
    banaNr = nr;
    bana = BANOR[nr];
    ritning = lasRitning();
    historik = [];
    drag = null;
    try { localStorage.setItem(SPARA_BANA, nr); } catch (e) { /* privat läge */ }
    anpassa();
    uppdateraInfo();
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
    });
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

const kr = v => v.toLocaleString('sv-SE') + ' kr';

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
    // Luft för infotexten upptill (två rader om den inte får plats på en).
    const vy = bana.vy, luft = infoLuft();
    const sk = Math.min(w / (vy.x1 - vy.x0), (h - luft) / (vy.y1 - vy.y0));
    // Blir det höjd över (mobilen står) går det mesta till himlen.
    const over = h - luft - sk * (vy.y1 - vy.y0);
    kam = {
        sk,
        ox: w / 2 - sk * (vy.x0 + vy.x1) / 2,
        oy: luft + over * 0.7 + sk * vy.y1
    };
}

const sx = x => kam.ox + x * kam.sk;
const sy = y => kam.oy - y * kam.sk;
const tillVarld = e => {
    const r = duk.getBoundingClientRect();
    return [(e.clientX - r.left - kam.ox) / kam.sk, (kam.oy - (e.clientY - r.top)) / kam.sk];
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

function ritaProv() {
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
const FIG_SK = KEIWS_HOJD / 204;      // m per figurpixel (204 px hög)

// Rektanglar [x0, y0, x1, y1, färg, del] med fötternas mitt i (x, y).
function ritaFigur(rekt, x, y, lyft) {
    const s = FIG_SK * kam.sk;
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
        ritaFigur(ruta(FIG.idle, performance.now() / 1000), KEIWS_START, 0);
        return;
    }
    if (k.lage === 'plask') return;
    if (k.lage === 'faller') { ritaFigur(ruta(FIG.faller, sim.t), k.x, k.y); return; }
    if (k.lage === 'klar') { ritaFigur(ruta(FIG.rekordjubel, sim.t - sim.slutTid), k.x, k.y); return; }
    if (k.lage === 'vantar') { ritaFigur(FIG.vrid[3], k.x, k.y); return; }
    // Går: benen kliver i takt med sträckan, armarna pendlar emot.
    const fas = Math.floor(k.gatt / 0.22) % 2;
    ritaFigur(FIG.vrid[3], k.x, k.y, del => {
        if (del === 'nara_ben') return fas ? -12 : 0;
        if (del === 'bortre_ben') return fas ? 0 : -12;
        if (del === 'nara_arm') return fas ? 6 : -6;
        if (del === 'bortre_arm') return fas ? -6 : 6;
        return -4 * fas;
    });
}

function ritaPlask() {
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

function uppdateraInfo() {
    const k = kostnad(), over = k > bana.budget;
    const pil = (v, t, av) => '<button data-v="' + v + '"' + (av ? ' disabled' : '') + '>' + t + '</button>';
    const bygger = lageNu === 'bygg';
    let text = pil('forra', '‹', !bygger || banaNr === 0) + '<b>Bana ' + (banaNr + 1) + ' · ' + bana.namn + '</b>'
        + pil('nasta', '›', !bygger || banaNr === BANOR.length - 1)
        + ' <span class="' + (over ? 'over' : '') + '">' + kr(k) + '</span> av ' + kr(bana.budget);
    if (lageNu === 'prov' && sim) {
        text += sim.brott ? ' · <span class="over">bron gick sönder</span>' : ' · högst ' + Math.round(sim.maxU * 100) + ' %';
    }
    infoEl.innerHTML = text;
    for (const v of ['vag', 'balk', 'riv']) knappar[v].classList.toggle('vald', verktyg === v);
    knappar.storlek.textContent = STORLEKAR[storlek];
    knappar.kor.textContent = lageNu === 'bygg' ? 'Kör' : 'Bygg';
    knappar.kor.classList.toggle('stopp', lageNu !== 'bygg');
    for (const v of ['vag', 'balk', 'riv', 'storlek', 'angra']) knappar[v].disabled = lageNu !== 'bygg';
    knappar.angra.disabled = lageNu !== 'bygg' || !historik.length;
    if (infoLuft() !== luftNu) anpassa();
}

function visaRuta(rubrik, text, knapptext) {
    rutaEl.innerHTML = '<h1>' + rubrik + '</h1><p>' + text + '</p>'
        + knapptext.map(([v, t]) => '<button data-v="' + v + '">' + t + '</button>').join(' ');
    rutaEl.classList.remove('dold');
}

function doljRuta() { rutaEl.classList.add('dold'); }

function kor() {
    doljRuta();
    sim = nySim(ritning, bana);
    lageNu = 'prov';
    uppdateraInfo();
}

function bygg() {
    doljRuta();
    sim = null;
    lageNu = 'bygg';
    uppdateraInfo();
}

function visaResultat() {
    const k = kostnad(), under = k <= bana.budget;
    if (sim.resultat === 'klarade') {
        visaRuta('Bron höll!', 'keIWs kom över. Kostnad ' + kr(k) + (under ? ', under budget.' : ', över budget.')
            + '<br>Högsta utnyttjande ' + Math.round(sim.maxU * 100) + ' %.', [['bygg', 'Bygg vidare'], ['kor', 'Kör igen']]);
    } else {
        visaRuta('Plask!', sim.brott ? 'Bron gick sönder och keIWs ramlade i vattnet.' : 'keIWs ramlade i vattnet.',
            [['bygg', 'Bygg om'], ['kor', 'Kör igen']]);
    }
}

document.getElementById('verktyg').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const v = b.dataset.v;
    if (v === 'vag' || v === 'balk' || v === 'riv') verktyg = v;
    else if (v === 'storlek') storlek = (storlek + 1) % STORLEKAR.length;
    else if (v === 'angra' && historik.length) { ritning = JSON.parse(historik.pop()); sparaRitning(); }
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

duk.addEventListener('pointerdown', e => {
    if (lageNu !== 'bygg') return;
    const [wx, wy] = tillVarld(e);
    if (verktyg === 'riv') {
        const i = narmasteBalk(wx, wy, Math.max(0.4, 16 / kam.sk));
        if (i >= 0) rivBalk(i);
        return;
    }
    const p = snappa(wx, wy);
    if (!p) return;
    drag = { fran: p, till: p };
    duk.setPointerCapture(e.pointerId);
});

duk.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = snappa(...tillVarld(e));
    if (p) drag.till = p;
});

function slappDrag() {
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
duk.addEventListener('pointerup', slappDrag);
duk.addEventListener('pointercancel', () => { drag = null; });

// ---------- Spelloopen ----------

let forra = performance.now(), ackumulerat = 0;

function loop(nu) {
    const dt = Math.min(0.1, (nu - forra) / 1000);
    forra = nu;
    if (lageNu === 'prov' && sim) {
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
anpassa();
uppdateraInfo();
requestAnimationFrame(loop);

if ('serviceWorker' in navigator && !TEST) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Testerna kommer åt spelet här (bara med ?test).
if (TEST) {
    window.bro = {
        get ritning() { return ritning; },
        set ritning(r) { ritning = r; historik = []; sparaRitning(); uppdateraInfo(); },
        get sim() { return sim; },
        get lage() { return lageNu; },
        get kam() { return kam; },
        get banaNr() { return banaNr; },
        kostnad, kor, bygg, bytBana, losningsRitning: () => losningsRitning(bana)
    };
}
