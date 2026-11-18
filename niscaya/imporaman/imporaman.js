/*IMPOR-AMAN v2*/
/* Impor Excel "gabung pintar" + cadangan otomatis di VPS + tombol kembalikan + riwayat impor, dan ekspor Excel yang rapi.
   - Unit dicocokkan lewat ID (atau No Seri). ID baru -> ditambahkan; ID lama -> hanya kolom yang terisi di Excel yang diperbarui.
   - Tidak pernah diubah oleh impor: status unit lama, DP, titipan & riwayatnya, biaya unit Sold, harga unit Sold, data penjualan lama.
     Sel kosong di Excel tidak menghapus apa pun. Foto/link hanya diisi bila sebelumnya kosong.
   - Sebelum disimpan tampil pratinjau; sebelum disimpan juga dibuat cadangan di VPS (/tapi/owner/backup). */
const NM_IMP = { plan: null, file: '', last: null };
const NM_SHEETS = { stok: 'STOK LAPTOP', jual: 'PENJUALAN', sup: 'SUPPLIER', biaya: 'BIAYA UNIT', mkt: 'MARKETING' };
const NM_STOCK_COLS = [
  ['ID','id','str'], ['Merek','merek','str'], ['Tipe','tipe','str'], ['Processor','processor','str'], ['RAM','ram','str'], ['SSD','ssd','str'],
  ['VGA','vga','str'], ['Layar','layar','str'], ['Stok','stok','num'], ['Harga Modal','hargaModal','num'], ['Harga Jual','hargaJual','num'],
  ['Diskon','diskon','num'], ['Ket Diskon','diskonKet','str'], ['Supplier','supplier','str'], ['Status','status','str'], ['Marketing','marketing','str'],
  ['Link Foto','linkFoto','str'], ['No Seri','noSeri','str'], ['Tgl Audit','tglAudit','date'], ['Catatan','catatan','str']
];
const NM_ALIAS = { 'prosesor':'processor', 'cpu':'processor', 'serial number':'no seri', 'sn':'no seri', 'no sn':'no seri', 'nomor seri':'no seri',
  'modal':'harga modal', 'harga':'harga jual', 'foto':'link foto', 'ket':'catatan', 'keterangan':'catatan' };
const NM_LABEL = Object.fromEntries(NM_STOCK_COLS.map(c => [c[1], c[0]]));
const NM_UPD_OPEN = ['merek','tipe','processor','ram','ssd','vga','layar','stok','hargaModal','hargaJual','diskon','diskonKet','supplier','noSeri','tglAudit','catatan','marketing'];
const NM_UPD_SOLD = ['merek','tipe','processor','ram','ssd','vga','layar','noSeri','tglAudit','catatan'];
const NM_MONEY = new Set(['hargaModal','hargaJual','diskon']);

function nmHas(v){ return v !== undefined && v !== null && String(v).trim() !== ''; }
function nmStr(v){ return v instanceof Date ? nmIso(v) : String(v).trim(); }
function nmNum(v){
  if(typeof v === 'number') return isFinite(v) ? v : 0;
  let t = String(v).replace(/rp/ig,'').replace(/\s/g,'');
  if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g,'').replace(',', '.');
  else if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g,'');
  else t = t.replace(',', '.');
  const n = Number(t.replace(/[^\d.-]/g,'')); return isFinite(n) ? n : 0;
}
function nmIso(v){
  if(!nmHas(v)) return '';
  const p2 = n => String(n).padStart(2,'0');
  if(v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + p2(v.getMonth()+1) + '-' + p2(v.getDate());
  if(typeof v === 'number' && v > 20000 && v < 80000){ const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth()+1) + '-' + p2(d.getUTCDate()); }
  const t = String(v).trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
  m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if(m){ const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + p2(m[2]) + '-' + p2(m[1]); }
  try{ if(typeof toISODate === 'function') return toISODate(v) || t; }catch(_){}
  return t;
}
function nmKey(h, alias){ const k = String(h || '').trim().toLowerCase().replace(/\s+/g,' '); return (alias && alias[k]) || k; }
/* Membaca sheet: baris judul dicari otomatis (boleh ada judul/baris kosong di atasnya). Hasil: objek {kolom-kecil: nilai} hanya untuk sel terisi. */
function nmReadSheet(wb, name, must, alias){
  const sn = wb.SheetNames.find(n => n.trim().toUpperCase() === name);
  if(!sn) return null;
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, defval:'', raw:true});
  let hi = -1;
  for(let i = 0; i < Math.min(aoa.length, 15); i++){ const ks = aoa[i].map(h => nmKey(h, alias)); if(must.every(m => ks.includes(m))){ hi = i; break; } }
  if(hi < 0) return { rows: [], headers: [] };
  const heads = aoa[hi].map(h => nmKey(h, alias));
  const rows = [];
  for(let i = hi + 1; i < aoa.length; i++){
    const o = {}; let any = false;
    heads.forEach((h, j) => { const v = aoa[i][j]; if(h && nmHas(v)){ o[h] = v; any = true; } });
    if(any){ o.__row = i + 1; rows.push(o); }
  }
  return { rows, headers: heads };
}
function nmFieldVal(type, v){ return type === 'num' ? nmNum(v) : type === 'date' ? nmIso(v) : nmStr(v); }
function nmNormStatus(v){ const t = String(v || '').trim(); const f = STATUS_LIST.find(x => x.toLowerCase() === t.toLowerCase()); return f || (/^(down ?payment|dp)$/i.test(t) ? 'DP' : ''); }
function nmLaptop(s){ return [s.merek, s.tipe].filter(Boolean).join(' ') || s.id || '(tanpa nama)'; }
function nmFmt(k, v){ if(!nmHas(v)) return '(kosong)'; return NM_MONEY.has(k) ? rupiah(Number(v)||0) : String(v); }
function nmSame(k, a, b){
  if(NM_MONEY.has(k) || k === 'stok') return (Number(a)||0) === (Number(b)||0);
  return String(a ?? '').trim() === String(b ?? '').trim();
}
function nmBiayaSig(b){ return [nmIso(b.tanggal), String(b.jenis||'').toLowerCase(), Number(b.nominal)||0, String(b.keterangan||'').trim().toLowerCase()].join('|'); }

