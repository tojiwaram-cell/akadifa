/*NM-TGLJUAL v1*/
/* Tanggal terjual (Sold) per unit.
   - Form Edit Laptop: kolom "Tgl Terjual" muncul saat Status = Sold, terisi dari tanggal nota penjualan.
     Mengubahnya memperbarui tanggal di nota penjualan (DATA.sales[].tanggal), jadi Dashboard, Penjualan Harian,
     Laporan Komisi & ekspor Excel ikut memakai tanggal itu. Unit yang baru dijadikan Sold: tanggal dibawa ke form Catat Penjualan.
   - Papan (Kanban) & Tabel Stok: unit Sold menampilkan tanggal terjualnya.
   Tidak menambah field baru di data stok; sumber tanggal tetap nota penjualan. */
(function(){
  var BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  function hariIni(){
    try{ if(typeof localYMD === 'function') return localYMD(); }catch(_){}
    var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmt(ymd){
    var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (Number(m[3]) + ' ' + BULAN[Number(m[2])-1] + ' ' + m[1]) : (ymd || '');
  }
  function notaUnit(id){
    try{ var arr = (DATA.sales || []).filter(function(x){ return String(x.id) === String(id); }); return arr.length ? arr[arr.length-1] : null; }
    catch(_){ return null; }
  }
  function unit(id){ try{ return (DATA.stock || []).find(function(s){ return String(s.id) === String(id); }) || null; }catch(_){ return null; } }
  window.nmTglTerjual = function(id){ var n = notaUnit(id); return n && n.tanggal ? String(n.tanggal).slice(0,10) : ''; };

  function pasang(nama, buat){
    var asli = window[nama];
    if(typeof asli !== 'function' || asli.__nmTglJual) return;
    var f = buat(asli); f.__nmTglJual = true;
    try{ window[nama] = f; }catch(_){}
    try{ eval(nama + ' = f'); }catch(_){}
  }

  /* ---------- Form Edit Laptop ---------- */
  pasang('openStockModal', function(asli){
    return function(id){
      var r = asli.apply(this, arguments);
      try{
        var $ = function(x){ return document.getElementById(x); };
        var audit = $('f_tglAudit'), st = $('f_status'), btn = $('saveStock');
        if(!audit || !st || !btn || $('f_tglJual')) return r;
        var nota = id ? notaUnit(id) : null;
        var awal = nota && nota.tanggal ? String(nota.tanggal).slice(0,10) : '';
        var wrap = document.createElement('div');
        wrap.className = 'field'; wrap.id = 'f_tglJualWrap';
        wrap.innerHTML = '<label>Tgl Terjual (Sold)</label><input id="f_tglJual" type="date" max="' + hariIni() + '">';
        var fAudit = audit.closest('.field') || audit.parentNode;
        fAudit.parentNode.insertBefore(wrap, fAudit.nextSibling);
        var inp = $('f_tglJual'); inp.value = awal;
        var sinkron = function(){
          var sold = st.value === 'Sold';
          wrap.style.display = sold ? '' : 'none';
          if(sold && !inp.value) inp.value = hariIni();
        };
        st.addEventListener('change', sinkron); sinkron();

        var simpanAsli = btn.onclick;
        if(typeof simpanAsli === 'function'){
          btn.onclick = async function(ev){
            var sold = st.value === 'Sold', tgl = inp.value;
            if(sold && tgl && tgl > hariIni()){ alert('Tanggal terjual tidak boleh melewati hari ini'); return; }
            var hasil = await simpanAsli.call(this, ev);
            try{
              var ov = $('overlay');
              var tersimpan = !document.body.contains(inp) || (ov && !ov.classList.contains('show'));
              if(!tersimpan || !sold || !tgl) return hasil;
              var sTgl = $('s_tanggal');
              if(sTgl){ sTgl.value = tgl; try{ sTgl.dispatchEvent(new Event('input', {bubbles:true})); sTgl.dispatchEvent(new Event('change', {bubbles:true})); }catch(_){} return hasil; }
              if(!id) return hasil;
              var u = unit(id), n = notaUnit(id);
              if(u && u.status === 'Sold' && n && String(n.tanggal || '').slice(0,10) !== tgl){
                n.tanggal = tgl;
                if(typeof persist === 'function') await persist();
                if(typeof render === 'function') render();
                if(typeof showToast === 'function') showToast('Tanggal terjual ' + id + ' → ' + fmt(tgl));
              }
            }catch(e){ console.warn('NM-TGLJUAL', e); }
            return hasil;
          };
        }
      }catch(e){ console.warn('NM-TGLJUAL form', e); }
      return r;
    };
  });

  /* ---------- Tampilan Papan & Tabel Stok ---------- */
  function tandai(){
    try{
      document.querySelectorAll('.kcard[data-id]').forEach(function(c){
        var id = c.getAttribute('data-id'), u = unit(id), old = c.querySelector('.nm-tgljual');
        var tgl = u && u.status === 'Sold' ? window.nmTglTerjual(id) : '';
        if(!tgl){ if(old) old.remove(); return; }
        var t = '🗓 Terjual ' + fmt(tgl);
        if(old){ old.textContent = t; return; }
        var d = document.createElement('div'); d.className = 'nm-tgljual'; d.textContent = t;
        d.style.cssText = 'font-size:11px;font-weight:600;color:#61BD4F;margin-top:4px';
        var spec = c.querySelector('.kspec');
        if(spec) spec.appendChild(d); else c.appendChild(d);
      });
      var tabel = Array.prototype.find.call(document.querySelectorAll('table'), function(t){
        var th = Array.prototype.map.call(t.querySelectorAll('thead th, tr:first-child th'), function(x){ return x.textContent.trim(); });
        return th[0] === 'ID' && th.indexOf('Status') >= 0 && th.indexOf('No Seri (SN)') >= 0;
      });
      if(tabel){
        var ths = Array.prototype.map.call(tabel.querySelectorAll('th'), function(x){ return x.textContent.trim(); });
        var iSt = ths.indexOf('Status');
        tabel.querySelectorAll('tbody tr').forEach(function(tr){
          var td = tr.children; if(!td || td.length <= iSt) return;
          var id = (td[0].textContent || '').trim(), u = unit(id), cell = td[iSt], old = cell.querySelector('.nm-tgljual');
          var tgl = u && u.status === 'Sold' ? window.nmTglTerjual(id) : '';
          if(!tgl){ if(old) old.remove(); return; }
          if(old){ old.textContent = fmt(tgl); return; }
          var d = document.createElement('div'); d.className = 'nm-tgljual dim'; d.textContent = fmt(tgl);
          d.style.cssText = 'font-size:11px;white-space:nowrap;margin-top:2px';
          cell.appendChild(d);
        });
      }
    }catch(e){ console.warn('NM-TGLJUAL tampil', e); }
  }
  pasang('renderStock', function(asli){
    return function(){ var r = asli.apply(this, arguments); tandai(); return r; };
  });
  try{ if(typeof currentTab !== 'undefined' && currentTab === 'stock') tandai(); }catch(_){}
})();
