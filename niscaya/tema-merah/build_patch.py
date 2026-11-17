#!/usr/bin/env python3
# Membuat patches/0035-tema-merah.py dari tema-merah/tema.css (jalankan ulang setiap mengubah tema.css)
import json, os
D = os.path.dirname(os.path.abspath(__file__))
css = open(os.path.join(D, "tema.css"), encoding="utf-8").read().strip()
assert "</style" not in css.lower()
tpl = r'''#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0035: tema warna merah-putih (referensi Pinterest pin 293296994506469195).
# Hanya CSS tampilan; data & fungsi tidak disentuh. Idempoten: blok <style id="nm-tema-merah"> disisipkan
# sebelum </body> (setelah tema-2026 sehingga menimpanya), atau diganti bila versinya berbeda.
import sys, json, re
path = sys.argv[1]
CSS = json.loads(__CSS__)
VER = CSS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
if VER in src: sys.exit(0)
crlf = "\r\n" in src
if crlf: src = src.replace("\r\n", "\n")
blk = '<style id="nm-tema-merah">' + CSS + "</style>\n"
m = re.search(r'<style id="nm-tema-merah">.*?</style>\n?', src, re.S)
if m: src = src[:m.start()] + blk + src[m.end():]
elif "</body>" in src:
    i = src.rfind("</body>"); src = src[:i] + blk + src[i:]
else:
    print("0035: </body> tidak ditemukan - dibatalkan"); sys.exit(2)
if crlf: src = src.replace("\n", "\r\n")
open(path, "w", encoding="utf-8").write(src)
print("0035: tema merah terpasang", VER)
'''
open(os.path.join(D, "..", "patches", "0035-tema-merah.py"), "w", encoding="utf-8").write(tpl.replace("__CSS__", repr(json.dumps(css, ensure_ascii=False))))
print("ok")
