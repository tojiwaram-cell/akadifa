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
