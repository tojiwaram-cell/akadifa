#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0036: filter "Ada SN / Belum ada SN" (No Seri) di menu Stok (Papan & Tabel) dan halaman Label.
# Idempoten: bila penanda SN-FILTER sudah ada, tidak melakukan apa-apa. Semua jangkar harus ketemu, kalau tidak dibatalkan
# tanpa mengubah file. Hanya tampilan/penyaringan — data stok tidak diubah.
import sys
path = sys.argv[1]
MARK = "/*SN-FILTER v1*/"
src = open(path, encoding="utf-8").read()
if MARK in src: sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")

HELP = MARK + r"""
var nmSnFilter = 'Semua';
function nmHasSn(s){
  var v = String(s && s.noSeri != null ? s.noSeri : '').trim();
  return !!v && !/^(-+|\.+|0+|n\/?a|null|tidak ada|tdk ada|belum ada|kosong|no sn|tanpa sn)$/i.test(v);
}
function nmSnOk(s){ return nmSnFilter === 'Semua' || (nmSnFilter === 'Ada' ? nmHasSn(s) : !nmHasSn(s)); }
function nmSnSelect(id){
  var base = (DATA.stock || []).filter(function(s){ return stockStatusFilter === 'Semua' || s.status === stockStatusFilter; });
  var ada = base.filter(nmHasSn).length, blm = base.length - ada;
  function o(v, t){ return '<option value="' + v + '"' + (nmSnFilter === v ? ' selected' : '') + '>' + t + '</option>'; }
  var on = nmSnFilter !== 'Semua';
  return '<select id="' + id + '" title="Saring berdasarkan No Seri (SN)"' + (on ? ' style="border-color:#FE2E4B;box-shadow:0 0 0 2px rgba(254,46,75,.25);font-weight:600"' : '') + '>' +
    o('Semua', 'SN: Semua (' + base.length + ')') + o('Ada', '✅ Sudah ada SN (' + ada + ')') + o('Belum', '⚠ Belum ada SN (' + blm + ')') + '</select>';
}
function nmSnBind(c, sel, fn){ var el = c.querySelector(sel); if (el) el.onchange = function(e){ nmSnFilter = e.target.value; fn(); }; }
"""

EDITS = [
  ("    const matchStatus = stockStatusFilter==='Semua' || s.status===stockStatusFilter;\n    return matchSearch && matchStatus;",
   "    const matchStatus = stockStatusFilter==='Semua' || s.status===stockStatusFilter;\n    return matchSearch && matchStatus && nmSnOk(s);", 2),
  ('<select id="statusFilter">${statusOptions(stockStatusFilter,true)}</select>',
   '<select id="statusFilter">${statusOptions(stockStatusFilter,true)}</select>\n      ${nmSnSelect(\'snFilter\')}', 1),
  ('<select id="bcStatusFilter">${statusOptions(stockStatusFilter,true)}</select>',
   '<select id="bcStatusFilter">${statusOptions(stockStatusFilter,true)}</select>\n      ${nmSnSelect(\'bcSnFilter\')}', 1),
  ("c.querySelector('#statusFilter').onchange = (e) => { stockStatusFilter = e.target.value; renderStock(c, ta); };",
   "c.querySelector('#statusFilter').onchange = (e) => { stockStatusFilter = e.target.value; renderStock(c, ta); };\n  nmSnBind(c, '#snFilter', () => renderStock(c, ta));", 1),
  ("c.querySelector('#bcStatusFilter').onchange = (e) => { stockStatusFilter = e.target.value; renderBarcode(c, ta); };",
   "c.querySelector('#bcStatusFilter').onchange = (e) => { stockStatusFilter = e.target.value; renderBarcode(c, ta); };\n  nmSnBind(c, '#bcSnFilter', () => renderBarcode(c, ta));", 1),
  ("\nfunction renderStock(c, ta){", "\n" + HELP + "function renderStock(c, ta){", 1),
]
for old, new, n in EDITS:
    if src.count(old) != n:
        print("0036: jangkar tidak cocok (%d != %d) - dibatalkan: %s" % (src.count(old), n, old[:60])); sys.exit(2)
for old, new, n in EDITS:
    src = src.replace(old, new)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0036: filter SN terpasang")
