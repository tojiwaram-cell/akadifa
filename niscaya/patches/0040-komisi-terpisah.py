#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0040: komisi marketing TIDAK dihitung ke modal/biaya dan TIDAK memotong laba.
# Laba = harga akhir - modal - biaya service. Komisi tetap tampil di kolom sendiri & Laporan Komisi.
# Membalik bagian komisi dari 0024 (sumSales, Total Untung, judul kolom), 0029 (rincian penjualan Dashboard) dan 0033 (Harian).
# Idempoten: hanya mengganti teks lama yang masih ada; sejak 0042 juga merapikan duplikat lama.
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
# Rilis 0042: bersihkan duplikat yang menumpuk akibat 0024 & 0040 saling membalik tiap deploy
# (duplikat "const _kom" membuat seluruh skrip aplikasi gagal: SyntaxError, menu & tombol mati).
import re
CLEAN = [
 (r"(?:const _kom = \(typeof nmKomisiSale==='function'\) \? nmKomisiSale\(s\) : 0; ){2,}",
  "const _kom = (typeof nmKomisiSale==='function') ? nmKomisiSale(s) : 0; "),
 (r"r\.komisi = \(r\.komisi\|\|0\) \+ _kom;(?: r\.komisi = \(r\.komisi\|\|0\) \+ _kom;)+",
  "r.komisi = (r.komisi||0) + _kom;"),
 (r"(?: \(komisi marketing dicatat terpisah\)){2,}", " (komisi marketing dicatat terpisah)"),
]
for pat, rep in CLEAN:
    src2 = re.sub(pat, lambda m: rep, src)
    if src2 != src: src = src2; n += 1
if n:
    open(path, "w", encoding="utf-8").write(src)
    print("0040: komisi dipisah dari modal/laba (%d edit)" % n)
