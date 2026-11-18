/*NM-TERBARU v1*/
/* Unit stok terbaru tampil paling atas di menu Stok (Papan & Tabel), Label QR (termasuk urutan cetak) dan Katalog WA.
   "Terbaru" = nomor ID terbesar (LP420 di atas LP419); bila nomornya sama, yang ditambahkan belakangan di atas.
   Hanya urutan tampilan: DATA.stock yang disimpan tidak diubah (salinan berurutan dipakai sementara selama render). */
(function(){
  function nmNo(id){ var m = String(id == null ? '' : id).match(/(\d+)(?!.*\d)/); return m ? Number(m[1]) : -1; }
  window.nmUrutTerbaru = function(arr){
    return (arr || []).map(function(s, i){ return [s, i]; })
      .sort(function(a, b){ return (nmNo(b[0] && b[0].id) - nmNo(a[0] && a[0].id)) || (b[1] - a[1]); })
      .map(function(x){ return x[0]; });
  };
  function bungkus(nama){
    var asli = window[nama];
    if(typeof asli !== 'function' || asli.__nmTerbaru) return;
    var f = function(){
      var semula = DATA.stock, urut = null;
      try{ if(Array.isArray(semula)){ urut = window.nmUrutTerbaru(semula); DATA.stock = urut; } }catch(_){ urut = null; }
      try{ return asli.apply(this, arguments); }
      finally{ if(urut && DATA.stock === urut) DATA.stock = semula; }
    };
    f.__nmTerbaru = true;
    try{ window[nama] = f; }catch(_){}
    try{ eval(nama + ' = f'); }catch(_){}
  }
  ['renderStock', 'renderBarcode', 'renderCatalog', 'printBarcodeLabels'].forEach(bungkus);
  try{ if(typeof render === 'function' && ['stock', 'barcode', 'catalog'].indexOf(currentTab) >= 0) render(); }catch(_){}
})();
