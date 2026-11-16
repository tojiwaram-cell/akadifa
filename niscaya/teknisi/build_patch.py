#!/usr/bin/env python3
# Membuat patches/0016-teknisi.py dari file di folder teknisi/ (jalankan ulang setiap mengubah server.py/teknisi.html/owner.js)
import json, os
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(D, f), encoding="utf-8").read()
EDITS = [
 ["  {id:'supplier', label:'Supplier', ic:'◈', sub:'Data mitra pemasok'},",
  "  {id:'supplier', label:'Supplier', ic:'◈', sub:'Data mitra pemasok'},\n  {id:'teknisi', label:'Teknisi', ic:'⚒', sub:'Tugas & kinerja teknisi service ringan dan perbaikan mesin'},"],
 ["  else if(currentTab==='titip') renderTitip(c, ta);\n}",
  "  else if(currentTab==='titip') renderTitip(c, ta);\n  else if(currentTab==='teknisi') renderTeknisi(c, ta);\n}"],
 ["/* ================= TOAST ================= */",
  rd("owner.js") + "/* ================= TOAST ================= */"],
]
FILES = {"server": rd("server.py"), "page": rd("teknisi.html")}
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0016: akun teknisi terpisah (layanan /tapi + halaman /teknisi + menu Teknisi di akun master)
# Idempoten. Konfigurasi nginx dicek (nginx -t) dan dikembalikan otomatis bila gagal. Akun master tidak diubah.
import os, sys, re, json, glob, shutil, subprocess, time
path = sys.argv[1] if len(sys.argv) > 1 else ""
FILES = json.loads(__FILES__)
EDITS = json.loads(__EDITS__)
LOG = "/var/log/niscaya-deploy.log"
def log(m):
    try: open(LOG, "a").write(time.strftime("%Y-%m-%d %H:%M:%S") + " 0016: " + m + "\n")
    except Exception: pass
def put(p, content, mode=0o644):
    try:
        if open(p, encoding="utf-8").read() == content: return False
    except Exception: pass
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"; open(tmp, "w", encoding="utf-8").write(content); os.chmod(tmp, mode); os.replace(tmp, p); return True
def run(*c): return subprocess.run(list(c), capture_output=True, text=True)

UNIT = """[Unit]
Description=NISCAYA MAKASSAR layanan akun teknisi
After=network.target nginx.service

[Service]
ExecStart=/usr/bin/python3 /opt/niscaya-teknisi/server.py
DynamicUser=yes
StateDirectory=niscaya-teknisi
Restart=always
RestartSec=3
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
"""
NGX = """
    # NISCAYA teknisi (0016)
    location /tapi/ {
        proxy_pass http://127.0.0.1:8790;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 1m;
    }
    location = /teknisi { return 302 /teknisi.html; }
"""
def system():
    if os.geteuid() != 0: return
    ch = put("/opt/niscaya-teknisi/server.py", FILES["server"])
    ch = put("/etc/systemd/system/niscaya-teknisi.service", UNIT) or ch
    if ch:
        run("systemctl", "daemon-reload"); run("systemctl", "enable", "niscaya-teknisi"); run("systemctl", "restart", "niscaya-teknisi"); log("layanan teknisi dipasang/diperbarui")
    elif run("systemctl", "is-active", "niscaya-teknisi").stdout.strip() != "active":
        run("systemctl", "restart", "niscaya-teknisi"); log("layanan teknisi dijalankan ulang")
    www = "/var/www/niscaya"
    try: www = os.path.dirname(open("/etc/niscaya-deploy.conf").read().split()[0]) or www
    except Exception: pass
    if os.path.isdir(www) and put(os.path.join(www, "teknisi.html"), FILES["page"]): log("halaman teknisi diperbarui")
    confs = sorted(set(os.path.realpath(f) for f in glob.glob("/etc/nginx/sites-enabled/*") + glob.glob("/etc/nginx/conf.d/*.conf") if os.path.isfile(f)))
    texts = {}
    for f in confs:
        try: texts[f] = open(f, encoding="utf-8").read()
        except Exception: pass
    if any("location /tapi/" in t for t in texts.values()): return
    loc_api = re.compile(r"^[ \t]*location\s+(?:\^~\s+)?/api\b", re.M)
    loc_any = re.compile(r"^[ \t]*location\b", re.M)
    cand = [f for f, t in texts.items() if loc_api.search(t)] or [f for f, t in texts.items() if www in t and loc_any.search(t)]
    if len(cand) != 1: log("nginx: berkas konfigurasi tidak pasti (%d kandidat) - dilewati" % len(cand)); return
    f = cand[0]; t = texts[f]; m = loc_api.search(t) or loc_any.search(t)
    new = t[:m.start()] + NGX.lstrip("\n") + "\n" + t[m.start():]
    bak = "/var/lib/niscaya-deploy/nginx-%s.%s" % (os.path.basename(f), time.strftime("%Y%m%d%H%M%S"))
    os.makedirs("/var/lib/niscaya-deploy", exist_ok=True); shutil.copy2(f, bak)
    open(f, "w", encoding="utf-8").write(new)
    r = run("nginx", "-t")
    if r.returncode != 0:
        shutil.copy2(bak, f); log("nginx -t gagal, konfigurasi dikembalikan: " + (r.stderr or "")[-300:]); return
    run("systemctl", "reload", "nginx"); log("nginx: rute /tapi/ dan /teknisi ditambahkan ke " + f)
try: system()
except Exception as e: log("galat sistem: %s" % e)

# ---- menu Teknisi di halaman master ----
if not path or not os.path.isfile(path): sys.exit(0)
src = open(path, encoding="utf-8").read()
OWNER = EDITS[2][1][:-len("/* ================= TOAST ================= */")]
VER = OWNER.split("\n", 1)[0]
if VER in src: sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
TOAST = "/* ================= TOAST ================= */"
if "function renderTeknisi" in src:
    a = src.find("/*TEK-OWNER v")
    if a < 0: a = src.find("/* ================= TEKNISI (akun terpisah")
    z = src.find(TOAST, a)
    if a < 0 or z < 0: log("menu: blok lama tidak ditemukan - dibatalkan"); sys.exit(2)
    src = src[:a] + OWNER + src[z:]
else:
    for i, (old, new) in enumerate(EDITS, 1):
        if src.count(old) != 1: log("menu: edit %d tidak cocok - dibatalkan" % i); sys.exit(2)
        src = src.replace(old, new)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0016: menu Teknisi terpasang/diperbarui")
'''
out = tpl.replace("__FILES__", repr(json.dumps(FILES, ensure_ascii=False))).replace("__EDITS__", repr(json.dumps(EDITS, ensure_ascii=False)))
open(os.path.join(D, "..", "patches", "0016-teknisi.py"), "w", encoding="utf-8").write(out)
print("ok", len(out))
