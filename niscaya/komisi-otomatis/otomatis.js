/*KOMISI-OTOMATIS v1*/
/* Rilis 0039 — komisi marketing otomatis Rp 50.000 per laptop:
   - Setiap penjualan yang punya Marketing → komisi Rp 50.000 (tidak perlu diisi manual; berlaku di Dashboard, Penjualan, Marketing, Harian, Laporan Komisi)
   - Penjualan tanpa marketing → komisi Rp 0
   - Form Tambah/Edit Marketing: tipe & besaran komisi terkunci di Nominal Rp 50.000
   - Form Catat Penjualan: keterangan komisi otomatis muncul saat marketing dipilih
   Data penjualan & marketing tidak diubah; hanya cara hitung komisi. */
(function(){
  if (window.__komisiOtomatis) return; window.__komisiOtomatis = 1;
  var KOMISI = 50000;
  function rp(n){ try { return rupiah(n); } catch (_) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); } }
  function ada(v){ v = String(v == null ? '' : v).trim(); return !!v && v !== '-'; }
  window.NM_KOMISI_PER_UNIT = KOMISI;
  window.komisiFor = function(m, s){ return s && ada(s.marketing) ? KOMISI : 0; };
  window.nmKomisiSale = function(s){ return s && ada(s.marketing) ? KOMISI : 0; };

  function kunciMarketing(){
    var box = document.getElementById('modalBox'); if (!box) return;
    var tipe = box.querySelector('#m_tipe'), kom = box.querySelector('#m_komisi'); if (!tipe || !kom) return;
    tipe.value = 'nominal'; tipe.disabled = true;
    kom.value = String(KOMISI); kom.readOnly = true; kom.style.opacity = '.75';
    try { kom.dispatchEvent(new Event('input', { bubbles: true })); tipe.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    if (!box.querySelector('#nmKomNote')){
      var n = document.createElement('div'); n.id = 'nmKomNote'; n.className = 'dim';
      n.style.cssText = 'font-size:12px;margin-top:6px';
      n.textContent = '🔒 Komisi otomatis ' + rp(KOMISI) + ' per laptop yang terjual lewat marketing ini.';
      (kom.parentNode || box).appendChild(n);
    }
    var save = box.querySelector('#saveMkt');
    if (save && !save.__nmKom){ save.__nmKom = 1; save.addEventListener('click', function(){ tipe.disabled = false; tipe.value = 'nominal'; kom.value = String(KOMISI); }, true); }
  }
  function catatanPenjualan(){
    var box = document.getElementById('modalBox'); if (!box) return;
    var sel = box.querySelector('#s_marketing'); if (!sel) return;
    var n = box.querySelector('#nmKomSale');
    if (!n){ n = document.createElement('div'); n.id = 'nmKomSale'; n.style.cssText = 'font-size:12px;margin-top:6px;font-weight:600'; (sel.parentNode || box).appendChild(n); }
    function upd(){ var on = ada(sel.value); n.textContent = on ? '✅ Komisi ' + sel.value + ': ' + rp(KOMISI) + ' (otomatis)' : 'Tanpa marketing — tidak ada komisi'; n.style.color = on ? 'var(--ready,#16a34a)' : ''; n.style.opacity = on ? '1' : '.6'; }
    sel.addEventListener('change', upd); upd();
  }
  function bungkus(nama, fn){
    var o = window[nama]; if (typeof o !== 'function' || o.__nmKom) return;
    var w = function(){ var r = o.apply(this, arguments); try { setTimeout(fn, 0); } catch (_) {} return r; };
    w.__nmKom = 1; window[nama] = w;
  }
  bungkus('openMarketingModal', kunciMarketing);
  bungkus('openSaleModal', catatanPenjualan);
  try { if (typeof window.render === 'function') window.render(); } catch (e2) {}
})();
