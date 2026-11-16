/*TEK-OWNER v4*/
/* ================= TEKNISI (akun terpisah, data di layanan /tapi) ================= */
const TEK = { state:null, filterTek:'Semua', filterSt:'Aktif', bulan:'', loading:false, err:'', ver:0 };
const TEK_ST_COLOR = {Antri:'#8590a2', Dikerjakan:'#cf9f02', Selesai:'#1f845a', Gagal:'#c9372c'};
async function tekApi(path, body){
  const o = body===undefined ? {cache:'no-store', credentials:'same-origin'} : {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)};
  let r; try{ r = await fetch(path, o); }catch(_){ throw new Error('Layanan teknisi belum bisa dihubungi — periksa koneksi, lalu coba lagi'); }
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || ('Layanan teknisi belum siap (' + r.status + ')'));
  return j;
}
function tekJam(j){ if(!j.mulai) return null; return ((j.selesai || Date.now()/1000) - j.mulai) / 3600; }
function tekFmtJam(h){ if(h===null || h===undefined) return '-'; return h < 1 ? Math.round(h*60) + ' mnt' : h.toFixed(1).replace('.',',') + ' jam'; }
function tekParts(j){ return (j.parts||[]).reduce((a,p)=>a+(Number(p.nominal)||0),0); }
function tekTgl(t){ return t ? new Date(t*1000).toLocaleString('id-ID',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-'; }
function tekAcc(u){ return ((TEK.state && TEK.state.accounts) || []).find(a=>a.username===u) || {username:u, label:u}; }
async function tekLoad(){ const s = await tekApi('/tapi/owner/state'); TEK.state = s; TEK.ver = s.version; TEK.err = ''; await tekSyncBiaya(); return s; }
/* Pekerjaan Selesai -> biaya part + upah otomatis masuk ke biaya service unit (sekali saja per pekerjaan) */
async function tekSyncBiaya(){
  if(!TEK.state) return;
  let ubah = 0; const tandai = [];
  TEK.state.jobs.filter(j => j.status==='Selesai' && !j.biayaMasuk).forEach(j => {
    const unit = DATA.stock.find(s => String(s.id) === String(j.unitId));
    if(!unit){ return; }
    const tag = '#' + j.id; unit.biaya = unit.biaya || [];
    if(!unit.biaya.some(b => String(b.keterangan||'').includes(tag))){
      const tglSelesai = j.selesai ? localYMD(new Date(j.selesai*1000)) : localYMD();
      const nm = tekAcc(j.teknisi).label;
      const part = tekParts(j), upah = Number(j.upah)||0;
      if(part > 0) unit.biaya.push({jenis: j.kategori==='mesin' ? 'Service' : 'Lainnya', keterangan: `Part: ${(j.parts||[]).map(p=>p.nama).filter(Boolean).join(', ') || '-'} (${j.jenis||'teknisi'}) ${tag}`, nominal: part, tanggal: tglSelesai});
      if(upah > 0) unit.biaya.push({jenis:'Service', keterangan:`Upah ${nm}: ${j.jenis||'-'} ${tag}`, nominal: upah, tanggal: tglSelesai});
      if(part > 0 || upah > 0) ubah++;
    }
    tandai.push(j.id);
  });
  if(ubah){ await persist(); showToast(ubah + ' pekerjaan teknisi selesai — biaya part & upah masuk ke biaya unit'); }
  for(const id of tandai){ try{ const r = await tekApi('/tapi/owner/job', {id, biayaMasuk:true}); const k = TEK.state.jobs.findIndex(x=>x.id===id); if(k>=0) TEK.state.jobs[k] = r.job; }catch(_){} }
}
setInterval(async () => {
  try{
    if(!SYNC.online || document.hidden || document.getElementById('loginOverlay') || !DATA.stock.length) return;
    const v = await tekApi('/tapi/version');
    if(TEK.state && v.version === TEK.ver) return;
    await tekLoad();
    if(currentTab === 'teknisi' && !modalOpen() && !isTyping()){ render(); }
  }catch(_){}
}, 15000);

function renderTeknisi(c, ta){
  ta.innerHTML = `<button class="btn" id="tkAkunBtn">⚙ Akun Teknisi</button> <button class="btn btn-primary" id="tkAddBtn">+ Tugaskan Pekerjaan</button>`;
  ta.querySelector('#tkAddBtn').onclick = () => openTekJobModal();
  ta.querySelector('#tkAkunBtn').onclick = () => openTekAkunModal();
  if(!TEK.state){
    c.innerHTML = `<div class="panel"><div class="empty"><p>${TEK.err ? '⚠ ' + esc(TEK.err) : 'Memuat data teknisi…'}</p></div></div>`;
    if(TEK.err){ c.querySelector('.empty').insertAdjacentHTML('beforeend', '<p><button class="btn btn-sm" id="tkRetry">↻ Coba lagi</button></p>'); c.querySelector('#tkRetry').onclick = () => { TEK.err = ''; renderTeknisi(c, ta); }; }
    if(!TEK.loading && !TEK.err){ TEK.loading = true; tekLoad().then(()=>{ TEK.loading=false; if(currentTab==='teknisi') render(); }).catch(e=>{ TEK.loading=false; TEK.err = e.message; if(currentTab==='teknisi') renderTeknisi(c, ta); }); }
    return;
  }
  const S = TEK.state, accs = S.accounts;
  const inBulan = j => { if(!TEK.bulan) return true; const t = j.selesai || j.dibuat; return t && localYMD(new Date(t*1000)).slice(0,7) === TEK.bulan; };
  const perTek = accs.map(a => {
    const my = S.jobs.filter(j => j.teknisi === a.username);
    const aktif = my.filter(j => j.status==='Antri' || j.status==='Dikerjakan');
    const done = my.filter(j => j.status==='Selesai' && inBulan(j));
    const gagal = my.filter(j => j.status==='Gagal' && inBulan(j));
    const dur = done.map(tekJam).filter(h => h!==null);
    const ontime = done.filter(j => j.targetJam && tekJam(j)!==null && tekJam(j) <= j.targetJam).length;
    const bertarget = done.filter(j => j.targetJam).length;
    return { a, aktif:aktif.length, done:done.length, gagal:gagal.length,
      rata: dur.length ? dur.reduce((x,y)=>x+y,0)/dur.length : null,
      ontime: bertarget ? Math.round(ontime/bertarget*100) : null,
      upah: done.reduce((x,j)=>x+(Number(j.upah)||0),0), part: done.reduce((x,j)=>x+tekParts(j),0),
      sukses: (done.length+gagal.length) ? Math.round(done.length/(done.length+gagal.length)*100) : null };
  });
  let rows = S.jobs.filter(j => (TEK.filterTek==='Semua' || j.teknisi===TEK.filterTek)
    && (TEK.filterSt==='Semua' || (TEK.filterSt==='Aktif' ? (j.status==='Antri'||j.status==='Dikerjakan') : j.status===TEK.filterSt)) && inBulan(j));
  rows = rows.slice().sort((a,b)=>(b.diubah||b.dibuat||0)-(a.diubah||a.dibuat||0));
  const card = (lbl, val, sub, color) => `<div class="stat-card"><div class="lbl">${lbl}</div><div class="val" style="font-size:19px${color?';color:'+color:''}">${val}</div><div class="sub">${sub}</div></div>`;
  c.innerHTML = `
    <div class="toolbar" style="flex-wrap:wrap">
      <span class="dim" style="font-size:13px">Periode kinerja:</span>
      <input type="month" id="tkBulan" value="${esc(TEK.bulan)}" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;">
      ${TEK.bulan ? '<button class="btn btn-ghost btn-sm" id="tkSemua">Semua periode</button>' : '<span class="dim" style="font-size:12.5px">(semua periode)</span>'}
    </div>
    ${perTek.map(x => `<div class="panel" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <h3 style="margin:0">⚒ ${esc(x.a.label)} <span class="dim" style="font-weight:500;font-size:12.5px">· ${esc(x.a.roleLabel)} · akun <span class="mono">${esc(x.a.username)}</span>${x.a.aktif?'':' · NONAKTIF'}</span></h3>
        ${x.a.punyaPassword ? '' : '<span style="font-size:12px;color:#B65C00;font-weight:600">⚠ Kata sandi belum diatur — klik ⚙ Akun Teknisi</span>'}
      </div>
      <div class="grid-stats">
        ${card('Aktif', x.aktif, 'antri + dikerjakan')}
        ${card('Selesai', x.done, (x.gagal ? x.gagal + ' gagal · ' : '') + 'tingkat berhasil ' + (x.sukses===null?'—':x.sukses+'%'))}
        ${card('Rata-rata Durasi', tekFmtJam(x.rata), 'per pekerjaan selesai')}
        ${card('Tepat Target', x.ontime===null?'—':x.ontime+'%', 'selesai ≤ target jam', x.ontime!==null && x.ontime<70 ? 'var(--danger)' : 'var(--ready)')}
        ${card('Upah', rupiah(x.upah), 'dari pekerjaan selesai')}
        ${card('Biaya Part', rupiah(x.part), 'dari pekerjaan selesai')}
      </div></div>`).join('')}
    <div class="toolbar" style="flex-wrap:wrap">
      <select id="tkFTek">${['Semua', ...accs.map(a=>a.username)].map(u=>`<option value="${esc(u)}" ${TEK.filterTek===u?'selected':''}>${u==='Semua'?'Semua teknisi':esc(tekAcc(u).label)}</option>`).join('')}</select>
      <select id="tkFSt">${['Aktif','Semua','Antri','Dikerjakan','Selesai','Gagal'].map(s=>`<option ${TEK.filterSt===s?'selected':''}>${s}</option>`).join('')}</select>
      <button class="btn btn-ghost btn-sm" id="tkRefresh">↻ Muat ulang</button>
      <span class="dim" style="font-size:12.5px">Halaman login teknisi: <b class="mono">${esc(location.host)}/teknisi</b></span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Unit</th><th>Pekerjaan</th><th>Teknisi</th><th>Status</th><th>Target</th><th>Durasi</th><th>Part</th><th>Upah</th><th>Diubah</th></tr></thead>
      <tbody>${rows.map(j => { const h = tekJam(j), telat = h!==null && j.targetJam && h > j.targetJam; const u = j.unit||{};
        return `<tr data-tkjob="${esc(j.id)}" style="cursor:pointer">
          <td class="mono dim">${esc(j.id)}</td>
          <td><b>${esc(u.merek||'')} ${esc(u.tipe||'')}</b><div class="dim mono" style="font-size:11.5px">${esc(j.unitId||'')}${u.noSeri?' · SN '+esc(u.noSeri):''}</div></td>
          <td>${esc(j.jenis||'-')}<div class="dim" style="font-size:11.5px">${j.kategori==='mesin'?'Perbaikan mesin':'Service ringan'}</div></td>
          <td>${esc(tekAcc(j.teknisi).label)}</td>
          <td><span style="background:${TEK_ST_COLOR[j.status]||'#888'};color:#fff;border-radius:999px;padding:3px 9px;font-size:11.5px;font-weight:700">${esc(j.status)}</span>${j.biayaMasuk?' <span title="Biaya sudah masuk ke unit">✓</span>':''}</td>
          <td class="mono">${j.targetJam ? tekFmtJam(Number(j.targetJam)) : '-'}</td>
          <td class="mono" style="${telat?'color:var(--danger);font-weight:700':''}">${tekFmtJam(h)}</td>
          <td class="mono">${tekParts(j) ? rupiah(tekParts(j)) : '-'}</td>
          <td class="mono">${j.upah ? rupiah(j.upah) : '-'}</td>
          <td class="dim" style="font-size:12px">${tekTgl(j.diubah||j.dibuat)}</td></tr>`; }).join('') || '<tr><td colspan="10"><div class="empty"><p>Belum ada pekerjaan di filter ini. Klik <b>+ Tugaskan Pekerjaan</b>.</p></div></td></tr>'}</tbody>
    </table></div>`;
  c.querySelector('#tkBulan').onchange = e => { TEK.bulan = e.target.value; renderTeknisi(c, ta); };
  const sm = c.querySelector('#tkSemua'); if(sm) sm.onclick = () => { TEK.bulan = ''; renderTeknisi(c, ta); };
  c.querySelector('#tkFTek').onchange = e => { TEK.filterTek = e.target.value; renderTeknisi(c, ta); };
  c.querySelector('#tkFSt').onchange = e => { TEK.filterSt = e.target.value; renderTeknisi(c, ta); };
  c.querySelector('#tkRefresh').onclick = async () => { try{ await tekLoad(); renderTeknisi(c, ta); showToast('Data teknisi diperbarui'); }catch(e){ showToast(e.message); } };
  c.querySelectorAll('[data-tkjob]').forEach(tr => tr.onclick = () => openTekJobModal(tr.dataset.tkjob));
}

function openTekJobModal(jid){
  if(!TEK.state){ showToast('Data teknisi belum termuat'); return; }
  const j = jid ? TEK.state.jobs.find(x=>x.id===jid) : null;
  const accs = TEK.state.accounts;
  const unitOpts = DATA.stock.filter(s => s.status!=='Sold' || (j && String(s.id)===String(j.unitId)))
    .map(s => `<option value="${esc(s.id)}" ${j && String(j.unitId)===String(s.id)?'selected':''}>${esc(s.id)} — ${esc(s.merek)} ${esc(s.tipe)} · SN ${esc(s.noSeri||'-')} (${esc(s.status)})</option>`).join('');
  const kat = j ? (j.kategori||'ringan') : 'ringan';
  const accOpt = (sel) => accs.map(a => `<option value="${esc(a.username)}" ${a.username===sel?'selected':''}>${esc(a.label)} (${esc(a.roleLabel)})</option>`).join('');
  const defTek = j ? j.teknisi : ((accs.find(a=>a.role===kat)||accs[0]||{}).username);
  const u = (j && j.unit) || {};
  document.getElementById('modalBox').innerHTML = `
    <h3>${j ? 'Pekerjaan ' + esc(j.id) : 'Tugaskan Pekerjaan ke Teknisi'}</h3>
    <div class="form-grid">
      <div class="field full"><label>Unit Laptop</label><select id="tk_unit"><option value="">— Pilih unit —</option>${unitOpts}</select></div>
      <div class="field"><label>Kategori</label><select id="tk_kat"><option value="ringan" ${kat==='ringan'?'selected':''}>Service ringan</option><option value="mesin" ${kat==='mesin'?'selected':''}>Perbaikan mesin (berat)</option></select></div>
      <div class="field"><label>Teknisi</label><select id="tk_tek">${accOpt(defTek)}</select></div>
      <div class="field full"><label>Jenis Pekerjaan</label><input id="tk_jenis" list="tkJenisList" value="${esc(j?j.jenis:'')}" placeholder="cth: Cleaning + repaste, Install ulang, Ganti IC power">
        <datalist id="tkJenisList">${['Cleaning / repaste','Install ulang Windows','Ganti keyboard','Ganti baterai','Ganti layar','Upgrade RAM / SSD','Cek & QC unit','Perbaikan mesin / mainboard','Ganti IC power','Reball VGA','Perbaikan engsel / casing'].map(x=>`<option value="${x}">`).join('')}</datalist></div>
      <div class="field"><label>Target Durasi (jam)</label><input id="tk_target" type="number" min="0" step="0.5" value="${j && j.targetJam ? j.targetJam : ''}" placeholder="cth: 2"></div>
      <div class="field"><label>Upah / Komisi Teknisi (Rp)</label><input id="tk_upah" type="number" min="0" value="${j && j.upah ? j.upah : ''}" placeholder="0"></div>
      <div class="field full"><label>Catatan untuk teknisi</label><input id="tk_cat" value="${esc(j?j.catatanOwner:'')}" placeholder="keluhan, kelengkapan, prioritas..."></div>
      ${j ? `<div class="field"><label>Status</label><select id="tk_st">${['Antri','Dikerjakan','Selesai','Gagal'].map(s=>`<option ${j.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field full"><div class="price-summary">
        <div class="ps-row"><span>Unit</span><span>${esc(u.merek||'')} ${esc(u.tipe||'')} · ${esc([u.processor,u.ram,u.ssd].filter(Boolean).join(' · '))}</span></div>
        <div class="ps-row"><span>Ditugaskan / mulai / selesai</span><span class="mono">${tekTgl(j.dibuat)} · ${tekTgl(j.mulai)} · ${tekTgl(j.selesai)}</span></div>
        <div class="ps-row"><span>Durasi vs target</span><span class="mono">${tekFmtJam(tekJam(j))} / ${j.targetJam?tekFmtJam(Number(j.targetJam)):'-'}</span></div>
        <div class="ps-row"><span>Kerusakan ditemukan</span><span>${esc(j.catatanKerusakan||'-')}</span></div>
        <div class="ps-row"><span>Hasil</span><span>${esc(j.hasil||'-')}</span></div>
        ${j.status==='Gagal'?`<div class="ps-row"><span>Alasan gagal</span><span>${esc(j.alasanGagal||'-')}</span></div>`:''}
        <div class="ps-row"><span>Part (${(j.parts||[]).length})</span><span class="mono">${(j.parts||[]).map(p=>esc(p.nama)+' '+rupiah(p.nominal)).join(', ')||'-'} · total ${rupiah(tekParts(j))}</span></div>
        <div class="ps-row"><span>Foto</span><span>${(j.fotoSebelum||[]).map((f,i)=>`<a href="${esc(f)}" target="_blank" rel="noopener">sebelum ${i+1}</a>`).concat((j.fotoSesudah||[]).map((f,i)=>`<a href="${esc(f)}" target="_blank" rel="noopener">sesudah ${i+1}</a>`)).join(' · ')||'-'}</span></div>
        <div class="ps-row tot"><span>Biaya ke unit</span><span>${j.biayaMasuk?'✓ sudah masuk ke biaya service unit':'otomatis masuk saat status Selesai'}</span></div>
      </div></div>` : ''}
    </div>
    <div class="modal-actions">
      ${j ? '<button class="btn btn-danger" id="tk_del" style="margin-right:auto">Hapus</button>' : ''}
      <button class="btn btn-ghost" id="tk_cancel">Batal</button><button class="btn btn-primary" id="tk_save">${j?'Simpan':'Tugaskan'}</button>
    </div>`;
  const ov = document.getElementById('overlay'); ov.classList.add('show');
  const $ = x => document.getElementById(x);
  $('tk_kat').onchange = () => { const a = accs.find(x=>x.role===$('tk_kat').value); if(a) $('tk_tek').value = a.username; };
  $('tk_cancel').onclick = () => ov.classList.remove('show');
  if($('tk_del')) $('tk_del').onclick = async () => {
    const ok = await confirmChange(`Hapus pekerjaan ${j.id}?`, [[`${(j.unit||{}).merek||''} ${(j.unit||{}).tipe||''}`, j.jenis||'-', '(dihapus)']]); if(!ok) return;
    try{ await tekApi('/tapi/owner/job-delete', {id:j.id}); await tekLoad(); ov.classList.remove('show'); showToast('Pekerjaan dihapus'); render(); }catch(e){ alert(e.message); }
  };
  $('tk_save').onclick = async () => {
    const s = DATA.stock.find(x => String(x.id) === $('tk_unit').value);
    if(!s){ alert('Pilih unit laptop'); return; }
    if(!$('tk_jenis').value.trim()){ alert('Isi jenis pekerjaan'); return; }
    const body = { teknisi:$('tk_tek').value, unitId:s.id, kategori:$('tk_kat').value, jenis:$('tk_jenis').value.trim(),
      targetJam:Number($('tk_target').value)||0, upah:Number($('tk_upah').value)||0, catatanOwner:$('tk_cat').value.trim(),
      unit:{id:s.id, merek:s.merek, tipe:s.tipe, processor:s.processor, ram:s.ram, ssd:s.ssd, vga:s.vga, layar:s.layar, noSeri:s.noSeri} };
    if(j){ body.id = j.id; if(j.biayaMasuk && (body.upah !== (Number(j.upah)||0))) showToast('Catatan: biaya pekerjaan ini sudah masuk ke unit — ubah biaya unit secara manual bila perlu'); const st = $('tk_st').value; if(st !== j.status) body.status = st; }
    $('tk_save').disabled = true;
    try{ await tekApi('/tapi/owner/job', body); await tekLoad(); ov.classList.remove('show'); showToast(j ? 'Pekerjaan disimpan' : 'Pekerjaan ditugaskan ke ' + tekAcc(body.teknisi).label); render(); }
    catch(e){ alert(e.message); $('tk_save').disabled = false; }
  };
}

function openTekAkunModal(){
  if(!TEK.state){ showToast('Data teknisi belum termuat'); return; }
  const accs = TEK.state.accounts;
  document.getElementById('modalBox').innerHTML = `
    <h3>Akun Teknisi</h3>
    <p class="dim" style="font-size:12.5px;margin:-4px 0 12px">Akun teknisi hanya bisa membuka pekerjaan miliknya di <b class="mono">${esc(location.host)}/teknisi</b> — tidak bisa melihat harga modal, harga jual, omzet, supplier, maupun menu lain. Akun master Anda tidak berubah.</p>
    ${accs.map((a,i) => `<div class="panel" style="margin-bottom:10px;padding:14px">
      <div style="font-weight:700;margin-bottom:8px">${esc(a.roleLabel)} ${a.punyaPassword?'':'<span style="color:#B65C00;font-size:12px">· kata sandi belum diatur</span>'}</div>
      <div class="form-grid">
        <div class="field"><label>Nama tampilan</label><input id="ak_label${i}" value="${esc(a.label)}"></div>
        <div class="field"><label>Nama akun (untuk login)</label><input id="ak_user${i}" value="${esc(a.username)}" autocapitalize="none"></div>
        <div class="field"><label>Kata sandi baru ${a.punyaPassword?'(kosongkan bila tidak diganti)':''}</label><input id="ak_pw${i}" type="text" autocomplete="new-password" placeholder="minimal 8 karakter"></div>
        <div class="field"><label>Status</label><select id="ak_aktif${i}"><option value="1" ${a.aktif?'selected':''}>Aktif</option><option value="0" ${a.aktif?'':'selected'}>Nonaktif (tidak bisa login)</option></select></div>
      </div>
      <div style="text-align:right;margin-top:8px"><button class="btn btn-primary btn-sm" data-aksave="${i}">Simpan akun ini</button></div>
    </div>`).join('')}
    <div class="modal-actions"><button class="btn btn-ghost" id="ak_close">Tutup</button></div>`;
  const ov = document.getElementById('overlay'); ov.classList.add('show');
  document.getElementById('ak_close').onclick = () => ov.classList.remove('show');
  document.querySelectorAll('[data-aksave]').forEach(b => b.onclick = async () => {
    const i = +b.dataset.aksave, a = accs[i], $ = x => document.getElementById(x);
    const body = { username:a.username, usernameBaru:$('ak_user'+i).value.trim().toLowerCase(), label:$('ak_label'+i).value.trim(), aktif:$('ak_aktif'+i).value==='1' };
    const pw = $('ak_pw'+i).value; if(pw) body.password = pw;
    if(!a.punyaPassword && !pw){ alert('Atur kata sandi dulu agar teknisi bisa login'); return; }
    b.disabled = true;
    try{ await tekApi('/tapi/owner/account', body); await tekLoad(); showToast('Akun ' + body.usernameBaru + ' disimpan' + (pw ? ' — berikan kata sandinya ke teknisi' : '')); openTekAkunModal(); if(currentTab==='teknisi') render(); }
    catch(e){ alert(e.message); b.disabled = false; }
  });
}

