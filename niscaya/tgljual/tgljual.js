/*NM-TGLJUAL v2*/
/* Tanggal terjual (Sold) per unit.
   - v2: Form Edit Laptop: kolom "📅 Tanggal Jual" SELALU tampil tepat di bawah Status, dengan tombol Hari ini / Kemarin.
     Mengisi tanggal pada unit yang belum Sold = status otomatis Sold (lalu form Catat Penjualan terbuka dengan tanggal itu).
     Form Catat Penjualan: label "📅 Tanggal Jual" + tombol Hari ini / Kemarin, tidak boleh melewati hari ini (input susulan).
   - Tanggal terisi dari tanggal nota penjualan.
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
  function kemarin(){
    var m = hariIni().match(/^(\d{4})-(\d{2})-(\d{2})/), d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]) - 1);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function chipHtml(){
    var gaya = 'padding:5px 8px;font-size:11px;white-space:nowrap';
    return '<button type="button" class="btn nm-chip" data-tgl="0" style="' + gaya + '">Hari ini</button>'
         + '<button type="button" class="btn nm-chip" data-tgl="1" style="' + gaya + '">Kemarin</button>';
  }
  function pasangChip(box, inp){
    box.querySelectorAll('.nm-chip').forEach(function(b){
      b.onclick = function(ev){
        ev.preventDefault();
        inp.value = b.getAttribute('data-tgl') === '1' ? kemarin() : hariIni();
        try{ inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); }catch(_){}
      };
    });
  }
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
        wrap.innerHTML = '<label>📅 Tanggal Jual</label>'
          + '<div style="display:flex;gap:6px;align-items:center">'
          + '<input id="f_tglJual" type="date" max="' + hariIni() + '" style="flex:1;min-width:0">'
          + chipHtml('f_tglJual') + '</div>'
          + '<div class="dim" id="f_tglJualInfo" style="font-size:11px;margin-top:3px"></div>';
        /* v2: selalu tampil, tepat setelah kolom Status */
        var fSt = st.closest('.field') || st.parentNode;
        fSt.parentNode.insertBefore(wrap, fSt.nextSibling);
        var inp = $('f_tglJual'), info = $('f_tglJualInfo'); inp.value = awal;
        pasangChip(wrap, inp);
        var tulisInfo = function(){
          info.textContent = st.value === 'Sold'
            ? (inp.value ? 'Terjual ' + fmt(inp.value) + (inp.value < hariIni() ? ' (input susulan)' : '') : 'Pilih tanggal laptop ini laku')
            : 'Kosongkan bila belum laku. Isi tanggal (boleh kemarin/lalu) → status otomatis Sold';
        };
        var sinkron = function(){
          if(st.value === 'Sold'){ if(!inp.value) inp.value = hariIni(); }
          else inp.value = '';
          tulisInfo();
        };
        st.addEventListener('change', sinkron);
        var isiTgl = function(){
          if(inp.value && st.value !== 'Sold'){
            st.value = 'Sold';
            try{ st.dispatchEvent(new Event('change', {bubbles:true})); }catch(_){}
          }
          tulisInfo();
        };
        inp.addEventListener('change', isiTgl); inp.addEventListener('input', isiTgl);
        if(st.value === 'Sold' && !inp.value) inp.value = hariIni();
        tulisInfo();

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

  /* ---------- Form Catat Penjualan (v2) ---------- */
  pasang('openSaleModal', function(asli){
    return function(){
      var r = asli.apply(this, arguments);
      try{
        var $ = function(x){ return document.getElementById(x); };
        var inp = $('s_tanggal'), btn = $('saveSale');
        if(!inp || inp.getAttribute('data-nm-tgl')) return r;
        inp.setAttribute('data-nm-tgl', '1');
        inp.max = hariIni();
        var field = inp.closest('.field') || inp.parentNode;
        var lbl = field.querySelector('label'); if(lbl) lbl.textContent = '📅 Tanggal Jual';
        var baris = document.createElement('div');
        baris.style.cssText = 'display:flex;gap:6px;align-items:center';
        inp.parentNode.insertBefore(baris, inp);
        inp.style.flex = '1'; inp.style.minWidth = '0';
        baris.appendChild(inp);
        baris.insertAdjacentHTML('beforeend', chipHtml());
        var info = document.createElement('div');
        info.className = 'dim'; info.style.cssText = 'font-size:11px;margin-top:3px';
        field.appendChild(info);
        var tulis = function(){
          info.textContent = !inp.value ? 'Pilih tanggal laptop laku'
            : inp.value < hariIni() ? 'Input susulan — tercatat terjual ' + fmt(inp.value)
            : 'Terjual hari ini';
        };
        inp.addEventListener('input', tulis); inp.addEventListener('change', tulis);
        pasangChip(baris, inp); tulis();
        /* nilai yang dibawa dari form Edit Laptop diisi setelah modal terbuka → perbarui teks */
        setTimeout(tulis, 0);
        if(btn && typeof btn.onclick === 'function'){
          var simpanAsli = btn.onclick;
          btn.onclick = function(ev){
            if(!inp.value) inp.value = hariIni();
            if(inp.value > hariIni()){ alert('Tanggal jual tidak boleh melewati hari ini'); return; }
            return simpanAsli.call(this, ev);
          };
        }
      }catch(e){ console.warn('NM-TGLJUAL jual', e); }
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
