#!/usr/bin/env python3
# NISCAYA MAKASSAR — layanan akun teknisi (terpisah dari akun master).
# Teknisi hanya bisa melihat & memperbarui pekerjaan miliknya. Owner dikenali lewat sesi master (/api/me).
import json, os, re, time, secrets, hashlib, hmac, threading, urllib.request, urllib.parse, base64, html as _html
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

# Logo toko diambil dari aplikasi utama (gambar .brand-logo di index.html) agar banner login selalu sama dengan logo aplikasi.
APP_HTML = os.environ.get("TEK_APP_HTML", "/var/www/niscaya/index.html")
LOGO = {"mtime": None, "type": None, "data": None}
def app_logo():
    try: mt = os.path.getmtime(APP_HTML)
    except Exception: return LOGO
    if LOGO["mtime"] == mt: return LOGO
    try:
        h = open(APP_HTML, encoding="utf-8", errors="ignore").read()
        i = h.find('class="brand-logo"'); seg = h[max(0, i - 400000):i + 400000] if i >= 0 else h
        m = re.search(r"data:image/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)", seg) or re.search(r"data:image/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)", h)
        LOGO.update(mtime=mt, type=m.group(1), data=base64.b64decode(m.group(2))) if m else LOGO.update(mtime=mt, type=None, data=None)
    except Exception:
        pass
    return LOGO

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

# ================= Halaman publik unit & katalog (rilis 0023) =================
# Aplikasi owner mengirim cuplikan stok tanpa data rahasia (tanpa modal, supplier, pembeli) ke /tapi/owner/publik.
# QR label berisi tautan /tapi/u/<ID> sehingga status & harga yang tampil selalu yang terbaru.
PUB = os.path.join(STATE, "publik.json")
PUB_LOCK = threading.Lock()
WA_TOKO = os.environ.get("NISCAYA_WA", "628218942735")
TOKO = "NISCAYA MAKASSAR"

def pub_clean(x):
    def n(v):
        try: return max(0, int(round(float(v))))
        except Exception: return 0
    f = s(x.get("f"), 800)
    return {"i": s(x.get("i"), 60), "m": s(x.get("m"), 60), "t": s(x.get("t"), 120), "p": s(x.get("p"), 80), "r": s(x.get("r"), 40),
            "d": s(x.get("d"), 60), "l": s(x.get("l"), 60), "v": s(x.get("v"), 80), "h": n(x.get("h")), "k": n(x.get("k")), "a": n(x.get("a")),
            "s": s(x.get("s"), 20), "f": f if re.match(r"^https?://", f, re.I) else "", "j": s(x.get("j"), 10), "n": s(x.get("n"), 60)}

def pub_save(units):
    with PUB_LOCK:
        os.makedirs(STATE, exist_ok=True)
        tmp = PUB + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh: json.dump({"ts": now(), "units": units}, fh, ensure_ascii=False)
        os.replace(tmp, PUB)

def pub_load():
    try:
        with open(PUB, encoding="utf-8") as fh: d = json.load(fh)
        if isinstance(d.get("units"), list):
            return {"ts": int(d.get("ts") or 0), "units": [pub_clean(x) for x in d["units"] if isinstance(x, dict) and s(x.get("i"))]}
    except Exception: pass
    return {"ts": 0, "units": []}

# ================= Cadangan & riwayat impor (rilis 0030) =================
# Sebelum impor Excel / pemulihan, aplikasi owner mengirim salinan data lengkap ke sini (sesi master wajib).
# Disimpan di STATE/cadangan/<id>.json (30 terakhir) + indeks; riwayat impor di STATE/impor-log.json (300 terakhir).
BK_DIR = os.path.join(STATE, "cadangan")
BK_IDX = os.path.join(BK_DIR, "index.json")
LOGF = os.path.join(STATE, "impor-log.json")
BK_LOCK = threading.Lock()
BK_MAX, LOG_MAX = 30, 300

def jload(p, dflt):
    try:
        with open(p, encoding="utf-8") as fh: return json.load(fh)
    except Exception: return dflt

