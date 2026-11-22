/*DASH-FUNGSI v2*/
/* Semua kartu, tombol, dan baris Dashboard bisa diklik: filter Stok per status, rincian angka, isi harga cepat,
   transaksi terbaru membuka unit, baris tabel omzet memfilter bulan/tahun, kartu omzet membuka daftar penjualan. */
function nmGoStock(st, q){ try{ stockStatusFilter = st || 'Semua'; stockSearch = q || ''; }catch(_){} currentTab = 'stock'; render(); window.scrollTo(0,0); }
function nmCloseModal(){ const ov = document.getElementById('overlay'); if(ov) ov.classList.remove('show'); }
function nmModal(o){
  const box = document.getElementById('modalBox'), ov = document.getElementById('overlay'); if(!box || !ov) return;
  box.innerHTML = `
    <h3>${o.title}</h3>
    ${o.info ? `<p class="dim" style="font-size:12.5px;margin:-4px 0 12px">${o.info}</p>` : ''}
    ${o.tot ? `<div style="background:var(--bg,#f4f6fb);border-radius:10px;padding:10px 12px;font-weight:700;margin-bottom:12px">${o.tot}</div>` : ''}
    ${o.search ? `<input id="nmSearch" class="search" placeholder="Cari ID, merek, tipe…" style="width:100%;margin-bottom:10px">` : ''}
    <div class="table-wrap" style="max-height:55vh;overflow:auto"><table>
      <thead><tr>${o.head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${o.rows.length ? o.rows.join('') : `<tr><td colspan="${o.head.length}"><div class="empty"><p>${o.empty || 'Tidak ada data.'}</p></div></td></tr>`}</tbody>
    </table></div>
    <div class="modal-actions">${o.actions || ''}<button class="btn btn-primary" id="nmClose">Tutup</button></div>`;
  ov.classList.add('show');
  box.querySelector('#nmClose').onclick = nmCloseModal;
  box.querySelectorAll('tr[data-unit]').forEach(tr => tr.onclick = (e) => { if(e.target.closest('input,button')) return; nmCloseModal(); setTimeout(() => openStockModal(tr.dataset.unit), 60); });
  const sx = box.querySelector('#nmSearch');
  if(sx) sx.oninput = () => { const q = sx.value.trim().toLowerCase(); box.querySelectorAll('tbody tr[data-unit]').forEach(tr => { tr.style.display = !q || tr.dataset.q.includes(q) ? '' : 'none'; }); };
  if(o.wire) o.wire(box);
}
function nmUnitTd(s){ return `<b>${esc(s.merek||'')} ${esc(s.tipe||'')}</b><div class="dim mono" style="font-size:11.5px">${esc(s.id)} · ${esc(s.processor||'-')} · ${esc(s.ram||'-')} · ${esc(s.ssd||'-')}</div>`; }
function nmQ(s){ return esc([s.id, s.merek, s.tipe, s.processor, s.noSeri].join(' ').toLowerCase()); }
function nmRow(s, cells){ return `<tr data-unit="${esc(s.id)}" data-q="${nmQ(s)}" style="cursor:pointer" title="Klik untuk membuka unit">${[nmUnitTd(s)].concat(cells).map(v => `<td>${v}</td>`).join('')}</tr>`; }
const nmMono = (v, color) => `<span class="mono"${color ? ` style="color:${color};font-weight:600"` : ''}>${v}</span>`;
function nmDetail(kind){
  const st = DATA.stock, ready = st.filter(s => s.status === 'Ready'), inHand = st.filter(s => s.status !== 'Sold');
  const mb = s => (Number(s.hargaModal)||0) + totalBiaya(s);
  const sum = (l, f) => l.reduce((a, s) => a + f(s), 0);
  if(kind === 'modal'){
    const l = ready.slice().sort((a,b) => mb(b) - mb(a));
    return nmModal({ title:'Nilai Modal Ready', info:'Harga beli + biaya service semua unit berstatus Ready. Klik baris untuk membuka unit.', search:1,
      tot:`Total ${rupiah(sum(l, mb))} · ${l.length} unit · ${l.filter(s=>!(Number(s.hargaModal)>0)).length} unit belum ada harga modal`,
      head:['Unit','Harga beli','Biaya','Total modal'], rows:l.map(s => nmRow(s, [nmMono(rupiah(Number(s.hargaModal)||0)), nmMono(rupiah(totalBiaya(s))), nmMono(rupiah(mb(s)))])),
      actions:`<button class="btn btn-ghost" id="nmFill" style="margin-right:auto">Isi harga modal yang kosong</button>`,
      wire:b => { b.querySelector('#nmFill').onclick = () => nmQuickFill('hargaModal'); } });
  }
  if(kind === 'jual' || kind === 'untung'){
    const l = ready.filter(s => Number(s.hargaJual) > 0), kosong = ready.length - l.length;
    const u = s => hargaAkhir(s) - mb(s);
    l.sort((a,b) => kind === 'jual' ? hargaAkhir(b) - hargaAkhir(a) : u(b) - u(a));
    return nmModal({ title: kind === 'jual' ? 'Nilai Jual Ready' : 'Potensi Untung',
      info: kind === 'jual' ? 'Harga akhir (setelah diskon) unit Ready yang sudah punya harga jual.' : 'Harga akhir − (harga beli + biaya service) per unit Ready yang sudah punya harga jual.', search:1,
      tot:(kind === 'jual' ? 'Total ' + rupiah(sum(l, hargaAkhir)) : 'Total ' + rupiah(sum(l, u))) + ` · ${l.length} unit` + (kosong ? ` · ${kosong} unit Ready belum ada harga jual` : ''),
      head:['Unit','Harga akhir','Modal + biaya','Untung'], rows:l.map(s => nmRow(s, [nmMono(rupiah(hargaAkhir(s))), nmMono(rupiah(mb(s))), nmMono(rupiah(u(s)), u(s) < 0 ? 'var(--danger)' : 'var(--ready)')])),
      empty:'Belum ada unit Ready yang punya harga jual.',
      actions: kosong ? `<button class="btn btn-ghost" id="nmFill" style="margin-right:auto">Isi harga jual (${kosong} unit)</button>` : '',
      wire:b => { const f = b.querySelector('#nmFill'); if(f) f.onclick = () => nmQuickFill('hargaJual'); } });
  }
  if(kind === 'biaya'){
    const l = inHand.filter(s => totalBiaya(s) > 0).sort((a,b) => totalBiaya(b) - totalBiaya(a));
    return nmModal({ title:'Biaya Service/Part', info:'Biaya service & part pada unit yang belum terjual (Ready, Booking, DP).',
      tot:`Total ${rupiah(sum(l, totalBiaya))} · ${l.length} unit`, head:['Unit','Rincian biaya','Total'],
      rows:l.map(s => nmRow(s, [(s.biaya||[]).map(b => `<div style="font-size:12px">${esc(b.jenis||'')}${b.keterangan ? ' · ' + esc(b.keterangan) : ''} — <span class="mono">${rupiah(Number(b.nominal)||0)}</span></div>`).join(''), nmMono(rupiah(totalBiaya(s)))])),
      empty:'Tidak ada biaya service pada unit yang belum terjual.' });
  }
}
function nmQuickFill(field){
  const isJual = field === 'hargaJual';
  const l = DATA.stock.filter(s => isJual ? (s.status === 'Ready' && !(Number(s.hargaJual) > 0)) : (s.status !== 'Sold' && !(Number(s.hargaModal) > 0)));
  nmModal({ title: isJual ? 'Isi harga jual' : 'Isi harga modal',
    info: (isJual ? 'Unit Ready yang belum punya harga jual. ' : 'Unit di stok yang belum punya harga modal (harga beli). ') + 'Isi angka tanpa titik, lalu tekan Simpan — kolom yang dikosongkan dibiarkan.',
    tot:`${l.length} unit`, search:1, head:['Unit', isJual ? 'Modal + biaya' : 'Supplier', isJual ? 'Harga jual (Rp)' : 'Harga modal (Rp)'],
    rows:l.map(s => nmRow(s, [isJual ? nmMono(rupiah((Number(s.hargaModal)||0) + totalBiaya(s))) : esc(s.supplier||'-'),
      `<input type="number" min="0" step="50000" class="nm-fill" data-id="${esc(s.id)}" placeholder="0" style="width:130px">`])),
    empty:'Semua unit sudah terisi.',
    actions:`<span class="dim" id="nmFillCnt" style="margin-right:auto;font-size:12.5px">0 diisi</span><button class="btn btn-ghost" id="nmFillSave">Simpan</button>`,
    wire:b => {
      const cnt = () => { const n = [...b.querySelectorAll('.nm-fill')].filter(i => Number(i.value) > 0).length; b.querySelector('#nmFillCnt').textContent = n + ' diisi'; return n; };
      b.querySelectorAll('.nm-fill').forEach(i => i.oninput = cnt);
      b.querySelector('#nmFillSave').onclick = async () => {
        const isi = [...b.querySelectorAll('.nm-fill')].filter(i => Number(i.value) > 0).map(i => [DATA.stock.find(s => String(s.id) === i.dataset.id), Math.round(Number(i.value))]).filter(x => x[0]);
        if(!isi.length){ showToast('Belum ada angka yang diisi'); return; }
        const ok = await confirmChange(`Simpan ${isJual ? 'harga jual' : 'harga modal'} ${isi.length} unit?`, isi.slice(0, 12).map(([s, v]) => [`${s.id} ${s.merek} ${s.tipe}`, 'kosong', rupiah(v)]).concat(isi.length > 12 ? [[`… dan ${isi.length - 12} unit lain`, '', '']] : []));
        if(!ok) return;
        isi.forEach(([s, v]) => { s[field] = v; });
        await persist(); nmCloseModal(); showToast(`${isJual ? 'Harga jual' : 'Harga modal'} ${isi.length} unit tersimpan`); render();
      };
    } });
}
function nmSalesDetail(){
  const yr = (typeof omzetYear !== 'undefined' && omzetYear) || new Date().getFullYear();
  const mo = (typeof omzetMonth !== 'undefined') ? String(omzetMonth) : 'all';
  const l = DATA.sales.filter(s => { const d = saleDateParts(s); return d && d.y === Number(yr) && (mo === 'all' || d.m === Number(mo)); }).sort((a,b) => String(b.tanggal||'').localeCompare(String(a.tanggal||'')));
  const r = sumSales(l), per = (mo === 'all' ? 'Tahun ' : BULAN[Number(mo)-1] + ' ') + yr;
  nmModal({ title:'Penjualan — ' + per, info:'Laba = harga final − modal − biaya service − komisi marketing. Klik baris untuk membuka unit.',
    tot:`${r.n} transaksi · omzet ${rupiah(r.omzet)} · laba ${rupiah(r.laba)}` + (r.n ? ` · rata-rata ${rupiah(Math.round(r.omzet / r.n))}` : ''),
    head:['Tanggal','Unit','Harga final','Modal + biaya','Komisi','Laba'],
    rows:l.map(s => { const u = DATA.stock.find(x => String(x.id) === String(s.id)), kom = (typeof nmKomisiSale === 'function') ? nmKomisiSale(s) : 0, lb = (Number(s.untung)||0) - kom;
      return `<tr data-unit="${esc(s.id)}" data-q="" style="cursor:pointer"><td class="mono dim">${esc(s.tanggal||'-')}</td><td><b>${esc(s.laptop||s.id)}</b><div class="dim mono" style="font-size:11.5px">${esc(s.id)}${s.marketing ? ' · ★ ' + esc(s.marketing) : ''}${s.pembeli ? ' · ' + esc(s.pembeli) : ''}</div></td><td>${nmMono(rupiah(Number(s.jual)||0))}</td><td>${nmMono(rupiah((Number(s.modal)||0) + saleBiaya(s)))}</td><td>${nmMono(rupiah(kom))}</td><td>${nmMono(rupiah(lb), lb < 0 ? 'var(--danger)' : 'var(--ready)')}</td></tr>`.replace(u ? '' : 'data-unit', u ? '' : 'data-x'); }),
    empty:'Belum ada penjualan pada ' + per + '.',
    actions:`<button class="btn btn-ghost" id="nmToSales" style="margin-right:auto">Buka menu Penjualan</button>`,
    wire:b => { b.querySelector('#nmToSales').onclick = () => { nmCloseModal(); currentTab = 'sales'; render(); }; } });
}
function nmDashEnhance(c){
  const byLbl = t => [...c.querySelectorAll('.stat-card')].find(e => { const l = e.querySelector('.lbl'); return l && l.textContent.trim() === t; });
  const on = (t, fn, tip) => { const e = byLbl(t); if(!e) return; e.classList.add('db-click'); e.style.cursor = 'pointer'; e.title = tip || 'Klik untuk rincian'; e.onclick = fn; };
  on('Total Unit', () => nmGoStock('Semua'), 'Buka semua stok');
  on('Ready', () => nmGoStock('Ready'), 'Buka stok berstatus Ready');
  on('Belum Ready', () => nmGoStock('Belum Ready'), 'Buka stok berstatus Belum Ready (belum bisa dijual)');
  on('Booking', () => nmGoStock('Booking'), 'Buka stok berstatus Booking');
  on('Sudah DP', () => nmGoStock('DP'), 'Buka stok berstatus DP');
  on('Nilai Modal Ready', () => nmDetail('modal'));
  on('Nilai Jual Ready', () => nmDetail('jual'));
  on('Potensi Untung', () => nmDetail('untung'));
  on('Biaya Service/Part', () => nmDetail('biaya'));
  ['Omzet', 'Laba Bersih', 'Unit Terjual', 'Rata-rata / Transaksi'].forEach(t => on(t, nmSalesDetail, 'Klik untuk daftar penjualan periode ini'));
  c.querySelectorAll('.db-issue').forEach(row => {
    const b = row.querySelector('button[data-go="stock"]'); if(!b) return;
    const f = /harga jual/.test(row.textContent) ? 'hargaJual' : /harga modal/.test(row.textContent) ? 'hargaModal' : null; if(!f) return;
    b.textContent = 'Isi sekarang'; b.onclick = (e) => { e.stopPropagation(); nmQuickFill(f); };
  });
  /* Transaksi terbaru -> buka unit (urutan sama dengan renderDashboard) */
  const ev = [];
  DATA.sales.forEach(s => ev.push({t:s.tanggal||'', id:s.id}));
  DATA.stock.filter(s => s.status === 'DP').forEach(s => { if(dpNominal(s)) ev.push({t:(s.dp && s.dp.tanggal)||'', id:s.id}); });
  ev.sort((a,b) => String(b.t).localeCompare(String(a.t)));
  c.querySelectorAll('.db-trx').forEach((el, i) => { const x = ev[i]; if(!x) return; el.style.cursor = 'pointer'; el.title = 'Klik untuk membuka unit ' + x.id; el.onclick = () => openStockModal(x.id); });
  /* Tabel omzet: baris bulan memfilter bulan, baris tahun memilih tahun */
  c.querySelectorAll('table tbody tr').forEach(tr => {
    const k = (tr.cells[0] && tr.cells[0].textContent.trim()) || '';
    const mi = BULAN.indexOf(k);
    if(mi >= 0){ tr.style.cursor = 'pointer'; tr.title = 'Klik untuk memfilter ' + k; if(String(omzetMonth) === String(mi + 1)) tr.style.background = 'rgba(37,99,235,.08)';
      tr.onclick = () => { omzetMonth = String(omzetMonth) === String(mi + 1) ? 'all' : String(mi + 1); renderDashboard(c); }; }
    else if(/^\d{4}$/.test(k)){ tr.style.cursor = 'pointer'; tr.title = 'Klik untuk melihat tahun ' + k; tr.onclick = () => { omzetYear = Number(k); omzetMonth = 'all'; renderDashboard(c); }; }
  });
}
(function(){
  if(typeof renderDashboard !== 'function') return;
  const _rd = renderDashboard;
  renderDashboard = function(c){ _rd.apply(this, arguments); try{ nmDashEnhance(c); }catch(e){ console.warn('DASH-FUNGSI', e); } };
  try{ if(currentTab === 'dashboard') render(); }catch(_){}
})();
