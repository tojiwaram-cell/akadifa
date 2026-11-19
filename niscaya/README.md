# NISCAYA MAKASSAR — saluran update otomatis VPS

Deployer v2 (`/usr/local/bin/niscaya-deploy`, cron tiap 2 menit) memperbarui dirinya sendiri, mengunduh patch di `patches.txt`,
lalu memasangnya ke `/var/www/niscaya/index.html`. Patch idempoten (aman dijalankan berulang).
Updater lama (`/opt/niscaya/update.sh`, tiap 5 menit) dikaitkan: hasil unduhannya ikut dipatch sebelum dipasang, jadi tidak menimpa perubahan.
Hanya berisi kode tampilan — tidak ada data stok, akun, atau kata sandi. Backup: `/var/lib/niscaya-deploy/backup` (20 terakhir). Log: `/var/log/niscaya-deploy.log`.

## Pemantau 5 detik (sejak rilis 0012)
`/usr/local/bin/niscaya-watch` (cron tiap menit, berputar ±58 detik) mengecek commit terbaru `main` lewat API GitHub setiap 5 detik
memakai ETag (respons 304 tidak memakan kuota). Jika ada commit baru, deployer dijalankan dengan file dari alamat commit itu
(`raw.githubusercontent.com/.../<sha>/niscaya`) sehingga tidak tertahan cache CDN 5 menit. Cukup push ke `main`.
Deployer penuh tetap berjalan tiap 10 menit sebagai cadangan.

## Akun teknisi (rilis 0016)
Sumber ada di `niscaya/teknisi/` (server.py, teknisi.html, owner.js). Setelah mengubahnya jalankan `python3 niscaya/teknisi/build_patch.py`
untuk membuat ulang `patches/0016-teknisi.py`. Layanan: `niscaya-teknisi.service` (127.0.0.1:8790, data `/var/lib/niscaya-teknisi/db.json`),
nginx `location /tapi/` + `/teknisi`. Teknisi login sendiri (cookie `tsess`, path /tapi) dan tidak punya akses ke `/api/data`.
Owner dikenali lewat sesi master (`/api/me`).

## Login gaya Contractbook (rilis 0018, laptop 3D sejak 0019)
Sumber tampilan di `niscaya/login/parts.py`. Login owner: `python3 niscaya/login/build_patch.py` → `patches/0017-login-contractbook.py`
(dipasang setelah 0001, mengganti tampilan Campty; logika login tidak diubah). Login teknisi memakai CSS yang sama di
`teknisi/teknisi.html` (blok `/*CB-LOGIN*/`) — lalu jalankan `teknisi/build_patch.py`.

## Login ungu-kuning (rilis 0019)
Sumber di `niscaya/login-v3/` (login.css, logout.css, art.svg). Patch `0019-login-ungu.py` dipasang SETELAH `0017-login-contractbook.py`
dan mengganti tampilannya dengan gaya ungu (referensi Pinterest): kartu putih + ilustrasi, kotak masuk ungu, tombol kuning, tab Owner/Teknisi tetap.
Setelah mengubah sumbernya jalankan `python3 niscaya/login-v3/build_patch.py`.

## Kembali ke login biru + laptop 3D (rilis 0020)
Atas permintaan owner, gaya ungu-kuning (0019) dinonaktifkan: `0019-login-ungu.py` dikeluarkan dari `patches.txt`, dan
`0020-batal-ungu.py` (dijalankan sebelum 0017) membalik edit 0019 di file yang sudah terpasang. Sumber `login-v3/` dibiarkan sebagai arsip.

## Login ungu "Business Startup" + laptop 3D bergoyang (rilis 0021)
Referensi: Magnific/Freepik premium-vector 3966284 (latar ungu berbintang, jejak awan menuju panel putih, form pil).
Roket diganti laptop 3D CSS yang bergoyang (rotateX/Y/Z + engsel layar), ukuran membesar otomatis di Full HD/2K/4K.
Sumber: `niscaya/login-v4/nm.py`. Jalankan `python3 niscaya/login-v4/build_patch.py` → membuat `patches/0021-login-ungu-3d.py`
(login owner, dipasang SETELAH 0017) sekaligus memperbarui `teknisi/teknisi.html` dan `patches/0016-teknisi.py` (login teknisi).

