#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0047: unit stok terbaru tampil paling atas (Stok, Label QR, Katalog WA).
# Idempoten: blok <script>/*NM-TERBARU v..*/ disisipkan sebelum </body>, atau diganti bila versinya berbeda.
import sys, json, re
path = sys.argv[1]
JS = json.loads('"/*NM-TERBARU v1*/\\n/* Unit stok terbaru tampil paling atas di menu Stok (Papan & Tabel), Label QR (termasuk urutan cetak) dan Katalog WA.\\n   \\"Terbaru\\" = nomor ID terbesar (LP420 di atas LP419); bila nomornya sama, yang ditambahkan belakangan di atas.\\n   Hanya urutan tampilan: DATA.stock yang disimpan tidak diubah (salinan berurutan dipakai sementara selama render). */\\n(function(){\\n  function nmNo(id){ var m = String(id == null ? \'\' : id).match(/(\\\\d+)(?!.*\\\\d)/); return m ? Number(m[1]) : -1; }\\n  window.nmUrutTerbaru = function(arr){\\n    return (arr || []).map(function(s, i){ return [s, i]; })\\n      .sort(function(a, b){ return (nmNo(b[0] && b[0].id) - nmNo(a[0] && a[0].id)) || (b[1] - a[1]); })\\n      .map(function(x){ return x[0]; });\\n  };\\n  function bungkus(nama){\\n    var asli = window[nama];\\n    if(typeof asli !== \'function\' || asli.__nmTerbaru) return;\\n    var f = function(){\\n      var semula = DATA.stock, urut = null;\\n      try{ if(Array.isArray(semula)){ urut = window.nmUrutTerbaru(semula); DATA.stock = urut; } }catch(_){ urut = null; }\\n      try{ return asli.apply(this, arguments); }\\n      finally{ if(urut && DATA.stock === urut) DATA.stock = semula; }\\n    };\\n    f.__nmTerbaru = true;\\n    try{ window[nama] = f; }catch(_){}\\n    try{ eval(nama + \' = f\'); }catch(_){}\\n  }\\n  [\'renderStock\', \'renderBarcode\', \'renderCatalog\', \'printBarcodeLabels\'].forEach(bungkus);\\n  try{ if(typeof render === \'function\' && [\'stock\', \'barcode\', \'catalog\'].indexOf(currentTab) >= 0) render(); }catch(_){}\\n})();"')
VER = JS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
if VER in src: sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
blk = "<script>" + JS + "</script>\n"
m = re.search(r"<script>/\*NM-TERBARU v[^\n]*\n.*?</script>\n?", src, re.S)
if m: src = src[:m.start()] + blk + src[m.end():]
elif "</body>" in src:
    i = src.rfind("</body>"); src = src[:i] + blk + src[i:]
else:
    print("0047: </body> tidak ditemukan - dibatalkan"); sys.exit(2)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0047: urutan terbaru terpasang", VER)
