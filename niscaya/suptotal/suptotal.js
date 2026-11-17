/*SUP-TOTAL v1*/
(function(){
  if (typeof window.renderSupplier !== 'function' || window.renderSupplier.__supTotal) return;
  var orig = window.renderSupplier;
  function e(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function wrapped(c, ta){
    orig.apply(this, arguments);
    try {
      var D = window.DATA || (typeof DATA !== 'undefined' ? DATA : null);
      if (!D || !c) return;
      var tb = c.querySelector('table tbody'), table = c.querySelector('table');
      if (!tb || !table) return;
      var names = {};
      (D.suppliers || []).forEach(function(s){ names[s.supplier] = 1; });
      var aktif = (D.stock || []).filter(function(st){ return st.status !== 'Sold'; });
      var kosong = [], lain = [], ber = 0;
      aktif.forEach(function(st){
        var sp = st.supplier == null ? '' : String(st.supplier);
        if (names[sp]) ber++;
        else if (!sp.trim()) kosong.push(st);
        else lain.push(st);
      });
      function row(label, list, note){
        if (!list.length) return '';
        var ids = list.map(function(x){ return x.id; }).join(', ');
        return '<tr class="sup-x" style="background:#fff7e6;cursor:pointer" title="Klik untuk melihat ID unit">' +
          '<td><b>' + label + '</b><div class="dim" style="font-size:12px">' + note + '</div></td><td class="dim">—</td><td class="dim">—</td>' +
          '<td class="mono"><b>' + list.length + '</b></td><td></td></tr>' +
          '<tr class="sup-x-ids" style="display:none"><td colspan="5" class="mono dim" style="font-size:12px;white-space:normal;word-break:break-word">' + e(ids) + '</td></tr>';
      }
      tb.insertAdjacentHTML('beforeend',
        row('⚠ Tanpa Supplier', kosong, 'Kolom supplier di unit masih kosong') +
        row('⚠ Supplier tidak terdaftar', lain, 'Nama supplier di unit tidak ada di daftar ini'));
      tb.querySelectorAll('tr.sup-x').forEach(function(tr){
        tr.onclick = function(){ var n = tr.nextElementSibling; if (n) n.style.display = n.style.display === 'none' ? '' : 'none'; };
      });
      var old = table.querySelector('tfoot'); if (old) old.remove();
      var tot = aktif.length;
      table.insertAdjacentHTML('beforeend',
        '<tfoot><tr style="background:#eef4ff;font-weight:700"><td>TOTAL STOK AKTIF</td><td class="dim" colspan="2" style="font-weight:400;font-size:12px">' +
        ber + ' bersupplier' + (kosong.length ? ' · ' + kosong.length + ' tanpa supplier' : '') + (lain.length ? ' · ' + lain.length + ' tidak terdaftar' : '') +
        '</td><td class="mono">' + tot + '</td><td></td></tr></tfoot>');
    } catch (err) { console.warn('SUP-TOTAL', err); }
  }
  wrapped.__supTotal = true;
  window.renderSupplier = wrapped;
  try { if (window.currentTab === 'supplier' && typeof window.render === 'function') window.render(); } catch (e2) {}
})();
