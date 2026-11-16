# NISCAYA MAKASSAR — saluran update otomatis VPS

Deployer v2 (`/usr/local/bin/niscaya-deploy`, cron tiap 2 menit) memperbarui dirinya sendiri, mengunduh patch di `patches.txt`,
lalu memasangnya ke `/var/www/niscaya/index.html`. Patch idempoten (aman dijalankan berulang).
Updater lama (`/opt/niscaya/update.sh`, tiap 5 menit) dikaitkan: hasil unduhannya ikut dipatch sebelum dipasang, jadi tidak menimpa perubahan.
Hanya berisi kode tampilan — tidak ada data stok, akun, atau kata sandi. Backup: `/var/lib/niscaya-deploy/backup` (20 terakhir). Log: `/var/log/niscaya-deploy.log`.

## Pemantau 5 detik (sejak rilis 0010)
`/usr/local/bin/niscaya-watch` (cron tiap menit, berputar ±58 detik) mengecek `version.txt` setiap 5 detik.
Jika isinya berubah, deployer langsung dijalankan. Deployer penuh tetap berjalan tiap 10 menit sebagai cadangan.
**Setiap rilis WAJIB menaikkan isi `version.txt`** (mis. 0010 → 0011), kalau tidak VPS baru memasang lewat cadangan 10 menit.
