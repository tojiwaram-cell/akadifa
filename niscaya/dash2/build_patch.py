#!/usr/bin/env python3
# Membuat patches/0029-dashboard-fungsi.py dari dash2/dashfungsi.js (jalankan ulang setiap mengubah dashfungsi.js)
import json, os
D = os.path.dirname(os.path.abspath(__file__))
js = open(os.path.join(D, "dashfungsi.js"), encoding="utf-8").read().strip()
assert "</script" not in js.lower()
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0029: semua isi Dashboard berfungsi (filter status, rincian angka, isi harga cepat, transaksi & tabel omzet bisa diklik).
# Idempoten: blok <script>/*DASH-FUNGSI v..*/ disisipkan sebelum </body>, atau diganti bila versinya berbeda.
import sys, json, re
path = sys.argv[1]
JS = json.loads(__JS__)
VER = JS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
if VER in src: sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
blk = "<script>" + JS + "</script>\n"
m = re.search(r"<script>/\*DASH-FUNGSI v[^\n]*\n.*?</script>\n?", src, re.S)
if m: src = src[:m.start()] + blk + src[m.end():]
elif "</body>" in src:
    i = src.rfind("</body>"); src = src[:i] + blk + src[i:]
else:
    print("0029: </body> tidak ditemukan - dibatalkan"); sys.exit(2)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0029: dashboard fungsi terpasang", VER)
'''
open(os.path.join(D, "..", "patches", "0029-dashboard-fungsi.py"), "w", encoding="utf-8").write(tpl.replace("__JS__", repr(json.dumps(js, ensure_ascii=False))))
print("ok")
