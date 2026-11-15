#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0008: status unit mengikuti pilihan (DP -> Ready/Booking membatalkan DP, tidak dipaksa kembali ke DP)
import sys, json
path = sys.argv[1]
src = open(path, encoding="utf-8").read()
if "function batalkanDP" in src:
    print("0008: sudah terpasang"); sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
EDITS = json.loads('[["function reconcileSales(){", "function batalkanDP(s, statusBaru){\\n  // DP dibatalkan / dikembalikan: data DP dipindah ke riwayat dpBatal agar status unit sesuai pilihan\\n  if(s && s.dp && (Number(s.dp.nominal) || s.dp.nama)){ (s.dpBatal = s.dpBatal || []).push(Object.assign({}, s.dp, {dibatalkan: localYMD(), statusBaru: statusBaru})); }\\n  if(s) delete s.dp;\\n}\\nfunction reconcileSales(){"], ["    if(dpObj.nominal > 0 || dpObj.nama){\\n      if(!dpObj.tanggal) dpObj.tanggal = localYMD();\\n      if(dpObj.nominal > hargaJual - diskon){ alert(\'Nominal DP melebihi harga akhir unit\'); return; }\\n      payload.dp = dpObj;\\n      if(dpObj.nominal > 0 && (status===\'Ready\' || status===\'Booking\')) status = \'DP\';\\n    } else delete payload.dp;", "    const keluarDariDP = !!id && item.status === \'DP\' && (status === \'Ready\' || status === \'Booking\');\\n    if(keluarDariDP && (dpObj.nominal > 0 || dpObj.nama)){\\n      const okBatal = await confirmChange(`Batalkan DP ${payload.id}?`, [[`DP — ${merek} ${payload.tipe}`, rupiah(dpObj.nominal) + (dpObj.nama ? \' · \' + dpObj.nama : \'\'), \'dibatalkan → \' + status]]);\\n      if(!okBatal) return;\\n      payload.dp = dpObj; batalkanDP(payload, status);\\n    } else if(dpObj.nominal > 0 || dpObj.nama){\\n      if(!dpObj.tanggal) dpObj.tanggal = localYMD();\\n      if(dpObj.nominal > hargaJual - diskon){ alert(\'Nominal DP melebihi harga akhir unit\'); return; }\\n      payload.dp = dpObj;\\n      if(dpObj.nominal > 0 && (status===\'Ready\' || status===\'Booking\')) status = \'DP\';\\n    } else delete payload.dp;"], ["    const ok = await confirmChange(`Pindahkan ${item.id}?`, [[`Status — ${item.merek} ${item.tipe}`, item.status, newStatus]]);\\n    if(!ok){ showToast(\'Perubahan dibatalkan\'); renderStock(c, ta); return; }\\n    item.status = newStatus;", "    const batalDp = item.status === \'DP\' && (newStatus === \'Ready\' || newStatus === \'Booking\') && (dpNominal(item) || (item.dp && item.dp.nama));\\n    const rowsPindah = [[`Status — ${item.merek} ${item.tipe}`, item.status, newStatus]];\\n    if(batalDp) rowsPindah.push([`DP ${item.dp.nama ? \'· \' + item.dp.nama : \'\'}`, rupiah(dpNominal(item)), \'dibatalkan\']);\\n    const ok = await confirmChange(`Pindahkan ${item.id}?`, rowsPindah);\\n    if(!ok){ showToast(\'Perubahan dibatalkan\'); renderStock(c, ta); return; }\\n    if(batalDp) batalkanDP(item, newStatus);\\n    item.status = newStatus;"]]')
for i, (old, new) in enumerate(EDITS, 1):
    n = src.count(old)
    if n != 1:
        print("0008: edit %d tidak cocok (ditemukan %d) - dibatalkan" % (i, n)); sys.exit(2)
    src = src.replace(old, new)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0008: perbaikan status DP terpasang")
