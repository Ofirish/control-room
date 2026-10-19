/* Control Room — game engine: map, 4-step levels, mastery gate, concept cards, encyclopedia, themes, progress. */
(function () {
  "use strict";
  const DATA = window.CR_DATA;
  const WORLDS = window.CR_WORLDS || {};
  const C = Object.fromEntries(DATA.concepts.map((c) => [c.id, c]));
  const LEVELS = [];
  Object.keys(WORLDS).sort((a, b) => a - b).forEach((w) => WORLDS[w].levels.forEach((l) => LEVELS.push(l)));
  const levelTitle = (w, l) => (DATA.worlds[w].levels.find((x) => x.id === l) || {}).title || "";
  const conceptsOf = (lv) => DATA.concepts.filter((c) => c.world === lv.world && c.level === lv.level);
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const near = (a, b, tol = 0.02) => Math.abs(a - b) <= Math.abs(b) * tol + 1e-12;

  /* ---------------- progress ---------------- */
  const KEY = "cr.v1";
  const store = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } },
  };
  const P = Object.assign({ done: {}, theme: "dark" }, store.load());
  const save = () => store.save(P);
  const isDone = (id) => !!P.done[id];
  const unlockedIdx = () => { let i = 0; while (i < LEVELS.length && isDone(LEVELS[i].id)) i++; return Math.min(i, LEVELS.length - 1); };
  const reachedRank = () => { const lv = LEVELS[unlockedIdx()]; return lv.world * 100 + lv.level; };
  const rank = (c) => c.world * 100 + c.level;
  const introduced = (id) => C[id] && rank(C[id]) <= reachedRank();

  /* ---------------- theme ---------------- */
  const THEMES = [["dark", "הנדסי כהה"], ["retro", "רטרו SCADA"], ["light", "בהיר"]];
  const applyTheme = () => document.documentElement.setAttribute("data-theme", P.theme);
  applyTheme();

  /* ---------------- viewport height (mobile browsers) ---------------- */
  const fitH = () => document.documentElement.style.setProperty("--appH", (window.visualViewport ? visualViewport.height : innerHeight) + "px");
  addEventListener("resize", fitH); if (window.visualViewport) visualViewport.addEventListener("resize", fitH); fitH();

  /* ---------------- rich text with tappable terms ---------------- */
  function rich(text) {
    return text.replace(/\[\[([a-z0-9_]+)(?:\|([^\]]+))?\]\]/g, (m, id, label) => {
      const c = C[id];
      if (!c) { console.warn("unknown concept", id); return label || id; }
      return `<button class="term" data-c="${id}">${label || c.he}</button>`;
    });
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".term,[data-card]");
    if (!t) return;
    e.preventDefault();
    openCard(t.dataset.c || t.dataset.card);
  });

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(msg) {
    let t = $("#toast"); if (!t) t = h("div", "toast", document.body); t.id = "toast";
    t.innerHTML = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600);
  }

  /* ---------------- concept card (sheet) ---------------- */
  let cardWidget = null;
  function openCard(id) {
    const c = C[id];
    if (!c) return;
    if (!introduced(id)) { toast(`<b>${c.he}</b> יילמד בעולם ${c.world}, רמה ${c.level}: ${levelTitle(c.world, c.level)}`); return; }
    closeCard();
    const back = h("div", "sheet-back", document.body);
    const sh = h("div", "sheet", document.body);
    sh.id = "card"; back.id = "cardBack";
    const head = h("div", "sheet-head", sh);
    h("div", "card-t", head, `${c.he} <span class="card-sym ltr">${c.symbol || ""}</span>`);
    const x = h("button", "icon-btn", head, "✕"); x.setAttribute("aria-label", "סגור");
    const body = h("div", "sheet-body", sh);
    h("div", "card-en ltr", body, `${c.en}${c.unit ? " · " + c.unit : ""}`);
    h("p", "card-def", body, c.definition);
    const demoSpec = (WORLDS[c.world] && WORLDS[c.world].demos[id]) || null;
    if (demoSpec) {
      const box = h("div", "card-demo", body);
      h("div", "card-cap", box, "🔬 " + c.demo);
      const st = h("div", "card-stage", box);
      cardWidget = Widgets.create(st, demoSpec, { onTap: (cid) => cid && cid !== id && openCard(cid) });
    }
    const meta = h("div", "card-meta", body);
    h("div", "", meta, `<b>נלמד ב:</b> עולם ${c.world} · רמה ${c.level} — ${levelTitle(c.world, c.level)}`);
    const chips = (title, ids) => {
      if (!ids.length) return;
      const r = h("div", "chips", meta, `<b>${title}</b>`);
      ids.forEach((i) => {
        const k = C[i];
        const b = h("button", "chip" + (introduced(i) ? "" : " locked"), r, k.he + (introduced(i) ? "" : ` <small>(עולם ${k.world})</small>`));
        b.dataset.card = i;
      });
    };
    chips("מבוסס על:", c.requires);
    chips("חוזר ב:", c.used_by);
    const close = () => closeCard();
    x.addEventListener("click", close); back.addEventListener("click", close);
    requestAnimationFrame(() => { sh.classList.add("on"); back.classList.add("on"); });
  }
  function closeCard() {
    if (cardWidget) { cardWidget.destroy(); cardWidget = null; }
    ["#card", "#cardBack"].forEach((s) => { const e = $(s); if (e) e.remove(); });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCard(); });

  /* ---------------- screens ---------------- */
  const app = $("#app");
  let widget = null, ticker = 0;
  function clear() { if (widget) { widget.destroy(); widget = null; } clearInterval(ticker); closeCard(); app.innerHTML = ""; }

  function topbar(title, sub, back) {
    const bar = h("header", "bar", app);
    if (back) { const b = h("button", "icon-btn", bar, "→"); b.title = "חזרה"; b.addEventListener("click", back); }
    const t = h("div", "bar-t", bar, `<b>${title}</b>${sub ? `<span>${sub}</span>` : ""}`);
    const r = h("div", "bar-r", bar);
    const enc = h("button", "icon-btn", r, "📖"); enc.title = "אנציקלופדיה"; enc.addEventListener("click", showEncyclopedia);
    const th = h("button", "icon-btn", r, "🎨"); th.title = "ערכת נושא";
    th.addEventListener("click", () => { const i = THEMES.findIndex((x) => x[0] === P.theme); P.theme = THEMES[(i + 1) % THEMES.length][0]; applyTheme(); save(); toast("ערכת נושא: " + THEMES.find((x) => x[0] === P.theme)[1]); });
    return t;
  }

  /* ---- map ---- */
  function showMap() {
    clear();
    topbar("חדר בקרה", "משחק לימוד מערכות בקרה");
    const main = h("main", "map", app);
    const total = LEVELS.length, done = LEVELS.filter((l) => isDone(l.id)).length;
    h("div", "map-prog", main, `<div class="pbar"><i style="width:${(100 * done) / total}%"></i></div><span>${done} / ${total} רמות הושלמו</span>`);
    const cur = unlockedIdx();
    DATA.worlds.forEach((w) => {
      const playable = WORLDS[w.id];
      const card = h("section", "world" + (playable ? "" : " soon"), main);
      h("div", "world-h", card, `<span class="world-n">עולם ${w.id}</span><b>${w.title}</b>${playable ? "" : '<span class="soon-tag">בקרוב</span>'}`);
      const grid = h("div", "lv-grid", card);
      w.levels.forEach((l) => {
        const lv = LEVELS.find((x) => x.world === w.id && x.level === l.id);
        const idx = lv ? LEVELS.indexOf(lv) : -1;
        const state = !lv ? "soon" : isDone(lv.id) ? "done" : idx <= cur ? "open" : "locked";
        const b = h("button", "lv " + state, grid, `<i>${state === "done" ? "✓" : state === "open" ? "▶" : "🔒"}</i><span>${l.id}. ${l.title}</span>`);
        if (state === "open" || state === "done") b.addEventListener("click", () => showLevel(lv));
        else if (state === "locked") b.addEventListener("click", () => toast("סיימו קודם את הרמה הקודמת"));
        else b.addEventListener("click", () => toast("העולם הזה עוד בבנייה"));
      });
    });
  }

  /* ---- encyclopedia ---- */
  function showEncyclopedia() {
    clear();
    topbar("אנציקלופדיה", "כל המושגים שנפתחו עד עכשיו", showMap);
    const main = h("main", "enc", app);
    const list = DATA.concepts.filter((c) => introduced(c.id));
    DATA.worlds.forEach((w) => {
      const items = list.filter((c) => c.world === w.id);
      if (!items.length) return;
      h("h3", "", main, `עולם ${w.id} · ${w.title}`);
      const g = h("div", "enc-grid", main);
      items.forEach((c) => { const b = h("button", "enc-i", g, `<b>${c.he}</b><span class="ltr">${c.symbol || c.en}</span>`); b.dataset.card = c.id; });
    });
    const locked = DATA.concepts.length - list.length;
    h("p", "muted", main, `${locked} מושגים נוספים ייפתחו בהמשך הדרך.`);
  }

  /* ---- level ---- */
  const STEPS = [["demo", "הדגמה"], ["guided", "תרגול"], ["challenge", "אתגר"], ["summary", "סיכום"]];
  function showLevel(lv, stepName = "demo", sub = 0) {
    clear();
    const st = { lv, step: stepName, i: sub, passed: !!(P.done[lv.id]), challengeOk: !!(P.done[lv.id]), tries: 0 };
    const allowed = (s) => s === "demo" || isDone(lv.id) || (P.reach && P.reach[lv.id] && P.reach[lv.id].includes(s));
    const allow = (s) => { P.reach = P.reach || {}; P.reach[lv.id] = Array.from(new Set([...(P.reach[lv.id] || []), s])); save(); };
    topbar(`עולם ${lv.world} · רמה ${lv.level}`, levelTitle(lv.world, lv.level), showMap);
    const steps = h("nav", "steps", app);
    STEPS.forEach(([k, name], j) => {
      const b = h("button", "step" + (k === stepName ? " on" : "") + (allowed(k) ? "" : " dis"), steps, `<i>${j + 1}</i>${name}`);
      b.addEventListener("click", () => { if (allowed(k)) showLevel(lv, k); else toast("השלימו קודם את השלב הנוכחי"); });
    });
    const main = h("main", "lvl", app);
    const stage = h("section", "stage", main);
    const panel = h("section", "panel", main);
    const text = h("div", "panel-text", panel);
    const foot = h("div", "panel-foot", panel);

    const mount = (spec, onChange) => {
      if (widget) widget.destroy();
      widget = spec ? Widgets.create(stage, spec, { onChange, onTap: (cid) => cid && openCard(cid) }) : null;
      stage.classList.toggle("empty", !spec);
    };
    const btn = (label, cls, fn) => { const b = h("button", "btn " + (cls || ""), foot, label); b.addEventListener("click", fn); return b; };
    const evalCond = (expr) => { try { return !!new Function("w", "near", "return (" + expr + ");")(widget, near); } catch (e) { console.warn(e); return false; } };

    if (stepName === "demo") {
      const n = lv.demo.length, s = lv.demo[sub];
      if (sub === 0) h("div", "goal", text, "🎯 " + lv.goal);
      h("div", "count", text, `הדגמה ${sub + 1} / ${n}`);
      h("p", "say", text, rich(s.t));
      mount(s.w);
      if (sub > 0) btn("הקודם", "ghost", () => showLevel(lv, "demo", sub - 1));
      if (sub < n - 1) btn("הבא ←", "pri", () => showLevel(lv, "demo", sub + 1));
      else btn("לתרגול ←", "pri", () => { allow("guided"); showLevel(lv, "guided", 0); });
    }

    if (stepName === "guided") {
      const n = lv.guided.length;
      let currentCheck = null;
      // the live widget is kept between tasks that do not define a new one, so the learner's settings carry over
      const task = (k) => {
        clearInterval(ticker);
        text.innerHTML = ""; foot.innerHTML = "";
        const g = lv.guided[k];
        if (g.w || !widget) {
          let spec = g.w; for (let j = k; !spec && j >= 0; j--) spec = lv.guided[j].w;
          mount(spec, () => currentCheck && currentCheck());
        }
        h("div", "count", text, `משימה ${k + 1} / ${n}`);
        h("p", "say", text, rich(g.t));
        const fb = h("div", "fb", text);
        const hint = h("div", "hint", text);
        let next;
        currentCheck = () => {
          if (next.disabled && evalCond(g.done)) { fb.innerHTML = "✅ " + rich(g.ok || "מצוין!"); fb.className = "fb ok"; next.disabled = false; next.classList.add("pulse"); }
        };
        btn("💡 רמז", "ghost", () => { hint.innerHTML = rich(g.hint); hint.classList.add("on"); });
        next = btn(k < n - 1 ? "המשימה הבאה ←" : "לאתגר ←", "pri", () => {
          if (k < n - 1) task(k + 1);
          else { allow("challenge"); showLevel(lv, "challenge"); }
        });
        next.disabled = true;
        ticker = setInterval(currentCheck, 300);
        currentCheck();
      };
      task(sub);
    }

    if (stepName === "challenge") {
      const ch = lv.challenge;
      h("div", "count", text, "אתגר · פותרים לבד");
      h("p", "say", text, rich(ch.t));
      const fb = h("div", "fb", text);
      const hint = h("div", "hint", text);
      mount(ch.w || null);
      let input;
      if (ch.type === "number") {
        const row = h("div", "num-row", text);
        input = h("input", "num ltr", row); input.type = "text"; input.inputMode = "decimal"; input.placeholder = "?";
        h("span", "num-u ltr", row, ch.unit || "");
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") checkBtn.click(); });
      }
      const pass = () => {
        fb.innerHTML = "🏆 נכון! עברתם את האתגר."; fb.className = "fb ok";
        allow("summary"); P.ch = P.ch || {}; P.ch[lv.id] = true; save();
        checkBtn.remove();
        btn("לסיכום ולחידון ←", "pri pulse", () => showLevel(lv, "summary"));
      };
      const checkBtn = btn("בדוק ✓", "pri", () => {
        let ok;
        if (ch.type === "number") {
          const v = parseFloat(String(input.value).replace(",", "."));
          ok = isFinite(v) && Math.abs(v - ch.answer) <= Math.abs(ch.answer) * (ch.tol ?? 0.01) + 1e-9;
        } else ok = evalCond(ch.done);
        if (ok) return pass();
        st.tries++;
        fb.innerHTML = "❌ עדיין לא. בדקו את החישוב ונסו שוב."; fb.className = "fb bad";
        if (st.tries >= 2 && ch.hint) { hint.innerHTML = rich("💡 " + ch.hint); hint.classList.add("on"); }
      });
      if (P.ch && P.ch[lv.id]) btn("לסיכום ←", "ghost", () => showLevel(lv, "summary"));
    }

    if (stepName === "summary") {
      stage.classList.add("summary-stage");
      h("div", "count", stage, "📇 כרטיסי המושגים של הרמה (לחצו לפתיחה)");
      const g = h("div", "enc-grid", stage);
      conceptsOf(lv).forEach((c) => { const b = h("button", "enc-i", g, `<b>${c.he}</b><span class="ltr">${c.symbol || c.en}</span>`); b.dataset.card = c.id; });
      runQuiz(lv, text, foot);
    }
  }

  /* ---- quiz with mastery gate ---- */
  function runQuiz(lv, text, foot) {
    const qs = lv.quiz.map((q) => q); let i = 0, right = 0;
    const draw = () => {
      text.innerHTML = ""; foot.innerHTML = "";
      if (i >= qs.length) return result();
      const q = qs[i];
      h("div", "count", text, `חידון · שאלה ${i + 1} / ${qs.length}`);
      h("p", "say", text, rich(q.q));
      const opts = h("div", "opts", text);
      const fb = h("div", "fb", text);
      q.o.forEach((o, j) => {
        const b = h("button", "opt", opts, rich(o));
        b.addEventListener("click", () => {
          if (opts.classList.contains("answered")) return;
          opts.classList.add("answered");
          const ok = j === q.a; if (ok) right++;
          b.classList.add(ok ? "ok" : "bad"); opts.children[q.a].classList.add("ok");
          fb.innerHTML = (ok ? "✅ " : "❌ ") + rich(q.x); fb.className = "fb " + (ok ? "ok" : "bad");
          const nb = h("button", "btn pri", foot, i < qs.length - 1 ? "השאלה הבאה ←" : "לתוצאה ←");
          nb.addEventListener("click", () => { i++; draw(); });
        });
      });
    };
    const result = () => {
      const score = right / qs.length, chOk = !!(P.ch && P.ch[lv.id]);
      const pass = score >= 0.8 && chOk;
      h("div", "count", text, "תוצאה");
      h("div", "score " + (pass ? "ok" : "bad"), text, `${right} / ${qs.length}`);
      if (pass) {
        const first = !isDone(lv.id);
        P.done[lv.id] = { score, at: Date.now() }; save();
        h("p", "say", text, first ? "🎉 שליטה מלאה! הרמה הבאה נפתחה, והמושגים נוספו לאנציקלופדיה." : "🎉 שוב שליטה מלאה!");
        const idx = LEVELS.indexOf(lv);
        if (idx < LEVELS.length - 1) { const nb = h("button", "btn pri pulse", foot, "לרמה הבאה ←"); nb.addEventListener("click", () => showLevel(LEVELS[idx + 1])); }
        else h("p", "say", text, "סיימתם את כל הרמות הזמינות. עולמות נוספים בדרך!");
        const mb = h("button", "btn ghost", foot, "למפה"); mb.addEventListener("click", showMap);
      } else {
        h("p", "say", text, !chOk ? "צריך לעבור את האתגר לפני החידון." : "כדי לעבור צריך לפחות 80%. עברו על כרטיסי המושגים ונסו שוב.");
        const rb = h("button", "btn pri", foot, "נסו שוב את החידון"); rb.addEventListener("click", () => { i = 0; right = 0; draw(); });
      }
    };
    draw();
  }

  window.CR = { showMap, showLevel, openCard, LEVELS, C, P, widget: () => widget };
  showMap();
})();
