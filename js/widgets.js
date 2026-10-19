/* Control Room — interactive widgets
   Widgets.create(container, spec, {onChange, onTap}) returns an instance used by the engine.
   Kinds: circuit (DC nodal solver + schematic), flow (charges in a wire), charge (attraction / repulsion), prefix (SI prefixes). */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const h = (tag, cls, parent, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------- number formatting ---------- */
  const PFX = [[1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"]];
  function si(v, unit, d = 2) {
    if (!isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a < 1e-12) return `0 ${unit}`;
    for (const [m, p] of PFX) if (a >= m * 0.9995) return `${trim((v / m).toFixed(d))} ${p}${unit}`;
    return `${trim((v / 1e-9).toFixed(d))} n${unit}`;
  }
  const trim = (s) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);

  /* ---------- slider helpers ---------- */
  function sliderRow(parent, c, value, onInput) {
    const row = h("div", "wctl", parent);
    const top = h("div", "wctl-top", row);
    h("span", "wctl-lab", top, c.label);
    const val = h("span", "wctl-val", top);
    const inp = h("input", "", row);
    inp.type = "range";
    const log = !!c.log;
    const toPos = (v) => (log ? (1000 * Math.log(v / c.min)) / Math.log(c.max / c.min) : v);
    const fromPos = (p) => {
      if (!log) return +p;
      let v = c.min * Math.pow(c.max / c.min, p / 1000);
      if (c.step) v = Math.round(v / c.step) * c.step;
      return Math.max(c.min, Math.min(c.max, v));
    };
    if (log) { inp.min = 0; inp.max = 1000; inp.step = 1; }
    else { inp.min = c.min; inp.max = c.max; inp.step = c.step || (c.max - c.min) / 100; }
    inp.value = toPos(value);
    const show = (v) => (val.textContent = c.fmt ? c.fmt(v) : si(v, c.unit || "", c.digits ?? 2));
    show(value);
    inp.addEventListener("input", () => { const v = fromPos(inp.value); show(v); onInput(v); });
    return { set(v) { inp.value = toPos(v); show(v); } };
  }

  /* =====================================================================
     CIRCUIT WIDGET
     ===================================================================== */
  const TAP_CONCEPT = { R: "resistor", lamp: "lamp", bat: "voltage_source", sw: "switch", am: "ammeter", vm: "voltmeter", pot: "potentiometer", gnd: "ground" };

  function Circuit(root, spec, hooks) {
    const S = Object.assign({}, spec, { els: JSON.parse(JSON.stringify(spec.els)) }); // keep functions in controls (e.g. fmt)
    const E = {}; // energy accumulators
    const changed = {};
    S.els.forEach((e) => { e.I = 0; E[e.id] = 0; if (e.t === "bat" && e.rint == null) e.rint = 0.25; });
    const byId = (id) => S.els.find((e) => e.id === id);

    /* --- solver --- */
    let nodeV = {}, nodeIdx = {};
    const key = (p) => p[0] + "," + p[1];
    function solve() {
      const nodes = new Map();
      const add = (p) => { const k = key(p); if (!nodes.has(k)) nodes.set(k, nodes.size); return nodes.get(k); };
      S.els.forEach((e) => {
        if (e.t === "gnd") return;
        e._a = add(e.p[0]); e._b = add(e.p[e.p.length - 1]);
        if (e.t === "pot") e._w = add(e.w);
      });
      let g0 = null;
      const gEl = S.els.find((e) => e.t === "gnd");
      if (gEl && nodes.has(key(gEl.p[0]))) g0 = nodes.get(key(gEl.p[0]));
      if (g0 == null) { const b = S.els.find((e) => e.t === "bat"); g0 = b ? b._b : 0; }
      const N = nodes.size;
      const map = []; let k = 0;
      for (let i = 0; i < N; i++) map[i] = i === g0 ? -1 : k++;
      const M = Array.from({ length: k }, () => new Float64Array(k + 1));
      const G = (a, b, g) => {
        const ia = map[a], ib = map[b];
        if (ia >= 0) M[ia][ia] += g;
        if (ib >= 0) M[ib][ib] += g;
        if (ia >= 0 && ib >= 0) { M[ia][ib] -= g; M[ib][ia] -= g; }
      };
      const Isrc = (into, amps) => { const i = map[into]; if (i >= 0) M[i][k] += amps; };
      const cond = (e) => {
        switch (e.t) {
          case "w": case "am": return 1e4;
          case "R": case "lamp": return 1 / Math.max(e.r, 1e-6);
          case "sw": return e.on ? 1e4 : 1e-12;
          default: return 0;
        }
      };
      S.els.forEach((e) => {
        if (e.t === "gnd" || e.t === "vm") return;
        if (e.t === "bat") { const g = 1 / e.rint; G(e._a, e._b, g); Isrc(e._a, e.v * g); Isrc(e._b, -e.v * g); return; }
        if (e.t === "pot") {
          const ra = Math.max(e.r * (1 - e.pos), 1e-3), rb = Math.max(e.r * e.pos, 1e-3); // pos = wiper position measured from the far end (p_last)
          G(e._a, e._w, 1 / ra); G(e._w, e._b, 1 / rb); return;
        }
        G(e._a, e._b, cond(e));
      });
      for (let i = 0; i < k; i++) M[i][i] += 1e-9;
      // gaussian elimination
      for (let c = 0; c < k; c++) {
        let piv = c;
        for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
        [M[c], M[piv]] = [M[piv], M[c]];
        const d = M[c][c] || 1e-30;
        for (let r = 0; r < k; r++) {
          if (r === c) continue;
          const f = M[r][c] / d;
          if (f) for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j];
        }
      }
      const V = new Float64Array(N);
      for (let i = 0; i < N; i++) V[i] = map[i] < 0 ? 0 : M[map[i]][k] / (M[map[i]][map[i]] || 1e-30);
      nodeIdx = Object.fromEntries([...nodes.entries()]);
      nodeV = V;
      S.els.forEach((e) => {
        if (e.t === "gnd") return;
        const va = V[e._a], vb = V[e._b];
        e.Vab = va - vb;
        if (e.t === "bat") e.I = -(e.v - e.Vab) / e.rint; // along path p0(+) -> p_last(-): negative when delivering
        else if (e.t === "pot") { e.Vw = V[e._w]; e.I = (va - e.Vw) / Math.max(e.r * (1 - e.pos), 1e-3); }
        else if (e.t === "vm") e.I = 0;
        else e.I = e.Vab * cond(e);
        e.Va = va; e.Vb = vb;
      });
    }

    /* --- drawing --- */
    const wrap = h("div", "w-circuit", root);
    const reads = h("div", "w-reads", wrap);
    const pts = S.els.flatMap((e) => (e.w ? e.p.concat([e.w]) : e.p));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const PADX = 125, PADY = 55;
    const vb = [Math.min(...xs) - PADX, Math.min(...ys) - PADY, Math.max(...xs) - Math.min(...xs) + 2 * PADX, Math.max(...ys) - Math.min(...ys) + 2 * PADY + 20];
    const svg = el("svg", { viewBox: vb.join(" "), class: "w-svg", preserveAspectRatio: "xMidYMid meet" }, wrap);
    const gW = el("g", {}, svg), gF = el("g", {}, svg), gB = el("g", {}, svg), gL = el("g", {}, svg);
    const ctl = h("div", "w-ctls", wrap);
    const vmax = Math.max(1, ...S.els.filter((e) => e.t === "bat").map((e) => e.v));

    const pathD = (pts) => "M" + pts.map((p) => p.join(",")).join(" L");
    const body = (e) => {
      const n = e.p.length, i = Math.max(0, Math.floor((n - 2) / 2));
      const a = e.p[i], b = e.p[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, ux: dx / L, uy: dy / L, ang: (Math.atan2(dy, dx) * 180) / Math.PI, i };
    };

    const parts = [];
    S.els.forEach((e) => {
      const P = { e };
      if (e.t === "gnd") {
        const [x, y] = e.p[0];
        P.g = el("g", { class: "w-tap" }, gB);
        el("path", { d: `M${x},${y} L${x},${y + 8} M${x - 14},${y + 8} L${x + 14},${y + 8} M${x - 9},${y + 14} L${x + 9},${y + 14} M${x - 4},${y + 20} L${x + 4},${y + 20}`, class: "w-gnd" }, P.g);
        P.g.addEventListener("click", () => hooks.onTap && hooks.onTap(TAP_CONCEPT.gnd));
        parts.push(P); return;
      }
      const B = e.t === "w" ? null : body(e);
      // wire geometry: for components, leads around a 56px body on the body segment
      let segs;
      if (!B) segs = [e.p];
      else {
        const a = [B.cx - B.ux * 28, B.cy - B.uy * 28], b = [B.cx + B.ux * 28, B.cy + B.uy * 28];
        segs = [e.p.slice(0, B.i + 1).concat([a]), [b].concat(e.p.slice(B.i + 1))];
      }
      P.wires = segs.map((pts, j) => {
        const base = el("path", { d: pathD(pts), class: e.t === "vm" ? "w-wire w-probe" : "w-wire" }, gW);
        const live = el("path", { d: pathD(pts), class: e.t === "vm" ? "w-live w-probe" : "w-live" }, gW);
        return { base, live, end: j === 0 ? "a" : "b" };
      });
      if (e.t !== "vm") P.flow = el("path", { d: pathD(e.p), class: "w-flow" }, gF);
      P.off = 0;
      if (B) {
        P.g = el("g", { transform: `translate(${B.cx},${B.cy}) rotate(${B.ang})`, class: "w-tap" }, gB);
        el("rect", { x: -32, y: -22, width: 64, height: 44, class: "w-hit" }, P.g);
        const g = P.g;
        if (e.t === "R" || e.t === "pot") {
          el("path", { d: "M-28,0 L-23,-9 L-14,9 L-5,-9 L4,9 L13,-9 L22,9 L28,0", class: "w-part" }, g);
        } else if (e.t === "lamp") {
          P.glow = el("circle", { r: 26, class: "w-glow", opacity: 0 }, g);
          P.bulb = el("circle", { r: 15, class: "w-bulb" }, g);
          el("path", { d: "M-10,-10 L10,10 M-10,10 L10,-10", class: "w-part" }, g);
          el("path", { d: "M-28,0 L-15,0 M15,0 L28,0", class: "w-part" }, g);
        } else if (e.t === "bat") {
          el("path", { d: "M-28,0 L-5,0 M5,0 L28,0", class: "w-part" }, g);
          el("path", { d: "M-5,-20 L-5,20", class: "w-part", "stroke-width": 3.2 }, g);
          el("path", { d: "M5,-11 L5,11", class: "w-part", "stroke-width": 6 }, g);
        } else if (e.t === "sw") {
          el("circle", { cx: -24, cy: 0, r: 4.5, class: "w-dot" }, g);
          el("circle", { cx: 24, cy: 0, r: 4.5, class: "w-dot" }, g);
          P.blade = el("line", { x1: -24, y1: 0, x2: 22, y2: 0, class: "w-blade" }, g);
          el("path", { d: "M-28,0 L-24,0 M24,0 L28,0", class: "w-part" }, g);
        } else if (e.t === "am" || e.t === "vm") {
          el("circle", { r: 16, class: "w-meter" }, g);
          el("path", { d: "M-28,0 L-16,0 M16,0 L28,0", class: "w-part" + (e.t === "vm" ? " w-probe" : "") }, g);
          const t = el("text", { class: "w-meterL", "text-anchor": "middle", "dominant-baseline": "central", transform: `rotate(${-B.ang})` }, g);
          t.textContent = e.t === "am" ? "A" : "V";
        }
        if (e.t === "pot") {
          // wiper arrow from wiper point to the body
          const wx = e.w[0], wy = e.w[1];
          P.wiper = el("g", {}, gB);
          el("path", { d: pathD([e.w, [B.cx - (B.uy) * 14 * Math.sign((wx - B.cx) * -B.uy + (wy - B.cy) * B.ux || 1), B.cy]]), class: "w-part" }, P.wiper);
          P.wArrow = el("polygon", { class: "w-arrow" }, P.wiper);
        }
        // labels
        const side = e.ls || 1;
        const nx = -B.uy * side, ny = B.ux * side;
        const vert = Math.abs(nx) > 0.5;
        const off = vert ? 26 : 30;
        const lx = B.cx + nx * off, ly = B.cy + ny * off + (vert ? 0 : ny > 0 ? 12 : -8);
        const anc = vert ? (nx > 0 ? "start" : "end") : "middle";
        if (e.label) { const t = el("text", { x: lx, y: ly - 8, class: "w-lab", "text-anchor": anc }, gL); t.textContent = e.label; }
        P.val = el("text", { x: lx, y: ly + 12, class: "w-val", "text-anchor": anc }, gL);
        if (e.t === "bat") { const t = el("text", { x: B.cx - B.ux * 18 - nx * 18, y: B.cy - B.uy * 18 - ny * 18 + 5, class: "w-lab", "text-anchor": "middle" }, gL); t.textContent = "+"; }
        P.g.addEventListener("click", () => {
          if (e.t === "sw" && e.tap !== false) { e.on = !e.on; changed[e.id] = (changed[e.id] || 0) + 1; update(); hooks.onChange && hooks.onChange(); return; }
          hooks.onTap && hooks.onTap(TAP_CONCEPT[e.t]);
        });
      }
      parts.push(P);
    });
    (S.nodeLabels || []).forEach((n) => {
      el("circle", { cx: n.at[0], cy: n.at[1], r: 5, class: "w-node" }, gL);
      const t = el("text", { x: n.at[0] + (n.dx || 10), y: n.at[1] + (n.dy || -10), class: "w-lab" }, gL);
      t.textContent = n.text;
      n._v = el("text", { x: n.at[0] + (n.dx || 10), y: n.at[1] + (n.dy || -10) + 17, class: "w-val" }, gL);
    });

    /* --- controls --- */
    const sliders = [];
    (S.controls || []).forEach((c) => {
      if (c.type === "button") {
        const b = h("button", "w-btn", ctl, c.label);
        b.addEventListener("click", () => { if (c.action === "resetE") Object.keys(E).forEach((k) => (E[k] = 0)); hooks.onChange && hooks.onChange(); });
        return;
      }
      const target = byId(c.el);
      const s = sliderRow(ctl, c, target[c.prop], (v) => {
        target[c.prop] = v; changed[c.el] = (changed[c.el] || 0) + 1; update(); hooks.onChange && hooks.onChange();
      });
      sliders.push({ c, s });
    });

    /* --- readouts --- */
    const api = {
      I: (id) => { const e = byId(id); return e.t === "bat" ? -e.I : e.I; },
      V: (id) => { const e = byId(id); return e.t === "pot" ? e.Vw - e.Vb : e.Vab; },
      P: (id) => { const e = byId(id); return e.t === "bat" ? -e.I * e.v : Math.abs(e.Vab * e.I); },
      E: (id) => E[id],
      on: (id) => !!byId(id).on,
      param: (id, p) => byId(id)[p],
      changed: (id) => changed[id] || 0,
      get: () => undefined,
    };
    const R = (S.readouts || []).map((r) => {
      const c = h("div", "w-read" + (r.hidden ? " hid" : ""), reads);
      h("span", "w-read-l", c, r.label);
      const v = h("b", "", c);
      const fn = new Function("w", "return (" + r.expr + ");");
      return { r, v, fn };
    });

    function update() {
      solve();
      const imax = Math.max(1e-9, ...S.els.filter((e) => e.t !== "vm" && e.t !== "gnd").map((e) => Math.abs(e.I)));
      parts.forEach((P) => {
        const e = P.e;
        if (e.t === "gnd") return;
        P.wires.forEach((w) => {
          const v = Math.abs(w.end === "a" ? e.Va : e.Vb);
          w.live.style.opacity = Math.min(1, v / vmax).toFixed(2);
        });
        if (P.flow) {
          const a = Math.abs(e.I);
          P.speed = a < 1e-7 ? 0 : Math.sign(e.I) * (0.15 + 0.85 * Math.min(1, a / imax));
          P.flow.style.opacity = a < 1e-7 ? 0 : (0.35 + 0.65 * Math.min(1, a / imax)).toFixed(2);
        }
        if (e.t === "lamp") {
          const k = Math.min(1, Math.abs(e.Vab * e.I) / (e.pnom || 1));
          P.glow.setAttribute("opacity", (k * 0.95).toFixed(2));
          P.bulb.style.fill = k > 0.02 ? `rgba(255,214,102,${(0.25 + 0.75 * k).toFixed(2)})` : "";
        }
        if (e.t === "sw") P.blade.setAttribute("transform", e.on ? "" : "rotate(-28 -24 0)");
        if (e.t === "pot") {
          const B = body(e);
          const f = 1 - e.pos, px = B.cx + B.ux * (-28 + 56 * f), py = B.cy + B.uy * (-28 + 56 * f);
          const nx = -B.uy, ny = B.ux;
          const s = Math.sign((e.w[0] - B.cx) * nx + (e.w[1] - B.cy) * ny) || 1;
          const tipx = px + nx * s * 10, tipy = py + ny * s * 10;
          P.wiper.querySelector("path").setAttribute("d", `M${e.w[0]},${e.w[1]} L${px + nx * s * 26},${py + ny * s * 26} L${tipx + nx * s * 6},${tipy + ny * s * 6}`);
          P.wArrow.setAttribute("points", `${tipx},${tipy} ${tipx + nx * s * 9 + B.ux * 5},${tipy + ny * s * 9 + B.uy * 5} ${tipx + nx * s * 9 - B.ux * 5},${tipy + ny * s * 9 - B.uy * 5}`);
        }
        if (P.val) {
          let t = "";
          if (e.show === "r") t = si(e.r, "Ω", 2);
          else if (e.show === "v") t = si(e.v, "V", 2);
          else if (e.show === "I") t = si(Math.abs(api.I(e.id)), "A", 2);
          else if (e.show === "V") t = si(Math.abs(e.t === "pot" ? api.V(e.id) : e.Vab), "V", 2);
          else if (e.show === "P") t = si(api.P(e.id), "W", 2);
          else if (e.t === "am") t = si(Math.abs(e.I), "A", 2);
          else if (e.t === "vm") t = si(Math.abs(e.Vab), "V", 2);
          P.val.textContent = e.hideVal && t ? "?" : t;
        }
      });
      (S.nodeLabels || []).forEach((n) => { const i = nodeIdx[key(n.at)]; n._v.textContent = i == null ? "" : n.hideVal ? "?" : si(nodeV[i], "V", 2); });
      R.forEach((x) => { let v; try { v = x.fn(api); } catch (err) { v = NaN; } x.v.textContent = x.r.hidden ? "?" : (x.r.fmt === "raw" ? v : si(v, x.r.unit || "", x.r.digits ?? 2)); });
    }

    let raf = 0, last = performance.now(), alive = true;
    function frame(t) {
      if (!alive) return;
      const dt = Math.min(0.1, (t - last) / 1000); last = t;
      let anyE = false;
      S.els.forEach((e) => { if (e.t === "lamp" || e.t === "R" || e.t === "bat") { E[e.id] += api.P(e.id) * dt; anyE = true; } });
      parts.forEach((P) => { if (P.flow && P.speed) { P.off -= P.speed * dt * 90; P.flow.style.strokeDashoffset = P.off.toFixed(1); } });
      if (anyE && R.some((x) => x.r.expr.includes("w.E("))) R.forEach((x) => { if (x.r.expr.includes("w.E(")) x.v.textContent = x.r.hidden ? "?" : si(x.fn(api), x.r.unit || "", x.r.digits ?? 2); });
      raf = requestAnimationFrame(frame);
    }
    update();
    raf = requestAnimationFrame(frame);
    api.set = (id, prop, v) => { byId(id)[prop] = v; changed[id] = (changed[id] || 0) + 1; update(); sliders.forEach((x) => x.c.el === id && x.c.prop === prop && x.s.set(v)); hooks.onChange && hooks.onChange(); };
    return Object.assign(api, { destroy() { alive = false; cancelAnimationFrame(raf); root.innerHTML = ""; } });
  }

  /* =====================================================================
     FLOW WIDGET — charges moving in a wire (World 0, level 1)
     ===================================================================== */
  function Flow(root, spec, hooks) {
    const S = { V: spec.V ?? 3, view: spec.view || "conv", R: 1000, changed: 0 };
    const wrap = h("div", "w-circuit", root);
    const reads = h("div", "w-reads", wrap);
    const svg = el("svg", { viewBox: "0 0 600 300", class: "w-svg" }, wrap);
    const ctl = h("div", "w-ctls", wrap);
    // two "sides" connected by a wire loop
    el("rect", { x: 40, y: 90, width: 70, height: 120, rx: 10, class: "w-sideP" }, svg);
    el("rect", { x: 490, y: 90, width: 70, height: 120, rx: 10, class: "w-sideN" }, svg);
    const tp = el("text", { x: 75, y: 160, class: "w-big", "text-anchor": "middle" }, svg); tp.textContent = "+";
    const tn = el("text", { x: 525, y: 160, class: "w-big", "text-anchor": "middle" }, svg); tn.textContent = "−";
    const loop = "M110,120 L110,60 L490,60 L490,120";
    el("path", { d: loop, class: "w-tube" }, svg);
    el("path", { d: loop, class: "w-wire" }, svg);
    // ammeter in the wire
    el("circle", { cx: 300, cy: 60, r: 18, class: "w-meter" }, svg);
    const ta = el("text", { x: 300, y: 61, class: "w-meterL", "text-anchor": "middle", "dominant-baseline": "central" }, svg); ta.textContent = "A";
    const aVal = el("text", { x: 300, y: 34, class: "w-val", "text-anchor": "middle" }, svg);
    // voltmeter between sides
    el("path", { d: "M75,210 L75,255 L280,255 M320,255 L525,255 L525,210", class: "w-wire w-probe" }, svg);
    el("circle", { cx: 300, cy: 255, r: 18, class: "w-meter" }, svg);
    const tv = el("text", { x: 300, y: 256, class: "w-meterL", "text-anchor": "middle", "dominant-baseline": "central" }, svg); tv.textContent = "V";
    const vVal = el("text", { x: 300, y: 228, class: "w-val", "text-anchor": "middle" }, svg);
    const dirT = el("text", { x: 300, y: 112, class: "w-lab", "text-anchor": "middle", direction: "rtl" }, svg);
    const dots = [];
    const L = 60 + 380 + 60; // path length approx
    const pt = (s) => { s = ((s % L) + L) % L; if (s < 60) return [110, 120 - s]; if (s < 440) return [110 + (s - 60), 60]; return [490, 60 + (s - 440)]; };
    for (let i = 0; i < 14; i++) dots.push({ s: (i * L) / 14, e: el("circle", { r: 6 }, svg) });
    const arrow = el("polygon", { class: "w-arrow" }, svg);
    const ra = h("div", "w-read", reads); h("span", "w-read-l", ra, "זרם I"); const raV = h("b", "", ra);
    const rv = h("div", "w-read", reads); h("span", "w-read-l", rv, "מתח V"); const rvV = h("b", "", rv);
    sliderRow(ctl, { label: "מתח (\"הדחיפה\")", min: 0, max: 12, step: 0.5, unit: "V" }, S.V, (v) => { S.V = v; S.changed++; upd(); hooks.onChange && hooks.onChange(); });
    const tg = h("button", "w-btn", ctl);
    tg.addEventListener("click", () => { S.view = S.view === "conv" ? "elec" : "conv"; upd(); hooks.onChange && hooks.onChange(); });
    function upd() {
      const I = S.V / S.R;
      aVal.textContent = si(I, "A"); vVal.textContent = si(S.V, "V");
      raV.textContent = si(I, "A"); rvV.textContent = si(S.V, "V");
      tg.textContent = S.view === "conv" ? "הצג תנועת אלקטרונים" : "הצג זרם קונבנציונלי";
      dirT.textContent = S.view === "conv" ? "זרם קונבנציונלי: מ-(+) אל (−)" : "אלקטרונים: מ-(−) אל (+)";
      dots.forEach((d) => d.e.setAttribute("class", S.view === "conv" ? "w-q conv" : "w-q elec"));
    }
    let alive = true, last = performance.now();
    (function fr(t) {
      if (!alive) return;
      const dt = Math.min(0.1, (t - last) / 1000); last = t;
      const sp = (S.V / 12) * 140 * (S.view === "conv" ? 1 : -1);
      dots.forEach((d) => { d.s += sp * dt; const [x, y] = pt(d.s); d.e.setAttribute("cx", x); d.e.setAttribute("cy", y); });
      const dir = S.view === "conv" ? 1 : -1;
      arrow.setAttribute("points", dir > 0 ? "330,92 318,86 318,98" : "270,92 282,86 282,98");
      arrow.style.opacity = S.V > 0 ? 1 : 0;
      requestAnimationFrame(fr);
    })(last);
    upd();
    return { get: (k) => ({ I: S.V / S.R, V: S.V, view: S.view, changed: S.changed })[k], set: (k, v) => { S[k] = v; S.changed++; upd(); hooks.onChange && hooks.onChange(); }, destroy() { alive = false; root.innerHTML = ""; } };
  }

  /* =====================================================================
     CHARGE WIDGET — attraction / repulsion
     ===================================================================== */
  function Charge(root, spec, hooks) {
    const S = { a: 1, b: -1, d: 200, taps: 0 };
    const wrap = h("div", "w-circuit", root);
    const reads = h("div", "w-reads", wrap);
    const svg = el("svg", { viewBox: "0 0 600 300", class: "w-svg" }, wrap);
    const ctl = h("div", "w-ctls", wrap);
    const r1 = h("div", "w-read", reads); h("span", "w-read-l", r1, "כוח"); const rV = h("b", "", r1);
    const mk = (who) => {
      const g = el("g", { class: "w-tap" }, svg);
      const c = el("circle", { r: 38 }, g);
      const t = el("text", { class: "w-big", "text-anchor": "middle", "dominant-baseline": "central" }, g);
      g.addEventListener("click", () => { S[who] = -S[who]; S.taps++; upd(); hooks.onChange && hooks.onChange(); });
      return { g, c, t };
    };
    const A = mk("a"), B = mk("b");
    const fa = el("polygon", { class: "w-arrow" }, svg), fb = el("polygon", { class: "w-arrow" }, svg);
    h("div", "w-note", ctl, "לחצו על כדור כדי להחליף את סימן המטען שלו");
    let x = S.d, alive = true, last = performance.now();
    function upd() {
      [[A, S.a], [B, S.b]].forEach(([o, s]) => { o.c.setAttribute("class", s > 0 ? "w-chP" : "w-chN"); o.t.textContent = s > 0 ? "+" : "−"; });
      rV.textContent = S.a * S.b < 0 ? "משיכה" : "דחייה";
    }
    (function fr(t) {
      if (!alive) return;
      const dt = Math.min(0.1, (t - last) / 1000); last = t;
      const target = S.a * S.b < 0 ? 120 : 340;
      x += (target - x) * Math.min(1, dt * 3);
      const cx1 = 300 - x / 2, cx2 = 300 + x / 2;
      A.g.setAttribute("transform", `translate(${cx1},150)`); B.g.setAttribute("transform", `translate(${cx2},150)`);
      const att = S.a * S.b < 0, k = 22;
      // force arrows: attraction points inward, repulsion outward
      const ar = (cx, dir) => `${cx + dir * 46},150 ${cx + dir * (46 + k)},140 ${cx + dir * (46 + k)},160`;
      fa.setAttribute("points", att ? `${cx1 + 66},150 ${cx1 + 48},140 ${cx1 + 48},160` : ar(cx1, -1).replace(/^(\S+)/, "$1"));
      fb.setAttribute("points", att ? `${cx2 - 66},150 ${cx2 - 48},140 ${cx2 - 48},160` : ar(cx2, 1));
      if (!att) { fa.setAttribute("points", `${cx1 - 66},150 ${cx1 - 48},140 ${cx1 - 48},160`); fb.setAttribute("points", `${cx2 + 66},150 ${cx2 + 48},140 ${cx2 + 48},160`); }
      requestAnimationFrame(fr);
    })(last);
    upd();
    return { get: (k) => ({ attract: S.a * S.b < 0, taps: S.taps })[k], set: (k, v) => { S[k] = v; upd(); hooks.onChange && hooks.onChange(); }, destroy() { alive = false; root.innerHTML = ""; } };
  }

  /* =====================================================================
     PREFIX WIDGET — SI prefixes
     ===================================================================== */
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  function Prefix(root, spec, hooks) {
    const unit = spec.unit || "Ω";
    const vals = [];
    for (let d = spec.minExp ?? 0; d <= (spec.maxExp ?? 6); d++) E12.forEach((m) => vals.push(+(m * Math.pow(10, d)).toPrecision(3)));
    const S = { i: Math.max(0, vals.indexOf(spec.value ?? 1000)), changed: 0 };
    const wrap = h("div", "w-circuit w-prefix", root);
    const big = h("div", "w-pbig", wrap);
    const raw = h("div", "w-praw", wrap);
    const tbl = h("div", "w-ptbl", wrap);
    const rows = [["M", "מגה", "×1,000,000"], ["k", "קילו", "×1,000"], ["", "(בלי)", "×1"], ["m", "מילי", "×0.001"], ["µ", "מיקרו", "×0.000001"], ["n", "ננו", "×0.000000001"]]
      .map((r) => { const d = h("div", "w-prow", tbl, `<b>${r[0] || "—"}</b><span>${r[1]}</span><i>${r[2]}</i>`); return { d, p: r[0] }; });
    const ctl = h("div", "w-ctls", wrap);
    const row = h("div", "wctl", ctl);
    h("div", "wctl-top", row, `<span class="wctl-lab">${spec.label || "ערך"}</span>`);
    const inp = h("input", "", row); inp.type = "range"; inp.min = 0; inp.max = vals.length - 1; inp.step = 1; inp.value = S.i;
    inp.addEventListener("input", () => { S.i = +inp.value; S.changed++; upd(); hooks.onChange && hooks.onChange(); });
    function upd() {
      const v = vals[S.i];
      big.textContent = si(v, unit, 3);
      raw.textContent = `${v.toLocaleString("en-US", { maximumFractionDigits: 9 })} ${unit}`;
      const p = si(v, unit, 3).split(" ")[1].replace(unit, "");
      rows.forEach((r) => r.d.classList.toggle("on", r.p === p));
    }
    upd();
    return { get: (k) => ({ value: vals[S.i], changed: S.changed })[k], set: (k, v) => { if (k === "value") { S.i = vals.reduce((bi, x, i) => (Math.abs(x - v) < Math.abs(vals[bi] - v) ? i : bi), 0); inp.value = S.i; S.changed++; upd(); hooks.onChange && hooks.onChange(); } }, destroy() { root.innerHTML = ""; } };
  }

  window.Widgets = {
    si,
    create(root, spec, hooks = {}) {
      root.innerHTML = "";
      const K = { circuit: Circuit, flow: Flow, charge: Charge, prefix: Prefix }[spec.kind];
      if (!K) throw new Error("unknown widget " + spec.kind);
      return K(root, spec, hooks);
    },
  };
})();
