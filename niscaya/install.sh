#!/bin/bash
# Pasang auto-deploy NISCAYA MAKASSAR (sekali saja). Jalankan:  curl -fsSL https://raw.githubusercontent.com/tojiwaram-cell/akadifa/main/niscaya/install.sh | sudo bash
set -e
curl -fsSL "https://raw.githubusercontent.com/tojiwaram-cell/akadifa/main/niscaya/deploy.sh?t=$(date +%s)" -o /usr/local/bin/niscaya-deploy
chmod 755 /usr/local/bin/niscaya-deploy
echo '*/2 * * * * root /usr/local/bin/niscaya-deploy >> /var/log/niscaya-deploy.log 2>&1' > /etc/cron.d/niscaya-deploy
chmod 644 /etc/cron.d/niscaya-deploy
rm -f /etc/niscaya-deploy.conf
/usr/local/bin/niscaya-deploy | tee -a /var/log/niscaya-deploy.log
echo "File aplikasi: $(cat /etc/niscaya-deploy.conf 2>/dev/null)"
echo "SELESAI - auto-deploy aktif (cek tiap 2 menit)."