/* ---------- Membuat rencana impor (tidak mengubah DATA) ---------- */
function nmBuildPlan(wb){
  const P = { stockNew: [], stockUpd: [], stockSame: 0, skipped: [], salesNew: [], salesSkip: [], salesSame: 0, supNew: [], supUpd: [], mktNew: [], mktUpd: [],
              biayaAdd: [], ignored: [], found: [] };
  const stokS = nmReadSheet(wb, NM_SHEETS.stok, ['merek'], NM_ALIAS) || nmReadSheet(wb, NM_SHEETS.stok, ['id'], NM_ALIAS);
  const jualS = nmReadSheet(wb, NM_SHEETS.jual, ['laptop']) || nmReadSheet(wb, NM_SHEETS.jual, ['id']);
  const supS = nmReadSheet(wb, NM_SHEETS.sup, ['supplier']);
  const biayaS = nmReadSheet(wb, NM_SHEETS.biaya, ['id','nominal']);
  const mktS = nmReadSheet(wb, NM_SHEETS.mkt, ['nama']);
  [[stokS,NM_SHEETS.stok],[jualS,NM_SHEETS.jual],[supS,NM_SHEETS.sup],[biayaS,NM_SHEETS.biaya],[mktS,NM_SHEETS.mkt]].forEach(([x,n]) => { if(x) P.found.push(n); });

  const byId = new Map(), bySn = new Map();
  (DATA.stock || []).forEach(s => { byId.set(String(s.id).trim().toLowerCase(), s); const sn = String(s.noSeri||'').trim().toLowerCase(); if(sn.length >= 4 && !bySn.has(sn)) bySn.set(sn, s); });
  const normM = v => { try{ return typeof normMerek === 'function' ? normMerek(v) : v; }catch(_){ return v; } };

  // Biaya per ID dari sheet BIAYA UNIT
  const biayaMap = {};
  (biayaS ? biayaS.rows : []).forEach(r => { if(!nmHas(r['id'])) return; const id = nmStr(r['id']).toLowerCase();
    (biayaMap[id] = biayaMap[id] || []).push({ tanggal: nmIso(r['tanggal']), jenis: nmHas(r['jenis']) ? nmStr(r['jenis']) : 'Lainnya', keterangan: nmHas(r['keterangan']) ? nmStr(r['keterangan']) : '', nominal: nmNum(r['nominal']) }); });

  const seen = new Set(), seenSn = new Set(), usedIds = new Set((DATA.stock||[]).map(s => String(s.id)));
  const touched = new Set();
  (stokS ? stokS.rows : []).forEach(r => {
    const row = r.__row;
    const v = {}; NM_STOCK_COLS.forEach(([h, k, t]) => { const hk = h.toLowerCase(); if(nmHas(r[hk])) v[k] = nmFieldVal(t, r[hk]); });
    if(v.merek) v.merek = normM(v.merek);
    if(!v.id && !v.merek && !v.tipe) return;
    const lbl = nmLaptop(v);
    const idL = (v.id || '').toLowerCase(), snL = (v.noSeri || '').toLowerCase();
    if(idL && seen.has(idL)){ P.skipped.push({row, lbl: (v.id||'') + ' ' + lbl, reason: 'ID dobel di file (baris sebelumnya sudah dipakai)'}); return; }
    if(!idL && snL.length >= 4 && seenSn.has(snL)){ P.skipped.push({row, lbl, reason: 'No Seri dobel di file'}); return; }
    let ex = idL ? byId.get(idL) : null;
    if(!ex && snL.length >= 4) ex = bySn.get(snL) || null;
    if(ex && touched.has(ex)){ P.skipped.push({row, lbl: ex.id + ' ' + lbl, reason: 'Unit yang sama sudah diproses di baris lain'}); return; }
    if(idL) seen.add(idL); if(snL.length >= 4) seenSn.add(snL);
    if(ex){
      touched.add(ex);
      const sold = ex.status === 'Sold';
      const allow = sold ? NM_UPD_SOLD : NM_UPD_OPEN;
      const ch = [];
      allow.forEach(k => { if(k in v && !nmSame(k, ex[k], v[k])) ch.push({k, label: NM_LABEL[k] || k, old: ex[k], val: v[k]}); });
      if(nmHas(v.linkFoto) && !nmHas(ex.linkFoto)) ch.push({k:'linkFoto', label:'Link Foto', old:'', val:v.linkFoto});
      const notes = [];
      const st = v.status ? nmNormStatus(v.status) : '';
      if(st && st !== ex.status) notes.push(`Status di Excel "${v.status}" diabaikan (tetap ${ex.status})`);
      if(sold && ['hargaModal','hargaJual','diskon','stok','supplier','marketing'].some(k => k in v && !nmSame(k, ex[k], v[k]))) notes.push('Harga/supplier unit Sold dikunci');
      const bAdd = [];
      if(!sold){ const have = new Set((ex.biaya||[]).map(nmBiayaSig)); (biayaMap[String(ex.id).toLowerCase()] || []).forEach(b => { const sg = nmBiayaSig(b); if(!have.has(sg)){ have.add(sg); bAdd.push(b); } }); }
      if(bAdd.length) P.biayaAdd.push({ id: ex.id, lbl: nmLaptop(ex), items: bAdd });
      if(ch.length) P.stockUpd.push({ id: ex.id, lbl: nmLaptop(ex), status: ex.status, changes: ch, notes, byNoSeri: !idL || idL !== String(ex.id).toLowerCase() });
      else { P.stockSame++; if(notes.length) P.ignored.push({ id: ex.id, lbl: nmLaptop(ex), notes }); }
      return;
    }
    // Unit baru
    let id = v.id || '';
    if(!id){ try{ id = nextIdFrom([...(DATA.stock||[]), ...P.stockNew], [...usedIds]); }catch(_){ id = 'IMP' + Date.now().toString(36) + P.stockNew.length; } }
    usedIds.add(id); seen.add(id.toLowerCase());
    const n = { id, merek: v.merek||'', tipe: v.tipe||'', processor: v.processor||'', ram: v.ram||'', ssd: v.ssd||'', vga: v.vga||'', layar: v.layar||'',
      stok: nmHas(v.stok) ? v.stok : 1, hargaModal: v.hargaModal||0, hargaJual: v.hargaJual||0, supplier: v.supplier||'',
      status: nmNormStatus(v.status) || 'Ready', linkFoto: v.linkFoto||'', diskon: v.diskon||0, diskonKet: v.diskonKet||'',
      biaya: biayaMap[id.toLowerCase()] || (nmNum(r['biaya tambahan']) > 0 ? [{tanggal:'', jenis:'Lainnya', keterangan:'Dari import Excel', nominal:nmNum(r['biaya tambahan'])}] : []),
      marketing: v.marketing||'', noSeri: v.noSeri||'', tglAudit: v.tglAudit||'', catatan: v.catatan||'' };
    if(nmHas(r['dititip di'])) n.lokasi = { toko: nmStr(r['dititip di']), tanggal: nmIso(r['tgl titip']), hargaSetor: nmNum(r['harga setor']), catatan: nmHas(r['catatan titip']) ? nmStr(r['catatan titip']) : '' };
    if(nmNum(r['dp nominal']) > 0 || nmHas(r['dp nama'])) n.dp = { nama: nmHas(r['dp nama']) ? nmStr(r['dp nama']) : '', hp: nmHas(r['dp hp']) ? nmStr(r['dp hp']) : '', nominal: nmNum(r['dp nominal']), tanggal: nmIso(r['dp tanggal']), catatan: nmHas(r['dp catatan']) ? nmStr(r['dp catatan']) : '' };
    P.stockNew.push(n);
  });

  // Penjualan: hanya ditambah, yang lama tidak diubah
  const newIds = new Map(P.stockNew.map(s => [s.id.toLowerCase(), s]));
  const saleKey = s => s.id ? 'id:' + String(s.id).trim().toLowerCase() : 'x:' + String(s.laptop||'').trim().toLowerCase() + '|' + nmIso(s.tanggal);
  const haveSale = new Set((DATA.sales||[]).map(saleKey));
  (jualS ? jualS.rows : []).forEach(r => {
    const s = { tanggal: nmIso(r['tanggal']), id: nmHas(r['id']) ? nmStr(r['id']) : '', laptop: nmHas(r['laptop']) ? nmStr(r['laptop']) : '',
      pembeli: nmHas(r['pembeli']) ? nmStr(r['pembeli']) : '', hp: nmHas(r['hp pembeli']) ? nmStr(r['hp pembeli']) : '', marketing: nmHas(r['marketing']) ? nmStr(r['marketing']) : '',
      modal: nmNum(r['modal']||0), biaya: nmNum(r['biaya']||0), hargaNormal: nmNum(r['harga normal']||0), diskon: nmNum(r['diskon']||0), dp: nmNum(r['dp']||0), jual: nmNum(r['jual']||0) };
    if(!s.id && !s.laptop) return;
    if(!s.id && /^total/i.test(s.laptop)) return;
    s.untung = nmHas(r['untung']) ? nmNum(r['untung']) : s.jual - s.modal - s.biaya;
    const lbl = (s.id ? s.id + ' · ' : '') + (s.laptop || '');
    const k = saleKey(s);
    if(haveSale.has(k)){ P.salesSame++; return; }
    if(s.id){
      const u = byId.get(s.id.toLowerCase()) || newIds.get(s.id.toLowerCase());
      if(u && u.status !== 'Sold'){ P.salesSkip.push({ row: r.__row, lbl, reason: `Unit masih ${u.status} di stok — tandai Sold dulu lewat aplikasi` }); return; }
      if(u && !s.laptop) s.laptop = nmLaptop(u);
    }
    haveSale.add(k); P.salesNew.push(s);
  });

  // Supplier & marketing: tambah yang baru, yang lama hanya diisi bila kosong
  const supBy = new Map((DATA.suppliers||[]).map(x => [String(x.supplier||'').trim().toLowerCase(), x]));
  (supS ? supS.rows : []).forEach(r => {
    const nm = nmStr(r['supplier']); const k = nm.toLowerCase(); if(!k) return;
    const wa = nmHas(r['wa']) ? nmStr(r['wa']) : '', al = nmHas(r['alamat']) ? nmStr(r['alamat']) : '';
    const ex = supBy.get(k);
    if(!ex){ const o = { supplier: nm, wa, alamat: al }; supBy.set(k, o); P.supNew.push(o); return; }
    const f = {}; if(wa && !nmHas(ex.wa)) f.wa = wa; if(al && !nmHas(ex.alamat)) f.alamat = al;
    if(Object.keys(f).length) P.supUpd.push({ name: ex.supplier, fill: f });
  });
  P.stockNew.forEach(s => { const k = String(s.supplier||'').trim().toLowerCase(); if(k && !supBy.has(k)){ const o = { supplier: s.supplier, wa: '', alamat: '' }; supBy.set(k, o); P.supNew.push(o); } });
  const mktBy = new Map((DATA.marketing||[]).map(x => [String(x.nama||'').trim().toLowerCase(), x]));
  (mktS ? mktS.rows : []).forEach(r => {
    const nm = nmStr(r['nama']); const k = nm.toLowerCase(); if(!k) return;
    const wa = nmHas(r['wa']) ? nmStr(r['wa']) : '';
    const ex = mktBy.get(k);
    if(!ex){ const o = { nama: nm, wa, tipeKomisi: /^pers/i.test(String(r['tipe komisi']||'')) ? 'persen' : 'nominal', komisi: nmNum(r['komisi']||0) }; mktBy.set(k, o); P.mktNew.push(o); return; }
    if(wa && !nmHas(ex.wa)) P.mktUpd.push({ name: ex.nama, fill: { wa } });
  });
  [...P.stockNew, ...P.salesNew].concat(P.stockUpd.flatMap(u => u.changes.filter(c => c.k === 'marketing').map(c => ({marketing: c.val})))).forEach(s => {
    const k = String(s.marketing||'').trim().toLowerCase(); if(k && !mktBy.has(k)){ const o = { nama: s.marketing, wa: '', tipeKomisi: 'nominal', komisi: 0 }; mktBy.set(k, o); P.mktNew.push(o); } });
  P.stockUpd.forEach(u => u.changes.filter(c => c.k === 'supplier').forEach(c => { const k = String(c.val).toLowerCase(); if(!supBy.has(k)){ const o = { supplier: c.val, wa: '', alamat: '' }; supBy.set(k, o); P.supNew.push(o); } }));

  P.total = P.stockNew.length + P.stockUpd.length + P.salesNew.length + P.supNew.length + P.supUpd.length + P.mktNew.length + P.mktUpd.length + P.biayaAdd.length;
  return P;
}

