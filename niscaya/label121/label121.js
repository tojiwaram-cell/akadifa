/*LABEL-121 v5*/
/* Cetak label QR ke kertas label No. 121 (38 x 75 mm, 10 label per lembar: 2 kolom x 5 baris).
   Membungkus printBarcodeLabels(): label yang dibuat aplikasi dikelompokkan per 10 ke halaman sendiri,
   ditata seperti kartu di halaman Label (v2): QR berbingkai + ID di bawahnya di kiri; tipe, SN, spek di kanan (v3: tanpa status; v4/rilis 0050: tanpa harga — harga terbaru dilihat lewat link QR; v5/rilis 0057: unit Belum Ready diberi tanda BELUM READY). Posisi bisa disetel (geser atas/kiri, jarak kolom/baris) dan disimpan di
   localStorage 'nm-label121'. Ada "Cetak uji garis" untuk kalibrasi di kertas HVS biasa. Data tidak diubah. */
(function(){
  if (typeof printBarcodeLabels !== 'function' || printBarcodeLabels.__nm121v2) return;
  window.__nmLabel121 = true;
  var KEY = 'nm-label121';
  var DEF = { ver: 3, top: 4, left: 26, gapX: 4, gapY: 4, garis: false };
  function cfg(){
    var o = {}; try { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
    if (o.ver !== DEF.ver) o = {}; /* v3: posisi baru hasil cetak uji (geser kanan ±2 cm, jarak baris/kolom 4 mm) */
    var r = {}; for (var k in DEF) r[k] = (o[k] === undefined || o[k] === null || o[k] === '') ? DEF[k] : o[k];
    ['top','left','gapX','gapY'].forEach(function(k){ r[k] = Number(r[k]); if (!isFinite(r[k])) r[k] = DEF[k]; });
    r.garis = !!r.garis; r.ver = DEF.ver; return r;
  }
  function save(o){ try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) {} }
  var W = 75, H = 38, COLS = 2, ROWS = 5, PER = COLS * ROWS;

  function css(c){
    return '@media print{' +
      '@page{size:A4 portrait;margin:0}' +
      'html,body{margin:0!important;padding:0!important;background:#fff!important}' +
      '#printArea .nm121-page{position:relative;width:210mm;height:296mm;overflow:hidden;page-break-after:always;break-after:page;box-sizing:border-box}' +
      '#printArea .nm121-page:last-child{page-break-after:auto;break-after:auto}' +
      '#printArea .nm121-grid{position:absolute;top:' + c.top + 'mm;left:' + c.left + 'mm;display:grid;' +
        'grid-template-columns:repeat(' + COLS + ',' + W + 'mm);grid-template-rows:repeat(' + ROWS + ',' + H + 'mm);' +
        'column-gap:' + c.gapX + 'mm;row-gap:' + c.gapY + 'mm}' +
    '}' +
    '#printArea .nm121-grid .nm-l{width:' + W + 'mm;height:' + H + 'mm;box-sizing:border-box;padding:2.5mm 3mm;display:flex;align-items:center;gap:3mm;overflow:hidden;' +
      'background:#fff;color:#0f172a;font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;border-radius:2.5mm;border:' + (c.garis ? '0.2mm dashed #999' : '0') + ';' +
      'page-break-inside:avoid;break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '#printArea .nm-l-q{flex:none;width:25mm;display:flex;flex-direction:column;align-items:center}' +
    '#printArea .nm-l-qb{width:25mm;height:25mm;box-sizing:border-box;padding:1.2mm;border:0.3mm solid #e2e8f0;border-radius:2mm;background:#fff;display:flex;align-items:center;justify-content:center}' +
    '#printArea .nm-l-qb svg,#printArea .nm-l-qb img,#printArea .nm-l-qb canvas{width:100%!important;height:100%!important;display:block}' +
    '#printArea .nm-l-id{margin-top:1mm;font:700 9pt/1 "Courier New",ui-monospace,monospace;letter-spacing:.6pt;color:#0f172a}' +
    '#printArea .nm-l-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:0.7mm}' +
    '#printArea .nm-l-m{font-weight:800;font-size:11pt;line-height:1.12;color:#0f172a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '#printArea .nm-l-s{font-size:7.5pt;line-height:1.15;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#printArea .nm-l-p{font:700 9pt/1.15 "Courier New",ui-monospace,monospace;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#printArea .nm-l-p.tanya{color:#64748b}' +
    '#printArea .nm-l-p s{display:block;font-weight:400;font-size:6.5pt;color:#94a3b8}' +
    '#printArea .nm-l-b{align-self:flex-start;display:inline-flex;align-items:center;gap:1mm;margin-top:0.4mm;padding:0.6mm 2.4mm;border-radius:10mm;font-weight:700;font-size:7.5pt;line-height:1.2;border:0.25mm solid}' +
    '#printArea .nm-l-b i{width:1.6mm;height:1.6mm;border-radius:50%;background:currentColor;display:inline-block}' +
    '#printArea .nm121-grid .nm121-box{width:' + W + 'mm;height:' + H + 'mm;box-sizing:border-box;border:0.25mm solid #000;border-radius:2.5mm;' +
      'display:flex;align-items:center;justify-content:center;font:8pt Arial,sans-serif;color:#555}';
  }
  function setCss(){
    var st = document.getElementById('nm121Css');
    if (!st){ st = document.createElement('style'); st.id = 'nm121Css'; document.head.appendChild(st); }
    st.textContent = css(cfg());
  }

  var ST = { Ready: ['#16a34a', '#ecfdf3', '#bbf7d0'], Booking: ['#b45309', '#fffbeb', '#fde68a'], DP: ['#7c3aed', '#f5f3ff', '#ddd6fe'], Sold: ['#64748b', '#f1f5f9', '#cbd5e1'] };
  function E(v){ return String(v == null ? '' : v).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function txt(l, sel){ var e = l.querySelector(sel); return e ? e.textContent.trim() : ''; }
  function Rp(n){ return (typeof rupiah === 'function') ? rupiah(n) : 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
  /* Satu label = kartu seperti di halaman Label */
  function card(l){
    var id = txt(l, '.pl-id'), s = null;
    try { s = (DATA.stock || []).find(function(x){ return String(x.id) === id; }) || null; } catch (_) {}
    var q = l.querySelector('svg, img, canvas');
    var model = s ? [s.merek, s.tipe].filter(Boolean).join(' ') : txt(l, '.pl-model');
    var sn = s ? (s.noSeri || '-') : ([].map.call(l.querySelectorAll('.pl-spec'), function(e){ return e.textContent.trim(); }).filter(function(t){ return /^SN:/.test(t); })[0] || '').replace(/^SN:\s*/, '');
    var spec = s ? [s.processor || '-', s.ram || '-', s.ssd || '-'].join(' · ') : txt(l, '.pl-spec');
    var price, tanya = false;
    if (s){
      var jual = Number(s.hargaJual) || 0, akhir = (typeof hargaAkhir === 'function') ? Number(hargaAkhir(s)) || 0 : Math.max(0, jual - (Number(s.diskon) || 0));
      if (!akhir){ price = 'Tanya harga'; tanya = true; }
      else price = ((Number(s.diskon) || 0) > 0 && jual > akhir ? '<s>' + E(Rp(jual)) + '</s>' : '') + E(Rp(akhir));
    } else { price = E(txt(l, '.pl-price').replace(/^Harga Akhir:\s*/, '')); if (/Rp\s*0$|^$/.test(price)){ price = 'Tanya harga'; tanya = true; } }
    var d = document.createElement('div'); d.className = 'nm-l';
    d.innerHTML = '<div class="nm-l-q"><div class="nm-l-qb"></div><div class="nm-l-id">' + E(id) + '</div></div>' +
      '<div class="nm-l-t"><div class="nm-l-m">' + E(model) + '</div><div class="nm-l-s">SN: ' + E(sn) + '</div><div class="nm-l-s">' + E(spec) + '</div>' +
      (s && s.status === 'Belum Ready' ? '<div class="nm-l-b" style="color:#b45309;background:#fff7ed;border-color:#fdba74"><i></i>BELUM READY</div>' : '') + '</div>';
    if (q) d.querySelector('.nm-l-qb').appendChild(q);
    return d;
  }

  /* Kelompokkan .print-label hasil aplikasi ke halaman 10 label */
  function regroup(){
    var pa = document.getElementById('printArea'); if (!pa) return false;
    var labels = [].slice.call(pa.querySelectorAll('.print-label'));
    if (!labels.length) return false;
    setCss();
    var frag = document.createDocumentFragment();
    for (var i = 0; i < labels.length; i += PER){
      var pg = document.createElement('div'); pg.className = 'nm121-page';
      var g = document.createElement('div'); g.className = 'nm121-grid';
      labels.slice(i, i + PER).forEach(function(l){ g.appendChild(card(l)); });
      pg.appendChild(g); frag.appendChild(pg);
    }
    pa.innerHTML = ''; pa.appendChild(frag);
    return true;
  }

  var _p = window.printBarcodeLabels;
  var wrapped = function(){
    var r;
    try { r = _p.apply(this, arguments); } catch (e) { throw e; }
    var go = function(){ try { regroup(); } catch (e) { console.warn('LABEL-121', e); } };
    if (r && typeof r.then === 'function') return r.then(function(v){ go(); return v; });
    go(); return r;
  };
  wrapped.__nm121 = true; wrapped.__nm121v2 = true;
  window.printBarcodeLabels = wrapped;
  try { printBarcodeLabels = wrapped; } catch (_) {}

  /* Cetak uji: hanya garis 10 kotak, untuk ditumpuk ke lembar label (kalibrasi posisi) */
  function cetakUji(){
    var pa = document.getElementById('printArea'); if (!pa) return;
    setCss();
    var h = '<div class="nm121-page"><div class="nm121-grid">';
    for (var i = 1; i <= PER; i++) h += '<div class="nm121-box">Label ' + i + ' — 38 × 75 mm</div>';
    pa.innerHTML = h + '</div></div>';
    setTimeout(function(){ window.print(); }, 150);
  }

  function modal(){
    var box = document.getElementById('modalBox'), ov = document.getElementById('overlay'); if (!box || !ov) return;
    var c = cfg();
    function f(id, lbl, v, hint){ return '<div class="field"><label>' + lbl + '</label><input id="' + id + '" type="number" step="0.5" value="' + v + '"><div class="dim" style="font-size:11.5px;margin-top:3px">' + hint + '</div></div>'; }
    var cells = ''; for (var i = 0; i < PER; i++) cells += '<div style="border:1.5px solid #2563eb;border-radius:4px;background:#eef4ff;display:flex;align-items:center;gap:4px;padding:3px;font-size:9px;color:#1e3a8a"><span style="width:26px;height:26px;background:repeating-conic-gradient(#1e3a8a 0 25%,#fff 0 50%) 0 0/6px 6px;flex:none"></span>ID · tipe<br>SN · spek</div>';
    box.innerHTML = '<h3>🏷 Kertas Label No. 121 — 38 × 75 mm, 10 label/lembar</h3>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">' +
        '<div style="width:170px;flex:none;background:#fffbe6;border:1px solid #e5d9a6;border-radius:6px;padding:6px;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:40px;gap:4px">' + cells + '</div>' +
        '<div style="flex:1;min-width:240px">' +
          '<p class="dim" style="font-size:12.5px;line-height:1.55;margin:0 0 10px">Setiap 10 label = 1 lembar (2 kolom × 5 baris). Tampilan sama dengan kartu di halaman Label: QR + ID di kiri, tipe, SN dan spek di kanan (tanpa harga). ' +
          'Saat mencetak pilih kertas <b>A4</b>, skala <b>100% / Default</b> (jangan "Fit to page"), margin <b>None</b>.</p>' +
          '<div class="form-grid">' +
            f('n121Top', 'Geser dari atas (mm)', c.top, 'Tambah bila cetakan terlalu ke atas') +
            f('n121Left', 'Geser dari kiri (mm)', c.left, 'Tambah bila cetakan terlalu ke kiri') +
            f('n121GapX', 'Jarak antar kolom (mm)', c.gapX, 'Celah kuning di tengah lembar') +
            f('n121GapY', 'Jarak antar baris (mm)', c.gapY, 'Celah kuning antar baris') +
          '</div>' +
          '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px"><input type="checkbox" id="n121Garis"' + (c.garis ? ' checked' : '') + '> Tampilkan garis tepi label saat cetak</label>' +
          '<p class="dim" style="font-size:12px;line-height:1.5;margin:10px 0 0"><b>Kalibrasi:</b> klik <b>Cetak uji garis</b> di kertas HVS, tumpuk dengan lembar label lalu terawang ke lampu. Geser angka sampai kotak pas di atas label, baru cetak di lembar label.</p>' +
        '</div></div>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" id="n121Reset">Kembalikan bawaan</button>' +
        '<button class="btn btn-ghost" id="n121Uji">🖨 Cetak uji garis</button>' +
        '<button class="btn btn-ghost" id="n121Tutup">Tutup</button>' +
        '<button class="btn btn-primary" id="n121Simpan">Simpan</button>' +
      '</div>';
    ov.classList.add('show');
    function read(){ return { ver: DEF.ver, top: +box.querySelector('#n121Top').value || 0, left: +box.querySelector('#n121Left').value || 0,
      gapX: +box.querySelector('#n121GapX').value || 0, gapY: +box.querySelector('#n121GapY').value || 0, garis: box.querySelector('#n121Garis').checked }; }
    box.querySelector('#n121Tutup').onclick = function(){ ov.classList.remove('show'); };
    box.querySelector('#n121Simpan').onclick = function(){ save(read()); setCss(); ov.classList.remove('show'); if (typeof showToast === 'function') showToast('Pengaturan label No. 121 disimpan'); };
    box.querySelector('#n121Uji').onclick = function(){ save(read()); ov.classList.remove('show'); cetakUji(); };
    box.querySelector('#n121Reset').onclick = function(){ save(DEF); ov.classList.remove('show'); setCss(); modal(); };
  }
  window.nmLabel121 = modal;

  /* Tombol di halaman Label, di samping tombol Cetak */
  function addBtn(){
    var pb = document.getElementById('printBtn'); if (!pb) return;
    var ex = document.getElementById('n121Btn'); if (ex){ ex.onclick = modal; return; }
    var b = document.createElement('button');
    b.className = 'btn btn-ghost'; b.id = 'n121Btn'; b.type = 'button'; b.style.marginRight = '8px';
    b.title = 'Atur posisi cetak di kertas label No. 121';
    b.textContent = '🏷 Label No.121 (38×75, 10/lembar)';
    b.onclick = modal;
    pb.parentNode.insertBefore(b, pb);
  }
  addBtn();
  new MutationObserver(addBtn).observe(document.body, { childList: true, subtree: true });
  setCss();
})();
