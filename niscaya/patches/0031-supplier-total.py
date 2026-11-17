#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0031: baris "Tanpa Supplier" + TOTAL STOK AKTIF di menu Supplier.
# Idempoten: blok <script>/*SUP-TOTAL v..*/ disisipkan sebelum </body>, atau diganti bila versinya berbeda.
import sys, json, re
path = sys.argv[1]
JS = json.loads('"/*SUP-TOTAL v1*/\\n(function(){\\n  if (typeof window.renderSupplier !== \'function\' || window.renderSupplier.__supTotal) return;\\n  var orig = window.renderSupplier;\\n  function e(s){ return String(s == null ? \'\' : s).replace(/[&<>\\"]/g, function(c){ return {\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'\\"\':\'&quot;\'}[c]; }); }\\n  function wrapped(c, ta){\\n    orig.apply(this, arguments);\\n    try {\\n      var D = window.DATA || (typeof DATA !== \'undefined\' ? DATA : null);\\n      if (!D || !c) return;\\n      var tb = c.querySelector(\'table tbody\'), table = c.querySelector(\'table\');\\n      if (!tb || !table) return;\\n      var names = {};\\n      (D.suppliers || []).forEach(function(s){ names[s.supplier] = 1; });\\n      var aktif = (D.stock || []).filter(function(st){ return st.status !== \'Sold\'; });\\n      var kosong = [], lain = [], ber = 0;\\n      aktif.forEach(function(st){\\n        var sp = st.supplier == null ? \'\' : String(st.supplier);\\n        if (names[sp]) ber++;\\n        else if (!sp.trim()) kosong.push(st);\\n        else lain.push(st);\\n      });\\n      function row(label, list, note){\\n        if (!list.length) return \'\';\\n        var ids = list.map(function(x){ return x.id; }).join(\', \');\\n        return \'<tr class=\\"sup-x\\" style=\\"background:#fff7e6;cursor:pointer\\" title=\\"Klik untuk melihat ID unit\\">\' +\\n          \'<td><b>\' + label + \'</b><div class=\\"dim\\" style=\\"font-size:12px\\">\' + note + \'</div></td><td class=\\"dim\\">—</td><td class=\\"dim\\">—</td>\' +\\n          \'<td class=\\"mono\\"><b>\' + list.length + \'</b></td><td></td></tr>\' +\\n          \'<tr class=\\"sup-x-ids\\" style=\\"display:none\\"><td colspan=\\"5\\" class=\\"mono dim\\" style=\\"font-size:12px;white-space:normal;word-break:break-word\\">\' + e(ids) + \'</td></tr>\';\\n      }\\n      tb.insertAdjacentHTML(\'beforeend\',\\n        row(\'⚠ Tanpa Supplier\', kosong, \'Kolom supplier di unit masih kosong\') +\\n        row(\'⚠ Supplier tidak terdaftar\', lain, \'Nama supplier di unit tidak ada di daftar ini\'));\\n      tb.querySelectorAll(\'tr.sup-x\').forEach(function(tr){\\n        tr.onclick = function(){ var n = tr.nextElementSibling; if (n) n.style.display = n.style.display === \'none\' ? \'\' : \'none\'; };\\n      });\\n      var old = table.querySelector(\'tfoot\'); if (old) old.remove();\\n      var tot = aktif.length;\\n      table.insertAdjacentHTML(\'beforeend\',\\n        \'<tfoot><tr style=\\"background:#eef4ff;font-weight:700\\"><td>TOTAL STOK AKTIF</td><td class=\\"dim\\" colspan=\\"2\\" style=\\"font-weight:400;font-size:12px\\">\' +\\n        ber + \' bersupplier\' + (kosong.length ? \' · \' + kosong.length + \' tanpa supplier\' : \'\') + (lain.length ? \' · \' + lain.length + \' tidak terdaftar\' : \'\') +\\n        \'</td><td class=\\"mono\\">\' + tot + \'</td><td></td></tr></tfoot>\');\\n    } catch (err) { console.warn(\'SUP-TOTAL\', err); }\\n  }\\n  wrapped.__supTotal = true;\\n  window.renderSupplier = wrapped;\\n  try { if (window.currentTab === \'supplier\' && typeof window.render === \'function\') window.render(); } catch (e2) {}\\n})();"')
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