## Logo toko di banner login (rilis 0022)
Banner ungu (owner & teknisi) menampilkan logo NISCAYA MAKASSAR di samping judul. Logo tidak disalin: layanan teknisi menyajikan
`/tapi/logo` dari gambar `.brand-logo` di `/var/www/niscaya/index.html`, jadi bila logo aplikasi diganti, banner ikut berubah.
Sumber: `login-v4/nm.py` (blok `.nm-hero`/`.nm-logo`) dan `teknisi/server.py` (`app_logo`).

## Alur unit terjual (rilis 0023)
- **QR label = tautan unit** `http://<server>/tapi/u/<ID>`. Discan kamera HP → halaman publik dengan status & harga terbaru
  (Tersedia / Sudah dipesan / Sudah terjual + unit serupa). Label lama (teks) tetap terbaca oleh scanner aplikasi.
- **Katalog online** `http://<server>/tapi/katalog` — hanya unit Ready; dicantumkan otomatis di teks Katalog WA beserta tanggal stok.
- Aplikasi owner mengirim cuplikan stok tanpa data rahasia (tanpa modal, supplier, pembeli) ke `POST /tapi/owner/publik`
  (sesi master wajib) tiap ada perubahan; disimpan di `/var/lib/niscaya-teknisi/publik.json`. Sumber halaman: `teknisi/server.py`.
- Scan unit Sold/Booking/DP di aplikasi → peringatan besar. Halaman Label menyembunyikan unit Sold (bisa ditampilkan),
  cetak label Sold minta konfirmasi. Kolom Sold di Kanban hanya bulan ini + tombol arsip. Data penjualan tidak pernah dihapus.
- Sumber tampilan: `soldflow/soldflow.js` → `python3 niscaya/soldflow/build_patch.py` → `patches/0023-alur-terjual.py`.
  Setelah mengubah `teknisi/server.py` jalankan `python3 niscaya/teknisi/build_patch.py`.

## Perbaikan bug (rilis 0024)
- Biaya pekerjaan teknisi **tidak** lagi masuk otomatis ke unit yang sudah Sold (laba penjualan tidak berubah diam-diam);
  unit Sold tidak bisa diberi pekerjaan baru; konfirmasi bila upah melebihi modal unit (cegah salah ketik angka nol). Sumber: `teknisi/owner.js` (TEK-OWNER v6).
- Laba Dashboard & Penjualan = omzet − modal − biaya − **komisi marketing**; kolom tabel jadi "Modal+Biaya+Komisi".
- Untung minus tampil merah di Penjualan & Marketing; unit tanpa harga tampil "Tanya harga" (Kanban, Katalog WA, Label).
- Lencana sinkron kembali ke "Tersimpan di VPS" begitu koneksi pulih.
- Sumber: `fix0024/edits.py` + `fix0024/fix0024.js` → `python3 niscaya/fix0024/build_patch.py` → `patches/0024-perbaikan-bug.py`.

## Pemantau 5 detik v3 (rilis 0025)
Pemantau v2 memakai API GitHub tanpa token (batas 60 permintaan/jam per IP, respons 304 tetap dihitung) sehingga kuota habis
±5 menit dan update baru terpasang lewat cron cadangan 10 menit. v3 membaca `https://github.com/<repo>.git/info/refs` (git smart-HTTP,
tanpa kuota API, tanpa cache CDN). Status cek terakhir: `/var/lib/niscaya-deploy/watch.status`.

