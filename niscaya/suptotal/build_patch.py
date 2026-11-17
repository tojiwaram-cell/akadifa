#!/usr/bin/env python3
# Membuat patches/0031-supplier-total.py dari suptotal/suptotal.js (jalankan ulang setiap mengubah suptotal.js)
import json, os
D = os.path.dirname(os.path.abspath(__file__))
js = open(os.path.join(D, "suptotal.js"), encoding="utf-8").read().strip()
assert "</script" not in js.lower()
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0031: baris "Tanpa Supplier" + TOTAL STOK AKTIF di menu Supplier.
# Idempoten: blok <script>/*SUP-TOTAL v..*/ disisipkan sebelum </body>, atau diganti bila versinya berbeda.
import sys, json, re
path = sys.argv[1]
JS = json.loads(__JS__)
VER = JS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
if VER in src: sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
blk = "<script>" + JS + "</script>\n"
m = re.search(r"<script>/\*SUP-TOTAL v[^\n]*\n.*?</script>\n?", src, re.S)
if m: src = src[:m.start()] + blk + src[m.end():]
elif "</body>" in src:
    i = src.rfind("</body>"); src = src[:i] + blk + src[i:]
else:
    print("0031: </body> tidak ditemukan - dibatalkan"); sys.exit(2)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0031: total supplier terpasang", VER)
'''
open(os.path.join(D, "..", "patches", "0031-supplier-total.py"), "w", encoding="utf-8").write(tpl.replace("__JS__", repr(json.dumps(js, ensure_ascii=False))))
print("ok")
