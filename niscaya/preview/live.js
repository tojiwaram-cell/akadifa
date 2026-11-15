/* ===== Auto-refresh tampilan setiap ada perubahan data ===== */
const LIVE = { snap:null, changed:new Set(), pending:false, msg:null, bc:null, appHash:null };
function stockSnap(){ const m = {}; (DATA.stock||[]).forEach(s => { m[s.id] = JSON.stringify(s); }); m.__sales = JSON.stringify(DATA.sales||[]); return m; }
function isTyping(){ const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); }
function liveIndicator(text){
  if(!document.getElementById('liveCss')){ const st = document.createElement('style'); st.id = 'liveCss'; st.textContent = `
#liveInd{position:fixed;left:50%;top:14px;transform:translate(-50%,-30px);opacity:0;z-index:9500;background:#14161f;color:#fff;font:600 12.5px/1 system-ui,sans-serif;padding:9px 15px;border-radius:999px;box-shadow:0 10px 24px -8px rgba(0,0,0,.4);transition:all .25s;pointer-events:none;display:flex;gap:8px;align-items:center}
#liveInd.on{transform:translate(-50%,0);opacity:1}
#liveInd i{width:8px;height:8px;border-radius:50%;background:#22B07D;display:inline-block}
@keyframes liveFlash{0%{box-shadow:0 0 0 3px #FF9F1A;background:#FFF4E5}100%{box-shadow:0 0 0 0 transparent}}
.live-flash{animation:liveFlash 2.2s ease-out}
tr.live-flash td{animation:liveFlash 2.2s ease-out}`; document.head.appendChild(st); }
  let el = document.getElementById('liveInd');
  if(!el){ el = document.createElement('div'); el.id = 'liveInd'; document.body.appendChild(el); }
  const t = new Date(), hm = String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
  el.innerHTML = `<i></i>${esc(text)} · ${hm}`;
  el.classList.add('on'); clearTimeout(LIVE.indT); LIVE.indT = setTimeout(() => el.classList.remove('on'), 2600);
}
function liveRefresh(msg){
  const now = stockSnap(), prev = LIVE.snap;
  if(prev) for(const k in now) if(k !== '__sales' && prev[k] !== now[k]) LIVE.changed.add(k);
  LIVE.snap = now;
  if(msg) LIVE.msg = msg;
  if(modalOpen() || isTyping() || document.getElementById('loginOverlay') || document.getElementById('logoutDlg')){ LIVE.pending = true; return; }
  LIVE.pending = false;
  const sy = window.scrollY, keep = [];
  document.querySelectorAll('#content *').forEach(e => { if(e.scrollTop > 0 || e.scrollLeft > 0){ const cls = (e.className && typeof e.className === 'string') ? e.className.split(' ')[0] : ''; if(cls) keep.push([cls, [...document.getElementsByClassName(cls)].indexOf(e), e.scrollTop, e.scrollLeft]); } });
  render();
  window.scrollTo(0, sy);
  keep.forEach(([cls, idx, t, l]) => { const el = document.getElementsByClassName(cls)[idx]; if(el){ el.scrollTop = t; el.scrollLeft = l; } });
  LIVE.changed.forEach(id => { try{ document.querySelectorAll(`.kcard[data-id="${CSS.escape(id)}"], tr:has([data-id="${CSS.escape(id)}"])`).forEach(el => { el.classList.remove('live-flash'); void el.offsetWidth; el.classList.add('live-flash'); }); }catch(_){} });
  LIVE.changed.clear();
  liveIndicator(LIVE.msg || 'Tampilan diperbarui'); LIVE.msg = null;
}
function liveFlushPending(){ if(LIVE.pending && !isTyping() && !modalOpen()) liveRefresh(); }
document.addEventListener('focusout', () => setTimeout(liveFlushPending, 350));
document.addEventListener('visibilitychange', () => { if(!document.hidden){ checkRemote(); checkAppUpdate(); } });
(function watchOverlay(){ const o = document.getElementById('overlay'); if(!o){ return setTimeout(watchOverlay, 500); } new MutationObserver(() => setTimeout(liveFlushPending, 200)).observe(o, {attributes:true, attributeFilter:['class']}); })();
try{ LIVE.bc = new BroadcastChannel('niscaya-sync'); LIVE.bc.onmessage = () => checkRemote(); }catch(_){}
function liveSaved(){ try{ LIVE.bc && LIVE.bc.postMessage({v:SYNC.version}); }catch(_){} liveRefresh('✓ Tersimpan · tampilan diperbarui'); }
async function checkAppUpdate(){
  try{
    const txt = await (await fetch('/', {cache:'no-store', credentials:'same-origin'})).text();
    if(!/NISCAYA MAKASSAR/.test(txt)) return;
    let h = 0; for(let i = 0; i < txt.length; i += 7) h = (h * 31 + txt.charCodeAt(i)) | 0; h = h + ':' + txt.length;
    if(LIVE.appHash === null){ LIVE.appHash = h; return; }
    if(h !== LIVE.appHash){
      if(isTyping() || modalOpen() || SYNC.dirty || SYNC.saving){ setTimeout(checkAppUpdate, 5000); return; }
      liveIndicator('Aplikasi diperbarui — memuat ulang'); setTimeout(() => location.reload(), 900);
    }
  }catch(_){}
}
setInterval(checkAppUpdate, 60000); setTimeout(checkAppUpdate, 3000);
