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
# 3) pemeriksa sintaks JS + pemasang patch (dipakai juga oleh updater lama)
# Node.js dipakai untuk memeriksa skrip; dipasang sekali di latar belakang bila belum ada.
if ! command -v node >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1 && [ ! -f "$STATE/node-dicoba" ]; then
  touch "$STATE/node-dicoba"; (DEBIAN_FRONTEND=noninteractive nohup sh -c 'apt-get update -qq && apt-get install -y -qq nodejs' >/var/log/niscaya-node.log 2>&1 &)
  echo "$(ts) memasang nodejs (pemeriksa sintaks) di latar belakang"
fi
cat > /usr/local/bin/niscaya-cekjs <<'EOC'
#!/usr/bin/env python3
# NISCAYA cek sintaks: keluar 0 bila semua <script> inline sehat, 1 bila ada yang rusak (aplikasi akan macet).
import sys, re, subprocess, tempfile, os, shutil
src = open(sys.argv[1], encoding="utf-8", errors="replace").read()
if "<html" not in src.lower() or len(src) < 2000: print("bukan file aplikasi"); sys.exit(1)
blocks = [b for a, b in re.findall(r"<script(\b[^>]*)>(.*?)</script>", src, re.S | re.I)
          if "src=" not in a.lower() and not re.search(r"type=[\"'](application/(ld\+)?json|text/(template|html|plain)|module)", a, re.I)]
bad = []
node = shutil.which("node") or shutil.which("nodejs")
for i, b in enumerate(blocks):
    for line in b.split("\n"):
        for name in set(re.findall(r"\bconst\s+([A-Za-z_$][\w$]*)\s*=", line)):
            if len(re.findall(r"\bconst\s+" + re.escape(name) + r"\s*=", line)) > 1: bad.append("skrip %d: const %s ganda" % (i, name))
    if node:
        fd, p = tempfile.mkstemp(suffix=".js"); os.write(fd, b.encode("utf-8")); os.close(fd)
        r = subprocess.run([node, "--check", p], capture_output=True, text=True); os.unlink(p)
        if r.returncode: bad.append("skrip %d: %s" % (i, ([l for l in r.stderr.splitlines() if "Error" in l] or r.stderr.strip().splitlines() or ["?"])[0][:200]))
if bad: print("RUSAK:", "; ".join(bad[:5])); sys.exit(1)
print("sehat (%d skrip, %s)" % (len(blocks), "node" if node else "tanpa node")); sys.exit(0)
EOC
chmod 755 /usr/local/bin/niscaya-cekjs
cat > /usr/local/bin/niscaya-patch <<'EOS'
#!/bin/bash
# Pasang semua patch ke file $1, lalu periksa sintaks. Bila hasilnya rusak, file diganti versi sehat terakhir
# (file yang sedang tayang, atau cadangan terbaru yang sehat) supaya aplikasi tidak pernah macet.
f="$1"; S=/var/lib/niscaya-deploy; LOG=/var/log/niscaya-deploy.log
[ -f "$f" ] && [ -f "$S/patches.txt" ] || exit 0
for p in $(cat "$S/patches.txt"); do [ -f "$S/patches/$p" ] && python3 "$S/patches/$p" "$f" >/dev/null 2>&1; done
if ! out=$(/usr/local/bin/niscaya-cekjs "$f" 2>&1); then
  echo "$(date '+%F %T') hasil patch RUSAK ($out) - memakai versi sehat terakhir" >> "$LOG"
  live=$(head -1 /etc/niscaya-deploy.conf 2>/dev/null)
  for c in "$live" $(ls -1t "$S"/backup/* 2>/dev/null); do
    [ -n "$c" ] && [ -f "$c" ] && [ "$c" != "$f" ] || continue
    if /usr/local/bin/niscaya-cekjs "$c" >/dev/null 2>&1; then
      t2=$(mktemp); cp "$c" "$t2"
      for p in $(cat "$S/patches.txt"); do [ -f "$S/patches/$p" ] && python3 "$S/patches/$p" "$t2" >/dev/null 2>&1; done
      /usr/local/bin/niscaya-cekjs "$t2" >/dev/null 2>&1 && cp "$t2" "$f" || cp "$c" "$f"; rm -f "$t2"
      echo "$(date '+%F %T') dipulihkan dari $c" >> "$LOG"; exit 0
    fi
  done
  echo "$(date '+%F %T') tidak ada versi sehat ditemukan" >> "$LOG"
fi
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
# NISCAYA watcher 5 detik v3 — cek commit terbaru lewat git smart-HTTP (info/refs), dipanggil cron tiap menit.
# v2 memakai API GitHub tanpa token: batasnya 60 permintaan/jam per IP (respons 304 tetap dihitung), jadi habis dalam
# ±5 menit dan pemantau buta sisa jamnya. info/refs tidak memakai kuota API dan tidak tertahan cache CDN.
exec 9>/var/lock/niscaya-watch.lock; flock -n 9 || exit 0
REPO="tojiwaram-cell/akadifa"; REFS="${NISCAYA_REFS:-https://github.com/$REPO.git/info/refs?service=git-upload-pack}"
S=/var/lib/niscaya-deploy; mkdir -p "$S"; LOG=/var/log/niscaya-deploy.log
end=$(( $(date +%s) + 58 ))
while [ "$(date +%s)" -lt "$end" ]; do
  sha=$(curl -fsS -m 4 -H "User-Agent: niscaya-watch" "$REFS" 2>/dev/null | grep -ao '[0-9a-f]\{40\} refs/heads/main' | head -1 | cut -c1-40)
  if [ ${#sha} -eq 40 ]; then
    echo "$(date '+%F %T') ok ${sha:0:7}" > "$S/watch.status"
    if [ "$sha" != "$(cat "$S/sha.seen" 2>/dev/null)" ]; then
      echo "$(date '+%F %T') commit baru ${sha:0:7} terdeteksi" >> "$LOG"
      if NISCAYA_BASE="${NISCAYA_RAW:-https://raw.githubusercontent.com/$REPO}/$sha/niscaya" flock -w 50 /var/lock/niscaya-deploy.lock "${NISCAYA_DEPLOY:-/usr/local/bin/niscaya-deploy}" >> "$LOG" 2>&1; then echo "$sha" > "$S/sha.seen"; fi
    fi
  else
    echo "$(date '+%F %T') gagal cek GitHub" > "$S/watch.status"
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
