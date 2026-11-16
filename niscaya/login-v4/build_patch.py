#!/usr/bin/env python3
# Membuat patches/0021-login-ungu-3d.py (login owner) dan memperbarui teknisi/teknisi.html (login teknisi) dari nm.py,
# lalu menjalankan teknisi/build_patch.py agar patches/0016-teknisi.py ikut membawa halaman teknisi baru.
import json, os, re, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import nm
ROOT = os.path.join(D, "..")
CFG = dict(CSS=nm.CSS.strip("\n"), LOGOUT=nm.LOGOUT_CSS.strip("\n"), ART=nm.art())
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0021: login owner gaya ungu "Business Startup" + laptop 3D bergoyang, tampil penuh hingga Full HD/4K.
# Dipasang SETELAH 0017 (memakai kerangka cb-*). Hanya tampilan; logika login tidak disentuh. Idempoten.
import sys, json
C = json.loads(__CFG__)
path = sys.argv[1]; src = open(path, encoding="utf-8").read()
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
orig = src
def put_block(s, start, end, block, anchor_after=None, anchor_before=None):
    a = s.find(start)
    if a >= 0:
        z = s.find(end, a)
        if z < 0: return None
        return s[:a] + block + s[z + len(end):]
    if anchor_after is not None:
        i = s.find(anchor_after)
        if i < 0: return None
        i += len(anchor_after); return s[:i] + block + "\n" + s[i:]
    j = s.find(anchor_before[0]); k = s.find(anchor_before[1], j) if j >= 0 else -1
    if k < 0: return None
    return s[:k] + "\n" + block + "\n" + s[k:]
if "/*CB-LOGIN v2*/" not in src:
    print("0021: login 0017 belum terpasang - dilewati"); sys.exit(0)
s2 = put_block(src, "/*NM-LOGIN v4*/", "/*NM-END*/", C["CSS"], anchor_before=("/*CB-LOGIN v2*/", "`;"))
if s2 is None: print("0021: blok CSS login tidak ditemukan - dilewati"); sys.exit(0)
s3 = put_block(s2, "/*NM-LOGOUT v4*/", "/*NM-LOGOUT-END*/", C["LOGOUT"], anchor_after="#logoutDlg .lo-yes{background:#1a33ff}#logoutDlg .lo-yes:hover{background:#1226d6}\n")
if s3 is not None: s2 = s3
a = s2.find('<section class="cb-art"'); z = s2.find('<section class="cb-side">', a)
if a < 0 or z < 0 or s2.count('<section class="cb-art"') != 1:
    print("0021: ilustrasi login tidak ditemukan - dilewati"); sys.exit(0)
s2 = s2[:a] + C["ART"] + "\n      " + s2[z:]
if s2 == orig: sys.exit(0)
if crlf: s2 = s2.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(s2)
print("0021: login ungu + laptop 3D terpasang")
'''
out = tpl.replace("__CFG__", repr(json.dumps(CFG, ensure_ascii=False)))
open(os.path.join(ROOT, "patches", "0021-login-ungu-3d.py"), "w", encoding="utf-8").write(out)
print("patch 0021", len(out))

# ---- teknisi.html ----
tp = os.path.join(ROOT, "teknisi", "teknisi.html"); t = open(tp, encoding="utf-8").read()
blk = CFG["CSS"] + "\n" + CFG["LOGOUT"]
if "/*NM-LOGIN v4*/" in t:
    a = t.find("/*NM-LOGIN v4*/"); z = t.find("/*NM-LOGOUT-END*/", a) + len("/*NM-LOGOUT-END*/")
    t = t[:a] + blk + t[z:]
else:
    anchor = "@media(max-width:820px){#tLogin{display:block;background:#fff}}\n"
    assert t.count(anchor) == 1; t = t.replace(anchor, anchor + blk + "\n")
a = t.find('<section class="cb-art"'); z = t.find('<section class="cb-side">', a)
assert a > 0 and z > a
t = t[:a] + CFG["ART"] + "\n    " + t[z:]
OLDF = '''<form id="lf"><label for="lu">Nama akun</label><input id="lu" autocomplete="username" autocapitalize="none" required>
        <label for="lp">Kata sandi</label><input id="lp" type="password" autocomplete="current-password" required>'''
NEWF = '''<form id="lf"><input id="lu" placeholder="Nama akun" aria-label="Nama akun" autocomplete="username" autocapitalize="none" required>
        <input id="lp" type="password" placeholder="Kata sandi" aria-label="Kata sandi" autocomplete="current-password" required style="margin-top:14px">'''
if OLDF in t: t = t.replace(OLDF, NEWF)
assert NEWF in t
open(tp, "w", encoding="utf-8").write(t)
print(subprocess.run([sys.executable, os.path.join(ROOT, "teknisi", "build_patch.py")], capture_output=True, text=True).stdout.strip())
