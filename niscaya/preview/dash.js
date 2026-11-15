/* ===== Dashboard v2: angka akurat & semua panel berfungsi ===== */
const MEREK_ALIAS = {AXIO:'AXIOO', AXOO:'AXIOO', DELLL:'DELL', LENIOVO:'LENOVO', LENONO:'LENOVO', LEVONO:'LENOVO', THOSIBA:'TOSHIBA', TOSHOBA:'TOSHIBA', COMPEAQ:'COMPAQ', SURFACE:'MICROSOFT'};
function normMerek(m){ const k = String(m||'').trim().toUpperCase().replace(/\s+/g,' '); return MEREK_ALIAS[k] || k || 'LAINNYA'; }
let dashBrandAll = false;
function soldTanpaNota(){ const ids = new Set(DATA.sales.map(s=>String(s.id))); return DATA.stock.filter(s=>s.status==='Sold' && !ids.has(String(s.id))); }
function goTab(tab, q){ if(tab==='stock') stockSearch = q||''; currentTab = tab; render(); }
function fmtTgl(t){ const m = String(t||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3])+' '+BULAN[+m[2]-1].slice(0,3)+' '+m[1] : 'tanpa tanggal'; }
const DASH_CSS = `
.db-click{cursor:pointer;transition:transform .15s}.db-click:hover{transform:translateY(-2px)}
.db-foot{margin-top:12px;padding-top:12px;border-top:1px solid var(--border,#e6e9f0);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px}
.db-btn{border:1.5px solid #14161f;background:#fff;color:#14161f;border-radius:999px;padding:5px 12px;font:600 12px/1.2 inherit;font-family:inherit;cursor:pointer}
.db-btn.dark{background:#14161f;color:#fff}.db-btn:hover{opacity:.85}
.db-brand:hover .name{color:var(--accent)}
.db-trx{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed var(--border,#e6e9f0)}
.db-trx:last-child{border-bottom:0}
.db-tag{flex:0 0 auto;font:700 10.5px/1 inherit;font-family:inherit;color:#fff;border-radius:999px;padding:5px 9px}
.db-main{flex:1;min-width:0}.db-title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-sub{font-size:11.5px;color:var(--text-dim)}.db-amt{font-family:var(--mono);font-size:12.5px;font-weight:600;white-space:nowrap}
.db-warn{background:#FFF4E5;border-radius:12px;padding:9px 12px;margin-bottom:8px;font-size:12.5px;color:#8a4b00;display:flex;justify-content:space-between;align-items:center;gap:8px}
.db-issues{display:grid;gap:8px}
.db-issue{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#F6F8FC;border-radius:12px;padding:10px 14px;font-size:13px}
.db-issue b{font-family:var(--mono)}
`;
function renderDashboard(c){
  if(!document.getElementById('dbCss')){ const s = document.createElement('style'); s.id = 'dbCss'; s.textContent = DASH_CSS; document.head.appendChild(s); }
  const st = DATA.stock, sales = DATA.sales;
  const by = k => st.filter(s=>s.status===k);
  const ready = by('Ready'), booking = by('Booking'), dpUnits = by('DP'), sold = by('Sold');
  const modalBeli = s => (Number(s.hargaModal)||0) + totalBiaya(s);
  const totalDp = dpUnits.reduce((a,s)=>a+dpNominal(s),0);
  const sisaDp = dpUnits.reduce((a,s)=>a+sisaBayar(s),0);
  const nilaiModalReady = ready.reduce((a,s)=>a+modalBeli(s),0);
  const readyHarga = ready.filter(s=>Number(s.hargaJual)>0);
  const readyNoHarga = ready.length - readyHarga.length;
  const nilaiJualReady = readyHarga.reduce((a,s)=>a+hargaAkhir(s),0);
  const potensiUntung = readyHarga.reduce((a,s)=>a+hargaAkhir(s)-modalBeli(s),0);
  const inHand = st.filter(s=>s.status!=='Sold');
  const biayaAktif = inHand.reduce((a,s)=>a+totalBiaya(s),0);
  const tanpaModal = inHand.filter(s=>!(Number(s.hargaModal)>0)).length;
  const allS = sumSales(sales);
  const thisMonth = localYMD().slice(0,7);
  const sm = sumSales(sales.filter(s=>String(s.tanggal||'').slice(0,7)===thisMonth));
  const tanpaNota = soldTanpaNota();
  const typoUnits = st.filter(s => String(s.merek||'').trim() && String(s.merek).trim() !== normMerek(s.merek));

  // Stok per merek (unit yang masih di tangan: Ready + Booking + DP)
  const brands = {};
  inHand.forEach(s => { const b = normMerek(s.merek); const o = brands[b] || (brands[b] = {n:0, ready:0, raw:new Set()}); o.n++; if(s.status==='Ready') o.ready++; o.raw.add(String(s.merek||'').trim()||'(kosong)'); });
  const brandList = Object.entries(brands).sort((a,b)=>b[1].n-a[1].n || a[0].localeCompare(b[0]));
  const maxBrand = Math.max(1, ...brandList.map(b=>b[1].n));
  const brandRows = (dashBrandAll ? brandList : brandList.slice(0,8)).map(([name,o]) =>
    `<div class="bar-row db-brand db-click" data-brand="${esc(name)}" title="${esc(name)}: ${o.n} unit (${o.ready} ready) · ditulis sebagai: ${esc([...o.raw].join(', '))} — klik untuk lihat di Stok"><div class="name">${esc(name)}</div><div class="bar-track"><div class="bar-fill" style="width:${o.n/maxBrand*100}%"></div></div><div class="cnt" style="width:34px">${o.n}</div></div>`).join('')
    || '<div class="empty"><p>Belum ada data stok.</p></div>';

  // Transaksi terbaru: penjualan + DP masuk
  const ev = [];
  sales.forEach(s => ev.push({t:s.tanggal||'', kind:'Jual', color:'var(--ready)', title:s.laptop||s.id, sub:(s.pembeli?s.pembeli+' · ':'')+'untung '+rupiah(Number(s.untung)||0), amt:Number(s.jual)||0}));
  dpUnits.forEach(s => { if(dpNominal(s)) ev.push({t:(s.dp&&s.dp.tanggal)||'', kind:'DP', color:'#FF9F1A', title:`${s.merek} ${s.tipe}`, sub:((s.dp&&s.dp.nama)||'nama pembeli belum diisi')+' · sisa '+rupiah(sisaBayar(s)), amt:dpNominal(s)}); });
  ev.sort((a,b)=>String(b.t).localeCompare(String(a.t)));
  const trxRows = tanpaNota.map(s => `<div class="db-warn"><span>⚠ <b>${esc(s.id)}</b> ${esc(s.merek)} ${esc(s.tipe)} sudah <b>Sold</b> tapi penjualannya belum dicatat — omzet &amp; laba belum terhitung</span><button class="db-btn dark" data-nota="${esc(s.id)}">Catat</button></div>`).join('')
    + (ev.slice(0,6).map(e => `<div class="db-trx"><span class="db-tag" style="background:${e.color}">${e.kind}</span><div class="db-main"><div class="db-title">${esc(e.title)}</div><div class="db-sub">${fmtTgl(e.t)} · ${esc(e.sub)}</div></div><div class="db-amt">${rupiah(e.amt)}</div></div>`).join('')
      || (tanpaNota.length ? '' : '<div class="empty"><p>Belum ada transaksi.</p></div>'));

  // Cek kelengkapan data
  const issues = [];
  if(tanpaNota.length) issues.push([`<b>${tanpaNota.length}</b> unit Sold belum dicatat di menu Penjualan (omzet belum masuk)`, `<button class="db-btn dark" data-nota="${esc(tanpaNota[0].id)}">Catat penjualan</button>`]);
  if(readyNoHarga) issues.push([`<b>${readyNoHarga}</b> unit Ready belum punya harga jual — tidak dihitung di Nilai Jual &amp; Potensi Untung`, `<button class="db-btn" data-go="stock">Isi di Stok</button>`]);
  if(tanpaModal) issues.push([`<b>${tanpaModal}</b> unit di stok belum punya harga modal`, `<button class="db-btn" data-go="stock">Isi di Stok</button>`]);
  if(typoUnits.length) issues.push([`<b>${typoUnits.length}</b> unit dengan nama merek salah ketik / tidak seragam (mis. ${esc([...new Set(typoUnits.map(s=>String(s.merek).trim()))].slice(0,3).join(', '))})`, `<button class="db-btn dark" data-fixmerek="1">Rapikan merek</button>`]);
  const undated = sales.filter(s=>!saleDateParts(s)).length;
  if(undated) issues.push([`<b>${undated}</b> transaksi penjualan tanpa tanggal valid — tidak masuk rekap bulanan`, `<button class="db-btn" data-go="sales">Buka Penjualan</button>`]);

  const card = (lbl, val, sub, opt) => `<div class="stat-card${opt&&opt.go?' db-click':''}"${opt&&opt.go?` data-go="${opt.go}"`:''}${opt&&opt.bg?` style="${opt.bg}"`:''}><div class="lbl">${opt&&opt.dot?`<span class="dot" style="background:${opt.dot}"></span>`:''}${lbl}</div><div class="val"${opt&&opt.small?` style="font-size:19px${opt.color?';color:'+opt.color:''}"`:''}>${val}</div><div class="sub">${sub}</div></div>`;
  c.innerHTML = `
    <div class="grid-stats">
      ${card('Total Unit', st.length, `${ready.length} ready · ${booking.length} booking · ${dpUnits.length} DP · ${sold.length} sold`, {go:'stock'})}
      ${card('Ready', ready.length, 'unit siap jual', {dot:'var(--ready)', go:'stock'})}
      ${card('Booking', booking.length, 'unit dipesan', {dot:'var(--booking)', go:'stock'})}
      ${card('Sudah DP', dpUnits.length, `DP masuk ${rupiah(totalDp)} · sisa ${rupiah(sisaDp)}`, {dot:'#FF9F1A', go:'stock'})}
      ${card('Sold', sold.length, `unit terjual · ${sold.length - tanpaNota.length} sudah dicatat penjualannya`, {dot:'var(--sold)', go:'sales'})}
      ${card('Nilai Modal Ready', rupiah(nilaiModalReady), `harga beli + biaya service (${ready.length} unit ready)`, {small:1})}
      ${card('Nilai Jual Ready', rupiah(nilaiJualReady), readyNoHarga ? `dari ${readyHarga.length} unit · ${readyNoHarga} unit belum ada harga jual` : 'harga akhir (setelah diskon) semua unit ready', {small:1})}
      ${card('Potensi Untung', rupiah(potensiUntung), readyHarga.length ? `jika ${readyHarga.length} unit ready yang sudah ber-harga jual terjual` : 'isi harga jual unit ready untuk menghitung', {small:1, color:potensiUntung<0?'var(--danger)':'var(--accent)'})}
      ${card('Biaya Service/Part', rupiah(biayaAktif), 'pada unit yang belum terjual', {small:1})}
      ${card('Omzet Bulan Ini', rupiah(sm.omzet), `${sm.n} transaksi · laba ${rupiah(sm.laba)}`, {small:1, go:'sales'})}
      ${card('Total Omzet', rupiah(allS.omzet), `${allS.n} transaksi · semua waktu`, {small:1, go:'sales'})}
      ${card('Untung Terealisasi', rupiah(allS.laba), 'laba bersih dari semua penjualan', {small:1, color:allS.laba<0?'var(--danger)':'var(--ready)', go:'sales'})}
    </div>
    ${issues.length ? `<div class="panel" style="margin-bottom:18px"><h3>Cek Kelengkapan Data</h3><div class="db-issues">${issues.map(i=>`<div class="db-issue"><span>${i[0]}</span>${i[1]}</div>`).join('')}</div></div>` : ''}
    <div class="two-col">
      <div class="panel">
        <h3>Stok per Merek</h3>
        ${brandRows}
        <div class="db-foot"><span class="dim">${inHand.length} unit di tangan (ready + booking + DP) · ${brandList.length} merek</span>
          <span style="display:flex;gap:6px">${typoUnits.length?'<button class="db-btn" data-fixmerek="1">Rapikan merek</button>':''}${brandList.length>8?`<button class="db-btn" id="dbBrandAll">${dashBrandAll?'Ringkas':'Lihat semua ('+brandList.length+')'}</button>`:''}</span></div>
      </div>
      <div class="panel">
        <h3>Transaksi Terbaru</h3>
        ${trxRows}
        <div class="db-foot"><span class="dim">Total untung terealisasi</span>
          <span style="display:flex;gap:10px;align-items:center"><span class="mono" style="color:${allS.laba<0?'var(--danger)':'var(--ready)'};font-weight:600">${rupiah(allS.laba)}</span><button class="db-btn" data-go="sales">Lihat semua</button></span></div>
      </div>
    </div>
    ${omzetPanelHtml()}
  `;
  wireOmzetPanel(c);
  c.querySelectorAll('[data-go]').forEach(el => el.onclick = () => goTab(el.dataset.go));
  c.querySelectorAll('[data-brand]').forEach(el => el.onclick = () => goTab('stock', el.dataset.brand));
  c.querySelectorAll('[data-nota]').forEach(el => el.onclick = (e) => { e.stopPropagation(); openSaleModal(el.dataset.nota); });
  const ba = c.querySelector('#dbBrandAll'); if(ba) ba.onclick = () => { dashBrandAll = !dashBrandAll; renderDashboard(c); };
  c.querySelectorAll('[data-fixmerek]').forEach(el => el.onclick = async () => {
    const groups = {};
    typoUnits.forEach(s => { const raw = String(s.merek).trim(), k = raw+'→'+normMerek(raw); (groups[k] = groups[k] || {raw, to:normMerek(raw), n:0}).n++; });
    const ok = await confirmChange(`Rapikan nama merek (${typoUnits.length} unit)?`, Object.values(groups).map(g => [`${g.n} unit`, g.raw, g.to]));
    if(!ok) return;
    typoUnits.forEach(s => { s.merek = normMerek(s.merek); });
    await persist(); showToast(`${typoUnits.length} nama merek dirapikan`); renderDashboard(c);
  });
}
