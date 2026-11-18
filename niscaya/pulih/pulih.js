/*NM-PULIH v1*/
/* Rilis 0043 — pemulihan otomatis bila aplikasi macet (menu & dashboard kosong).
   Penyebab umum: browser memegang versi lama/rusak, atau skrip utama gagal dimuat (SyntaxError).
   Langkah: deteksi -> muat ulang tanpa cache (maks 2x per 3 menit) -> bila masih macet, tampilkan
   pemberitahuan dan coba lagi tiap 20 detik (server VPS memulihkan versi terakhir yang sehat secara otomatis). */
(function(){
  if (window.__nmPulih) return; window.__nmPulih = 1;
  var bad = false, KEY = 'nm-pulih';
  window.addEventListener('error', function(e){
    var m = String((e && e.message) || '');
    if ((e && e.error && e.error.name === 'SyntaxError') || /SyntaxError|already been declared|Unexpected token/i.test(m)) bad = true;
  }, true);
  function get(){ try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch(_) { return []; } }
  function put(a){ try { sessionStorage.setItem(KEY, JSON.stringify(a)); } catch(_) {} }
  function reload(){
    var u = location.pathname + '?pulih=' + Date.now() + location.hash;
    try { location.replace(u); } catch(_) { location.reload(); }
  }
  function banner(){
    if (document.getElementById('nmPulihBox')) return;
    var d = document.createElement('div'); d.id = 'nmPulihBox';
    d.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;background:#161316;color:#fff;border:1px solid #FE2E4B;border-radius:14px;padding:12px 16px;font:14px/1.4 Helvetica,Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:92vw;text-align:center';
    d.innerHTML = '⚠️ Aplikasi sedang dipulihkan otomatis. Data Anda aman.<br><small style="opacity:.75">Memuat ulang otomatis tiap 20 detik…</small> <button style="margin-left:8px;background:#FE2E4B;color:#fff;border:0;border-radius:999px;padding:6px 12px;cursor:pointer">Muat ulang</button>';
    d.querySelector('button').onclick = reload;
    (document.body || document.documentElement).appendChild(d);
  }
  function check(){
    var nav = document.getElementById('navList');
    if (!nav) return;                       /* bukan halaman aplikasi (mis. halaman login) */
    var stuck = bad || nav.children.length === 0;
    if (!stuck) { put([]); var b = document.getElementById('nmPulihBox'); if (b) b.remove(); return; }
    var now = Date.now(), a = get().filter(function(t){ return now - t < 180000; });
    if (a.length < 2) { a.push(now); put(a); reload(); return; }
    banner(); setTimeout(reload, 20000);
  }
  window.addEventListener('load', function(){ setTimeout(check, 2500); });
})();
