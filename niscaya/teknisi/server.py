#!/usr/bin/env python3
# NISCAYA MAKASSAR — layanan akun teknisi (terpisah dari akun master).
# Teknisi hanya bisa melihat & memperbarui pekerjaan miliknya. Owner dikenali lewat sesi master (/api/me).
import json, os, re, time, secrets, hashlib, hmac, threading, urllib.request
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http.cookies import SimpleCookie

PORT = int(os.environ.get("TEK_PORT", "8790"))
STATE = os.environ.get("STATE_DIRECTORY") or os.environ.get("TEK_STATE", "/var/lib/niscaya-teknisi")
DB = os.path.join(STATE, "db.json")
MASTER = os.environ.get("TEK_MASTER", "http://127.0.0.1")  # lewat nginx
LOCK = threading.Lock()
SESS = {}          # token -> {user, exp}
OWNER_CACHE = {}   # cookie-hash -> (ok, exp)
FAILS = {}         # ip -> [count, until]
ROLES = {"ringan": "Service ringan", "mesin": "Perbaikan mesin"}
STATUS = ["Antri", "Dikerjakan", "Selesai", "Gagal"]

def now(): return int(time.time())

def load():
    try:
        with open(DB, encoding="utf-8") as f: d = json.load(f)
    except Exception:
        d = {}
    d.setdefault("version", 1)
    d.setdefault("seq", 0)
    d.setdefault("jobs", [])
    acc = d.setdefault("accounts", {})
    if not acc:
        acc["teknisi-ringan"] = {"label": "Teknisi Service Ringan", "role": "ringan", "aktif": True}
        acc["teknisi-mesin"] = {"label": "Teknisi Perbaikan Mesin", "role": "mesin", "aktif": True}
    return d

def save(d):
    d["version"] = int(d.get("version", 1)) + 1
    os.makedirs(STATE, exist_ok=True)
    tmp = DB + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False)
    os.replace(tmp, DB)

def hash_pw(pw, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200000).hex()
    return salt + "$" + h

def check_pw(pw, stored):
    try:
        salt, h = stored.split("$", 1)
        return hmac.compare_digest(hash_pw(pw, salt).split("$", 1)[1], h)
    except Exception:
        return False

def s(v, n=500): return str(v if v is not None else "").strip()[:n]
def num(v):
    try: return max(0, int(round(float(v))))
    except Exception: return 0
def url(v):
    v = s(v, 800)
    return v if re.match(r"^https?://", v, re.I) else ""

def public_acc(name, a):
    return {"username": name, "label": a.get("label", name), "role": a.get("role"), "roleLabel": ROLES.get(a.get("role"), ""),
            "aktif": a.get("aktif", True), "punyaPassword": bool(a.get("pw"))}

def tech_view(j):
    keys = ["id", "unitId", "unit", "kategori", "jenis", "targetJam", "upah", "catatanOwner", "status", "dibuat", "mulai", "selesai",
            "catatanKerusakan", "hasil", "parts", "fotoSebelum", "fotoSesudah", "alasanGagal", "biayaMasuk", "diubah"]
    return {k: j.get(k) for k in keys}