def jsave(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh: json.dump(obj, fh, ensure_ascii=False)
    os.replace(tmp, p)

def bk_index():
    idx = jload(BK_IDX, [])
    return [x for x in idx if isinstance(x, dict) and os.path.exists(os.path.join(BK_DIR, str(x.get("id")) + ".json"))]

def bk_meta(x):
    return {k: x.get(k) for k in ("id", "ts", "jenis", "file", "catatan", "unit", "jual", "ukuran")}

def e(v): return _html.escape(str(v if v is not None else ""), quote=True)
def rp(v): return "Rp " + "{:,}".format(int(v or 0)).replace(",", ".")
def tgl(ts):
    if not ts: return "-"
    t = time.gmtime(ts + 8 * 3600)
    bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][t.tm_mon - 1]
    return "%d %s %d, %02d.%02d WITA" % (t.tm_mday, bln, t.tm_year, t.tm_hour, t.tm_min)
def foto(u):
    m = re.search(r"drive\.google\.com/(?:file/d/|open\?id=|uc\?(?:export=\w+&)?id=)([A-Za-z0-9_-]{10,})", u or "")
    return ("https://drive.google.com/thumbnail?id=%s&sz=w1000" % m.group(1)) if m else (u or "")
def wa(text): return "https://wa.me/%s?text=%s" % (WA_TOKO, urllib.parse.quote(text))
def nama(u): return (u["m"] + " " + u["t"]).strip() or u["i"]

CSS = """*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f4f5fb;color:#1c1f2e}
a{color:inherit}.top{background:linear-gradient(135deg,#4c2bd9,#7b3fe4);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:10px}
.top img{width:34px;height:34px;border-radius:8px;object-fit:cover;background:#fff}.top b{font-size:17px;letter-spacing:.5px}.top small{display:block;opacity:.8;font-size:12px}
.wrap{max-width:980px;margin:0 auto;padding:16px}.card{background:#fff;border-radius:16px;box-shadow:0 4px 18px rgba(30,20,90,.08);overflow:hidden}
.ph{width:100%;aspect-ratio:4/3;object-fit:cover;background:#eceaf8;display:block}.noph{width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:#eceaf8;font-size:52px}
.pad{padding:16px}.chip{display:inline-block;padding:5px 12px;border-radius:99px;font-weight:700;font-size:13px}
.ok{background:#dcfce7;color:#166534}.bk{background:#ffedd5;color:#9a3412}.sd{background:#fee2e2;color:#991b1b}
h1{font-size:22px;margin:10px 0 4px}h2{font-size:17px;margin:22px 0 10px}.id{color:#6b6f85;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:8px 0;border-bottom:1px solid #eef0f6;font-size:14px}td:first-child{color:#6b6f85;width:38%}
.price{font-size:26px;font-weight:800;color:#4c2bd9;margin-top:12px}.old{text-decoration:line-through;color:#9aa0b4;font-size:14px;margin-right:6px}
.btn{display:block;text-align:center;text-decoration:none;background:#16a34a;color:#fff;font-weight:700;padding:13px;border-radius:12px;margin-top:14px}
.btn.alt{background:#fff;color:#4c2bd9;border:2px solid #4c2bd9}.note{background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:12px;margin-top:12px;font-size:14px}
.note.red{background:#fef2f2;border-color:#fecaca}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:12px}
.it{text-decoration:none;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(30,20,90,.07);display:flex;flex-direction:column}
.it .pad{padding:10px}.it b{font-size:14px;display:block}.it span{font-size:12px;color:#6b6f85;display:block;margin-top:3px}.it .pr{color:#4c2bd9;font-weight:800;font-size:15px;margin-top:6px}
.foot{color:#8a8fa6;font-size:12px;text-align:center;margin:22px 0 10px}.bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.bar input,.bar select{flex:1;min-width:150px;padding:11px 12px;border:1px solid #d9dcea;border-radius:10px;font-size:15px;background:#fff}
.own{background:#f5f3ff;border:2px solid #7b3fe4;border-radius:14px;padding:12px 14px;margin-top:14px}.ownh{font-weight:800;color:#4c2bd9}.ownh small{font-weight:500;color:#6b6f85}
.own table{margin-top:6px}.own td{border-bottom-color:#e4defc}
@media(min-width:760px){.two{display:grid;grid-template-columns:1.1fr 1fr;gap:0}.two .ph,.two .noph{height:100%;aspect-ratio:auto;min-height:340px}}"""

