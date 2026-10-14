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
// Testsidan (GitHub Pages och lokalt) har en knapp som delar konstruktionen
// som text, för felsökning. Inte på den skarpa sidan.
const FELSOK = TEST || /github\.io$|^localhost$|^127\./.test(location.hostname);
const MAX_LANGD = 12;        // m, längsta balken (om banan inte säger annat)
const START_NARA = 24;       // px: så nära en knutpunkt börjar en ny balk i den
const RATTA_TID = 2.5;       // s som en ny balks startände går att dra rätt
const MAX_STEG = 8;          // fysiksteg per bildruta (annars går det långsamt)
const MAX_ZOOM = 6;          // (om banan inte säger annat)
const BYGG_PER_BALK = 0.2;   // s per balk när keIWs bygger ...
const BYGG_MIN = 1.0;        // ... men hela bygget tar minst ...
const BYGG_MAX = 3.0;        // ... och högst så här länge (s)
const BYGG_HEM = 0.35;       // s, tillbaka till startplatsen efteråt
const POFF_TID = 0.35;       // s, dammet när virveln blir keIWs igen
const SPARA = 'brobyggare-ritning-';   // + banans namn
const SPARA_BANA = 'brobyggare-bana';     // banans namn
const SPARA_BASTA = 'brobyggare-basta-';  // + banans namn: billigaste bron som höll
const SPARA_HISTORIK = 'brobyggare-historik';  // ångra-listan över en omladdning
const UPPDATERA_VAR = 10 * 60 * 1000;     // ms, leta efter en ny version

const FARG = {
    himmel: ['#9fcbe0', '#d8ecf2'], berg: '#8b7a66', bergMork: '#6f604f', gras: '#7cae5c',
    vatten: 'rgba(63, 120, 160, 0.82)', vag: '#5d6670',
    material: { limtra: ['#c9975b', '#8a6438'], stal: ['#8d9aa6', '#4f5b66'], betong: ['#b4afa5', '#7f7a71'],
                vajer: ['#3f4a54', '#2a323a'] },
    betong: '#b4afa5', betongMork: '#948f86',
    nod: '#2f3f4c', punkt: 'rgba(47, 63, 76, 0.28)', fel: '#d0503c', text: '#2f3f4c'
};

const duk = document.getElementById('duk');
const ctx = duk.getContext('2d');
const scen = document.getElementById('scen');
const infoEl = document.getElementById('info');
const rutaEl = document.getElementById('ruta');
const valjareEl = document.getElementById('valjare');
const menyEl = document.getElementById('meny');
const versionEl = document.getElementById('version');
const knappar = Object.fromEntries([...document.querySelectorAll('#verktyg button')].map(b => [b.dataset.v, b]));

let banaNr = lasBanaNr();
let bana = BANOR[banaNr];
let ritning = lasRitning();
let historik = [];
let verktyg = 'rita';         // 'rita' (nya balkar) eller 'andra' (Välj: flytta, byta, riva)
let panoreraLage = false;    // Panorera: ett finger flyttar vyn i stället för att bygga
let ritVag = true;            // ritar väg (som keIWs går på) eller balk
let ritPelare = false;       // sätter pelare i stället (banor med pelare)
let ritKabel = false;        // ritar kablar i stället (bara drag)
let varnaNasta = false;      // varningen när man går vidare utan en bro som höll
let storlek = 2;              // storleken man bygger med (0–5, knapparna 1–6)
let ritMaterial = 'limtra';   // materialet man ritar väg och balk med (kabeln har sitt eget)
let lageNu = 'bygg';
let sim = null;
let drag = null;              // {fran: [x, y], till: [x, y]} medan man drar
let vald = -1;                // vald balk (Välj)
let valdNod = null;           // eller vald knutpunkt eller pelare
let flytt = null;             // {balk, ande} eller {nod}, och {till: [x, y]}
let ratta = null;             // {balk, t}: ny balk som började i en ny punkt
let kam = { sk: 30, ox: 0, oy: 0 };
let bas = null;               // kameran utan zoom: {sk, cx, cy, B} (B = det som syns)
let zoom = 1, mitt = null;    // användarens zoom och vyns mitt [x, y] i meter
let byggVy = null;            // {zoom, mitt} när man tryckte Kör, tillbaka vid Bygg
let dpr = 1;
let version = '';             // appens version (service workerns cache), visas litet
let laddaOmSen = false;       // ny version finns: ladda om när det passar

// ---------- Ritningen (det man bygger) ----------

// Varje bana har sin egen sparade ritning, och spelet minns vilken bana
// man var på.
// Förut sparades allt per banans nummer, i två olika ordningar (före och
// efter v37). Nu per namn, så att banorna kan byta plats. Dalgången
// ritades om helt (v39): det som sparats där kastas.
function flyttaSparat() {
    try {
        const ordning = localStorage.getItem('brobyggare-ordning');
        if (ordning === '3') return;
        const forr = ordning === '2' ? ['Bäcken', 'Ån', 'Dalgången', 'Kanalen', 'Älven', 'Havet']
            : ['Bäcken', 'Ån', 'Kanalen', 'Dalgången', 'Älven', 'Havet'];
        for (const nyckel of [SPARA, SPARA_BASTA]) {
            forr.forEach((namn, nr) => {
                const v = localStorage.getItem(nyckel + nr);
                localStorage.removeItem(nyckel + nr);
                if (v !== null && namn !== 'Dalgången') localStorage.setItem(nyckel + namn, v);
            });
        }
        const nr = localStorage.getItem(SPARA_BANA);
        if (nr !== null && forr[nr]) localStorage.setItem(SPARA_BANA, forr[nr]);
        sessionStorage.removeItem(SPARA_HISTORIK);
        localStorage.setItem('brobyggare-ordning', '3');
    } catch (e) { /* privat läge */ }
}

function lasBanaNr() {
    flyttaSparat();
    let nr = 0;
    try { nr = Math.max(0, BANOR.findIndex(b => b.namn === localStorage.getItem(SPARA_BANA))); } catch (e) { /* privat läge */ }
    return Math.max(0, Math.min(BANOR.length - 1, nr));
}

// Ritningar från när det fanns tre storlekar (utan version) får de nya
// numren, så att balkarna behåller sina mått. Fästena får sina brolager
// från banan (version 3). Version 4: nya trämått (samma storleksnamn).
// Version 5: 9 steg (Liten−–Stor+) i stället för 15 (Pytte−–Jätte+); varje
// balk behåller sin profil (gamla Pytte = nya Liten−; stål: HEA 100 =
// Liten−), det som saknas blir närmaste steg. Version 6: stålet börjar med
// IPE 80–120, HEA 100 är Mellan− (träets Stor+ blev 90×345 igen).
// Version 7: 6 storlekar (0–5) i stället för 9 steg (se GAMLA_STEG).
function uppgradera(r, b = bana) {
    // De 9 stegen (0–8) sparades som 0–2 ± 0,25 (version 5 och 6).
    const steg9 = s => Math.max(0, Math.min(8, 3 * Math.round(s) + Math.sign(s - Math.round(s)) + 1));
    const storlek9 = k => Math.floor(k / 3) + (k % 3 - 1) * 0.25;
    if (!r.version) {
        for (const k of r.balkar) k.storlek = [1, 3, 4][k.storlek] ?? 2;
    }
    if ((r.version || 0) < 5) {
        for (const k of r.balkar) {
            const s = k.storlek, gammalt = 3 * Math.round(s) + Math.sign(s - Math.round(s)) + 1;
            k.storlek = storlek9(Math.max(0, Math.min(8, gammalt - (k.material === 'stal' ? 0 : 1))));
        }
    }
    if ((r.version || 0) < 6) {
        for (const k of r.balkar) if (k.material === 'stal') k.storlek = storlek9(Math.min(8, steg9(k.storlek) + 3));
    }
    if ((r.version || 0) < 7) {
        for (const k of r.balkar) k.storlek = nyttSteg(steg9(k.storlek), k.material || 'limtra');
    }
    for (const n of r.noder) {
        if (!n.fast) continue;
        // Pelarna har glidlager (från v32).
        if (n.pelare) { n.lager = 'glid'; n.styv = false; }
        const f = b.fasten.find(([x, y]) => x === n.x && y === n.y);
        if (f && f[2]) { n.lager = f[2]; n.styv = false; }
        // Fästen som tagits bort (färre fästen från v39) blir knutpunkter.
        if (!f && !n.pelare) { n.fast = false; n.styv = true; delete n.lager; }
    }
    // Knutpunkter utan balkar (och som inte är fästen) tas bort.
    const kvar = r.noder.map((n, i) => n.fast || r.balkar.some(k => k.a === i || k.b === i));
    if (!kvar.every(Boolean)) {
        const index = r.noder.map((n, i) => kvar[i] ? r.noder.slice(0, i).filter((m, j) => kvar[j]).length : -1);
        r.noder = r.noder.filter((n, i) => kvar[i]);
        for (const k of r.balkar) { k.a = index[k.a]; k.b = index[k.b]; }
    }
    // Fästen som kommit till sedan ritningen sparades (fästena på land).
    for (const [x, y, lager] of b.fasten) {
        if (!r.noder.some(n => n.fast && n.x === x && n.y === y)) r.noder.push(fastNod(x, y, lager));
    }
    for (const k of r.balkar) k.storlek = Math.max(0, Math.min(ANTAL_STEG - 1, Math.round(k.storlek)));
    r.version = 7;
    return r;
}

