/* app.js — interfaz de usuario */
(function () {
  "use strict";
  const K = window.Cinematica, DN = window.DatosNorton, VF = window.Verificacion;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // ------------------------------------------------------------------
  // definición de campos por mecanismo
  // ------------------------------------------------------------------
  const CAMPOS = {
    cuatroBarras: {
      eslabones: [["a", "a", "eslabón 2 · manivela"], ["b", "b", "eslabón 3 · acoplador"], ["c", "c", "eslabón 4 · balancín"], ["d", "d", "eslabón 1 · bancada"]],
      cg: [["Rg2", "R<sub>g2</sub>"], ["d2", "δ<sub>2</sub> °"], ["Rg3", "R<sub>g3</sub>"], ["d3", "δ<sub>3</sub> °"], ["Rg4", "R<sub>g4</sub>"], ["d4", "δ<sub>4</sub> °"]],
      p: [["Rp3", "R<sub>P3</sub>"], ["dp3", "δ<sub>RP3</sub> °"], ["Rp4", "R<sub>P4</sub>"], ["dp4", "δ<sub>RP4</sub> °"]],
      defecto: DN.cuatroBarras[1].entrada,
    },
    manivelaCorredera: {
      eslabones: [["a", "a", "eslabón 2 · manivela"], ["b", "b", "eslabón 3 · biela"], ["c", "c", "descentrado"]],
      cg: [["Rg2", "R<sub>g2</sub>"], ["d2", "δ<sub>2</sub> °"], ["Rg3", "R<sub>g3</sub>"], ["d3", "δ<sub>3</sub> °"]],
      p: [["Rp3", "R<sub>P3</sub>"], ["dp3", "δ<sub>RP3</sub> °"]],
      defecto: DN.corredera[1].entrada,
    },
  };

  const EJEMPLOS = {
    cuatroBarras: [
      ...DN.cuatroBarras.map((r) => ({ nombre: `Norton Tabla P11-3 · fila ${r.fila}`, datos: r.entrada })),
      { nombre: "Ejemplo de clase (a=2, b=7, c=9, d=6)", datos: { a: 2, b: 7, c: 9, d: 6, th2: 30, w2: 10, al2: 0, Rg2: 0, d2: 0, Rg3: 0, d3: 0, Rg4: 0, d4: 0, Rp3: 0, dp3: 0, Rp4: 0, dp4: 0 } },
    ],
    manivelaCorredera: DN.corredera.map((r) => ({ nombre: `Norton Tabla P11-1 · fila ${r.fila}`, datos: r.entrada })),
  };

  // ------------------------------------------------------------------
  // estado
  // ------------------------------------------------------------------
  const guardado = leerLS("ac-estado") || {};
  const estado = {
    modo: "cuatroBarras",
    valores: {
      cuatroBarras: { ...CAMPOS.cuatroBarras.defecto, ...(guardado.cuatroBarras || {}) },
      manivelaCorredera: { ...CAMPOS.manivelaCorredera.defecto, ...(guardado.manivelaCorredera || {}) },
    },
    abierta: { cuatroBarras: true, manivelaCorredera: true },
    resultado: null,
    barrido: null,
    claveBarrido: "",
    animando: false,
  };

  function leerLS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function escribirLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

  // ------------------------------------------------------------------
  // formato
  // ------------------------------------------------------------------
  const fmt = (x, d = 4) => (x == null || !isFinite(x) ? "—" : (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d));
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  // ------------------------------------------------------------------
  // construcción del formulario
  // ------------------------------------------------------------------
  function campoHTML(id, etiqueta, sub) {
    return `<div class="campo"><label for="f-${id}">${etiqueta}${sub ? ` <small>${sub}</small>` : ""}</label>
      <input type="number" step="any" id="f-${id}" data-k="${id}" /></div>`;
  }

  function construirFormulario() {
    const def = CAMPOS[estado.modo];
    $("#campos-eslabones").innerHTML = def.eslabones.map(([k, l, s]) => campoHTML(k, l, s)).join("");
    $("#campos-cg").innerHTML = def.cg.map(([k, l]) => campoHTML(k, l)).join("");
    $("#campos-p").innerHTML = def.p.map(([k, l]) => campoHTML(k, l)).join("");
    $("#ejemplo").innerHTML = `<option value="">Cargar ejemplo…</option>` +
      EJEMPLOS[estado.modo].map((e, i) => `<option value="${i}">${e.nombre}</option>`).join("");
    volcarValores();
    $$("#form input[data-k]").forEach((inp) => inp.addEventListener("input", alEditar));

    const mags = estado.modo === "cuatroBarras"
      ? [["th3", "θ3 (°)"], ["th4", "θ4 (°)"], ["w3", "ω3 (rad/s)"], ["w4", "ω4 (rad/s)"], ["al3", "α3 (rad/s²)"], ["al4", "α4 (rad/s²)"], ["mu", "Ángulo de transmisión μ (°)"], ["VP3", "|V_P3|"], ["AG3", "|a_G3|"], ["AP3", "|a_P3|"]]
      : [["d", "Posición corredera d"], ["dd", "Velocidad corredera ḋ"], ["ddd", "Aceleración corredera d̈"], ["th3", "θ3 (°)"], ["w3", "ω3 (rad/s)"], ["al3", "α3 (rad/s²)"], ["mu", "Ángulo de transmisión μ (°)"], ["VP3", "|V_P3|"], ["AG3", "|a_G3|"]];
    $("#magnitud").innerHTML = mags.map(([k, l]) => `<option value="${k}">${l}</option>`).join("");
  }

  function volcarValores() {
    const v = estado.valores[estado.modo];
    $$("#form input[data-k]").forEach((inp) => { inp.value = v[inp.dataset.k] ?? 0; });
    $("#th2").value = v.th2;
    $("#th2-rango").value = K.norm360(v.th2);
    $("#w2").value = v.w2;
    $("#al2").value = v.al2;
    $$(".segmentado button").forEach((b) => b.classList.toggle("activa", (b.dataset.conf === "abierta") === estado.abierta[estado.modo]));
  }

  function alEditar(e) {
    const inp = e.target;
    const val = parseFloat(inp.value);
    inp.classList.toggle("invalido", !isFinite(val));
    if (!isFinite(val)) return;
    estado.valores[estado.modo][inp.dataset.k] = val;
    calcular();
  }

  // ------------------------------------------------------------------
  // cálculo
  // ------------------------------------------------------------------
  function parametros() {
    return { ...estado.valores[estado.modo], abierta: estado.abierta[estado.modo] };
  }

  function calcular() {
    const p = parametros();
    const fn = K[estado.modo];
    const err = $("#error");
    escribirLS("ac-estado", estado.valores);
    try {
      estado.resultado = fn(p);
      err.hidden = true;
    } catch (e) {
      estado.resultado = null;
      err.textContent = e.message;
      err.hidden = false;
    }
    // el barrido solo cambia si cambian datos distintos de θ2
    const clave = JSON.stringify({ ...p, th2: 0, modo: estado.modo });
    if (clave !== estado.claveBarrido) {
      estado.barrido = K.barrido(fn, p, 360);
      estado.claveBarrido = clave;
    }
    pintarTodo();
  }

  function pintarTodo() {
    pintarResumen();
    pintarResultados();
    dibujarMecanismo();
    dibujarGrafica();
  }

  // ------------------------------------------------------------------
  // tarjetas de resumen
  // ------------------------------------------------------------------
  function tarjeta(clase, titulo, valor, sub) {
    return `<div class="tarjeta ${clase}"><div class="t">${titulo}</div><div class="v">${valor}</div><div class="s">${sub || ""}</div></div>`;
  }

  function pintarResumen() {
    const r = estado.resultado, el = $("#resumen");
    if (!r) { el.innerHTML = ""; return; }
    if (r.tipo === "cuatroBarras") {
      el.innerHTML =
        tarjeta("e3", "θ3 · acoplador", fmt(r.angulos.th3, 3) + "°", `ω3 = ${fmt(r.w.w3, 3)} · α3 = ${fmt(r.al.al3, 2)}`) +
        tarjeta("e4", "θ4 · balancín", fmt(r.angulos.th4, 3) + "°", `ω4 = ${fmt(r.w.w4, 3)} · α4 = ${fmt(r.al.al4, 2)}`) +
        tarjeta("", "Ángulo de transmisión", fmt(r.extra.transmision, 2) + "°", r.extra.transmision < 40 ? "⚠ menor a 40°" : "aceptable (≥ 40°)") +
        tarjeta("", "Condición de Grashof", r.extra.grashof.clase === "I" ? "Clase I" : r.extra.grashof.clase === "II" ? "Clase II" : "Clase III", r.extra.grashof.tipo);
    } else {
      const ca = r.extra.carrera;
      el.innerHTML =
        tarjeta("e3", "θ3 · biela", fmt(r.angulos.th3, 3) + "°", `ω3 = ${fmt(r.w.w3, 3)} · α3 = ${fmt(r.al.al3, 2)}`) +
        tarjeta("e4", "Corredera d", fmt(r.corredera.d, 4), `ḋ = ${fmt(r.corredera.dd, 3)}`) +
        tarjeta("e4", "Aceleración d̈", fmt(r.corredera.ddd, 3), "de la corredera") +
        tarjeta("", "Carrera", ca ? fmt(ca.carrera, 4) : "—", ca ? `d entre ${fmt(ca.dmin, 3)} y ${fmt(ca.dmax, 3)}` : "la manivela no da vuelta completa") +
        tarjeta("", "Ángulo de transmisión", fmt(r.extra.transmision, 2) + "°", r.extra.transmision < 40 ? "⚠ menor a 40°" : "aceptable (≥ 40°)");
    }
  }

  // ------------------------------------------------------------------
  // tablas de resultados
  // ------------------------------------------------------------------
  const NOMBRES = {
    A: "A", B: "B", BA: "B/A <small>(relativa)</small>", G2: "G2 <small>(CG 2)</small>", G3: "G3 <small>(CG 3)</small>",
    G4: "G4 <small>(CG 4)</small>", P3: "P3", P4: "P4", O2: "O2", O4: "O4",
  };

  function tablaVectores(obj, claves, pre) {
    const filas = claves.filter((k) => obj[k]).map((k) => {
      const v = obj[k];
      return `<tr><td>${pre}<sub>${NOMBRES[k]}</sub></td><td>${fmt(v.x, 3)}</td><td>${fmt(v.y, 3)}</td><td>${fmt(v.mag, 3)}</td><td>${fmt(v.ang, 2)}°</td></tr>`;
    }).join("");
    return `<div class="tabla-scroll"><table><thead><tr><th></th><th>x</th><th>y</th><th>magnitud</th><th>ángulo</th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }

  function tablaEscalares(filas) {
    return `<table><tbody>${filas.map(([n, v, u]) => `<tr><td>${n}</td><td>${v} <small>${u || ""}</small></td></tr>`).join("")}</tbody></table>`;
  }

  function pintarResultados() {
    const r = estado.resultado, el = $("#resultados");
    if (!r) { el.innerHTML = `<p class="ayuda">Corrija los datos para ver resultados.</p>`; return; }
    const cb = r.tipo === "cuatroBarras";
    const ptsPos = cb ? ["A", "B", "G2", "G3", "G4", "P3", "P4"] : ["A", "B", "G2", "G3", "P3"];
    const ptsV = cb ? ["A", "B", "BA", "G2", "G3", "G4", "P3", "P4"] : ["A", "B", "BA", "G2", "G3", "G4", "P3"];

    const posEsc = cb
      ? [["θ2", fmt(r.angulos.th2, 4) + "°"], ["θ3", fmt(r.angulos.th3, 4) + "°"], ["θ4", fmt(r.angulos.th4, 4) + "°"]]
      : [["θ2", fmt(r.angulos.th2, 4) + "°"], ["θ3", fmt(r.angulos.th3, 4) + "°"], ["d (corredera)", fmt(r.corredera.d, 4)]];
    const velEsc = cb
      ? [["ω2", fmt(r.w.w2, 4), "rad/s"], ["ω3", fmt(r.w.w3, 4), "rad/s"], ["ω4", fmt(r.w.w4, 4), "rad/s"], ["ω4 / ω2", fmt(r.extra.relVel, 4)]]
      : [["ω2", fmt(r.w.w2, 4), "rad/s"], ["ω3", fmt(r.w.w3, 4), "rad/s"], ["ḋ (corredera)", fmt(r.corredera.dd, 4), "long/s"]];
    const accEsc = cb
      ? [["α2", fmt(r.al.al2, 4), "rad/s²"], ["α3", fmt(r.al.al3, 4), "rad/s²"], ["α4", fmt(r.al.al4, 4), "rad/s²"]]
      : [["α2", fmt(r.al.al2, 4), "rad/s²"], ["α3", fmt(r.al.al3, 4), "rad/s²"], ["d̈ (corredera)", fmt(r.corredera.ddd, 4), "long/s²"]];

    let otros;
    if (cb) {
      const k = r.extra.K, c = r.extra.coef;
      otros = tablaEscalares([
        ["Grashof", r.extra.grashof.tipo], ["Ángulo de transmisión μ", fmt(r.extra.transmision, 3) + "°"],
        ["K1 · K2 · K3", `${fmt(k.K1, 4)} · ${fmt(k.K2, 4)} · ${fmt(k.K3, 4)}`], ["K4 · K5", `${fmt(k.K4, 4)} · ${fmt(k.K5, 4)}`],
        ["A · B · C", `${fmt(c.A, 4)} · ${fmt(c.B, 4)} · ${fmt(c.C, 4)}`], ["D · E · F", `${fmt(c.D, 4)} · ${fmt(c.E, 4)} · ${fmt(c.F, 4)}`],
      ]);
    } else {
      const ca = r.extra.carrera;
      otros = tablaEscalares([
        ["Ángulo de transmisión μ", fmt(r.extra.transmision, 3) + "°"],
        ["Carrera", ca ? fmt(ca.carrera, 4) : "—"], ["d mínima · máxima", ca ? `${fmt(ca.dmin, 4)} · ${fmt(ca.dmax, 4)}` : "—"],
      ]);
    }

    el.innerHTML = `
      <div class="grupo" style="--c:var(--e2)"><h3>Posición</h3>${tablaEscalares(posEsc)}${tablaVectores(r.puntos, ptsPos, "R")}</div>
      <div class="grupo" style="--c:var(--vel)"><h3>Velocidad</h3>${tablaEscalares(velEsc)}${tablaVectores(r.V, ptsV, "V")}</div>
      <div class="grupo" style="--c:var(--acc)"><h3>Aceleración</h3>${tablaEscalares(accEsc)}${tablaVectores(r.Ac, ptsV, "a")}</div>
      <div class="grupo" style="--c:var(--e4)"><h3>Otros datos</h3>${otros}</div>`;
  }

  // ------------------------------------------------------------------
  // dibujo del mecanismo
  // ------------------------------------------------------------------
  function prepararCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight || +cv.getAttribute("height");
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function flecha(ctx, x1, y1, x2, y2, color) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 2) return;
    const ang = Math.atan2(y2 - y1, x2 - x1), t = Math.min(10, L * 0.4);
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(ang) * t * 0.7, y2 - Math.sin(ang) * t * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - t * Math.cos(ang - 0.4), y2 - t * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - t * Math.cos(ang + 0.4), y2 - t * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }

  function dibujarMecanismo() {
    const cv = $("#lienzo");
    const { ctx, w, h } = prepararCanvas(cv);
    const r = estado.resultado;
    if (!r) return;
    const cb = r.tipo === "cuatroBarras";
    const P = r.puntos;
    const verTray = $("#ver-tray").checked;

    // caja que contiene todo (vuelta completa) para que la escala no salte al animar
    const pts = [P.O2, P.A, P.B, P.G3, P.P3];
    if (cb) pts.push(P.O4, P.G4, P.P4);
    (estado.barrido || []).forEach(({ r: q }) => { if (q) pts.push(q.puntos.A, q.puntos.B, q.puntos.P3, q.puntos.G3); });
    let minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    let minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const pad = 46;
    const esc = Math.min((w - 2 * pad) / Math.max(maxX - minX, 1e-6), (h - 2 * pad) / Math.max(maxY - minY, 1e-6));
    const ox = (w - (maxX - minX) * esc) / 2 - minX * esc;
    const oy = (h + (maxY - minY) * esc) / 2 + minY * esc;
    const T = (p) => [ox + p.x * esc, oy - p.y * esc];

    const c = { e2: cssVar("--e2"), e3: cssVar("--e3"), e4: cssVar("--e4"), v: cssVar("--vel"), a: cssVar("--acc"), t: cssVar("--texto"), t3: cssVar("--texto-3"), b: cssVar("--borde"), s: cssVar("--superficie") };

    // ejes
    ctx.strokeStyle = c.b; ctx.lineWidth = 1;
    const [x0, y0] = T({ x: 0, y: 0 });
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke();

    // trayectorias
    if (verTray && estado.barrido) {
      const tray = (sel, color) => {
        ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.setLineDash([4, 4]); ctx.beginPath();
        let ini = true;
        estado.barrido.forEach(({ r: q }) => {
          if (!q) { ini = true; return; }
          const [x, y] = T(sel(q));
          ini ? ctx.moveTo(x, y) : ctx.lineTo(x, y); ini = false;
        });
        ctx.stroke(); ctx.setLineDash([]);
      };
      tray((q) => q.puntos.A, c.e2 + "88");
      if (P.P3.x !== P.G3.x || P.P3.y !== P.G3.y) tray((q) => q.puntos.P3, c.e3 + "aa");
      tray((q) => q.puntos.G3, c.e3 + "66");
      if (cb) tray((q) => q.puntos.B, c.e4 + "88");
    }

    // bancada / guía
    const tierra = (p) => {
      const [x, y] = T(p);
      ctx.fillStyle = c.t3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 11, y + 16); ctx.lineTo(x + 11, y + 16); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.t3; ctx.lineWidth = 1.5;
      for (let i = -14; i <= 10; i += 6) { ctx.beginPath(); ctx.moveTo(x + i, y + 22); ctx.lineTo(x + i + 5, y + 17); ctx.stroke(); }
    };
    tierra(P.O2);
    if (cb) tierra(P.O4);
    else {
      const [, yg] = T({ x: 0, y: r.entrada.c || 0 });
      ctx.strokeStyle = c.t3; ctx.lineWidth = 1.5; ctx.setLineDash([8, 5]);
      ctx.beginPath(); ctx.moveTo(10, yg + 14); ctx.lineTo(w - 10, yg + 14); ctx.stroke(); ctx.setLineDash([]);
    }
    if (cb) { // eslabón 1
      const [a1, b1] = T(P.O2), [a2, b2] = T(P.O4);
      ctx.strokeStyle = c.t3; ctx.lineWidth = 2; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke(); ctx.setLineDash([]);
    }

    // eslabones (el 3 como triángulo si hay punto P3)
    const barra = (p1, p2, color, ancho) => {
      const [a1, b1] = T(p1), [a2, b2] = T(p2);
      ctx.strokeStyle = color; ctx.lineWidth = ancho || 9; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
    };
    const extra3 = [P.G3, P.P3].filter((q) => Math.hypot(q.x - P.A.x, q.y - P.A.y) > 1e-9);
    if (extra3.length) {
      ctx.fillStyle = c.e3 + "33"; ctx.beginPath();
      [P.A, P.B, ...extra3].forEach((q, i) => { const [x, y] = T(q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fill();
      extra3.forEach((q) => barra(P.A, q, c.e3 + "77", 3));
      extra3.forEach((q) => barra(P.B, q, c.e3 + "77", 3));
    }
    if (cb) { // eslabón 4 como cuerpo si tiene CG o punto P fuera de su línea
      const extra4 = [P.G4, P.P4].filter((q) => Math.hypot(q.x - P.O4.x, q.y - P.O4.y) > 1e-9);
      if (extra4.length) {
        ctx.fillStyle = c.e4 + "26"; ctx.beginPath();
        [P.O4, P.B, ...extra4].forEach((q, i) => { const [x, y] = T(q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.closePath(); ctx.fill();
        extra4.forEach((q) => { barra(P.O4, q, c.e4 + "66", 3); barra(P.B, q, c.e4 + "66", 3); });
      }
    }
    barra(P.O2, P.A, c.e2);
    barra(P.A, P.B, c.e3);
    if (cb) barra(P.O4, P.B, c.e4);
    else {
      const [bx, by] = T(P.B);
      ctx.fillStyle = c.e4 + "40"; ctx.strokeStyle = c.e4; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx - 26, by - 14, 52, 28, 5); ctx.fill(); ctx.stroke();
    }

    // juntas
    const junta = (p, nombre, dx, dy) => {
      const [x, y] = T(p);
      ctx.fillStyle = c.s; ctx.strokeStyle = c.t; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      if (nombre) { ctx.fillStyle = c.t; ctx.font = "600 13px system-ui"; ctx.fillText(nombre, x + (dx || 9), y + (dy || -9)); }
    };
    const cg = (p, nombre) => {
      const [x, y] = T(p);
      ctx.fillStyle = c.t; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI / 2); ctx.lineTo(x, y); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 5, Math.PI, 1.5 * Math.PI); ctx.lineTo(x, y); ctx.fill();
      ctx.strokeStyle = c.t; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.stroke();
      ctx.font = "12px system-ui"; ctx.fillStyle = c.t3; ctx.fillText(nombre, x + 8, y + 14);
    };
    const ent = r.entrada;
    if (+ent.Rg2) cg(P.G2, "G2");
    if (+ent.Rg3) cg(P.G3, "G3");
    if (cb && +ent.Rg4) cg(P.G4, "G4");
    if (+ent.Rp3) junta(P.P3, "P3");
    if (cb && +ent.Rp4) junta(P.P4, "P4");
    junta(P.O2, "O2", -24, 6);
    if (cb) junta(P.O4, "O4", 10, 6);
    junta(P.A, "A");
    junta(P.B, "B");

    // vectores
    const L = Math.min(w, h) * 0.26;
    const vectores = (dic, color, claves) => {
      const lista = claves.filter((k) => dic[k] && P[k]);
      const max = Math.max(...lista.map((k) => dic[k].mag), 1e-9);
      lista.forEach((k) => {
        const v = dic[k], [x, y] = T(P[k]);
        flecha(ctx, x, y, x + (v.x / max) * L, y - (v.y / max) * L, color);
      });
    };
    const claves = cb ? ["A", "B", "G3", "P3"] : ["A", "B", "G3", "P3"];
    if ($("#ver-vel").checked) vectores(r.V, c.v, claves);
    if ($("#ver-acc").checked) vectores(r.Ac, c.a, claves);

    // rótulo de configuración
    ctx.fillStyle = c.t3; ctx.font = "12px system-ui";
    ctx.fillText(`θ2 = ${fmt(r.angulos.th2, 1)}° · configuración ${r.abierta ? "abierta" : "cruzada"}`, 12, h - 12);
  }

  // ------------------------------------------------------------------
  // gráfica de una vuelta
  // ------------------------------------------------------------------
  function valorDe(q, k) {
    if (!q) return null;
    switch (k) {
      case "th3": return q.angulos.th3;
      case "th4": return q.angulos.th4;
      case "w3": return q.w.w3;
      case "w4": return q.w.w4;
      case "al3": return q.al.al3;
      case "al4": return q.al.al4;
      case "mu": return q.extra.transmision;
      case "VP3": return q.V.P3.mag;
      case "AG3": return q.Ac.G3.mag;
      case "AP3": return q.Ac.P3.mag;
      case "d": return q.corredera.d;
      case "dd": return q.corredera.dd;
      case "ddd": return q.corredera.ddd;
    }
    return null;
  }

  let hoverX = null;
  function dibujarGrafica() {
    const cv = $("#grafica");
    const { ctx, w, h } = prepararCanvas(cv);
    const k = $("#magnitud").value;
    const datos = (estado.barrido || []).map(({ th2, r }) => [th2, valorDe(r, k)]);
    const ys = datos.map((d) => d[1]).filter((y) => y != null && isFinite(y));
    const c = { l: cssVar("--primario"), t: cssVar("--texto-2"), t3: cssVar("--texto-3"), b: cssVar("--borde"), a: cssVar("--acc") };
    if (!ys.length) { ctx.fillStyle = c.t3; ctx.fillText("Sin datos", 20, 30); return; }
    let ymin = Math.min(...ys), ymax = Math.max(...ys);
    if (ymax - ymin < 1e-9) { ymin -= 1; ymax += 1; }
    const m = { l: 62, r: 16, t: 14, b: 32 };
    const X = (x) => m.l + (x / 360) * (w - m.l - m.r);
    const Y = (y) => m.t + (1 - (y - ymin) / (ymax - ymin)) * (h - m.t - m.b);

    ctx.font = "11.5px system-ui"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = ymin + ((ymax - ymin) * i) / 4;
      ctx.strokeStyle = c.b; ctx.beginPath(); ctx.moveTo(m.l, Y(y)); ctx.lineTo(w - m.r, Y(y)); ctx.stroke();
      ctx.fillStyle = c.t3; ctx.textAlign = "right"; ctx.fillText(fmt(y, Math.abs(ymax - ymin) > 50 ? 0 : 2), m.l - 8, Y(y) + 4);
    }
    ctx.textAlign = "center";
    for (let x = 0; x <= 360; x += 45) ctx.fillText(x + "°", X(x), h - 10);
    ctx.textAlign = "left";
    if (ymin < 0 && ymax > 0) { ctx.strokeStyle = c.t3; ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(w - m.r, Y(0)); ctx.stroke(); }

    ctx.strokeStyle = c.l; ctx.lineWidth = 2.2; ctx.beginPath();
    let ini = true, prev = null;
    datos.forEach(([x, y]) => {
      if (y == null || !isFinite(y)) { ini = true; return; }
      const salto = (k === "th3" || k === "th4") && prev != null && Math.abs(y - prev) > 180;
      if (ini || salto) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y));
      ini = false; prev = y;
    });
    ctx.stroke();

    // marcador en el θ2 actual
    const r = estado.resultado;
    if (r) {
      const xv = K.norm360(r.angulos.th2), yv = valorDe(r, k);
      ctx.strokeStyle = c.a; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(xv), m.t); ctx.lineTo(X(xv), h - m.b); ctx.stroke(); ctx.setLineDash([]);
      if (yv != null) { ctx.fillStyle = c.a; ctx.beginPath(); ctx.arc(X(xv), Y(yv), 4.5, 0, 2 * Math.PI); ctx.fill(); }
    }
    // lectura al pasar el ratón
    if (hoverX != null) {
      const th = Math.round(((hoverX - m.l) / (w - m.l - m.r)) * 360);
      const d = datos[Math.max(0, Math.min(360, th))];
      if (d && d[1] != null) {
        ctx.fillStyle = c.t; ctx.beginPath(); ctx.arc(X(d[0]), Y(d[1]), 3.5, 0, 2 * Math.PI); ctx.fill();
        const txt = `θ2 = ${d[0]}° → ${fmt(d[1], 3)}`;
        ctx.font = "600 12px system-ui";
        const tw = ctx.measureText(txt).width;
        const tx = Math.min(X(d[0]) + 10, w - tw - 14);
        ctx.fillStyle = cssVar("--superficie"); ctx.fillRect(tx - 6, m.t, tw + 12, 22);
        ctx.fillStyle = c.t; ctx.fillText(txt, tx, m.t + 15);
      }
    }
  }

  // ------------------------------------------------------------------
  // exportar
  // ------------------------------------------------------------------
  function textoResultados() {
    const r = estado.resultado;
    if (!r) return "";
    const L = [];
    const e = r.entrada;
    L.push(r.tipo === "cuatroBarras" ? "CUATRO BARRAS (MANIVELA-BALANCÍN)" : "MANIVELA-CORREDERA");
    L.push(`Configuración: ${r.abierta ? "abierta" : "cruzada"}`);
    L.push(r.tipo === "cuatroBarras" ? `a=${e.a} b=${e.b} c=${e.c} d=${e.d}` : `a=${e.a} b=${e.b} descentrado=${e.c}`);
    L.push(`θ2=${e.th2}°  ω2=${e.w2} rad/s  α2=${e.al2} rad/s²`, "");
    L.push(`θ3 = ${fmt(r.angulos.th3)}°`);
    if (r.angulos.th4 != null) L.push(`θ4 = ${fmt(r.angulos.th4)}°`);
    if (r.corredera) L.push(`d = ${fmt(r.corredera.d)}`, `ḋ = ${fmt(r.corredera.dd)}`, `d̈ = ${fmt(r.corredera.ddd)}`);
    L.push(`ω3 = ${fmt(r.w.w3)} rad/s`);
    if (r.w.w4 != null) L.push(`ω4 = ${fmt(r.w.w4)} rad/s`);
    L.push(`α3 = ${fmt(r.al.al3)} rad/s²`);
    if (r.al.al4 != null) L.push(`α4 = ${fmt(r.al.al4)} rad/s²`);
    L.push("");
    for (const [titulo, dic] of [["Posición", r.puntos], ["Velocidad", r.V], ["Aceleración", r.Ac]]) {
      L.push(titulo + ":");
      Object.entries(dic).forEach(([k, v]) => L.push(`  ${k.padEnd(3)} = ${fmt(v.mag, 4)} ∠ ${fmt(v.ang, 3)}°   (x=${fmt(v.x, 4)}, y=${fmt(v.y, 4)})`));
    }
    return L.join("\n");
  }

  function descargarCSV() {
    const cb = estado.modo === "cuatroBarras";
    const cab = cb
      ? ["th2", "th3", "th4", "w3", "w4", "al3", "al4", "mu", "VA", "VB", "VG3", "VP3", "AA", "AB", "AG2", "AG3", "AG4", "AP3"]
      : ["th2", "th3", "d", "dd", "ddd", "w3", "al3", "mu", "VA", "VG3", "VP3", "AA", "AG2", "AG3", "AP3"];
    const filas = estado.barrido.map(({ th2, r }) => {
      if (!r) return [th2, ...cab.slice(1).map(() => "")].join(",");
      const v = cb
        ? [th2, r.angulos.th3, r.angulos.th4, r.w.w3, r.w.w4, r.al.al3, r.al.al4, r.extra.transmision, r.V.A.mag, r.V.B.mag, r.V.G3.mag, r.V.P3.mag, r.Ac.A.mag, r.Ac.B.mag, r.Ac.G2.mag, r.Ac.G3.mag, r.Ac.G4.mag, r.Ac.P3.mag]
        : [th2, r.angulos.th3, r.corredera.d, r.corredera.dd, r.corredera.ddd, r.w.w3, r.al.al3, r.extra.transmision, r.V.A.mag, r.V.G3.mag, r.V.P3.mag, r.Ac.A.mag, r.Ac.G2.mag, r.Ac.G3.mag, r.Ac.P3.mag];
      return v.map((x) => (typeof x === "number" ? x.toFixed(6) : x)).join(",");
    });
    const blob = new Blob([cab.join(",") + "\n" + filas.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${estado.modo}-vuelta-completa.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ------------------------------------------------------------------
  // verificación
  // ------------------------------------------------------------------
  function pintarVerificacion() {
    const res = VF.verificarTodo();
    const todas = [...res.corredera, ...res.cuatroBarras].flatMap((f) => f.comparaciones);
    const n = (e) => todas.filter((c) => c.estado === e).length;
    $("#verif-resumen").innerHTML =
      tarjeta("e4", "Valores comparados", todas.length, "14 filas · 3 tablas") +
      tarjeta("e4", "Coinciden", n("ok"), "dentro del redondeo del libro") +
      tarjeta("e3", "Erratas del libro", n("errata"), "inconsistentes en la misma fila") +
      tarjeta("", "Fallas del programa", n("falla"), n("falla") ? "revisar" : "ninguna");

    const f = (x) => (Array.isArray(x) ? `${fmt(x[0], 2)} ∠ ${fmt(x[1], 2)}°` : fmt(x, 3));
    const bloque = (titulo, filas) => `<div class="verif-grupo"><h3>${titulo}</h3>${filas.map((fila) => {
      const e = fila.entrada;
      return `<div class="verif-fila"><header><b>Fila ${fila.fila}</b>
        <span class="et ${fila.comparaciones.some((c) => c.estado === "errata") ? "errata" : "ok"}">${fila.comparaciones.filter((c) => c.estado !== "falla").length}/${fila.comparaciones.length}</span>
        <span class="dato">config. ${fila.config}</span>
        <button class="boton secundario cargar" data-modo="${fila.modo}" data-fila="${fila.fila}">Abrir en la calculadora</button></header>
        <div class="tabla-scroll"><table><thead><tr><th>Magnitud</th><th>Programa</th><th>Libro</th><th>Estado</th></tr></thead><tbody>
        ${fila.comparaciones.map((c) => `<tr><td>${c.nombre}</td><td>${f(c.calc)}</td><td>${f(c.libro)}</td><td><span class="et ${c.estado}">${c.estado === "ok" ? "coincide" : c.estado}</span></td></tr>${c.errata ? `<tr class="nota-errata"><td colspan="4">${c.errata}</td></tr>` : ""}`).join("")}
        </tbody></table></div></div>`;
    }).join("")}</div>`;
    res.corredera.forEach((x) => (x.modo = "manivelaCorredera"));
    res.cuatroBarras.forEach((x) => (x.modo = "cuatroBarras"));
    $("#verif-tablas").innerHTML =
      bloque("Manivela-corredera — Tablas P11-1 y P11-2", res.corredera) +
      bloque("Cuatro barras — Tabla P11-3", res.cuatroBarras);
    $$("#verif-tablas .cargar").forEach((b) => b.addEventListener("click", () => {
      const lista = b.dataset.modo === "cuatroBarras" ? DN.cuatroBarras : DN.corredera;
      const fila = lista.find((x) => x.fila === b.dataset.fila);
      estado.valores[b.dataset.modo] = { ...fila.entrada };
      estado.abierta[b.dataset.modo] = true;
      cambiarModo(b.dataset.modo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }));
  }

  // ------------------------------------------------------------------
  // eventos
  // ------------------------------------------------------------------
  function cambiarModo(modo) {
    $$(".pestanas button").forEach((b) => b.classList.toggle("activa", b.dataset.modo === modo));
    const verif = modo === "verificacion";
    $("#vista-calculo").hidden = verif;
    $("#vista-verificacion").hidden = !verif;
    detenerAnimacion();
    if (verif) { pintarVerificacion(); return; }
    estado.modo = modo;
    estado.claveBarrido = "";
    construirFormulario();
    calcular();
  }

  function fijarTh2(v) {
    estado.valores[estado.modo].th2 = v;
    $("#th2").value = +v.toFixed(2);
    $("#th2-rango").value = K.norm360(v);
    calcular();
  }

  let raf = null, ultimo = 0;
  function paso(t) {
    if (!estado.animando) return;
    const dt = ultimo ? (t - ultimo) / 1000 : 0; ultimo = t;
    const v = estado.valores[estado.modo];
    const sentido = Math.sign(v.w2) || 1;
    fijarTh2(K.norm360(v.th2 + sentido * 60 * dt)); // 60°/s en la pantalla
    raf = requestAnimationFrame(paso);
  }
  function detenerAnimacion() {
    estado.animando = false; ultimo = 0;
    if (raf) cancelAnimationFrame(raf);
    $("#animar").textContent = "▶ Animar";
  }

  function iniciar() {
    // tema
    const tema = leerLS("ac-tema");
    if (tema) document.documentElement.dataset.theme = tema;
    $("#tema").addEventListener("click", () => {
      const oscuroAhora = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      const nuevo = oscuroAhora ? "light" : "dark";
      document.documentElement.dataset.theme = nuevo;
      escribirLS("ac-tema", nuevo);
      if (!$("#vista-calculo").hidden) pintarTodo();
    });

    $$(".pestanas button").forEach((b) => b.addEventListener("click", () => cambiarModo(b.dataset.modo)));
    $("#th2").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { estado.valores[estado.modo].th2 = v; $("#th2-rango").value = K.norm360(v); calcular(); } });
    $("#th2-rango").addEventListener("input", (e) => fijarTh2(parseFloat(e.target.value)));
    $("#w2").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { estado.valores[estado.modo].w2 = v; calcular(); } });
    $("#al2").addEventListener("input", (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { estado.valores[estado.modo].al2 = v; calcular(); } });
    $$(".segmentado button").forEach((b) => b.addEventListener("click", () => {
      estado.abierta[estado.modo] = b.dataset.conf === "abierta";
      volcarValores(); calcular();
    }));
    $("#ejemplo").addEventListener("change", (e) => {
      if (e.target.value === "") return;
      const ej = EJEMPLOS[estado.modo][+e.target.value];
      estado.valores[estado.modo] = { ...ej.datos };
      estado.abierta[estado.modo] = true;
      volcarValores(); calcular();
      e.target.value = "";
    });
    ["#ver-vel", "#ver-acc", "#ver-tray"].forEach((s) => $(s).addEventListener("change", dibujarMecanismo));
    $("#magnitud").addEventListener("change", dibujarGrafica);
    const g = $("#grafica");
    g.addEventListener("mousemove", (e) => { hoverX = e.offsetX; dibujarGrafica(); });
    g.addEventListener("mouseleave", () => { hoverX = null; dibujarGrafica(); });
    g.addEventListener("click", (e) => {
      const w = g.clientWidth, th = ((e.offsetX - 62) / (w - 62 - 16)) * 360;
      if (th >= 0 && th <= 360) fijarTh2(Math.round(th));
    });
    $("#animar").addEventListener("click", () => {
      if (estado.animando) return detenerAnimacion();
      estado.animando = true; $("#animar").textContent = "❚❚ Pausar";
      raf = requestAnimationFrame(paso);
    });
    $("#copiar").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(textoResultados()); $("#copiar").textContent = "¡Copiado!"; }
      catch (e) { $("#copiar").textContent = "No se pudo copiar"; }
      setTimeout(() => ($("#copiar").textContent = "Copiar"), 1500);
    });
    $("#csv").addEventListener("click", descargarCSV);
    let rt = null;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (!$("#vista-calculo").hidden) pintarTodo(); }, 100); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!$("#vista-calculo").hidden) pintarTodo(); });

    cambiarModo("cuatroBarras");
  }

  iniciar();
})();
