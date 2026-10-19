# Checks level content (js/world*.js) against the concept registry:
#  1. every [[id]] term exists and is introduced at or before the level that uses it
#  2. no unmarked name of a later concept appears in level text
#  3. every concept of a level is taught (marked) in that level's demo slides
#  4. every concept of a playable world has a live demo
import json, os, re, subprocess, sys
ROOT = os.path.join(os.path.dirname(__file__), "..")
data = json.load(open(os.path.join(ROOT, "data", "concepts.json"), encoding="utf-8"))
C = {c["id"]: c for c in data["concepts"]}
order = [c["id"] for c in data["concepts"]]
rank = lambda c: c["world"] * 100 + c["level"]
EVERYDAY = {"zero", "counter", "pole"}

files = sorted(f for f in os.listdir(os.path.join(ROOT, "js")) if re.fullmatch(r"world\d+\.js", f))
js = "global.window={};" + "".join(f"require({json.dumps(os.path.join(ROOT, 'js', f))});" for f in files) + \
     "const o={};for(const k in window.CR_WORLDS){const w=window.CR_WORLDS[k];o[k]={levels:w.levels.map(l=>JSON.parse(JSON.stringify(l,(key,v)=>key==='w'?undefined:v))),demos:Object.keys(w.demos)}};console.log(JSON.stringify(o));"
worlds = json.loads(subprocess.check_output(["node", "-e", js]))

def texts(lv):
    out = [("demo", d["t"]) for d in lv["demo"]]
    for g in lv["guided"]:
        out += [("guided", g.get("t", "")), ("guided", g.get("hint", "")), ("guided", g.get("ok", ""))]
    ch = lv["challenge"]; out += [("challenge", ch.get("t", "")), ("challenge", ch.get("hint", ""))]
    for q in lv["quiz"]:
        out += [("quiz", q["q"]), ("quiz", q.get("x", ""))] + [("quiz", o) for o in q["o"]]
    out.append(("goal", lv.get("goal", "")))
    return out

problems = []
for wid, w in worlds.items():
    wid = int(wid)
    for lv in w["levels"]:
        r = lv["world"] * 100 + lv["level"]
        here = [c for c in data["concepts"] if c["world"] == lv["world"] and c["level"] == lv["level"]]
        taught = set()
        for kind, t in texts(lv):
            for cid in re.findall(r"\[\[([a-z0-9_]+)", t):
                if cid not in C: problems.append(f"{lv['id']}: unknown concept [[{cid}]]"); continue
                if rank(C[cid]) > r: problems.append(f"{lv['id']}: [[{cid}]] used before its level (W{C[cid]['world']}L{C[cid]['level']})")
                if kind == "demo": taught.add(cid)
            plain = re.sub(r"\[\[[^\]]+\]\]", " ", t)
            for c in data["concepts"]:
                if c["id"] in EVERYDAY or rank(c) <= r: continue
                if re.search(r"(?<![א-ת])[הובלמכש]?" + re.escape(c["he"]) + r"(?![א-ת])", plain):
                    problems.append(f"{lv['id']} ({kind}): uses '{c['he']}' before it is taught (W{c['world']}L{c['level']})")
        for c in here:
            if c["id"] not in taught: problems.append(f"{lv['id']}: concept '{c['id']}' is never introduced in the demo slides")
    for c in data["concepts"]:
        if c["world"] == wid and c["id"] not in w["demos"]: problems.append(f"world {wid}: concept '{c['id']}' has no live demo")

print("\n".join(problems) if problems else f"OK: level texts of {len(worlds)} world(s) follow the teaching rules")
sys.exit(1 if problems else 0)
