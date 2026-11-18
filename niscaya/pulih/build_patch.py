#!/usr/bin/env python3
# Membuat patches/0043-pulih-otomatis.py dari pulih/pulih.js
import json, os
D = os.path.dirname(os.path.abspath(__file__))
js = open(os.path.join(D, "pulih.js"), encoding="utf-8").read().strip()
assert "</script" not in js.lower()
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0043: (1) bersihkan baris ganda "const _kom" / "r.komisi" hasil 0024<->0040 yang membuat aplikasi macet,
# (2) skrip pemulihan otomatis di <head> (muat ulang tanpa cache bila menu kosong / SyntaxError). Idempoten.
import sys, json, re
path = sys.argv[1]
JS = json.loads(__JS__)
VER = JS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
orig = src
K = "const _kom = (typeof nmKomisiSale==='function') ? nmKomisiSale(s) : 0;"
R = "r.komisi = (r.komisi||0) + _kom;"
for x in (K, R):
    src = re.sub("(" + re.escape(x) + r")(?:[ \t]*" + re.escape(x) + ")+", lambda m: m.group(1), src)
blk = "<script>" + JS + "</script>\n"
m = re.search(r"<script>/\*NM-PULIH v[^\n]*\n.*?</script>\n?", src, re.S)
if m:
    if VER not in m.group(0): src = src[:m.start()] + blk + src[m.end():]
else:
    t = re.search(r'<meta charset="[^"]*">\n?', src)
    if t: src = src[:t.end()] + blk + src[t.end():]
    elif "<head>" in src: src = src.replace("<head>", "<head>\n" + blk, 1)
if src == orig: sys.exit(0)
open(path, "w", encoding="utf-8").write(src)
print("0043: pembersihan duplikat + pemulihan otomatis", VER)
'''
out = tpl.replace("__JS__", repr(json.dumps(js, ensure_ascii=False)))
open(os.path.join(D, "..", "patches", "0043-pulih-otomatis.py"), "w", encoding="utf-8").write(out)
print("ok", len(out))
