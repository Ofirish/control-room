/* World 0 — electricity basics.
   Text markup: [[conceptId]] or [[conceptId|shown text]] becomes a tappable term.
   Conditions are JS expressions over `w` (the live widget) and near(a, b, tol). */
(function () {
  "use strict";
  const L = 90, T = 70, RX = 510, B = 280;
  const T2 = (he, en) => ({ he, en }); // bilingual widget label

  /* place components evenly along an edge from A to Z; `breaks` adds extra wire nodes (x or y values) */
  function edge(A, Z, specs, els, breaks = []) {
    const dx = Z[0] - A[0], dy = Z[1] - A[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const stops = [];
    specs.forEach((s, i) => {
      const t = s.at != null ? s.at : (i + 1) / (specs.length + 1);
      const c = [A[0] + dx * t, A[1] + dy * t];
      const p0 = [Math.round(c[0] - ux * 28), Math.round(c[1] - uy * 28)], p1 = [Math.round(c[0] + ux * 28), Math.round(c[1] + uy * 28)];
      const e = Object.assign({}, s, { p: s.rev ? [p1, p0] : [p0, p1] });
      if (s.vm && s.ls == null) e.ls = -(s.vm.side || 1); // label on the other side of the voltmeter
      delete e.at; delete e.rev; delete e.vm;
      els.push(e);
      if (s.vm) { // voltmeter drawn beside the component
        const n = s.vm.side || 1, nx = -uy * n * 52, ny = ux * n * 52;
        els.push({ t: "vm", id: s.vm.id, label: s.vm.label, hideVal: s.vm.hideVal, ls: n, p: [p0, [p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], p1] });
      }
      stops.push({ t, a: p0, b: p1 });
    });
    breaks.forEach((v) => { const t = dx ? (v - A[0]) / dx : (v - A[1]) / dy; stops.push({ t, a: [Math.round(A[0] + dx * t), Math.round(A[1] + dy * t)], pt: true }); });
    stops.sort((x, y) => x.t - y.t);
    let cur = A; let k = 0;
    stops.forEach((s) => {
      const a = s.pt ? s.a : s.a, b = s.pt ? s.a : s.b;
      if (cur[0] !== a[0] || cur[1] !== a[1]) els.push({ t: "w", id: "w" + Math.random().toString(36).slice(2, 7) + k++, p: [cur, a] });
      cur = b;
    });
    if (cur[0] !== Z[0] || cur[1] !== Z[1]) els.push({ t: "w", id: "w" + Math.random().toString(36).slice(2, 7) + k++, p: [cur, Z] });
  }
  /* rectangular loop, battery on the left edge (+ on top) */
  function loop(o) {
    const els = [];
    edge([L, B], [L, T], [Object.assign({ t: "bat", id: "B1", v: o.V ?? 9, label: T2("מקור", "Source"), show: "v", ls: 1, rev: true }, o.bat || {})], els);
    edge([L, T], [RX, T], o.top || [], els, o.topBreaks);
    edge([RX, T], [RX, B], o.right || [], els, o.rightBreaks);
    edge([RX, B], [L, B], o.bottom || [], els, o.bottomBreaks);
    (o.extra || []).forEach((e) => els.push(e));
    if (o.gnd) els.push({ t: "gnd", id: "G", p: [[L, B]] });
    return { kind: "circuit", view: [600, 340], els, controls: o.controls || [], readouts: o.readouts || [], nodeLabels: o.nodes };
  }
  /* parallel branches between a top rail and a bottom rail */
  function par(o) {
    const els = [];
    edge([L, B], [L, T], [{ t: "bat", id: "B1", v: o.V ?? 12, label: T2("מקור", "Source"), show: "v", rev: true }], els);
    const xs = o.branches.map((b) => b.x);
    let px = L;
    const topBreak = [];
    xs.forEach((x, i) => {
      const spec = i === 0 && o.mainAm ? [{ t: "am", id: "A0", label: T2("I כולל", "I total"), at: 0.5 }] : [];
      edge([px, T], [x, T], spec, els); edge([x, B], [px, B], [], els); px = x;
    });
    o.branches.forEach((b) => edge([b.x, T], [b.x, B], b.parts, els));
    return { kind: "circuit", view: [600, 340], els, controls: o.controls || [], readouts: o.readouts || [] };
  }

  const R = (id, r, extra) => Object.assign({ t: "R", id, r, label: id, show: "r" }, extra || {});
  const lamp = (id, r, extra) => Object.assign({ t: "lamp", id, r, pnom: 1, label: T2("נורה", "Lamp") }, extra || {});
  const sw = (id, on, extra) => Object.assign({ t: "sw", id, on, label: id }, extra || {});
  const am = (id, extra) => Object.assign({ t: "am", id, label: T2("מד זרם", "Ammeter") }, extra || {});

  /* ---------------- reusable widget specs ---------------- */
  const W = {
    charge: () => ({ kind: "charge" }),
    flow: (view) => ({ kind: "flow", V: 3, view: view || "conv" }),
    prefixA: () => ({ kind: "prefix", unit: "A", minExp: -6, maxExp: 0, value: 0.001, label: T2("זרם", "Current") }),
    lampLoop: (on) => loop({ V: 9, top: [sw("S1", !!on)], right: [lamp("L1", 81, { ls: -1 })], readouts: [{ label: T2("זרם", "Current"), expr: "w.I('B1')", unit: "A" }] }),
    lampLoopV: () => loop({ V: 6, top: [sw("S1", true)], right: [lamp("L1", 36, { ls: -1, pnom: 2 })],
      controls: [{ label: T2("מתח המקור", "Source voltage"), el: "B1", prop: "v", min: 0, max: 12, step: 0.5, unit: "V" }],
      readouts: [{ label: T2("זרם", "Current"), expr: "w.I('B1')", unit: "A" }] }),
    openLoop: () => loop({ V: 9, top: [sw("S1", false, { vm: { id: "VS", label: T2("מד מתח", "Voltmeter"), side: 1 } })], right: [lamp("L1", 81, { ls: -1 })],
      readouts: [{ label: T2("זרם", "Current"), expr: "w.I('B1')", unit: "A" }, { label: T2("מתח על המתג", "Voltage across switch"), expr: "Math.abs(w.V('VS'))", unit: "V" }] }),
    shortLoop: (s2) => loop({ V: 9, top: [sw("S1", true)], right: [lamp("L1", 81, { ls: -1 })],
      extra: [{ t: "sw", id: "S2", on: !!s2, label: T2("קצר", "Short"), p: [[RX, T], [RX + 60, T], [RX + 60, B], [RX, B]] }],
      readouts: [{ label: T2("זרם במקור", "Source current"), expr: "w.I('B1')", unit: "A" }, { label: T2("זרם בנורה", "Lamp current"), expr: "Math.abs(w.I('L1'))", unit: "A" }] }),
    groundLoop: () => loop({ V: 9, gnd: true, top: [sw("S1", true)], right: [lamp("L1", 81, { ls: -1 })],
      nodes: [{ at: [RX, T], text: T2("צומת עליון", "Top node"), dx: -110, dy: -14 }, { at: [L, T], text: "", dx: 10, dy: -14 }, { at: [RX, B], text: T2("צומת תחתון", "Bottom node"), dx: -110, dy: 26 }] }),
    puzzle: () => loop({ V: 9, top: [sw("S1", false)], right: [lamp("L1", 81, { ls: -1 })], bottom: [sw("S3", false)],
      extra: [{ t: "sw", id: "S2", on: true, label: "S2", p: [[RX, T], [RX + 60, T], [RX + 60, B], [RX, B]] }],
      readouts: [{ label: T2("זרם במקור", "Source current"), expr: "w.I('B1')", unit: "A" }] }),
    ohm: (o = {}) => loop({ V: o.V ?? 10, top: [am("A1", { hideVal: !!o.hideI })], right: [R("R1", o.R ?? 1000, { label: T2("נגד", "Resistor"), ls: -1 })],
      controls: [o.fixV ? null : { label: T2("מתח V", "Voltage V"), el: "B1", prop: "v", min: 0, max: 12, step: 0.5, unit: "V" },
        { label: T2("התנגדות R", "Resistance R"), el: "R1", prop: "r", min: 100, max: 20000, step: 100, log: true, unit: "Ω" }].filter(Boolean),
      readouts: [{ label: "V", expr: "w.param('B1','v')", unit: "V" }, { label: "R", expr: "w.param('R1','r')", unit: "Ω" },
        { label: "I", expr: "w.I('R1')", unit: "A", hidden: !!o.hideI }] }),
    pipe: () => loop({ V: 10, top: [am("A1")], right: [R("R1", 2000, { label: T2("התנגדות", "Resistance"), ls: -1 })],
      controls: [{ label: T2("התנגדות R", "Resistance R"), el: "R1", prop: "r", min: 200, max: 20000, step: 100, log: true, unit: "Ω" }],
      readouts: [{ label: T2("זרם", "Current"), expr: "w.I('R1')", unit: "A" }] }),
    power: () => loop({ V: 6, top: [sw("S1", true)], right: [lamp("L1", 36, { ls: -1, pnom: 4, show: "P" })],
      controls: [{ label: T2("מתח המקור", "Source voltage"), el: "B1", prop: "v", min: 0, max: 12, step: 0.5, unit: "V" }],
      readouts: [{ label: "V", expr: "w.param('B1','v')", unit: "V" }, { label: "I", expr: "w.I('L1')", unit: "A" }, { label: "P = V·I", expr: "w.P('L1')", unit: "W" }] }),
    energy: () => loop({ V: 12, top: [sw("S1", true)], right: [lamp("L1", 36, { ls: -1, pnom: 4, show: "P" })],
      controls: [{ label: T2("מתח המקור", "Source voltage"), el: "B1", prop: "v", min: 0, max: 12, step: 0.5, unit: "V" }, { type: "button", label: T2("אפס את מונה האנרגיה", "Reset the energy counter"), action: "resetE" }],
      readouts: [{ label: "P", expr: "w.P('L1')", unit: "W" }, { label: T2("E מצטברת", "E total"), expr: "w.E('L1')", unit: "J", digits: 1 }] }),
    series: () => loop({ V: 12, top: [R("R1", 2000, { vm: { id: "V1", label: "V1", side: 1 } })], right: [R("R2", 4000, { ls: -1, vm: { id: "V2", label: "V2", side: 1 } })], bottom: [am("A1")],
      controls: [{ label: "R1", el: "R1", prop: "r", min: 500, max: 10000, step: 100, log: true, unit: "Ω" }, { label: "R2", el: "R2", prop: "r", min: 500, max: 10000, step: 100, log: true, unit: "Ω" }],
      readouts: [{ label: "V1", expr: "Math.abs(w.V('R1'))", unit: "V" }, { label: "V2", expr: "Math.abs(w.V('R2'))", unit: "V" }, { label: "V1+V2", expr: "Math.abs(w.V('R1'))+Math.abs(w.V('R2'))", unit: "V" }, { label: "I", expr: "w.I('B1')", unit: "A" }] }),
    parallel: () => par({ V: 12, mainAm: true, branches: [{ x: 330, parts: [am("A1", { label: "I1", ls: -1 }), R("R1", 2000, { ls: -1 })] }, { x: 500, parts: [am("A2", { label: "I2", ls: -1 }), R("R2", 2000, { ls: -1 })] }],
      controls: [{ label: "R1", el: "R1", prop: "r", min: 500, max: 10000, step: 100, log: true, unit: "Ω" }, { label: "R2", el: "R2", prop: "r", min: 500, max: 10000, step: 100, log: true, unit: "Ω" }],
      readouts: [{ label: "I1", expr: "Math.abs(w.I('R1'))", unit: "A" }, { label: "I2", expr: "Math.abs(w.I('R2'))", unit: "A" }, { label: T2("I כולל", "I total"), expr: "w.I('B1')", unit: "A" }, { label: "I1+I2", expr: "Math.abs(w.I('R1'))+Math.abs(w.I('R2'))", unit: "A" }] }),
    divider: (o = {}) => loop({ V: 12, rightBreaks: [(T + B) / 2], right: [R("R1", o.R1 ?? 10000, { ls: -1 }), R("R2", o.R2 ?? 10000, { ls: -1, vm: { id: "VO", label: "V_out", side: 1, hideVal: !!o.hide } })],
      nodes: [{ at: [RX, (T + B) / 2], text: "V_out", dx: 12, dy: 4, hideVal: !!o.hide }],
      controls: [o.fixR1 ? null : { label: "R1", el: "R1", prop: "r", min: 1000, max: 50000, step: 500, log: true, unit: "Ω" }, { label: "R2", el: "R2", prop: "r", min: 1000, max: 50000, step: 500, log: true, unit: "Ω" }].filter(Boolean),
      readouts: [{ label: "V_in", expr: "w.param('B1','v')", unit: "V" }, { label: "V_out", expr: "Math.abs(w.V('R2'))", unit: "V", hidden: !!o.hide }] }),
    pot: () => {
      const els = [];
      edge([L, B], [L, T], [{ t: "bat", id: "B1", v: 12, label: T2("מקור", "Source"), show: "v", rev: true }], els);
      edge([L, T], [RX, T], [], els);
      edge([RX, B], [L, B], [], els, [380]);
      els.push({ t: "pot", id: "P1", r: 10000, pos: 0.5, label: T2("פוטנציומטר", "Potentiometer"), ls: -1, p: [[RX, T], [RX, B]], w: [440, (T + B) / 2] });
      els.push({ t: "w", id: "ww1", p: [[440, (T + B) / 2], [380, (T + B) / 2]] });
      els.push({ t: "vm", id: "VW", label: T2("מתח בגררה", "Wiper voltage"), ls: -1, p: [[380, (T + B) / 2], [380, B]] });
      return { kind: "circuit", view: [600, 340], els,
        controls: [{ label: T2("מיקום הגררה", "Wiper position"), el: "P1", prop: "pos", min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + "%" }],
        readouts: [{ label: "V_in", expr: "w.param('B1','v')", unit: "V" }, { label: T2("מתח בגררה", "Wiper voltage"), expr: "w.V('P1')", unit: "V" }] };
    },
  };

  /* ---------------- levels ---------------- */
  const levels = [
    {
      id: "0-1", world: 0, level: 1,
      goal: "להבין מה זורם בחוט, מה דוחף אותו ואיך מודדים את שניהם.",
      demo: [
        { t: "הכול מתחיל ב[[charge|מטען חשמלי]]. לחומר יכול להיות מטען חיובי (+) או שלילי (−). לחצו על הכדורים: מטענים הפוכים נמשכים, מטענים זהים נדחים.", w: W.charge() },
        { t: "בתוך מתכת יש [[electron|אלקטרונים]] חופשיים. כשהם נעים יחד לאורך החוט, נוצר [[current|זרם חשמלי]]. ה[[voltage|מתח]] הוא ה\"דחיפה\" בין הצד החיובי לשלילי. הזיזו את המתח וראו את החלקיקים מאיצים.", w: W.flow() },
        { t: "[[ammeter|מד הזרם]] (העיגול עם A) נמצא בתוך המסלול, וכל הזרם עובר דרכו. [[voltmeter|מד המתח]] (העיגול עם V) מחובר בין שני הצדדים ומודד את הדחיפה ביניהם.", w: W.flow() },
        { t: "מוסכמה חשובה: [[conventional_current|הזרם הקונבנציונלי]] מסומן מ-(+) אל (−), למרות שהאלקטרונים עצמם נעים הפוך. לחצו על הכפתור כדי להחליף תצוגה.", w: W.flow() },
        { t: "ערכים חשמליים יכולים להיות זעירים מאוד. לכן משתמשים ב[[si_prefix|קידומות]]: m (מילי) = אלפית, µ (מיקרו) = מיליונית. 0.005 A הם 5 mA. הזיזו את הסליידר ושימו לב איך הקידומת מתחלפת.", w: W.prefixA() },
      ],
      guided: [
        { t: "הגדילו את המתח עד ש[[ammeter|מד הזרם]] יראה 6 mA.", hint: "הזרם עולה יחד עם המתח. נסו בערך באמצע הסליידר.", w: W.flow(), done: "near(w.get('I'), 0.006, 0.01)", ok: "מתח גדול יותר דוחף יותר מטען בכל שנייה, ולכן הזרם גדל." },
        { t: "החליפו לתצוגת ה[[electron|אלקטרונים]]. לאיזה כיוון הם נעים?", hint: "לחצו על הכפתור שמתחת לשרטוט.", done: "w.get('view') === 'elec'", ok: "האלקטרונים נעים מ-(−) אל (+), הפוך לכיוון [[conventional_current|הזרם הקונבנציונלי]]." },
        { t: "סדרו את שני ה[[charge|מטענים]] כך שיידחו זה מזה.", hint: "מטענים זהים נדחים. לחצו על כדור כדי להפוך את הסימן שלו.", w: W.charge(), done: "w.get('attract') === false", ok: "שני מטענים זהים (שניהם + או שניהם −) תמיד נדחים." },
        { t: "הזיזו את הסליידר עד שיוצג זרם של 4.7 mA.", hint: "4.7 mA זה 0.0047 A. חפשו את השורה m בטבלה.", w: W.prefixA(), done: "near(w.get('value'), 0.0047, 0.01)", ok: "4.7 mA = 0.0047 A. הקידומת חוסכת לכתוב אפסים." },
      ],
      challenge: { t: "[[ammeter|מד זרם]] מראה 0.025 A. כמה זה ב-mA?", type: "number", answer: 25, tol: 0.001, unit: "mA", w: W.prefixA() },
      quiz: [
        { q: "מה קורה לשני מטענים שליליים קרובים?", o: ["נמשכים", "נדחים", "לא קורה כלום"], a: 1, x: "מטענים זהים נדחים." },
        { q: "מה יוצר זרם חשמלי במתכת?", o: ["תנועה של אלקטרונים", "חום", "צבע החוט"], a: 0, x: "זרם הוא תנועת מטען, ובמתכת המטען שנע הוא האלקטרונים." },
        { q: "איך מחברים מד זרם?", o: ["בין שתי נקודות, מבחוץ", "בתוך המסלול, כך שהזרם עובר דרכו", "לא משנה איך"], a: 1, x: "מד זרם חייב להיות בתוך המסלול, כמו מד מים בצינור." },
        { q: "בכיוון הזרם הקונבנציונלי, הזרם זורם…", o: ["מ-(−) אל (+)", "מ-(+) אל (−)", "בשני הכיוונים"], a: 1, x: "המוסכמה: מ-(+) אל (−), הפוך לתנועת האלקטרונים." },
        { q: "כמה זה 2 mA באמפר?", o: ["0.2 A", "0.02 A", "0.002 A"], a: 2, x: "m = אלפית: 2 mA = 2/1000 A = 0.002 A." },
      ],
    },
    {
      id: "0-2", world: 0, level: 2,
      goal: "לבנות מעגל סגור, להבין מתג, נתק, קצר, צומת ואדמה.",
      demo: [
        { t: "ל[[voltage_source|מקור מתח]], כמו סוללה, יש שני [[terminal|הדקים]]: חיובי (+) ושלילי (−). הוא שומר על מתח קבוע ביניהם.", w: W.lampLoopV() },
        { t: "ה[[lamp|נורה]] היא [[load|עומס]]: היא צורכת חשמל מהמקור והופכת אותו לאור. הגבירו את המתח וראו אותה מאירה חזק יותר.", w: W.lampLoopV() },
        { t: "זרם זורם רק ב[[circuit|מעגל סגור]]: מסלול רציף מההדק החיובי, דרך העומס, וחזרה להדק השלילי. ה[[switch|מתג]] פותח וסוגר את המסלול. לחצו עליו.", w: W.lampLoop(false) },
        { t: "כשהמתג פתוח יש [[open_circuit|נתק]]: אין זרם, אבל מד המתח מראה את כל מתח המקור על נקודת הנתק.", w: W.openLoop() },
        { t: "[[short_circuit|קצר]] הוא חיבור ישיר בחוט, בלי רכיב באמצע. לחצו על מתג הקצר: הזרם במקור מזנק, והנורה כבה כי הזרם עוקף אותה.", w: W.shortLoop(false) },
        { t: "[[node|צומת]] היא נקודה שבה מתחברים רכיבים. לכל הנקודות בצומת יש אותו מתח. את המתחים מודדים יחסית ל[[ground|אדמה]], הצומת שמוגדר 0 V.", w: W.groundLoop() },
      ],
      guided: [
        { t: "סגרו את ה[[switch|מתג]] והדליקו את ה[[lamp|נורה]].", hint: "לחצו על המתג S1 בשרטוט.", w: W.lampLoop(false), done: "w.on('S1') && w.P('L1') > 0.5", ok: "המסלול נסגר, הזרם זורם והנורה דולקת." },
        { t: "פתחו את המתג ובדקו מה מראה מד המתח עליו.", hint: "לחצו שוב על המתג.", w: Object.assign(W.openLoop(), {}), done: "!w.on('S1') && w.changed('S1') > 0", ok: "ב[[open_circuit|נתק]] הזרם אפס, אבל כל מתח המקור מופיע על נקודת הנתק." },
        { t: "סגרו את המתג וחזרו לנורה דולקת, ואז סגרו גם את מתג הקצר.", hint: "קודם S1, ואחר כך מתג הקצר בצד ימין.", w: W.shortLoop(false), done: "w.on('S1') && w.on('S2')", ok: "[[short_circuit|קצר]]: הזרם עוקף את הנורה, והזרם במקור קפץ לערך גבוה ומסוכן." },
        { t: "בדקו את מתחי ה[[node|צמתים]]: הצומת העליון ב-9 V והתחתון ב-0 V. פתחו וסגרו את המתג וראו מה משתנה.", hint: "לחצו על S1 פעמיים.", w: W.groundLoop(), done: "w.changed('S1') >= 2", ok: "המתחים נמדדים תמיד יחסית ל[[ground|אדמה]]." },
      ],
      challenge: { t: "הדליקו את הנורה בלי שיהיה [[short_circuit|קצר]] במעגל.", type: "reach", w: W.puzzle(), done: "w.P('L1') > 0.5 && !w.on('S2')" },
      quiz: [
        { q: "למה הנורה לא דולקת כשהמתג פתוח?", o: ["כי אין מתח במקור", "כי אין מסלול סגור לזרם", "כי הנורה שבורה"], a: 1, x: "זרם זורם רק במעגל סגור." },
        { q: "מה מראה מד מתח על מתג פתוח?", o: ["0 V", "את כל מתח המקור", "חצי מהמתח"], a: 1, x: "בנתק אין זרם, אבל כל המתח נופל על נקודת הנתק." },
        { q: "מה קורה בקצר?", o: ["הזרם יורד לאפס", "הזרם עולה מאוד", "המתח של המקור מוכפל"], a: 1, x: "בלי רכיב שמגביל, הזרם מזנק ועלול לגרום נזק." },
        { q: "מה המתח של האדמה?", o: ["0 V, בהגדרה", "תמיד 9 V", "תלוי במזג האוויר"], a: 0, x: "האדמה היא נקודת הייחוס: 0 V." },
        { q: "מה זה עומס?", o: ["רכיב שצורך חשמל מהמקור", "חוט ארוך", "המתח של הסוללה"], a: 0, x: "עומס צורך חשמל ועושה איתו משהו, כמו נורה." },
      ],
    },
    {
      id: "0-3", world: 0, level: 3,
      goal: "להבין התנגדות, נגד, ואת חוק אוהם V = I·R.",
      demo: [
        { t: "[[resistance|התנגדות]] היא כמה חומר \"מתנגד\" למעבר זרם, כמו צינור צר מול צינור רחב. הגדילו את ההתנגדות וראו את הזרם יורד.", w: W.pipe() },
        { t: "[[resistor|נגד]] הוא רכיב עם התנגדות ידועה, ביחידות אוהם (Ω). הוא משמש להגבלת זרם.", w: W.pipe() },
        { t: "[[ohms_law|חוק אוהם]]: V = I·R. מתח גדול → יותר זרם. התנגדות גדולה → פחות זרם. בדקו: I = V / R.", w: W.ohm() },
      ],
      guided: [
        { t: "כוונו V = 10 V ו-R = 1 kΩ. מה הזרם?", hint: "הזיזו את שני הסליידרים. 1 kΩ = 1000 Ω.", w: W.ohm({ V: 5, R: 3000 }), done: "near(w.param('B1','v'), 10, 0.01) && near(w.param('R1','r'), 1000, 0.03)", ok: "I = V/R = 10 / 1000 = 0.01 A = 10 mA." },
        { t: "עכשיו הכפילו את R ל-2 kΩ. מה קרה לזרם?", hint: "הזיזו רק את סליידר ההתנגדות.", done: "near(w.param('R1','r'), 2000, 0.03)", ok: "התנגדות כפולה → זרם חצי: 5 mA." },
        { t: "מצאו R כך שהזרם יהיה 2 mA, כשהמתח 10 V.", hint: "R = V / I = 10 / 0.002.", done: "near(w.I('R1'), 0.002, 0.03)", ok: "R = 10 / 0.002 = 5000 Ω = 5 kΩ." },
      ],
      challenge: { t: "המתח 12 V. כוונו את R כך שהזרם יהיה 3 mA. מד הזרם מוסתר, אז חשבו לפי [[ohms_law|חוק אוהם]] ולחצו \"בדוק\".", type: "reach", w: W.ohm({ V: 12, R: 1000, fixV: true, hideI: true }), done: "near(w.I('R1'), 0.003, 0.025)" },
      quiz: [
        { q: "לפי חוק אוהם, מה הזרם כש-V = 6 V ו-R = 2 kΩ?", o: ["3 mA", "12 mA", "0.3 mA"], a: 0, x: "I = 6 / 2000 = 0.003 A = 3 mA." },
        { q: "מה קורה לזרם כשמגדילים את ההתנגדות (מתח קבוע)?", o: ["גדל", "קטן", "לא משתנה"], a: 1, x: "I = V/R: R גדול → I קטן." },
        { q: "מה היחידה של התנגדות?", o: ["וולט (V)", "אמפר (A)", "אוהם (Ω)"], a: 2, x: "התנגדות נמדדת באוהם." },
        { q: "זרם 2 mA עובר בנגד 5 kΩ. מה המתח עליו?", o: ["10 V", "2.5 V", "7 V"], a: 0, x: "V = I·R = 0.002 · 5000 = 10 V." },
        { q: "למה משמש נגד?", o: ["להגביל זרם", "לייצר מתח", "לאגור אור"], a: 0, x: "נגד מגביל את הזרם במעגל." },
      ],
    },
    {
      id: "0-4", world: 0, level: 4,
      goal: "להבין הספק (כמה מהר צורכים אנרגיה) ואנרגיה (כמה נצרך בסך הכול).",
      demo: [
        { t: "[[power|הספק]] הוא קצב צריכת האנרגיה: P = V·I, ביחידות וואט (W). ככל שההספק גדל, הנורה מאירה חזק יותר.", w: W.power() },
        { t: "[[energy|אנרגיה]] היא הספק כפול זמן: E = P·t, ביחידות ג'אול (J). שימו לב למונה שמצטבר כל עוד הנורה דולקת.", w: W.energy() },
      ],
      guided: [
        { t: "כוונו את המתח כך שהנורה תצרוך הספק של 1 W.", hint: "P = V·I. נסו מתח של בערך חצי מהסקאלה.", w: W.power(), done: "near(w.P('L1'), 1, 0.05)", ok: "ב-6 V עובר זרם של 1/6 A, ו-P = 6 · 1/6 = 1 W." },
        { t: "הגבירו ל-12 V. פי כמה גדל ההספק?", hint: "הזיזו את הסליידר לסוף.", done: "near(w.param('B1','v'), 12, 0.01)", ok: "פי 4! מתח כפול נותן גם זרם כפול, ו-P = V·I גדל פי 2·2." },
        { t: "אפסו את המונה ותנו לנורה לצבור 20 J של אנרגיה.", hint: "לחצו \"אפס\" וחכו כמה שניות. ב-4 W זה לוקח 5 שניות.", w: W.energy(), done: "w.E('L1') >= 20", ok: "E = P·t: ‏4 W במשך 5 s = 20 J." },
      ],
      challenge: { t: "בנגד של 100 Ω עובר זרם של 0.2 A. מה ה[[power|הספק]] בוואט?", type: "number", answer: 4, tol: 0.001, unit: "W", hint: "P = V·I, ולפי חוק אוהם V = I·R." },
      quiz: [
        { q: "מה הנוסחה להספק?", o: ["P = V·I", "P = V/I", "P = V + I"], a: 0, x: "הספק = מתח כפול זרם." },
        { q: "מקור 12 V מספק 0.5 A. מה ההספק?", o: ["24 W", "6 W", "12.5 W"], a: 1, x: "P = 12 · 0.5 = 6 W." },
        { q: "מה היחידה של אנרגיה?", o: ["וואט (W)", "ג'אול (J)", "אוהם (Ω)"], a: 1, x: "אנרגיה נמדדת בג'אול; הספק בוואט." },
        { q: "נורה של 10 W דולקת 3 שניות. כמה אנרגיה צרכה?", o: ["30 J", "3.3 J", "13 J"], a: 0, x: "E = P·t = 10 · 3 = 30 J." },
        { q: "לאן הולך ההספק בנגד?", o: ["הופך לחום", "חוזר לסוללה", "נעלם"], a: 0, x: "בנגד האנרגיה החשמלית הופכת לחום." },
      ],
    },
    {
      id: "0-5", world: 0, level: 5,
      goal: "לחבר רכיבים בטור ובמקביל, ולהכיר את שני חוקי קירכהוף.",
      demo: [
        { t: "ב[[series|חיבור טורי]] הרכיבים אחד אחרי השני במסלול אחד: אותו זרם עובר בכולם, וההתנגדויות מתחברות: R = R1 + R2.", w: W.series() },
        { t: "[[kvl|חוק המתחים של קירכהוף]]: סכום המתחים על הרכיבים בלולאה שווה למתח המקור. שנו את הנגדים: V1 + V2 נשאר 12 V.", w: W.series() },
        { t: "ב[[parallel|חיבור מקבילי]] הרכיבים מחוברים לאותם שני צמתים: לכולם אותו מתח, והזרם מתפצל ביניהם.", w: W.parallel() },
        { t: "[[kcl|חוק הזרמים של קירכהוף]]: הזרם שנכנס לצומת שווה לזרם שיוצא ממנו. הזרם הכולל = I1 + I2.", w: W.parallel() },
      ],
      guided: [
        { t: "שנו את R2 כמה פעמים ובדקו ש-V1 + V2 נשאר 12 V.", hint: "הזיזו את סליידר R2 קדימה ואחורה.", w: W.series(), done: "w.changed('R2') >= 3", ok: "לא משנה מה הנגדים, סכום המתחים שווה למתח המקור." },
        { t: "כוונו את R2 כך שהמתח עליו יהיה שווה למתח על R1.", hint: "כשהנגדים שווים, המתח מתחלק שווה בשווה.", done: "near(Math.abs(w.V('R2')), Math.abs(w.V('R1')), 0.03)", ok: "נגדים שווים בטור → על כל אחד נופל חצי מהמתח." },
        { t: "בחיבור מקבילי: כוונו את R2 כך שהזרם בו יהיה חצי מהזרם ב-R1.", hint: "אותו מתח על שניהם, אז התנגדות כפולה → חצי זרם.", w: W.parallel(), done: "near(Math.abs(w.I('R2')), Math.abs(w.I('R1')) / 2, 0.04)", ok: "R2 = 2·R1, ולכן I2 = I1/2." },
        { t: "שנו את R1 ובדקו שהזרם הכולל שווה תמיד ל-I1 + I2.", hint: "הזיזו את סליידר R1.", done: "w.changed('R1') >= 2", ok: "זה [[kcl|חוק הזרמים]]: מטען לא נעלם בצומת." },
      ],
      challenge: { t: "R1 = 2 kΩ ו-R2 = 3 kΩ מחוברים ב[[series|טור]]. מה ההתנגדות השקולה, בקילו-אוהם?", type: "number", answer: 5, tol: 0.001, unit: "kΩ" },
      quiz: [
        { q: "בחיבור טורי, מה שווה בכל הרכיבים?", o: ["המתח", "הזרם", "ההספק"], a: 1, x: "במסלול יחיד אותו זרם עובר בכולם." },
        { q: "בחיבור מקבילי, מה שווה בכל הענפים?", o: ["המתח", "הזרם", "ההתנגדות"], a: 0, x: "כל הענפים מחוברים לאותם שני צמתים, ולכן אותו מתח." },
        { q: "מקור 9 V, ועל נגד אחד בטור יש 4 V. כמה על השני?", o: ["4 V", "5 V", "13 V"], a: 1, x: "לפי KVL: 9 − 4 = 5 V." },
        { q: "לצומת נכנסים 10 mA. בענף אחד יוצאים 6 mA. כמה בשני?", o: ["4 mA", "16 mA", "6 mA"], a: 0, x: "לפי KCL: 10 − 6 = 4 mA." },
        { q: "מה קורה לזרם הכולל כשמוסיפים עוד ענף במקביל?", o: ["גדל", "קטן", "לא משתנה"], a: 0, x: "עוד ענף = עוד מסלול לזרם, והזרם הכולל גדל." },
      ],
    },
    {
      id: "0-6", world: 0, level: 6,
      goal: "לבנות מחלק מתח ולשלוט במתח בעזרת פוטנציומטר.",
      demo: [
        { t: "[[voltage_divider|מחלק מתח]]: שני נגדים בטור. המתח בצומת שביניהם הוא חלק קבוע ממתח המקור: V_out = V_in·R2/(R1+R2).", w: W.divider() },
        { t: "[[potentiometer|פוטנציומטר]] הוא מחלק מתח שאפשר לשנות: נגד עם גררה נעה. הזיזו את הגררה והמתח בה משתנה בין 0 ל-12 V.", w: W.pot() },
      ],
      guided: [
        { t: "כוונו את הנגדים כך ש-V_out יהיה חצי מ-V_in.", hint: "נגדים שווים → חצי.", w: W.divider({ R1: 10000, R2: 30000 }), done: "near(Math.abs(w.V('R2')), 6, 0.03)", ok: "R1 = R2 → V_out = 12 · ½ = 6 V." },
        { t: "עכשיו כוונו ל-V_out = 3 V.", hint: "צריך R2/(R1+R2) = ¼, כלומר R1 = 3·R2.", done: "near(Math.abs(w.V('R2')), 3, 0.03)", ok: "למשל R1 = 30 kΩ ו-R2 = 10 kΩ: ‏12 · 10/40 = 3 V." },
        { t: "הזיזו את גררת הפוטנציומטר עד שהמתח בה יהיה 9 V.", hint: "9 V זה ¾ מ-12 V.", w: W.pot(), done: "near(w.V('P1'), 9, 0.03)", ok: "הגררה ב-75% → ‏75% מהמתח: 9 V." },
      ],
      challenge: { t: "V_in = 12 V ו-R1 = 10 kΩ קבוע. בחרו R2 כך ש-V_out = 4 V. המתח מוסתר, אז חשבו ולחצו \"בדוק\".", type: "reach", w: W.divider({ R1: 10000, R2: 20000, fixR1: true, hide: true }), done: "near(Math.abs(w.V('R2')), 4, 0.03)" },
      quiz: [
        { q: "R1 = R2 במחלק מתח של 10 V. מה V_out?", o: ["10 V", "5 V", "2.5 V"], a: 1, x: "נגדים שווים → המתח מתחלק חצי-חצי." },
        { q: "מה קורה ל-V_out כשמגדילים את R2 (R1 קבוע)?", o: ["עולה", "יורד", "לא משתנה"], a: 0, x: "V_out = V_in·R2/(R1+R2): R2 גדל → החלק שלו גדל." },
        { q: "מה זה פוטנציומטר?", o: ["מחלק מתח שאפשר לשנות", "סוללה קטנה", "מד זרם"], a: 0, x: "נגד עם גררה נעה שמשנה את מתח המוצא." },
        { q: "V_in = 12 V, ‏R1 = 20 kΩ, ‏R2 = 10 kΩ. מה V_out?", o: ["4 V", "8 V", "6 V"], a: 0, x: "12 · 10/30 = 4 V." },
        { q: "הגררה של פוטנציומטר על 12 V נמצאת ב-25%. מה המתח בה?", o: ["3 V", "9 V", "25 V"], a: 0, x: "‏25% מ-12 V = 3 V." },
      ],
    },
  ];

  /* ---------------- concept demos (every concept of this world must have one) ---------------- */
  const demos = {
    charge: W.charge(), electron: W.flow("elec"), current: W.flow(), voltage: W.flow(), conventional_current: W.flow(),
    ammeter: W.flow(), voltmeter: W.flow(), si_prefix: W.prefixA(),
    terminal: W.lampLoopV(), voltage_source: W.lampLoopV(), lamp: W.lampLoopV(), load: W.lampLoopV(), circuit: W.lampLoop(false),
    switch: W.lampLoop(false), open_circuit: W.openLoop(), short_circuit: W.shortLoop(false), node: W.groundLoop(), ground: W.groundLoop(),
    resistance: W.pipe(), resistor: W.pipe(), ohms_law: W.ohm(),
    power: W.power(), energy: W.energy(),
    series: W.series(), kvl: W.series(), parallel: W.parallel(), kcl: W.parallel(),
    voltage_divider: W.divider(), potentiometer: W.pot(),
  };

  (window.CR_WORLDS = window.CR_WORLDS || {})[0] = { levels, demos };
})();
