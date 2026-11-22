/*NM-BELUM-READY v1*/
/* Rilis 0056 — status & kolom "Belum Ready": unit sudah tercatat di stok tetapi belum bisa dijual
   (masih dicek/service/dibersihkan). Tidak tampil di Katalog WA & katalog online, tidak bisa dipilih di Catat Penjualan
   maupun Tukar Tambah. Kolom papan Kanban, pilihan status, badge, filter, impor & ekspor Excel ikut mengenali status ini. */
(function(){
  var ST = 'Belum Ready';
  try{ if(typeof STATUS_LIST !== 'undefined' && STATUS_LIST.indexOf(ST) < 0) STATUS_LIST.unshift(ST); }catch(_){}
  if(!document.getElementById('nm-belum-css')){
    var css = document.createElement('style'); css.id = 'nm-belum-css';
    css.textContent = '.badge-belum{background:rgba(245,158,11,.18);color:#B45309}.badge-belum .d{background:#F59E0B}'
      + '.list[data-status="Belum Ready"]{box-shadow:inset 0 3px 0 #F59E0B}'
      + '.list[data-status="Belum Ready"] .list-header .count{background:#F59E0B;color:#fff}';
    document.head.appendChild(css);
  }
  var asli = window.statusBadge;
  if(typeof asli === 'function' && !asli.__nmBelum){
    var f = function(status){
      if(status === ST) return '<span class="badge badge-belum"><span class="d"></span>Belum Ready</span>';
      return asli.apply(this, arguments);
    };
    f.__nmBelum = true;
    try{ window.statusBadge = f; }catch(_){}
  }
  try{ if(typeof render === 'function' && ['stock', 'dashboard'].indexOf(currentTab) >= 0) render(); }catch(_){}
})();
