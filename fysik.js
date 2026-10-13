// Fysiken: en liten FE-lösare i 2D för broarna.
//
// Varje balk delas i korta balkelement (Euler–Bernoulli) med tre
// frihetsgrader per nod: x, y och vridning. Elementen räknas
// korotationellt. Varje element är linjärt i sitt eget koordinatsystem, som
// följer med när elementet flyttar sig och vrider sig. Då klarar lösaren
// stora förskjutningar och ras.
//
// Tidsstegning: implicit Newmark med lite numerisk dämpning (γ > 1/2), och
// Newton–Raphson i varje steg. Ekvationerna löses med bandad Cholesky,
// efter att frihetsgraderna numrerats om (Cuthill–McKee) för ett smalt band.
//
// Brott kontrolleras efter varje steg: spänning (N/A + M/W, skjuvning) per
// element och knäckning (Euler) per balk. Ett element som går sönder tas
// bort, och bron räknas vidare utan det.
//
// Enheter: SI (m, kg, s, N, Pa). y är uppåt.

const G = 10;                 // m/s², avrundat (keIWs 100 kg = 1 kN)
const ELEMENT_LANGD = 0.75;   // m, ungefärlig längd på elementen i en balk
const NEWMARK_BETA = 0.3025;  // (γ + 1/2)² / 4
const NEWMARK_GAMMA = 0.6;    // > 1/2 dämpar bort de högsta frekvenserna
const DAMPNING = 0.4;         // 1/s, massproportionell dämpning
const MAX_ITER = 8;
const TOL = 1e-7;             // m, Newton är klar när ändringen är mindre
const SLAK = 1e-6;            // en slak kabel (i tryck) har så här lite av sin styvhet kvar

// Ritningen → en beräkningsmodell.
//
// ritning.noder:  [{x, y, fast, styv, lager}]  fast = fästpunkt i berget,
//                  lager 'glid' = rör sig fritt i x
// ritning.balkar: [{a, b, storlek, vag, material}]
//
// Ett styvt förband delar vridningen mellan balkändarna. Ett ledat ger varje
// balkände en egen vridning. En styv fästpunkt är inspänd (vridningen låst).
// En kabel är ett enda rakt element utan böjstyvhet som bara tar drag (den
// slaknar i tryck), och den bryr sig inte om förbandets vridning.
// elLangd: ungefärlig elementlängd (längre på de stora banorna).
function byggModell(ritning, elLangd = ELEMENT_LANGD) {
    const punkter = [];     // FE-noder: {x0, y0, fast}
    const rotFast = [];     // per vridningsfrihetsgrad: låst?
    const element = [];
    const balkar = [];

    const nyRot = fast => { rotFast.push(!!fast); return rotFast.length - 1; };
    const nodPunkt = ritning.noder.map(n => {
        punkter.push({ x0: n.x, y0: n.y, fast: !!n.fast, glid: n.lager === 'glid', forband: !n.fast });
        return punkter.length - 1;
    });
    // Knutpunkter där bara kablar sitter har ingen vridning (den vore lös).
    const kabel = b => MATERIAL[b.material || 'limtra'].typ === 'vajer';
    const medBalk = new Set();
    for (const b of ritning.balkar) if (!kabel(b)) { medBalk.add(b.a); medBalk.add(b.b); }
    const nodRot = ritning.noder.map((n, i) => n.styv && !n.lager && medBalk.has(i) ? nyRot(n.fast) : -1);
    let rotKabel = -1;      // en låst vridning som alla kablar delar

    ritning.balkar.forEach((b, bi) => {
        const na = ritning.noder[b.a], nb = ritning.noder[b.b];
        const material = b.material || 'limtra';
        const prof = profil(material, b.storlek), mat = MATERIAL[material];
        const dx = nb.x - na.x, dy = nb.y - na.y, L = Math.hypot(dx, dy);
        const slak = kabel(b);
        if (slak && rotKabel < 0) rotKabel = nyRot(true);
        const n = slak ? 1 : Math.max(2, Math.ceil(L / elLangd));
        const andRot = i => slak ? rotKabel : nodRot[i] >= 0 ? nodRot[i] : nyRot(false);
        const pts = [nodPunkt[b.a]], rots = [andRot(b.a)];
        for (let k = 1; k < n; k++) {
            punkter.push({ x0: na.x + dx * k / n, y0: na.y + dy * k / n, fast: false });
            pts.push(punkter.length - 1);
            rots.push(nyRot(false));
        }
        pts.push(nodPunkt[b.b]);
        rots.push(andRot(b.b));

        const balk = {
            L, prof, mat, vag: !!b.vag, element: [], uk: 0, knackt: false,
            Pcr: Math.PI ** 2 * (mat.E05 || mat.E) * prof.I / (L * L)
        };
        for (let k = 0; k < n; k++) {
            balk.element.push(element.length);
            element.push({
                i: pts[k], j: pts[k + 1], ri: rots[k], rj: rots[k + 1],
                L0: L / n, b0: Math.atan2(dy, dx), balk: bi, vag: !!b.vag, slak,
                EA: mat.E * prof.A, EI: mat.E * prof.I,
                dod: false, N: 0, M1: 0, M2: 0, V: 0, u: 0
            });
        }
        balkar.push(balk);
    });

    const np = punkter.length, ntot = 2 * np + rotFast.length;
    const m = {
        np, ntot, punkter, element, balkar, nodPunkt,
        X0: new Float64Array(2 * np),
        q: new Float64Array(ntot), v: new Float64Array(ntot), a: new Float64Array(ntot),
        qn: new Float64Array(ntot), vn: new Float64Array(ntot), an: new Float64Array(ntot),
        massa: new Float64Array(ntot),
        last: new Float64Array(ntot),   // yttre laster utöver tyngden (N)
        fint: new Float64Array(ntot),
        fri: new Uint8Array(ntot),
        tyngd: 1,                       // 0–1, tyngden läggs på gradvis
        t: 0
    };
    punkter.forEach((p, i) => {
        m.X0[2 * i] = p.x0; m.X0[2 * i + 1] = p.y0;
        m.fri[2 * i] = p.fast && !p.glid ? 0 : 1;
        m.fri[2 * i + 1] = p.fast ? 0 : 1;
        if (p.forband) m.massa[2 * i] = m.massa[2 * i + 1] = FORBAND.massa;
    });
    rotFast.forEach((f, r) => { m.fri[2 * np + r] = f ? 0 : 1; });

    // Massan klumpas i noderna: halva elementet till var ände, och ett
    // tröghetsmoment mL²/78 (HRZ) för vridningen.
    for (const e of element) {
        const balk = balkar[e.balk];
        const me = (balk.prof.massa + (e.vag ? VAG.massa : 0)) * e.L0;
        for (const p of [e.i, e.j]) {
            m.massa[2 * p] += me / 2;
            m.massa[2 * p + 1] += me / 2;
        }
        m.massa[2 * np + e.ri] += me * e.L0 * e.L0 / 78;
        m.massa[2 * np + e.rj] += me * e.L0 * e.L0 / 78;
    }

    numrera(m);
    return m;
}

