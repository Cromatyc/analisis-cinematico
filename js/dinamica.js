/*
 * dinamica.js — Análisis de fuerzas dinámicas (Norton, Diseño de Maquinaria 4a Ed., cap. 11)
 *
 * Método matricial de Newton-Euler: para cada eslabón móvil
 *    ΣF = m·a_G      y      ΣM_G = I_G·α
 * Se arma un sistema lineal y se resuelve para las fuerzas en las juntas y el par motor T12.
 *
 * Notación (igual al libro): F_ij = fuerza que el eslabón i ejerce sobre el eslabón j.
 *   Cuatro barras  — incógnitas: F12x, F12y, F32x, F32y, F43x, F43y, F14x, F14y, T12
 *   Manivela-corr. — incógnitas: F12x, F12y, F32x, F32y, F43x, F43y, F14y, T12
 *                     (F14x = ±μ·F14y, la fricción se opone a la velocidad de la corredera)
 *
 * Entradas dinámicas (todas opcionales, en unidades consistentes, p. ej. blob-pulg-lb o kg-m-N):
 *   m2, m3, m4 · I2, I3, I4 (respecto al CG) · T3, T4 (pares externos, + antihorario)
 *   Fp3, dFp3 : fuerza externa en P3. Ángulo: cuatro barras → respecto al eje X global;
 *               manivela-corredera → respecto a la línea AB (figura P11-1).
 *   Fp4, dFp4 : fuerza externa en P4 (cuatro barras) o sobre la corredera; ángulo global.
 *   mu        : coeficiente de fricción corredera-guía (solo manivela-corredera).
 */
