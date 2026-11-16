/*FIX0024 v1*/
/* Komisi marketing per penjualan — dipakai rumus laba (Dashboard & Penjualan) */
function nmKomisiSale(s){
  if(!s || !s.marketing) return 0;
  try{ const m = (DATA.marketing||[]).find(x => String(x.nama) === String(s.marketing)); return m ? (Number(komisiFor(m, s))||0) : 0; }catch(_){ return 0; }
}
/* Lencana sinkron: kembali ke "Tersimpan di VPS" begitu koneksi pulih (sebelumnya tertahan di "Koneksi putus") */
(function(){
  if(typeof syncBadge !== 'function' || typeof checkRemote !== 'function') return;
  const _sb = syncBadge; let last = '', calls = 0;
  syncBadge = function(state){ last = state; calls++; return _sb.apply(this, arguments); };
  const _cr = checkRemote;
  checkRemote = async function(){
    const before = calls;
    await _cr.apply(this, arguments);
    if(last !== 'err' || calls !== before || !SYNC.online || SYNC.dirty || SYNC.saving) return;
    try{ const r = await fetch('/api/version', {cache:'no-store', credentials:'same-origin'}); if(r.ok && last === 'err') syncBadge('ok', 'Tersimpan di VPS'); }catch(_){}
  };
  try{ if(SYNC.poll) startPolling(); }catch(_){}
})();
