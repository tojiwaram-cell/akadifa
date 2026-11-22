#!/usr/bin/env python3
# Membuat patches/0056-belum-ready.py dari belumready/belumready.js (jalankan ulang setiap mengubah belumready.js)
import json, os
D = os.path.dirname(os.path.abspath(__file__))
js = open(os.path.join(D, "belumready.js"), encoding="utf-8").read().strip()
assert "</script" not in js.lower()
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0056: status/kolom "Belum Ready" (unit belum bisa dijual).
# Idempoten: edit teks kecil di kode utama (kolom papan, kartu Dashboard, aturan DP, daftar Catat Penjualan)
# + blok <script>/*NM-BELUM-READY v..*/ sebelum </body> (diganti bila versinya berbeda).
import sys, json, re
path = sys.argv[1]
JS = json.loads(__JS__)
VER = JS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
orig = src
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
# 1) kolom papan Kanban (paling kiri)
OLD = "{status:'Ready', title:'✅ Ready'},"
if "{status:'Belum Ready'" not in src and src.count(OLD) == 1:
    src = src.replace(OLD, "{status:'Belum Ready', title:'🔧 Belum Ready'},\n      " + OLD)
# 2) kartu Dashboard
OLD = "${card('Booking', booking.length"
if "card('Belum Ready'" not in src and src.count(OLD) == 1:
    src = src.replace(OLD, "${card('Belum Ready', DATA.stock.filter(s=>s.status==='Belum Ready').length, 'unit belum bisa dijual', {dot:'#F59E0B', go:'stock'})}\n      " + OLD)
# 3) DP dibatalkan / DP otomatis: Belum Ready diperlakukan seperti Ready
src = re.sub(r"\((\w+)( ?)===( ?)'Ready' \|\| \1( ?)===( ?)'Booking'\)",
             lambda m: "(%s%s===%s'Ready' || %s%s===%s'Belum Ready' || %s%s===%s'Booking')" % (m.group(1), m.group(2), m.group(3), m.group(1), m.group(2), m.group(3), m.group(1), m.group(4), m.group(5)), src)
# 4) Catat Penjualan: unit Belum Ready tidak bisa dipilih (kecuali dibuka langsung dari unit itu)
OLD = "const avail = DATA.stock.filter(s=>s.status!=='Sold' || !_noted.has(String(s.id)));"
if src.count(OLD) == 1:
    src = src.replace(OLD, "const avail = DATA.stock.filter(s=>(s.status!=='Sold' || !_noted.has(String(s.id))) && (s.status!=='Belum Ready' || s.id===presetId));")
# 5) blok skrip
if VER not in src:
    blk = "<script>" + JS + "</script>\n"
    m = re.search(r"<script>/\*NM-BELUM-READY v[^\n]*\n.*?</script>\n?", src, re.S)
    if m: src = src[:m.start()] + blk + src[m.end():]
    elif "</body>" in src:
        i = src.rfind("</body>"); src = src[:i] + blk + src[i:]
    else:
        print("0056: </body> tidak ditemukan - dibatalkan"); sys.exit(2)
if crlf: src = src.replace("\n", "\r\n")
if src != orig:
    open(path, "w", encoding="utf-8").write(src)
    print("0056: belum ready terpasang", VER)
'''
open(os.path.join(D, "..", "patches", "0056-belum-ready.py"), "w", encoding="utf-8").write(tpl.replace("__JS__", repr(json.dumps(js, ensure_ascii=False))))
print("ok")
