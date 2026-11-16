#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0024: laba dikurangi komisi marketing, warna untung minus merah, "Tanya harga" untuk unit tanpa harga,
# lencana sinkron pulih otomatis. (Biaya teknisi tidak masuk ke unit Sold ada di 0016 / TEK-OWNER v6.)
# Idempoten: edit dilewati bila sudah terpasang; blok <script>/*FIX0024 v..*/ disisipkan/diganti sebelum </body>.
import sys, json, re
path = sys.argv[1]
EDITS = json.loads('[["r.omzet += jual; r.modal += modal; r.biaya += biaya; r.laba += laba;", "const _kom = (typeof nmKomisiSale===\'function\') ? nmKomisiSale(s) : 0; r.omzet += jual; r.modal += modal; r.biaya += biaya + _kom; r.laba += laba - _kom; r.komisi = (r.komisi||0) + _kom;"], ["const totalUntung = rows.reduce((a,s)=>a+Number(s.untung||0),0);", "const totalUntung = rows.reduce((a,s)=>a+Number(s.untung||0)-((typeof nmKomisiSale===\'function\')?nmKomisiSale(s):0),0);"], ["<div class=\\"lbl\\">Total Untung Bersih</div><div class=\\"val\\" style=\\"font-size:19px; color:var(--ready)\\">${rupiah(totalUntung)}</div>", "<div class=\\"lbl\\">Total Untung Bersih</div><div class=\\"val\\" style=\\"font-size:19px; color:${totalUntung<0?\'var(--danger)\':\'var(--ready)\'}\\">${rupiah(totalUntung)}</div><div class=\\"dim\\" style=\\"font-size:11px;margin-top:2px\\">setelah komisi marketing</div>"], ["<td class=\\"mono\\" style=\\"color:var(--ready-dark)\\">${rupiah(x.untung)}</td>", "<td class=\\"mono\\" style=\\"color:${Number(x.untung)<0?\'var(--danger)\':\'var(--ready-dark)\'}\\">${rupiah(x.untung)}</td>"], ["<th style=\\"text-align:right\\">Modal+Biaya</th>", "<th style=\\"text-align:right\\">Modal+Biaya+Komisi</th>"], ["Laba = omzet − modal − biaya service", "Laba = omzet − modal − biaya service − komisi marketing"], ["function priceHtml(s){ return (Number(s.diskon)||0)>0 ?", "function priceHtml(s){ if(!(Number(s.hargaJual)>0)) return \'<span class=\\"no-price\\" style=\\"color:#8590a2;font-weight:600\\">Tanya harga</span>\'; return (Number(s.diskon)||0)>0 ?"]]')
JS = json.loads('"/*FIX0024 v1*/\\n/* Komisi marketing per penjualan — dipakai rumus laba (Dashboard & Penjualan) */\\nfunction nmKomisiSale(s){\\n  if(!s || !s.marketing) return 0;\\n  try{ const m = (DATA.marketing||[]).find(x => String(x.nama) === String(s.marketing)); return m ? (Number(komisiFor(m, s))||0) : 0; }catch(_){ return 0; }\\n}\\n/* Lencana sinkron: kembali ke \\"Tersimpan di VPS\\" begitu koneksi pulih (sebelumnya tertahan di \\"Koneksi putus\\") */\\n(function(){\\n  if(typeof syncBadge !== \'function\' || typeof checkRemote !== \'function\') return;\\n  const _sb = syncBadge; let last = \'\', calls = 0;\\n  syncBadge = function(state){ last = state; calls++; return _sb.apply(this, arguments); };\\n  const _cr = checkRemote;\\n  checkRemote = async function(){\\n    const before = calls;\\n    await _cr.apply(this, arguments);\\n    if(last !== \'err\' || calls !== before || !SYNC.online || SYNC.dirty || SYNC.saving) return;\\n    try{ const r = await fetch(\'/api/version\', {cache:\'no-store\', credentials:\'same-origin\'}); if(r.ok && last === \'err\') syncBadge(\'ok\', \'Tersimpan di VPS\'); }catch(_){}\\n  };\\n  try{ if(SYNC.poll) startPolling(); }catch(_){}\\n})();"')
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