/* ---------- Menerapkan rencana ke DATA ---------- */
function nmApplyPlan(P){
  const byId = new Map((DATA.stock||[]).map(s => [String(s.id), s]));
  P.stockUpd.forEach(u => { const s = byId.get(String(u.id)); if(!s) return; u.changes.forEach(c => { s[c.k] = c.val; }); });
  P.biayaAdd.forEach(b => { const s = byId.get(String(b.id)); if(!s) return; s.biaya = (s.biaya || []).concat(b.items); });
  if(P.stockNew.length) DATA.stock = (DATA.stock || []).concat(P.stockNew);
  P.stockNew.forEach(s => { try{ if(s.lokasi && s.lokasi.toko && typeof tokoList === 'function' && !tokoList().some(t => t.nama === s.lokasi.toko)) tokoList().push({nama: s.lokasi.toko}); }catch(_){} });
  if(P.salesNew.length) DATA.sales = (DATA.sales || []).concat(P.salesNew);
  DATA.suppliers = DATA.suppliers || []; DATA.marketing = DATA.marketing || [];
  P.supNew.forEach(o => { if(!DATA.suppliers.some(x => String(x.supplier).toLowerCase() === String(o.supplier).toLowerCase())) DATA.suppliers.push(o); });
  P.supUpd.forEach(u => { const x = DATA.suppliers.find(x => x.supplier === u.name); if(x) Object.assign(x, u.fill); });
  P.mktNew.forEach(o => { if(!DATA.marketing.some(x => String(x.nama).toLowerCase() === String(o.nama).toLowerCase())) DATA.marketing.push(o); });
  P.mktUpd.forEach(u => { const x = DATA.marketing.find(x => x.nama === u.name); if(x) Object.assign(x, u.fill); });
}
function nmPlanSummary(P){ return { baru: P.stockNew.length, diperbarui: P.stockUpd.length, sama: P.stockSame, dilewati: P.skipped.length,
  penjualan: P.salesNew.length, penjualanDilewati: P.salesSkip.length, supplier: P.supNew.length, marketing: P.mktNew.length, biaya: P.biayaAdd.reduce((a,b)=>a+b.items.length,0) }; }
function nmPlanLines(P){
  const L = [];
  P.stockNew.forEach(s => L.push(`+ Unit baru ${s.id} ${nmLaptop(s)} (${s.status}, ${rupiah(Number(s.hargaJual)||0)})`));
  P.stockUpd.forEach(u => L.push(`~ ${u.id} ${u.lbl}: ` + u.changes.map(c => `${c.label} ${nmFmt(c.k, c.old)} → ${nmFmt(c.k, c.val)}`).join('; ')));
  P.biayaAdd.forEach(b => L.push(`+ Biaya ${b.id}: ` + b.items.map(i => `${i.jenis} ${rupiah(i.nominal)}`).join(', ')));
  P.salesNew.forEach(s => L.push(`+ Penjualan ${s.id || ''} ${s.laptop} ${s.tanggal} ${rupiah(s.jual)}`));
  P.supNew.forEach(s => L.push(`+ Supplier ${s.supplier}`));
  P.mktNew.forEach(m => L.push(`+ Marketing ${m.nama}`));
  P.skipped.forEach(x => L.push(`× Baris ${x.row} ${x.lbl}: ${x.reason}`));
  P.salesSkip.forEach(x => L.push(`× Penjualan baris ${x.row} ${x.lbl}: ${x.reason}`));
  return L;
}

/* ---------- Server: cadangan & riwayat ---------- */
async function nmApi(path, body){
  const o = body === undefined ? { cache: 'no-store', credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) };
  const r = await fetch(path, o); let j = {}; try{ j = await r.json(); }catch(_){}
  if(!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j;
}
function nmLocalBackups(){ try{ return JSON.parse(localStorage.getItem('niscaya-cadangan-lokal') || '[]'); }catch(_){ return []; } }
async function nmBackup(jenis, file, catatan){
  const data = JSON.parse(JSON.stringify(DATA));
  try{ const j = await nmApi('/tapi/owner/backup', { jenis, file, catatan, data }); return { id: j.id, where: 'vps' }; }
  catch(err){
    try{ const L = nmLocalBackups(); const id = 'lokal-' + Date.now(); L.push({ id, ts: Math.floor(Date.now()/1000), jenis, file, data }); while(L.length > 3) L.shift();
      localStorage.setItem('niscaya-cadangan-lokal', JSON.stringify(L)); return { id, where: 'lokal', err: err.message }; }
    catch(e2){ return { id: '', where: 'gagal', err: err.message }; }
  }
}
async function nmLog(ent){ try{ await nmApi('/tapi/owner/log', ent); }catch(e){ console.warn('IMPOR-AMAN log', e); } }

/* ---------- Jendela ---------- */
function nmImpClose(){ const ov = document.getElementById('overlay'), box = document.getElementById('modalBox'); if(ov) ov.classList.remove('show'); if(box){ box.style.maxWidth = ''; box.style.width = ''; } }
function nmImpModal(html, wide){
  const ov = document.getElementById('overlay'), box = document.getElementById('modalBox'); if(!ov || !box) return null;
  box.innerHTML = html; if(wide){ box.style.maxWidth = '980px'; box.style.width = '96vw'; }
  ov.classList.add('show'); box.querySelectorAll('[data-nm-close]').forEach(b => b.onclick = nmImpClose); return box;
}
function nmImpTable(head, rows, empty){
  return `<div class="table-wrap" style="max-height:38vh;overflow:auto;margin-top:6px"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.join('') : `<tr><td colspan="${head.length}" class="dim">${empty || 'Tidak ada.'}</td></tr>`}</tbody></table></div>`;
}
function nmImpSection(title, count, body, open){
  return `<details ${open ? 'open' : ''} style="margin:10px 0;border:1px solid var(--border,#e3e7ef);border-radius:10px;padding:8px 12px">
    <summary style="cursor:pointer;font-weight:700">${title} <span class="dim" style="font-weight:600">(${count})</span></summary>${body}</details>`;
}
const NM_CHIP = (n, t, c) => `<div style="flex:1;min-width:110px;background:${c}14;border:1px solid ${c}55;border-radius:12px;padding:10px 12px"><div style="font-size:22px;font-weight:800;color:${c}">${n}</div><div class="dim" style="font-size:12px">${t}</div></div>`;