## Dashboard teknisi gaya Pivora (rilis 0027)
Referensi: Pinterest pin 1130825787720003740 (dashboard ungu-pink: rel menu ungu, kartu Overview bergrafik, kartu ungu & pink,
kartu tugas berikon dengan progress bar, panel kanan aktivitas). Semua di `teknisi/teknisi.html` (CSS `/*DSH v1*/`, JS `render`/`fillList`/`tileHtml`).
Grafik = jumlah selesai (pink) & upah (putih) per bulan; pil bulan & ‹ › memilih bulan; kartu tugas membuka jendela detail (laporan, part, foto, status).
Setelah mengubah: `python3 niscaya/teknisi/build_patch.py`.
## Dashboard semua berfungsi (rilis 0029)
Kartu Total/Ready/Booking/DP membuka Stok dengan filter status; Nilai Modal, Nilai Jual, Potensi Untung, Biaya Service membuka rincian per unit
(klik baris = buka unit); "Isi sekarang" membuka pengisian harga jual/modal massal; Transaksi Terbaru membuka unit; baris tabel bulan memfilter
bulan, baris tahun memilih tahun; kartu Omzet/Laba/Unit Terjual/Rata-rata membuka daftar penjualan periode terpilih.
Sumber: `dash2/dashfungsi.js` → `python3 niscaya/dash2/build_patch.py` → `patches/0029-dashboard-fungsi.py`.
## Impor aman + ekspor rapi (rilis 0030)
- **Impor gabung pintar**: unit dicocokkan lewat ID (atau No Seri). ID baru → ditambahkan; ID lama → hanya kolom yang terisi yang diperbarui.
  Tidak pernah diubah: status unit lama, DP, titipan & riwayat, penjualan lama, harga/biaya unit Sold. Sel kosong tidak menghapus data.
  Penjualan hanya ditambah (unit harus sudah Sold); supplier/marketing baru ditambah, yang lama hanya diisi bila kosong.
- **Pratinjau** sebelum simpan (unit baru / diperbarui beserta nilai lama→baru / dilewati + alasan).
- **Cadangan VPS** otomatis sebelum impor & pemulihan: `POST /tapi/owner/backup` → `/var/lib/niscaya-teknisi/cadangan/` (30 terakhir);
  bila VPS gagal, cadangan darurat di localStorage `niscaya-cadangan-lokal` (3 terakhir). Tombol **↩ Batalkan impor ini / Kembalikan**.
- **Riwayat impor** `POST|GET /tapi/owner/log` → `/var/lib/niscaya-teknisi/impor-log.json` (300 terakhir), tampil di halaman Import/Export.
- **Ekspor Excel rapi** (ExcelJS 4.4.0 dari cdnjs, cadangan SheetJS): sheet RINGKASAN + STOK LAPTOP, PENJUALAN, BIAYA UNIT, SUPPLIER, MARKETING;
  judul kolom berwarna & terkunci, format Rupiah/tanggal, warna status, filter, link foto bisa diklik. Kolom tetap sama sehingga bisa diimpor ulang.
- Sumber: `imporaman/imporaman.js` → `python3 niscaya/imporaman/build_patch.py` → `patches/0030-impor-aman.py`;
  endpoint di `teknisi/server.py` → `python3 niscaya/teknisi/build_patch.py`.
## Total stok aktif di menu Supplier (rilis 0031)
Tabel Supplier mendapat baris **⚠ Tanpa Supplier** (unit belum Sold yang kolom supplier-nya kosong) dan **⚠ Supplier tidak terdaftar**
(nama supplier di unit tidak ada di daftar), masing-masing bisa diklik untuk melihat ID unit, plus baris **TOTAL STOK AKTIF** di bawah
sehingga totalnya sama dengan Dashboard (semua unit selain Sold). Data tidak diubah — hanya tampilan (membungkus `renderSupplier`).
Sumber: `suptotal/suptotal.js` → `python3 niscaya/suptotal/build_patch.py` → `patches/0031-supplier-total.py`.
## QR tampilkan SN + harga modal/akhir khusus owner (rilis 0032)
- Halaman QR `/tapi/u/<ID>` kini menampilkan **Tipe laptop, SN (No Seri), spek, harga akhir** untuk semua orang
  (cuplikan publik membawa field `n` = No Seri; `soldflow.js` v4).
