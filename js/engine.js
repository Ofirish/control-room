/* Control Room — game engine: map, 4-step levels, mastery gate, concept cards, encyclopedia, themes, progress. */
(function () {
  "use strict";
  const DATA = window.CR_DATA;
  const WORLDS = window.CR_WORLDS || {};
  const EN = window.CR_EN || {}; // English overlays for level content, keyed by world then level id
  const C = Object.fromEntries(DATA.concepts.map((c) => [c.id, c]));
  const LEVELS = [];
  Object.keys(WORLDS).sort((a, b) => a - b).forEach((w) => WORLDS[w].levels.forEach((l) => LEVELS.push(l)));
  const levelTitle = (w, l) => { const x = DATA.worlds[w].levels.find((y) => y.id === l) || {}; return (lang() === "en" ? x.title_en : x.title) || ""; };
  const worldTitle = (w) => (lang() === "en" ? w.title_en : w.title);
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
  // Hebrew by default; ?lang=en or ?lang=he in the address sets the language (and remembers it)
  const urlLang = (location.search.match(/[?&]lang=(he|en)\b/) || [])[1];
  if (urlLang) P.lang = urlLang;
  if (!P.lang) P.lang = "he";

  /* ---------------- language ---------------- */
  const lang = () => P.lang;
  const UI = {
    he: {
      app: "חדר בקרה", appSub: "משחק לימוד מערכות בקרה", back: "חזרה", enc: "אנציקלופדיה", theme: "ערכת נושא", themeIs: "ערכת נושא: ",
      langBtn: "EN", langTitle: "Switch to English", close: "סגור",
      themes: { dark: "הנדסי כהה", retro: "רטרו SCADA", light: "בהיר" },
      done: (d, t) => `${d} / ${t} רמות הושלמו`, world: (n) => `עולם ${n}`, soon: "בקרוב",
      finishPrev: "סיימו קודם את הרמה הקודמת", building: "העולם הזה עוד בבנייה",
      encSub: "כל המושגים שנפתחו עד עכשיו", moreLater: (n) => `${n} מושגים נוספים ייפתחו בהמשך הדרך.`,
      learnLater: (name, w, l, t) => `<b>${name}</b> יילמד בעולם ${w}, רמה ${l}: ${t}`,
      learnedIn: (w, l, t) => `<b>נלמד ב:</b> עולם ${w} · רמה ${l} — ${t}`, basedOn: "מבוסס על:", comesBack: "חוזר ב:",
      lvlHead: (w, l) => `עולם ${w} · רמה ${l}`, steps: ["הדגמה", "תרגול", "אתגר", "סיכום"],
      lockDemo: (i, n) => `השלב הבא נפתח בסוף ההדגמה: לחצו על <b>הבא ←</b> בתחתית (הדגמה ${i} מתוך ${n})`,
      lockGuided: "השלב הבא נפתח אחרי שמשלימים את כל משימות התרגול", lockCh: "הסיכום נפתח אחרי שעוברים את האתגר", lockElse: "סיימו קודם את השלבים הקודמים",
      demoN: (i, n) => `הדגמה ${i} / ${n}`, prev: "הקודם", next: "הבא ←", toGuided: "לתרגול ←",
      tryThen: "נסו בשרטוט, ואז לחצו <b>הבא</b>", tapNext: "לחצו <b>הבא</b> להמשך",
      taskN: (i, n) => `משימה ${i} / ${n}`, great: "מצוין!", hint: "💡 רמז", nextTask: "המשימה הבאה ←", toCh: "לאתגר ←",
      chHead: "אתגר · פותרים לבד", chOk: "🏆 נכון! עברתם את האתגר.", toSum: "לסיכום ולחידון ←", check: "בדוק ✓", notYet: "❌ עדיין לא. בדקו את החישוב ונסו שוב.", toSumShort: "לסיכום ←",
      cards: "📇 כרטיסי המושגים של הרמה (לחצו לפתיחה)", quizN: (i, n) => `חידון · שאלה ${i} / ${n}`, nextQ: "השאלה הבאה ←", toResult: "לתוצאה ←", result: "תוצאה",
      mastery: "🎉 שליטה מלאה! הרמה הבאה נפתחה, והמושגים נוספו לאנציקלופדיה.", again: "🎉 שוב שליטה מלאה!", nextLevel: "לרמה הבאה ←",
      allDone: "סיימתם את כל הרמות הזמינות. עולמות נוספים בדרך!", toMap: "למפה", needCh: "צריך לעבור את האתגר לפני החידון.",
      need80: "כדי לעבור צריך לפחות 80%. עברו על כרטיסי המושגים ונסו שוב.", retry: "נסו שוב את החידון",
    },
    en: {
      app: "Control Room", appSub: "A game for learning control systems", back: "Back", enc: "Encyclopedia", theme: "Theme", themeIs: "Theme: ",
      langBtn: "עב", langTitle: "החלפה לעברית", close: "Close",
      themes: { dark: "Dark engineering", retro: "Retro SCADA", light: "Light" },
      done: (d, t) => `${d} / ${t} levels completed`, world: (n) => `World ${n}`, soon: "Coming soon",
      finishPrev: "Finish the previous level first", building: "This world is still being built",
      encSub: "All the concepts unlocked so far", moreLater: (n) => `${n} more concepts will unlock along the way.`,
      learnLater: (name, w, l, t) => `<b>${name}</b> is taught in world ${w}, level ${l}: ${t}`,
      learnedIn: (w, l, t) => `<b>Learned in:</b> world ${w} · level ${l} — ${t}`, basedOn: "Builds on:", comesBack: "Comes back in:",
      lvlHead: (w, l) => `World ${w} · Level ${l}`, steps: ["Demo", "Practice", "Challenge", "Summary"],
      lockDemo: (i, n) => `The next step opens at the end of the demo: tap <b>Next →</b> at the bottom (demo ${i} of ${n})`,
      lockGuided: "The next step opens once all practice tasks are done", lockCh: "The summary opens once you pass the challenge", lockElse: "Finish the earlier steps first",
      demoN: (i, n) => `Demo ${i} / ${n}`, prev: "Back", next: "Next →", toGuided: "To practice →",
      tryThen: "Try it in the diagram, then tap <b>Next</b>", tapNext: "Tap <b>Next</b> to continue",
      taskN: (i, n) => `Task ${i} / ${n}`, great: "Great!", hint: "💡 Hint", nextTask: "Next task →", toCh: "To the challenge →",
      chHead: "Challenge · on your own", chOk: "🏆 Correct! You passed the challenge.", toSum: "To summary and quiz →", check: "Check ✓", notYet: "❌ Not yet. Check your calculation and try again.", toSumShort: "To summary →",
      cards: "📇 This level's concept cards (tap to open)", quizN: (i, n) => `Quiz · question ${i} / ${n}`, nextQ: "Next question →", toResult: "See result →", result: "Result",
      mastery: "🎉 Full mastery! The next level is unlocked and the concepts were added to the encyclopedia.", again: "🎉 Full mastery again!", nextLevel: "Next level →",
      allDone: "You have finished all available levels. More worlds are on the way!", toMap: "To the map", needCh: "You need to pass the challenge before the quiz.",
      need80: "You need at least 80% to pass. Review the concept cards and try again.", retry: "Retry the quiz",
    },
  };
  const u = (k, ...a) => { const v = UI[lang()][k] ?? UI.he[k]; return typeof v === "function" ? v(...a) : v; };
  const cName = (c) => (lang() === "en" ? c.en : c.he);
  const cAlt = (c) => (lang() === "en" ? c.he : c.en);
  const cDef = (c) => (lang() === "en" ? c.definition_en : c.definition);
  const cDemo = (c) => (lang() === "en" ? c.demo_en : c.demo);
  const cUnit = (c) => (lang() === "en" ? c.unit_en : c.unit);
  // localized copy of a level: English overlay fields replace the Hebrew text, widgets and conditions stay shared
  function loc(lv) {
    if (lang() !== "en") return lv;
    const o = EN[lv.world] && EN[lv.world][lv.id];
    if (!o) return lv;
    const merge = (base, ov) => Object.assign({}, base, ov || {});
    return Object.assign({}, lv, {
      goal: o.goal ?? lv.goal,
      demo: lv.demo.map((d, i) => merge(d, o.demo && o.demo[i])),
      guided: lv.guided.map((g, i) => merge(g, o.guided && o.guided[i])),
      challenge: merge(lv.challenge, o.challenge),
      quiz: lv.quiz.map((q, i) => merge(q, o.quiz && o.quiz[i])),
    });
  }
  function applyLang() {
    window.CR_LANG = lang();
    document.documentElement.lang = lang();
    document.documentElement.dir = lang() === "he" ? "rtl" : "ltr";
    document.title = lang() === "he" ? "חדר בקרה · משחק לימוד מערכות בקרה" : "Control Room · a control-systems learning game";
  }
  applyLang();
  let rerender = () => showMap();
  const save = () => store.save(P);
  const isDone = (id) => !!P.done[id];
  const unlockedIdx = () => { let i = 0; while (i < LEVELS.length && isDone(LEVELS[i].id)) i++; return Math.min(i, LEVELS.length - 1); };
  const reachedRank = () => { const lv = LEVELS[unlockedIdx()]; return lv.world * 100 + lv.level; };
  const rank = (c) => c.world * 100 + c.level;
  const introduced = (id) => C[id] && rank(C[id]) <= reachedRank();

  /* ---------------- theme ---------------- */
  const THEMES = ["dark", "retro", "light"];
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
      return `<button class="term" data-c="${id}">${label || cName(c)}</button>`;
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
    if (!introduced(id)) { toast(u("learnLater", cName(c), c.world, c.level, levelTitle(c.world, c.level))); return; }
    closeCard();
    const back = h("div", "sheet-back", document.body);
    const sh = h("div", "sheet", document.body);
    sh.id = "card"; back.id = "cardBack";
    const head = h("div", "sheet-head", sh);
    h("div", "card-t", head, `${cName(c)} <span class="card-sym ltr">${c.symbol || ""}</span>`);
    const x = h("button", "icon-btn", head, "✕"); x.setAttribute("aria-label", u("close"));
    const body = h("div", "sheet-body", sh);
    h("div", "card-en", body, `<span>${cAlt(c)}</span>${cUnit(c) ? ` · <span class="ltr">${cUnit(c)}</span>` : ""}`);
    h("p", "card-def", body, cDef(c));
    const demoSpec = (WORLDS[c.world] && WORLDS[c.world].demos[id]) || null;
    if (demoSpec) {
      const box = h("div", "card-demo", body);
      h("div", "card-cap", box, "🔬 " + cDemo(c));
      const st = h("div", "card-stage", box);
      cardWidget = Widgets.create(st, demoSpec, { onTap: (cid) => cid && cid !== id && openCard(cid) });
    }
    const meta = h("div", "card-meta", body);
    h("div", "", meta, u("learnedIn", c.world, c.level, levelTitle(c.world, c.level)));
    const chips = (title, ids) => {
      if (!ids.length) return;
      const r = h("div", "chips", meta, `<b>${title}</b>`);
      ids.forEach((i) => {
        const k = C[i];
        const b = h("button", "chip" + (introduced(i) ? "" : " locked"), r, cName(k) + (introduced(i) ? "" : ` <small>(${u("world", k.world)})</small>`));
        b.dataset.card = i;
      });
    };
    chips(u("basedOn"), c.requires);
    chips(u("comesBack"), c.used_by);
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
    if (back) { const b = h("button", "icon-btn", bar, lang() === "he" ? "→" : "←"); b.title = u("back"); b.addEventListener("click", back); }
    const t = h("div", "bar-t", bar, `<b>${title}</b>${sub ? `<span>${sub}</span>` : ""}`);
    const r = h("div", "bar-r", bar);
    const lg = h("button", "icon-btn lang-btn", r, u("langBtn")); lg.title = u("langTitle");
    lg.addEventListener("click", () => { P.lang = lang() === "he" ? "en" : "he"; save(); applyLang(); rerender(); });
    const enc = h("button", "icon-btn", r, "📖"); enc.title = u("enc"); enc.addEventListener("click", showEncyclopedia);
    const th = h("button", "icon-btn", r, "🎨"); th.title = u("theme");
    th.addEventListener("click", () => { const i = THEMES.indexOf(P.theme); P.theme = THEMES[(i + 1) % THEMES.length]; applyTheme(); save(); toast(u("themeIs") + u("themes")[P.theme]); });
    return t;
  }

  /* ---- map ---- */
  function showMap() {
    clear(); rerender = () => showMap();
    topbar(u("app"), u("appSub"));
    const main = h("main", "map", app);
    const total = LEVELS.length, done = LEVELS.filter((l) => isDone(l.id)).length;
    h("div", "map-prog", main, `<div class="pbar"><i style="width:${(100 * done) / total}%"></i></div><span>${u("done", done, total)}</span>`);
    const cur = unlockedIdx();
    DATA.worlds.forEach((w) => {
      const playable = WORLDS[w.id];
      const card = h("section", "world" + (playable ? "" : " soon"), main);
      h("div", "world-h", card, `<span class="world-n">${u("world", w.id)}</span><b>${worldTitle(w)}</b>${playable ? "" : `<span class="soon-tag">${u("soon")}</span>`}`);
      const grid = h("div", "lv-grid", card);
      w.levels.forEach((l) => {
        const lv = LEVELS.find((x) => x.world === w.id && x.level === l.id);
        const idx = lv ? LEVELS.indexOf(lv) : -1;
        const state = !lv ? "soon" : isDone(lv.id) ? "done" : idx <= cur ? "open" : "locked";
        const b = h("button", "lv " + state, grid, `<i>${state === "done" ? "✓" : state === "open" ? "▶" : "🔒"}</i><span>${l.id}. ${lang() === "en" ? l.title_en : l.title}</span>`);
        if (state === "open" || state === "done") b.addEventListener("click", () => showLevel(lv));
        else if (state === "locked") b.addEventListener("click", () => toast(u("finishPrev")));
        else b.addEventListener("click", () => toast(u("building")));
      });
    });
  }

  /* ---- encyclopedia ---- */
  function showEncyclopedia() {
    clear(); rerender = () => showEncyclopedia();
    topbar(u("enc"), u("encSub"), showMap);
    const main = h("main", "enc", app);
    const list = DATA.concepts.filter((c) => introduced(c.id));
    DATA.worlds.forEach((w) => {
      const items = list.filter((c) => c.world === w.id);
      if (!items.length) return;
      h("h3", "", main, `${u("world", w.id)} · ${worldTitle(w)}`);
      const g = h("div", "enc-grid", main);
      items.forEach((c) => { const b = h("button", "enc-i", g, `<b>${cName(c)}</b><span class="ltr">${c.symbol || cAlt(c)}</span>`); b.dataset.card = c.id; });
    });
    const locked = DATA.concepts.length - list.length;
    h("p", "muted", main, u("moreLater", locked));
  }

  /* ---- level ---- */
  const STEPS = ["demo", "guided", "challenge", "summary"];
  function showLevel(base, stepName = "demo", sub = 0) {
    clear(); rerender = () => showLevel(base, stepName, sub);
    const lv = loc(base);
    const st = { lv, step: stepName, i: sub, passed: !!(P.done[lv.id]), challengeOk: !!(P.done[lv.id]), tries: 0 };
    const allowed = (s) => s === "demo" || isDone(lv.id) || (P.reach && P.reach[lv.id] && P.reach[lv.id].includes(s));
    const allow = (s) => { P.reach = P.reach || {}; P.reach[lv.id] = Array.from(new Set([...(P.reach[lv.id] || []), s])); save(); };
    topbar(u("lvlHead", lv.world, lv.level), levelTitle(lv.world, lv.level), showMap);
    const steps = h("nav", "steps", app);
    STEPS.forEach((k, j) => {
      const b = h("button", "step" + (k === stepName ? " on" : "") + (allowed(k) ? "" : " dis"), steps, `<i>${j + 1}</i>${u("steps")[j]}`);
      b.addEventListener("click", () => {
        if (allowed(k)) return showLevel(base, k);
        const msg = stepName === "demo" ? u("lockDemo", sub + 1, lv.demo.length)
          : stepName === "guided" ? u("lockGuided") : stepName === "challenge" ? u("lockCh") : u("lockElse");
        toast(msg);
        const nb = foot.querySelector(".btn.pri"); if (nb) { nb.classList.remove("pulse"); void nb.offsetWidth; nb.classList.add("pulse"); }
      });
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
      h("div", "count", text, u("demoN", sub + 1, n));
      h("p", "say", text, rich(s.t));
      mount(s.w);
      if (sub > 0) btn(u("prev"), "ghost", () => showLevel(base, "demo", sub - 1));
      h("div", "dots", text, lv.demo.map((_, j) => `<i class="${j < sub ? "seen" : j === sub ? "cur" : ""}"></i>`).join("") + `<span>${s.w ? u("tryThen") : u("tapNext")}</span>`);
      if (sub < n - 1) btn(u("next"), "pri pulse", () => showLevel(base, "demo", sub + 1));
      else btn(u("toGuided"), "pri pulse", () => { allow("guided"); showLevel(base, "guided", 0); });
    }

    if (stepName === "guided") {
      const n = lv.guided.length;
      let currentCheck = null;
      // the live widget is kept between tasks that do not define a new one, so the learner's settings carry over
      const task = (k) => {
        clearInterval(ticker);
        text.innerHTML = ""; foot.innerHTML = "";
        const g = lv.guided[k];
        rerender = () => showLevel(base, "guided", k);
        if (g.w || !widget) {
          let spec = g.w; for (let j = k; !spec && j >= 0; j--) spec = lv.guided[j].w;
          mount(spec, () => currentCheck && currentCheck());
        }
        h("div", "count", text, u("taskN", k + 1, n));
        h("p", "say", text, rich(g.t));
        const fb = h("div", "fb", text);
        const hint = h("div", "hint", text);
        let next;
        currentCheck = () => {
          if (next.disabled && evalCond(g.done)) { fb.innerHTML = "✅ " + rich(g.ok || u("great")); fb.className = "fb ok"; next.disabled = false; next.classList.add("pulse"); }
        };
        btn(u("hint"), "ghost", () => { hint.innerHTML = rich(g.hint); hint.classList.add("on"); });
        next = btn(k < n - 1 ? u("nextTask") : u("toCh"), "pri", () => {
          if (k < n - 1) task(k + 1);
          else { allow("challenge"); showLevel(base, "challenge"); }
        });
        next.disabled = true;
        ticker = setInterval(currentCheck, 300);
        currentCheck();
      };
      task(sub);
    }

    if (stepName === "challenge") {
      const ch = lv.challenge;
      h("div", "count", text, u("chHead"));
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
        fb.innerHTML = u("chOk"); fb.className = "fb ok";
        allow("summary"); P.ch = P.ch || {}; P.ch[lv.id] = true; save();
        checkBtn.remove();
        btn(u("toSum"), "pri pulse", () => showLevel(base, "summary"));
      };
      const checkBtn = btn(u("check"), "pri", () => {
        let ok;
        if (ch.type === "number") {
          const v = parseFloat(String(input.value).replace(",", "."));
          ok = isFinite(v) && Math.abs(v - ch.answer) <= Math.abs(ch.answer) * (ch.tol ?? 0.01) + 1e-9;
        } else ok = evalCond(ch.done);
        if (ok) return pass();
        st.tries++;
        fb.innerHTML = u("notYet"); fb.className = "fb bad";
        if (st.tries >= 2 && ch.hint) { hint.innerHTML = rich("💡 " + ch.hint); hint.classList.add("on"); }
      });
      if (P.ch && P.ch[lv.id]) btn(u("toSumShort"), "ghost", () => showLevel(base, "summary"));
    }

    if (stepName === "summary") {
      stage.classList.add("summary-stage");
      h("div", "count", stage, u("cards"));
      const g = h("div", "enc-grid", stage);
      conceptsOf(lv).forEach((c) => { const b = h("button", "enc-i", g, `<b>${cName(c)}</b><span class="ltr">${c.symbol || cAlt(c)}</span>`); b.dataset.card = c.id; });
      runQuiz(lv, base, text, foot);
    }
  }

  /* ---- quiz with mastery gate ---- */
  function runQuiz(lv, base, text, foot) {
    const qs = lv.quiz.map((q) => q); let i = 0, right = 0;
    const draw = () => {
      text.innerHTML = ""; foot.innerHTML = "";
      if (i >= qs.length) return result();
      const q = qs[i];
      h("div", "count", text, u("quizN", i + 1, qs.length));
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
          const nb = h("button", "btn pri", foot, i < qs.length - 1 ? u("nextQ") : u("toResult"));
          nb.addEventListener("click", () => { i++; draw(); });
        });
      });
    };
    const result = () => {
      const score = right / qs.length, chOk = !!(P.ch && P.ch[lv.id]);
      const pass = score >= 0.8 && chOk;
      h("div", "count", text, u("result"));
      h("div", "score " + (pass ? "ok" : "bad"), text, `${right} / ${qs.length}`);
      if (pass) {
        const first = !isDone(lv.id);
        P.done[lv.id] = { score, at: Date.now() }; save();
        h("p", "say", text, first ? u("mastery") : u("again"));
        const idx = LEVELS.indexOf(base);
        if (idx < LEVELS.length - 1) { const nb = h("button", "btn pri pulse", foot, u("nextLevel")); nb.addEventListener("click", () => showLevel(LEVELS[idx + 1])); }
        else h("p", "say", text, u("allDone"));
        const mb = h("button", "btn ghost", foot, u("toMap")); mb.addEventListener("click", showMap);
      } else {
        h("p", "say", text, !chOk ? u("needCh") : u("need80"));
        const rb = h("button", "btn pri", foot, u("retry")); rb.addEventListener("click", () => { i = 0; right = 0; draw(); });
      }
    };
    draw();
  }

  window.CR = { showMap, showLevel, openCard, LEVELS, C, P, widget: () => widget, setLang: (l) => { P.lang = l; save(); applyLang(); rerender(); } };
  showMap();
})();
