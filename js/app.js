/* app.js — interfaz de usuario */
(function () {
  "use strict";
  const K = window.Cinematica, DN = window.DatosNorton, VF = window.Verificacion, DY = window.Dinamica;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // ------------------------------------------------------------------
  // definición de campos por mecanismo
  // ------------------------------------------------------------------
  // solo longitudes y datos de entrada: sin centros de gravedad, puntos P ni masas
  function simple(e) {
    const r = {};
    ["a", "b", "c", "d", "th2", "w2", "al2"].forEach((k) => { if (e[k] !== undefined) r[k] = e[k]; });
    return r;
  }

  const CAMPOS = {
    cuatroBarras: {
      eslabones: [["a", "Manivela", "a"], ["b", "Acoplador", "b"], ["c", "Balancín", "c"], ["d", "Bancada", "d"]],
      cg: [["Rg2", "R<sub>g2</sub>"], ["d2", "δ<sub>2</sub> °"], ["Rg3", "R<sub>g3</sub>"], ["d3", "δ<sub>3</sub> °"], ["Rg4", "R<sub>g4</sub>"], ["d4", "δ<sub>4</sub> °"]],
      p: [["Rp3", "R<sub>P3</sub>"], ["dp3", "δ<sub>RP3</sub> °"], ["Rp4", "R<sub>P4</sub>"], ["dp4", "δ<sub>RP4</sub> °"]],
      din: [["m2", "m<sub>2</sub>"], ["I2", "I<sub>G2</sub>"], ["m3", "m<sub>3</sub>"], ["I3", "I<sub>G3</sub>"], ["m4", "m<sub>4</sub>"], ["I4", "I<sub>G4</sub>"],
        ["Fp3", "F<sub>P3</sub>", "magnitud"], ["dFp3", "δ<sub>FP3</sub> °", "resp. a X"], ["Fp4", "F<sub>P4</sub>", "magnitud"], ["dFp4", "δ<sub>FP4</sub> °", "resp. a X"],
        ["T3", "T<sub>3</sub>", "par externo"], ["T4", "T<sub>4</sub>", "par externo"]],
      ayudaDin: "Masas, inercias (respecto al CG), fuerzas externas en P3 y P4 (ángulo desde el eje X) y pares externos. Unidades consistentes: blob-pulg-lb o kg-m-N.",
      defecto: simple(DN.cuatroBarras[1].entrada),
    },
    manivelaCorredera: {
      eslabones: [["a", "Manivela", "a"], ["b", "Biela", "b"], ["c", "Descentrado", "c"]],
      cg: [["Rg2", "R<sub>g2</sub>"], ["d2", "δ<sub>2</sub> °"], ["Rg3", "R<sub>g3</sub>"], ["d3", "δ<sub>3</sub> °"]],
      p: [["Rp3", "R<sub>P3</sub>"], ["dp3", "δ<sub>RP3</sub> °"]],
      din: [["m2", "m<sub>2</sub>"], ["I2", "I<sub>G2</sub>"], ["m3", "m<sub>3</sub>"], ["I3", "I<sub>G3</sub>"], ["m4", "m<sub>4</sub>", "corredera"], ["mu", "μ", "fricción guía"],
        ["Fp3", "F<sub>P3</sub>", "magnitud"], ["dFp3", "δ<sub>FP3</sub> °", "resp. a AB"], ["Fp4", "F<sub>4</sub>", "sobre corredera"], ["dFp4", "δ<sub>F4</sub> °", "resp. a X"],
        ["T3", "T<sub>3</sub>", "par externo"]],
      ayudaDin: "Masas, inercias (respecto al CG), fuerza en P3 (ángulo desde la línea AB), fuerza sobre la corredera (ángulo desde X), par externo T3 y fricción μ de la guía. Unidades consistentes: blob-pulg-lb o kg-m-N.",
      defecto: simple(DN.corredera[1].entrada),
    },
  };

  const EJEMPLOS = {
    cuatroBarras: [
      { nombre: "Ejemplo de clase (a=2, b=7, c=9, d=6)", datos: { a: 2, b: 7, c: 9, d: 6, th2: 30, w2: 10, al2: 0 } },
      ...DN.cuatroBarras.map((r) => ({ nombre: `Norton P11-3 fila ${r.fila} (completo)`, datos: r.entrada })),
    ],
    manivelaCorredera: DN.corredera.map((r) => ({ nombre: `Norton P11-1 fila ${r.fila} (completo)`, datos: r.entrada })),
  };

  // ------------------------------------------------------------------
  // estado
  // ------------------------------------------------------------------
  const guardado = leerLS("ac-estado-v2") || {};
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
      <input type="number" step="any" id="f-${id}" data-k="${id}" placeholder="0" /></div>`;
  }

  function construirFormulario() {
    const def = CAMPOS[estado.modo];
    $("#campos-eslabones").innerHTML = def.eslabones.map(([k, l, s]) => campoHTML(k, l, s)).join("");
    $("#campos-cg").innerHTML = def.cg.map(([k, l]) => campoHTML(k, l)).join("");
    $("#campos-p").innerHTML = def.p.map(([k, l]) => campoHTML(k, l)).join("");
    $("#campos-din").innerHTML = def.din.map(([k, l, s]) => campoHTML(k, l, s)).join("");
    $("#ayuda-din").textContent = def.ayudaDin;
    $("#ejemplo").innerHTML = `<option value="">Cargar ejemplo…</option>` +
      EJEMPLOS[estado.modo].map((e, i) => `<option value="${i}">${e.nombre}</option>`).join("");
    volcarValores();
    $$("#form input[data-k]").forEach((inp) => inp.addEventListener("input", alEditar));

    const mags = estado.modo === "cuatroBarras"
      ? [["th3", "Posición θ3"], ["th4", "Posición θ4"], ["w3", "Velocidad ω3"], ["w4", "Velocidad ω4"], ["al3", "Aceleración α3"], ["al4", "Aceleración α4"], ["mu", "Ángulo de transmisión"], ...FUERZAS_GRAF]
      : [["d", "Posición de la corredera d"], ["dd", "Velocidad de la corredera ḋ"], ["ddd", "Aceleración de la corredera d̈"], ["th3", "Posición θ3"], ["w3", "Velocidad ω3"], ["al3", "Aceleración α3"], ["mu", "Ángulo de transmisión"], ...FUERZAS_GRAF];
    $("#magnitud").innerHTML = mags.map(([k, l]) => `<option value="${k}">${l}</option>`).join("");
  }

  const FUERZAS_GRAF = [["T12", "Par motor T12 (requiere fuerzas)"], ["F12", "Fuerza en O2 (requiere fuerzas)"], ["F43", "Fuerza en B (requiere fuerzas)"]];

  function volcarValores() {
    const v = estado.valores[estado.modo];
    $$("#form input[data-k]").forEach((inp) => { inp.value = v[inp.dataset.k] ?? ""; });
    $("#th2").value = v.th2;
    $("#th2-rango").value = K.norm360(v.th2);
    $("#w2").value = v.w2;
    $("#al2").value = v.al2;
    $$(".segmentado button").forEach((b) => b.classList.toggle("activa", (b.dataset.conf === "abierta") === estado.abierta[estado.modo]));
  }

  function alEditar(e) {
    const inp = e.target;
    const val = inp.value === "" && !["a", "b", "c", "d"].includes(inp.dataset.k) ? 0 : parseFloat(inp.value);
    inp.classList.toggle("invalido", !isFinite(val));
    if (!isFinite(val)) return;
    const val2 = inp.value === "" ? 0 : val;
    estado.valores[estado.modo][inp.dataset.k] = val2;
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
    const fk = K[estado.modo];
    const fn = (q) => {
      const r = fk(q);
      try { r.fuerzas = DY.fuerzas(r); r.errorFuerzas = null; } catch (e) { r.fuerzas = null; r.errorFuerzas = e.message; }
      return r;
    };
    const err = $("#error");
    escribirLS("ac-estado-v2", estado.valores);
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
    pintarSimple();
    pintarDetalles();
    dibujarMecanismo();
    if ($("#detalles").open) dibujarGrafica();
  }

  // ------------------------------------------------------------------
  // tarjetas de resumen
  // ------------------------------------------------------------------
  function tarjeta(clase, titulo, valor, sub) {
    return `<div class="tarjeta ${clase}"><div class="t">${titulo}</div><div class="v">${valor}</div><div class="s">${sub || ""}</div></div>`;
  }

  // ------------------------------------------------------------------
  // resultados simples: una fila por eslabón
  // ------------------------------------------------------------------
  const giro = (w) => (Math.abs(w) < 1e-9 ? "" : w > 0 ? "↺ antihorario" : "↻ horario");
  const haciaX = (v) => (Math.abs(v) < 1e-9 ? "" : v > 0 ? "→ hacia la derecha" : "← hacia la izquierda");
  const celda = (etq, simb, valor, unidad, nota) =>
    `<td data-etq="${etq}"><span class="simb">${simb}</span> <b>${valor}</b> <span class="u">${unidad}</span>${nota ? `<small>${nota}</small>` : ""}</td>`;

  function pintarSimple() {
    const r = estado.resultado, el = $("#simple"), aviso = $("#aviso");
    if (!r) { el.innerHTML = `<p class="ayuda">Revise los datos: el mecanismo no se puede armar así.</p>`; aviso.hidden = true; return; }
    const cb = r.tipo === "cuatroBarras";
    const fila = (cls, nombre, sub, pos, vel, acc) =>
      `<tr><th scope="row"><span class="marca-e ${cls}"></span>${nombre}<small>${sub}</small></th>${pos}${vel}${acc}</tr>`;
    let filas =
      fila("e2", "Manivela", "eslabón 2 · dato",
        celda("Posición", "θ2", fmt(r.angulos.th2, 2), "°"),
        celda("Velocidad", "ω2", fmt(r.w.w2, 3), "rad/s", giro(r.w.w2)),
        celda("Aceleración", "α2", fmt(r.al.al2, 3), "rad/s²")) +
      fila("e3", cb ? "Acoplador" : "Biela", "eslabón 3",
        celda("Posición", "θ3", fmt(r.angulos.th3, 2), "°"),
        celda("Velocidad", "ω3", fmt(r.w.w3, 3), "rad/s", giro(r.w.w3)),
        celda("Aceleración", "α3", fmt(r.al.al3, 3), "rad/s²"));
    filas += cb
      ? fila("e4", "Balancín", "eslabón 4",
        celda("Posición", "θ4", fmt(r.angulos.th4, 2), "°"),
        celda("Velocidad", "ω4", fmt(r.w.w4, 3), "rad/s", giro(r.w.w4)),
        celda("Aceleración", "α4", fmt(r.al.al4, 3), "rad/s²"))
      : fila("e4", "Corredera", "eslabón 4",
        celda("Posición", "d", fmt(r.corredera.d, 3), ""),
        celda("Velocidad", "ḋ", fmt(r.corredera.dd, 3), "/s", haciaX(r.corredera.dd)),
        celda("Aceleración", "d̈", fmt(r.corredera.ddd, 3), "/s²"));
    el.innerHTML = `<table class="tabla-simple"><thead><tr><th>Eslabón</th><th>Posición</th><th>Velocidad</th><th>Aceleración</th></tr></thead><tbody>${filas}</tbody></table>`;

    aviso.hidden = true; // el ángulo de transmisión se muestra en "Más detalles"
  }

  // ------------------------------------------------------------------
  // tablas de resultados
  // ------------------------------------------------------------------
  const NOMBRES = {
    A: "A", B: "B", BA: "B/A <small>(relativa)</small>", G2: "G2 <small>(CG 2)</small>", G3: "G3 <small>(CG 3)</small>",
    G4: "G4 <small>(CG 4)</small>", P3: "P3", P4: "P4", O2: "O2", O4: "O4",
  };

  const polarTxt = (v) => (v ? `${fmt(v.mag, 3)} <span class="ang">∠ ${fmt(v.ang, 1)}°</span>` : "—");
  function tablaPuntos(r) {
    const e = r.entrada, cb = r.tipo === "cuatroBarras";
    const filas = [["A", "A <small>unión manivela–" + (cb ? "acoplador" : "biela") + "</small>"], ["B", "B <small>" + (cb ? "unión acoplador–balancín" : "corredera") + "</small>"], ["BA", "B respecto a A"]];
    if (+e.Rg2) filas.push(["G2", "G2 <small>centro de gravedad 2</small>"]);
    if (+e.Rg3) filas.push(["G3", "G3 <small>centro de gravedad 3</small>"]);
    if (cb && +e.Rg4) filas.push(["G4", "G4 <small>centro de gravedad 4</small>"]);
    if (+e.Rp3) filas.push(["P3", "P3 <small>punto del eslabón 3</small>"]);
    if (cb && +e.Rp4) filas.push(["P4", "P4 <small>punto del eslabón 4</small>"]);
    const tr = filas.map(([k, n]) => `<tr><td>${n}</td><td>${k === "BA" ? "—" : polarTxt(r.puntos[k])}</td><td>${polarTxt(r.V[k])}</td><td>${polarTxt(r.Ac[k])}</td></tr>`).join("");
    return `<div class="tabla-scroll"><table><thead><tr><th>Punto</th><th>Posición R</th><th>Velocidad V</th><th>Aceleración a</th></tr></thead><tbody>${tr}</tbody></table></div>
      <p class="nota">Magnitud ∠ ángulo medido desde el eje X. La posición se mide desde O2.</p>`;
  }

  function filasDato(filas) {
    return `<div class="tabla-scroll"><table class="escalares"><tbody>${filas.map(([n, v]) => `<tr><td>${n}</td><td>${v}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function pintarDetalles() {
    const r = estado.resultado;
    if (!r) { ["#det-puntos", "#det-datos", "#det-fuerzas"].forEach((s) => ($(s).innerHTML = "")); return; }
    const cb = r.tipo === "cuatroBarras";
    $("#det-puntos").innerHTML = tablaPuntos(r);

    const mu = r.extra.transmision;
    const datos = [["Ángulo de transmisión", `${fmt(mu, 2)}° <small>${mu < 40 ? "bajo (se recomienda ≥ 40°)" : "adecuado"}</small>`]];
    if (cb) {
      datos.unshift(["Tipo (Grashof)", r.extra.grashof.tipo]);
      datos.push(["Relación de velocidades ω4/ω2", fmt(r.extra.relVel, 4)]);
    } else {
      const ca = r.extra.carrera;
      datos.push(["Carrera de la corredera", ca ? `${fmt(ca.carrera, 3)} <small>(d entre ${fmt(ca.dmin, 3)} y ${fmt(ca.dmax, 3)})</small>` : "—"]);
    }
    let constantes = "";
    if (cb) {
      const k = r.extra.K, c = r.extra.coef;
      constantes = `<details class="mini"><summary>Constantes de las ecuaciones (K1–K5, A–F)</summary>${filasDato([
        ["K1 · K2 · K3", `${fmt(k.K1, 4)} · ${fmt(k.K2, 4)} · ${fmt(k.K3, 4)}`], ["K4 · K5", `${fmt(k.K4, 4)} · ${fmt(k.K5, 4)}`],
        ["A · B · C", `${fmt(c.A, 4)} · ${fmt(c.B, 4)} · ${fmt(c.C, 4)}`], ["D · E · F", `${fmt(c.D, 4)} · ${fmt(c.E, 4)} · ${fmt(c.F, 4)}`]])}</details>`;
    }
    $("#det-datos").innerHTML = filasDato(datos) + constantes;

    const F = r.fuerzas;
    if (r.errorFuerzas) { $("#det-fuerzas").innerHTML = `<p class="ayuda">${r.errorFuerzas}</p>`; return; }
    if (!F) {
      $("#det-fuerzas").innerHTML = `<p class="ayuda">Para calcular las fuerzas y el par motor, ingrese masas o cargas en <b>Opciones avanzadas → Fuerzas</b>, o cargue un ejemplo “completo” del libro.</p>`;
      return;
    }
    const filasF = [
      ["Par motor T12 <small>el que debe dar el motor</small>", fmt(F.T12, 3)],
      ["F12 <small>en el pivote O2</small>", polarTxt(F.F12)],
      ["F32 <small>en el pasador A</small>", polarTxt(F.F32)],
      ["F43 <small>en el pasador B</small>", polarTxt(F.F43)],
      [cb ? "F14 <small>en el pivote O4</small>" : "F14 <small>de la guía sobre la corredera</small>", polarTxt(F.F14)],
      ["Fuerza de sacudimiento <small>sobre la bancada</small>", polarTxt(F.Fs)],
      ["Potencia del motor T12·ω2", fmt(F.potencia, 3)],
    ];
    const comp = F.errorPotencia < 1e-6;
    $("#det-fuerzas").innerHTML = filasDato(filasF) +
      `<p class="nota">F<sub>ij</sub> = fuerza del eslabón i sobre el j. Comprobación por balance de potencia: <span class="et ${comp ? "ok" : "falla"}">${comp ? "cumple" : "no cumple"}</span></p>`;
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
    const verTray = true;
    const flechas = $("#flechas").value;

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
      tray((q) => q.puntos.A, c.e2 + "66");
      if (+r.entrada.Rp3) tray((q) => q.puntos.P3, c.e3 + "88");
      if (cb) tray((q) => q.puntos.B, c.e4 + "66");
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
    if (flechas === "v") vectores(r.V, c.v, claves);
    if (flechas === "a") vectores(r.Ac, c.a, claves);
    const F = r.fuerzas;
    if (flechas === "f" && !F) {
      ctx.fillStyle = c.t3; ctx.font = "13px system-ui";
      ctx.fillText("Sin datos de fuerzas: vea Opciones avanzadas → Fuerzas", 12, 22);
    }
    if (flechas === "f" && F) {
      const cf = cssVar("--fuerza");
      const lista = [[F.F12, P.O2, "F12"], [F.F32, P.A, "F32"], [F.F43, P.B, "F43"], [F.F14, cb ? P.O4 : P.B, "F14"]];
      const max = Math.max(...lista.map(([v]) => v.mag), 1e-9);
      ctx.font = "600 12px system-ui";
      lista.forEach(([v, pt, nom]) => {
        const [x, y] = T(pt), x2 = x + (v.x / max) * L, y2 = y - (v.y / max) * L;
        flecha(ctx, x, y, x2, y2, cf);
        if (v.mag > 1e-9) { ctx.fillStyle = cf; ctx.fillText(nom, x2 + 4, y2 - 4); }
      });
    }

    // rótulo de configuración
    ctx.fillStyle = c.t3; ctx.font = "12px system-ui";
    const leyenda = { v: "Flechas: velocidad (tamaño relativo)", a: "Flechas: aceleración (tamaño relativo)", f: "Flechas: fuerzas en los pasadores (tamaño relativo)" }[flechas] || "";
    ctx.fillText(`θ2 = ${fmt(r.angulos.th2, 1)}° · ${r.abierta ? "abierta" : "cruzada"}${leyenda ? " · " + leyenda : ""}`, 12, h - 12);
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
      case "T12": return q.fuerzas ? q.fuerzas.T12 : null;
      case "pot": return q.fuerzas ? q.fuerzas.potencia : null;
      case "F12": case "F32": case "F43": case "F14": case "Fs": return q.fuerzas ? q.fuerzas[k].mag : null;
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
    const F = r.fuerzas;
    if (F) {
      L.push("", "Fuerzas dinámicas:", `  T12 = ${fmt(F.T12, 4)}   (par de sacudimiento T21 = ${fmt(F.Ts, 4)})`);
      ["F12", "F32", "F43", "F14", "Fs"].forEach((k) => L.push(`  ${k.padEnd(3)} = ${fmt(F[k].mag, 4)} ∠ ${fmt(F[k].ang, 3)}°   (x=${fmt(F[k].x, 4)}, y=${fmt(F[k].y, 4)})`));
    }
    return L.join("\n");
  }

  function descargarCSV() {
    const cb = estado.modo === "cuatroBarras";
    const cab = cb
      ? ["th2", "th3", "th4", "w3", "w4", "al3", "al4", "mu", "VA", "VB", "VG3", "VP3", "AA", "AB", "AG2", "AG3", "AG4", "AP3"]
      : ["th2", "th3", "d", "dd", "ddd", "w3", "al3", "mu", "VA", "VG3", "VP3", "AA", "AG2", "AG3", "AP3"];
    const conF = estado.barrido.some(({ r }) => r && r.fuerzas);
    if (conF) cab.push("T12", "F12", "F32", "F43", "F14", "Fs", "potencia");
    const filas = estado.barrido.map(({ th2, r }) => {
      if (!r) return [th2, ...cab.slice(1).map(() => "")].join(",");
      const fz = conF ? (r.fuerzas ? [r.fuerzas.T12, r.fuerzas.F12.mag, r.fuerzas.F32.mag, r.fuerzas.F43.mag, r.fuerzas.F14.mag, r.fuerzas.Fs.mag, r.fuerzas.potencia] : ["", "", "", "", "", "", ""]) : [];
      const v = cb
        ? [th2, r.angulos.th3, r.angulos.th4, r.w.w3, r.w.w4, r.al.al3, r.al.al4, r.extra.transmision, r.V.A.mag, r.V.B.mag, r.V.G3.mag, r.V.P3.mag, r.Ac.A.mag, r.Ac.B.mag, r.Ac.G2.mag, r.Ac.G3.mag, r.Ac.G4.mag, r.Ac.P3.mag]
        : [th2, r.angulos.th3, r.corredera.d, r.corredera.dd, r.corredera.ddd, r.w.w3, r.al.al3, r.extra.transmision, r.V.A.mag, r.V.G3.mag, r.V.P3.mag, r.Ac.A.mag, r.Ac.G2.mag, r.Ac.G3.mag, r.Ac.P3.mag];
      return [...v, ...fz].map((x) => (typeof x === "number" ? x.toFixed(6) : x)).join(",");
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
    const dyn = VF.verificarDinamica();
    $("#verif-tablas").innerHTML += `<div class="verif-grupo"><h3>Fuerzas dinámicas — comprobación independiente</h3>
      <p class="ayuda">El libro no publica las respuestas de fuerzas de estas tablas. Por eso cada resultado se comprueba con dos métodos independientes del sistema matricial:
      el <b>balance de potencia</b> (trabajo virtual, sección 11.13: T12·ω2 + ΣF·V + ΣT·ω = Σm·a<sub>G</sub>·V<sub>G</sub> + ΣI·α·ω)
      y el <b>equilibrio global</b> (F12 + F14 + ΣF<sub>ext</sub> = Σm·a<sub>G</sub>).</p>
      <div class="verif-fila"><div class="tabla-scroll"><table><thead><tr><th>Fila</th><th>T12</th><th>|F12|</th><th>|F32|</th><th>|F43|</th><th>|F14|</th><th>Potencia entrada</th><th>Potencia inercia</th><th>Estado</th></tr></thead><tbody>
      ${dyn.map((d) => `<tr><td>${d.mecanismo} · ${d.fila}</td><td>${fmt(d.T12, 3)}</td><td>${fmt(d.F12.mag, 3)}</td><td>${fmt(d.F32.mag, 3)}</td><td>${fmt(d.F43.mag, 3)}</td><td>${fmt(d.F14.mag, 3)}</td><td>${fmt(d.potEntrada, 3)}</td><td>${fmt(d.potInercia, 3)}</td><td><span class="et ${d.ok ? "ok" : "falla"}">${d.ok ? "cumple" : "falla"}</span></td></tr>`).join("")}
      </tbody></table></div></div></div>`;
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
  // enlaces directos a cada pestaña: #balancin, #corredera, #verificacion
  const HASH = { cuatroBarras: "balancin", manivelaCorredera: "corredera", verificacion: "verificacion" };
  const modoDesdeHash = () => Object.keys(HASH).find((k) => "#" + HASH[k] === location.hash) || "cuatroBarras";

  function cambiarModo(modo) {
    if (location.hash !== "#" + HASH[modo]) history.replaceState(null, "", "#" + HASH[modo]);
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
    $("#flechas").addEventListener("change", dibujarMecanismo);
    $("#detalles").addEventListener("toggle", () => { if ($("#detalles").open) dibujarGrafica(); });
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
      setTimeout(() => ($("#copiar").textContent = "Copiar resultados"), 1500);
    });
    $("#csv").addEventListener("click", descargarCSV);
    let rt = null;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (!$("#vista-calculo").hidden) pintarTodo(); }, 100); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!$("#vista-calculo").hidden) pintarTodo(); });

    // ?detalles en el enlace abre "Más detalles" desde el inicio
    if (new URLSearchParams(location.search).has("detalles")) $("#detalles").open = true;
    window.addEventListener("hashchange", () => cambiarModo(modoDesdeHash()));
    cambiarModo(modoDesdeHash());
  }

  iniciar();
})();
