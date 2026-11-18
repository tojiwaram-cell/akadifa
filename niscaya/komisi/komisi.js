/*LAPORAN-KOMISI v1*/
/* Rilis 0038 — Laporan pembagian komisi marketing (menu Marketing):
   pilih tanggal mulai & akhir + marketing, tabel per unit terjual (tanggal, ID, tipe, spek, SN, supplier, harga modal, harga akhir,
   marketing, komisi), rekap komisi per marketing, cetak/PDF dan ekspor Excel. Hanya membaca data — tidak mengubah apa pun. */
(function(){
  if (typeof window.renderMarketing !== 'function' || window.renderMarketing.__lapKomisi) return;
  var orig = window.renderMarketing;
  function pad(n){ return String(n).padStart(2, '0'); }
  function ymdOf(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var now = new Date();
  var ST = window.nmLapKomisi = window.nmLapKomisi || {
    dari: ymdOf(new Date(now.getFullYear(), now.getMonth(), 1)), sampai: ymdOf(now), mk: '__semua', buka: true
  };
  function E(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function R(n){ try { return rupiah(Number(n) || 0); } catch (_) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); } }
  function tglID(s){ var p = String(s || '').slice(0, 10).split('-'); if (p.length < 3) return String(s || '-'); var B = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; return Number(p[2]) + ' ' + (B[Number(p[1]) - 1] || p[1]) + ' ' + p[0]; }
  function bersih(v){ v = String(v == null ? '' : v).trim(); return v && v !== '-' ? v : ''; }
  function D(){ return window.DATA || (typeof DATA !== 'undefined' ? DATA : {}); }
  function komisi(s){
    try { if (typeof nmKomisiSale === 'function') return Number(nmKomisiSale(s)) || 0; } catch (_) {}
    var m = (D().marketing || []).find(function(x){ return x.nama === s.marketing; });
    try { return m && typeof komisiFor === 'function' ? Number(komisiFor(m, s)) || 0 : 0; } catch (_) { return 0; }
  }
  function baris(){
    var stock = D().stock || [], byId = {};
    stock.forEach(function(u){ byId[String(u.id)] = u; });
    return (D().sales || []).filter(function(s){
      var t = String(s.tanggal || '').slice(0, 10);
      if (!t || t < ST.dari || t > ST.sampai) return false;
      if (ST.mk === '__semua') return !!bersih(s.marketing);
      if (ST.mk === '__all') return true;
      return s.marketing === ST.mk;
    }).map(function(s){
      var u = byId[String(s.id)] || {};
      var tipe = [bersih(u.merek), bersih(u.tipe)].filter(Boolean).join(' ') || bersih(s.laptop) || '-';
      var spek = [bersih(u.processor), bersih(u.ram), bersih(u.ssd), bersih(u.vga)].filter(Boolean).join(' / ') || bersih(u.spekAsli) || '-';
      var modal = Number(s.modal); if (!modal && modal !== 0 || isNaN(modal)) modal = Number(u.hargaModal) || 0;
      return { tgl: String(s.tanggal || '').slice(0, 10), id: s.id, tipe: tipe, spek: spek, sn: bersih(u.noSeri) || '-',
        supplier: bersih(u.supplier) || '-', modal: modal || 0, akhir: Number(s.jual) || 0, mk: bersih(s.marketing) || '-', kom: komisi(s) };
    }).sort(function(a, b){ return a.tgl < b.tgl ? -1 : a.tgl > b.tgl ? 1 : String(a.id).localeCompare(String(b.id)); });
  }
  function rekap(rows){
    var g = {};
    rows.forEach(function(r){ var k = r.mk; g[k] = g[k] || { mk: k, n: 0, akhir: 0, modal: 0, kom: 0 }; g[k].n++; g[k].akhir += r.akhir; g[k].modal += r.modal; g[k].kom += r.kom; });
    return Object.keys(g).map(function(k){ return g[k]; }).sort(function(a, b){ return b.kom - a.kom; });
  }
  function judulMk(){ return ST.mk === '__semua' ? 'Semua marketing' : ST.mk === '__all' ? 'Semua penjualan' : ST.mk; }
  function periode(){ return tglID(ST.dari) + ' – ' + tglID(ST.sampai); }
  function tabelHTML(rows, cetak){
    var tot = rows.reduce(function(a, r){ a.modal += r.modal; a.akhir += r.akhir; a.kom += r.kom; return a; }, { modal: 0, akhir: 0, kom: 0 });
    var h = '<table' + (cetak ? ' class="t"' : '') + '><thead><tr><th>No</th><th>Tgl Terjual</th><th>ID</th><th>Tipe Laptop</th><th>Spek</th><th>Serial Number</th><th>Supplier</th><th>Harga Modal</th><th>Harga Akhir</th><th>Marketing</th><th>Komisi</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="11" style="text-align:center;padding:18px" class="dim">Tidak ada penjualan pada periode ini.</td></tr>';
    rows.forEach(function(r, i){
      h += '<tr' + (cetak ? '' : ' data-unit="' + E(r.id) + '" style="cursor:pointer" title="Klik untuk membuka unit"') + '><td>' + (i + 1) + '</td><td class="mono">' + E(tglID(r.tgl)) + '</td><td class="mono">' + E(r.id) +
        '</td><td><b>' + E(r.tipe) + '</b></td><td>' + E(r.spek) + '</td><td class="mono">' + E(r.sn) + '</td><td>' + E(r.supplier) +
        '</td><td class="mono" style="text-align:right">' + R(r.modal) + '</td><td class="mono" style="text-align:right">' + R(r.akhir) +
        '</td><td>' + E(r.mk) + '</td><td class="mono" style="text-align:right"><b>' + R(r.kom) + '</b></td></tr>';
    });
    h += '</tbody><tfoot><tr style="font-weight:700"><td colspan="7">TOTAL (' + rows.length + ' unit)</td><td class="mono" style="text-align:right">' + R(tot.modal) +
      '</td><td class="mono" style="text-align:right">' + R(tot.akhir) + '</td><td></td><td class="mono" style="text-align:right">' + R(tot.kom) + '</td></tr></tfoot></table>';
    return h;
  }
  function rekapHTML(rows){
    var g = rekap(rows); if (!g.length) return '';
    var h = '<table><thead><tr><th>Marketing</th><th>Unit Terjual</th><th>Total Harga Akhir</th><th>Komisi Diterima</th></tr></thead><tbody>';
    g.forEach(function(x){ h += '<tr><td><b>' + E(x.mk) + '</b></td><td class="mono">' + x.n + '</td><td class="mono" style="text-align:right">' + R(x.akhir) + '</td><td class="mono" style="text-align:right"><b>' + R(x.kom) + '</b></td></tr>'; });
    var t = g.reduce(function(a, x){ a.n += x.n; a.akhir += x.akhir; a.kom += x.kom; return a; }, { n: 0, akhir: 0, kom: 0 });
    return h + '</tbody><tfoot><tr style="font-weight:700"><td>TOTAL</td><td class="mono">' + t.n + '</td><td class="mono" style="text-align:right">' + R(t.akhir) + '</td><td class="mono" style="text-align:right">' + R(t.kom) + '</td></tr></tfoot></table>';
  }
  function cetak(){
    var rows = baris(), w = window.open('', '_blank');
    if (!w){ alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.'); return; }
    w.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Komisi Marketing ' + E(ST.dari) + ' sd ' + E(ST.sampai) + '</title><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:18px;font-size:11px}h1{font-size:17px;margin:0}h2{font-size:13px;margin:16px 0 6px}.sub{color:#555;margin:3px 0 12px}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:8px}th,td{border:1px solid #999;padding:4px 5px;vertical-align:top}th{background:#eee;text-align:left}tfoot td{background:#f5f5f5}.mono{font-family:Consolas,monospace;white-space:nowrap}' +
      '.ttd{display:flex;justify-content:space-between;margin-top:36px}.ttd div{width:40%;text-align:center}@page{size:A4 landscape;margin:10mm}</style></head><body>' +
      '<h1>NISCAYA MAKASSAR — Laporan Pembagian Komisi Marketing</h1><div class="sub">Periode: <b>' + E(periode()) + '</b> · Marketing: <b>' + E(judulMk()) + '</b> · Dicetak ' + E(tglID(ymdOf(new Date()))) + '</div>' +
      '<h2>Rekap komisi per marketing</h2>' + (rekapHTML(rows) || '<p>Tidak ada data.</p>') + '<h2>Rincian unit terjual</h2>' + tabelHTML(rows, true) +
      '<div class="ttd"><div>Mengetahui,<br><br><br><br>( Owner )</div><div>Diterima oleh,<br><br><br><br>( Marketing )</div></div>' +
      '<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>');
    w.document.close();
  }
  function excel(){
    if (!window.XLSX){ alert('Pustaka Excel belum termuat. Periksa koneksi internet lalu coba lagi.'); return; }
    var rows = baris();
    var aoa = [['NISCAYA MAKASSAR — Laporan Pembagian Komisi Marketing'], ['Periode: ' + periode() + ' · Marketing: ' + judulMk()], [],
      ['No', 'Tanggal Terjual', 'ID', 'Tipe Laptop', 'Spek', 'Serial Number', 'Supplier', 'Harga Modal', 'Harga Akhir', 'Marketing', 'Komisi']];
    rows.forEach(function(r, i){ aoa.push([i + 1, r.tgl, r.id, r.tipe, r.spek, r.sn, r.supplier, r.modal, r.akhir, r.mk, r.kom]); });
    var t = rows.reduce(function(a, r){ a[0] += r.modal; a[1] += r.akhir; a[2] += r.kom; return a; }, [0, 0, 0]);
    aoa.push(['', 'TOTAL', rows.length + ' unit', '', '', '', '', t[0], t[1], '', t[2]]);
    aoa.push([], ['REKAP PER MARKETING'], ['Marketing', 'Unit Terjual', 'Total Harga Akhir', 'Komisi Diterima']);
    rekap(rows).forEach(function(x){ aoa.push([x.mk, x.n, x.akhir, x.kom]); });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [6, 14, 9, 30, 32, 22, 18, 14, 14, 14, 13].map(function(w){ return { wch: w }; });
    var fmt = '"Rp"#,##0';
    Object.keys(ws).forEach(function(k){ if (k[0] === '!') return; var c = ws[k]; if (c.t === 'n' && c.v >= 1000) c.z = fmt; });
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Komisi Marketing');
    XLSX.writeFile(wb, 'NISCAYA_MAKASSAR_Komisi_Marketing_' + ST.dari + '_sd_' + ST.sampai + '.xlsx');
  }
  function build(c){
    var old = c.querySelector('#nmLapKomisi'); if (old) old.remove();
    var rows = baris(), mks = (D().marketing || []).map(function(m){ return m.nama; }).filter(Boolean);
    var tot = rows.reduce(function(a, r){ a.akhir += r.akhir; a.kom += r.kom; return a; }, { akhir: 0, kom: 0 });
    var opt = '<option value="__semua">Semua marketing</option>' + mks.map(function(n){ return '<option value="' + E(n) + '">' + E(n) + '</option>'; }).join('') +
      '<option value="__all">Semua penjualan (termasuk tanpa marketing)</option>';
    var p = document.createElement('div'); p.id = 'nmLapKomisi'; p.className = 'panel';
    p.style.cssText = 'margin-bottom:16px;padding:16px;border-radius:14px';
    p.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;cursor:pointer" id="nmLkHead">' +
      '<h3 style="margin:0;font-size:16px">📄 Laporan Pembagian Komisi Marketing</h3><span class="dim" style="font-size:12px">' + (ST.buka ? '▲ tutup' : '▼ buka') + '</span></div>' +
      '<div id="nmLkBody" style="' + (ST.buka ? '' : 'display:none') + '">' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:12px 0">' +
      '<label style="display:flex;flex-direction:column;font-size:12px;gap:4px">Tanggal mulai<input type="date" id="nmLkDari" value="' + E(ST.dari) + '"></label>' +
      '<label style="display:flex;flex-direction:column;font-size:12px;gap:4px">Tanggal akhir<input type="date" id="nmLkSampai" value="' + E(ST.sampai) + '"></label>' +
      '<label style="display:flex;flex-direction:column;font-size:12px;gap:4px">Marketing<select id="nmLkMk">' + opt + '</select></label>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-cepat="ini">Bulan ini</button><button class="btn" data-cepat="lalu">Bulan lalu</button></div>' +
      '<div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap"><button class="btn btn-primary" id="nmLkPrint">🖨 Cetak / PDF</button><button class="btn" id="nmLkXls">⬇ Excel</button></div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
      '<div class="stat-card" style="flex:1;min-width:150px"><div class="lbl">Unit terjual</div><div class="val" style="font-size:19px">' + rows.length + '</div></div>' +
      '<div class="stat-card" style="flex:1;min-width:150px"><div class="lbl">Total harga akhir</div><div class="val" style="font-size:19px">' + R(tot.akhir) + '</div></div>' +
      '<div class="stat-card" style="flex:1;min-width:150px"><div class="lbl">Total komisi</div><div class="val" style="font-size:19px">' + R(tot.kom) + '</div></div></div>' +
      (rows.length ? '<div class="table-wrap" style="margin-bottom:12px">' + rekapHTML(rows) + '</div>' : '') +
      '<div class="table-wrap" style="max-height:60vh;overflow:auto">' + tabelHTML(rows, false) + '</div>' +
      '<div class="dim" style="font-size:11.5px;margin-top:8px">Harga modal = modal yang tercatat di nota penjualan · Harga akhir = harga jual final · Komisi dihitung dengan aturan komisi tiap marketing (nominal per unit / % untung).</div></div>';
    c.insertBefore(p, c.firstChild);
    var sel = p.querySelector('#nmLkMk'); sel.value = ST.mk; if (sel.value !== ST.mk){ ST.mk = '__semua'; sel.value = ST.mk; }
    function ulang(){ build(c); }
    p.querySelector('#nmLkHead').onclick = function(){ ST.buka = !ST.buka; ulang(); };
    p.querySelector('#nmLkDari').onchange = function(){ if (this.value){ ST.dari = this.value; if (ST.sampai < ST.dari) ST.sampai = ST.dari; ulang(); } };
    p.querySelector('#nmLkSampai').onchange = function(){ if (this.value){ ST.sampai = this.value; if (ST.dari > ST.sampai) ST.dari = ST.sampai; ulang(); } };
    sel.onchange = function(){ ST.mk = this.value; ulang(); };
    p.querySelectorAll('[data-cepat]').forEach(function(b){ b.onclick = function(){
      var d = new Date(), y = d.getFullYear(), m = d.getMonth();
      if (b.dataset.cepat === 'lalu'){ ST.dari = ymdOf(new Date(y, m - 1, 1)); ST.sampai = ymdOf(new Date(y, m, 0)); }
      else { ST.dari = ymdOf(new Date(y, m, 1)); ST.sampai = ymdOf(d); }
      ulang(); }; });
    p.querySelector('#nmLkPrint').onclick = cetak;
    p.querySelector('#nmLkXls').onclick = excel;
    p.querySelectorAll('tr[data-unit]').forEach(function(tr){ tr.onclick = function(){
      if (typeof openStockModal === 'function' && (D().stock || []).some(function(x){ return String(x.id) === tr.dataset.unit; })) openStockModal(tr.dataset.unit); }; });
  }
  function wrapped(c, ta){
    var r = orig.apply(this, arguments);
    try { if (c) build(c); } catch (err) { console.warn('LAPORAN-KOMISI', err); }
    return r;
  }
  wrapped.__lapKomisi = true;
  window.renderMarketing = wrapped;
  try { if (window.currentTab === 'marketing' && typeof window.render === 'function') window.render(); } catch (e2) {}
})();