- Bila yang membuka adalah **owner yang sedang login** di browser HP yang sama (sesi master), muncul kartu **🔒 Khusus owner**:
  harga modal, biaya service/part, total modal, harga jual normal & diskon, **harga akhir**, perkiraan untung, supplier.
  Data rahasia diambil langsung dari `/api/data` dengan cookie owner saat halaman dibuka — tidak pernah disimpan di `publik.json`,
  jadi pembeli yang men-scan tidak melihat modal. Sumber: `teknisi/server.py` (`owner_unit`, `owner_card`).
## Penjualan Harian di Dashboard (rilis 0033)
Panel **📅 Penjualan Harian** (di atas "Omzet & Laba"): kartu Hari ini (dengan selisih dari kemarin), Kemarin, dan Total bulan
(rata-rata per hari, tanggal terbaik); grafik batang omzet per tanggal (angka = unit terjual, oranye = hari ini); tabel per tanggal
(unit, omzet, laba + nama laptop) dengan baris TOTAL. Pilih bulan lewat ‹ › atau kotak bulan. Klik batang/baris = rincian penjualan hari itu
(klik unit = buka unit). Angka memakai `sumSales()` yang sama dengan Dashboard. Hanya tampilan (membungkus `renderDashboard`).
Sumber: `harian/harian.js` → `python3 niscaya/harian/build_patch.py` → `patches/0033-penjualan-harian.py`.
## Label QR kertas No. 121 (rilis 0034)
Cetak label memakai kertas label **No. 121 (38 × 75 mm, 10 label per lembar: 2 kolom × 5 baris)**. Setiap 10 label jadi satu halaman A4
(margin 0), label mendatar: QR kiri, ID/tipe/spek/SN/harga kanan. Tombol **🏷 Label No.121** di halaman Label membuka pengaturan
geser atas/kiri, jarak kolom/baris, garis tepi (disimpan di localStorage `nm-label121`) dan **Cetak uji garis** untuk kalibrasi di HVS.
Hanya membungkus `printBarcodeLabels()`. Sumber: `label121/label121.js` → `python3 niscaya/label121/build_patch.py` → `patches/0034-label-121.py`.
## Tema merah-putih (rilis 0035)
Referensi: Pinterest pin 293296994506469195 ("Adlytics" AI Marketing Dashboard, versi terang): latar abu muda, sidebar & kartu putih
bersudut 16px dengan garis tipis, menu aktif = pil merah, tombol utama merah, grafik gradasi merah, font Inter. Kartu Booking jadi kartu
merah gradasi, Sudah DP kartu putih bergaris merah. Hanya CSS — data, menu dan fungsi tidak berubah; tampilan login & dashboard teknisi tidak disentuh.
Blok `<style id="nm-tema-merah">` disisipkan sebelum `</body>` sehingga menimpa `theme-2026` (biru). Untuk kembali ke biru cukup
keluarkan `0035-tema-merah.py` dari `patches.txt` dan hapus bloknya.
Sumber: `tema-merah/tema.css` → `python3 niscaya/tema-merah/build_patch.py` → `patches/0035-tema-merah.py`.
## Tema gelap-merah "arounda" (rilis 0035 v4)
Referensi: Pinterest pin 1096485840542224949 (palet arounda: #FE2E4B, #0F0E0E, #161316, #4B4A4B, #FFFFFF; latar hitam dengan cahaya
gradasi merah, pil kaca, font Helvetica). Menggantikan isi blok `nm-tema-merah` (v3 merah-putih) — patch & mekanisme sama, cukup versi CSS berubah.
Sidebar/header/kartu/panel kaca gelap, menu aktif & tombol utama = pil merah gradasi, kartu Booking & kartu sorot Harian merah gradasi, input/modal/Kanban gelap.
Hanya CSS — data, menu dan fungsi tidak berubah; login & dashboard teknisi tidak disentuh. Untuk kembali ke merah-putih: ambil `tema.css` dari commit sebelum rilis ini.
## Filter SN (No Seri) di Stok & Label (rilis 0036)
Pilihan **SN: Semua / ✅ Sudah ada SN / ⚠ Belum ada SN** (dengan jumlah unit, mengikuti filter status) di toolbar menu **Stok**
(Papan & Tabel) dan halaman **Label**. Bisa digabung dengan pencarian & filter status; di Label, "Pilih Semua" hanya memilih unit yang tersaring.
SN dianggap kosong bila isinya kosong atau hanya "-", "0", "N/A", "tidak ada", "belum ada", "kosong". Pilihan tersorot merah saat aktif.
Hanya tampilan — data tidak diubah. Sumber langsung di `patches/0036-filter-sn.py` (edit sumber `renderStock`/`renderBarcode`, penanda `/*SN-FILTER v1*/`).
## QR berisi teks info unit, bukan link (rilis 0037)
Atas permintaan owner, QR label kini berisi **teks** (tanpa tautan). Discan kamera HP → info langsung tampil:
```
NISCAYA MAKASSAR | ID: LP013
ASUS Vivobook TP412FA
SN: N4N0CV092876168
CEL N400 / 8GB / 128GB SSD
Harga: Rp 2.300.000      (unit tanpa harga: "Tanya harga")
WA: 08218942735
```
Harga = harga akhir saat label dicetak, jadi **ubah harga = cetak ulang label**. ID ada di baris pertama sehingga scanner aplikasi
(termasuk scanner USB yang mengirim Enter per baris) tetap membuka unit. Label lama berisi tautan `/tapi/u/<ID>` tetap terbaca dan
halaman publik `/tapi/u/<ID>` tetap ada. Sumber: `soldflow/soldflow.js` v5 (`qrInfo`) → `python3 niscaya/soldflow/build_patch.py`.
## Laporan pembagian komisi marketing (rilis 0038)
Panel **📄 Laporan Pembagian Komisi Marketing** di atas menu **Marketing**: pilih tanggal mulai & akhir (pintasan Bulan ini / Bulan lalu)
dan marketing (Semua marketing / per nama / semua penjualan termasuk tanpa marketing). Tabel per unit terjual: tanggal terjual, ID, tipe laptop,
spek, serial number, supplier, harga modal (dari nota penjualan; cadangan dari stok), harga akhir (harga jual final), marketing, komisi
(`nmKomisiSale` — aturan nominal/unit atau % untung yang sama dengan menu Marketing), plus rekap komisi per marketing dan total.
**🖨 Cetak / PDF** (A4 mendatar; kolom tanda tangan dihapus sejak v2) dan **⬇ Excel**. Hanya membaca data — tidak mengubah apa pun.
Sumber: `komisi/komisi.js` → `python3 niscaya/komisi/build_patch.py` → `patches/0038-laporan-komisi.py`.
## Komisi marketing otomatis Rp 50.000 per laptop (rilis 0039)
Setiap penjualan yang punya **Marketing yang Jual** otomatis mendapat komisi **Rp 50.000**; tanpa marketing = Rp 0. Berlaku di semua hitungan
(`komisiFor`/`nmKomisiSale` diganti): Dashboard (laba), Penjualan, Marketing, Penjualan Harian, Laporan Komisi. Form Tambah/Edit Marketing mengunci
komisi di Nominal Rp 50.000; form Catat Penjualan menampilkan "Komisi …: Rp 50.000 (otomatis)" saat marketing dipilih. Data tidak diubah.
Untuk mengganti besaran: ubah `KOMISI` di `komisi-otomatis/otomatis.js` → `python3 niscaya/komisi-otomatis/build_patch.py`.
## Komisi marketing dipisah dari modal & laba (rilis 0040)
Atas permintaan owner: komisi marketing **tidak** dihitung ke harga modal/biaya dan **tidak** memotong laba.
Laba = harga akhir − modal − biaya service (Dashboard, Penjualan, Penjualan Harian, rincian Dashboard). Kolom "Modal+Biaya+Komisi" kembali "Modal+Biaya".
Komisi tetap dihitung (Rp 50.000/laptop lewat marketing) dan tampil di kolom Komisi, menu Marketing, dan Laporan Komisi.
`patches/0040-komisi-terpisah.py` (edit teks idempoten, dijalankan setelah 0024/0029/0033).
## Perbaikan aplikasi mati total (rilis 0042)
Gejala: menu samping & Dashboard kosong, semua tombol tidak berfungsi. Penyebab: 0024 (laba − komisi) dan 0040 (komisi terpisah) saling
membalik di setiap putaran deploy; tiap putaran menambah satu `const _kom` di `sumSales` → `SyntaxError: Identifier '_kom' has already been declared`
sehingga skrip utama tidak jalan. Perbaikan: edit 0024 kini langsung menghasilkan versi "komisi terpisah" (tidak dibalik lagi oleh 0040),
dan 0040 merapikan duplikat lama (`const _kom`, `r.komisi`, teks "(komisi marketing dicatat terpisah)"). Diuji stabil pada 4 putaran deploy berturut-turut.
## Anti-macet & pemulihan otomatis (rilis 0043)
Melengkapi rilis 0042 (akar masalah: 0024 & 0040 saling membalik → `const _kom` ganda → menu/dashboard kosong).
**Tiga lapis pengaman:**
1. `patches/0043-pulih-otomatis.py` juga membersihkan baris `const _kom` / `r.komisi` ganda di file yang tayang.
2. Deployer: `/usr/local/bin/niscaya-cekjs` memeriksa sintaks setiap `<script>` (Node.js `--check`, dipasang otomatis; tanpa Node tetap cek `const` ganda).
   `niscaya-patch` menolak hasil patch yang rusak dan memakai versi sehat terakhir (file tayang atau cadangan terbaru yang sehat, lalu dipatch ulang).
   Berlaku juga untuk updater lama. Log: `/var/log/niscaya-deploy.log` ("RUSAK", "dipulihkan dari …").