// Frihetsgraderna i ett element: [x_i, y_i, θ_i, x_j, y_j, θ_j].
function elementDofs(m, e) {
    const r0 = 2 * m.np;
    return [2 * e.i, 2 * e.i + 1, r0 + e.ri, 2 * e.j, 2 * e.j + 1, r0 + e.rj];
}

// Numrerar de fria frihetsgraderna med omvänd Cuthill–McKee, så att
// styvhetsmatrisen blir ett smalt band. m.eq[d] = ekvationens nummer, -1 om
// frihetsgraden är låst.
function numrera(m) {
    const granne = Array.from({ length: m.ntot }, () => new Set());
    for (const e of m.element) {
        const d = elementDofs(m, e).filter(d => m.fri[d]);
        for (const p of d) for (const q of d) if (p !== q) granne[p].add(q);
    }
    const fria = [];
    for (let d = 0; d < m.ntot; d++) if (m.fri[d]) fria.push(d);
    const grad = d => granne[d].size;
    const sedd = new Uint8Array(m.ntot), ordning = [];
    for (const start of [...fria].sort((p, q) => grad(p) - grad(q))) {
        if (sedd[start]) continue;
        sedd[start] = 1;
        const ko = [start];
        for (let k = 0; k < ko.length; k++) {
            const d = ko[k];
            ordning.push(d);
            for (const g of [...granne[d]].sort((p, q) => grad(p) - grad(q))) {
                if (!sedd[g]) { sedd[g] = 1; ko.push(g); }
            }
        }
    }
    ordning.reverse();
    m.eq = new Int32Array(m.ntot).fill(-1);
    ordning.forEach((d, i) => { m.eq[d] = i; });
    m.neq = ordning.length;
    let band = 0;
    for (const e of m.element) {
        const d = elementDofs(m, e).map(d => m.eq[d]).filter(i => i >= 0);
        for (const p of d) for (const q of d) band = Math.max(band, p - q);
    }
    m.band = band;
    m.K = new Float64Array(m.neq * (band + 1));
    m.R = new Float64Array(m.neq);
    m.du = new Float64Array(m.neq);
}

