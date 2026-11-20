#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0054: sambungkan backup (0053) ke Google Drive tanpa konsol. Idempoten.
# TIDAK mengubah file aplikasi.
# 1) Server membuat kunci RSA sendiri (/var/lib/niscaya-backup/gd-key.pem, hanya root) dan menayangkan
#    KUNCI PUBLIK di /backup-pub.pem.
# 2) Kode izin Google (OAuth, scope drive.file) dikirim lewat repo dalam bentuk TERENKRIPSI dengan kunci publik itu
#    (konstanta BLOB). Hanya server ini yang bisa membukanya; kode sekali pakai & kedaluwarsa ±10 menit.
# 3) Server menukar kode -> token, menulis remote "gdrive" ke /root/.config/rclone/rclone.conf, lalu menjalankan backup.
# Token tidak pernah keluar dari server. Status: /backup-gdrive.txt
import sys, os, subprocess, hashlib, json, base64, urllib.request, urllib.parse, datetime, re

BLOB = ""
ST = "/var/lib/niscaya-backup"
KEY = ST + "/gd-key.pem"
WEB = "/var/www/niscaya"
REDIRECT = "http://127.0.0.1:53682/"
CLIENT_ID = "202264815644.apps.googleusercontent.com"
# rahasia klien publik milik rclone, tersamar dengan algoritma "obscure" rclone (sumber terbuka)
OBSCURED = "eX8GpZTVx3vxMWVkuuBdDWmAUE6rGhTwVrvG9GhllYccSdj2-mvHVg"
OKEY = "9c935b48730a554d6bfd7c63c886a92bd390198eb8128afbf4de162b8b95f638"


def sh(args, data=None):
    return subprocess.run(args, input=data, capture_output=True)


def status(msg):
    if os.path.isdir(WEB):
        try:
            rc = sh(["sh", "-c", "rclone version 2>/dev/null | head -1"]).stdout.decode().strip() or "belum terpasang"
            with open(WEB + "/backup-gdrive.txt.new", "w") as f:
                f.write("NISCAYA - sambungan Google Drive\n%s\nWaktu: %s\nrclone: %s\n" % (
                    msg, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), rc))
            os.chmod(WEB + "/backup-gdrive.txt.new", 0o644)
            os.replace(WEB + "/backup-gdrive.txt.new", WEB + "/backup-gdrive.txt")
        except Exception:
            pass


def reveal():
    raw = base64.urlsafe_b64decode(OBSCURED + "=" * (-len(OBSCURED) % 4))
    r = sh(["openssl", "enc", "-d", "-aes-256-ctr", "-K", OKEY, "-iv", raw[:16].hex()], raw[16:])
    return r.stdout.decode()


def write_conf(tok):
    d = "/root/.config/rclone"
    os.makedirs(d, exist_ok=True)
    p = d + "/rclone.conf"
    old = open(p).read() if os.path.exists(p) else ""
    old = re.sub(r"(?ms)^\[gdrive\]\n.*?(?=^\[|\Z)", "", old).strip()
    sec = "[gdrive]\ntype = drive\nscope = drive.file\ntoken = %s\n" % json.dumps(tok, separators=(",", ":"))
    txt = (old + "\n\n" if old else "") + sec
    with open(p + ".new", "w") as f:
        f.write(txt)
    os.chmod(p + ".new", 0o600)
    os.replace(p + ".new", p)


def main():
    if os.geteuid() != 0:
        return
    os.makedirs(ST, exist_ok=True)
    os.chmod(ST, 0o700)
    if not os.path.exists(KEY):
        sh(["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048", "-out", KEY])
        if os.path.exists(KEY):
            os.chmod(KEY, 0o600)
    if os.path.exists(KEY) and os.path.isdir(WEB):
        pub = sh(["openssl", "pkey", "-in", KEY, "-pubout"]).stdout.decode()
        pp = WEB + "/backup-pub.pem"
        if pub and (not os.path.exists(pp) or open(pp).read() != pub):
            with open(pp, "w") as f:
                f.write(pub)
            os.chmod(pp, 0o644)
    if not BLOB:
        if not os.path.exists(WEB + "/backup-gdrive.txt"):
            status("Status: menunggu izin Google (kunci publik siap di /backup-pub.pem)")
        return
    flag = ST + "/gd-" + hashlib.sha256(BLOB.encode()).hexdigest()[:16]
    if os.path.exists(flag):
        return
    open(flag, "w").close()  # kode sekali pakai: hanya dicoba satu kali
    r = sh(["openssl", "pkeyutl", "-decrypt", "-inkey", KEY, "-pkeyopt", "rsa_padding_mode:oaep",
            "-pkeyopt", "rsa_oaep_md:sha256"], base64.b64decode(BLOB))
    code = r.stdout.decode().strip()
    if r.returncode or not code:
        status("Status: GAGAL membuka kode izin (kunci tidak cocok)")
        return
    body = urllib.parse.urlencode({"code": code, "client_id": CLIENT_ID, "client_secret": reveal(),
                                   "redirect_uri": REDIRECT, "grant_type": "authorization_code"}).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body), timeout=30) as resp:
            t = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode()).get("error_description") or e.reason
        except Exception:
            err = e.reason
        status("Status: GAGAL menukar kode izin Google (%s). Minta izin ulang." % err)
        return
    except Exception as e:
        status("Status: GAGAL menghubungi Google (%s)" % type(e).__name__)
        return
    if not t.get("refresh_token"):
        status("Status: GAGAL - Google tidak memberi refresh token. Minta izin ulang.")
        return
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=int(t.get("expires_in", 3600)) - 60)
    write_conf({"access_token": t["access_token"], "token_type": "Bearer", "refresh_token": t["refresh_token"],
                "expiry": exp.strftime("%Y-%m-%dT%H:%M:%SZ")})
    status("Status: TERSAMBUNG ke Google Drive (folder NISCAYA-Backup). Backup dikirim tiap hari.")
    subprocess.Popen(["sh", "-c", "sleep 5; rclone mkdir gdrive:NISCAYA-Backup >/dev/null 2>&1; /usr/local/bin/niscaya-backup"],
                     stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    print("0054: Google Drive tersambung")


try:
    main()
except Exception:
    pass
sys.exit(0)