function nmShowPreview(P, file){
  const S = nmPlanSummary(P);
  const unitRow = s => `<tr><td class="mono">${esc(s.id)}</td><td>${esc(nmLaptop(s))}</td><td>${typeof statusBadge === 'function' ? statusBadge(s.status) : esc(s.status)}</td><td>${rupiah(Number(s.hargaJual)||0)}</td></tr>`;
  const updRow = u => `<tr><td class="mono">${esc(u.id)}${u.byNoSeri ? '<div class="dim" style="font-size:11px">cocok lewat No Seri</div>' : ''}</td><td>${esc(u.lbl)}</td><td>${u.changes.map(c => `<div><b>${esc(c.label)}</b>: <span style="color:#b42318;text-decoration:line-through">${esc(nmFmt(c.k, c.old))}</span> → <span style="color:#067647;font-weight:700">${esc(nmFmt(c.k, c.val))}</span></div>`).join('')}${u.notes.map(n => `<div class="dim" style="font-size:11.5px">ⓘ ${esc(n)}</div>`).join('')}</td></tr>`;
  const skipRow = x => `<tr><td>${x.row}</td><td>${esc(x.lbl)}</td><td>${esc(x.reason)}</td></tr>`;
  const html = `
    <h3 style="margin-bottom:4px">Pratinjau impor</h3>
    <p class="dim" style="font-size:12.5px;margin:0 0 12px">File <b>${esc(file)}</b> · sheet terbaca: ${P.found.length ? P.found.map(esc).join(', ') : '-'}. Belum ada yang disimpan.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${NM_CHIP(S.baru,'unit baru','#2563eb')}${NM_CHIP(S.diperbarui,'unit diperbarui','#d97706')}${NM_CHIP(S.sama,'tidak berubah','#64748b')}${NM_CHIP(S.dilewati + S.penjualanDilewati,'dilewati','#dc2626')}${NM_CHIP(S.penjualan,'penjualan baru','#059669')}</div>
    <div style="background:#eef4ff;border-radius:10px;padding:10px 12px;margin:12px 0 4px;font-size:12.5px;line-height:1.55">
      🔒 <b>Data lama aman:</b> status unit lama (Ready/Booking/DP/Sold), DP, titipan & riwayatnya, data penjualan lama, serta harga & biaya unit Sold <b>tidak diubah</b>.
      Sel kosong di Excel tidak menghapus apa pun. Sebelum disimpan, salinan data sekarang dicadangkan ke VPS dan bisa dikembalikan kapan saja.
    </div>
    ${nmImpSection('Unit baru', P.stockNew.length, nmImpTable(['ID','Laptop','Status','Harga Jual'], P.stockNew.map(unitRow)), P.stockNew.length && P.stockNew.length <= 30)}
    ${nmImpSection('Unit diperbarui', P.stockUpd.length, nmImpTable(['ID','Laptop','Perubahan'], P.stockUpd.map(updRow)), P.stockUpd.length > 0)}
    ${P.biayaAdd.length ? nmImpSection('Biaya unit ditambahkan', S.biaya, nmImpTable(['ID','Laptop','Biaya'], P.biayaAdd.map(b => `<tr><td class="mono">${esc(b.id)}</td><td>${esc(b.lbl)}</td><td>${b.items.map(i => esc(i.jenis + ' ' + rupiah(i.nominal) + (i.keterangan ? ' — ' + i.keterangan : ''))).join('<br>')}</td></tr>`))) : ''}
    ${P.salesNew.length || P.salesSkip.length ? nmImpSection('Penjualan baru', P.salesNew.length, nmImpTable(['Tanggal','ID','Laptop','Jual'], P.salesNew.map(s => `<tr><td>${esc(s.tanggal)}</td><td class="mono">${esc(s.id)}</td><td>${esc(s.laptop)}</td><td>${rupiah(s.jual)}</td></tr>`))) : ''}
    ${P.supNew.length || P.mktNew.length || P.supUpd.length || P.mktUpd.length ? nmImpSection('Supplier & marketing', P.supNew.length + P.mktNew.length + P.supUpd.length + P.mktUpd.length,
        `<div style="font-size:13px;line-height:1.7;margin-top:6px">${P.supNew.map(s => `➕ Supplier baru: <b>${esc(s.supplier)}</b>`).concat(P.supUpd.map(s => `✎ Supplier ${esc(s.name)}: isi ${Object.keys(s.fill).join(', ')} yang kosong`), P.mktNew.map(m => `➕ Marketing baru: <b>${esc(m.nama)}</b>`), P.mktUpd.map(m => `✎ Marketing ${esc(m.name)}: isi WA yang kosong`)).join('<br>')}</div>`) : ''}
    ${P.skipped.length || P.salesSkip.length ? nmImpSection('Dilewati (tidak disimpan)', P.skipped.length + P.salesSkip.length, nmImpTable(['Baris','Data','Alasan'], P.skipped.map(skipRow).concat(P.salesSkip.map(skipRow))), true) : ''}
    ${P.ignored.length ? nmImpSection('Kolom yang diabaikan demi keamanan', P.ignored.length, nmImpTable(['ID','Laptop','Keterangan'], P.ignored.map(x => `<tr><td class="mono">${esc(x.id)}</td><td>${esc(x.lbl)}</td><td>${x.notes.map(esc).join('<br>')}</td></tr>`))) : ''}
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-ghost" data-nm-close>${P.total ? 'Batal' : 'Tutup'}</button>
      ${P.total ? `<button class="btn btn-primary" id="nmImpSave">💾 Simpan impor (${P.total} perubahan)</button>` : ''}
    </div>
    ${P.total ? '' : '<p class="dim" style="font-size:12.5px;margin-top:8px">Tidak ada perubahan — semua data di file sudah sama dengan data di aplikasi.</p>'}`;
  const box = nmImpModal(html, true); if(!box) return;
  const sv = box.querySelector('#nmImpSave'); if(sv) sv.onclick = () => nmDoImport(sv);
}

async function nmDoImport(btn){
  if(!NM_IMP.wb) return;
  btn.disabled = true; btn.textContent = 'Mencadangkan data…';
  const file = NM_IMP.file;
  const bk = await nmBackup('impor', file, 'Sebelum impor ' + file);
  if(bk.where !== 'vps'){
    const ok = confirm(bk.where === 'lokal' ? `Cadangan ke VPS gagal (${bk.err}). Cadangan disimpan di browser ini saja. Lanjutkan impor?` : `Cadangan gagal dibuat (${bk.err}). Impor dibatalkan demi keamanan data.`);
    if(!ok || bk.where === 'gagal'){ btn.disabled = false; btn.textContent = '💾 Simpan impor'; return; }
  }
  btn.textContent = 'Menyimpan…';
  const P = nmBuildPlan(NM_IMP.wb);   // dihitung ulang terhadap data terbaru
  nmApplyPlan(P);
  try{ await persist(); }catch(e){ console.warn(e); }
  const S = nmPlanSummary(P), lines = nmPlanLines(P);
  const judul = `${S.baru} unit baru, ${S.diperbarui} diperbarui, ${S.dilewati + S.penjualanDilewati} dilewati, ${S.penjualan} penjualan baru`;
  NM_IMP.last = { backupId: bk.id, where: bk.where, file, judul, ts: Date.now() };
  if(bk.where === 'vps') await nmLog({ jenis: 'impor', file, backupId: bk.id, judul, ringkasan: S, rincian: lines });
  nmImpClose(); showToast('Impor tersimpan: ' + judul);
  try{ render(); }catch(_){}
}

async function nmRestore(id, label){
  const isLocal = String(id).startsWith('lokal-');
  const html = `<h3>Kembalikan data?</h3>
    <p style="font-size:13.5px;line-height:1.6">Data aplikasi akan dikembalikan ke kondisi <b>${esc(label)}</b>.</p>
    <p class="dim" style="font-size:12.5px;line-height:1.6">Perubahan yang dibuat setelah waktu itu (edit stok, penjualan baru, dll.) ikut hilang. Kondisi sekarang dicadangkan dulu, jadi pemulihan ini juga bisa dibatalkan dari Riwayat.</p>
    <div class="modal-actions"><button class="btn btn-ghost" data-nm-close>Batal</button><button class="btn btn-primary" id="nmRsGo" style="background:#dc2626;border-color:#dc2626">↩ Ya, kembalikan</button></div>`;
  const box = nmImpModal(html); if(!box) return;
  box.querySelector('#nmRsGo').onclick = async (ev) => {
    const b = ev.currentTarget; b.disabled = true; b.textContent = 'Memulihkan…';
    try{
      let data;
      if(isLocal){ const x = nmLocalBackups().find(x => x.id === id); if(!x) throw new Error('Cadangan lokal tidak ditemukan'); data = x.data; }
      else data = (await nmApi('/tapi/owner/backup/' + encodeURIComponent(id))).data;
      if(!data || !Array.isArray(data.stock)) throw new Error('Isi cadangan tidak valid');
      const bk = await nmBackup('sebelum-pemulihan', '', 'Sebelum dikembalikan ke ' + label);
      if(bk.where === 'gagal') throw new Error('Gagal mencadangkan kondisi sekarang: ' + bk.err);
      if(typeof applyLoaded === 'function') applyLoaded(data); else Object.keys(data).forEach(k => { DATA[k] = data[k]; });
      await persist();
      if(bk.where === 'vps') await nmLog({ jenis: 'pemulihan', file: '', backupId: bk.id, judul: 'Data dikembalikan ke ' + label, ringkasan: { unit: data.stock.length, penjualan: (data.sales||[]).length }, rincian: [] });
      NM_IMP.last = null; nmImpClose(); showToast('Data berhasil dikembalikan'); try{ render(); }catch(_){}
    }catch(err){ b.disabled = false; b.textContent = '↩ Ya, kembalikan'; showToast('Gagal memulihkan: ' + err.message); }
  };
}

