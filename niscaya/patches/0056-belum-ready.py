#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0056: status/kolom "Belum Ready" (unit belum bisa dijual).
# Idempoten: edit teks kecil di kode utama (kolom papan, kartu Dashboard, aturan DP, daftar Catat Penjualan)
# + blok <script>/*NM-BELUM-READY v..*/ sebelum </body> (diganti bila versinya berbeda).
import sys, json, re
path = sys.argv[1]
JS = json.loads('"/*NM-BELUM-READY v1*/\\n/* Rilis 0056 — status & kolom \\"Belum Ready\\": unit sudah tercatat di stok tetapi belum bisa dijual\\n   (masih dicek/service/dibersihkan). Tidak tampil di Katalog WA & katalog online, tidak bisa dipilih di Catat Penjualan\\n   maupun Tukar Tambah. Kolom papan Kanban, pilihan status, badge, filter, impor & ekspor Excel ikut mengenali status ini. */\\n(function(){\\n  var ST = \'Belum Ready\';\\n  try{ if(typeof STATUS_LIST !== \'undefined\' && STATUS_LIST.indexOf(ST) < 0) STATUS_LIST.unshift(ST); }catch(_){}\\n  if(!document.getElementById(\'nm-belum-css\')){\\n    var css = document.createElement(\'style\'); css.id = \'nm-belum-css\';\\n    css.textContent = \'.badge-belum{background:rgba(245,158,11,.18);color:#B45309}.badge-belum .d{background:#F59E0B}\'\\n      + \'.list[data-status=\\"Belum Ready\\"]{box-shadow:inset 0 3px 0 #F59E0B}\'\\n      + \'.list[data-status=\\"Belum Ready\\"] .list-header .count{background:#F59E0B;color:#fff}\';\\n    document.head.appendChild(css);\\n  }\\n  var asli = window.statusBadge;\\n  if(typeof asli === \'function\' && !asli.__nmBelum){\\n    var f = function(status){\\n      if(status === ST) return \'<span class=\\"badge badge-belum\\"><span class=\\"d\\"></span>Belum Ready</span>\';\\n      return asli.apply(this, arguments);\\n    };\\n    f.__nmBelum = true;\\n    try{ window.statusBadge = f; }catch(_){}\\n  }\\n  try{ if(typeof render === \'function\' && [\'stock\', \'dashboard\'].indexOf(currentTab) >= 0) render(); }catch(_){}\\n})();"')
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