3. Browser: skrip `/*NM-PULIH v1*/` di `<head>` — bila `#navList` kosong atau ada SyntaxError, halaman dimuat ulang tanpa cache (maks 2× per 3 menit),
   lalu tampil pemberitahuan dan coba lagi tiap 20 detik sampai server pulih. Sumber: `pulih/pulih.js` → `python3 niscaya/pulih/build_patch.py`.
## Sheet LAPORAN PENJUALAN di ekspor Excel (rilis 0044)
Ekspor Excel kini langsung terbuka di sheet **LAPORAN PENJUALAN** (setelah RINGKASAN): judul + periode, kartu ringkas (unit terjual,
lewat/tanpa marketing, total modal, total harga akhir, selisih), lalu tabel rapi: No, Tanggal Penjualan, ID Unit, Tipe Laptop, Spesifikasi,
Serial Number, Supplier, Harga Modal, Harga Jual (Akhir), Marketing ("Tanpa marketing" bila kosong); baris TOTAL memakai rumus SUBTOTAL
(ikut menyesuaikan saat difilter), judul kolom terkunci & tercetak di tiap halaman, A4 mendatar. Spek/SN/supplier diambil dari data stok unit,
modal dari nota penjualan (cadangan: harga modal stok). Sheet ini hanya laporan — impor tetap membaca sheet PENJUALAN dkk.
Sumber: `imporaman/imporaman.js` (v2, `nmLapPenjualan`) → `python3 niscaya/imporaman/build_patch.py` → `patches/0030-impor-aman.py`.
## Dashboard teknisi tema gelap-merah (rilis 0045)
Warna dashboard akun teknisi disamakan dengan tema gelap-merah aplikasi owner (#FE2E4B, #0F0E0E, #161316): rel menu kaca gelap dengan
menu aktif merah, kartu Ringkasan gelap dengan garis grafik merah, kartu "Upah saya" gradasi merah, kartu tugas & panel kanan gelap,
jendela detail/form gelap. Hanya warna — data, tombol dan fungsi tidak diubah. Blok CSS `/*DSH-MERAH v1*/` di `teknisi/teknisi.html`
(setelah `/*DSH-END*/`), plus warna grafik & ikon aktivitas di JS. Setelah mengubah: `python3 niscaya/teknisi/build_patch.py`.
## Serial Number di setiap sheet data laptop (rilis 0046)
Ekspor Excel kini memuat kolom **Serial Number** di semua sheet yang berisi data laptop: **STOK LAPTOP** (dipindah tepat setelah Tipe,
menggantikan kolom "No Seri" di ujung kanan), **PENJUALAN** dan **BIAYA UNIT** (setelah Laptop, diambil dari data stok unit), serta
**LAPORAN PENJUALAN** (sudah ada sejak 0044). Unit tanpa SN dibiarkan kosong. Impor tetap kompatibel: judul "Serial Number" dan "No Seri"
sama-sama dibaca sebagai No Seri di STOK LAPTOP; kolom SN di PENJUALAN/BIAYA UNIT hanya informasi (diabaikan saat impor).
Sumber: `imporaman/imporaman.js` (v3) → `python3 niscaya/imporaman/build_patch.py` → `patches/0030-impor-aman.py`.
## Stok terbaru paling atas (rilis 0047)
Unit stok terbaru tampil **paling atas** di menu **Stok** (Papan per kolom status & Tabel), **Label QR** (daftar dan urutan cetak) dan **Katalog WA**,
serta di sheet **STOK LAPTOP** ekspor Excel (tetap dikelompokkan per status, terbaru di atas dalam tiap status).
"Terbaru" = nomor ID terbesar (unit baru otomatis mendapat nomor berikutnya, mis. LP420 di atas LP419); nomor sama → yang ditambahkan belakangan.
Hanya urutan tampilan — `DATA.stock` yang tersimpan tidak diubah (salinan berurutan dipakai sementara selama render, pola sama dengan soldflow).
Sumber: `terbaru/terbaru.js` → `python3 niscaya/terbaru/build_patch.py` → `patches/0047-stok-terbaru.py`; ekspor di `imporaman/imporaman.js` (v4).
## Laporan Komisi hanya-baca (rilis 0048)
Tabel rincian di panel **📄 Laporan Pembagian Komisi Marketing** kini hanya-baca: baris tidak lagi bisa diklik untuk membuka form edit unit
(atribut `data-unit`, kursor tangan, dan handler `openStockModal` dihapus), sehingga data penjualan/stok tidak bisa terubah dari laporan ini.
Edit unit tetap lewat menu Stok/Penjualan. Sumber: `komisi/komisi.js` (v3) → `python3 niscaya/komisi/build_patch.py` → `patches/0038-laporan-komisi.py`.
## QR label kembali berisi link unit (rilis 0049)
Atas permintaan owner, QR label kini berisi **tautan unit saja**: `http://<server>/tapi/u/<ID>` (mis. `http://129.226.222.36/tapi/u/LP425`).
Discan kamera HP → link langsung muncul, ketuk untuk membuka halaman unit (tipe, SN, spek, harga & status terbaru). Ubah harga tidak perlu cetak ulang.
Scanner aplikasi tetap mengenali unit dari link (`scanCode`), label teks lama (rilis 0037) tetap terbaca. Label yang sudah tercetak perlu dicetak ulang agar berisi link.
Fungsi teks lama disimpan sebagai `window.qrInfoTeks`. Sumber: `soldflow/soldflow.js` v6 → `python3 niscaya/soldflow/build_patch.py` → `patches/0023-alur-terjual.py`.
