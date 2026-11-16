#!/usr/bin/env python3
# Membuat patches/0017-login-contractbook.py (tampilan login & keluar gaya "Contractbook") dari parts.py.
# Jalankan ulang setiap mengubah parts.py. Patch ini dipasang SETELAH 0001 (mengganti tampilan Campty).
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import parts
OLD_MARKUP = """    <div class="cp-page">
      <nav class="cp-nav">
        <div class="cp-logo">${logo ? `<img src="${logo}" alt="">` : ''}<span>Niscaya Makassar<i>.</i></span></div>
        <div class="cp-pills"><button type="button" class="cp-pill on" data-view="login">Masuk</button><button type="button" class="cp-pill" data-view="forgot">Lupa Sandi</button></div>
      </nav>"""
OLD_TAIL_START = '      <section class="cp-hero">'
OLD_TAIL_END = """        <div class="cp-stat"><b>24/7</b><span>Sinkron otomatis<br>ke server VPS</span></div>
      </section>
    </div>`;"""
NEW_MARKUP = ("""    <div class="cb-page">
      """ + parts.art("24", "unit ready<br>hari ini") + """
      <section class="cb-side">
        <div class="cb-brand">${logo ? `<img src="${logo}" alt="">` : '<span class="lg"></span>'}<span>NISCAYA <span>MAKASSAR</span></span></div>
        <h1 class="cb-h1">Masuk</h1>
        <div class="cb-card">
          <div class="cb-seg"><button type="button" class="on" data-view="login">Owner</button><a href="/teknisi.html">Teknisi</a></div>
          <div id="lgBody"></div>
        </div>
        <p class="cb-foot">Laptop second premium di Sulawesi Selatan.</p>
      </section>
    </div>`;""")
for s in (parts.CSS, parts.LG_CSS, parts.LOGOUT_CSS, NEW_MARKUP[:-2].replace("${logo", "")):
    assert "${" not in s.replace("${logo", "") and "`" not in s.replace("`<img src=", "").replace('alt="">`', "") and "\\" not in s, "karakter terlarang di template literal"
CSS_MARK = "@media(max-width:420px){.cp-pills .cp-pill:last-child{display:none}}\n`;"
LO_MARK = "@keyframes loFade{from{opacity:0}to{opacity:1}}\n`;"
CFG = dict(OLD_MARKUP=OLD_MARKUP, OLD_TAIL_START=OLD_TAIL_START, OLD_TAIL_END=OLD_TAIL_END, NEW_MARKUP=NEW_MARKUP,
           CSS_MARK=CSS_MARK, CSS_NEW=CSS_MARK[:-3] + "\n/*CB-LOGIN v1*/" + parts.CSS + parts.LG_CSS + "`;",
           LO_MARK=LO_MARK, LO_NEW=LO_MARK[:-3] + parts.LOGOUT_CSS + "`;")
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0017: tampilan login & dialog keluar gaya "Contractbook" (split ilustrasi laptop + form).
# Dipasang setelah 0001. Idempoten; bila penanda tidak cocok, file tidak diubah. Logika login tidak disentuh.
import sys, json
C = json.loads(__CFG__)
path = sys.argv[1]; src = open(path, encoding="utf-8").read()
if "/*CB-LOGIN v1*/" in src: sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
a = src.find(C["OLD_MARKUP"])
if a < 0 or src.count(C["OLD_MARKUP"]) != 1 or src.count(C["CSS_MARK"]) != 1 or src.count(C["LO_MARK"]) != 1:
    print("0017: penanda tidak cocok - dilewati"); sys.exit(0)
b = src.find(C["OLD_TAIL_START"], a); z = src.find(C["OLD_TAIL_END"], a)
if b < 0 or z < 0 or b - a > len(C["OLD_MARKUP"]) + 2:
    print("0017: blok tampilan tidak utuh - dilewati"); sys.exit(0)
src = src[:a] + C["NEW_MARKUP"] + src[z + len(C["OLD_TAIL_END"]):]
src = src.replace(C["CSS_MARK"], C["CSS_NEW"], 1).replace(C["LO_MARK"], C["LO_NEW"], 1)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0017: tampilan login Contractbook terpasang")
'''
out = tpl.replace("__CFG__", repr(json.dumps(CFG, ensure_ascii=False)))
open(os.path.join(D, "..", "patches", "0017-login-contractbook.py"), "w", encoding="utf-8").write(out)
print("ok", len(out))
