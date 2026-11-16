#!/usr/bin/env python3
# Membuat patches/0024-perbaikan-bug.py dari fix0024/edits.py + fix0024/fix0024.js
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
from edits import EDITS
js = open(os.path.join(D, "fix0024.js"), encoding="utf-8").read().strip()
assert "</script" not in js.lower()
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0024: laba dikurangi komisi marketing, warna untung minus merah, "Tanya harga" untuk unit tanpa harga,
# lencana sinkron pulih otomatis. (Biaya teknisi tidak masuk ke unit Sold ada di 0016 / TEK-OWNER v6.)
# Idempoten: edit dilewati bila sudah terpasang; blok <script>/*FIX0024 v..*/ disisipkan/diganti sebelum </body>.
import sys, json, re
path = sys.argv[1]
EDITS = json.loads(__EDITS__)
JS = json.loads(__JS__)
VER = JS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
orig = src
for i, (old, new) in enumerate(EDITS, 1):
    if new in src: continue
    n = src.count(old)
    if n != 1: print("0024: edit %d tidak cocok (%d) - dilewati" % (i, n)); continue
    src = src.replace(old, new)
if VER not in src:
    blk = "<script>" + JS + "</script>\n"
    m = re.search(r"<script>/\*FIX0024 v[^\n]*\n.*?</script>\n?", src, re.S)
    if m: src = src[:m.start()] + blk + src[m.end():]
    elif "</body>" in src:
        i = src.rfind("</body>"); src = src[:i] + blk + src[i:]
if src == orig: sys.exit(0)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0024: perbaikan bug terpasang", VER)
'''
out = tpl.replace("__EDITS__", repr(json.dumps(EDITS, ensure_ascii=False))).replace("__JS__", repr(json.dumps(js, ensure_ascii=False)))
open(os.path.join(D, "..", "patches", "0024-perbaikan-bug.py"), "w", encoding="utf-8").write(out)
print("ok", len(out))
