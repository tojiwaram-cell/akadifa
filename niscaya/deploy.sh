#!/bin/bash
# NISCAYA MAKASSAR auto-deploy v2 — patch idempoten, menyatu dengan updater lama (/opt/niscaya/update.sh)
set -u
BASE="${NISCAYA_BASE:-https://raw.githubusercontent.com/tojiwaram-cell/akadifa/main/niscaya}"
STATE=/var/lib/niscaya-deploy; PDIR=$STATE/patches; CONF=/etc/niscaya-deploy.conf
mkdir -p "$STATE/backup" "$PDIR"
ts(){ date '+%F %T'; }
# 1) perbarui diri sendiri
tmp=$(mktemp)
if curl -fsSL "$BASE/deploy.sh?t=$(date +%s)" -o "$tmp" && bash -n "$tmp" && grep -q 'auto-deploy v2' "$tmp" && ! cmp -s "$tmp" /usr/local/bin/niscaya-deploy; then
  install -m 755 "$tmp" /usr/local/bin/niscaya-deploy; rm -f "$tmp"; echo "$(ts) deployer diperbarui"; exec /usr/local/bin/niscaya-deploy
fi
rm -f "$tmp"
# 2) ambil daftar & file patch terbaru
if LIST=$(curl -fsSL "$BASE/patches.txt?t=$(date +%s)"); then
  for p in $LIST; do t=$(mktemp); if curl -fsSL "$BASE/patches/$p?t=$(date +%s)" -o "$t" && python3 -m py_compile "$t" 2>/dev/null; then mv "$t" "$PDIR/$p"; else rm -f "$t"; fi; done
  echo "$LIST" | grep -v deployer > "$STATE/patches.txt"
fi
# 3) pemasang patch (dipakai juga oleh updater lama)
cat > /usr/local/bin/niscaya-patch <<'EOS'
#!/bin/bash
f="$1"; S=/var/lib/niscaya-deploy
[ -f "$f" ] && [ -f "$S/patches.txt" ] || exit 0
for p in $(cat "$S/patches.txt"); do [ -f "$S/patches/$p" ] && python3 "$S/patches/$p" "$f" >/dev/null 2>&1; done
exit 0
EOS
chmod 755 /usr/local/bin/niscaya-patch
# 4) kaitkan ke updater lama agar hasil unduhannya ikut dipatch (tidak menimpa perubahan)
U=/opt/niscaya/update.sh
if [ -f "$U" ] && ! grep -q niscaya-patch "$U"; then
  sed -i 's|^cmp -s "\$T"|/usr/local/bin/niscaya-patch "$T"\ncmp -s "$T"|' "$U" && echo "$(ts) updater lama dikaitkan"
fi
# 5) terapkan ke file aplikasi yang sedang tayang
FILES=""; [ -f "$CONF" ] && FILES=$(cat "$CONF")
for f in $FILES; do [ -f "$f" ] || FILES=""; done
[ -z "$FILES" ] && [ -f /var/www/niscaya/index.html ] && FILES=/var/www/niscaya/index.html && echo "$FILES" > "$CONF"
for f in $FILES; do
  t=$(mktemp); cp "$f" "$t"; /usr/local/bin/niscaya-patch "$t"
  if ! cmp -s "$t" "$f"; then
    cp -a "$f" "$STATE/backup/$(echo "$f" | tr / _).$(date +%Y%m%d%H%M%S)"
    install -m 644 "$t" "$f.new" && mv "$f.new" "$f" && echo "$(ts) patch diterapkan ke $f"
  fi
  rm -f "$t"
done
rm -f "$STATE"/done-* 2>/dev/null
ls -1t "$STATE"/backup/* 2>/dev/null | tail -n +21 | xargs -r rm -f
# 6) pemantau cepat: cek commit terbaru tiap 5 detik (cron tiap menit), deploy penuh hanya jika versi berubah
W=/usr/local/bin/niscaya-watch; tw=$(mktemp)
cat > "$tw" <<'EOW'
#!/bin/bash
# NISCAYA watcher 5 detik v2 — cek commit terbaru via API GitHub (ETag/304, tanpa cache CDN), dipanggil cron tiap menit
exec 9>/var/lock/niscaya-watch.lock; flock -n 9 || exit 0
REPO="tojiwaram-cell/akadifa"; API="${NISCAYA_API:-https://api.github.com/repos/$REPO/commits/main}"
S=/var/lib/niscaya-deploy; mkdir -p "$S"; LOG=/var/log/niscaya-deploy.log
end=$(( $(date +%s) + 58 ))
while [ "$(date +%s)" -lt "$end" ]; do
  et=$(cat "$S/etag" 2>/dev/null)
  code=$(curl -sS -m 4 -o "$S/sha.tmp" -D "$S/hdr.tmp" -w '%{http_code}' -H "Accept: application/vnd.github.sha" -H "User-Agent: niscaya-watch" ${et:+-H "If-None-Match: $et"} "$API" 2>/dev/null)
  if [ "$code" = "200" ]; then
    sha=$(tr -dc '0-9a-f' < "$S/sha.tmp" | head -c 40)
    grep -i '^etag:' "$S/hdr.tmp" | cut -d' ' -f2- | tr -d '\r' > "$S/etag"
    if [ ${#sha} -eq 40 ] && [ "$sha" != "$(cat "$S/sha.seen" 2>/dev/null)" ]; then
      echo "$(date '+%F %T') commit baru ${sha:0:7} terdeteksi" >> "$LOG"
      if NISCAYA_BASE="${NISCAYA_RAW:-https://raw.githubusercontent.com/$REPO}/$sha/niscaya" flock -w 50 /var/lock/niscaya-deploy.lock "${NISCAYA_DEPLOY:-/usr/local/bin/niscaya-deploy}" >> "$LOG" 2>&1; then echo "$sha" > "$S/sha.seen"; fi
    fi
  fi
  sleep 5
done
EOW
if bash -n "$tw" && ! cmp -s "$tw" "$W"; then install -m 755 "$tw" "$W"; echo "$(ts) pemantau 5 detik dipasang"; fi
rm -f "$tw"
if [ -d /etc/cron.d ] && [ -z "${NISCAYA_BASE:-}" ]; then
  C1='* * * * * root /usr/local/bin/niscaya-watch >/dev/null 2>&1'
  [ "$(cat /etc/cron.d/niscaya-watch 2>/dev/null)" = "$C1" ] || { echo "$C1" > /etc/cron.d/niscaya-watch; chmod 644 /etc/cron.d/niscaya-watch; }
  C2='*/10 * * * * root flock -n /var/lock/niscaya-deploy.lock /usr/local/bin/niscaya-deploy >> /var/log/niscaya-deploy.log 2>&1'
  [ "$(cat /etc/cron.d/niscaya-deploy 2>/dev/null)" = "$C2" ] || { echo "$C2" > /etc/cron.d/niscaya-deploy; chmod 644 /etc/cron.d/niscaya-deploy; }
fi