// Vinkeln till intervallet (-π, π].
function vinkel(v) {
    v = (v + Math.PI) % (2 * Math.PI);
    if (v < 0) v += 2 * Math.PI;
    return v - Math.PI;
}

// Nodens läge just nu.
function lage(m, p) {
    return [m.X0[2 * p] + m.q[2 * p], m.X0[2 * p + 1] + m.q[2 * p + 1]];
}

const F6 = new Float64Array(6), K36 = new Float64Array(36);

// Ett korotationellt balkelement: inre krafter f (6) och, om medK,
// tangentstyvheten K (6×6) i globala koordinater. Sparar N, M1, M2, V.
function elementet(m, e, medK) {
    const r0 = 2 * m.np, q = m.q;
    const xi = m.X0[2 * e.i] + q[2 * e.i], yi = m.X0[2 * e.i + 1] + q[2 * e.i + 1];
    const xj = m.X0[2 * e.j] + q[2 * e.j], yj = m.X0[2 * e.j + 1] + q[2 * e.j + 1];
    const dx = xj - xi, dy = yj - yi, Ln = Math.hypot(dx, dy);
    const c = dx / Ln, s = dy / Ln;
    const stel = vinkel(Math.atan2(dy, dx) - e.b0);          // stelkroppsvridningen
    const t1 = vinkel(q[r0 + e.ri] - stel), t2 = vinkel(q[r0 + e.rj] - stel);
    const ul = (Ln * Ln - e.L0 * e.L0) / (Ln + e.L0);         // förlängningen

    const k = e.EI / e.L0;
    const ea = e.EA / e.L0 * (e.slak && ul < 0 ? SLAK : 1);
    const N = ea * ul;
    const M1 = k * (4 * t1 + 2 * t2), M2 = k * (2 * t1 + 4 * t2);
    e.N = N; e.M1 = M1; e.M2 = M2; e.V = (M1 + M2) / Ln;

    // r: hur längden ändras, z/Ln: hur kordans vinkel ändras.
    const r = [-c, -s, 0, c, s, 0], z = [s, -c, 0, -s, c, 0];
    const Ms = (M1 + M2) / Ln;
    for (let a = 0; a < 6; a++) F6[a] = N * r[a] - Ms * z[a];
    F6[2] += M1; F6[5] += M2;
    if (!medK) return;

    // B = d(ul, t1, t2)/d(frihetsgrader), K = Bᵀ D B + geometrisk styvhet.
    const B1 = z.map(v => -v / Ln), B2 = B1.slice();
    B1[2] += 1; B2[5] += 1;
    const k4 = 4 * k, k2 = 2 * k;
    const gN = N / Ln, gM = (M1 + M2) / (Ln * Ln);
    for (let a = 0; a < 6; a++) {
        const da = ea * r[a];
        const m1 = k4 * B1[a] + k2 * B2[a], m2 = k2 * B1[a] + k4 * B2[a];
        for (let b = 0; b < 6; b++) {
            K36[6 * a + b] = da * r[b] + m1 * B1[b] + m2 * B2[b]
                + gN * z[a] * z[b] + gM * (r[a] * z[b] + z[a] * r[b]);
        }
    }
}

// Inre krafter (och styvhetsmatrisen i bandform) för hela bron.
function montera(m, medK) {
    const f = m.fint, K = m.K, w = m.band + 1, eq = m.eq;
    f.fill(0);
    if (medK) K.fill(0);
    for (const e of m.element) {
        if (e.dod) continue;
        elementet(m, e, medK);
        const d = elementDofs(m, e);
        for (let a = 0; a < 6; a++) {
            f[d[a]] += F6[a];
            if (!medK) continue;
            const p = eq[d[a]];
            if (p < 0) continue;
            for (let b = 0; b < 6; b++) {
                const q = eq[d[b]];
                if (q < 0 || q > p) continue;
                K[p * w + q - p + m.band] += K36[6 * a + b];
            }
        }
    }
}

// Bandad Cholesky (nedre bandet, på plats). K(i, j) med j ≤ i ligger på
// K[i*(b+1) + j-i+b]. Returnerar false om matrisen inte var positivt
// definit (då har pivoten tvingats positiv och lösningen är ungefärlig).
function cholesky(K, n, b) {
    const w = b + 1;
    let ok = true;
    for (let i = 0; i < n; i++) {
        const j0 = Math.max(0, i - b);
        for (let j = j0; j <= i; j++) {
            let s = K[i * w + j - i + b];
            for (let k = Math.max(j0, j - b); k < j; k++) s -= K[i * w + k - i + b] * K[j * w + k - j + b];
            if (j === i) {
                if (!(s > 0)) { ok = false; s = Math.abs(s) + 1e-6; }
                K[i * w + b] = Math.sqrt(s);
            } else {
                K[i * w + j - i + b] = s / K[j * w + b];
            }
        }
    }
    return ok;
}

