#!/bin/bash
# NISCAYA MAKASSAR auto-deploy: cek patch baru di GitHub, pasang ke file aplikasi di VPS.
set -u
BASE="https://raw.githubusercontent.com/tojiwaram-cell/akadifa/main/niscaya"
STATE=/var/lib/niscaya-deploy
CONF=/etc/niscaya-deploy.conf
mkdir -p "$STATE/backup"
find_app() {
  grep -rlsF --include='*.html' 'NISCAYA MAKASSAR' /var/www /opt /srv /home /root /usr/share/nginx 2>/dev/null \
    | xargs -r grep -lF 'function showLogin' 2>/dev/null \
    | grep -v -e '\.bak' -e '/niscaya-deploy/' -e '/node_modules/' -e '/\.cache/'
}
FILES=""
[ -f "$CONF" ] && FILES=$(cat "$CONF")
for f in $FILES; do [ -f "$f" ] || FILES=""; done
if [ -z "$FILES" ]; then FILES=$(find_app); echo "$FILES" > "$CONF"; fi
if [ -z "$FILES" ]; then echo "$(date '+%F %T') file aplikasi tidak ditemukan"; exit 1; fi
LIST=$(curl -fsSL "$BASE/patches.txt?t=$(date +%s)") || exit 0
changed=0
for p in $LIST; do
  [ -f "$STATE/done-$p" ] && continue
  tmp=$(mktemp)
  curl -fsSL "$BASE/patches/$p?t=$(date +%s)" -o "$tmp" || { rm -f "$tmp"; continue; }
  ok=1
  for f in $FILES; do
    cp -a "$f" "$STATE/backup/$(echo "$f" | tr / _).$(date +%Y%m%d%H%M%S)"
    python3 "$tmp" "$f" || ok=0
  done
  rm -f "$tmp"
  if [ $ok = 1 ]; then touch "$STATE/done-$p"; changed=1; echo "$(date '+%F %T') terpasang: $p -> $FILES"; else echo "$(date '+%F %T') GAGAL: $p"; fi
done
if [ $changed = 1 ]; then
  sleep 1
  if ! curl -fsS --max-time 5 http://127.0.0.1/ 2>/dev/null | grep -q 'cp-page'; then
    for s in $(systemctl list-units --type=service --no-legend 2>/dev/null | awk '{print $1}' | grep -i -e niscaya -e akadifa -e manager); do
      systemctl restart "$s" && echo "$(date '+%F %T') restart $s"
    done
  fi
fi
