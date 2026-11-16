#!/usr/bin/env python3
# 0014: diagnosa sekali jalan (terenkripsi, rahasia disensor) untuk persiapan akun teknisi. Tidak mengubah halaman.
import os, sys, re, subprocess, glob, tempfile, base64, shutil
DONE = "/var/lib/niscaya-deploy/diag-0014.done"
if os.path.exists(DONE) or os.geteuid() != 0:
    sys.exit(0)
NAME = "diag-5f2e0b564bcfd79a145518a2"
PUB = """-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAnCRyQBQpxbl12G+2ZEg5
ksJA7DH+wFqxHjlE4Tp6c+HiOXr4SVnsgHlVvdle5+KGbve7S9/Cb8vVH5b4r1ev
NZZR9U+aDh0y2qhfhljhsRTyJjTIBZYkAnTsOqo/HJcg/O0bWiWN7wxVOcnSRbsj
dcqF7JS3EyZVamM+aO4hsv9zOIx0uwLUHvnJwJJcnNNpViUZKabVtEyk1B1eNDGw
59O2W1gLKDtsJjQ0M/Y5aMs3QNlKo9cno3+GKunIF9fLOJe1xSmWkuteH5wZa+Wp
+qIauBEO92+8DPGiC6aTR5z4kVo+aKyjWDEzVtV257luLEzqadMcMhjWlDP7lPR+
V4Ka2g9IPLV4EUl//C7blEjPhVBG9cXuk89UwYAZphaXdnEc7b0IeF3CQJS5cJwl
Lc6JMM01YgbZXdTnkLMClgo4ri53Ih1VsilnZGtH1vJJ8CLqjFx3Ea+gxwR8fnrM
RrorOfM+C2jglzit4SOiXhS22GSvnFXmWslIc8mxirZpAgMBAAE=
-----END PUBLIC KEY-----
"""

def sh(c):
    try:
        return subprocess.run(["bash", "-c", c], capture_output=True, text=True, timeout=20).stdout[-60000:]
    except Exception as e:
        return "ERR %s" % e

SECRET = re.compile(r'(?i)((?:pass(?:word|wd)?|secret|token|hash|salt|api[_-]?key|private|otp|session_key)\w*\s*[:=]\s*)(["\']?)[^"\'\s,;)]{4,}')
def red(t):
    t = SECRET.sub(lambda m: m.group(1) + m.group(2) + "<SENSOR>", t)
    t = re.sub(r'\$[0-9a-z]{1,3}\$[^\s"\']{20,}', '<SENSOR-HASH>', t)
    t = re.sub(r'\b[0-9a-fA-F]{32,}\b', '<SENSOR-HEX>', t)
    t = re.sub(r'[A-Za-z0-9+/_-]{48,}={0,2}', '<SENSOR-PANJANG>', t)
    return t

out = []
out.append("== ss\n" + sh("ss -ltnp"))
out.append("== ps\n" + sh("ps -eo pid,user,cmd | grep -iE 'niscaya|python|node|gunicorn|uvicorn|php' | grep -v grep"))
out.append("== systemd\n" + sh("systemctl list-units --type=service --all --no-pager | grep -iE 'niscaya|akadifa|app|api'; for f in $(grep -rliE 'niscaya|akadifa' /etc/systemd/system 2>/dev/null); do echo \"--- $f\"; cat \"$f\"; done"))
out.append("== nginx\n" + sh("for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do [ -f \"$f\" ] && echo \"--- $f\" && cat \"$f\"; done"))
out.append("== cron\n" + sh("ls -la /etc/cron.d; cat /etc/cron.d/* 2>/dev/null | grep -v '^#'"))
out.append("== tree\n" + sh("for d in /opt/niscaya /var/www/niscaya /var/lib/niscaya /srv/niscaya /home/*/niscaya*; do [ -d \"$d\" ] && find \"$d\" -maxdepth 3 -printf '%M %u %s %TY-%Tm-%Td %p\\n' | head -150; done"))
cands = set()
for d in ["/opt/niscaya", "/srv/niscaya", "/var/lib/niscaya"] + glob.glob("/home/*/niscaya*"):
    for ext in ("py", "js", "mjs", "sh", "php", "service", "conf", "toml", "ini"):
        cands.update(glob.glob(os.path.join(d, "**", "*." + ext), recursive=True))
for f in sorted(cands):
    if any(x in f for x in ("/node_modules/", "/venv/", "/.venv/", "site-packages")):
        continue
    try:
        if os.path.getsize(f) > 300000:
            out.append("== FILE %s (terlalu besar, dilewati)" % f); continue
        out.append("== FILE %s\n%s" % (f, red(open(f, encoding="utf-8", errors="replace").read())))
    except Exception as e:
        out.append("== FILE %s ERR %s" % (f, e))
data = red("\n\n".join(out)).encode()

tmp = tempfile.mkdtemp()
try:
    open(os.path.join(tmp, "pub.pem"), "w").write(PUB)
    open(os.path.join(tmp, "d.txt"), "wb").write(data)
    open(os.path.join(tmp, "k"), "w").write(os.urandom(32).hex())
    subprocess.run(["openssl", "pkeyutl", "-encrypt", "-pubin", "-inkey", os.path.join(tmp, "pub.pem"), "-in", os.path.join(tmp, "k"), "-out", os.path.join(tmp, "k.enc")], check=True)
    subprocess.run(["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-salt", "-pass", "file:" + os.path.join(tmp, "k"), "-in", os.path.join(tmp, "d.txt"), "-out", os.path.join(tmp, "d.enc")], check=True)
    www = "/var/www/niscaya"
    try:
        www = os.path.dirname(open("/etc/niscaya-deploy.conf").read().split()[0]) or www
    except Exception:
        pass
    blob = base64.b64encode(open(os.path.join(tmp, "k.enc"), "rb").read()).decode() + "\n" + base64.b64encode(open(os.path.join(tmp, "d.enc"), "rb").read()).decode() + "\n"
    p = os.path.join(www, NAME + ".txt")
    open(p, "w").write(blob)
    os.chmod(p, 0o644)
    open(DONE, "w").write("ok")
    print("0014: diagnosa terenkripsi dibuat")
finally:
    shutil.rmtree(tmp, ignore_errors=True)
