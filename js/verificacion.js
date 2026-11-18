/*
 * verificacion.js — Compara los resultados del programa con todas las filas
 * (a–g) de las Tablas P11-1, P11-2 y P11-3 de Norton.
 * Para cada fila se usa la configuración (abierta o cruzada) que reproduce el θ3
 * publicado y se informa cuál fue.
 */
(function (global) {
  "use strict";

  const K = typeof module !== "undefined" && module.exports ? require("./cinematica.js") : global.Cinematica;
  const DN = typeof module !== "undefined" && module.exports ? require("./datos-norton.js") : global.DatosNorton;
  const DY = typeof module !== "undefined" && module.exports ? require("./dinamica.js") : global.Dinamica;

  const difAng = (x, y) => Math.abs((((x - y) % 360) + 540) % 360 - 180);
  // Los valores del libro tienen 2 decimales: se acepta el error de redondeo
  const tolNum = (ref) => Math.max(0.0051, Math.abs(ref) * 2e-4) + 1e-9;
  const TOL_ANG = 0.0151;

  function cmpEscalar(nombre, calc, libro, esAngulo) {
    const err = esAngulo ? difAng(calc, libro) : Math.abs(calc - libro);
    return { nombre, calc, libro, ok: err <= (esAngulo ? TOL_ANG : tolNum(libro)) };
  }
  function cmpVector(nombre, v, libro) {
    const ok = Math.abs(v.mag - libro[0]) <= tolNum(libro[0]) &&
      (libro[0] < 1e-6 || difAng(v.ang, libro[1]) <= TOL_ANG);
    return { nombre, calc: [v.mag, v.ang], libro: [libro[0], K.norm360(libro[1])], ok, vector: true };
  }

  function elegirConfig(fn, entrada, th3Libro) {
    const ab = fn({ ...entrada, abierta: true });
    let cr = null;
    try { cr = fn({ ...entrada, abierta: false }); } catch (e) { /* sin solución cruzada */ }
    if (!cr || difAng(ab.angulos.th3, th3Libro) <= difAng(cr.angulos.th3, th3Libro)) return ab;
    return cr;
  }

  /** Marca las diferencias que corresponden a erratas documentadas del libro */
  function cerrar(clave, tabla, fila, r, comps) {
    for (const c of comps) {
      const nota = DN.erratas[`${clave}/${fila}/${c.nombre}`];
      if (!c.ok && nota) { c.errata = nota; }
      c.estado = c.ok ? "ok" : c.errata ? "errata" : "falla";
    }
    return {
      tabla, fila, config: r.abierta ? "abierta" : "cruzada", comparaciones: comps,
      ok: comps.every((x) => x.estado !== "falla"),
    };
  }

  function verificarCorredera() {
    return DN.corredera.map(({ fila, entrada, esperado: e }) => {
      const r = elegirConfig(K.manivelaCorredera, entrada, e.th3);
      const c = [
        cmpEscalar("θ3 (°)", r.angulos.th3, K.norm360(e.th3), true),
        cmpEscalar("ω3 (rad/s)", r.w.w3, e.w3),
        cmpEscalar("α3 (rad/s²)", r.al.al3, e.al3),
        cmpVector("V_G2", r.V.G2, e.VG2),
        cmpVector("V_G3", r.V.G3, e.VG3),
        cmpVector("V_G4", r.V.G4, e.VG4),
        cmpVector("V_P3", r.V.P3, e.VP3),
        cmpVector("a_G2", r.Ac.G2, e.AG2),
        cmpVector("a_G3", r.Ac.G3, e.AG3),
        cmpVector("a_G4", r.Ac.G4, e.AG4),
      ];
      return cerrar("corredera", "P11-1 / P11-2", fila, r, c);
    });
  }

  function verificarCuatroBarras() {
    return DN.cuatroBarras.map(({ fila, entrada, esperado: e }) => {
      const r = elegirConfig(K.cuatroBarras, entrada, e.th3);
      const c = [
        cmpEscalar("θ3 (°)", r.angulos.th3, K.norm360(e.th3), true),
        cmpEscalar("θ4 (°)", r.angulos.th4, K.norm360(e.th4), true),
        cmpEscalar("ω3 (rad/s)", r.w.w3, e.w3),
        cmpEscalar("ω4 (rad/s)", r.w.w4, e.w4),
        cmpEscalar("α3 (rad/s²)", r.al.al3, e.al3),
        cmpEscalar("α4 (rad/s²)", r.al.al4, e.al4),
        cmpVector("a_G2", r.Ac.G2, e.AG2),
        cmpVector("a_G3", r.Ac.G3, e.AG3),
        cmpVector("a_G4", r.Ac.G4, e.AG4),
      ];
      return cerrar("cuatroBarras", "P11-3", fila, r, c);
    });
  }

  function verificarTodo() {
    return { corredera: verificarCorredera(), cuatroBarras: verificarCuatroBarras() };
  }

  /**
   * Comprobación dinámica (el libro no publica las fuerzas de estas tablas):
   * balance de potencia (trabajo virtual) y equilibrio global del mecanismo.
   */
  function verificarDinamica() {
    const filas = [];
    const grupos = [["Manivela-corredera (P11-1)", DN.corredera, K.manivelaCorredera], ["Cuatro barras (P11-3)", DN.cuatroBarras, K.cuatroBarras]];
    for (const [nombre, datos, fn] of grupos) {
      for (const { fila, entrada } of datos) {
        const r = fn(entrada), F = DY.fuerzas(r), e = r.entrada;
        const ext = { x: F.FP3.x + F.FP4.x, y: F.FP3.y + F.FP4.y };
        const sma = { x: 0, y: 0 };
        [["m2", "G2"], ["m3", "G3"], ["m4", "G4"]].forEach(([m, g]) => { sma.x += (+e[m] || 0) * r.Ac[g].x; sma.y += (+e[m] || 0) * r.Ac[g].y; });
        const residuo = Math.hypot(F.F12.x + F.F14.x + ext.x - sma.x, F.F12.y + F.F14.y + ext.y - sma.y);
        filas.push({
          mecanismo: nombre, fila, T12: F.T12, F12: F.F12, F32: F.F32, F43: F.F43, F14: F.F14,
          potEntrada: F.potEntrada, potInercia: F.potInercia,
          ok: F.errorPotencia < 1e-9 && residuo < 1e-9 * Math.max(1, F.F12.mag),
        });
      }
    }
    return filas;
  }

  const api = { verificarTodo, verificarDinamica };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Verificacion = api;
})(typeof window !== "undefined" ? window : globalThis);
