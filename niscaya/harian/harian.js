/*DASH-HARIAN v1*/
/* Panel "Penjualan Harian" di Dashboard: ringkasan hari ini & kemarin, grafik omzet per hari dalam sebulan,
   tabel per tanggal (unit, omzet, laba). Klik batang/baris = daftar penjualan hari itu. Angka memakai sumSales()
   yang sama dengan Dashboard (laba = harga final − modal − biaya − komisi). Hanya tampilan, data tidak diubah. */
(function(){
  if (typeof renderDashboard !== 'function' || renderDashboard.__harian) return;
  var HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  var BLN = (typeof BULAN !== 'undefined' && BULAN) || ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var now0 = new Date();
  window.nmHarianYM = window.nmHarianYM || { y: now0.getFullYear(), m: now0.getMonth() + 1 };
  function E(s){ return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function R(n){ return (typeof rupiah === 'function') ? rupiah(n) : 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(s){
    var t = String(s && s.tanggal || ''), m;
    if ((m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) return { y: +m[1], m: +m[2], d: +m[3] };
    if ((m = t.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) return { y: +m[3], m: +m[2], d: +m[1] };
    return null;
  }
  function sum(l){
    if (typeof sumSales === 'function') return sumSales(l);
    var o = { n: l.length, omzet: 0, laba: 0 };
    l.forEach(function(s){ o.omzet += Number(s.jual) || 0; o.laba += Number(s.untung) || 0; });
    return o;
  }
  function salesOn(y, m, d){ return (DATA.sales || []).filter(function(s){ var p = ymd(s); return p && p.y === y && p.m === m && (d == null || p.d === d); }); }
  function key(y, m, d){ return y + '-' + pad(m) + '-' + pad(d); }
  function label(y, m, d){ var dt = new Date(y, m - 1, d); return HARI[dt.getDay()] + ', ' + d + ' ' + BLN[m - 1] + ' ' + y; }

  function dayModal(y, m, d){
    var l = salesOn(y, m, d).slice(), r = sum(l);
    var box = document.getElementById('modalBox'), ov = document.getElementById('overlay'); if (!box || !ov) return;
    var rows = l.map(function(s){
      var kom = (typeof nmKomisiSale === 'function') ? nmKomisiSale(s) : 0;
      var bia = (typeof saleBiaya === 'function') ? saleBiaya(s) : (Number(s.biaya) || 0);
      var lb = (Number(s.jual) || 0) - (Number(s.modal) || 0) - bia - kom;
      return '<tr data-unit="' + E(s.id) + '" style="cursor:pointer" title="Klik untuk membuka unit"><td><b>' + E(s.laptop || s.id) + '</b><div class="dim mono" style="font-size:11.5px">' + E(s.id) +
        (s.marketing ? ' · ★ ' + E(s.marketing) : '') + (s.pembeli ? ' · ' + E(s.pembeli) : '') + '</div></td>' +
        '<td class="mono">' + R(Number(s.jual) || 0) + '</td><td class="mono">' + R((Number(s.modal) || 0) + bia) + '</td><td class="mono">' + R(kom) + '</td>' +
        '<td class="mono" style="font-weight:600;color:' + (lb < 0 ? 'var(--danger,#dc2626)' : 'var(--ready,#16a34a)') + '">' + R(lb) + '</td></tr>';
    });
    box.innerHTML = '<h3>Penjualan — ' + label(y, m, d) + '</h3>' +
      '<div style="background:var(--bg,#f4f6fb);border-radius:10px;padding:10px 12px;font-weight:700;margin-bottom:12px">' + r.n + ' unit · omzet ' + R(r.omzet) + ' · laba ' + R(r.laba) + '</div>' +
      '<div class="table-wrap" style="max-height:55vh;overflow:auto"><table><thead><tr><th>Unit</th><th>Harga final</th><th>Modal + biaya</th><th>Komisi</th><th>Laba</th></tr></thead><tbody>' +
      (rows.length ? rows.join('') : '<tr><td colspan="5"><div class="empty"><p>Tidak ada penjualan pada hari ini.</p></div></td></tr>') +
      '</tbody></table></div><div class="modal-actions"><button class="btn btn-primary" id="nmHrClose">Tutup</button></div>';
    ov.classList.add('show');
    box.querySelector('#nmHrClose').onclick = function(){ ov.classList.remove('show'); };
    box.querySelectorAll('tr[data-unit]').forEach(function(tr){
      tr.onclick = function(){ ov.classList.remove('show'); if (typeof openStockModal === 'function' && (DATA.stock || []).some(function(x){ return String(x.id) === tr.dataset.unit; })) setTimeout(function(){ openStockModal(tr.dataset.unit); }, 60); };
    });
  }
  window.nmHarianDay = dayModal;

  function build(c){
    var old = c.querySelector('#nmHarianPanel'); if (old) old.remove();
    var Y = nmHarianYM.y, M = nmHarianYM.m, now = new Date();
    var ty = now.getFullYear(), tm = now.getMonth() + 1, td = now.getDate();
    var yd = new Date(ty, tm - 1, td - 1);
    var rT = sum(salesOn(ty, tm, td)), rY = sum(salesOn(yd.getFullYear(), yd.getMonth() + 1, yd.getDate()));
    var nd = new Date(Y, M, 0).getDate(), days = [], max = 0;
    for (var d = 1; d <= nd; d++){ var r = sum(salesOn(Y, M, d)); r.d = d; days.push(r); if (r.omzet > max) max = r.omzet; }
    var mon = sum(salesOn(Y, M)), aktif = days.filter(function(x){ return x.n > 0; });
    var isCur = (Y === ty && M === tm), lastDay = isCur ? td : nd;
    var rata = lastDay ? Math.round(mon.omzet / lastDay) : 0;
    var best = aktif.slice().sort(function(a, b){ return b.omzet - a.omzet; })[0];
    function tile(t, r, sub, bg){
      return '<div style="flex:1;min-width:160px;background:' + bg + ';border-radius:14px;padding:12px 14px">' +
        '<div style="font-size:12px;opacity:.75;font-weight:600">' + t + '</div>' +
        '<div style="font-size:20px;font-weight:800;margin:2px 0" class="mono">' + R(r.omzet) + '</div>' +
        '<div style="font-size:12px;opacity:.8">' + r.n + ' unit · laba ' + R(r.laba) + (sub ? '<br>' + sub : '') + '</div></div>';
    }
    var diff = rT.omzet - rY.omzet;
    var bars = days.map(function(x){
      var h = max ? Math.max(x.omzet ? 6 : 0, Math.round(x.omzet / max * 100)) : 0;
      var isT = isCur && x.d === td, fut = isCur && x.d > td;
      var tip = label(Y, M, x.d) + ' — ' + x.n + ' unit · ' + R(x.omzet);
      return '<div class="nmhr-b" data-d="' + x.d + '" title="' + E(tip) + '" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;cursor:' + (x.n ? 'pointer' : 'default') + '">' +
        (x.n ? '<div style="font-size:9.5px;font-weight:700;color:var(--primary,#2563eb);margin-bottom:2px">' + x.n + '</div>' : '') +
        '<div style="width:72%;max-width:22px;height:' + h + '%;min-height:' + (x.n ? 4 : 0) + 'px;border-radius:5px 5px 2px 2px;background:' + (isT ? 'linear-gradient(180deg,#f59e0b,#f97316)' : 'linear-gradient(180deg,#60a5fa,#2563eb)') + '"></div>' +
        '<div style="font-size:9.5px;margin-top:4px;' + (isT ? 'font-weight:800;color:#f97316' : fut ? 'opacity:.35' : 'opacity:.7') + '">' + x.d + '</div></div>';
    }).join('');
    var rows = aktif.slice().reverse().map(function(x){
      var l = salesOn(Y, M, x.d), names = l.map(function(s){ return E(s.laptop || s.id); });
      return '<tr class="nmhr-r" data-d="' + x.d + '" style="cursor:pointer" title="Klik untuk rincian">' +
        '<td><b>' + label(Y, M, x.d) + '</b>' + (isCur && x.d === td ? ' <span style="background:#fff3e0;color:#f97316;border-radius:6px;padding:1px 6px;font-size:11px;font-weight:700">Hari ini</span>' : '') +
        '<div class="dim" style="font-size:11.5px;white-space:normal">' + names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) + ' lagi' : '') + '</div></td>' +
        '<td class="mono">' + x.n + '</td><td class="mono">' + R(x.omzet) + '</td>' +
        '<td class="mono" style="color:' + (x.laba < 0 ? 'var(--danger,#dc2626)' : 'var(--ready,#16a34a)') + ';font-weight:600">' + R(x.laba) + '</td></tr>';
    }).join('');
    var p = document.createElement('div');
    p.className = 'panel'; p.id = 'nmHarianPanel'; p.style.marginTop = '18px';
    p.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px">' +
        '<h3 style="margin:0">📅 Penjualan Harian — ' + BLN[M - 1] + ' ' + Y + '</h3>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<button class="btn btn-ghost" id="nmHrPrev" title="Bulan sebelumnya">‹</button>' +
          '<input type="month" id="nmHrMonth" class="search" style="width:auto" value="' + Y + '-' + pad(M) + '">' +
          '<button class="btn btn-ghost" id="nmHrNext" title="Bulan berikutnya">›</button>' +
          (isCur ? '' : '<button class="btn btn-ghost" id="nmHrNow">Bulan ini</button>') +
        '</div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">' +
        tile('Hari ini · ' + td + ' ' + BLN[tm - 1], rT, rT.omzet || rY.omzet ? (diff >= 0 ? '▲ ' : '▼ ') + R(Math.abs(diff)) + ' dari kemarin' : '', '#fff3e0') +
        tile('Kemarin · ' + yd.getDate() + ' ' + BLN[yd.getMonth()], rY, '', '#eef4ff') +
        tile('Total ' + BLN[M - 1], mon, 'rata-rata ' + R(rata) + '/hari' + (best ? ' · terbaik tgl ' + best.d : ''), '#ecfdf5') +
      '</div>' +
      '<div style="font-size:12px;opacity:.7;margin-bottom:6px">Omzet per hari — angka di atas batang = unit terjual · klik batang untuk rincian' + (isCur ? ' · <span style="color:#f97316;font-weight:700">oranye = hari ini</span>' : '') + '</div>' +
      '<div style="display:flex;gap:2px;align-items:flex-end;height:170px;padding:6px 2px 0;border-bottom:1px solid rgba(0,0,0,.08);margin-bottom:14px">' + bars + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Unit</th><th>Omzet</th><th>Laba</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="4"><div class="empty"><p>Belum ada penjualan pada ' + BLN[M - 1] + ' ' + Y + '.</p></div></td></tr>') +
      '</tbody>' + (aktif.length ? '<tfoot><tr style="background:#eef4ff;font-weight:700"><td>TOTAL ' + BLN[M - 1].toUpperCase() + ' (' + aktif.length + ' hari ada penjualan)</td><td class="mono">' + mon.n + '</td><td class="mono">' + R(mon.omzet) + '</td><td class="mono">' + R(mon.laba) + '</td></tr></tfoot>' : '') +
      '</table></div>';
    var anchor = c.querySelector('#omzetPanel');
    if (anchor) anchor.parentNode.insertBefore(p, anchor); else c.appendChild(p);
    function go(y, m){ if (m < 1){ m = 12; y--; } if (m > 12){ m = 1; y++; } nmHarianYM = { y: y, m: m }; build(c); }
    p.querySelector('#nmHrPrev').onclick = function(){ go(Y, M - 1); };
    p.querySelector('#nmHrNext').onclick = function(){ go(Y, M + 1); };
    var nb = p.querySelector('#nmHrNow'); if (nb) nb.onclick = function(){ go(ty, tm); };
    p.querySelector('#nmHrMonth').onchange = function(){ var v = this.value.split('-'); if (v.length === 2) go(+v[0], +v[1]); };
    p.querySelectorAll('.nmhr-b, .nmhr-r').forEach(function(el){
      el.onclick = function(){ var d = +el.dataset.d; if (salesOn(Y, M, d).length) dayModal(Y, M, d); };
    });
  }
  var _rd = renderDashboard;
  var w = function(c){ _rd.apply(this, arguments); try { if (c) build(c); } catch (e) { console.warn('DASH-HARIAN', e); } };
  w.__harian = true;
  renderDashboard = w;
  try { if (currentTab === 'dashboard') render(); } catch (_) {}
})();
