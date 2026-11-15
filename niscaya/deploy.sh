#!/bin/bash
# NISCAYA MAKASSAR auto-deploy v2 — patch idempoten, menyatu dengan updater lama (/opt/niscaya/update.sh)
set -u
BASE="https://raw.githubusercontent.com/tojiwaram-cell/akadifa/main/niscaya"
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
