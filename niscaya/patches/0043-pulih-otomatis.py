#!/usr/bin/env python3
# NISCAYA MAKASSAR patch 0043: (1) bersihkan baris ganda "const _kom" / "r.komisi" hasil 0024<->0040 yang membuat aplikasi macet,
# (2) skrip pemulihan otomatis di <head> (muat ulang tanpa cache bila menu kosong / SyntaxError). Idempoten.
import sys, json, re
path = sys.argv[1]
JS = json.loads('"/*NM-PULIH v1*/\\n/* Rilis 0043 — pemulihan otomatis bila aplikasi macet (menu & dashboard kosong).\\n   Penyebab umum: browser memegang versi lama/rusak, atau skrip utama gagal dimuat (SyntaxError).\\n   Langkah: deteksi -> muat ulang tanpa cache (maks 2x per 3 menit) -> bila masih macet, tampilkan\\n   pemberitahuan dan coba lagi tiap 20 detik (server VPS memulihkan versi terakhir yang sehat secara otomatis). */\\n(function(){\\n  if (window.__nmPulih) return; window.__nmPulih = 1;\\n  var bad = false, KEY = \'nm-pulih\';\\n  window.addEventListener(\'error\', function(e){\\n    var m = String((e && e.message) || \'\');\\n    if ((e && e.error && e.error.name === \'SyntaxError\') || /SyntaxError|already been declared|Unexpected token/i.test(m)) bad = true;\\n  }, true);\\n  function get(){ try { return JSON.parse(sessionStorage.getItem(KEY) || \'[]\'); } catch(_) { return []; } }\\n  function put(a){ try { sessionStorage.setItem(KEY, JSON.stringify(a)); } catch(_) {} }\\n  function reload(){\\n    var u = location.pathname + \'?pulih=\' + Date.now() + location.hash;\\n    try { location.replace(u); } catch(_) { location.reload(); }\\n  }\\n  function banner(){\\n    if (document.getElementById(\'nmPulihBox\')) return;\\n    var d = document.createElement(\'div\'); d.id = \'nmPulihBox\';\\n    d.style.cssText = \'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;background:#161316;color:#fff;border:1px solid #FE2E4B;border-radius:14px;padding:12px 16px;font:14px/1.4 Helvetica,Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:92vw;text-align:center\';\\n    d.innerHTML = \'⚠️ Aplikasi sedang dipulihkan otomatis. Data Anda aman.<br><small style=\\"opacity:.75\\">Memuat ulang otomatis tiap 20 detik…</small> <button style=\\"margin-left:8px;background:#FE2E4B;color:#fff;border:0;border-radius:999px;padding:6px 12px;cursor:pointer\\">Muat ulang</button>\';\\n    d.querySelector(\'button\').onclick = reload;\\n    (document.body || document.documentElement).appendChild(d);\\n  }\\n  function check(){\\n    var nav = document.getElementById(\'navList\');\\n    if (!nav) return;                       /* bukan halaman aplikasi (mis. halaman login) */\\n    var stuck = bad || nav.children.length === 0;\\n    if (!stuck) { put([]); var b = document.getElementById(\'nmPulihBox\'); if (b) b.remove(); return; }\\n    var now = Date.now(), a = get().filter(function(t){ return now - t < 180000; });\\n    if (a.length < 2) { a.push(now); put(a); reload(); return; }\\n    banner(); setTimeout(reload, 20000);\\n  }\\n  window.addEventListener(\'load\', function(){ setTimeout(check, 2500); });\\n})();"')
VER = JS.split("\n", 1)[0]
src = open(path, encoding="utf-8").read()
orig = src
K = "const _kom = (typeof nmKomisiSale==='function') ? nmKomisiSale(s) : 0;"
R = "r.komisi = (r.komisi||0) + _kom;"
for x in (K, R):
    src = re.sub("(" + re.escape(x) + r")(?:[ \t]*" + re.escape(x) + ")+", lambda m: m.group(1), src)
blk = "<script>" + JS + "</script>\n"
m = re.search(r"<script>/\*NM-PULIH v[^\n]*\n.*?</script>\n?", src, re.S)
if m:
    if VER not in m.group(0): src = src[:m.start()] + blk + src[m.end():]
else:
    t = re.search(r'<meta charset="[^"]*">\n?', src)
    if t: src = src[:t.end()] + blk + src[t.end():]
    elif "<head>" in src: src = src.replace("<head>", "<head>\n" + blk, 1)
if src == orig: sys.exit(0)
open(path, "w", encoding="utf-8").write(src)
print("0043: pembersihan duplikat + pemulihan otomatis", VER)