def shell(title, body):
    return ("<!DOCTYPE html><html lang=\"id\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<meta name=\"robots\" content=\"noindex\"><title>%s</title><style>%s</style></head><body>"
            "<div class=\"top\"><img src=\"/tapi/logo\" alt=\"\" onerror=\"this.remove()\"><div><b>%s</b><small>Laptop second berkualitas · Makassar</small></div></div>"
            "<div class=\"wrap\">%s</div></body></html>") % (e(title), CSS, TOKO, body)

def img(u, cls="ph"):
    src = foto(u.get("f"))
    return ("<img class=\"%s\" loading=\"lazy\" src=\"%s\" alt=\"\" onerror=\"this.outerHTML='<div class=&quot;noph&quot;>💻</div>'\">" % (cls, e(src))) if src else "<div class=\"noph\">💻</div>"

def mini(u):
    return ("<a class=\"it\" href=\"/tapi/u/%s\">%s<div class=\"pad\"><b>%s</b><span>%s</span><div class=\"pr\">%s</div></div></a>"
            % (urllib.parse.quote(u["i"]), img(u), e(nama(u)), e(" · ".join(x for x in (u["p"], u["r"], u["d"]) if x)), rp(u["a"] or u["h"]) if (u["a"] or u["h"]) else "Tanya harga"))

def mirip(units, u, n=6):
    ready = [x for x in units if x["s"] == "Ready" and x["i"] != (u or {}).get("i")]
    if not u: return ready[:n]
    harga = u["a"] or u["h"] or 0
    def skor(x):
        sk = 0 if x["m"].lower() == u["m"].lower() else 1
        hx = x["a"] or x["h"]
        return (sk + (abs(hx - harga) / harga if harga and hx else 1), hx or 10**12)
    return sorted(ready, key=skor)[:n]

# Rilis 0032: bila yang membuka tautan QR adalah owner yang sedang login (sesi master di browser yang sama),
# halaman unit menampilkan kartu "Khusus owner" berisi harga modal, biaya, harga akhir & perkiraan untung.
# Data rahasia diambil langsung dari /api/data saat itu juga (tidak pernah disimpan di publik.json).
def own_to_pub(o):
    return pub_clean({"i": o.get("id"), "m": o.get("merek"), "t": o.get("tipe"), "p": o.get("processor"), "r": o.get("ram"), "d": o.get("ssd"),
                      "l": o.get("layar"), "v": o.get("vga"), "h": o.get("hargaJual"), "k": o.get("diskon"),
                      "a": max(0, num(o.get("hargaJual")) - num(o.get("diskon"))), "s": o.get("status"), "f": o.get("linkFoto"), "n": o.get("noSeri")})

def owner_card(u, o):
    modal = num(o.get("hargaModal")); biaya = sum(num(b.get("nominal")) for b in (o.get("biaya") or []) if isinstance(b, dict))
    jual = num(o.get("hargaJual")); disk = num(o.get("diskon"))
    akhir = (u or {}).get("a") or max(0, jual - disk)
    tot = modal + biaya; untung = akhir - tot if akhir else None
    rows = [("Harga modal", rp(modal) if modal else "-")]
    if biaya: rows += [("Biaya service/part", rp(biaya)), ("Total modal", rp(tot))]
    if disk and jual: rows += [("Harga jual normal", rp(jual)), ("Diskon", "− " + rp(disk))]
    rows.append(("<b>Harga akhir</b>", "<b>%s</b>" % (rp(akhir) if akhir else "Belum diisi")))
    if untung is not None: rows.append(("Perkiraan untung", "<b style=\"color:%s\">%s%s</b>" % ("#15803d" if untung >= 0 else "#dc2626", "− " if untung < 0 else "", rp(abs(untung)))))
    if o.get("supplier"): rows.append(("Supplier", e(o.get("supplier"))))
    return ("<div class=\"own\"><div class=\"ownh\">🔒 Khusus owner <small>— hanya tampil karena Anda sedang login</small></div><table>%s</table></div>"
            % "".join("<tr><td>%s</td><td>%s</td></tr>" % r for r in rows))

