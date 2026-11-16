#!/usr/bin/env python3
"""Membuat patches/0019-login-ungu.py dari file di folder ini (login.css, logout.css, art.svg).
Jalankan: python3 niscaya/login-v3/build_patch.py"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
rd = lambda n: open(os.path.join(HERE, n), encoding="utf-8").read()

# markup halaman dari patch 0017-login-contractbook (dipasang sebelum patch ini)
p17 = open(os.path.join(ROOT, "patches", "0017-login-contractbook.py"), encoding="utf-8").read()
OLD_SHELL = json.loads(eval(re.search(r"C = json.loads\((.*)\)\n", p17).group(1)))["NEW_MARKUP"]

NEW_SHELL = """
    <div class="pv-wrap">
      <div class="pv-card">
        <div class="pv-brand">${logo ? `<img src="${logo}" alt="">` : ''}<span>Niscaya Makassar<i>.</i></span></div>
        <div class="pv-art">${LOGIN_SVG_V3}</div>
        <div class="pv-side">
          <div class="pv-login">
            <div class="pv-seg"><button type="button" class="on" data-view="login">Owner</button><a href="/teknisi.html">Teknisi</a></div>
            <div id="lgBody"></div>
          </div>
          <div class="pv-foot">Laptop second premium &middot; <b>Makassar</b></div>
        </div>
      </div>
    </div>`;""".lstrip("\n")
# pertahankan indentasi/awal persis seperti blok lama
assert OLD_SHELL.startswith("    <div class=\"cb-page\">"), OLD_SHELL[:40]

OLD_FORM = """      <h1 class="lg-title">Hai, selamat datang kembali</h1>
      <p class="lg-sub">Masuk untuk mengelola stok &amp; penjualan laptop second</p>
      <form id="lgForm">
        <div class="lg-field"><input id="lgUser" placeholder="Username atau email" autocomplete="username" autocapitalize="none"></div>
        ${pwField('lgPass', '', 'Masukkan kata sandi kamu', 'current-password')}
        <div id="lgMsg" class="lg-msg"></div>
        <button class="lg-btn" id="lgBtn" type="submit">Masuk</button>
      </form>
      <div class="lg-row"><button class="lg-link" id="lgForgot" type="button">Lupa kata sandi?</button></div>
      <hr class="lg-hr">
      <label class="lg-check"><input type="checkbox" id="lgRemember" checked> Ingat perangkat ini</label>"""

NEW_FORM = """      <h1 class="lg-title">Masuk</h1>
      <p class="lg-sub">Kelola stok &amp; penjualan laptop second</p>
      <form id="lgForm">
        <div class="lg-field pv-f"><span class="pv-i">${PV_IC_USER}</span><input id="lgUser" placeholder="Username atau email" autocomplete="username" autocapitalize="none"></div>
        <div class="lg-field pv-f"><span class="pv-i">${PV_IC_LOCK}</span><input id="lgPass" type="password" placeholder="Kata sandi" autocomplete="current-password"><button type="button" class="lg-eye" data-eye="lgPass" title="Lihat kata sandi">${eye}</button></div>
        <div class="pv-opts"><label class="lg-check"><input type="checkbox" id="lgRemember" checked> Ingat saya</label><button class="lg-link" id="lgForgot" type="button">Lupa kata sandi?</button></div>
        <div id="lgMsg" class="lg-msg"></div>
        <button class="lg-btn" id="lgBtn" type="submit">Masuk</button>
      </form>"""

IC_USER = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M4 20.5c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5z"/></svg>'
IC_LOCK = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h.5A1.5 1.5 0 0 1 19 11.5v8A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10zm2.2 0h5.6V7.5a2.8 2.8 0 0 0-5.6 0z"/></svg>'

for name, txt in (("login.css", rd("login.css")), ("logout.css", rd("logout.css")), ("art.svg", rd("art.svg"))):
    assert "`" not in txt and "${" not in txt and "\\" not in txt, name

DEFS = ("const LOGIN_CSS_V3 = `" + rd("login.css") + "`;\n"
        "const LOGOUT_CSS_V3 = `" + rd("logout.css") + "`;\n"
        "const LOGIN_SVG_V3 = `" + rd("art.svg").strip() + "`;\n"
        "const PV_IC_USER = `" + IC_USER + "`;\n"
        "const PV_IC_LOCK = `" + IC_LOCK + "`;\n")

EDITS = [
    [OLD_SHELL, NEW_SHELL],
    [OLD_FORM, NEW_FORM],
    ["st.id = 'loginCss'; st.textContent = LOGIN_CSS;", "st.id = 'loginCss'; st.textContent = LOGIN_CSS + LOGIN_CSS_V3;"],
    ["st.id = 'logoutCss'; st.textContent = LOGOUT_CSS;", "st.id = 'logoutCss'; st.textContent = LOGOUT_CSS + LOGOUT_CSS_V3;"],
    ["function showLogin(msg){", DEFS + "function showLogin(msg){"],
]

PATCH = '''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0019: tampilan masuk & keluar gaya ungu-kuning (referensi Pinterest)
# Dipasang setelah 0017-login-contractbook. Dibuat oleh niscaya/login-v3/build_patch.py - jangan diedit langsung.
import sys, json
path = sys.argv[1]
src = open(path, encoding="utf-8").read()
if "pv-card" in src and "LOGIN_CSS_V3" in src:
    print("0019: sudah terpasang"); sys.exit(0)
if "cb-page" not in src:
    print("0019: patch 0017 (Contractbook) belum terpasang - dilewati"); sys.exit(0)
crlf = "\\r\\n" in src
if crlf: src = src.replace("\\r\\n", "\\n")
EDITS = json.loads(%s)
for i, (old, new) in enumerate(EDITS, 1):
    n = src.count(old)
    if n != 1:
        print("0019: edit %%d tidak cocok (ditemukan %%d) - dibatalkan" %% (i, n)); sys.exit(2)
for old, new in EDITS:
    src = src.replace(old, new)
if crlf: src = src.replace("\\n", "\\r\\n")
open(path, "w", encoding="utf-8").write(src)
print("0019: tampilan masuk/keluar ungu terpasang")
''' % repr(json.dumps(EDITS, ensure_ascii=False))

out = os.path.join(ROOT, "patches", "0019-login-ungu.py")
open(out, "w", encoding="utf-8").write(PATCH)
print("ditulis:", out, len(PATCH), "byte")