function cholLos(K, n, b, x) {
    const w = b + 1;
    for (let i = 0; i < n; i++) {
        let s = x[i];
        for (let k = Math.max(0, i - b); k < i; k++) s -= K[i * w + k - i + b] * x[k];
        x[i] = s / K[i * w + b];
    }
    for (let i = n - 1; i >= 0; i--) {
        let s = x[i];
        for (let k = i + 1; k <= Math.min(n - 1, i + b); k++) s -= K[k * w + i - k + b] * x[k];
        x[i] = s / K[i * w + b];
    }
}

// Yttre kraften i en frihetsgrad: tyngden (gånger λg) och lasterna (λl).
function yttre(m, d, lg, ll) {
    const tyngd = d < 2 * m.np && d % 2 === 1 ? -m.massa[d] * G * lg : 0;
    return tyngd + m.last[d] * ll;
}

// Ett tidssteg (Newmark + Newton–Raphson). Returnerar antal iterationer.
function steg(m, dt) {
    const { q, v, a, qn, vn, an, massa, eq, fri, ntot } = m;
    qn.set(q); vn.set(v); an.set(a);
    const c1 = 1 / (NEWMARK_BETA * dt * dt), c2 = 1 / (NEWMARK_BETA * dt), c3 = 1 / (2 * NEWMARK_BETA) - 1;
    const kv = DAMPNING * NEWMARK_GAMMA * c2, w = m.band + 1;
    for (let d = 0; d < ntot; d++) if (fri[d]) q[d] = qn[d] + dt * vn[d] + 0.5 * dt * dt * an[d];

    const uppdatera = () => {
        for (let d = 0; d < ntot; d++) {
            if (!fri[d]) continue;
            a[d] = c1 * (q[d] - qn[d]) - c2 * vn[d] - c3 * an[d];
            v[d] = vn[d] + dt * ((1 - NEWMARK_GAMMA) * an[d] + NEWMARK_GAMMA * a[d]);
        }
    };
    let iter = 0;
    while (iter < MAX_ITER) {
        iter++;
        uppdatera();
        montera(m, true);
        for (let d = 0; d < ntot; d++) {
            const p = eq[d];
            if (p < 0) continue;
            m.R[p] = yttre(m, d, m.tyngd, 1) - m.fint[d] - massa[d] * (a[d] + DAMPNING * v[d]);
            m.K[p * w + m.band] += massa[d] * (c1 + kv);
        }
        if (!cholesky(m.K, m.neq, m.band)) m.indefinit = true;
        m.du.set(m.R);
        cholLos(m.K, m.neq, m.band, m.du);
        let max = 0;
        for (let d = 0; d < ntot; d++) {
            const p = eq[d];
            if (p < 0) continue;
            q[d] += m.du[p];
            if (d < 2 * m.np) max = Math.max(max, Math.abs(m.du[p]));
        }
        if (max < TOL) break;
    }
    uppdatera();
    m.t += dt;
    return iter;
}

// Statisk lösning: tyngden och lasterna läggs på i `delar` steg, med
// Newton–Raphson i varje. Returnerar false om den inte gick ihop (t.ex.
// en mekanism som inte kan stå still). Ett steg som flyttar något mer än
// maxSteg m kortas av: kablar som ännu inte spänts och långa veka spann
// får annars Newton att gå vilse.
function losStatiskt(m, lg = 1, ll = 1, delar = 10, maxSteg = 1) {
    let ok = true;
    for (let s = 1; s <= delar && ok; s++) {
        let max = Infinity;
        for (let iter = 0; iter < 80; iter++) {
            montera(m, true);
            for (let d = 0; d < m.ntot; d++) {
                const p = m.eq[d];
                if (p >= 0) m.R[p] = yttre(m, d, lg * s / delar, ll * s / delar) - m.fint[d];
            }
            cholesky(m.K, m.neq, m.band);
            m.du.set(m.R);
            cholLos(m.K, m.neq, m.band, m.du);
            max = 0;
            for (let p = 0; p < m.neq; p++) max = Math.max(max, Math.abs(m.du[p]));
            if (!(max < 1e4)) break;         // NaN eller orimligt: ger upp
            const f = Math.min(1, maxSteg / max);
            for (let d = 0; d < m.ntot; d++) {
                const p = m.eq[d];
                if (p >= 0) m.q[d] += f * m.du[p];
            }
            if (max < 1e-10) break;
        }
        ok = max < 1e-6;
    }
    montera(m, false);
    return ok && m.q.every(Number.isFinite);
}