def page_unit(pub, u, uid, own=None):
    if own and not u: u = own_to_pub(own)
    units = pub["units"]; upd = "<div class=\"foot\">Data stok diperbarui %s</div>" % e(tgl(pub.get("ts")))
    kat = "<a class=\"btn alt\" href=\"/tapi/katalog\">Lihat semua laptop yang tersedia</a>"
    if not u:
        body = ("<div class=\"card pad\"><span class=\"chip sd\">Tidak ditemukan</span><h1>Unit %s tidak ada di daftar stok</h1>"
                "<p class=\"id\">Mungkin kodenya salah atau unit sudah dikeluarkan dari stok.</p>%s<a class=\"btn\" href=\"%s\">Tanya via WhatsApp</a></div>%s"
                % (e(uid), kat, e(wa("Halo %s, saya mau tanya unit %s." % (TOKO, uid))), upd))
        return shell("Unit tidak ditemukan · " + TOKO, body)
    st = u["s"]
    spek = "".join("<tr><td>%s</td><td>%s</td></tr>" % (k, e(v)) for k, v in
                   (("Merek", u["m"]), ("Tipe laptop", u["t"]), ("SN", u.get("n") or "-"), ("Prosesor", u["p"]), ("RAM", u["r"]), ("Penyimpanan", u["d"]), ("Layar", u["l"]), ("VGA", u["v"])) if v)
    if st == "Ready":
        chip = "<span class=\"chip ok\">✅ Tersedia</span>"
        harga = ("<div class=\"price\">%s%s</div>" % (("<span class=\"old\">%s</span>" % rp(u["h"])) if u["k"] and u["h"] > u["a"] else "", rp(u["a"] or u["h"]))) if (u["a"] or u["h"]) else ""
        aksi = (harga or "<div class=\"price\" style=\"font-size:18px\">Harga: tanya via WhatsApp</div>") + "<a class=\"btn\" href=\"%s\">💬 Tanya / pesan unit ini via WhatsApp</a>" % e(wa("Halo %s, saya tertarik dengan unit %s (%s). Apakah masih tersedia?" % (TOKO, u["i"], nama(u))))
        lain, judul = mirip(units, u, 4), "Pilihan lain yang mirip"
    elif st in ("Booking", "DP"):
        chip = "<span class=\"chip bk\">🕓 Sudah dipesan</span>"
        aksi = ("<div class=\"note\">Unit ini sedang dipesan pembeli lain. Kalau pesanan batal, kami bisa kabari Anda.</div>"
                "<a class=\"btn\" href=\"%s\">💬 Kabari saya jika unit ini batal dipesan</a>" % e(wa("Halo %s, tolong kabari saya jika unit %s (%s) batal dipesan. Terima kasih." % (TOKO, u["i"], nama(u)))))
        lain, judul = mirip(units, u, 6), "Unit serupa yang masih tersedia"
    else:
        chip = "<span class=\"chip sd\">❌ Sudah terjual</span>"
        aksi = ("<div class=\"note red\">Maaf, unit ini <b>sudah terjual</b>. Lihat laptop serupa yang masih tersedia di bawah, atau tanyakan stok terbaru ke kami.</div>"
                "<a class=\"btn\" href=\"%s\">💬 Cari unit serupa via WhatsApp</a>" % e(wa("Halo %s, unit %s (%s) sudah terjual. Ada unit serupa yang masih tersedia?" % (TOKO, u["i"], nama(u)))))
        lain, judul = mirip(units, u, 6), "Unit serupa yang masih tersedia"
    body = ("<div class=\"card two\">%s<div class=\"pad\">%s<h1>%s</h1><div class=\"id\">Kode unit: %s</div><table>%s</table>%s%s</div></div>"
            % (img(u), chip, e(nama(u)), e(u["i"]), spek, owner_card(u, own) if own else "", aksi))
    if lain: body += "<h2>%s</h2><div class=\"grid\">%s</div>" % (judul, "".join(mini(x) for x in lain))
    body += kat + upd
    return shell(nama(u) + " · " + TOKO, body)

