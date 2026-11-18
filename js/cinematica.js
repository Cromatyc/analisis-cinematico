/*
 * cinematica.js — Análisis cinemático de mecanismos de cuatro barras
 * (método de números complejos de Norton, Diseño de Maquinaria 4a Ed., caps. 4, 6 y 7)
 *
 * Funciona en el navegador (window.Cinematica) y en Node (module.exports).
 *
 * Convenciones (iguales al libro):
 *  - Ángulos de entrada en grados, ω en rad/s, α en rad/s².
 *  - Cuatro barras: a = eslabón 2, b = eslabón 3, c = eslabón 4, d = eslabón 1.
 *  - Manivela-corredera: a = manivela, b = biela, c = descentrado; d = posición de
 *    la corredera. θ3 es el ángulo del vector R3 que va de B hacia A, por eso en la
 *    configuración abierta θ3 ≈ 180°.
 *  - Centros de gravedad: R_g y δ medidos desde el pivote del eslabón (O2 para el 2,
 *    A para el 3, O4 para el 4) y δ respecto a la línea del eslabón
 *    (O2→A, A→B, O4→B).
 *  - Punto P de un eslabón: R_P y δ_RP medidos desde el CG del eslabón y δ respecto a
 *    la línea del eslabón (figuras P11-1 y P11-2).
 */
