# NISCAYA MAKASSAR — saluran update otomatis VPS

VPS memeriksa `patches.txt` setiap 2 menit dan memasang patch baru ke file aplikasi (dengan backup di `/var/lib/niscaya-deploy/backup`).
Hanya berisi kode tampilan aplikasi — tidak ada data stok, akun, atau kata sandi.

Pasang sekali di VPS:
```
curl -fsSL https://raw.githubusercontent.com/tojiwaram-cell/akadifa/main/niscaya/install.sh | sudo bash
```
Log: `/var/log/niscaya-deploy.log`