function lasRitning() {
    try {
        const r = JSON.parse(localStorage.getItem(SPARA + bana.namn));
        if (r && r.noder && r.balkar) return uppgradera(r);
    } catch (e) { /* ingen sparad */ }
    return nyRitning(bana);
}

function sparaRitning() {
    try { localStorage.setItem(SPARA + bana.namn, JSON.stringify(ritning)); } catch (e) { /* privat läge */ }
}

// Billigaste bron som höll på en bana: {kostnad, ritning}.
function lasBasta(nr) {
    try {
        const b = JSON.parse(localStorage.getItem(SPARA_BASTA + BANOR[nr].namn));
        // Före brolagren (version 3) och de nya trämåtten (version 4)
        // räknades bron annorlunda: börja om.
        if (b && (b.ritning.version || 0) < 4) return null;
        return b;
    } catch (e) { return null; }
}

function sparaBasta(k) {
    const b = lasBasta(banaNr);
    if (b && b.kostnad <= k) return false;
    try {
        localStorage.setItem(SPARA_BASTA + bana.namn, JSON.stringify({ kostnad: k, ritning }));
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
    vald = -1; valdNod = null;
    ratta = null;
    zoom = 1;
    mitt = null;
    if (!bana.pelare) ritPelare = false;
    if (!harMaterial('vajer')) ritKabel = false;
    if (!harMaterial(ritMaterial)) ritMaterial = 'limtra';
    try { localStorage.setItem(SPARA_BANA, bana.namn); } catch (e) { /* privat läge */ }
    anpassa();
    uppdateraInfo();
    laddaOmOmLugnt();
}

function andra(f) {
    ratta = null;
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
// luften ovanför marken på båda sidor.
function tillaten(x, y) {
    const o = bana.omrade;
    if (bana.fasten.some(([fx, fy]) => fx === x && fy === y)) return true;
    if (y < o.y0 || y > o.y1 || x < o.x0 || x > o.x1 || iFarleden(x, y)) return false;
    return y > markY(bana, x) + 1e-9;      // inte i marken
}

// Farleden (en del banor): under farled.y mellan x0 och x1 får inget byggas,
// varken knutpunkter eller balkar som går igenom.
const iFarleden = (x, y) => !!bana.farled && x >= bana.farled.x0 && x <= bana.farled.x1 && y < bana.farled.y - 1e-9;

function genomFarleden([x1, y1], [x2, y2]) {
    const f = bana.farled;
    if (!f) return false;
    const fran = Math.max(f.x0, Math.min(x1, x2)), till = Math.min(f.x1, Math.max(x1, x2));
    if (fran > till) return false;
    // Lägsta punkten på den del av balken som ligger över farleden.
    const yVid = x => Math.abs(x2 - x1) < 1e-9 ? Math.min(y1, y2) : y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    return Math.min(yVid(fran), yVid(till)) < f.y - 1e-9;
}

// Pelare står över vattnet (inte på land och inte i farleden).
function pelareTillaten(x, y) {
    const f = bana.farled;
    return !!bana.pelare && x > 0 && x < bana.spann && tillaten(x, y) && !(f && x >= f.x0 && x <= f.x1);
}

// Sätter en pelare i punkten (en knutpunkt som redan finns blir pelare),
// eller tar bort den som står där. Pelaren har ett glidlager överst, som
// brolagren: annars låser två pelare balken emellan i sidled och den kan
// hänga som en lina.
function vaxlaPelare(x, y) {
    const i = nodVid(x, y), n = ritning.noder[i];
    if ((n && n.fast && !n.pelare) || !pelareTillaten(x, y)) return false;
    andra(() => {
        if (!n) ritning.noder.push({ x, y, fast: true, styv: false, pelare: true, lager: 'glid' });
        else if (n.pelare) { n.fast = false; n.styv = true; delete n.pelare; delete n.lager; stada(); }
        else Object.assign(n, { fast: true, styv: false, pelare: true, lager: 'glid' });
    });
    vald = -1; valdNod = null;
    return true;
}

const rutnat = () => bana.rutnat || 1;   // m mellan punkterna man bygger på
const maxZoom = () => bana.maxZoom || MAX_ZOOM;
const harMaterial = nyckel => (bana.material || ['limtra', 'stal']).includes(nyckel);
const arKabel = b => b.material === 'vajer';

// Längsta balken (eller kabeln, som får vara längre) på banan.
const maxLangd = kabel => kabel ? bana.maxKabel || 3 * (bana.maxLangd || MAX_LANGD) : bana.maxLangd || MAX_LANGD;

// Närmaste tillåtna rutnätspunkt, eller null.
function snappa(wx, wy) {
    const s = rutnat(), x = Math.round(wx / s) * s, y = Math.round(wy / s) * s;
    return tillaten(x, y) ? [x, y] : null;
}

function laggTillBalk(p, q) {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (L < 1e-6 || L > maxLangd(ritKabel) + 1e-6 || genomFarleden(p, q)) return false;
    andra(() => {
        const idx = ([x, y]) => {
            let i = nodVid(x, y);
            if (i < 0) { ritning.noder.push({ x, y, fast: false, styv: true }); i = ritning.noder.length - 1; }
            return i;
        };
        const a = idx(p), b = idx(q);
        const fanns = ritning.balkar.findIndex(k => (k.a === a && k.b === b) || (k.a === b && k.b === a));
        const balk = ritKabel ? { a, b, storlek, vag: false, material: 'vajer' } : { a, b, storlek, vag: ritVag, material: ritMaterial };
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
    vald = -1; valdNod = null;
}

// Riv en knutpunkt (inte fästen): balkarna i den och den själv.
function rivNod(i) {
    if (i < 0 || ritning.noder[i].fast) return;
    andra(() => {
        ritning.balkar = ritning.balkar.filter(b => b.a !== i && b.b !== i);
        stada();
    });
    vald = -1; valdNod = null;
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
    if (L < 1e-6 || L > maxLangd(arKabel(b)) + 1e-6 || genomFarleden([x, y], [annan.x, annan.y])) return false;
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
        const annan = ritning.noder[b.a === i ? b.b : b.a];
        if (langd({ x, y }, annan) > maxLangd(arKabel(b)) + 1e-6 || genomFarleden([x, y], [annan.x, annan.y])) return false;
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

// Brolagren är alltid ledade.
function vaxlaForband(i) {
    if (ritning.noder[i].lager) return;
    andra(() => { ritning.noder[i].styv = !ritning.noder[i].styv; });
}

const kostnad = () => ritningensKostnad(ritning, bana);

// Spelets pengar: $$ (påhittad valuta).
const kr = v => v.toLocaleString('sv-SE') + ' $$';

// ---------- Skärmen ----------

const infoLuft = () => infoEl.offsetTop + infoEl.offsetHeight + 4;
const staende = () => !matchMedia('(orientation: landscape)').matches;
let luftNu = 0;
let valjareHojd = 0;          // stående: panelens största höjd hittills (den hålls)

// Luften ovanför banan: infotexten (panelen ligger under spelytan).
const beraknaLuft = infoLuft;

function anpassa() {
    scen.style.setProperty('--info', infoLuft() + 'px');
    luftNu = beraknaLuft();
    dpr = window.devicePixelRatio || 1;
    const w = scen.clientWidth, h = scen.clientHeight;
    duk.width = Math.round(w * dpr);
    duk.height = Math.round(h * dpr);
    duk.style.width = w + 'px';
    duk.style.height = h + 'px';
    // Luft för infotexten upptill. Hela bana.vy ska synas, och blir det
    // höjd över (mobilen står) går det mesta (85 %) till himlen: banan står
    // långt ner med lite vatten under, och rutor och text får plats ovanför.
    const vy = bana.vy, luft = luftNu;
    const sk = Math.min(w / (vy.x1 - vy.x0), (h - luft) / (vy.y1 - vy.y0));
    const over = h - luft - sk * (vy.y1 - vy.y0);
    const oy = luft + over * 0.85 + sk * vy.y1, cy = (oy - (luft + h) / 2) / sk;
    const cx = (vy.x0 + vy.x1) / 2;
    const hw = w / 2 / sk, hh = (h - luft) / 2 / sk;
    bas = { sk, cx, cy, B: { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh } };
    sattKamera();
}

// Kameran från zoom och mitt. Vyn hålls inom det som syns utan zoom.
function sattKamera() {
    const w = scen.clientWidth, h = scen.clientHeight, luft = luftNu;
    zoom = Math.max(1, Math.min(maxZoom(), zoom));
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
    zoom = Math.max(1, Math.min(maxZoom(), zoom * f));
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
    // Marken (markY i spel.js), punkt för punkt över skärmen, med gräs där
    // det är land eller dalens sluttningar (inte under vattnet).
    const djupt = h + 1000, steg = 2;
    const yta = [];
    for (let X = -steg; X <= w + steg; X += steg) {
        const g = markY(bana, (X - kam.ox) / kam.sk);
        yta.push([X, g, g === -Infinity ? djupt : Math.min(djupt, sy(g))]);
    }
    ctx.fillStyle = FARG.berg;
    ctx.beginPath();
    ctx.moveTo(-steg, djupt);
    for (const [X, , Y] of yta) ctx.lineTo(X, Y);
    ctx.lineTo(w + steg, djupt);
    ctx.fill();
    ctx.strokeStyle = FARG.gras;
    ctx.lineWidth = 0.25 * kam.sk;
    ctx.beginPath();
    let pa = false;
    for (const [X, g, Y] of yta) {
        const gront = g > -Infinity && (bana.dal || (g > bana.vatten + 0.1 && g > -0.6));
        if (gront) { if (pa) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        pa = gront;
    }
    ctx.stroke();
}

function ritaVatten(t) {
    const w = duk.width / dpr, h = duk.height / dpr;
    const y0 = sy(bana.vatten);
    if (bana.torr) return;                // dalens botten är mark
    ctx.fillStyle = FARG.vatten;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) {
        ctx.lineTo(x, y0 + Math.sin(x * 0.05 + t * 1.5) * 0.06 * kam.sk);
    }
    ctx.lineTo(w, h);
    ctx.fill();
}

// Pelarna: betong från botten, med en svart rund topp (glidlagret) som
// slutar precis under balkarna i knutpunkten (före vattnet, som ritas över).
function ritaPelare() {
    ritaFundament();
    if (!bana.pelare) return;
    const b = Math.max(4, 0.8 * kam.sk);
    ritning.noder.forEach((n, i) => {
        if (!n.pelare) return;
        const botten = sy(Math.max(bana.pelare.botten, markY(bana, n.x)));     // nära kanten: från marken
        const under = Math.max(0, ...ritning.balkar.filter(k => k.a === i || k.b === i)
            .map(k => profil(k.material || 'limtra', k.storlek).h / 2));
        const X = sx(n.x), topp = sy(n.y - under) + 1, Y = topp + b / 2;
        ctx.fillStyle = FARG.nod;
        ctx.beginPath(); ctx.arc(X, Y, b / 2, Math.PI, 0); ctx.fill();
        ctx.fillRect(X - b / 2, Y, b, b * 0.25);
        ctx.fillStyle = FARG.betong;
        ctx.fillRect(X - b / 2, Y + b * 0.25, b, botten - Y);
        ctx.fillStyle = FARG.betongMork;
        ctx.fillRect(X + b / 4, Y + b * 0.25, b / 4, botten - Y);
        ctx.fillRect(X - b, botten - b / 2, 2 * b, b / 2);
    });
}

// Fundamenten (fästen ute i vattnet): betong från botten upp till fästet.
// I en torr dal står fästet på sluttningen: ett kort block ner i marken.
function ritaFundament() {
    const botten0 = sy(bana.pelare ? bana.pelare.botten : bana.vatten - 6);
    for (const [x, y] of bana.fasten) {
        if (x <= 0 || x >= bana.spann) continue;
        const b = Math.max(10, 3 * rutnat() / 2 * kam.sk), X = sx(x), Y = sy(y);
        const botten = bana.torr ? sy(y - 1.5 * rutnat()) : botten0;
        ctx.fillStyle = FARG.betong;
        ctx.fillRect(X - b / 2, Y, b, botten - Y);
        ctx.fillStyle = FARG.betongMork;
        ctx.fillRect(X + b / 4, Y, b / 4, botten - Y);
        ctx.fillRect(X - b * 0.75, botten - b / 4, b * 1.5, b / 4);
    }
}

// Farleden: en streckad ruta där inget får byggas.
function ritaFarled() {
    const f = bana.farled;
    if (!f) return;
    const x0 = sx(f.x0), x1 = sx(f.x1), y = sy(f.y), h = duk.height / dpr;
    ctx.strokeStyle = 'rgba(208, 80, 60, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(x0, h); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, h); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(208, 80, 60, 0.9)';
    ctx.fillText('Farled', (x0 + x1) / 2, y + 6);
    ctx.textBaseline = 'alphabetic';
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
// En balk i byggläget, i materialets färger.
function ritaBalk(x1, y1, x2, y2, material, storlek, vag) {
    const [farg, kant] = FARG.material[material];
    ritaBit(x1, y1, x2, y2, profil(material, storlek), vag, farg, kant);
}

// Balkens tjocklek på skärmen (kablarna får vara smalare).
const bredd_ = prof => Math.max(prof.material === 'vajer' ? 1.5 : 3, prof.h * kam.sk);

function ritaBit(x1, y1, x2, y2, prof, vag, farg, kant) {
    const bredd = bredd_(prof);
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

function ritaNod(x, y, { fast, styv, lager, pelare }) {
    const r = Math.max(3.5, 0.13 * kam.sk);
    ctx.fillStyle = FARG.nod;
    // Glidlager: en svart rund nod (på en pelare är det pelarens topp, se
    // ritaPelare). Fast lager ritas som ett ledat fäste.
    if (lager === 'glid') {
        if (!pelare) { ctx.beginPath(); ctx.arc(sx(x), sy(y), r * 1.6, 0, 7); ctx.fill(); }
        return;
    }
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
    for (let x = o.x0; x <= o.x1; x += rutnat()) {
        for (let y = o.y0; y <= o.y1; y += rutnat()) {
            if (tillaten(x, y)) { ctx.beginPath(); ctx.arc(sx(x), sy(y), r, 0, 7); ctx.fill(); }
        }
    }
    for (const b of ritning.balkar) {
        const na = ritning.noder[b.a], nb = ritning.noder[b.b];
        ritaBalk(na.x, na.y, nb.x, nb.y, b.material || 'limtra', b.storlek, b.vag);
    }
    for (const n of ritning.noder) ritaNod(n.x, n.y, n);
    ritaVald();
    if (drag && !drag.pelare && (drag.till[0] !== drag.fran[0] || drag.till[1] !== drag.fran[1])) {
        const [x1, y1] = drag.fran, [x2, y2] = drag.till, max = maxLangd(ritKabel);
        const ok = Math.hypot(x2 - x1, y2 - y1) <= max + 1e-6;
        const mat = ritKabel ? 'vajer' : ritMaterial, vag = ritVag && !ritKabel;
        ctx.globalAlpha = 0.6;
        if (ok) ritaBalk(x1, y1, x2, y2, mat, storlek, vag);
        else ritaBit(x1, y1, x2, y2, profil(mat, storlek), vag, FARG.fel, FARG.fel);
        ctx.globalAlpha = 1;
        const L = Math.hypot(x2 - x1, y2 - y1);
        langdText(x1, y1, x2, y2, ok ? tal(L, 1) + ' m' : 'Längst ' + max + ' m', ok ? FARG.text : FARG.fel);
    }
    if (rattaAktiv()) {
        // Handtaget på den nya balkens startände, som bleknar bort.
        const n = ritning.noder[ritning.balkar[ratta.balk].a], r = Math.max(9, 0.3 * kam.sk);
        const kvar = RATTA_TID - (performance.now() - ratta.t) / 1000;
        ctx.globalAlpha = Math.min(1, kvar / 0.6);
        ctx.fillStyle = 'rgba(61, 139, 253, 0.35)';
        ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.fill();
        ctx.strokeStyle = '#3d8bfd'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

// Balkens längd medan man ritar eller flyttar, ovanför mitten (fingret
// skymmer änden).
function langdText(x1, y1, x2, y2, text, farg) {
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    const x = sx((x1 + x2) / 2), y = sy((y1 + y2) / 2) - 14;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = farg;
    ctx.fillText(text, x, y);
}

// Välj: den valda balken lyses upp och får handtag i ändarna, en vald
// knutpunkt eller pelare en ring.
// Medan man drar visas var balkarna hamnar.
function ritaVald() {
    const linje = (p, q) => {
        ctx.beginPath(); ctx.moveTo(sx(p.x), sy(p.y)); ctx.lineTo(sx(q.x), sy(q.y)); ctx.stroke();
    };
    ctx.lineCap = 'round';
    if (vald >= 0 && ritning.balkar[vald]) {
        const b = ritning.balkar[vald], na = ritning.noder[b.a], nb = ritning.noder[b.b];
        ctx.strokeStyle = 'rgba(61, 139, 253, 0.45)';
        ctx.lineWidth = bredd_(profil(b.material || 'limtra', b.storlek)) + 10;
        linje(na, nb);
        const r = Math.max(9, 0.3 * kam.sk);
        for (const n of [na, nb]) {
            ctx.fillStyle = 'rgba(61, 139, 253, 0.35)';
            ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.fill();
            ctx.strokeStyle = '#3d8bfd'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.stroke();
        }
    }
    if (verktyg === 'andra' && ritning.noder.includes(valdNod)) {
        const n = valdNod, r = Math.max(11, (n.pelare ? 0.4 : 0.3) * kam.sk);
        ctx.fillStyle = 'rgba(61, 139, 253, 0.35)';
        ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.fill();
        ctx.strokeStyle = '#3d8bfd'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.stroke();
    }
    if (!flytt) return;
    const till = { x: flytt.till[0], y: flytt.till[1] };
    const andar = [];       // [andra änden, längsta tillåtna]
    if (flytt.nod !== undefined) {
        for (const b of ritning.balkar) {
            if (b.a === flytt.nod) andar.push([ritning.noder[b.b], maxLangd(arKabel(b))]);
            else if (b.b === flytt.nod) andar.push([ritning.noder[b.a], maxLangd(arKabel(b))]);
        }
    } else {
        const b = ritning.balkar[flytt.balk];
        andar.push([ritning.noder[flytt.ande === 'a' ? b.b : b.a], maxLangd(arKabel(b))]);
    }
    const ok = andar.every(([n, max]) => langd(n, till) <= max + 1e-6);
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = ok ? '#3d8bfd' : FARG.fel;
    ctx.lineWidth = 3;
    for (const [n] of andar) linje(n, till);
    ctx.setLineDash([]);
    if (andar.length === 1) {
        const [n, max] = andar[0], L = langd(n, till);
        langdText(n.x, n.y, till.x, till.y, ok ? tal(L, 1) + ' m' : 'Längst ' + max + ' m', ok ? FARG.text : FARG.fel);
    }
    ctx.fillStyle = ok ? '#3d8bfd' : FARG.fel;
    ctx.beginPath(); ctx.arc(sx(till.x), sy(till.y), Math.max(5, 0.15 * kam.sk), 0, 7); ctx.fill();
}

// Medan keIWs bygger: de färdiga balkarna, och den som växer fram.
function ritaBygget() {
    const lage = byggLage(sim.bygge);
    ritning.balkar.forEach((b, i) => {
        if (!sim.bygge.klara.has(i)) return;
        const na = ritning.noder[b.a], nb = ritning.noder[b.b];
        ritaBalk(na.x, na.y, nb.x, nb.y, b.material || 'limtra', b.storlek, b.vag);
    });
    if (lage.vaxer) {
        const b = ritning.balkar[lage.vaxer.balk], [x1, y1] = lage.vaxer.fran;
        ritaBalk(x1, y1, x1 + (lage.x - x1), y1 + (lage.y - y1), b.material || 'limtra', b.storlek, b.vag);
    }
    ritning.noder.forEach(n => {
        if (n.fast || ritning.balkar.some((b, i) => sim.bygge.klara.has(i) && (ritning.noder[b.a] === n || ritning.noder[b.b] === n))) {
            ritaNod(n.x, n.y, n);
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
            ctx.lineWidth = bredd_(balk.prof) + 2;
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
        // Lagren står kvar på berget (glidlagret rör sig bara några dm).
        const [x, y] = n.lager ? [n.x, n.y] : lage(m, m.nodPunkt[i]);
        ritaNod(x, y, n);
    });
}

// ---------- keIWs ----------

const FIG = FIGUR_DATA.keiws;

// keIWs ritas lika stor på skärmen hur man än zoomar, och lite större än
// banans keiws-höjd: hans höjd i meter i bilden (fysiken bryr sig inte om
// storleken).
const KEIWS_BILD = 1.25;
const KEIWS_UTZOOMAD = 0.7;  // så stor som inzoomad (största zoom) när man ser hela banan
// keIWs ritas nästan lika stor på skärmen vid alla zoomnivåer: full storlek
// inzoomad, lite mindre utzoomad (jämnt emellan, räknat på log-zoom).
// Banans keiwsInzoomad gör honom större än så vid största zoom.
const keiwsBild = () => KEIWS_BILD * keiwsHojd(bana) / zoom
    * (KEIWS_UTZOOMAD + ((bana.keiwsInzoomad || 1) - KEIWS_UTZOOMAD) * Math.log(zoom) / Math.log(maxZoom()));

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

// Bilen (banor med `bil`): rektanglar [x0, h0, x1, h1, färg] i figurens
// pixlar, x från bilens mitt och h uppåt från vägen. keIWs sitter i den
// (fötterna 60 upp, benen döljs av karossen).
const BIL = [
    [-190, 40, 190, 150, '#d9503f'],      // karossen
    [-190, 40, 190, 65, '#a93a2d'],       // mörkare nedtill
    [-202, 50, -186, 80, '#5d6670'],      // stötfångare bak
    [186, 50, 202, 80, '#5d6670'],        // och fram
    [176, 112, 190, 134, '#f8d648'],      // strålkastare
    [-190, 112, -178, 134, '#ec78a8'],    // baklykta
    [80, 150, 92, 236, '#5d6670'],        // vindrutans ram
    [92, 150, 112, 228, '#b8defc'],       // vindrutan
    [-150, 0, -80, 70, '#262a31'],        // hjulen
    [80, 0, 150, 70, '#262a31']
];
const BIL_HJUL = [-115, 115];             // hjulens mitt

// Bilen med keIWs i, hjulen på vägen vid (x, y). fas: hjulnaven snurrar.
function ritaBil(x, y, rekt, fas, lyft) {
    const m = keiwsBild() / 204, s = m * kam.sk;      // meter och skärmpunkter per figurpixel
    ritaFigur(rekt, x - 10 * m, y + 60 * m, lyft);
    const X = sx(x), Y = sy(y);
    for (const [x0, h0, x1, h1, farg] of BIL) {
        ctx.fillStyle = farg;
        ctx.fillRect(X + x0 * s, Y - h1 * s, (x1 - x0) * s + 0.5, (h1 - h0) * s + 0.5);
    }
    ctx.fillStyle = '#8c909c';
    for (const c of BIL_HJUL) {
        const x0 = c + (fas ? -22 : 2);
        ctx.fillRect(X + x0 * s, Y - 47 * s, 20 * s + 0.5, 20 * s + 0.5);
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
    if (bana.bil && !(sim && sim.bygge)) {
        if (!k) { ritaBil(keiwsStart(bana), 0, ruta(FIG.idle, performance.now() / 1000), 0); return; }
        if (k.lage === 'plask') return;
        if (k.lage === 'klar') { ritaBil(k.x, k.y, ruta(FIG.rekordjubel, sim.t - sim.slutTid), 0); return; }
        if (k.lage === 'faller') { ritaBil(k.x, k.y, ruta(FIG.faller, sim.t), 0); return; }
        ritaBil(k.x, k.y, FIG.vrid[3], Math.floor(k.gatt / (0.15 * keiwsHojd(bana))) % 2);
        return;
    }
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
    if (!sim || sim.resultat !== 'vatten' || bana.torr) return;
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
    kabel: 'Dra mellan två punkter: kabel. Den tar bara drag (slaknar i tryck) och spänns så att vägen ligger rakt.',
    andra: 'Välj: tryck på en balk, knutpunkt eller pelare för att ändra eller riva den. Dra en knutpunkt för att flytta den.',
    andraPelare: 'Riv tar bort pelaren (knutpunkten blir kvar om balkar sitter i den).',
    andraNod: 'Dra knutpunkten för att flytta den, välj styv eller ledad, eller riv den med balkarna.',
    andraVald: 'Dra i en ände, eller byt typ, material eller storlek. Tryck på Väg eller Balk när inget är valt för att bygga.',
    pelare: 'Tryck på en punkt över vattnet: pelare från botten med glidlager (inte i farleden). Tryck igen: bort.',
    panorera: 'Panorera: dra med ett finger för att flytta vyn (zooma in först). Tryck på Bygg för att bygga igen.'
};

// Infotexten: bana, kostnad och en tredje rad (tips medan man bygger,
// utnyttjandet under provkörningen). Tre rader när mobilen står.
function uppdateraInfo() {
    const k = kostnad(), over = k > bana.budget;
    const pil = (v, t, av) => '<button data-v="' + v + '"' + (av ? ' disabled' : '') + '>' + t + '</button>';
    const bygger = lageNu === 'bygg';
    let tredje;
    if (varnaNasta) {
        tredje = '<span class="over">Ingen bro har hållit här än. Tryck › igen för att gå vidare ändå.</span>';
    } else if (!bygger && sim && sim.bygge) {
        tredje = 'keIWs bygger …';
    } else if (!bygger && sim) {
        tredje = sim.brott ? '<span class="over">Bron gick sönder</span>'
            : 'Högsta utnyttjande ' + Math.round(sim.maxU * 100) + ' %';
    } else {
        const n = ritning.noder.includes(valdNod) ? valdNod : null;
        tredje = TIPS[panoreraLage ? 'panorera' : verktyg === 'andra' ? (vald >= 0 ? 'andraVald' : n ? (n.pelare ? 'andraPelare' : 'andraNod') : 'andra') : ritPelare ? 'pelare' : ritKabel ? 'kabel' : ritVag ? 'vag' : 'balk'];
    }
    infoEl.innerHTML = '<div class="rad">' + pil('forra', '‹', !bygger || banaNr === 0)
        + '<b>Bana ' + (banaNr + 1) + ' · ' + bana.namn + ' (' + bana.spann + ' m)</b>'
        + pil('nasta', '›', !bygger || banaNr === BANOR.length - 1) + '</div>'
        + '<div class="rad"><span class="' + (over ? 'over' : '') + '">' + kr(k) + '</span> av ' + kr(bana.budget) + '</div>'
        + '<div class="rad tredje' + (bygger && !varnaNasta ? ' tips' : '') + '">' + tredje + '</div>';
    knappar.bygga.classList.toggle('vald', !panoreraLage);
    knappar.panorera.classList.toggle('vald', panoreraLage);
    knappar.kor.textContent = lageNu === 'bygg' ? 'Kör' : 'Stopp';
    knappar.kor.classList.toggle('stopp', lageNu !== 'bygg');
    for (const v of ['bygga', 'panorera']) knappar[v].disabled = lageNu !== 'bygg';
    knappar.angra.disabled = lageNu !== 'bygg' || !historik.length;
    visaValjare();
    if (beraknaLuft() !== luftNu) anpassa();
}

// Panelen, alltid framme medan man bygger (under spelytan när mobilen
// står, till höger när den ligger). Överst Välj och det man bygger (Väg,
// Balk, Kabel, Pelare), sedan material med Riv och Riv allt, och sist
// storleken (med profil och pris per meter). Med Välj gäller panelen den
// valda balken, knutpunkten eller pelaren, och är grå tills man valt något.
function visaValjare() {
    const valj = verktyg === 'andra';
    const valdBalk = valj && vald >= 0 ? ritning.balkar[vald] : null;
    const valdN = valj && ritning.noder.includes(valdNod) ? valdNod : null;
    valjareEl.classList.toggle('vilar', lageNu !== 'bygg');
    const gra = valj && !valdBalk && !valdN;
    const kabel = valdBalk ? arKabel(valdBalk) : !valj && ritKabel;
    const pelare = !valj && ritPelare;
    const vag = (valdBalk ? valdBalk.vag : !valj && ritVag) && !kabel && !pelare;
    const balk = (valdBalk ? !valdBalk.vag : !valj && !ritVag) && !kabel && !pelare;
    const st = valdBalk ? valdBalk.storlek : storlek;
    const mat = kabel ? 'vajer' : valdBalk ? valdBalk.material || 'limtra' : ritMaterial;
    const knapp = (data, text, arVald, av) => '<button ' + data + (arVald ? ' class="vald"' : '') + (av ? ' disabled' : '') + '>' + text + '</button>';
    // Välj, Väg, Balk, Kabel (från Älven, eller om den valda redan är en
    // kabel) och Pelare (banor med pelare), lika breda.
    const medKabel = harMaterial('vajer') || kabel, medPelare = !!bana.pelare && !valdBalk;
    const typ = '<div class="typ" style="grid-template-columns: repeat(' + (3 + medKabel + medPelare) + ', 1fr)">'
        + knapp('data-t="valj"', 'Välj', valj)
        + knapp('data-t="vag"', 'Väg', vag) + knapp('data-t="balk"', 'Balk', balk)
        + (medKabel ? knapp('data-t="kabel"', 'Kabel', kabel) : '') + (medPelare ? knapp('data-t="pelare"', 'Pelare', pelare || (valdN && valdN.pelare)) : '')
        + '</div>';
    // Material (eller vad som är valt) och Riv, Riv allt: gråa när det inte
    // finns något att riva.
    const kanRiva = valdBalk || (valdN && (valdN.pelare || !valdN.fast));
    const material = Object.entries(MATERIAL).filter(([nyckel, m]) => !m.kommer && m.typ !== 'vajer' && (harMaterial(nyckel) || nyckel === mat));
    const vanster = kabel || pelare || valdN
        ? '<span class="etikett">' + (valdN ? (valdN.pelare ? 'Pelare' : 'Knutpunkt') : kabel ? 'Kabel' : 'Pelare') + '</span>'
        : material.map(([nyckel, m]) => knapp('data-m="' + nyckel + '"', m.kort, nyckel === mat && !gra, gra)).join('');
    const rad2 = '<div class="material" style="grid-template-columns: ' + (kabel || pelare || valdN ? '1fr' : 'repeat(' + material.length + ', 1fr)') + ' auto auto">'
        + vanster
        + knapp('data-t="riv" class="riv"', 'Riv', false, !kanRiva)
        + knapp('data-t="rivallt" class="riv"', 'Riv allt', false, !ritning.balkar.length && !ritning.noder.some(n => n.pelare))
        + '</div>';
    let html;
    if (pelare || (valdN && valdN.pelare)) {
        const p = bana.pelare;
        html = typ + rad2 + '<p class="pelarinfo">' + (valdN
            ? 'Pelare ' + (valdN.y - p.botten) + ' m från botten: ' + kr(pelarensPris(bana, valdN.y)) + '. Riv tar bort den.'
            : 'Betongpelare från botten: ' + kr(p.pris) + ' + ' + kr(p.perMeter) + '/m (' + kr(pelarensPris(bana, 0))
              + ' upp till vägen), glidlager överst. Över vattnet, inte i farleden.') + '</p>';
    } else if (valdN) {
        // Knutpunkten: styv eller ledad (brolagren är alltid ledade).
        const lager = !!valdN.lager;
        html = typ + rad2 + '<div class="forband">'
            + knapp('data-fb="styv"', 'Styv', valdN.styv && !lager, lager) + knapp('data-fb="ledad"', 'Ledad', !valdN.styv || lager, lager)
            + '</div>';
    } else {
        // Storlekarna 1–6 på en rad, profilen och priset per meter längst till höger.
        const p = profil(mat, st);
        html = typ + rad2
            + '<div class="storlekar">' + STEGEN[mat].map((x, i) => knapp('data-s="' + i + '"', i + 1, !gra && i === st, gra)).join('')
            + '<span class="pris">' + (gra ? 'Välj något' : p.namn + '<br>' + kr(p.pris + (vag ? VAG.pris : 0)) + '/m') + '</span></div>';
    }
    if (valjareEl.innerHTML !== html) valjareEl.innerHTML = html;
    // Stående hålls panelens största höjd, så att spelytan inte hoppar.
    if (!staende()) { valjareHojd = 0; valjareEl.style.minHeight = ''; }
    else if (valjareEl.offsetHeight > valjareHojd) {
        valjareHojd = valjareEl.offsetHeight;
        valjareEl.style.minHeight = valjareHojd + 'px';
    }
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

// Inzoomad hoppar keIWs över bygget (virveln skulle flyga ur bild) och
// kameran följer honom över bron.
function kor() {
    doljRuta();
    sim = nySim(ritning, bana);
    byggVy = { zoom, mitt };
    if (zoom === 1) sim.bygge = nyttBygge();
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

// omladdning = false: ingen ny version laddas här (Nästa bana byter bana först).
function bygg(omladdning = true) {
    doljRuta();
    sim = null;
    lageNu = 'bygg';
    if (byggVy) {
        ({ zoom, mitt } = byggVy);
        byggVy = null;
        sattKamera();
    }
    rutaEl.style.top = '';
    rutaEl.style.left = '';
    uppdateraInfo();
    if (omladdning) laddaOmOmLugnt();
}

// ---------- Menyn ----------

// Förklaringen i menyn, i två delar: med vardagliga ord, och
// förutsättningarna för den som vill veta exakt. Tabellerna byggs ur
// material.js, så nya material blir nya kolumner (gråade så länge de inte
// finns i spelet).

const LEKMAN_TEXT = `
<ul>
<li><b>Alla balkar böjer sig</b> lite när de bär. En större balk böjer sig
mindre och tål mer, men är tyngre och dyrare.</li>
<li><b>Trä är billigt och lätt, stål är starkt och dyrt.</b> Nya material
dyker upp på senare banor.</li>
<li><b>Betong</b> är billig och tål mycket tryck, men är tung. Bra i bågar
och höga pyloner som trycks ihop.</li>
<li><b>Kablar</b> (från Älven) kan bara dra, som ett rep. Trycker man på
dem slaknar de. Häng upp vägen i kablar från höga pyloner, så klarar du
långa spann.</li>
<li><b>Bron måste först bära sin egen vikt</b>, balkarna och vägen. Sedan
går keIWs över.</li>
<li><b>Från Älven kör keIWs bil.</b> Den väger ett ton, tio gånger så mycket
som keIWs, så vägen måste vara starkare.</li>
<li><b>Färgerna</b> visar hur hårt varje bit jobbar: grönt är lugnt, gult är
mycket och rött nästan för mycket. Över 100 % går biten sönder.</li>
<li><b>Långa smala balkar som trycks ihop kan knäckas</b>, som ett sugrör
man trycker på. Kortare eller grövre balkar knäcks inte lika lätt.</li>
<li><b>Bygg trianglar.</b> En triangel kan inte tryckas sned, så balkarna i
ett fackverk dras eller trycks i stället för att böjas. Då räcker små
balkar långt.</li>
<li><b>Styv knut</b> (fyrkant): balkarna sitter ihop och vrider sig
tillsammans. <b>Ledad knut</b> (ring): de vrider sig fritt, som ett
gångjärn. Tryck på en knut för att byta.</li>
<li><b>Vid vägens ändar står bron på lager</b>, som riktiga broar: den ena
änden sitter fast och den andra står på rullar. Övriga fästen sitter
fast.</li>
</ul>`;

// Materialens egenskaper: [nyckel, rubrik, enhet, omräkning].
const EGENSKAPER = [
    ['E', 'E', 'MPa', v => v / 1e6],
    ['E05', 'E<sub>05</sub>', 'MPa', v => v / 1e6],
    ['fm', 'f<sub>m</sub> böjning', 'MPa', v => v / 1e6],
    ['ft', 'f<sub>t</sub> drag', 'MPa', v => v / 1e6],
    ['fc', 'f<sub>c</sub> tryck', 'MPa', v => v / 1e6],
    ['fv', 'f<sub>v</sub> skjuvning', 'MPa', v => v / 1e6],
    ['fy', 'f<sub>y</sub> sträckgräns', 'MPa', v => v / 1e6],
    ['fu', 'f<sub>u</sub> brottgräns', 'MPa', v => v / 1e6],
    ['densitet', 'Densitet', 'kg/m³', v => v],
    ['prisM3', 'Pris', '$$/m³', v => v]
];

const tal = (v, d = 0) => v.toLocaleString('sv-SE', { maximumFractionDigits: d });
const kommerKlass = mat => mat.kommer ? ' class="kommer"' : '';

function nordText() {
    const mats = Object.values(MATERIAL);
    const huvud = mats.map(m => '<th' + kommerKlass(m) + '>' + m.namn + (m.kommer ? '<br><small>kommer</small>' : '') + '</th>').join('');
    const egenskaper = EGENSKAPER.filter(([k]) => mats.some(m => m[k] !== undefined)).map(([k, rubrik, enhet, om]) =>
        '<tr><th>' + rubrik + ' <small>' + enhet + '</small></th>'
        + mats.map(m => '<td' + kommerKlass(m) + '>' + (m[k] !== undefined ? tal(om(m[k]), 1) : '–') + '</td>').join('') + '</tr>').join('');
    const typer = [...new Set(mats.map(m => m.typ))];
    const brott = typer.map(t => {
        const m = mats.find(x => x.typ === t);
        return '<p' + kommerKlass(m) + '><b>' + { tra: 'Trä', stal: 'Stål', betong: 'Betong', vajer: 'Kabel' }[t] + '</b></p><ul'
            + kommerKlass(m) + '>' + BROTTREGLER[t].map(r => '<li>' + r + '</li>').join('') + '</ul>';
    }).join('');
    const steg = Array.from({ length: ANTAL_STEG }, (_, k) => k);
    const profiler = Object.keys(PROFILER).map(nyckel => steg.map((s, i) => {
        const p = profil(nyckel, s);
        return '<tr' + kommerKlass(MATERIAL[nyckel]) + '>' + (i ? '' : '<th rowspan="' + steg.length + '">' + MATERIAL[nyckel].namn.split(' ')[0] + '</th>')
            + '<td class="v">' + (s + 1) + '</td><td class="v">' + p.namn + '</td><td>' + tal(p.massa, 1) + '</td><td>' + tal(p.pris) + '</td></tr>';
    }).join('')).join('');
    return `
<h4>Modellen</h4>
<ul>
<li>Varje balk delas i balkelement på ca 0,75 m (Euler–Bernoulli; längre
på de stora banorna): de tar drag, tryck, böjning och tvärkraft.</li>
<li>En kabel är ett enda rakt element utan böjstyvhet som bara tar drag (i
tryck slaknar den). Kablar som bär vägen spänns vid bygget: deras
längd justeras tills vägen ligger där den är ritad under egentyngden.</li>
<li>Korotationella element: stora rörelser och rotationer (bron får rasa),
små töjningar, linjärt elastiskt material. Linverkan kommer med där
balkarna sitter fast i båda ändar.</li>
<li>Newmark (120 steg/s) med Newton–Raphson i varje steg, lite dämpning.
Massan klumpas i knutpunkterna.</li>
<li>Styvt förband: delad vridning, moment förs över. Ledat: fri vridning.
Vägbanans fästen är brolager, alltid ledade: vänster fast (låser x och
y), höger glidlager (låser bara y). Övriga fästpunkter (i berget och på
land) låser x och y och kan vara styva eller ledade.</li>
</ul>
<h4>Laster</h4>
<table class="tabell">
<tr><th>g</th><td>${G}</td><td class="v">m/s²</td></tr>
<tr><th>Vägbana</th><td>${VAG.massa}</td><td class="v">kg/m</td></tr>
<tr><th>Förband</th><td>${FORBAND.massa.ledat}/${FORBAND.massa.styvt}</td><td class="v">kg/st, ledat/styvt</td></tr>
<tr><th>keIWs</th><td>${KEIWS_MASSA}</td><td class="v">kg, rörlig last</td></tr>
<tr><th>Bil</th><td>${BIL_MASSA}</td><td class="v">kg från Älven, två hjul ${tal(BIL_AXEL, 1)} m isär</td></tr>
</table>
<p>Egentyngden räknas statiskt (bron är färdigbyggd och står still), sedan
går keIWs över och resten räknas dynamiskt.</p>
<h4>Material</h4>
<div class="rulla"><table class="tabell">
<tr><th></th>${huvud}</tr>
${egenskaper}
</table></div>
<h4>Brott</h4>
${brott}
<p>Ett element som går sönder försvinner, en balk som knäcks går av på mitten.</p>
<h4>Profiler</h4>
<div class="rulla"><table class="tabell">
<tr><th></th><th class="v">Storlek</th><th class="v">Profil</th><th>kg/m</th><th>$$/m</th></tr>
${profiler}
</table></div>
<h4>Förenklingar</h4>
<ul>
<li>Ingen skjuvdeformation (Timoshenko).</li>
<li>Ingen vippning eller knäckning ut ur planet (stålets HEA-balkar knäcks bara kring den styva axeln).</li>
<li>Inga partialkoefficienter eller lastkombinationer som i Eurokod.</li>
<li>Betong räknas som ett homogent armerat tvärsnitt (ingen sprickbildning).</li>
<li>Kablarna hänger inte i en kedjelinje mellan fästena (ingen egen nedböjning).</li>
</ul>`;
}

function visaMeny() {
    const b = lasBasta(banaNr);
    const basta = b
        ? '<p>Billigaste bron som höll: <b>' + kr(b.kostnad) + '</b>'
            + (b.kostnad > bana.budget ? ' (över budget)' : '') + '.</p>'
            + '<button data-v="hamta"' + (lageNu === 'bygg' ? '' : ' disabled') + '>Hämta den ritningen</button>'
        : '<p>Ingen bro har hållit här än.</p>';
    menyEl.firstChild.innerHTML = '<button class="stang" data-v="stang">✕</button>'
        + '<h2>Brobyggare</h2>'
        + '<h3>Bana ' + (banaNr + 1) + ' · ' + bana.namn + ' (budget ' + kr(bana.budget) + ')</h3>' + basta
        + (FELSOK ? '<p><button data-v="dela">Dela konstruktionen (test)</button></p>' : '')
        + '<details><summary>Hur funkar det?</summary>' + LEKMAN_TEXT + '</details>'
        + '<details><summary>Förutsättningar – för nördar</summary>' + nordText() + '</details>'
        + '<p class="liten">Version ' + (version || 'okänd') + '</p>';
    menyEl.classList.remove('dold');
}

const menyOppen = () => !menyEl.classList.contains('dold');

// Felsökning: konstruktionen som text (version, bana, ritning och senaste
// provkörningen) som kopieras och visas i menyn, så att den kan klistras in
// i en chatt och återskapas exakt.
function delaKonstruktion(knapp) {
    const text = 'BROBYGGARE ' + JSON.stringify({
        version, bana: banaNr, namn: bana.namn, kostnad: kostnad(), ritning,
        prov: sim && sim.resultat ? { resultat: sim.resultat, brott: sim.brott, maxU: Math.round(sim.maxU * 100) / 100 } : null
    });
    let ruta = menyEl.querySelector('.dela');
    if (!ruta) {
        ruta = document.createElement('textarea');
        ruta.className = 'dela';
        ruta.readOnly = true;
        knapp.parentNode.after(ruta);
    }
    ruta.value = text;
    ruta.select();
    const klart = () => { knapp.textContent = 'Kopierad – klistra in i chatten'; };
    try {
        navigator.clipboard.writeText(text).then(klart, () => { knapp.textContent = 'Markera och kopiera texten'; });
    } catch (e) { knapp.textContent = 'Markera och kopiera texten'; }
}

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
    if (b.dataset.v === 'dela') { delaKonstruktion(b); return; }
    if (b.dataset.v === 'hamta') {
        const basta = lasBasta(banaNr);
        if (basta && lageNu === 'bygg') {
            andra(() => { ritning = uppgradera(JSON.parse(JSON.stringify(basta.ritning))); vald = -1; valdNod = null; });
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
        visaRuta('Bron höll!<br>keIWs kom över.',
            'Kostnad ' + kr(k) + ' – ' + (under ? 'under' : '<span class="over">över</span>') + ' budget'
            + '<br>Högsta utnyttjande ' + Math.round(sim.maxU * 100) + ' %'
            + (basta ? '<br><b>Din billigaste bro hittills på den här banan!</b>' : ''),
            [['bygg', 'Bygg vidare'], banaNr < BANOR.length - 1 ? ['nasta', 'Nästa bana'] : ['kor', 'Kör igen']]);
    } else {
        visaRuta(bana.torr ? 'Aj!<br>keIWs ramlade ner i dalen.' : 'Plask!<br>keIWs ramlade i vattnet.', sim.brott ? 'Bron gick sönder.' : 'Vägen räckte inte hela vägen över.',
            [['bygg', 'Bygg om'], ['kor', 'Kör igen']]);
    }
    placeraRuta();
}

// Rutan ska inte skymma keIWs (som jublar på andra sidan): ligger han
// under den flyttas den upp ovanför hans huvud, men inte upp i infotexten.
// Räcker inte höjden (liggande mobil) flyttas den åt sidan i stället.
function placeraRuta() {
    rutaEl.style.top = '';
    rutaEl.style.left = '';
    const k = sim && sim.keiws;
    if (!k || k.lage === 'plask' || rutaEl.classList.contains('dold')) return;
    const fig = keiwsBild() * kam.sk, huvud = sy(k.y) - fig * 1.35;     // med plats för hoppen
    const b = rutaEl.getBoundingClientRect(), s = scen.getBoundingClientRect();
    const vanster = b.left - s.left, hoger = b.right - s.left, nere = b.bottom - s.top;
    if (sx(k.x) + fig / 2 < vanster || sx(k.x) - fig / 2 > hoger || nere < huvud) return;
    const topp = huvud - 10 - b.height;
    const info = infoLuft();
    if (topp >= info + 8) { rutaEl.style.top = topp + b.height / 2 + 'px'; return; }
    const kx = sx(k.x), bredd = scen.clientWidth;
    const fore = kx - fig * 0.9 - b.width, efter = kx + fig * 0.9;   // med plats för konfettin
    if (fore >= 8) rutaEl.style.left = fore + b.width / 2 + 'px';
    else if (efter + b.width <= bredd - 8) rutaEl.style.left = efter + b.width / 2 + 'px';
    else rutaEl.style.top = info + 8 + b.height / 2 + 'px';
}

document.getElementById('verktyg').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const v = b.dataset.v;
    if (v === 'bygga') panoreraLage = false;
    else if (v === 'panorera') panoreraLage = true;
    else if (v === 'angra' && historik.length) { ritning = uppgradera(JSON.parse(historik.pop())); vald = -1; valdNod = null; ratta = null; sparaRitning(); }
    else if (v === 'kor') { if (lageNu === 'bygg') kor(); else bygg(); }
    uppdateraInfo();
});

valjareEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || lageNu !== 'bygg') return;
    const valdBalk = verktyg === 'andra' && vald >= 0 ? ritning.balkar[vald] : null;
    const valdN = verktyg === 'andra' && ritning.noder.includes(valdNod) ? valdNod : null;
    const t = b.dataset.t;
    // Välj, Väg, Balk, Kabel och Pelare bygger (inte panorerar). Utan något
    // valt går man från Välj till att bygga med det man tryckte på.
    if (t && t !== 'riv' && t !== 'rivallt') {
        panoreraLage = false;
        if (t !== 'valj' && !valdBalk) { verktyg = 'rita'; vald = -1; valdNod = null; }
    }
    if (t === 'valj') {
        verktyg = verktyg === 'andra' ? 'rita' : 'andra';
        vald = -1; valdNod = null;
    }
    else if (t === 'riv') {
        if (valdBalk) rivBalk(vald);
        else if (valdN && valdN.pelare) vaxlaPelare(valdN.x, valdN.y);      // knutpunkten blir kvar om balkar sitter i den
        else if (valdN) rivNod(ritning.noder.indexOf(valdN));
    }
    else if (b.dataset.fb) {
        const styv = b.dataset.fb === 'styv', i = ritning.noder.indexOf(valdN);
        if (valdN && valdN.styv !== styv) vaxlaForband(i);
    }
    else if (b.dataset.t === 'rivallt') {
        andra(() => { ritning = nyRitning(bana); });     // går att ångra
        vald = -1; valdNod = null;
    }
    else if (b.dataset.t === 'pelare') ritPelare = true;
    else if (b.dataset.t === 'kabel') {
        ritPelare = false;
        if (valdBalk) { if (!arKabel(valdBalk)) andra(() => { valdBalk.material = 'vajer'; valdBalk.vag = false; }); }
        else ritKabel = true;
    } else if (b.dataset.t) {
        // Väg eller balk (en kabel blir en balk i det material man ritar med).
        const vag = b.dataset.t === 'vag';
        ritPelare = false;
        if (valdBalk) {
            if (valdBalk.vag !== vag || arKabel(valdBalk)) {
                andra(() => { valdBalk.vag = vag; if (arKabel(valdBalk)) valdBalk.material = ritMaterial; });
            }
        } else { ritVag = vag; ritKabel = false; }
    } else if (b.dataset.m) {
        const m = b.dataset.m;
        if (valdBalk) { if ((valdBalk.material || 'limtra') !== m) andra(() => { valdBalk.material = m; }); }
        else ritMaterial = m;
    } else if (b.dataset.s !== undefined) {
        const s = +b.dataset.s;
        if (valdBalk) { if (valdBalk.storlek !== s) andra(() => { valdBalk.storlek = s; }); }
        else storlek = s;
    }
    uppdateraInfo();
});

infoEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    // Alla banor är öppna, men den som går vidare utan en bro som höll får
    // en varning först (ett tryck till går vidare).
    if (b.dataset.v === 'nasta' && !varnaNasta && !lasBasta(banaNr)) {
        varnaNasta = true;
        uppdateraInfo();
        return;
    }
    varnaNasta = false;
    bytBana(banaNr + (b.dataset.v === 'nasta' ? 1 : -1));
});

// Varningen försvinner vid allt annat man trycker på.
document.addEventListener('pointerdown', e => {
    if (varnaNasta && !e.target.closest('#info [data-v=nasta]')) {
        varnaNasta = false;
        uppdateraInfo();
    }
}, true);

rutaEl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.v === 'kor') kor();
    else if (b.dataset.v === 'nasta') { bygg(false); bytBana(banaNr + 1); }
    else bygg();
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

// Närmaste knutpunkt inom `max` m (utan fästpunkterna, om inte medFasten), eller -1.
function narmasteNod(wx, wy, max, medFasten = false) {
    let bast = -1, bastD = max;
    ritning.noder.forEach((n, i) => {
        const d = Math.hypot(wx - n.x, wy - n.y);
        if ((medFasten || !n.fast) && d < bastD) { bastD = d; bast = i; }
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
    // Panorera: ett finger flyttar vyn var man än trycker.
    if (panoreraLage) {
        panorera = { p: iDuken(e), mitt: vynsMitt() };
        return;
    }
    const [wx, wy] = tillVarld(e);
    const nara = Math.max(0.45, 22 / kam.sk);
    // Utanför rutnätet (även nere i berget) flyttar ett finger vyn (när man
    // har zoomat in).
    const o = bana.omrade;
    const iBerget = [wx - nara, wx + nara].every(x => wy < markY(bana, x) - nara);
    if (iBerget || wx < o.x0 - nara || wx > o.x1 + nara || wy < o.y0 - nara || wy > o.y1 + nara) {
        panorera = { p: iDuken(e), mitt: vynsMitt() };
        return;
    }
    if (verktyg === 'andra') {
        // Först handtagen på den valda balken, sedan knutpunkterna (ett tryck
        // väljer, ett drag flyttar), annars väljs balken man tryckte på.
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
        valdNod = ritning.noder.find(n => n.pelare && Math.hypot(wx - n.x, wy - n.y) < nara * 0.8) || null;
        vald = valdNod ? -1 : narmasteBalk(wx, wy, Math.max(0.4, 16 / kam.sk));
        uppdateraInfo();
        return;
    }
    // En ny balk som började i en ny punkt: startänden går att dra rätt en
    // kort stund (det är den som är svår att träffa).
    if (rattaAktiv()) {
        const n = ritning.noder[ritning.balkar[ratta.balk].a];
        if (Math.hypot(wx - n.x, wy - n.y) < nara) {
            flytt = { balk: ratta.balk, ande: 'a', till: [n.x, n.y] };
            ratta = null;
            return;
        }
    }
    ratta = null;
    // Pelare: ett tryck på en punkt sätter eller tar bort en.
    if (ritPelare) {
        const p = snappa(wx, wy);
        if (p) drag = { fran: p, till: p, pelare: true };
        return;
    }
    // Nära en knutpunkt eller ett fäste börjar balken där, annars i
    // närmaste punkt (man bygger nästan alltid vidare på något).
    const nod = narmasteNod(wx, wy, Math.max(rutnat() / 2, START_NARA / kam.sk), true);
    const p = nod >= 0 ? [ritning.noder[nod].x, ritning.noder[nod].y] : snappa(wx, wy);
    if (p) drag = { fran: p, till: p };
});

const rattaAktiv = () => ratta && lageNu === 'bygg' && verktyg === 'rita' && ritning.balkar[ratta.balk]
    && performance.now() - ratta.t < RATTA_TID * 1000;

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
        if (f.nod !== undefined) {
            // Ett tryck väljer knutpunkten, ett drag flyttar (och väljer) den.
            const n = ritning.noder[f.nod];
            if (n.x !== f.till[0] || n.y !== f.till[1]) flyttaNod(f.nod, f.till);
            valdNod = ritning.noder.includes(n) ? n : null;
            vald = -1;
        }
        else {
            // Ett tryck på den valda balkens ände väljer knutpunkten där.
            const n = ritning.noder[ritning.balkar[f.balk][f.ande]];
            if (n.x !== f.till[0] || n.y !== f.till[1]) flyttaAnde(f.balk, f.ande, f.till);
            else if (verktyg === 'andra') { valdNod = n; vald = -1; }
        }
        if (verktyg === 'rita') vald = -1;
        uppdateraInfo();
        return;
    }
    if (!drag) return;
    const { fran, till, pelare } = drag;
    drag = null;
    if (pelare) {
        if (fran[0] === till[0] && fran[1] === till[1]) vaxlaPelare(...fran);
        uppdateraInfo();
    } else if (fran[0] === till[0] && fran[1] === till[1]) {
        // Ett tryck på en knutpunkt: växla mellan styvt och ledat.
        const i = nodVid(fran[0], fran[1]);
        if (i >= 0) vaxlaForband(i);
    } else {
        const nyPunkt = nodVid(fran[0], fran[1]) < 0;
        if (laggTillBalk(fran, till) && nyPunkt) ratta = { balk: ritning.balkar.length - 1, t: performance.now() };
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

// Inzoomad följer kameran keIWs mjukt (utom medan man håller i vyn).
function foljKeiws(dt) {
    const k = sim.keiws, [cx, cy] = mitt || vynsMitt();
    const f = Math.min(1, dt * 4);
    // Mitt på figuren som den ritas (den är lika stor på skärmen hur man
    // än zoomar, så keiwsHojd i meter blir för högt när man zoomat in).
    mitt = [cx + (k.x - cx) * f, cy + (k.y + keiwsBild() * 0.6 - cy) * f];
    sattKamera();
}

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
        if (zoom > 1 && !pekare.size) foljKeiws(dt);
        if (Math.round(nu / 250) !== Math.round((nu - dt * 1000) / 250)) uppdateraInfo();
    } else {
        ackumulerat = 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ritaBakgrund();
    if (lageNu === 'bygg') ritaFarled();
    ritaPelare();
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
        set ritning(r) { ritning = uppgradera(r); historik = []; sparaRitning(); uppdateraInfo(); },
        get sim() { return sim; },
        get lage() { return lageNu; },
        get kam() { return kam; },
        get zoom() { return zoom; },
        get mitt() { return mitt; },
        get vald() { return vald; },
        get ratta() { return ratta; },
        get keiwsPx() { return keiwsBild() * kam.sk; },
        get ritMaterial() { return ritMaterial; },
        get verktyg() { return verktyg; },
        get panorera() { return panoreraLage; },
        get banaNr() { return banaNr; },
        get bygger() { return !!(sim && sim.bygge); },
        get version() { return version; },
        get historik() { return historik.length; },
        nyVersion() { laddaOmSen = true; laddaOmOmLugnt(); },
        kostnad, kor, bygg, bytBana, byggKlart, losningsRitning: () => losningsRitning(bana)
    };
}
