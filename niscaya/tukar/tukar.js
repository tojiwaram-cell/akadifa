/*NM-TUKAR v2*/
/* Rilis 0055 — Menu "Tukar Tambah".
   Satu transaksi = (1) unit dari stok dijual ke pelanggan (nota penjualan biasa: omzet = harga final penuh, laba = final − modal − biaya)
                    (2) laptop lama pelanggan masuk ke stok sebagai unit baru (ID berikutnya, status Ready, harga modal = nilai taksiran,
                        supplier "TUKAR TAMBAH", tanggal stok = tanggal transaksi).
   Pelanggan membayar: harga final − nilai taksiran − DP. Bila nilai taksiran lebih besar, toko yang membayar selisihnya.
   Tidak menambah kunci baru di DATA: riwayat dibaca dari DATA.sales[].tukarTambah dan DATA.stock[].tukarTambah,
   jadi ikut tersimpan ke VPS, backup, dan tidak terganggu impor Excel. Pembatalan mengembalikan unit jual ke status semula
   dan menghapus unit masuk (hanya bila unit masuk belum terjual). */
(function(){
  if (window.__nmTukar) return; window.__nmTukar = true;
  var TAB = 'tukar';
  var ST = window.nmTukarState = window.nmTukarState || { bulan: '', cari: '' };
  function D(){ return window.DATA || (typeof DATA !== 'undefined' ? DATA : { stock: [], sales: [] }); }
  function E(v){ try { return esc(v == null ? '' : v); } catch (_) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); } }
  function R(n){ try { return rupiah(Number(n) || 0); } catch (_) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); } }
  function hariIni(){ try { return localYMD(); } catch (_) { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); } }
  function biayaUnit(u){ try { return Number(totalBiaya(u)) || 0; } catch (_) { return (u.biaya || []).reduce(function(a, b){ return a + (Number(b.nominal) || 0); }, 0); } }
  function dpUnit(u){ try { return Number(dpNominal(u)) || 0; } catch (_) { return 0; } }
  function mkOpt(v){ try { return marketingOptions(v || ''); } catch (_) { return '<option value="">— Tanpa marketing —</option>'; } }
  function badge(s){ try { return statusBadge(s); } catch (_) { return E(s); } }
  function rapikanMerek(m){ m = String(m || '').trim().toUpperCase(); try { if (typeof normMerek === 'function'){ var n = normMerek(m); if (n) return String(n).toUpperCase(); } } catch (_) {} return m; }
  function idBaru(){ try { return nextIdFrom(D().stock, []); } catch (_) {
    var mx = 0; (D().stock || []).forEach(function(s){ var m = String(s.id).match(/^LP(\d+)$/i); if (m) mx = Math.max(mx, Number(m[1])); });
    return 'LP' + String(mx + 1).padStart(3, '0'); } }
  function unit(id){ return (D().stock || []).find(function(s){ return String(s.id) === String(id); }) || null; }
  function tglID(s){ var p = String(s || '').slice(0, 10).split('-'); if (p.length < 3) return String(s || '-'); var B = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; return Number(p[2]) + ' ' + (B[Number(p[1]) - 1] || p[1]) + ' ' + p[0]; }
  function riwayat(){
    return (D().sales || []).filter(function(s){ return s && s.tukarTambah; })
      .slice().sort(function(a, b){ return String(b.tanggal || '').localeCompare(String(a.tanggal || '')); });
  }
  function tutup(){ var ov = document.getElementById('overlay'); if (ov) ov.classList.remove('show'); }

  /* ---------- menu ---------- */
  try {
    if (typeof NAV !== 'undefined' && Array.isArray(NAV) && !NAV.some(function(n){ return n.id === TAB; })){
      var k = NAV.findIndex(function(n){ return n.id === 'sales'; });
      NAV.splice(k >= 0 ? k + 1 : NAV.length, 0, { id: TAB, label: 'Tukar Tambah', ic: '⇆', sub: 'Pelanggan tukar laptop lama + tambah uang — unit lama otomatis masuk stok' });
    }
  } catch (e) { console.warn('NM-TUKAR nav', e); }

  /* ---------- halaman ---------- */
  function renderTukar(c, ta){
    ta.innerHTML = '<button class="btn btn-primary" id="ttAddBtn">+ Transaksi Tukar Tambah</button>';
    ta.querySelector('#ttAddBtn').onclick = function(){ bukaForm(); };
    var semua = riwayat();
    var bulanList = []; semua.forEach(function(s){ var b = String(s.tanggal || '').slice(0, 7); if (b && bulanList.indexOf(b) < 0) bulanList.push(b); });
    var q = String(ST.cari || '').trim().toLowerCase();
    var rows = semua.filter(function(s){
      if (ST.bulan && String(s.tanggal || '').slice(0, 7) !== ST.bulan) return false;
      if (!q) return true;
      var t = s.tukarTambah || {};
      return [s.id, s.laptop, s.pembeli, s.hp, t.idMasuk, t.unitMasuk, t.sn].some(function(v){ return String(v || '').toLowerCase().indexOf(q) >= 0; });
    });
    var tot = rows.reduce(function(a, s){ var t = s.tukarTambah || {}; a.jual += Number(s.jual) || 0; a.nilai += Number(t.nilai) || 0; a.tambah += Number(t.tambah) || 0; return a; }, { jual: 0, nilai: 0, tambah: 0 });
    var masukReady = semua.filter(function(s){ var u = unit((s.tukarTambah || {}).idMasuk); return u && u.status !== 'Sold'; }).length;
    var card = function(l, v, sub){ return '<div class="stat-card"><div class="lbl">' + l + '</div><div class="val" style="font-size:19px">' + v + '</div><div class="sub">' + sub + '</div></div>'; };
    var NB = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    var opt = '<option value="">Semua bulan</option>' + bulanList.map(function(b){ return '<option value="' + b + '"' + (ST.bulan === b ? ' selected' : '') + '>' + NB[Number(b.slice(5, 7)) - 1] + ' ' + b.slice(0, 4) + '</option>'; }).join('');
    var body = rows.map(function(s){
      var t = s.tukarTambah || {}, um = unit(t.idMasuk);
      var stMasuk = um ? badge(um.status) : '<span class="dim">dihapus</span>';
      var tambah = Number(t.tambah) || 0;
      return '<tr>' +
        '<td class="mono">' + E(tglID(s.tanggal)) + '</td>' +
        '<td><b>' + E(s.pembeli || '-') + '</b>' + (s.hp ? '<div class="dim" style="font-size:11.5px">' + E(s.hp) + '</div>' : '') + '</td>' +
        '<td><span class="mono dim">' + E(s.id) + '</span> ' + E(s.laptop) + '<div class="mono" style="font-size:12px">' + R(s.jual) + '</div></td>' +
        '<td><span class="mono dim" data-tt-unit="' + E(t.idMasuk) + '" style="cursor:pointer;text-decoration:underline">' + E(t.idMasuk || '-') + '</span> ' + E(t.unitMasuk || '') +
          (t.sn ? '<div class="dim" style="font-size:11.5px">SN ' + E(t.sn) + '</div>' : '') + '</td>' +
        '<td class="mono">' + R(t.nilai) + '</td>' +
        '<td class="mono" style="color:' + (tambah < 0 ? 'var(--danger)' : 'var(--ready-dark,#1f845a)') + '"><b>' + (tambah < 0 ? '− ' + R(-tambah) + '<div style="font-size:10.5px;font-weight:400">toko bayar</div>' : R(tambah)) + '</b></td>' +
        '<td class="mono" style="color:' + (Number(s.untung) < 0 ? 'var(--danger)' : 'inherit') + '">' + R(s.untung) + '</td>' +
        '<td>' + (s.marketing ? '<span class="ktag mkt">★ ' + E(s.marketing) + '</span>' : '<span class="dim">-</span>') + '</td>' +
        '<td>' + stMasuk + '</td>' +
        '<td style="white-space:nowrap"><button class="btn btn-sm" data-tt-nota="' + E(s.id) + '">🧾 Nota</button> <button class="icon-btn btn-danger" title="Batalkan transaksi" data-tt-batal="' + E(s.id) + '">✕</button></td>' +
        '</tr>';
    }).join('');
    c.innerHTML =
      '<div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px">' +
        card('Transaksi', rows.length, ST.bulan ? 'pada bulan terpilih' : 'semua waktu') +
        card('Nilai unit dijual', R(tot.jual), 'harga final (masuk omzet)') +
        card('Nilai tukar (taksiran)', R(tot.nilai), 'jadi modal unit yang masuk stok') +
        card('Uang tambahan diterima', R(tot.tambah), 'tunai/transfer dari pelanggan') +
        card('Unit tukar belum terjual', masukReady, 'unit hasil tukar tambah di stok') +
      '</div>' +
      '<div class="panel">' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
          '<input id="ttCari" class="search" placeholder="Cari pelanggan, ID, tipe, SN…" value="' + E(ST.cari) + '" style="flex:1;min-width:200px">' +
          '<select id="ttBulan">' + opt + '</select>' +
        '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Pelanggan</th><th>Unit Dibeli</th><th>Laptop Lama Masuk</th><th>Nilai Tukar</th><th>Tambahan Dibayar</th><th>Untung</th><th>Marketing</th><th>Status Unit Masuk</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="10"><div class="empty"><div class="ic">⇆</div><p>Belum ada transaksi tukar tambah.' + (semua.length ? ' Tidak ada yang cocok dengan filter.' : ' Klik <b>+ Transaksi Tukar Tambah</b> untuk mencatat yang pertama.') + '</p></div></td></tr>') +
        '</tbody></table></div>' +
        '<div class="dim" style="font-size:11.5px;margin-top:8px">Omzet & laba unit yang dijual tetap dihitung dari harga final penuh. Laptop lama pelanggan masuk ke Stok sebagai unit Ready dengan harga modal = nilai tukar; labanya dihitung nanti saat unit itu terjual.</div>' +
      '</div>';
    var cari = c.querySelector('#ttCari');
    cari.oninput = function(){ ST.cari = this.value; var pos = this.selectionStart; renderTukar(c, ta); var n = c.querySelector('#ttCari'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} };
    c.querySelector('#ttBulan').onchange = function(){ ST.bulan = this.value; renderTukar(c, ta); };
    c.querySelectorAll('[data-tt-batal]').forEach(function(b){ b.onclick = function(){ batalkan(b.getAttribute('data-tt-batal')); }; });
    c.querySelectorAll('[data-tt-nota]').forEach(function(b){ b.onclick = function(){ cetakNota(b.getAttribute('data-tt-nota')); }; });
    c.querySelectorAll('[data-tt-unit]').forEach(function(b){ b.onclick = function(){ var id = b.getAttribute('data-tt-unit'); if (unit(id) && typeof openStockModal === 'function') openStockModal(id); }; });
  }

  /* ---------- form transaksi ---------- */
  function bukaForm(){
    var box = document.getElementById('modalBox'), ov = document.getElementById('overlay'); if (!box || !ov) return;
    var noted = {}; (D().sales || []).forEach(function(x){ noted[String(x.id)] = 1; });
    var avail = (D().stock || []).filter(function(s){ return s.status !== 'Sold' && s.status !== 'Belum Ready' && !noted[String(s.id)]; });
    var opts = avail.map(function(s){ var dp = dpUnit(s);
      return '<option value="' + E(s.id) + '">' + E(s.id) + ' — ' + E(s.merek) + ' ' + E(s.tipe) + ' (' + E(s.status) + (dp ? ' · DP ' + R(dp) : '') + (Number(s.hargaJual) ? ' · ' + R(s.hargaJual) : '') + ')</option>'; }).join('');
    var idMasuk = idBaru();
    var f = function(id, label, attr, full){ return '<div class="field' + (full ? ' full' : '') + '"><label>' + label + '</label><input id="' + id + '" ' + (attr || '') + '></div>'; };
    box.innerHTML =
      '<h3>⇆ Transaksi Tukar Tambah</h3>' +
      '<p class="dim" style="font-size:12.5px;margin:-4px 0 12px">Pelanggan membeli unit dari stok dan menyerahkan laptop lamanya sebagai potongan. Laptop lama otomatis masuk Stok sebagai <b class="mono">' + E(idMasuk) + '</b>.</p>' +
      '<div class="form-grid">' +
        '<div class="sec-title">1 · Pelanggan</div>' +
        f('tt_tanggal', 'Tanggal', 'type="date" value="' + hariIni() + '" max="' + hariIni() + '"') +
        '<div class="field"><label>Marketing yang Jual</label><select id="tt_marketing">' + mkOpt('') + '</select></div>' +
        f('tt_pembeli', 'Nama Pelanggan *', 'placeholder="wajib — untuk riwayat tukar tambah"') +
        f('tt_hp', 'No. HP / WA', 'placeholder="opsional"') +
        '<div class="sec-title">2 · Unit yang dibeli pelanggan (dari stok)</div>' +
        '<div class="field full"><label>Pilih Laptop *</label><select id="tt_unit"><option value="">— Pilih dari stok —</option>' + opts + '</select></div>' +
        f('tt_modal', 'Harga Modal', 'type="number" placeholder="otomatis"') +
        f('tt_biaya', 'Biaya Service/Part', 'type="number" placeholder="otomatis dari unit"') +
        f('tt_hargaNormal', 'Harga Jual Normal *', 'type="number"') +
        f('tt_diskon', 'Diskon (Rp)', 'type="number" placeholder="0"') +
        f('tt_dp', 'DP yang Sudah Masuk', 'type="number" placeholder="0"') +
        f('tt_jual', 'Harga Final (deal)', 'type="number" disabled') +
        '<div class="sec-title">3 · Laptop lama pelanggan (masuk stok)</div>' +
        f('tt_merek', 'Merek *', 'placeholder="mis. ASUS" list="ttMerekList"') +
        f('tt_tipe', 'Tipe *', 'placeholder="mis. X441MA"') +
        f('tt_processor', 'Processor', 'placeholder="mis. Celeron N4020"') +
        f('tt_ram', 'RAM', 'placeholder="mis. 4GB"') +
        f('tt_ssd', 'Penyimpanan', 'placeholder="mis. 256GB SSD"') +
        f('tt_vga', 'VGA', 'placeholder="opsional"') +
        f('tt_layar', 'Layar', 'placeholder="opsional"') +
        f('tt_sn', 'Serial Number', 'placeholder="disarankan diisi"') +
        f('tt_nilai', 'Nilai Tukar / Taksiran *', 'type="number" placeholder="harga yang dipotong ke pelanggan"') +
        f('tt_rencana', 'Rencana Harga Jual', 'type="number" placeholder="opsional — bisa diisi nanti"') +
        f('tt_kondisi', 'Kondisi / Kelengkapan', 'placeholder="mis. charger ada, baterai drop, lecet tipis"', true) +
        '<div class="field full"><div class="price-summary" id="ttSummary"></div></div>' +
      '</div>' +
      '<datalist id="ttMerekList">' + ['ACER','ASUS','LENOVO','HP','DELL','TOSHIBA','AXIOO','ADVAN','APPLE','MSI','SAMSUNG','HUAWEI','INFINIX','ZYREX'].map(function(m){ return '<option value="' + m + '">'; }).join('') + '</datalist>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="ttBatal">Batal</button><button class="btn btn-primary" id="ttSimpan">Simpan Tukar Tambah</button></div>';
    ov.classList.add('show');
    var $ = function(x){ return document.getElementById(x); };
    var num = function(x){ return Number($(x).value) || 0; };
    $('ttBatal').onclick = tutup;
    function hitung(){
      var final = Math.max(0, num('tt_hargaNormal') - num('tt_diskon'));
      $('tt_jual').value = final;
      var nilai = num('tt_nilai'), dp = num('tt_dp');
      var tambah = final - nilai - dp;
      var untung = final - num('tt_modal') - num('tt_biaya');
      $('ttSummary').innerHTML =
        '<div class="ps-row"><span>Harga final unit ' + E($('tt_unit').value || '') + '</span><span class="mono">' + R(final) + '</span></div>' +
        '<div class="ps-row"><span>− Nilai tukar laptop lama</span><span class="mono" style="color:var(--danger)">' + R(nilai) + '</span></div>' +
        (dp ? '<div class="ps-row"><span>− DP yang sudah masuk</span><span class="mono" style="color:var(--danger)">' + R(dp) + '</span></div>' : '') +
        '<div class="ps-row tot" style="font-size:15px;color:' + (tambah < 0 ? 'var(--danger)' : 'var(--ready-dark,#1f845a)') + '"><span>' + (tambah < 0 ? '⚠ Toko membayar ke pelanggan' : 'Uang tambahan dibayar pelanggan') + '</span><span class="mono">' + R(Math.abs(tambah)) + '</span></div>' +
        '<div class="ps-row" style="margin-top:6px"><span>Untung unit dijual (final − modal − biaya)</span><span class="mono" style="color:' + (untung < 0 ? 'var(--danger)' : 'inherit') + '">' + R(untung) + '</span></div>' +
        '<div class="ps-row"><span>Laptop lama masuk stok sebagai</span><span class="mono">' + E(idMasuk) + ' · modal ' + R(nilai) + '</span></div>';
    }
    function isiUnit(){
      var u = unit($('tt_unit').value);
      if (u){
        $('tt_modal').value = Number(u.hargaModal) || 0; $('tt_biaya').value = biayaUnit(u);
        $('tt_hargaNormal').value = Number(u.hargaJual) || 0; $('tt_diskon').value = Number(u.diskon) || 0;
        $('tt_dp').value = dpUnit(u);
        $('tt_marketing').innerHTML = mkOpt(u.marketing || $('tt_marketing').value || '');
        if (u.dp){ if (!$('tt_pembeli').value) $('tt_pembeli').value = u.dp.nama || ''; if (!$('tt_hp').value) $('tt_hp').value = u.dp.hp || ''; }
      }
      hitung();
    }
    $('tt_unit').onchange = isiUnit;
    ['tt_modal','tt_biaya','tt_hargaNormal','tt_diskon','tt_dp','tt_nilai'].forEach(function(x){ $(x).oninput = hitung; });
    hitung();

    $('ttSimpan').onclick = async function(){
      var btn = this;
      var u = unit($('tt_unit').value);
      var nama = $('tt_pembeli').value.trim(), merek = rapikanMerek($('tt_merek').value), tipe = $('tt_tipe').value.trim();
      var nilai = num('tt_nilai'), tgl = $('tt_tanggal').value || hariIni();
      if (!nama){ alert('Isi nama pelanggan dulu'); $('tt_pembeli').focus(); return; }
      if (!u){ alert('Pilih laptop yang dibeli pelanggan'); return; }
      if ((D().sales || []).some(function(x){ return String(x.id) === String(u.id); })){ alert('Unit ' + u.id + ' sudah tercatat terjual'); return; }
      if (!(num('tt_hargaNormal') > 0)){ alert('Isi Harga Jual Normal unit yang dibeli'); return; }
      if (num('tt_diskon') > num('tt_hargaNormal')){ alert('Diskon tidak boleh lebih besar dari harga jual'); return; }
      if (!merek || !tipe){ alert('Isi merek dan tipe laptop lama pelanggan'); return; }
      if (!(nilai > 0)){ alert('Isi nilai tukar (taksiran) laptop lama'); $('tt_nilai').focus(); return; }
      if (tgl > hariIni()){ alert('Tanggal tidak boleh melewati hari ini'); return; }
      var sn = $('tt_sn').value.trim();
      if (sn){
        var dobel = (D().stock || []).find(function(s){ return String(s.noSeri || '').trim().toUpperCase() === sn.toUpperCase(); });
        if (dobel && !confirm('Serial number ' + sn + ' sudah ada di stok (' + dobel.id + ' ' + (dobel.merek || '') + ' ' + (dobel.tipe || '') + '). Tetap simpan?')) return;
      }
      var final = Math.max(0, num('tt_hargaNormal') - num('tt_diskon'));
      var modal = num('tt_modal'), biaya = num('tt_biaya'), dp = num('tt_dp');
      var tambah = final - nilai - dp;
      if (tambah < 0 && !confirm('Nilai tukar lebih besar dari harga unit. Toko akan membayar ' + R(-tambah) + ' ke pelanggan. Lanjutkan?')) return;
      if (nilai > final && final > 0 && nilai > final * 1.5 && !confirm('Nilai tukar ' + R(nilai) + ' jauh di atas harga unit ' + R(final) + ' — cek angka nol. Yakin?')) return;
      btn.disabled = true;
      var idM = idBaru(), mk = $('tt_marketing').value || '';
      var spek = [$('tt_processor').value.trim(), $('tt_ram').value.trim(), $('tt_ssd').value.trim()].filter(Boolean).join('/');
      var kondisi = $('tt_kondisi').value.trim();
      var masuk = {
        id: idM, merek: merek, tipe: tipe, processor: $('tt_processor').value.trim(), ram: $('tt_ram').value.trim(),
        ssd: $('tt_ssd').value.trim(), vga: $('tt_vga').value.trim(), layar: $('tt_layar').value.trim(), stok: 1,
        hargaModal: nilai, hargaJual: num('tt_rencana'), diskon: 0, diskonKet: '', biaya: [], supplier: 'TUKAR TAMBAH',
        marketing: '', linkFoto: '', noSeri: sn, tglAudit: tgl, spekAsli: spek,
        catatan: ('Tukar tambah dari ' + nama + (kondisi ? ' — ' + kondisi : '')).trim(), status: 'Ready',
        tukarTambah: { idJual: u.id, pelanggan: nama, hp: $('tt_hp').value.trim(), tanggal: tgl, nilai: nilai, kondisi: kondisi }
      };
      var nota = {
        tanggal: tgl, id: u.id, laptop: (u.merek || '') + ' ' + (u.tipe || ''), pembeli: nama, hp: $('tt_hp').value.trim(), marketing: mk,
        modal: modal, biaya: biaya, hargaNormal: num('tt_hargaNormal'), diskon: num('tt_diskon'), dp: dp, jual: final, untung: final - modal - biaya,
        tukarTambah: { idMasuk: idM, unitMasuk: merek + ' ' + tipe, sn: sn, nilai: nilai, tambah: tambah, statusAwal: u.status }
      };
      var DT = D();
      DT.sales.push(nota);
      u.status = 'Sold'; u.marketing = mk;
      DT.stock.push(masuk);
      if (!(DT.suppliers || []).some(function(s){ return String(s.supplier).toUpperCase() === 'TUKAR TAMBAH'; })){
        (DT.suppliers = DT.suppliers || []).push({ supplier: 'TUKAR TAMBAH', wa: '', alamat: 'Laptop dari pelanggan tukar tambah' });
      }
      try { await persist(); }
      catch (e) { btn.disabled = false; alert('Gagal menyimpan: ' + (e && e.message || e)); return; }
      tutup();
      try { showToast('Tukar tambah tersimpan — ' + u.id + ' Sold, ' + idM + ' masuk stok'); } catch (_) {}
      try { render(); } catch (_) {}
    };
  }

  /* ---------- batalkan ---------- */
  async function batalkan(idJual){
    var DT = D();
    var nota = (DT.sales || []).find(function(s){ return String(s.id) === String(idJual) && s.tukarTambah; }); if (!nota) return;
    var t = nota.tukarTambah, um = unit(t.idMasuk), uj = unit(idJual);
    if (um && (um.status === 'Sold' || (DT.sales || []).some(function(s){ return String(s.id) === String(um.id); }))){
      alert('Unit tukar ' + um.id + ' sudah terjual — transaksi ini tidak bisa dibatalkan otomatis. Batalkan dulu penjualan ' + um.id + ' di menu Penjualan.'); return;
    }
    var pesan = 'Batalkan tukar tambah ' + (nota.pembeli || '') + '?\n\n• Nota penjualan ' + idJual + ' (' + R(nota.jual) + ') dihapus — omzet & laba ikut berkurang\n• ' + idJual + ' kembali ke status ' + (t.statusAwal && t.statusAwal !== 'Sold' ? t.statusAwal : 'Ready') +
      (um ? '\n• Unit tukar ' + um.id + ' (' + (um.merek || '') + ' ' + (um.tipe || '') + ') dihapus dari stok' : '');
    if (!confirm(pesan)) return;
    DT.sales = DT.sales.filter(function(s){ return s !== nota; });
    if (uj && uj.status === 'Sold') uj.status = (t.statusAwal && t.statusAwal !== 'Sold') ? t.statusAwal : (dpUnit(uj) ? 'DP' : 'Ready');
    if (um) DT.stock = DT.stock.filter(function(s){ return s !== um; });
    try { await persist(); showToast('Tukar tambah dibatalkan'); } catch (e) { alert('Gagal menyimpan: ' + (e && e.message || e)); }
    try { render(); } catch (_) {}
  }

  /* ---------- nota ---------- */
  function cetakNota(idJual){
    var s = (D().sales || []).find(function(x){ return String(x.id) === String(idJual) && x.tukarTambah; }); if (!s) return;
    var t = s.tukarTambah, uj = unit(s.id) || {}, um = unit(t.idMasuk) || {};
    var spekJ = [uj.processor, uj.ram, uj.ssd, uj.vga].filter(Boolean).join(' / ') || uj.spekAsli || '';
    var spekM = [um.processor, um.ram, um.ssd, um.vga].filter(Boolean).join(' / ') || um.spekAsli || '';
    var w = window.open('', '_blank'); if (!w){ alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak nota.'); return; }
    var tambah = Number(t.tambah) || 0;
    var row = function(a, b, bold){ return '<tr' + (bold ? ' class="b"' : '') + '><td>' + a + '</td><td class="r">' + b + '</td></tr>'; };
    w.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Nota Tukar Tambah ' + E(s.id) + '</title><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px;margin:20px auto;font-size:13px}h1{font-size:18px;margin:0}.sub{color:#555;margin:2px 0 14px}' +
      'h2{font-size:13px;margin:14px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}table{width:100%;border-collapse:collapse}td{padding:4px 2px;vertical-align:top}.r{text-align:right;white-space:nowrap}' +
      '.b td{font-weight:700;border-top:1px solid #999;font-size:15px}.ttd{display:flex;justify-content:space-between;margin-top:46px;text-align:center}.ttd div{width:40%;border-top:1px solid #333;padding-top:4px}@page{size:A5;margin:10mm}</style></head><body>' +
      '<h1>NISCAYA MAKASSAR</h1><div class="sub">Nota Tukar Tambah · ' + E(tglID(s.tanggal)) + ' · No. TT-' + E(s.id) + '</div>' +
      '<table>' + row('Pelanggan', E(s.pembeli || '-')) + (s.hp ? row('No. HP', E(s.hp)) : '') + (s.marketing ? row('Marketing', E(s.marketing)) : '') + '</table>' +
      '<h2>Unit yang dibeli</h2><table>' + row('<b>' + E(s.id) + ' — ' + E(s.laptop) + '</b>' + (spekJ ? '<br><span style="color:#555">' + E(spekJ) + '</span>' : '') + (uj.noSeri ? '<br><span style="color:#555">SN ' + E(uj.noSeri) + '</span>' : ''), R(s.hargaNormal || s.jual)) +
        (Number(s.diskon) ? row('Diskon', '− ' + R(s.diskon)) : '') + row('Harga final', R(s.jual)) + '</table>' +
      '<h2>Laptop lama pelanggan (tukar)</h2><table>' + row('<b>' + E(t.unitMasuk || '') + '</b>' + (spekM ? '<br><span style="color:#555">' + E(spekM) + '</span>' : '') + (t.sn ? '<br><span style="color:#555">SN ' + E(t.sn) + '</span>' : '') +
        ((um.tukarTambah || {}).kondisi ? '<br><span style="color:#555">Kondisi: ' + E(um.tukarTambah.kondisi) + '</span>' : ''), '− ' + R(t.nilai)) + '</table>' +
      '<h2>Pembayaran</h2><table>' + row('Harga final unit', R(s.jual)) + row('Nilai tukar laptop lama', '− ' + R(t.nilai)) + (Number(s.dp) ? row('DP sudah dibayar', '− ' + R(s.dp)) : '') +
        row(tambah < 0 ? 'Dibayarkan toko ke pelanggan' : 'Uang tambahan dibayar pelanggan', R(Math.abs(tambah)), true) + '</table>' +
      '<div class="ttd"><div>Pelanggan</div><div>NISCAYA MAKASSAR</div></div>' +
      '<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>');
    w.document.close();
  }

  /* ---------- sambungkan ke render ---------- */
  window.renderTukar = renderTukar;
  window.nmTukarBuka = bukaForm;
  if (typeof window.render === 'function' && !window.render.__nmTukar){
    var asli = window.render;
    var bungkus = function(){
      var r = asli.apply(this, arguments);
      try {
        if (typeof currentTab !== 'undefined' && currentTab === TAB){
          var c = document.getElementById('content'), ta = document.getElementById('topbarActions');
          if (c && ta) renderTukar(c, ta);
        }
      } catch (e) { console.warn('NM-TUKAR', e); }
      return r;
    };
    bungkus.__nmTukar = true;
    window.render = bungkus;
  }
  try { if (typeof renderNav === 'function') renderNav(); } catch (_) {}
  try { if (typeof currentTab !== 'undefined' && currentTab === TAB) window.render(); } catch (_) {}
})();
