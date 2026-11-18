// Ejecutar con:  node test/dinamica.js
// El libro no publica las fuerzas de estas tablas; el análisis dinámico se comprueba con
// dos métodos independientes del sistema matricial:
//   1) Balance de potencia (método de energía / trabajo virtual, Norton sec. 11.13):
//        T12·ω2 + ΣF_ext·V + ΣT_ext·ω  =  Σ m·a_G·V_G + Σ I·α·ω
//   2) Equilibrio del mecanismo completo:  F12 + F14 + ΣF_ext = Σ m·a_G
// y con un caso estático resuelto a mano.
const K = require("../js/cinematica.js");
const D = require("../js/dinamica.js");
const DN = require("../js/datos-norton.js");

let fallas = 0;
const ok = (cond, txt) => { console.log(`  ${cond ? "OK " : "XX "} ${txt}`); if (!cond) fallas++; };
const f = (x, d = 3) => x.toFixed(d);

function revisar(nombre, r, sumaMasaAcel, extF) {
  const F = D.fuerzas(r);
  console.log(`\n${nombre}`);
  console.log(`  T12 = ${f(F.T12)}   F12 = ${f(F.F12.mag)}∠${f(F.F12.ang, 2)}°   F32 = ${f(F.F32.mag)}∠${f(F.F32.ang, 2)}°   F43 = ${f(F.F43.mag)}∠${f(F.F43.ang, 2)}°   F14 = ${f(F.F14.mag)}∠${f(F.F14.ang, 2)}°`);
  ok(F.errorPotencia < 1e-9, `balance de potencia: ${f(F.potEntrada, 4)} = ${f(F.potInercia, 4)}`);
  const rx = F.F12.x + F.F14.x + extF.x - sumaMasaAcel.x, ry = F.F12.y + F.F14.y + extF.y - sumaMasaAcel.y;
  ok(Math.hypot(rx, ry) < 1e-9 * Math.max(1, F.F12.mag), `equilibrio global (residuo ${Math.hypot(rx, ry).toExponential(1)})`);
  return F;
}

for (const fila of DN.corredera) {
  const r = K.manivelaCorredera(fila.entrada);
  const p = fila.entrada;
  const thAB = (r.angulos.th3 + 180) * Math.PI / 180, dF = p.dFp3 * Math.PI / 180;
  const ext = { x: p.Fp3 * Math.cos(thAB + dF), y: p.Fp3 * Math.sin(thAB + dF) };
  const sma = { x: p.m2 * r.Ac.G2.x + p.m3 * r.Ac.G3.x + p.m4 * r.Ac.G4.x, y: p.m2 * r.Ac.G2.y + p.m3 * r.Ac.G3.y + p.m4 * r.Ac.G4.y };
  revisar(`Manivela-corredera – Tabla P11-1 fila ${fila.fila}`, r, sma, ext);
}

for (const fila of DN.cuatroBarras) {
  const r = K.cuatroBarras(fila.entrada);
  const p = fila.entrada, R = Math.PI / 180;
  const ext = { x: p.Fp3 * Math.cos(p.dFp3 * R) + p.Fp4 * Math.cos(p.dFp4 * R), y: p.Fp3 * Math.sin(p.dFp3 * R) + p.Fp4 * Math.sin(p.dFp4 * R) };
  const sma = { x: p.m2 * r.Ac.G2.x + p.m3 * r.Ac.G3.x + p.m4 * r.Ac.G4.x, y: p.m2 * r.Ac.G2.y + p.m3 * r.Ac.G3.y + p.m4 * r.Ac.G4.y };
  revisar(`Cuatro barras – Tabla P11-3 fila ${fila.fila}`, r, sma, ext);
}

// ---- Caso estático a mano: corredera sin masa, θ2 = 90°, sin descentrado ----
// a = 2, b = 8, fuerza horizontal Fx = −100 sobre la corredera (empuja hacia la manivela).
// En θ2 = 90° la biela forma un ángulo φ con la guía, sen φ = a/b = 2/8.
//  · ω3 = 0 y ḋ = −a·ω2 = −2  →  por potencia: T12·ω2 + Fx·ḋ = 0  →  T12 = −(−100)(−2) = −200
//  · la biela transmite |F43| = 100 / cos φ  y la normal de la guía es |F14| = 100·tan φ
console.log("\nCaso estático resuelto a mano (corredera sin masas, θ2 = 90°)");
{
  const r = K.manivelaCorredera({ a: 2, b: 8, c: 0, th2: 90, w2: 1, al2: 0, Fp4: 100, dFp4: 180 });
  const F = D.fuerzas(r);
  ok(Math.abs(F.T12 - -200) < 1e-9, `T12 = ${f(F.T12)} (a mano: −200)`);
  // Normal sobre la corredera: componente vertical de la fuerza de la biela = 100·tan φ, tan φ = 2/√60
  const N = 100 * 2 / Math.sqrt(60);
  ok(Math.abs(Math.abs(F.F14.y) - N) < 1e-9, `|F14| = ${f(Math.abs(F.F14.y), 4)} (a mano: 100·2/√60 = ${f(N, 4)})`);
  ok(Math.abs(F.F43.mag - 100 * 8 / Math.sqrt(60)) < 1e-9, `|F43| = ${f(F.F43.mag, 4)} (a mano: 100/cos φ = ${f(800 / Math.sqrt(60), 4)})`);
}

// ---- Fricción: con μ > 0 la potencia del motor debe aumentar en |μ·N·ḋ| ----
console.log("\nFricción en la corredera");
{
  const base = { ...DN.corredera[1].entrada };
  const r0 = K.manivelaCorredera({ ...base, mu: 0 }), r1 = K.manivelaCorredera({ ...base, mu: 0.2 });
  const F0 = D.fuerzas(r0), F1 = D.fuerzas(r1);
  ok(F1.errorPotencia < 1e-9, "balance de potencia con fricción");
  ok(Math.sign(F1.F14.x) === -Math.sign(r1.corredera.dd), "la fricción se opone a la velocidad de la corredera");
  ok(Math.abs(Math.abs(F1.F14.x) - 0.2 * Math.abs(F1.F14.y)) < 1e-9, "|F_fricción| = μ·|N|");
  ok(F1.potencia > F0.potencia, `el motor entrega más potencia (${f(F0.potencia)} → ${f(F1.potencia)})`);
}

console.log(fallas ? `\n${fallas} comprobaciones fallaron.` : "\nTodas las comprobaciones dinámicas pasaron.");
process.exit(fallas ? 1 : 0);
