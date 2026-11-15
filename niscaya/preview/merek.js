const MEREK_KNOWN = ['ACER','ADVAN','ALIENWARE','APPLE','ASUS','AVITA','AXIOO','CHUWI','COMPAQ','DELL','EVERCOSS','FUJITSU','GIGABYTE','HP','HUAWEI','IBM','INFINIX','LENOVO','LG','MICROSOFT','MSI','NEC','PANASONIC','RAZER','SAMSUNG','SONY','TOSHIBA','VAIO','XIAOMI','ZYREX'];
const MEREK_ALIAS = {SURFACE:'MICROSOFT', MACBOOK:'APPLE', MAC:'APPLE', THINKPAD:'LENOVO', IDEAPAD:'LENOVO', LEGION:'LENOVO', ROG:'ASUS', VIVOBOOK:'ASUS', ZENBOOK:'ASUS', PAVILION:'HP', ELITEBOOK:'HP', PROBOOK:'HP', 'HEWLETT PACKARD':'HP', LATITUDE:'DELL', INSPIRON:'DELL', VOSTRO:'DELL', ASPIRE:'ACER', PREDATOR:'ACER', NITRO:'ACER'};
function merekDist(a, b){
  const d = []; for(let i=0;i<=a.length;i++){ d[i] = [i]; } for(let j=0;j<=b.length;j++) d[0][j] = j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++){
    const c = a[i-1]===b[j-1] ? 0 : 1;
    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+c);
    if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) d[i][j] = Math.min(d[i][j], d[i-2][j-2]+1);
  }
  return d[a.length][b.length];
}
const _merekCache = {};
function normMerek(m){
  const k = String(m||'').trim().toUpperCase().replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  if(!k) return 'LAINNYA';
  if(_merekCache[k]) return _merekCache[k];
  let r = k;
  const first = k.split(' ')[0];
  if(MEREK_KNOWN.includes(k)) r = k;
  else if(MEREK_ALIAS[k]) r = MEREK_ALIAS[k];
  else if(MEREK_KNOWN.includes(first)) r = first;
  else if(MEREK_ALIAS[first]) r = MEREK_ALIAS[first];
  else {
    // salah ketik: cari merek asli terdekat (huruf tertukar/kurang/lebih/salah)
    const max = k.length <= 2 ? 0 : k.length <= 4 ? 1 : k.length <= 7 ? 2 : 3;
    const cands = MEREK_KNOWN.concat(Object.keys(MEREK_ALIAS).filter(a => a.length >= 5));
    let best = null, bd = 99, tie = false;
    cands.forEach(b => {
      if(Math.abs(b.length - k.length) > max) return;
      const d = merekDist(k, b), to = MEREK_ALIAS[b] || b;
      if(d < bd){ bd = d; best = to; tie = false; } else if(d === bd && to !== best) tie = true;
    });
    if(best && bd <= max && !tie) r = best;
  }
  return (_merekCache[k] = r);
}
function autoFixMerek(){
  let n = 0;
  (DATA.stock || []).forEach(s => { if(!String(s.merek||'').trim()) return; const v = normMerek(s.merek); if(v !== s.merek){ s.merek = v; n++; } });
  return n;
}