// Kablarna spänns när bron byggs, som på riktiga snedkabel- och hängbroar:
// en kabel som håller upp vägen kortas (eller förlängs) tills vägen ligger
// där den är ritad under sin egen tyngd. Annars skulle varje kabel behöva
// ha exakt rätt längd, och det går inte på ett rutnät. Gäller kablar med
// ena änden i vägbanan; huvudkabeln i en hängbro får hitta sin form själv.
// Körs efter losStatiskt (bron står redan under sin tyngd). Returnerar
// false om statiken inte gick ihop.
function spannKablar(m, varv = 30) {
    const iVag = new Uint8Array(m.np);
    for (const e of m.element) if (e.vag) iVag[e.i] = iVag[e.j] = 1;
    const kablar = [];
    for (const e of m.element) {
        if (!e.slak || iVag[e.i] === iVag[e.j]) continue;
        const [p, a] = iVag[e.i] ? [e.i, e.j] : [e.j, e.i];      // p i vägen, a uppe i andra änden
        if (!m.fri[2 * p + 1]) continue;
        kablar.push({ e, p, a, L0: e.L0 });
    }
    if (!kablar.length) return true;
    for (let v = 0; v < varv; v++) {
        let max = 0;
        for (const k of kablar) {
            const [xp, yp] = lage(m, k.p), [xa, ya] = lage(m, k.a);
            const L = Math.hypot(xa - xp, ya - yp), sjunkit = -m.q[2 * k.p + 1];
            max = Math.max(max, Math.abs(sjunkit));
            // Vägen sjönk: kortare kabel (lika mycket som sjunkningen längs kabeln).
            k.e.L0 = Math.max(0.3 * k.L0, Math.min(1.5 * k.L0, k.e.L0 - sjunkit * (ya - yp) / L));
        }
        if (max < 1e-3) return true;
        if (!losStatiskt(m, 1, 0, 1)) return false;
    }
    return true;
}

// Utnyttjandegraden i ett element (N, M, V) efter materialets typ, se
// BROTTREGLER i material.js. Betongen räknas som trä, med sina egna
// hållfastheter.
const rektangelBrott = (N, M, V, p, mat) => Math.max(
    (N >= 0 ? N / (p.A * mat.ft) : -N / (p.A * mat.fc)) + M / (p.W * mat.fm),
    1.5 * V / (p.A * mat.fv));
const BROTT = {
    tra: rektangelBrott,
    betong: rektangelBrott,
    stal: (N, M, V, p, mat) => Math.max(Math.abs(N) / (p.A * mat.fy) + M / (p.W * mat.fy), V / (p.Av * mat.fv)),
    vajer: (N, M, V, p, mat) => Math.max(0, N) / (p.A * mat.fu)
};

// Utnyttjandegraden i varje element och knäckning i varje balk (efter
// montera, så att N och M är aktuella).
//   element: BROTT efter materialet (trä: drag/tryck N/(A·f) + böjning
//            M/(W·fm), eller skjuvning 1,5·V/(A·fv), det som är störst)
//   balk:    tryck mot Eulers knäcklast π²·E05·I/L² (ledad–ledad)
function utnyttjande(m) {
    for (const balk of m.balkar) balk.uk = 0;
    for (const e of m.element) {
        if (e.dod) { e.u = 0; continue; }
        const balk = m.balkar[e.balk], p = balk.prof, mat = balk.mat;
        e.u = BROTT[mat.typ](e.N, Math.max(Math.abs(e.M1), Math.abs(e.M2)), Math.abs(e.V), p, mat);
        if (e.N < 0 && balk.Pcr > 0) balk.uk = Math.max(balk.uk, -e.N / balk.Pcr);      // kablar knäcks inte
    }
}

// Tar bort det som går sönder: i varje balk det värst utnyttjade elementet
// över 1, och mittelementet om balken knäcks. Returnerar antal brott.
function brott(m) {
    montera(m, false);
    utnyttjande(m);
    let antal = 0;
    for (const balk of m.balkar) {
        let varst = null;
        for (const i of balk.element) {
            const e = m.element[i];
            if (!e.dod && e.u > 1 && (!varst || e.u > varst.u)) varst = e;
        }
        if (!varst && balk.uk > 1 && !balk.knackt) {
            balk.knackt = true;
            varst = m.element[balk.element[balk.element.length >> 1]];
        }
        if (varst && !varst.dod) { varst.dod = true; antal++; }
    }
    return antal;
}
