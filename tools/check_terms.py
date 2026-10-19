# Checks that no card text uses a term before the level that introduces it.
# A term counts as introduced if any concept at an earlier position (or in the same level) has that name.
import json, re, sys
C = json.load(open(__import__("os").path.join(__import__("os").path.dirname(__file__),"..","data","concepts.json"), encoding="utf-8"))["concepts"]
EVERYDAY = {"zero", "counter", "pole"}   # Hebrew names that are also everyday words (אפס, מונה, קוטב)
PFX = r"(?<![א-ת])[הובלמכש]?"
def keys(d):
    k = [d["he"]]
    if re.fullmatch(r"[A-Za-z]{2,6}", d["symbol"] or ""): k.append(d["symbol"])
    return k
problems = []
for i, c in enumerate(C):
    text = c["definition"] + " " + c["demo"]
    known = [x["he"] for x in C[:i+1]] + [x["he"] for x in C if (x["world"], x["level"]) == (c["world"], c["level"])]
    for d in C[i+1:]:
        if d["id"] in EVERYDAY or (d["world"], d["level"]) == (c["world"], c["level"]): continue
        for k in keys(d):
            if re.search(PFX + re.escape(k) + r"(?![א-ת])", text) and not any(k in h for h in known):
                problems.append(f"{c['id']} (W{c['world']}L{c['level']}) uses '{k}' before {d['id']} (W{d['world']}L{d['level']})")
print("\n".join(problems) if problems else "OK: no term is used before it is introduced")
sys.exit(1 if problems else 0)
