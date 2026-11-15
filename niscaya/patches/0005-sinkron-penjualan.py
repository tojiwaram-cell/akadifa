#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0005: data penjualan selalu sinkron dengan status unit (dashboard = data)
import sys, json
path = sys.argv[1]
src = open(path, encoding="utf-8").read()
if "function reconcileSales" in src:
    print("0005: sudah terpasang"); sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
EDITS = json.loads('[["function autoFixMerek(){", "function reconcileSales(){\\n  // Penjualan hanya sah bila unitnya masih berstatus Sold. Jika unit dipindah keluar dari Sold, penjualannya dibatalkan otomatis (riwayat disimpan di salesBatal).\\n  const byId = {}; (DATA.stock||[]).forEach(s => { byId[String(s.id)] = s; });\\n  const keep = [], batal = [];\\n  (DATA.sales||[]).forEach(x => { const u = byId[String(x.id)]; if(u && u.status !== \'Sold\') batal.push(Object.assign({}, x, {dibatalkan: localYMD(), statusSaatBatal: u.status})); else keep.push(x); });\\n  if(batal.length){ DATA.sales = keep; DATA.salesBatal = (DATA.salesBatal||[]).concat(batal); }\\n  return batal.length;\\n}\\nfunction autoFixMerek(){"], ["async function persist(){\\n  autoFixMerek();", "async function persist(){\\n  autoFixMerek();\\n  const _batal = reconcileSales();\\n  if(_batal) setTimeout(() => showToast(_batal + \' penjualan dibatalkan otomatis karena unitnya tidak lagi Sold (riwayat tetap disimpan)\'), 60);"], ["    let _fixedMerek = 0;\\n    if(j.data){ applyLoaded(j.data); _fixedMerek = autoFixMerek(); writeLocal(); }", "    let _fixedMerek = 0, _batalLoad = 0;\\n    if(j.data){ applyLoaded(j.data); _fixedMerek = autoFixMerek(); _batalLoad = reconcileSales(); writeLocal(); }"], ["    if(_fixedMerek){ writeLocal(); await pushServer(); showToast(_fixedMerek + \' nama merek salah ketik dirapikan otomatis\'); }", "    if(_fixedMerek || _batalLoad){ writeLocal(); await pushServer(); showToast([_fixedMerek ? _fixedMerek + \' nama merek dirapikan otomatis\' : \'\', _batalLoad ? _batalLoad + \' penjualan dibatalkan (unit tidak lagi Sold)\' : \'\'].filter(Boolean).join(\' · \')); }"], ["      if(item.dp){ $(\'s_pembeli\').value = item.dp.nama||\'\'; $(\'s_hp\').value = item.dp.hp||\'\'; }", "      if(item.dp){ $(\'s_pembeli\').value = item.dp.nama||\'\'; $(\'s_hp\').value = item.dp.hp||\'\'; }\\n      const bt = (DATA.salesBatal||[]).filter(x=>String(x.id)===String(item.id)).pop();\\n      if(bt){ if(bt.tanggal) $(\'s_tanggal\').value = bt.tanggal; if(bt.pembeli) $(\'s_pembeli\').value = bt.pembeli; if(bt.hp) $(\'s_hp\').value = bt.hp; if(bt.hargaNormal) $(\'s_hargaNormal\').value = bt.hargaNormal; $(\'s_diskon\').value = bt.diskon||0; }"]]')
for i, (old, new) in enumerate(EDITS, 1):
    n = src.count(old)
    if n != 1:
        print("0005: edit %d tidak cocok (ditemukan %d) - dibatalkan" % (i, n)); sys.exit(2)
    src = src.replace(old, new)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0005: sinkron penjualan-status terpasang")