function nmFmtTs(ts){ const d = new Date(ts * 1000); return d.toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'}) + ' ' + d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}); }
async function nmLoadHistory(){
  const el = document.getElementById('nmHist'); if(!el) return;
  let logs = [], bks = [], err = '';
  try{ [logs, bks] = await Promise.all([nmApi('/tapi/owner/log').then(j => j.items || []), nmApi('/tapi/owner/backups').then(j => j.items || [])]); }catch(e){ err = e.message; }
  const bkSet = new Map(bks.map(b => [b.id, b]));
  const jenisTxt = { impor: '📥 Impor', pemulihan: '↩ Pemulihan' };
  const rows = logs.map((l, i) => {
    const b = bkSet.get(l.backupId);
    const lab = l.jenis === 'impor' ? `sebelum impor ${l.file || ''} (${nmFmtTs(l.ts)})` : `sebelum pemulihan ${nmFmtTs(l.ts)}`;
    return `<tr><td style="white-space:nowrap">${nmFmtTs(l.ts)}</td><td>${jenisTxt[l.jenis] || esc(l.jenis)}</td><td>${esc(l.file || '-')}</td><td>${esc(l.judul || '')}</td>
      <td style="white-space:nowrap">${l.rincian && l.rincian.length ? `<button class="btn btn-ghost btn-sm" data-rinc="${i}">Rincian</button> ` : ''}${b ? `<button class="btn btn-ghost btn-sm" data-rs="${esc(b.id)}" data-lab="${esc(lab)}">↩ Kembalikan</button>` : '<span class="dim" style="font-size:11.5px">cadangan sudah terhapus</span>'}</td></tr>`;
  });
  const loc = nmLocalBackups().slice().reverse();
  el.innerHTML = (err ? `<p style="color:var(--danger);font-size:12.5px">Riwayat di VPS tidak bisa dibuka: ${esc(err)}</p>` : '') +
    nmImpTable(['Waktu','Jenis','File','Ringkasan','Aksi'], rows, 'Belum ada impor yang tercatat.') +
    (loc.length ? `<p class="dim" style="font-size:12px;margin-top:10px">Cadangan darurat di browser ini (dibuat saat VPS tidak terjangkau):</p>` + nmImpTable(['Waktu','Keterangan','Aksi'], loc.map(x => `<tr><td>${nmFmtTs(x.ts)}</td><td>${esc(x.jenis)} ${esc(x.file||'')}</td><td><button class="btn btn-ghost btn-sm" data-rs="${esc(x.id)}" data-lab="${esc('cadangan lokal ' + nmFmtTs(x.ts))}">↩ Kembalikan</button></td></tr>`)) : '') +
    (bks.length ? `<p class="dim" style="font-size:11.5px;margin-top:8px">${bks.length} cadangan tersimpan di VPS (30 terbaru disimpan otomatis).</p>` : '');
  el.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => nmRestore(b.dataset.rs, b.dataset.lab));
  el.querySelectorAll('[data-rinc]').forEach(b => b.onclick = () => { const l = logs[Number(b.dataset.rinc)];
    nmImpModal(`<h3>Rincian ${jenisTxt[l.jenis] || ''} · ${nmFmtTs(l.ts)}</h3><p class="dim" style="font-size:12.5px">${esc(l.file||'')} — ${esc(l.judul||'')}</p>
      <div style="max-height:55vh;overflow:auto;font-size:12.5px;line-height:1.65;background:var(--bg,#f6f8fc);border-radius:10px;padding:10px 12px" class="mono">${l.rincian.map(esc).join('<br>')}</div>
      <div class="modal-actions"><button class="btn btn-primary" data-nm-close>Tutup</button></div>`, true); });
}

/* ---------- Halaman Sinkron (Import/Export) ---------- */
renderSync = function(c){
  const last = NM_IMP.last;
  c.innerHTML = `
    ${last ? `<div class="panel" style="border:1px solid #86efac;background:#f0fdf4">
      <b style="color:#067647">✓ Impor terakhir tersimpan</b> <span class="dim" style="font-size:12.5px">— ${esc(last.file)}: ${esc(last.judul)}</span>
      <div style="margin-top:10px"><button class="btn btn-ghost btn-sm" id="nmUndoLast">↩ Batalkan impor ini</button>
      <span class="dim" style="font-size:12px;margin-left:6px">mengembalikan data ke kondisi sebelum impor</span></div></div>` : ''}
    <div class="panel">
      <h3>Export ke Excel</h3>
      <p class="dim" style="font-size:13px; margin-bottom:14px; line-height:1.6;">
        Unduh seluruh data (Ringkasan, Stok, Penjualan, Biaya Unit, Supplier, Marketing) dalam satu file Excel yang rapi: judul kolom berwarna,
        format Rupiah & tanggal, warna status, filter, dan baris judul terkunci. File ini juga bisa diimpor kembali.
      </p>
      <button class="btn btn-primary" id="exportBtn">⬇ Unduh Excel (.xlsx)</button>
    </div>
    <div class="panel">
      <h3>Import dari Excel <span style="font-size:12px;background:#dcfce7;color:#067647;border-radius:20px;padding:2px 10px;margin-left:6px;vertical-align:middle">Aman — gabung pintar</span></h3>
      <p class="dim" style="font-size:13px; margin-bottom:8px; line-height:1.6;">
        Sheet yang dibaca: <b>STOK LAPTOP</b>, <b>PENJUALAN</b>, <b>BIAYA UNIT</b>, <b>SUPPLIER</b>, <b>MARKETING</b> (kolom sama seperti hasil export).
        Data <b>digabung</b>, bukan diganti:
      </p>
      <ul class="dim" style="font-size:12.5px;line-height:1.7;margin:0 0 14px 18px">
        <li>Unit dicocokkan lewat <b>ID</b> (atau No Seri). ID baru → ditambahkan; ID lama → hanya kolom yang terisi yang diperbarui.</li>
        <li>Status, DP, titipan, penjualan lama, serta harga & biaya unit Sold tidak diubah. Sel kosong tidak menghapus data.</li>
        <li>Anda melihat pratinjau dulu. Sebelum disimpan, data sekarang dicadangkan ke VPS dan bisa dikembalikan.</li>
      </ul>
      <div class="file-drop" id="dropZone">Klik untuk pilih file .xlsx, atau tarik file ke sini</div>
      <input type="file" id="fileInput" accept=".xlsx,.xls" style="display:none;">
      <div id="importStatus" style="margin-top:12px; font-size:12.5px;"></div>
    </div>
    <div class="panel">
      <h3>Riwayat impor & cadangan</h3>
      <p class="dim" style="font-size:12.5px;margin-bottom:6px">Setiap impor tercatat di sini beserta cadangannya. Tekan <b>↩ Kembalikan</b> untuk memulihkan data ke kondisi sebelum impor tersebut.</p>
      <div id="nmHist"><p class="dim" style="font-size:12.5px">Memuat riwayat…</p></div>
    </div>`;
  document.getElementById('exportBtn').onclick = () => exportExcel();
  const drop = document.getElementById('dropZone'), inp = document.getElementById('fileInput');
  drop.onclick = () => inp.click();
  drop.ondragover = (e) => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; };
  drop.ondragleave = () => { drop.style.borderColor = 'var(--border)'; };
  drop.ondrop = (e) => { e.preventDefault(); drop.style.borderColor = 'var(--border)'; if(e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]); };
  inp.onchange = (e) => { if(e.target.files[0]) handleImportFile(e.target.files[0]); inp.value = ''; };
  const u = document.getElementById('nmUndoLast');
  if(u && last){
    if(last.where === 'vps' || last.where === 'lokal') u.onclick = () => nmRestore(last.backupId, `sebelum impor ${last.file}`);
    else u.style.display = 'none';
  }
  nmLoadHistory();
};

handleImportFile = function(file){
  const status = document.getElementById('importStatus');
  if(status) status.innerHTML = '<span class="dim">Membaca file…</span>';
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const P = nmBuildPlan(wb);
      if(!P.found.length){ if(status) status.innerHTML = '<span style="color:var(--danger)">Tidak ditemukan sheet yang cocok. Nama sheet harus STOK LAPTOP, PENJUALAN, BIAYA UNIT, SUPPLIER, atau MARKETING.</span>'; return; }
      NM_IMP.wb = wb; NM_IMP.file = file.name; NM_IMP.plan = P;
      if(status) status.innerHTML = `<span class="dim">File dibaca: ${P.total} perubahan ditemukan. Periksa pratinjau.</span>`;
      nmShowPreview(P, file.name);
    }catch(err){ if(status) status.innerHTML = '<span style="color:var(--danger)">Gagal membaca file: ' + esc(err.message) + '</span>'; }
  };
  reader.readAsArrayBuffer(file);
};

