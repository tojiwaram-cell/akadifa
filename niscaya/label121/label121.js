/*LABEL-121 v1*/
/* Cetak label QR ke kertas label No. 121 (38 x 75 mm, 10 label per lembar: 2 kolom x 5 baris).
   Membungkus printBarcodeLabels(): label yang dibuat aplikasi dikelompokkan per 10 ke halaman sendiri,
   ditata mendatar (QR kiri, teks kanan). Posisi bisa disetel (geser atas/kiri, jarak kolom/baris) dan disimpan di
   localStorage 'nm-label121'. Ada "Cetak uji garis" untuk kalibrasi di kertas HVS biasa. Data tidak diubah. */
(function(){
  if (typeof printBarcodeLabels !== 'function' || window.__nmLabel121) return;
  window.__nmLabel121 = true;
  var KEY = 'nm-label121';
  var DEF = { top: 4, left: 6, gapX: 3, gapY: 2, garis: false };
  function cfg(){
    var o = {}; try { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
    var r = {}; for (var k in DEF) r[k] = (o[k] === undefined || o[k] === null || o[k] === '') ? DEF[k] : o[k];
    ['top','left','gapX','gapY'].forEach(function(k){ r[k] = Number(r[k]); if (!isFinite(r[k])) r[k] = DEF[k]; });
    r.garis = !!r.garis; return r;
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
    '#printArea .nm121-grid .print-label{width:' + W + 'mm!important;height:' + H + 'mm!important;max-width:none!important;min-height:0!important;' +
      'margin:0!important;padding:2mm 2.2mm!important;box-sizing:border-box!important;overflow:hidden!important;' +
      'display:grid!important;grid-template-columns:30mm 1fr!important;grid-auto-rows:min-content!important;column-gap:2mm!important;row-gap:0!important;' +
      'align-content:center!important;text-align:left!important;border:' + (c.garis ? '0.2mm dashed #999' : '0') + '!important;border-radius:2.5mm!important;' +
      'page-break-inside:avoid;break-inside:avoid;background:#fff!important;color:#000!important;font-family:Arial,Helvetica,sans-serif!important}' +
    '#printArea .nm121-grid .print-label > *{grid-column:2!important;margin:0!important;padding:0!important;text-align:left!important;line-height:1.18!important;' +
      'white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%!important;min-width:0!important}' +
    '#printArea .nm121-grid .print-label > svg,#printArea .nm121-grid .print-label > img,#printArea .nm121-grid .print-label > canvas,#printArea .nm121-grid .print-label > .nm121-qr{' +
      'grid-column:1!important;grid-row:1 / span 12!important;width:30mm!important;height:30mm!important;max-width:30mm!important;align-self:center!important;justify-self:center!important;display:block!important}' +
    '#printArea .nm121-grid .print-label > .nm121-qr svg,#printArea .nm121-grid .print-label > .nm121-qr img{width:30mm!important;height:30mm!important;display:block}' +
    '#printArea .nm121-grid .pl-brand{font-size:6.5pt!important;font-weight:700!important;letter-spacing:.4pt!important;color:#444!important;border-bottom:0.2mm solid #ccc!important;padding-bottom:0.5mm!important;margin-bottom:0.6mm!important}' +
    '#printArea .nm121-grid .pl-id{font-size:11pt!important;font-weight:800!important;font-family:"Courier New",monospace!important}' +
    '#printArea .nm121-grid .pl-model{font-size:8pt!important;font-weight:700!important;white-space:normal!important;max-height:2.4em!important}' +
    '#printArea .nm121-grid .pl-spec{font-size:6.5pt!important;color:#222!important}' +
    '#printArea .nm121-grid .pl-price{font-size:8.5pt!important;font-weight:800!important;margin-top:0.6mm!important;white-space:normal!important}' +
    '#printArea .nm121-grid .nm121-box{width:' + W + 'mm;height:' + H + 'mm;box-sizing:border-box;border:0.25mm solid #000;border-radius:2.5mm;' +
      'display:flex;align-items:center;justify-content:center;font:8pt Arial,sans-serif;color:#555}';
  }
  function setCss(){
    var st = document.getElementById('nm121Css');
    if (!st){ st = document.createElement('style'); st.id = 'nm121Css'; document.head.appendChild(st); }
    st.textContent = css(cfg());
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
      labels.slice(i, i + PER).forEach(function(l){
        /* QR yang dibungkus elemen lain tetap ditaruh di kolom kiri */
        var q = l.querySelector(':scope > svg, :scope > img, :scope > canvas');
        if (!q){ var inner = l.querySelector('svg, img, canvas'); if (inner && inner.parentNode !== l) inner.parentNode.classList.add('nm121-qr'); }
        g.appendChild(l);
      });
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
  wrapped.__nm121 = true;
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
    var cells = ''; for (var i = 0; i < PER; i++) cells += '<div style="border:1.5px solid #2563eb;border-radius:4px;background:#eef4ff;display:flex;align-items:center;gap:4px;padding:3px;font-size:9px;color:#1e3a8a"><span style="width:26px;height:26px;background:repeating-conic-gradient(#1e3a8a 0 25%,#fff 0 50%) 0 0/6px 6px;flex:none"></span>ID · tipe<br>harga</div>';
    box.innerHTML = '<h3>🏷 Kertas Label No. 121 — 38 × 75 mm, 10 label/lembar</h3>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">' +
        '<div style="width:170px;flex:none;background:#fffbe6;border:1px solid #e5d9a6;border-radius:6px;padding:6px;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:40px;gap:4px">' + cells + '</div>' +
        '<div style="flex:1;min-width:240px">' +
          '<p class="dim" style="font-size:12.5px;line-height:1.55;margin:0 0 10px">Setiap 10 label = 1 lembar (2 kolom × 5 baris). QR di kiri, ID, tipe, spek, SN dan harga di kanan. ' +
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
    function read(){ return { top: +box.querySelector('#n121Top').value || 0, left: +box.querySelector('#n121Left').value || 0,
      gapX: +box.querySelector('#n121GapX').value || 0, gapY: +box.querySelector('#n121GapY').value || 0, garis: box.querySelector('#n121Garis').checked }; }
    box.querySelector('#n121Tutup').onclick = function(){ ov.classList.remove('show'); };
    box.querySelector('#n121Simpan').onclick = function(){ save(read()); setCss(); ov.classList.remove('show'); if (typeof showToast === 'function') showToast('Pengaturan label No. 121 disimpan'); };
    box.querySelector('#n121Uji').onclick = function(){ save(read()); ov.classList.remove('show'); cetakUji(); };
    box.querySelector('#n121Reset').onclick = function(){ save(DEF); ov.classList.remove('show'); setCss(); modal(); };
  }
  window.nmLabel121 = modal;

  /* Tombol di halaman Label, di samping tombol Cetak */
  function addBtn(){
    var pb = document.getElementById('printBtn'); if (!pb || document.getElementById('n121Btn')) return;
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