(function (global) {
  "use strict";
  const RAD = Math.PI / 180;

  const n = (v) => +v || 0;
  const cruz = (r, f) => r.x * f.y - r.y * f.x;
  const resta = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
  const polar = (mag, angDeg) => ({ x: mag * Math.cos(angDeg * RAD), y: mag * Math.sin(angDeg * RAD) });
  function vec(x, y) {
    let ang = Math.atan2(y, x) / RAD;
    if (ang < 0) ang += 360;
    return { x, y, mag: Math.hypot(x, y), ang };
  }

  /** Eliminación gaussiana con pivoteo parcial: resuelve A·x = b */
  function resolver(A, b) {
    const N = b.length;
    const M = A.map((fila, i) => [...fila, b[i]]);
    for (let k = 0; k < N; k++) {
      let piv = k;
      for (let i = k + 1; i < N; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
      if (Math.abs(M[piv][k]) < 1e-12) throw new Error("Sistema singular: el mecanismo está en una posición de agarrotamiento.");
      [M[k], M[piv]] = [M[piv], M[k]];
      for (let i = k + 1; i < N; i++) {
        const f = M[i][k] / M[k][k];
        for (let j = k; j <= N; j++) M[i][j] -= f * M[k][j];
      }
    }
    const x = new Array(N).fill(0);
    for (let i = N - 1; i >= 0; i--) {
      let s = M[i][N];
      for (let j = i + 1; j < N; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  /** ¿Hay datos dinámicos? (si todo es cero no tiene sentido calcular fuerzas) */
  function hayDatos(p) {
    return ["m2", "m3", "m4", "I2", "I3", "I4", "Fp3", "Fp4", "T3", "T4"].some((k) => n(p[k]) !== 0);
  }

  // ================================================================
  // CUATRO BARRAS
  // ================================================================
  function cuatroBarras(r) {
    const p = r.entrada, P = r.puntos;
    const m2 = n(p.m2), m3 = n(p.m3), m4 = n(p.m4), I2 = n(p.I2), I3 = n(p.I3), I4 = n(p.I4);
    const T3 = n(p.T3), T4 = n(p.T4);
    const FP3 = polar(n(p.Fp3), n(p.dFp3)), FP4 = polar(n(p.Fp4), n(p.dFp4));
    const aG2 = r.Ac.G2, aG3 = r.Ac.G3, aG4 = r.Ac.G4;
    const al2 = r.al.al2, al3 = r.al.al3, al4 = r.al.al4;

    // brazos de momento desde cada CG
    const R12 = resta(P.O2, P.G2), R32 = resta(P.A, P.G2);
    const R23 = resta(P.A, P.G3), R43 = resta(P.B, P.G3), RP3 = resta(P.P3, P.G3);
    const R34 = resta(P.B, P.G4), R14 = resta(P.O4, P.G4), RP4 = resta(P.P4, P.G4);

    //        F12x     F12y    F32x     F32y    F43x     F43y    F14x     F14y   T12
    const A = [
      [1, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0, 0, 0, 0, 0],
      [-R12.y, R12.x, -R32.y, R32.x, 0, 0, 0, 0, 1],
      [0, 0, -1, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, -1, 0, 1, 0, 0, 0],
      [0, 0, R23.y, -R23.x, -R43.y, R43.x, 0, 0, 0],
      [0, 0, 0, 0, -1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, -1, 0, 1, 0],
      [0, 0, 0, 0, R34.y, -R34.x, -R14.y, R14.x, 0],
    ];
    const b = [
      m2 * aG2.x,
      m2 * aG2.y,
      I2 * al2,
      m3 * aG3.x - FP3.x,
      m3 * aG3.y - FP3.y,
      I3 * al3 - cruz(RP3, FP3) - T3,
      m4 * aG4.x - FP4.x,
      m4 * aG4.y - FP4.y,
      I4 * al4 - cruz(RP4, FP4) - T4,
    ];
    const x = resolver(A, b);
    const F12 = vec(x[0], x[1]), F32 = vec(x[2], x[3]), F43 = vec(x[4], x[5]), F14 = vec(x[6], x[7]);
    const T12 = x[8];

    // comprobación por potencia (método de energía / trabajo virtual, sección 11.13)
    const V = r.V, w = r.w;
    const pot = (F, v) => F.x * v.x + F.y * v.y;
    const potEntrada = T12 * w.w2 + pot(FP3, V.P3) + pot(FP4, V.P4) + T3 * w.w3 + T4 * w.w4;
    const potInercia = m2 * pot(aG2, V.G2) + m3 * pot(aG3, V.G3) + m4 * pot(aG4, V.G4) +
      I2 * al2 * w.w2 + I3 * al3 * w.w3 + I4 * al4 * w.w4;

    return resumen({
      F12, F32, F43, F14, T12,
      FP3: vec(FP3.x, FP3.y), FP4: vec(FP4.x, FP4.y),
      inercia: {
        G2: vec(-m2 * aG2.x, -m2 * aG2.y), G3: vec(-m3 * aG3.x, -m3 * aG3.y), G4: vec(-m4 * aG4.x, -m4 * aG4.y),
        T2: -I2 * al2, T3: -I3 * al3, T4: -I4 * al4,
      },
      potEntrada, potInercia, w2: w.w2, O4: P.O4,
    });
  }

  // ================================================================
  // MANIVELA-CORREDERA
  // ================================================================
  function manivelaCorredera(r) {
    const p = r.entrada, P = r.puntos;
    const m2 = n(p.m2), m3 = n(p.m3), m4 = n(p.m4), I2 = n(p.I2), I3 = n(p.I3);
    const T3 = n(p.T3), mu = Math.abs(n(p.mu));
    const thAB = r.angulos.th3 + 180; // línea A→B
    const FP3 = polar(n(p.Fp3), thAB + n(p.dFp3));
    const FP4 = polar(n(p.Fp4), n(p.dFp4));
    const aG2 = r.Ac.G2, aG3 = r.Ac.G3, aG4 = r.Ac.G4;
    const al2 = r.al.al2, al3 = r.al.al3;
    const vB = r.corredera.dd;

    const R12 = resta(P.O2, P.G2), R32 = resta(P.A, P.G2);
    const R23 = resta(P.A, P.G3), R43 = resta(P.B, P.G3), RP3 = resta(P.P3, P.G3);

    // F14x = k·F14y. La fricción vale μ|F14y| y se opone a la velocidad.
    function intentar(signoNormal) {
      const k = Math.abs(vB) < 1e-12 ? 0 : -Math.sign(vB) * mu * signoNormal;
      //        F12x     F12y    F32x     F32y    F43x     F43y   F14y  T12
      const A = [
        [1, 0, 1, 0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0, 0, 0, 0],
        [-R12.y, R12.x, -R32.y, R32.x, 0, 0, 0, 1],
        [0, 0, -1, 0, 1, 0, 0, 0],
        [0, 0, 0, -1, 0, 1, 0, 0],
        [0, 0, R23.y, -R23.x, -R43.y, R43.x, 0, 0],
        [0, 0, 0, 0, -1, 0, k, 0],
        [0, 0, 0, 0, 0, -1, 1, 0],
      ];
      const b = [
        m2 * aG2.x, m2 * aG2.y, I2 * al2,
        m3 * aG3.x - FP3.x, m3 * aG3.y - FP3.y, I3 * al3 - cruz(RP3, FP3) - T3,
        m4 * aG4.x - FP4.x, m4 * aG4.y - FP4.y,
      ];
      return { x: resolver(A, b), k };
    }
    let s = intentar(1);
    if (mu > 0 && s.x[6] < 0) s = intentar(-1); // la normal resultó hacia abajo: corregir el signo de la fricción

    const x = s.x;
    const F12 = vec(x[0], x[1]), F32 = vec(x[2], x[3]), F43 = vec(x[4], x[5]);
    const F14 = vec(s.k * x[6], x[6]);
    const T12 = x[7];

    const V = r.V, w = r.w;
    const pot = (F, v) => F.x * v.x + F.y * v.y;
    const potEntrada = T12 * w.w2 + pot(FP3, V.P3) + pot(FP4, V.B) + T3 * w.w3 + F14.x * vB;
    const potInercia = m2 * pot(aG2, V.G2) + m3 * pot(aG3, V.G3) + m4 * pot(aG4, V.G4) +
      I2 * al2 * w.w2 + I3 * al3 * w.w3;

    return resumen({
      F12, F32, F43, F14, T12,
      FP3: vec(FP3.x, FP3.y), FP4: vec(FP4.x, FP4.y),
      friccion: F14.x,
      inercia: {
        G2: vec(-m2 * aG2.x, -m2 * aG2.y), G3: vec(-m3 * aG3.x, -m3 * aG3.y), G4: vec(-m4 * aG4.x, -m4 * aG4.y),
        T2: -I2 * al2, T3: -I3 * al3,
      },
      potEntrada, potInercia, w2: w.w2, O4: null, B: P.B,
    });
  }

  /** Fuerzas de sacudimiento y valores derivados (sección 11.7) */
  function resumen(f) {
    // fuerzas sobre la bancada: F21 = −F12, F41 = −F14
    f.F21 = vec(-f.F12.x, -f.F12.y);
    f.F41 = vec(-f.F14.x, -f.F14.y);
    // fuerza de sacudimiento: F_s = F21 + F41
    f.Fs = vec(f.F21.x + f.F41.x, f.F21.y + f.F41.y);
    // par de sacudimiento (reacción del motor sobre la bancada): T21 = −T12
    f.Ts = -f.T12;
    // potencia instantánea entregada por el motor
    f.potencia = f.T12 * f.w2;
    // error relativo de la comprobación por potencia
    const ref = Math.max(Math.abs(f.potInercia), Math.abs(f.potEntrada), 1e-9);
    f.errorPotencia = Math.abs(f.potEntrada - f.potInercia) / ref;
    return f;
  }

  function fuerzas(r) {
    if (!r || !hayDatos(r.entrada) && !n(r.entrada.mu)) return null;
    return r.tipo === "cuatroBarras" ? cuatroBarras(r) : manivelaCorredera(r);
  }

  const api = { fuerzas, resolver, hayDatos };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Dinamica = api;
})(typeof window !== "undefined" ? window : globalThis);