def page_katalog(pub):
    ready = sorted([x for x in pub["units"] if x["s"] == "Ready"], key=lambda x: (x["m"].lower(), x["a"] or x["h"] or 10**12))
    merek = sorted({x["m"] for x in ready if x["m"]}, key=str.lower)
    data = json.dumps([[x["i"], (nama(x) + " " + x["p"] + " " + x["r"] + " " + x["d"]).lower(), x["m"], x["a"] or x["h"]] for x in ready], ensure_ascii=False).replace("</", "<\\/")
    body = ("<h1>Laptop tersedia (<span id=\"n\">%d</span>)</h1><p class=\"id\">Semua unit di halaman ini masih tersedia. Unit yang sudah dipesan atau terjual otomatis hilang.</p>"
            "<div class=\"bar\"><input id=\"q\" placeholder=\"Cari merek, tipe, prosesor…\"><select id=\"mk\"><option value=\"\">Semua merek</option>%s</select>"
            "<select id=\"so\"><option value=\"\">Urutkan: merek</option><option value=\"1\">Harga termurah</option><option value=\"2\">Harga termahal</option></select></div>"
            "<div class=\"grid\" id=\"g\">%s</div><div class=\"foot\">Data stok diperbarui %s</div>"
            "<script>(function(){var D=%s,g=document.getElementById('g'),q=document.getElementById('q'),mk=document.getElementById('mk'),so=document.getElementById('so'),n=document.getElementById('n');"
            "var el={};[].forEach.call(g.children,function(c,i){el[D[i][0]]=c});"
            "function f(){var t=q.value.toLowerCase().trim().split(/\\s+/),m=mk.value,o=so.value,L=D.filter(function(d){return(!m||d[2]===m)&&t.every(function(w){return d[1].indexOf(w)>=0})});"
            "if(o)L=L.slice().sort(function(a,b){var x=a[3]||(o==='1'?1e15:-1),y=b[3]||(o==='1'?1e15:-1);return o==='1'?x-y:y-x});[].forEach.call(g.children,function(c){c.style.display='none'});"
            "L.forEach(function(d){var c=el[d[0]];c.style.display='';g.appendChild(c)});n.textContent=L.length}q.oninput=f;mk.onchange=f;so.onchange=f})();</script>"
            % (len(ready), "".join("<option>%s</option>" % e(m) for m in merek), "".join(mini(x) for x in ready) or "<p>Belum ada data stok.</p>", e(tgl(pub.get("ts"))), data))
    return shell("Katalog laptop · " + TOKO, body)

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

    def html(self, code, text):
        b = text.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def owner_publik(self, b):
        units = b.get("units")
        if not isinstance(units, list) or len(units) > 5000: return self.send(400, {"error": "Data tidak valid"})
        clean = [pub_clean(x) for x in units if isinstance(x, dict) and s(x.get("i"), 60)]
        if not clean and units: return self.send(400, {"error": "Data tidak valid"})
        pub_save(clean)
        return self.send(200, {"ok": True, "jumlah": len(clean)})

    # ---------------- cadangan & riwayat impor ----------------
    def owner_backup(self, b):
        data = b.get("data")
        if not isinstance(data, dict) or not isinstance(data.get("stock"), list): return self.send(400, {"error": "Data cadangan tidak valid"})
        bid = time.strftime("%Y%m%d-%H%M%S") + "-" + secrets.token_hex(3)
        raw = json.dumps(data, ensure_ascii=False)
        meta = {"id": bid, "ts": now(), "jenis": s(b.get("jenis"), 30) or "manual", "file": s(b.get("file"), 160), "catatan": s(b.get("catatan"), 300),
                "unit": len(data.get("stock") or []), "jual": len(data.get("sales") or []), "ukuran": len(raw.encode())}
        with BK_LOCK:
            os.makedirs(BK_DIR, exist_ok=True)
            tmp = os.path.join(BK_DIR, bid + ".json.tmp")
            with open(tmp, "w", encoding="utf-8") as fh: fh.write(json.dumps({"meta": meta, "data": data}, ensure_ascii=False))
            os.replace(tmp, os.path.join(BK_DIR, bid + ".json"))
            idx = bk_index() + [meta]
            while len(idx) > BK_MAX:
                old = idx.pop(0)
                try: os.remove(os.path.join(BK_DIR, str(old.get("id")) + ".json"))
                except Exception: pass
            jsave(BK_IDX, idx)
        return self.send(200, {"ok": True, "id": bid, "meta": meta})

    def owner_log(self, b):
        rinc = b.get("rincian") if isinstance(b.get("rincian"), list) else []
        ring = b.get("ringkasan") if isinstance(b.get("ringkasan"), dict) else {}
        ent = {"id": secrets.token_hex(5), "ts": now(), "jenis": s(b.get("jenis"), 30) or "impor", "file": s(b.get("file"), 160),
               "backupId": s(b.get("backupId"), 40), "judul": s(b.get("judul"), 200),
               "ringkasan": {s(k, 40): num(v) for k, v in list(ring.items())[:20]},
               "rincian": [s(x, 300) for x in rinc[:400]]}
        with BK_LOCK:
            lg = jload(LOGF, [])
            if not isinstance(lg, list): lg = []
            lg.append(ent); lg = lg[-LOG_MAX:]
            jsave(LOGF, lg)
        return self.send(200, {"ok": True, "id": ent["id"]})

    def body(self, limit=200000):
        n = int(self.headers.get("Content-Length") or 0)
        if n > limit: return None
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

    def owner_unit(self, uid):
        """Data lengkap unit dari /api/data memakai cookie master pembuka halaman; None bila bukan owner / gagal."""
        raw = "; ".join(p for p in (self.headers.get("Cookie") or "").split(";") if not p.strip().startswith("tsess="))
        if not raw.strip() or not self.owner(): return None
        try:
            req = urllib.request.Request(MASTER + "/api/data", headers={"Cookie": raw, "Host": self.headers.get("Host") or "localhost"})
            with urllib.request.urlopen(req, timeout=5) as r: j = json.loads(r.read() or b"{}")
            st = ((j.get("data") if isinstance(j.get("data"), dict) else j) or {}).get("stock") or []
            return next((x for x in st if isinstance(x, dict) and str(x.get("id", "")).lower() == uid.lower()), None)
        except Exception:
            return None

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
        if p == "/tapi/owner/backups":
            if not self.owner(): return self.send(401, {"error": "Khusus akun master"})
            with BK_LOCK: idx = bk_index()
            return self.send(200, {"items": [bk_meta(x) for x in reversed(idx)]})
        mb = re.match(r"^/tapi/owner/backup/([0-9a-f-]{10,40})$", p)
        if mb:
            if not self.owner(): return self.send(401, {"error": "Khusus akun master"})
            d = jload(os.path.join(BK_DIR, mb.group(1) + ".json"), None)
            if not d: return self.send(404, {"error": "Cadangan tidak ditemukan"})
            return self.send(200, d)
        if p == "/tapi/owner/log":
            if not self.owner(): return self.send(401, {"error": "Khusus akun master"})
            with BK_LOCK: lg = jload(LOGF, [])
            if not isinstance(lg, list): lg = []
            return self.send(200, {"items": list(reversed(lg))})
        if p == "/tapi/logo":
            lg = app_logo()
            if not lg["data"]: return self.send(404, {"error": "logo tidak ada"})
            self.send_response(200)
            self.send_header("Content-Type", "image/" + lg["type"])
            self.send_header("Cache-Control", "public, max-age=600")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(lg["data"])))
            self.end_headers(); self.wfile.write(lg["data"]); return
        if p == "/tapi/katalog" or p == "/tapi/katalog/":
            return self.html(200, page_katalog(pub_load()))
        m = re.match(r"^/tapi/u/([A-Za-z0-9._%-]{1,60})/?$", p)
        if m:
            uid = urllib.parse.unquote(m.group(1))
            pub = pub_load(); u = next((x for x in pub["units"] if x["i"].lower() == uid.lower()), None)
            own = self.owner_unit(uid)
            return self.html(200 if (u or own) else 404, page_unit(pub, u, uid, own))
        if p == "/tapi/version":
            with LOCK: d = load()
            return self.send(200, {"version": d["version"]})
        return self.send(404, {"error": "tidak ditemukan"})

    # ---------------- POST ----------------
    def do_POST(self):
        p = self.path.split("?", 1)[0]
        b = self.body(990000 if p in ("/tapi/owner/publik", "/tapi/owner/backup") else 200000)
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
            if p == "/tapi/owner/publik": return self.owner_publik(b)
            if p == "/tapi/owner/backup": return self.owner_backup(b)
            if p == "/tapi/owner/log": return self.owner_log(b)
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