/* ---------- Export Excel rapi (ExcelJS; cadangan: SheetJS dengan lebar kolom) ---------- */
let _nmExcelJs = null;
function nmLoadExcelJs(){
  if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if(_nmExcelJs) return _nmExcelJs;
  _nmExcelJs = new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload = () => window.ExcelJS ? ok(window.ExcelJS) : no(new Error('ExcelJS kosong')); s.onerror = () => { _nmExcelJs = null; no(new Error('ExcelJS gagal dimuat')); }; document.head.appendChild(s); });
  return _nmExcelJs;
}
function nmF(fn, s, d){ try{ return typeof window[fn] === 'function' ? window[fn](s) : d; }catch(_){ return d; } }
function nmExportData(){
  const ord = { Ready: 0, Booking: 1, DP: 2, Sold: 3 };
  const stock = (DATA.stock || []).slice().sort((a, b) => (ord[a.status] ?? 9) - (ord[b.status] ?? 9) || String(a.id).localeCompare(String(b.id), 'id', {numeric:true}));
  const biayaOf = s => nmF('totalBiaya', s, (s.biaya||[]).reduce((a, b) => a + (Number(b.nominal)||0), 0));
  const akhir = s => nmF('hargaAkhir', s, (Number(s.hargaJual)||0) - (Number(s.diskon)||0));
  const dpN = s => nmF('dpNominal', s, (s.dp && Number(s.dp.nominal)) || 0);
  const D = (v) => { const t = nmIso(v); if(!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t || null; const [y, m, d] = t.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const stockCols = [
    ['ID',10,'t'],['Merek',11,'t'],['Tipe',22,'t'],['Processor',18,'t'],['RAM',8,'t'],['SSD',10,'t'],['VGA',16,'t'],['Layar',10,'t'],['Stok',6,'n'],
    ['Harga Modal',15,'rp'],['Biaya Tambahan',15,'rp'],['Total Modal',15,'rp'],['Harga Jual',15,'rp'],['Diskon',13,'rp'],['Ket Diskon',16,'t'],['Harga Akhir',15,'rp'],['Untung',15,'rp'],
    ['Supplier',16,'t'],['Status',10,'st'],['Marketing',14,'t'],['DP Nama',16,'t'],['DP HP',15,'t'],['DP Nominal',14,'rp'],['DP Tanggal',12,'d'],['DP Catatan',18,'t'],['Sisa Bayar',14,'rp'],
    ['Link Foto',24,'url'],['No Seri',18,'t'],['Tgl Audit',12,'d'],['Catatan',28,'t'],['Dititip Di',16,'t'],['Tgl Titip',12,'d'],['Harga Setor',14,'rp'],['Catatan Titip',18,'t']];
  const stockRows = stock.map(s => { const L = s.lokasi || {}, P = s.dp || {};
    return [s.id, s.merek, s.tipe, s.processor, s.ram, s.ssd, s.vga, s.layar, Number(s.stok)||0,
      Number(s.hargaModal)||0, biayaOf(s), nmF('modalTotal', s, (Number(s.hargaModal)||0) + biayaOf(s)), Number(s.hargaJual)||0, Number(s.diskon)||0, s.diskonKet||'', akhir(s), nmF('untungUnit', s, akhir(s) - (Number(s.hargaModal)||0) - biayaOf(s)),
      s.supplier||'', s.status||'', s.marketing||'', P.nama||'', P.hp||'', dpN(s) || null, D(P.tanggal), P.catatan||'', dpN(s) ? nmF('sisaBayar', s, null) : null,
      s.linkFoto||'', s.noSeri||'', D(s.tglAudit), s.catatan||'', L.toko||'', D(L.tanggal), Number(L.hargaSetor)||null, L.catatan||'']; });
  const sales = (DATA.sales || []).slice().sort((a, b) => String(b.tanggal||'').localeCompare(String(a.tanggal||'')));
  const salesCols = [['Tanggal',12,'d'],['ID',10,'t'],['Laptop',30,'t'],['Pembeli',18,'t'],['HP Pembeli',15,'t'],['Marketing',14,'t'],['Modal',15,'rp'],['Biaya',13,'rp'],['Harga Normal',15,'rp'],['Diskon',13,'rp'],['DP',13,'rp'],['Jual',15,'rp'],['Untung',15,'rp']];
  const salesRows = sales.map(s => [D(s.tanggal), s.id, s.laptop, s.pembeli||'', s.hp||'', s.marketing||'', Number(s.modal)||0, nmF('saleBiaya', s, Number(s.biaya)||0),
    Number(s.hargaNormal) || (Number(s.jual||0) + Number(s.diskon||0)), Number(s.diskon)||0, Number(s.dp)||0, Number(s.jual)||0, Number(s.untung)||0]);
  const biayaCols = [['ID',10,'t'],['Laptop',30,'t'],['Tanggal',12,'d'],['Jenis',16,'t'],['Keterangan',32,'t'],['Nominal',15,'rp']];
  const biayaRows = []; stock.forEach(s => (s.biaya||[]).forEach(b => biayaRows.push([s.id, nmLaptop(s), D(b.tanggal), b.jenis||'', b.keterangan||'', Number(b.nominal)||0])));
  const supCols = [['Supplier',22,'t'],['WA',16,'t'],['Alamat',36,'t'],['Jumlah Stok',12,'n']];
  const supRows = (DATA.suppliers||[]).map(x => [x.supplier, x.wa||'', x.alamat||'', stock.filter(s => s.supplier === x.supplier && s.status !== 'Sold').length]);
  const mktCols = [['Nama',22,'t'],['WA',16,'t'],['Tipe Komisi',13,'t'],['Komisi',14,'kom']];
  const mktRows = (DATA.marketing||[]).map(m => [m.nama, m.wa||'', m.tipeKomisi === 'persen' ? 'Persen' : 'Nominal', Number(m.komisi)||0]);
  // Ringkasan
  const cnt = st => stock.filter(s => s.status === st).length;
  const aktif = stock.filter(s => s.status !== 'Sold');
  const sum = (a, f) => a.reduce((t, x) => t + (Number(f(x))||0), 0);
  const perBulan = {}; sales.forEach(s => { const k = String(nmIso(s.tanggal)).slice(0, 7); if(!/^\d{4}-\d{2}$/.test(k)) return; const o = perBulan[k] = perBulan[k] || {n:0, omzet:0, untung:0}; o.n++; o.omzet += Number(s.jual)||0; o.untung += Number(s.untung)||0; });
  // Laporan penjualan (rilis 0044): tanggal, tipe, spek, SN, supplier, modal, harga akhir, marketing
  const byId = {}; (DATA.stock || []).forEach(u => { byId[String(u.id)] = u; });
  const cl = v => { v = String(v == null ? '' : v).trim(); return v && v !== '-' ? v : ''; };
  const lapRows = (DATA.sales || []).map(s => { const u = byId[String(s.id)] || {};
    let modal = Number(s.modal); if(!s.modal && s.modal !== 0 || isNaN(modal)) modal = Number(u.hargaModal) || 0;
    return { tgl: String(nmIso(s.tanggal) || ''), id: s.id || '', tipe: [cl(u.merek), cl(u.tipe)].filter(Boolean).join(' ') || cl(s.laptop) || '-',
      spek: [cl(u.processor), cl(u.ram), cl(u.ssd), cl(u.vga)].filter(Boolean).join(' / ') || cl(u.spekAsli) || '-',
      sn: cl(u.noSeri) || '-', sup: cl(u.supplier) || '-', modal: modal || 0, akhir: Number(s.jual) || 0, mk: cl(s.marketing) }; })
    .sort((a, b) => a.tgl < b.tgl ? -1 : a.tgl > b.tgl ? 1 : String(a.id).localeCompare(String(b.id), 'id', {numeric:true}));
  return { lapRows, D, stockCols, stockRows, salesCols, salesRows, biayaCols, biayaRows, supCols, supRows, mktCols, mktRows,
    ring: { ready: cnt('Ready'), booking: cnt('Booking'), dp: cnt('DP'), sold: cnt('Sold'), total: stock.length,
      modalAktif: sum(aktif, s => nmF('modalTotal', s, Number(s.hargaModal)||0)), jualAktif: sum(aktif, akhir), titip: stock.filter(s => s.lokasi && s.lokasi.toko && s.status !== 'Sold').length,
      trx: sales.length, omzet: sum(sales, s => s.jual), untung: sum(sales, s => s.untung), perBulan } };
}
const NM_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const NM_LAP_COLS = [['No',6,'n'],['Tanggal Penjualan',15,'d'],['ID Unit',10,'id'],['Tipe Laptop',28,'t'],['Spesifikasi',38,'t'],['Serial Number',22,'sn'],
  ['Supplier',18,'t'],['Harga Modal',17,'rp'],['Harga Jual (Akhir)',19,'rp'],['Marketing',20,'mk']];
function nmLapPenjualan(wb, X, K){
  const rows = X.lapRows, N = NM_LAP_COLS.length, last = String.fromCharCode(64 + N), HR = 5;
  const ws = wb.addWorksheet('LAPORAN PENJUALAN', { properties: { tabColor: { argb: 'FFFE2E4B' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: HR, showGridLines: false, zoomScale: 100 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, printTitlesRow: HR + ':' + HR,
      margins: { left: .3, right: .3, top: .45, bottom: .45, header: .2, footer: .2 } },
    headerFooter: { oddFooter: '&LLaporan Penjualan — NISCAYA MAKASSAR&RHalaman &P / &N' } });
  ws.columns = NM_LAP_COLS.map(([, w]) => ({ width: w }));
  const FONT = 'Calibri';
  ws.mergeCells(`A1:${last}1`); const t = ws.getCell('A1'); t.value = 'LAPORAN PENJUALAN LAPTOP — NISCAYA MAKASSAR';
  t.font = { name: FONT, bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: K.BLUE } };
  t.alignment = { vertical: 'middle', horizontal: 'center' }; ws.getRow(1).height = 34;
  const tg = v => { const p = String(v || '').split('-'); return p.length === 3 ? Number(p[2]) + ' ' + NM_BULAN[Number(p[1]) - 1] + ' ' + p[0] : '-'; };
  const per = rows.length ? 'Periode: ' + tg(rows[0].tgl) + ' s/d ' + tg(rows[rows.length - 1].tgl) : 'Belum ada penjualan';
  const now = new Date();
  ws.mergeCells(`A2:${last}2`); const t2 = ws.getCell('A2');
  t2.value = per + '   •   ' + rows.length + ' unit terjual   •   Diekspor ' + now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  t2.font = { name: FONT, italic: true, size: 10.5, color: { argb: 'FF475569' } }; t2.alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(2).height = 20;
  // kartu ringkas baris 3
  const totM = rows.reduce((a, r) => a + r.modal, 0), totA = rows.reduce((a, r) => a + r.akhir, 0), viaMk = rows.filter(r => r.mk).length;
  const card = (rng, label, val, fmt, col) => { const [p1, p2] = rng.split(':'); if(p1 !== p2) ws.mergeCells(rng); const c = ws.getCell(rng.split(':')[0]);
    c.value = { richText: [{ text: label + '\n', font: { name: FONT, size: 9, color: { argb: 'FF64748B' } } }, { text: val, font: { name: FONT, size: 12, bold: true, color: { argb: col || 'FF0F172A' } } }] };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    c.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } }; };
  const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  card('A3:C3', 'Unit terjual', rows.length + ' unit'); card('D3:E3', 'Lewat marketing / tanpa marketing', viaMk + ' / ' + (rows.length - viaMk) + ' unit');
  card('F3:G3', 'Total harga modal', rp(totM)); card('H3:I3', 'Total harga jual (akhir)', rp(totA), 'FF067647'); card('J3:J3', 'Selisih', rp(totA - totM), totA - totM < 0 ? 'FFDC2626' : 'FF067647');
  ws.getRow(3).height = 40; ws.getRow(4).height = 8;
  // judul kolom
  const hr = ws.getRow(HR); hr.height = 32;
  NM_LAP_COLS.forEach(([h], j) => { const c = hr.getCell(j + 1); c.value = h; c.font = { name: FONT, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: K.ACC } }; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; c.border = K.border; });
  const al = { n: 'center', d: 'center', id: 'center', sn: 'left', rp: 'right', mk: 'left', t: 'left' };
  rows.forEach((r, i) => {
    const row = ws.getRow(HR + 1 + i), vals = [i + 1, X.D(r.tgl), r.id, r.tipe, r.spek, r.sn, r.sup, r.modal, r.akhir, r.mk || 'Tanpa marketing'];
    row.height = 20;
    vals.forEach((v, j) => { const c = row.getCell(j + 1), ty = NM_LAP_COLS[j][2]; c.value = v; c.border = K.border;
      c.font = { name: FONT, size: 11, bold: ty === 'id', color: ty === 'mk' && !r.mk ? { argb: 'FF94A3B8' } : undefined, italic: ty === 'mk' && !r.mk };
      const h = v === '-' ? 'center' : al[ty]; c.alignment = { vertical: 'middle', horizontal: h, wrapText: ty === 't', indent: h === 'center' ? 0 : 1 };
      if(ty === 'rp') c.numFmt = K.RP; else if(ty === 'd') c.numFmt = K.DT;
      if(i % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: K.ZEB } }; });
    const m = row.getCell(10); if(r.mk) m.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E8' } };
  });
  if(!rows.length){ const er = HR + 1; ws.mergeCells(`A${er}:${last}${er}`); const c = ws.getCell(`A${er}`); c.value = 'Belum ada data penjualan.'; c.alignment = { horizontal: 'center' }; c.font = { italic: true, color: { argb: 'FF64748B' } }; }
  // baris total (rumus, ikut berubah bila data diedit)
  const a = HR + 1, b = HR + Math.max(rows.length, 1), tr = ws.getRow(b + 1); tr.height = 26;
  ws.mergeCells(`A${b + 1}:G${b + 1}`); tr.getCell(1).value = `TOTAL  (${rows.length} unit)`;
  tr.getCell(8).value = { formula: `SUBTOTAL(9,H${a}:H${b})`, result: totM }; tr.getCell(9).value = { formula: `SUBTOTAL(9,I${a}:I${b})`, result: totA };
  for(let j = 1; j <= N; j++){ const c = tr.getCell(j); c.font = { name: FONT, bold: true, size: 11.5, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: K.BLUE } }; c.border = K.border; c.alignment = { vertical: 'middle', horizontal: j === 1 ? 'center' : 'right', indent: j === 1 ? 0 : 1 }; if(j === 8 || j === 9) c.numFmt = K.RP; }
  if(rows.length) ws.autoFilter = { from: { row: HR, column: 1 }, to: { row: HR + rows.length, column: N } };
  return ws;
}
async function nmExportStyled(ExcelJS, X){
  const wb = new ExcelJS.Workbook(); wb.creator = 'NISCAYA MAKASSAR'; wb.created = new Date();
  const BLUE = 'FF1E3A8A', ACC = 'FF2563EB', ZEB = 'FFF5F8FF', LINE = 'FFD9E1F2';
  const RP = '"Rp" #,##0;[Red]-"Rp" #,##0;"-"', DT = 'dd/mm/yyyy';
  const ST = { Ready: ['FFDCFCE7','FF067647'], Booking: ['FFFEF3C7','FFB45309'], DP: ['FFEDE9FE','FF6D28D9'], Sold: ['FFE5E7EB','FF374151'] };
  const border = { top:{style:'thin',color:{argb:LINE}}, left:{style:'thin',color:{argb:LINE}}, bottom:{style:'thin',color:{argb:LINE}}, right:{style:'thin',color:{argb:LINE}} };
  const sheet = (name, cols, rows, opt = {}) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: opt.freezeCol || 0, ySplit: 1, zoomScale: 100 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: .3, right: .3, top: .4, bottom: .4, header: .2, footer: .2 } },
      headerFooter: { oddFooter: `&L${name} — NISCAYA MAKASSAR&RHalaman &P / &N` }, properties: { tabColor: { argb: opt.tab || ACC } } });
    ws.columns = cols.map(([h, w]) => ({ header: h, width: w }));
    rows.forEach(r => ws.addRow(r));
    cols.forEach(([, , t], j) => { const col = ws.getColumn(j + 1);
      if(t === 'rp') col.numFmt = RP; else if(t === 'd') col.numFmt = DT; else if(t === 'n') col.numFmt = '#,##0';
      col.alignment = { vertical: 'middle', horizontal: t === 'rp' || t === 'n' || t === 'kom' ? 'right' : (t === 'd' || t === 'st' ? 'center' : 'left'), wrapText: t === 't' && cols[j][1] >= 24 }; });
    const hr = ws.getRow(1); hr.height = 30;
    hr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; c.border = border; });
    for(let i = 2; i <= rows.length + 1; i++){
      const row = ws.getRow(i);
      for(let j = 1; j <= cols.length; j++){ const c = row.getCell(j); c.border = border; if(i % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEB } }; c.font = { size: 10.5 }; }
      cols.forEach(([, , t], j) => { const c = row.getCell(j + 1);
        if(t === 'st' && ST[c.value]){ c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ST[c.value][0] } }; c.font = { bold: true, size: 10.5, color: { argb: ST[c.value][1] } }; }
        if(t === 'url' && /^https?:\/\//i.test(String(c.value || ''))){ const u = String(c.value); c.value = { text: 'Buka foto', hyperlink: u, tooltip: u }; c.font = { size: 10.5, color: { argb: ACC }, underline: true }; }
        if(t === 'kom'){ const tipe = row.getCell(j).value; c.numFmt = tipe === 'Persen' ? '0.##"%"' : RP; }
      });
      if(opt.idBold) row.getCell(1).font = { bold: true, size: 10.5 };
    }
    if(rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return ws;
  };
  // RINGKASAN
  const R = X.ring, ws = wb.addWorksheet('RINGKASAN', { properties: { tabColor: { argb: BLUE } }, views: [{ showGridLines: false }], pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  ws.columns = [{ width: 3 }, { width: 30 }, { width: 20 }, { width: 20 }, { width: 20 }];
  ws.mergeCells('B2:E2'); const t = ws.getCell('B2'); t.value = 'NISCAYA MAKASSAR — Laporan Data'; t.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }; t.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(2).height = 36;
  ws.mergeCells('B3:E3'); const now = new Date(); const t3 = ws.getCell('B3');
  t3.value = 'Diekspor: ' + now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  t3.font = { italic: true, color: { argb: 'FF64748B' } }; t3.alignment = { indent: 1 };
  let r = 5;
  const head = (txt) => { ws.mergeCells(`B${r}:E${r}`); const c = ws.getCell(`B${r}`); c.value = txt; c.font = { bold: true, size: 12, color: { argb: ACC } };
    c.border = { bottom: { style: 'medium', color: { argb: ACC } } }; ws.getRow(r).height = 22; r++; };
  const kv = (k, v, fmt, color) => { const a = ws.getCell(`B${r}`), b = ws.getCell(`C${r}`); a.value = k; b.value = v; a.font = { size: 11 }; b.font = { bold: true, size: 11, color: color ? { argb: color } : undefined };
    if(fmt) b.numFmt = fmt; b.alignment = { horizontal: 'right' }; [a, b].forEach(c => c.border = { bottom: { style: 'hair', color: { argb: LINE } } }); r++; };
  head('Stok laptop');
  kv('Ready', R.ready, '#,##0" unit"', ST.Ready[1]); kv('Booking', R.booking, '#,##0" unit"', ST.Booking[1]); kv('Sudah DP', R.dp, '#,##0" unit"', ST.DP[1]);
  kv('Sold', R.sold, '#,##0" unit"', ST.Sold[1]); kv('Total unit tercatat', R.total, '#,##0" unit"'); kv('Dititip di toko mitra', R.titip, '#,##0" unit"');
  kv('Nilai modal stok aktif', R.modalAktif, RP); kv('Nilai jual stok aktif', R.jualAktif, RP); kv('Potensi untung stok aktif', R.jualAktif - R.modalAktif, RP, 'FF067647');
  r++; head('Penjualan');
  kv('Jumlah transaksi', R.trx, '#,##0'); kv('Total omzet', R.omzet, RP); kv('Total untung tercatat', R.untung, RP, 'FF067647');
  r++; head('Omzet per bulan');
  const th = ['Bulan', 'Unit terjual', 'Omzet', 'Untung tercatat'];
  th.forEach((h, j) => { const c = ws.getRow(r).getCell(j + 2); c.value = h; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }; c.alignment = { horizontal: j ? 'right' : 'left', vertical: 'middle' }; c.border = border; });
  ws.getRow(r).height = 22; r++;
  const keys = Object.keys(R.perBulan).sort().reverse();
  if(!keys.length){ ws.getCell(`B${r}`).value = 'Belum ada penjualan.'; ws.getCell(`B${r}`).font = { italic: true, color: { argb: 'FF64748B' } }; r++; }
  keys.forEach((k, i) => { const o = R.perBulan[k], [y, m] = k.split('-');
    const vals = [NM_BULAN[Number(m) - 1] + ' ' + y, o.n, o.omzet, o.untung], fm = [null, '#,##0', RP, RP];
    vals.forEach((v, j) => { const c = ws.getRow(r).getCell(j + 2); c.value = v; if(fm[j]) c.numFmt = fm[j]; c.border = border; c.alignment = { horizontal: j ? 'right' : 'left' };
      if(i % 2 === 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEB } }; }); r++; });
  r++; ws.mergeCells(`B${r}:E${r}`); const n = ws.getCell(`B${r}`); n.value = 'Sheet LAPORAN PENJUALAN berisi rincian unit terjual (hanya laporan). Sheet STOK LAPTOP, PENJUALAN, BIAYA UNIT, SUPPLIER, dan MARKETING bisa diedit lalu diimpor kembali ke aplikasi (data digabung, tidak menimpa).';
  n.font = { italic: true, size: 9.5, color: { argb: 'FF64748B' } }; n.alignment = { wrapText: true }; ws.getRow(r).height = 28;

  nmLapPenjualan(wb, X, { BLUE, ACC, ZEB, LINE, RP, DT, border });
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: 'visible' }];
  sheet('STOK LAPTOP', X.stockCols, X.stockRows, { freezeCol: 3, idBold: true, tab: 'FF059669' });
  sheet('PENJUALAN', X.salesCols, X.salesRows, { freezeCol: 0, tab: 'FFD97706' });
  sheet('BIAYA UNIT', X.biayaCols, X.biayaRows, { freezeCol: 1, idBold: true, tab: 'FFDC2626' });
  sheet('SUPPLIER', X.supCols, X.supRows, { tab: 'FF7C3AED' });
  sheet('MARKETING', X.mktCols, X.mktRows, { tab: 'FFDB2777' });
  return wb.xlsx.writeBuffer();
}
function nmExportPlain(X){
  const wb = XLSX.utils.book_new();
  const add = (name, cols, rows) => { const ws = XLSX.utils.aoa_to_sheet([cols.map(c => c[0]), ...rows.map(r => r.map(v => v instanceof Date ? nmIso(v) : (v && v.text ? v.hyperlink : v)))]);
    ws['!cols'] = cols.map(c => ({ wch: c[1] })); if(rows.length) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: cols.length - 1 } }) };
    cols.forEach((c, j) => { if(c[2] !== 'rp') return; for(let i = 1; i <= rows.length; i++){ const cell = ws[XLSX.utils.encode_cell({ r: i, c: j })]; if(cell && cell.t === 'n') cell.z = '"Rp" #,##0'; } });
    XLSX.utils.book_append_sheet(wb, ws, name); };
  const R = X.ring;
  const ring = XLSX.utils.aoa_to_sheet([['NISCAYA MAKASSAR — Laporan Data'], ['Diekspor', new Date().toLocaleString('id-ID')], [], ['Ready', R.ready], ['Booking', R.booking], ['Sudah DP', R.dp], ['Sold', R.sold],
    ['Total unit', R.total], ['Nilai modal stok aktif', R.modalAktif], ['Nilai jual stok aktif', R.jualAktif], [], ['Jumlah transaksi', R.trx], ['Total omzet', R.omzet], ['Total untung tercatat', R.untung]]);
  ring['!cols'] = [{ wch: 28 }, { wch: 20 }]; XLSX.utils.book_append_sheet(wb, ring, 'RINGKASAN');
  add('LAPORAN PENJUALAN', NM_LAP_COLS, X.lapRows.map((r, i) => [i + 1, r.tgl, r.id, r.tipe, r.spek, r.sn, r.sup, r.modal, r.akhir, r.mk || 'Tanpa marketing']));
  add('STOK LAPTOP', X.stockCols, X.stockRows); add('PENJUALAN', X.salesCols, X.salesRows); add('BIAYA UNIT', X.biayaCols, X.biayaRows); add('SUPPLIER', X.supCols, X.supRows); add('MARKETING', X.mktCols, X.mktRows);
  return wb;
}
exportExcel = async function(){
  const btn = document.getElementById('exportBtn'); const old = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Menyiapkan file…'; }
  const fname = `NISCAYA_MAKASSAR_Data_${typeof localYMD === 'function' ? localYMD() : nmIso(new Date())}.xlsx`;
  try{
    const X = nmExportData();
    try{
      const ExcelJS = await nmLoadExcelJs();
      const buf = await nmExportStyled(ExcelJS, X);
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast('File Excel berhasil diunduh');
    }catch(err){
      console.warn('IMPOR-AMAN export rapi gagal, pakai format sederhana', err);
      XLSX.writeFile(nmExportPlain(X), fname); showToast('File Excel diunduh (format sederhana — koneksi ke pustaka Excel gagal)');
    }
  }catch(err){ showToast('Gagal membuat Excel: ' + err.message); }
  finally{ if(btn){ btn.disabled = false; btn.textContent = old; } }
};
(function(){ try{ if(currentTab === 'sync') render(); }catch(_){} })();