class H(BaseHTTPRequestHandler):
    server_version = "niscaya-teknisi"
    def log_message(self, *a): pass

    def ip(self): return self.headers.get("X-Real-IP") or self.client_address[0]

    def send(self, code, obj, cookie=None):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if cookie: self.send_header("Set-Cookie", cookie)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 200000: return None
        if "application/json" not in (self.headers.get("Content-Type") or ""): return None
        try: return json.loads(self.rfile.read(n) or b"{}")
        except Exception: return None

    def cookies(self):
        c = SimpleCookie()
        try: c.load(self.headers.get("Cookie") or "")
        except Exception: pass
        return c

    def tech(self):
        c = self.cookies().get("tsess")
        if not c: return None
        t = SESS.get(c.value)
        if not t or t["exp"] < now(): SESS.pop(c.value, None); return None
        return t["user"]

    def owner(self):
        raw = self.headers.get("Cookie") or ""
        raw = "; ".join(p for p in raw.split(";") if not p.strip().startswith("tsess="))
        if not raw.strip(): return False
        k = hashlib.sha256(raw.encode()).hexdigest()
        hit = OWNER_CACHE.get(k)
        if hit and hit[1] > now(): return hit[0]
        ok = False
        try:
            req = urllib.request.Request(MASTER + "/api/me", headers={"Cookie": raw, "Host": self.headers.get("Host") or "localhost"})
            with urllib.request.urlopen(req, timeout=4) as r:
                ok = json.loads(r.read() or b"{}").get("loggedIn") is True
        except Exception:
            ok = False
        if len(OWNER_CACHE) > 500: OWNER_CACHE.clear()
        OWNER_CACHE[k] = (ok, now() + 30)
        return ok

    # ---------------- GET ----------------
    def do_GET(self):
        p = self.path.split("?", 1)[0]
        if p == "/tapi/me":
            u = self.tech()
            if not u: return self.send(200, {"loggedIn": False})
            with LOCK: d = load()
            a = d["accounts"].get(u)
            if not a or not a.get("aktif", True): return self.send(200, {"loggedIn": False})
            return self.send(200, {"loggedIn": True, "akun": public_acc(u, a)})
        if p == "/tapi/jobs":
            u = self.tech()
            if not u: return self.send(401, {"error": "Silakan masuk"})
            with LOCK: d = load()
            return self.send(200, {"version": d["version"], "jobs": [tech_view(j) for j in d["jobs"] if j.get("teknisi") == u]})
        if p == "/tapi/owner/state":
            if not self.owner(): return self.send(401, {"error": "Khusus akun master"})
            with LOCK: d = load()
            return self.send(200, {"version": d["version"], "accounts": [public_acc(k, v) for k, v in d["accounts"].items()], "jobs": d["jobs"], "roles": ROLES})
        if p == "/tapi/version":
            with LOCK: d = load()
            return self.send(200, {"version": d["version"]})
        return self.send(404, {"error": "tidak ditemukan"})

    # ---------------- POST ----------------
    def do_POST(self):
        p = self.path.split("?", 1)[0]
        b = self.body()
        if b is None: return self.send(400, {"error": "Permintaan tidak valid"})
        if p == "/tapi/login": return self.login(b)
        if p == "/tapi/logout":
            c = self.cookies().get("tsess")
            if c: SESS.pop(c.value, None)
            return self.send(200, {"ok": True}, "tsess=; Path=/tapi; Max-Age=0; HttpOnly; SameSite=Strict")
        m = re.match(r"^/tapi/jobs/([A-Za-z0-9-]+)$", p)
        if m: return self.tech_update(m.group(1), b)
        if p.startswith("/tapi/owner/"):
            if not self.owner(): return self.send(401, {"error": "Khusus akun master"})
            if p == "/tapi/owner/job": return self.owner_job(b)
            if p == "/tapi/owner/job-delete": return self.owner_delete(b)
            if p == "/tapi/owner/account": return self.owner_account(b)
        return self.send(404, {"error": "tidak ditemukan"})

    def login(self, b):
        ip = self.ip(); f = FAILS.get(ip, [0, 0])
        if f[1] > now(): return self.send(429, {"error": "Terlalu banyak percobaan. Coba lagi %d menit lagi." % ((f[1] - now()) // 60 + 1)})
        u, pw = s(b.get("username"), 60).lower(), str(b.get("password") or "")
        with LOCK: d = load()
        a = d["accounts"].get(u)
        if not a or not a.get("pw") or not a.get("aktif", True) or not check_pw(pw, a["pw"]):
            f[0] += 1
            if f[0] >= 5: f[0], f[1] = 0, now() + 600
            FAILS[ip] = f
            return self.send(401, {"error": "Nama akun atau kata sandi salah"})
        FAILS.pop(ip, None)
        for k in [k for k, v in SESS.items() if v["exp"] < now()]: SESS.pop(k, None)
        t = secrets.token_urlsafe(32); SESS[t] = {"user": u, "exp": now() + 30 * 86400}
        return self.send(200, {"ok": True, "akun": public_acc(u, a)}, "tsess=%s; Path=/tapi; Max-Age=%d; HttpOnly; SameSite=Strict" % (t, 30 * 86400))

    def tech_update(self, jid, b):
        u = self.tech()
        if not u: return self.send(401, {"error": "Silakan masuk"})
        with LOCK:
            d = load()
            a = d["accounts"].get(u)
            if not a or not a.get("aktif", True): return self.send(401, {"error": "Akun nonaktif"})
            j = next((x for x in d["jobs"] if x.get("id") == jid and x.get("teknisi") == u), None)
            if not j: return self.send(404, {"error": "Pekerjaan tidak ditemukan"})
            if j.get("biayaMasuk"): return self.send(409, {"error": "Pekerjaan sudah dikunci owner"})
            st = b.get("status")
            if st is not None:
                if st not in ("Dikerjakan", "Selesai", "Gagal"): return self.send(400, {"error": "Status tidak valid"})
                if st == "Dikerjakan" and not j.get("mulai"): j["mulai"] = now()
                if st in ("Selesai", "Gagal"):
                    if not j.get("mulai"): j["mulai"] = now()
                    j["selesai"] = now()
                if st == "Dikerjakan": j["selesai"] = None
                j["status"] = st
            for k in ("catatanKerusakan", "hasil", "alasanGagal"):
                if k in b: j[k] = s(b[k], 2000)
            for k in ("fotoSebelum", "fotoSesudah"):
                if k in b: j[k] = [x for x in (url(v) for v in (b[k] or [])[:6]) if x]
            if "parts" in b:
                j["parts"] = [{"nama": s(x.get("nama"), 120), "nominal": num(x.get("nominal"))} for x in (b["parts"] or [])[:30] if isinstance(x, dict) and (s(x.get("nama")) or num(x.get("nominal")))]
            j["diubah"] = now(); j["diubahOleh"] = u
            save(d)
            return self.send(200, {"ok": True, "job": tech_view(j), "version": d["version"]})

    def owner_job(self, b):
        with LOCK:
            d = load()
            jid = s(b.get("id"), 40)
            j = next((x for x in d["jobs"] if x.get("id") == jid), None) if jid else None
            if not j:
                d["seq"] = int(d.get("seq", 0)) + 1
                j = {"id": "TK%04d" % d["seq"], "dibuat": now(), "status": "Antri", "parts": [], "fotoSebelum": [], "fotoSesudah": []}
                d["jobs"].append(j)
            if "teknisi" in b:
                if b["teknisi"] not in d["accounts"]: return self.send(400, {"error": "Akun teknisi tidak dikenal"})
                j["teknisi"] = b["teknisi"]
            if not j.get("teknisi"): return self.send(400, {"error": "Pilih teknisi"})
            if "unitId" in b: j["unitId"] = s(b["unitId"], 40)
            if "unit" in b and isinstance(b["unit"], dict):
                j["unit"] = {k: s(b["unit"].get(k), 120) for k in ("id", "merek", "tipe", "processor", "ram", "ssd", "vga", "layar", "noSeri")}
            for k in ("kategori", "jenis", "catatanOwner"):
                if k in b: j[k] = s(b[k], 2000)
            if "targetJam" in b:
                try: j["targetJam"] = max(0.0, round(float(b["targetJam"]), 2))
                except Exception: j["targetJam"] = 0
            if "upah" in b: j["upah"] = num(b["upah"])
            if "status" in b and b["status"] in STATUS:
                st = b["status"]
                if st == "Antri": j["mulai"] = None; j["selesai"] = None
                if st == "Dikerjakan": j["mulai"] = j.get("mulai") or now(); j["selesai"] = None
                if st in ("Selesai", "Gagal"): j["mulai"] = j.get("mulai") or now(); j["selesai"] = j.get("selesai") or now()
                j["status"] = st
            if "biayaMasuk" in b: j["biayaMasuk"] = bool(b["biayaMasuk"])
            j["diubah"] = now(); j["diubahOleh"] = "owner"
            save(d)
            return self.send(200, {"ok": True, "job": j, "version": d["version"]})

    def owner_delete(self, b):
        with LOCK:
            d = load(); jid = s(b.get("id"), 40)
            n = len(d["jobs"]); d["jobs"] = [x for x in d["jobs"] if x.get("id") != jid]
            if len(d["jobs"]) == n: return self.send(404, {"error": "Pekerjaan tidak ditemukan"})
            save(d); return self.send(200, {"ok": True, "version": d["version"]})

    def owner_account(self, b):
        with LOCK:
            d = load()
            old = s(b.get("username"), 60).lower()
            if old not in d["accounts"]: return self.send(404, {"error": "Akun tidak ditemukan"})
            a = d["accounts"][old]
            new = s(b.get("usernameBaru") or old, 40).lower()
            if not re.match(r"^[a-z0-9][a-z0-9._-]{2,39}$", new): return self.send(400, {"error": "Nama akun 3–40 karakter: huruf kecil, angka, titik, minus, garis bawah"})
            if new != old:
                if new in d["accounts"]: return self.send(400, {"error": "Nama akun sudah dipakai"})
                d["accounts"][new] = d["accounts"].pop(old)
                for j in d["jobs"]:
                    if j.get("teknisi") == old: j["teknisi"] = new
                for k, v in list(SESS.items()):
                    if v["user"] == old: SESS.pop(k, None)
            if "label" in b and s(b["label"], 80): a["label"] = s(b["label"], 80)
            if "aktif" in b:
                a["aktif"] = bool(b["aktif"])
                if not a["aktif"]:
                    for k, v in list(SESS.items()):
                        if v["user"] == new: SESS.pop(k, None)
            pw = b.get("password")
            if pw:
                pw = str(pw)
                if len(pw) < 8: return self.send(400, {"error": "Kata sandi minimal 8 karakter"})
                a["pw"] = hash_pw(pw)
                for k, v in list(SESS.items()):
                    if v["user"] == new: SESS.pop(k, None)
            save(d)
            return self.send(200, {"ok": True, "akun": public_acc(new, a)})

if __name__ == "__main__":
    os.makedirs(STATE, exist_ok=True)
    with LOCK:
        d = load()
        if not os.path.exists(DB): save(d)
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
