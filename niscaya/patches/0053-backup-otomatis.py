#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0053: BACKUP OTOMATIS (server + Google Drive). Idempoten.
# TIDAK mengubah file aplikasi (argv[1] hanya dibaca untuk memastikan ini file aplikasi).
# Memasang:
#   /usr/local/bin/niscaya-backup   -> arsip .tar.gz semua data & konfigurasi NISCAYA ke /var/backups/niscaya
#   /etc/cron.d/niscaya-backup      -> tiap 3 jam; simpan 120 arsip terakhir (~15 hari) di server
#   rclone (apt, sekali)            -> bila remote "gdrive" sudah diatur (sudo rclone config), arsip ikut dikirim
#                                      ke Google Drive folder NISCAYA-Backup (disimpan 90 hari)
# Status singkat (tanpa data): /var/www/niscaya/backup-status.txt
import sys, os, subprocess

SCRIPT = r'''#!/bin/bash
# NISCAYA backup v1 (dipasang patch 0053) — aman dijalankan kapan saja; hanya MEMBACA data aplikasi.
exec 9>/var/lock/niscaya-backup.lock; flock -n 9 || exit 0
D=/var/backups/niscaya; S=/var/lib/niscaya-backup; LOG=/var/log/niscaya-backup.log
REMOTE="gdrive:NISCAYA-Backup"; KEEP=120
mkdir -p "$D" "$S"; chmod 700 "$D"
ts(){ date '+%F %T'; }
F="$D/niscaya-$(date +%Y%m%d-%H%M).tar.gz"
P=$(ls -d /var/lib/niscaya* /opt/niscaya* /etc/niscaya* /var/www/niscaya /etc/nginx \
          /etc/systemd/system/niscaya* /etc/cron.d/niscaya* /usr/local/bin/niscaya* 2>/dev/null | grep -v '^/var/lib/niscaya-backup$')
tar czf "$F.part" --exclude=/var/lib/niscaya-deploy/backup $P 2>/dev/null; rc=$?
if [ $rc -le 1 ] && tar tzf "$F.part" >/dev/null 2>&1; then
  mv "$F.part" "$F"; chmod 600 "$F"; echo "$(ts) OK $F $(du -h "$F" | cut -f1)" >> "$LOG"
else
  rm -f "$F.part"; echo "$(ts) GAGAL membuat arsip (tar rc=$rc)" >> "$LOG"; F=""
fi
ls -1t "$D"/niscaya-*.tar.gz 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
GD="belum tersambung (jalankan: sudo rclone config, nama remote: gdrive)"
if [ -n "$F" ] && command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -qx 'gdrive:'; then
  if rclone copy "$F" "$REMOTE" >> "$LOG" 2>&1; then
    GD="tersambung, terakhir terkirim $(ts)"; echo "$(ts) terkirim ke $REMOTE" >> "$LOG"
    rclone delete "$REMOTE" --min-age 90d >> "$LOG" 2>&1 || true
  else
    GD="GAGAL kirim $(ts) - cek: sudo tail /var/log/niscaya-backup.log"; echo "$(ts) GAGAL kirim ke $REMOTE" >> "$LOG"
  fi
fi
N=$(ls -1 "$D"/niscaya-*.tar.gz 2>/dev/null | wc -l)
L=$(ls -1t "$D"/niscaya-*.tar.gz 2>/dev/null | head -1 | xargs -r basename)
if [ -d /var/www/niscaya ]; then
  printf 'NISCAYA backup otomatis (tiap 3 jam)\nDicek: %s\nBackup di server: %s file, terbaru: %s\nGoogle Drive: %s\n' \
    "$(ts)" "$N" "${L:-belum ada}" "$GD" > /var/www/niscaya/backup-status.txt.new
  chmod 644 /var/www/niscaya/backup-status.txt.new; mv /var/www/niscaya/backup-status.txt.new /var/www/niscaya/backup-status.txt
fi
tail -n 500 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
exit 0
'''
CRON = "0 */3 * * * root /usr/local/bin/niscaya-backup >/dev/null 2>&1\n"


def put(path, data, mode):
    try:
        if os.path.exists(path) and open(path, encoding="utf-8").read() == data:
            return False
        tmp = path + ".new"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(data)
        os.chmod(tmp, mode)
        os.replace(tmp, path)
        return True
    except Exception:
        return False


def bg(cmd):
    try:
        subprocess.Popen(["sh", "-c", cmd], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, start_new_session=True)
    except Exception:
        pass


def main():
    if os.geteuid() != 0 or not os.path.isdir("/etc/cron.d"):
        return
    st = "/var/lib/niscaya-backup"
    os.makedirs(st, exist_ok=True)
    changed = put("/usr/local/bin/niscaya-backup", SCRIPT, 0o755)
    put("/etc/cron.d/niscaya-backup", CRON, 0o644)
    # rclone untuk Google Drive: pasang sekali di latar belakang
    flag = os.path.join(st, "rclone-dicoba")
    if not os.path.exists(flag) and subprocess.call(["sh", "-c", "command -v rclone"], stdout=subprocess.DEVNULL) != 0:
        open(flag, "w").close()
        bg("DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rclone >/var/log/niscaya-rclone.log 2>&1 "
           "|| (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rclone) >>/var/log/niscaya-rclone.log 2>&1")
    # backup pertama langsung setelah pemasangan
    first = os.path.join(st, "pertama-selesai")
    if not os.path.exists(first) or changed:
        open(first, "w").close()
        bg("sleep 20; /usr/local/bin/niscaya-backup")
        print("0053: backup otomatis dipasang (server tiap 3 jam + Google Drive bila tersambung)")


try:
    main()
except Exception:
    pass
sys.exit(0)
