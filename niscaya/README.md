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
