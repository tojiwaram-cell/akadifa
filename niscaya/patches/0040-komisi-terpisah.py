#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0040: komisi marketing TIDAK dihitung ke modal/biaya dan TIDAK memotong laba.
# Laba = harga akhir - modal - biaya service. Komisi tetap tampil di kolom sendiri & Laporan Komisi.
# Membalik bagian komisi dari 0024 (sumSales, Total Untung, judul kolom), 0029 (rincian penjualan Dashboard) dan 0033 (Harian).
# Idempoten: hanya mengganti teks lama yang masih ada.
import sys
path = sys.argv[1]
src = open(path, encoding="utf-8").read()
EDITS = [
 ("r.biaya += biaya + _kom; r.laba += laba - _kom;", "r.biaya += biaya; r.laba += laba;"),
 ("a+Number(s.untung||0)-((typeof nmKomisiSale==='function')?nmKomisiSale(s):0),0);", "a+Number(s.untung||0),0);"),
 ("setelah komisi marketing", "komisi marketing tidak dipotong"),
 ("Modal+Biaya+Komisi", "Modal+Biaya"),
 ("biaya service − komisi marketing", "biaya service (komisi marketing dicatat terpisah)"),
 ("lb = (Number(s.untung)||0) - kom;", "lb = (Number(s.untung)||0);"),
 ("(Number(s.modal) || 0) - bia - kom;", "(Number(s.modal) || 0) - bia;"),
 ("(laba = harga final − modal − biaya − komisi)", "(laba = harga final − modal − biaya; komisi terpisah)"),
]
n = 0
for old, new in EDITS:
    if old in src:
        src = src.replace(old, new); n += 1
if n:
    open(path, "w", encoding="utf-8").write(src)
    print("0040: komisi dipisah dari modal/laba (%d edit)" % n)
