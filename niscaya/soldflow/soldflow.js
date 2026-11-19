/*SOLDFLOW v6*/
/* Rilis 0023 — alur unit terjual:
   - QR label berisi tautan /tapi/u/<ID> (status & harga selalu terbaru); label lama (teks) tetap terbaca
   - Scan unit Sold/Booking/DP memunculkan peringatan besar
   - Halaman Label: unit Sold disembunyikan (bisa ditampilkan), cetak label Sold minta konfirmasi
   - Kanban: kolom Sold hanya bulan ini + tombol arsip (data tidak dihapus)
   - Katalog WA: tanggal stok + link katalog online
   - v4 (rilis 0032): cuplikan publik ikut membawa No Seri (SN) untuk halaman QR
   - v5 (rilis 0037): QR label berisi TEKS info unit (tipe, SN, spek, harga akhir, WA) — discan kamera HP langsung tampil tanpa link.
     Harga ikut tercetak saat label dibuat; ubah harga = cetak ulang label. Baris 'ID: <ID>' tetap ada agar scanner aplikasi mengenali unit.
     Label lama (tautan /tapi/u/<ID>) tetap terbaca.
   - v6 (rilis 0049): QR label kembali berisi TAUTAN unit saja (http://<server>/tapi/u/<ID>) — discan kamera HP langsung tampil link,
     ketuk untuk membuka halaman unit (spek, SN, harga & status terbaru). Label teks lama tetap terbaca scanner aplikasi.
   - Cuplikan stok publik (tanpa modal/supplier/pembeli) dikirim ke server untuk halaman QR & katalog online */
