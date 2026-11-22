/*NM-NOTA-JUAL v1*/
/* Rilis 0058 — Cetak Nota Penjualan untuk unit yang sudah terjual (Sold).
   - Menu Penjualan: tombol 🧾 di setiap baris transaksi.
   - Form Edit Laptop unit Sold yang sudah punya nota penjualan: tombol "🧾 Cetak Nota".
   Sebelum cetak ada jendela kecil: ukuran kertas (A5 / A4 / struk 80 mm), metode bayar, garansi & catatan (diingat di browser ini).
   Data penjualan & stok TIDAK diubah — nota hanya dibaca dari DATA.sales + DATA.stock. */
(function(){
  if (window.nmCetakNotaJual) return;
  var KEY = 'nm-nota-jual';
  function cfg(){ var o = {}; try { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {} return { kertas: o.kertas || 'A5', bayar: o.bayar || 'Tunai', garansi: o.garansi == null ? '' : o.garansi }; }
  function simpan(o){ try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (_) {} }
  function E(v){ return String(v == null ? '' : v).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function R(n){ n = Number(n) || 0; return (typeof rupiah === 'function') ? rupiah(n) : 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function tgl(t){ var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : (t || '-'); }
  function noNota(s){ return 'NJ-' + String(s.tanggal || '').replace(/-/g, '').slice(0, 8) + '-' + String(s.id || ''); }
  function unit(id){ try { return (DATA.stock || []).find(function(x){ return String(x.id) === String(id); }) || null; } catch (_) { return null; } }
  function saleOfUnit(id){ var a = (DATA.sales || []).filter(function(x){ return String(x.id) === String(id); }); return a.length ? a[a.length - 1] : null; }

  function cetak(s, o){
    var u = unit(s.id) || {};
    var spek = [u.processor, u.ram, u.ssd, u.vga, u.layar].filter(Boolean).join(' / ');
    var normal = Number(s.hargaNormal) || ((Number(s.jual) || 0) + (Number(s.diskon) || 0));
    var diskon = Number(s.diskon) || 0, jual = Number(s.jual) || 0, dp = Number(s.dp) || 0;
    var tt = s.tukarTambah || null, nilaiTT = tt ? (Number(tt.nilai) || 0) : 0;
    var sisa = jual - dp - nilaiTT;
    var struk = o.kertas === '80mm';
    var page = struk ? '@page{size:80mm auto;margin:4mm}body{max-width:72mm;font-size:11px}' :
      (o.kertas === 'A4' ? '@page{size:A4;margin:15mm}body{max-width:680px;font-size:13px}' : '@page{size:A5;margin:10mm}body{max-width:560px;font-size:12.5px}');
    var row = function(a, b, cls){ return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + a + '</td><td class="r">' + b + '</td></tr>'; };
    var logo = location.origin + '/tapi/logo';
    var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Nota ' + E(noNota(s)) + '</title><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:16px auto}' + page +
      '.hd{display:flex;align-items:center;gap:12px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px}.hd img{height:' + (struk ? 34 : 52) + 'px;width:auto}' +
      'h1{font-size:' + (struk ? 15 : 19) + 'px;margin:0;letter-spacing:.5px}.sub{color:#555;font-size:.92em;margin-top:2px}' +
      '.ttl{display:flex;justify-content:space-between;align-items:flex-end;margin:6px 0 10px;flex-wrap:wrap;gap:4px}.ttl b{font-size:1.15em;letter-spacing:1px}' +
      'h2{font-size:1em;margin:12px 0 4px;border-bottom:1px solid #999;padding-bottom:3px}table{width:100%;border-collapse:collapse}td{padding:3px 2px;vertical-align:top}' +
      '.r{text-align:right;white-space:nowrap}.dim{color:#555}.tot td{font-weight:700;border-top:1px solid #111;font-size:1.12em;padding-top:5px}' +
      '.lunas{display:inline-block;border:2px solid #15803d;color:#15803d;font-weight:800;padding:2px 10px;border-radius:4px;letter-spacing:2px;transform:rotate(-4deg);margin-top:8px}' +
      '.cat{margin-top:10px;font-size:.92em;white-space:pre-wrap;border:1px dashed #aaa;padding:6px 8px;border-radius:4px}' +
      '.ttd{display:flex;justify-content:space-between;margin-top:' + (struk ? 34 : 50) + 'px;text-align:center}.ttd div{width:42%;border-top:1px solid #333;padding-top:4px}' +
      '.ft{margin-top:14px;text-align:center;color:#666;font-size:.85em}@media print{.np{display:none}}</style></head><body>' +
      '<div class="hd"><img src="' + E(logo) + '" onerror="this.remove()" alt=""><div><h1>NISCAYA MAKASSAR</h1><div class="sub">Laptop second berkualitas · Makassar</div></div></div>' +
      '<div class="ttl"><b>NOTA PENJUALAN</b><span class="dim">No. ' + E(noNota(s)) + '<br>Tanggal: ' + E(tgl(s.tanggal)) + '</span></div>' +
      '<table>' + row('Pembeli', '<b>' + E(s.pembeli || '-') + '</b>') + (s.hp ? row('No. HP', E(s.hp)) : '') + (s.marketing ? row('Marketing', E(s.marketing)) : '') + '</table>' +
      '<h2>Barang</h2><table>' +
        row('<b>' + E(s.laptop || [u.merek, u.tipe].filter(Boolean).join(' ')) + '</b><br><span class="dim">Kode unit: ' + E(s.id) + '</span>' +
          (u.noSeri ? '<br><span class="dim">SN: ' + E(u.noSeri) + '</span>' : '') + (spek ? '<br><span class="dim">' + E(spek) + '</span>' : ''), R(normal)) +
      '</table>' +
      '<h2>Pembayaran</h2><table>' + row('Harga', R(normal)) + (diskon ? row('Diskon' + (u.diskonKet ? ' (' + E(u.diskonKet) + ')' : ''), '− ' + R(diskon)) : '') +
        row('<b>Harga final</b>', '<b>' + R(jual) + '</b>') +
        (dp ? row('DP sudah dibayar', '− ' + R(dp)) : '') +
        (tt ? row('Tukar tambah: ' + E(tt.unitMasuk || 'laptop lama'), '− ' + R(nilaiTT)) : '') +
        row(sisa < 0 ? 'Dikembalikan ke pembeli' : (dp || tt ? 'Pelunasan' : 'Total dibayar'), R(Math.abs(sisa)), 'tot') +
        row('Metode bayar', E(o.bayar)) +
      '</table><div class="lunas">LUNAS</div>' +
      (o.garansi || o.catatan ? '<div class="cat">' + (o.garansi ? '<b>Garansi:</b> ' + E(o.garansi) : '') + (o.garansi && o.catatan ? '\n' : '') + (o.catatan ? '<b>Catatan:</b> ' + E(o.catatan) : '') + '</div>' : '') +
      '<div class="ttd"><div>Pembeli</div><div>NISCAYA MAKASSAR</div></div>' +
      '<div class="ft">Terima kasih telah berbelanja di NISCAYA MAKASSAR</div>' +
      '<div class="np" style="text-align:center;margin-top:16px"><button onclick="window.print()" style="padding:8px 18px;font-size:14px">🖨 Cetak</button></div>' +
      '<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></body></html>';
    var w = window.open('', '_blank');
    if (!w){ if (typeof showToast === 'function') showToast('Pop-up diblokir browser — izinkan pop-up untuk mencetak nota'); return; }
    w.document.write(html); w.document.close();
  }

  /* Jendela pilihan sebelum cetak */
  function buka(s){
    if (!s) return;
    var box = document.getElementById('modalBox'), ov = document.getElementById('overlay');
    if (!box || !ov){ cetak(s, cfg()); return; }
    var c = cfg(), sel = function(id, opts, v){ return '<select id="' + id + '">' + opts.map(function(x){ return '<option value="' + E(x[0]) + '"' + (x[0] === v ? ' selected' : '') + '>' + E(x[1]) + '</option>'; }).join('') + '</select>'; };
    box.innerHTML = '<h3>🧾 Cetak Nota Penjualan</h3>' +
      '<p class="dim" style="font-size:12.5px;margin:-4px 0 12px"><b class="mono">' + E(noNota(s)) + '</b> · ' + E(s.laptop || s.id) + ' · ' + E(s.pembeli || 'tanpa nama pembeli') + ' · ' + R(s.jual) + '</p>' +
      '<div class="form-grid">' +
        '<div class="field"><label>Ukuran kertas</label>' + sel('njKertas', [['A5','A5 (setengah A4)'],['A4','A4'],['80mm','Struk thermal 80 mm']], c.kertas) + '</div>' +
        '<div class="field"><label>Metode bayar</label>' + sel('njBayar', [['Tunai','Tunai'],['Transfer','Transfer bank'],['QRIS','QRIS'],['Tunai + Transfer','Tunai + Transfer']], c.bayar) + '</div>' +
        '<div class="field full"><label>Garansi (opsional, diingat untuk nota berikutnya)</label><input id="njGaransi" placeholder="mis. Garansi toko 7 hari (hardware, bukan software)" value="' + E(c.garansi) + '"></div>' +
        '<div class="field full"><label>Catatan (opsional, hanya untuk nota ini)</label><input id="njCatatan" placeholder="mis. bonus tas & mouse"></div>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="njBatal">Batal</button><button class="btn btn-primary" id="njCetak">🖨 Cetak Nota</button></div>';
    ov.classList.add('show');
    box.querySelector('#njBatal').onclick = function(){ ov.classList.remove('show'); };
    box.querySelector('#njCetak').onclick = function(){
      var o = { kertas: box.querySelector('#njKertas').value, bayar: box.querySelector('#njBayar').value, garansi: box.querySelector('#njGaransi').value.trim() };
      simpan(o); o.catatan = box.querySelector('#njCatatan').value.trim();
      ov.classList.remove('show'); cetak(s, o);
    };
  }
  window.nmCetakNotaJual = function(x){ buka(typeof x === 'number' ? (DATA.sales || [])[x] : x); };
  window.nmCetakNotaUnit = function(id){ var s = saleOfUnit(id); if (s) buka(s); else if (typeof showToast === 'function') showToast('Unit ini belum punya nota penjualan'); };

  /* Tombol 🧾 di tabel Penjualan + tombol di form Edit Laptop (unit Sold) */
  function pasang(){
    try {
      document.querySelectorAll('[data-delsale]').forEach(function(b){
        if (b.previousElementSibling && b.previousElementSibling.hasAttribute('data-nmnota')) return;
        var n = document.createElement('button'); n.type = 'button'; n.className = 'icon-btn'; n.setAttribute('data-nmnota', b.getAttribute('data-delsale'));
        n.title = 'Cetak nota penjualan'; n.textContent = '🧾'; n.style.marginRight = '6px';
        n.onclick = function(ev){ ev.preventDefault(); ev.stopPropagation(); window.nmCetakNotaJual(Number(n.getAttribute('data-nmnota'))); };
        b.parentNode.insertBefore(n, b);
        b.parentNode.style.whiteSpace = 'nowrap';
      });
      var save = document.getElementById('saveStock');
      if (save && !document.getElementById('njUnitBtn') && typeof editingStockId !== 'undefined' && editingStockId){
        var u = unit(editingStockId);
        if (u && u.status === 'Sold' && saleOfUnit(u.id)){
          var id = u.id, k = document.createElement('button'); k.type = 'button'; k.id = 'njUnitBtn'; k.className = 'btn btn-ghost'; k.textContent = '🧾 Cetak Nota';
          k.style.marginRight = 'auto'; k.onclick = function(){ window.nmCetakNotaUnit(id); };
          save.parentNode.insertBefore(k, save.parentNode.firstChild);
        }
      }
    } catch (e) { console.warn('NM-NOTA-JUAL', e); }
  }
  new MutationObserver(pasang).observe(document.body, { childList: true, subtree: true });
  pasang();
})();