(function (global) {
  "use strict";

  const RAD = Math.PI / 180;

  // ---------------- números complejos mínimos ----------------
  const C = {
    of: (re, im) => ({ re, im: im || 0 }),
    cis: (t) => ({ re: Math.cos(t), im: Math.sin(t) }),
    add: (...zs) => zs.reduce((s, z) => ({ re: s.re + z.re, im: s.im + z.im }), { re: 0, im: 0 }),
    sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
    scale: (z, k) => ({ re: z.re * k, im: z.im * k }),
    mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
    abs: (z) => Math.hypot(z.re, z.im),
    angDeg: (z) => norm360(Math.atan2(z.im, z.re) / RAD),
  };

  function norm360(a) {
    const r = a % 360;
    return r < 0 ? r + 360 : r;
  }

  /** vector de un eslabón que gira: r·e^{jφ} */
  const pos = (r, phi) => C.scale(C.cis(phi), r);
  /** velocidad de un punto a distancia r con ángulo φ en un eslabón con ω: j·ω·r·e^{jφ} */
  const vel = (r, phi, w) => C.mul(C.of(0, w * r), C.cis(phi));
  /** aceleración: r(jα − ω²)e^{jφ} */
  const acc = (r, phi, w, al) => C.mul(C.of(-r * w * w, r * al), C.cis(phi));

  /** Empaqueta un complejo como {re, im, mag, ang} */
  function vec(z) {
    return { x: z.re, y: z.im, mag: C.abs(z), ang: C.angDeg(z) };
  }

  /** Clasificación de Grashof */
  function grashof(longs) {
    const s = [...longs].sort((x, y) => x - y);
    const S = s[0], L = s[3], P = s[1], Q = s[2];
    const suma = S + L, otros = P + Q;
    if (Math.abs(suma - otros) < 1e-9) return { tipo: "Caso especial de Grashof (S+L = P+Q)", clase: "III" };
    if (suma < otros) return { tipo: "Grashof (S+L < P+Q)", clase: "I" };
    return { tipo: "No Grashof (S+L > P+Q): triple balancín", clase: "II" };
  }

  /** Ángulo de transmisión: el ángulo agudo entre las dos rectas */
  function anguloTransmision(t1, t2) {
    let mu = Math.abs(norm360((t1 - t2) / RAD));
    if (mu > 180) mu = 360 - mu;
    if (mu > 90) mu = 180 - mu;
    return mu;
  }

  // ================================================================
  // 1) CUATRO BARRAS (manivela-balancín)
  // ================================================================
  /**
   * @param {object} p  {a,b,c,d, th2, w2, al2, abierta,
   *                     Rg2,d2, Rg3,d3, Rg4,d4, Rp3,dp3, Rp4,dp4}
   */
  function cuatroBarras(p) {
    const { a, b, c, d } = p;
    const w2 = p.w2, al2 = p.al2 || 0;
    const th2 = p.th2 * RAD;
    const abierta = p.abierta !== false;
    if (!(a > 0 && b > 0 && c > 0 && d > 0)) throw new Error("Todas las longitudes deben ser positivas.");

    // ---- Posición (ec. 4.10) ----
    const K1 = d / a, K2 = d / c, K3 = (a * a - b * b + c * c + d * d) / (2 * a * c);
    const K4 = d / b, K5 = (c * c - d * d - a * a - b * b) / (2 * a * b);
    const cs = Math.cos(th2), sn = Math.sin(th2);
    const A = cs - K1 - K2 * cs + K3, B = -2 * sn, Cc = K1 - (K2 + 1) * cs + K3;
    const D = cs - K1 + K4 * cs + K5, E = -2 * sn, F = K1 + (K4 - 1) * cs + K5;
    let disc4 = B * B - 4 * A * Cc, disc3 = E * E - 4 * D * F;
    if (disc4 < -1e-9 || disc3 < -1e-9)
      throw new Error(`El mecanismo no se puede ensamblar en θ2 = ${p.th2}° (discriminante negativo).`);
    disc4 = Math.max(disc4, 0); disc3 = Math.max(disc3, 0);
    const s = abierta ? -1 : 1;
    const th4 = 2 * Math.atan2(-B + s * Math.sqrt(disc4), 2 * A);
    const th3 = 2 * Math.atan2(-E + s * Math.sqrt(disc3), 2 * D);

    // ---- Velocidad (ec. 6.18) ----
    const w3 = (a * w2 / b) * Math.sin(th4 - th2) / Math.sin(th3 - th4);
    const w4 = (a * w2 / c) * Math.sin(th2 - th3) / Math.sin(th4 - th3);

    // ---- Aceleración (ec. 7.12) ----
    const Aa = c * Math.sin(th4), Ba = b * Math.sin(th3);
    const Ca = a * al2 * sn + a * w2 * w2 * cs + b * w3 * w3 * Math.cos(th3) - c * w4 * w4 * Math.cos(th4);
    const Da = c * Math.cos(th4), Ea = b * Math.cos(th3);
    const Fa = a * al2 * cs - a * w2 * w2 * sn - b * w3 * w3 * Math.sin(th3) + c * w4 * w4 * Math.sin(th4);
    const den = Aa * Ea - Ba * Da;
    const al3 = (Ca * Da - Aa * Fa) / den;
    const al4 = (Ca * Ea - Ba * Fa) / den;

    // ---- Puntos principales ----
    const O4 = C.of(d, 0);
    const RA = pos(a, th2);
    const RB = C.add(RA, pos(b, th3));
    const VA = vel(a, th2, w2);
    const VBA = vel(b, th3, w3);
    const VB = vel(c, th4, w4);
    const AA = acc(a, th2, w2, al2);
    const ABA = acc(b, th3, w3, al3);
    const AB = acc(c, th4, w4, al4);

    // ---- Centros de gravedad ----
    const n = (v) => +v || 0;
    const phiG2 = th2 + n(p.d2) * RAD, phiG3 = th3 + n(p.d3) * RAD, phiG4 = th4 + n(p.d4) * RAD;
    const RG2 = pos(n(p.Rg2), phiG2);
    const RG3 = C.add(RA, pos(n(p.Rg3), phiG3));
    const RG4 = C.add(O4, pos(n(p.Rg4), phiG4));
    const VG2 = vel(n(p.Rg2), phiG2, w2);
    const VG3 = C.add(VA, vel(n(p.Rg3), phiG3, w3));
    const VG4 = vel(n(p.Rg4), phiG4, w4);
    const AG2 = acc(n(p.Rg2), phiG2, w2, al2);
    const AG3 = C.add(AA, acc(n(p.Rg3), phiG3, w3, al3));
    const AG4 = acc(n(p.Rg4), phiG4, w4, al4);

    // ---- Puntos P3 y P4 (desde el CG de su eslabón) ----
    const phiP3 = th3 + n(p.dp3) * RAD, phiP4 = th4 + n(p.dp4) * RAD;
    const RP3 = C.add(RG3, pos(n(p.Rp3), phiP3));
    const RP4 = C.add(RG4, pos(n(p.Rp4), phiP4));
    const VP3 = C.add(VG3, vel(n(p.Rp3), phiP3, w3));
    const VP4 = C.add(VG4, vel(n(p.Rp4), phiP4, w4));
    const AP3 = C.add(AG3, acc(n(p.Rp3), phiP3, w3, al3));
    const AP4 = C.add(AG4, acc(n(p.Rp4), phiP4, w4, al4));

    return {
      tipo: "cuatroBarras", abierta, entrada: p,
      angulos: { th2: norm360(p.th2), th3: norm360(th3 / RAD), th4: norm360(th4 / RAD) },
      w: { w2, w3, w4 },
      al: { al2, al3, al4 },
      puntos: {
        O2: vec(C.of(0, 0)), O4: vec(O4), A: vec(RA), B: vec(RB),
        G2: vec(RG2), G3: vec(RG3), G4: vec(RG4), P3: vec(RP3), P4: vec(RP4),
      },
      V: { A: vec(VA), B: vec(VB), BA: vec(VBA), G2: vec(VG2), G3: vec(VG3), G4: vec(VG4), P3: vec(VP3), P4: vec(VP4) },
      Ac: { A: vec(AA), B: vec(AB), BA: vec(ABA), G2: vec(AG2), G3: vec(AG3), G4: vec(AG4), P3: vec(AP3), P4: vec(AP4) },
      extra: {
        transmision: anguloTransmision(th3, th4),
        grashof: grashof([a, b, c, d]),
        K: { K1, K2, K3, K4, K5 },
        coef: { A, B, C: Cc, D, E, F },
        // relación de velocidades angulares (ventaja mecánica ∝ ω2/ω4)
        relVel: w4 / w2,
      },
    };
  }

  // ================================================================
  // 2) MANIVELA-CORREDERA
  // ================================================================
  /**
   * @param {object} p {a,b,c, th2, w2, al2, abierta, Rg2,d2, Rg3,d3, Rp3,dp3}
   */
  function manivelaCorredera(p) {
    const { a, b } = p;
    const c = +p.c || 0;
    const w2 = p.w2, al2 = p.al2 || 0;
    const th2 = p.th2 * RAD;
    const abierta = p.abierta !== false;
    if (!(a > 0 && b > 0)) throw new Error("La manivela y la biela deben ser positivas.");

    // ---- Posición (ec. 4.17) ----
    let arg = (a * Math.sin(th2) - c) / b;
    if (Math.abs(arg) > 1 + 1e-9)
      throw new Error(`El mecanismo no se puede ensamblar en θ2 = ${p.th2}° (|a·senθ2 − c| > b).`);
    arg = Math.max(-1, Math.min(1, arg));
    const th3 = abierta ? Math.asin(-arg) + Math.PI : Math.asin(arg);
    const d = a * Math.cos(th2) - b * Math.cos(th3);

    // ---- Velocidad (ec. 6.22) ----
    const w3 = (a / b) * (Math.cos(th2) / Math.cos(th3)) * w2;
    const dd = -a * w2 * Math.sin(th2) + b * w3 * Math.sin(th3);

    // ---- Aceleración (ec. 7.16) ----
    const al3 = (a * al2 * Math.cos(th2) - a * w2 * w2 * Math.sin(th2) + b * w3 * w3 * Math.sin(th3)) /
      (b * Math.cos(th3));
    const ddd = -a * al2 * Math.sin(th2) - a * w2 * w2 * Math.cos(th2) +
      b * al3 * Math.sin(th3) + b * w3 * w3 * Math.cos(th3);

    // ---- Puntos ----
    const RA = pos(a, th2);
    const RB = C.of(d, c);
    const VA = vel(a, th2, w2);
    const VB = C.of(dd, 0);
    const AA = acc(a, th2, w2, al2);
    const AB = C.of(ddd, 0);
    const thAB = th3 + Math.PI; // dirección de la línea A→B
    const VBA = vel(b, thAB, w3);
    const ABA = acc(b, thAB, w3, al3);

    const n = (v) => +v || 0;
    const phiG2 = th2 + n(p.d2) * RAD, phiG3 = thAB + n(p.d3) * RAD;
    const RG2 = pos(n(p.Rg2), phiG2);
    const RG3 = C.add(RA, pos(n(p.Rg3), phiG3));
    const VG2 = vel(n(p.Rg2), phiG2, w2);
    const VG3 = C.add(VA, vel(n(p.Rg3), phiG3, w3));
    const AG2 = acc(n(p.Rg2), phiG2, w2, al2);
    const AG3 = C.add(AA, acc(n(p.Rg3), phiG3, w3, al3));

    const phiP3 = thAB + n(p.dp3) * RAD;
    const RP3 = C.add(RG3, pos(n(p.Rp3), phiP3));
    const VP3 = C.add(VG3, vel(n(p.Rp3), phiP3, w3));
    const AP3 = C.add(AG3, acc(n(p.Rp3), phiP3, w3, al3));

    return {
      tipo: "manivelaCorredera", abierta, entrada: p,
      angulos: { th2: norm360(p.th2), th3: norm360(th3 / RAD) },
      w: { w2, w3 },
      al: { al2, al3 },
      corredera: { d, dd, ddd },
      puntos: {
        O2: vec(C.of(0, 0)), A: vec(RA), B: vec(RB),
        G2: vec(RG2), G3: vec(RG3), G4: vec(RB), P3: vec(RP3),
      },
      V: { A: vec(VA), B: vec(VB), BA: vec(VBA), G2: vec(VG2), G3: vec(VG3), G4: vec(VB), P3: vec(VP3) },
      Ac: { A: vec(AA), B: vec(AB), BA: vec(ABA), G2: vec(AG2), G3: vec(AG3), G4: vec(AB), P3: vec(AP3) },
      extra: {
        // ángulo entre la biela y la normal a la guía
        transmision: 90 - anguloTransmision(th3, 0),
        carrera: carreraCorredera(a, b, c),
      },
    };
  }

  /** Posiciones extremas de la corredera (configuración abierta) */
  function carreraCorredera(a, b, c) {
    if (b - a < Math.abs(c)) return null;
    const dmax = Math.sqrt((a + b) ** 2 - c * c);
    const dmin = Math.sqrt((b - a) ** 2 - c * c);
    return { dmin, dmax, carrera: dmax - dmin };
  }

  /** Barrido de una vuelta completa de la manivela (para gráficas y trayectorias) */
  function barrido(fn, p, pasos) {
    pasos = pasos || 360;
    const out = [];
    for (let i = 0; i <= pasos; i++) {
      const th = (360 * i) / pasos;
      try {
        out.push({ th2: th, r: fn({ ...p, th2: th }) });
      } catch (e) {
        out.push({ th2: th, r: null });
      }
    }
    return out;
  }

  const api = { cuatroBarras, manivelaCorredera, barrido, norm360, grashof };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Cinematica = api;
})(typeof window !== "undefined" ? window : globalThis);