(function(){
  if(window.__soldFlow) return; window.__soldFlow = 1;
  var ORIGIN = location.origin;
  var SF = { arsip:false, labelSold:false };
  function has(n){ return typeof window[n] === 'function'; }
  function E(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function today(){ try{ return localYMD(); }catch(_){ var d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); } }
  function saleOf(id){ return ((DATA && DATA.sales) || []).find(function(x){ return String(x.id) === String(id); }); }
  function rp(n){ try{ return rupiah(n); }catch(_){ return 'Rp ' + (Number(n)||0).toLocaleString('id-ID'); } }
  function unitUrl(id){ return ORIGIN + '/tapi/u/' + encodeURIComponent(String(id == null ? '' : id)); }
  function hariLalu(ymd){ var d = new Date(String(ymd) + 'T00:00:00'); if(isNaN(d)) return ''; var n = Math.round((new Date(today() + 'T00:00:00') - d) / 86400000); return n <= 0 ? 'hari ini' : n + ' hari lalu'; }

  /* ---- QR: tautan unit ---- */
  var WA_TOKO = '08218942735';
  function qrInfo(s){
    s = s || {};
    var akhir = 0;
    try{ akhir = Number(hargaAkhir(s)) || 0; }catch(_){ akhir = Math.max(0, (Number(s.hargaJual)||0) - (Number(s.diskon)||0)); }
    var bersih = function(v){ v = String(v == null ? '' : v).trim(); return v && v !== '-' ? v : ''; };
    var nm = [bersih(s.merek), bersih(s.tipe)].filter(Boolean).join(' ');
    var spek = [bersih(s.processor), bersih(s.ram), bersih(s.ssd)].filter(Boolean).join(' / ');
    /* ID di baris pertama: scanner USB yang mengirim Enter per baris tetap membaca ID unit */
    var L = ['NISCAYA MAKASSAR | ID: ' + (s.id || '-')];
    if(nm) L.push(nm);
    L.push('SN: ' + (bersih(s.noSeri) || '-'));
    if(spek) L.push(spek);
    L.push('Harga: ' + (akhir > 0 ? rp(akhir) : 'Tanya harga'));
    L.push('WA: ' + WA_TOKO);
    return L.join('\n');
  }
  /* v6: isi QR = tautan unit saja (qrInfo teks disimpan sebagai cadangan) */
  function qrLink(s){ return unitUrl((s || {}).id || ''); }
  window.qrInfoTeks = qrInfo;
  if(has('qrText')) window.qrText = qrLink;
  if(has('scanCode')){
    var _scanCode = window.scanCode;
    window.scanCode = function(raw){
      var m = String(raw || '').match(/\/tapi\/u\/([^\s?#\/]+)/i);
      if(m){ try{ return decodeURIComponent(m[1]); }catch(_){ return m[1]; } }
      return _scanCode.apply(this, arguments);
    };
  }

  /* ---- Peringatan saat scan ---- */
  function alertBox(it){
    var st = it.status, old = document.getElementById('sfAlert'); if(old) old.remove();
    if(st !== 'Sold' && st !== 'Booking' && st !== 'DP') return;
    var sold = st === 'Sold', x = saleOf(it.id), info = '';
    if(sold) info = x ? ('Terjual ' + E(x.tanggal || '-') + (x.tanggal ? ' (' + hariLalu(x.tanggal) + ')' : '') + (x.pembeli ? ' ke <b>' + E(x.pembeli) + '</b>' : '') + ' · ' + rp(x.jual)) : 'Status Sold, tetapi nota penjualan belum dicatat.';
    else info = (st === 'DP' ? 'Sudah DP' : 'Booking') + (it.dp && it.dp.nama ? ' atas nama <b>' + E(it.dp.nama) + '</b>' : '') + '. Jangan ditawarkan ke pembeli lain.';
    var d = document.createElement('div'); d.id = 'sfAlert';
    d.setAttribute('style', 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483000;max-width:min(560px,94vw);width:100%;' +
      'background:' + (sold ? '#dc2626' : '#ea580c') + ';color:#fff;border-radius:16px;padding:16px 46px 16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.35);font:14px/1.5 system-ui,sans-serif');
    d.innerHTML = '<div style="font-size:20px;font-weight:800;letter-spacing:.5px">' + (sold ? '⛔ UNIT SUDAH TERJUAL' : '🕓 UNIT SUDAH DIPESAN') + '</div>' +
      '<div style="font-weight:700;margin:2px 0 4px">' + E(it.id) + ' · ' + E(it.merek) + ' ' + E(it.tipe) + '</div><div>' + info + '</div>' +
      (sold ? '<div style="margin-top:6px;opacity:.9">Jangan dijual lagi. Lepas label dari unit display bila masih tertempel.</div>' : '') +
      '<button type="button" aria-label="Tutup" style="position:absolute;right:10px;top:10px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(255,255,255,.25);color:#fff;font-size:16px;cursor:pointer">✕</button>';
    d.querySelector('button').onclick = function(){ d.remove(); };
    document.body.appendChild(d);
    clearTimeout(window.__sfAlertT); window.__sfAlertT = setTimeout(function(){ d.remove(); }, 15000);
  }
  if(has('scanLookup')){
    var _scanLookup = window.scanLookup;
    window.scanLookup = function(code){
      var r = _scanLookup.apply(this, arguments);
      try{
        var k = scanCode(code); if(k){ var lk = String(k).toLowerCase();
          var it = DATA.stock.find(function(s){ return String(s.id).toLowerCase() === lk; }) || DATA.stock.find(function(s){ return s.noSeri && String(s.noSeri).toLowerCase() === lk; });
          if(it) alertBox(it); }
      }catch(_){}
      return r;
    };
  }

  /* ---- Kanban: kolom Sold hanya bulan ini ---- */
  if(has('renderStock')){
    var _renderStock = window.renderStock;
    window.renderStock = function(c, ta){
      try{ if(typeof stockSearch === 'string' && /\/tapi\/u\//i.test(stockSearch)) stockSearch = scanCode(stockSearch); }catch(_){}
      var all = DATA.stock, hidden = 0, r, cur = today().slice(0, 7);
      var srch = ''; try{ srch = String(stockSearch || '').trim(); }catch(_){}
      var flt = 'Semua'; try{ flt = stockStatusFilter; }catch(_){}
      if(!SF.arsip && !srch && flt !== 'Sold'){
        var keep = all.filter(function(s){
          if(s.status !== 'Sold') return true;
          var x = saleOf(s.id); if(!x || !x.tanggal) return true;
          if(String(x.tanggal).slice(0, 7) >= cur) return true;
          hidden++; return false;
        });
        if(hidden) DATA.stock = keep;
      }
      try{ r = _renderStock.apply(this, arguments); }
      finally{ if(hidden) DATA.stock = all; }
      try{
        var col = (c || document).querySelector('.list[data-status="Sold"]'), h = col && col.querySelector('.list-header');
        var total = all.filter(function(s){ return s.status === 'Sold'; }).length;
        if(h && total && !col.querySelector('.sf-arsip')){
          var b = document.createElement('button'); b.type = 'button'; b.className = 'sf-arsip';
          b.setAttribute('style', 'display:block;width:calc(100% - 16px);margin:0 8px 8px;padding:6px 8px;border:1px dashed #94a3b8;border-radius:8px;background:#f8fafc;color:#334155;font-size:12px;cursor:pointer;text-align:left');
          b.textContent = SF.arsip ? '📂 Menampilkan semua (' + total + ') · tampilkan bulan ini saja' : (hidden ? '🗓 Bulan ini · lihat arsip ' + hidden + ' unit terjual ▸' : '🗓 Penjualan bulan ini');
          b.onclick = function(){ SF.arsip = !SF.arsip; renderStock(c, ta); };
          h.after(b);
        }
      }catch(_){}
      return r;
    };
  }

  /* ---- Halaman Label QR ---- */
  if(has('renderBarcode')){
    var _renderBarcode = window.renderBarcode;
    window.renderBarcode = function(c, ta){
      var flt = 'Semua'; try{ flt = stockStatusFilter; }catch(_){}
      var show = SF.labelSold || flt === 'Sold', all = DATA.stock, hidden = 0, r;
      if(!show){
        var keep = all.filter(function(s){ if(s.status === 'Sold'){ hidden++; return false; } return true; });
        if(hidden) DATA.stock = keep;
      }
      try{ r = _renderBarcode.apply(this, arguments); }
      finally{ if(hidden) DATA.stock = all; }
      try{
        var totalSold = all.filter(function(s){ return s.status === 'Sold'; }).length;
        var p = c.querySelector('p.dim');
        if(p && /QR Code unik/.test(p.textContent)) p.innerHTML = 'Setiap unit punya <b>QR Code unik</b> berisi tautan unit. Discan dengan kamera HP, pembeli melihat <b>spek, harga terbaru, dan status</b> (Tersedia / Sudah dipesan / Sudah terjual) tanpa perlu cetak ulang saat harga berubah. Discan di aplikasi (kolom pencarian / alat scanner) langsung membuka data unit. Label lama tetap terbaca.';
        var inp = c.querySelector('#bcSearchInput'), host = inp && inp.parentElement;
        if(host && totalSold && !c.querySelector('#sfLabelSold')){
          var lb = document.createElement('label');
          lb.setAttribute('style', 'display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#475569;margin-left:8px;cursor:pointer;white-space:nowrap');
          lb.innerHTML = '<input type="checkbox" id="sfLabelSold"' + (show ? ' checked' : '') + (flt === 'Sold' ? ' disabled' : '') + '> Tampilkan unit terjual' + (hidden ? ' (' + hidden + ' disembunyikan)' : '');
          lb.querySelector('input').onchange = function(){ SF.labelSold = this.checked; renderBarcode(c, ta); };
          host.appendChild(lb);
        }
      }catch(_){}
      return r;
    };
  }
  if(has('printBarcodeLabels')){
    var _print = window.printBarcodeLabels;
    window.printBarcodeLabels = async function(){
      var args = arguments, self = this;
      try{
        var sold = DATA.stock.filter(function(s){ return barcodeSelected.has(s.id) && s.status === 'Sold'; });
        if(sold.length){
          var rows = sold.slice(0, 8).map(function(s){ return [s.id + ' · ' + (s.merek || '') + ' ' + (s.tipe || ''), 'Sold', 'tetap dicetak']; });
          if(sold.length > 8) rows.push(['… dan ' + (sold.length - 8) + ' unit lain', 'Sold', 'tetap dicetak']);
          var judul = 'Cetak label ' + sold.length + ' unit yang SUDAH TERJUAL?';
          setTimeout(function(){ try{
            var box = [].slice.call(document.querySelectorAll('h3,h4,.title,div')).filter(function(el){ return el.children.length === 0 && el.textContent.trim() === judul; }).pop();
            var m = box; for(var i = 0; m && i < 6 && !m.querySelector('button'); i++) m = m.parentElement;
            if(!m) return;
            [].forEach.call(m.querySelectorAll('button'), function(b){ if(b.textContent.trim() === 'Simpan') b.textContent = '🖨 Tetap cetak'; });
            [].forEach.call(m.querySelectorAll('p,div,small'), function(el){ if(el.children.length === 0 && /sebelum disimpan/i.test(el.textContent)) el.textContent = 'Unit ini sudah terjual. Cetak hanya bila memang perlu (mis. arsip atau garansi).'; });
          }catch(_){} }, 30);
          var ok = has('confirmChange') ? await confirmChange(judul, rows) : confirm('Ada ' + sold.length + ' unit terjual di pilihan. Tetap cetak?');
          if(!ok){ try{ showToast('Cetak dibatalkan'); }catch(_){} return; }
        }
      }catch(_){}
      return _print.apply(self, args);
    };
  }

  /* ---- Katalog WA: tanggal stok (baris link katalog online dihapus sejak 0028) ---- */
  document.addEventListener('click', function(e){
    if(!e.target.closest || !e.target.closest('#genCatalog')) return;
    setTimeout(function(){
      var o = document.getElementById('waOutput'); if(!o || !o.value.trim()) return;
      var t = new Date(), bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      var L1 = '🗓 Stok & harga per ' + t.getDate() + ' ' + bln[t.getMonth()] + ' ' + t.getFullYear() + ', ' + String(t.getHours()).padStart(2, '0') + '.' + String(t.getMinutes()).padStart(2, '0') + ' — bisa berubah sewaktu-waktu.';
      var v = o.value.replace(/\n*🗓 Stok & harga per[^\n]*/g, '').replace(/\n*🔎 Cek unit yang masih tersedia:[^\n]*/g, '');
      o.value = v.trimEnd() + '\n\n' + L1;
      try{ o.dispatchEvent(new Event('input', {bubbles:true})); }catch(_){}
    }, 160);
  }, true);

  /* ---- Cuplikan stok publik untuk halaman QR & katalog online ---- */
  var PUB = { last:'', busy:false, fail:0, tick:0 };
  function snapshot(){
    return DATA.stock.map(function(s){
      var x = s.status === 'Sold' ? saleOf(s.id) : null, ha = 0;
      try{ ha = Number(hargaAkhir(s)) || 0; }catch(_){ ha = Math.max(0, (Number(s.hargaJual)||0) - (Number(s.diskon)||0)); }
      return { i:String(s.id), m:s.merek||'', t:s.tipe||'', p:s.processor||'', r:s.ram||'', d:s.ssd||'', l:s.layar||'', v:s.vga||'',
               h:Number(s.hargaJual)||0, k:Number(s.diskon)||0, a:ha, s:s.status||'', f:/^https?:\/\//i.test(s.linkFoto||'') ? s.linkFoto : '', j:(x && x.tanggal) || '', n:s.noSeri||'' };
    });
  }
  async function publish(){
    PUB.tick++;
    if(PUB.busy || (PUB.fail > 3 && PUB.tick % 12)) return;
    try{
      if(typeof SYNC === 'undefined' || SYNC.version == null) return;
      if(!DATA || !Array.isArray(DATA.stock) || !DATA.stock.length) return;
      var body = JSON.stringify({ units: snapshot() });
      if(body === PUB.last) return;
      PUB.busy = true;
      var r = await fetch('/tapi/owner/publik', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:body });
      if(r.ok){ PUB.last = body; PUB.fail = 0; } else PUB.fail++;
    }catch(_){ PUB.fail++; }
    finally{ PUB.busy = false; }
  }
  setTimeout(publish, 1500); setInterval(publish, 5000);
  window.__sfPublish = publish;
})();
