# Potongan bersama gaya login "Contractbook" untuk index.html (patch 0017) dan teknisi.html
CSS = r"""
#loginOverlay,#tLogin{background:#c9c9d6;font-family:Inter,'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif;color:#1b1d36}
.cb-page{width:calc(100% - 48px);max-width:1080px;min-height:min(640px,calc(100% - 48px));margin:24px auto;display:grid;grid-template-columns:1.12fr 1fr;background:#fff;box-shadow:0 30px 80px -20px rgba(30,30,70,.35);border-radius:4px;overflow:hidden}
#loginOverlay{display:flex;align-items:center}
.cb-art{background:#f6f7fd;position:relative;overflow:hidden;min-height:560px}
.l3-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;perspective:1600px;padding:80px 0 0 70px}
.l3{position:relative;width:360px;height:240px;transform-style:preserve-3d;transform:rotateX(58deg) rotateZ(-32deg) translateZ(-30px);animation:l3f 7s ease-in-out infinite}
@keyframes l3f{0%,100%{transform:rotateX(58deg) rotateZ(-32deg) translateZ(-30px)}50%{transform:rotateX(58deg) rotateZ(-29deg) translateZ(-18px)}}
.l3-sh{position:absolute;inset:-8% -6%;border-radius:28px;background:radial-gradient(closest-side,rgba(30,32,70,.6),rgba(30,32,70,0));transform:translateZ(-14px);filter:blur(10px)}
.l3-base{position:absolute;inset:0;border-radius:14px;transform-style:preserve-3d}
.l3-top{position:absolute;inset:0;border-radius:14px;background:linear-gradient(135deg,#e9ebf0 0%,#cfd2da 45%,#b9bdc7 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.7),inset 0 -2px 6px rgba(0,0,0,.08)}
.l3-side{position:absolute;left:0;right:0;bottom:0;height:12px;transform-origin:bottom;transform:rotateX(-90deg);border-radius:0 0 12px 12px;background:linear-gradient(#a9adb7,#7d818c)}
.l3-sideR{position:absolute;top:0;bottom:0;right:0;width:12px;transform-origin:right;transform:rotateY(90deg);background:linear-gradient(90deg,#8d919c,#6f737e);border-radius:0 12px 12px 0}
.l3-kb{position:absolute;left:24px;right:24px;top:22px;height:118px;border-radius:6px;background:#2a2c33;padding:6px;display:flex;flex-direction:column;gap:4px;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}
.kr{display:flex;gap:4px;flex:1}
.kr i{flex:1;border-radius:3px;background:linear-gradient(#3b3e47,#2f3139);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 0 #15161a}
.kr i.w{flex:6}
.l3-tp{position:absolute;left:50%;bottom:16px;width:128px;height:72px;margin-left:-64px;border-radius:8px;background:linear-gradient(135deg,#d6d9e0,#c2c6cf);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08),inset 0 1px 0 rgba(255,255,255,.6)}
.l3-lid{position:absolute;left:0;right:0;bottom:100%;height:236px;transform-origin:bottom;transform:rotateX(-102deg);transform-style:preserve-3d}
.l3-back{position:absolute;inset:0;border-radius:14px 14px 4px 4px;background:linear-gradient(160deg,#d9dce3,#a7abb5);transform:translateZ(-8px)}
.l3-edge{position:absolute;left:0;right:0;top:0;height:8px;transform-origin:top;transform:rotateX(90deg);background:#9a9ea9;border-radius:6px 6px 0 0}
.l3-face{position:absolute;inset:0;border-radius:14px 14px 4px 4px;background:#16171c;padding:12px 12px 16px;box-shadow:inset 0 0 0 1px #3a3c44}
.l3-face:before{content:"";position:absolute;top:5px;left:50%;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:#30323a}
.l3-scr{position:relative;width:100%;height:100%;border-radius:3px;overflow:hidden;background:#f4f6fb;display:flex;flex-direction:column}
.l3-scr:after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.35) 0%,rgba(255,255,255,0) 38%,rgba(255,255,255,0) 100%);pointer-events:none}
.l3-nav{height:20px;background:#fff;display:flex;align-items:center;gap:6px;padding:0 8px;border-bottom:1px solid #eceef5}
.l3-nav b{font-size:7.5px;letter-spacing:.3px;color:#1b1d36;white-space:nowrap}.l3-nav b span{color:#1a33ff}
.l3-nav .s{flex:1;height:7px;border-radius:4px;background:#eef0f6}.l3-nav .a{width:22px;height:8px;border-radius:2px;background:#1a33ff}
.l3-body{flex:1;display:flex;gap:6px;padding:7px}
.l3-menu{width:44px;display:flex;flex-direction:column;gap:5px}
.l3-menu i{height:6px;border-radius:3px;background:#dfe2ec}.l3-menu i.on{background:#1a33ff}
.l3-main{flex:1;display:flex;flex-direction:column;gap:6px}
.l3-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.l3-kpi div{height:26px;border-radius:3px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06);position:relative}
.l3-kpi div:before{content:"";position:absolute;left:5px;top:6px;width:45%;height:5px;border-radius:2px;background:#1b1d36;opacity:.8}
.l3-kpi div:after{content:"";position:absolute;left:5px;bottom:6px;width:65%;height:3px;border-radius:2px;background:#cfd3e2}
.l3-cols{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.l3-col{background:#e9ecf5;border-radius:3px;padding:4px;display:flex;flex-direction:column;gap:4px}
.l3-col u{height:4px;width:40%;border-radius:2px;background:#9aa0b8}
.l3-col i{height:17px;border-radius:2px;background:#fff;box-shadow:0 1px 1px rgba(0,0,0,.06);position:relative}
.l3-col i:after{content:"";position:absolute;left:4px;top:5px;width:62%;height:3px;border-radius:2px;background:#d4d8e7}
.l3-col i.b:before{content:"";position:absolute;left:4px;bottom:4px;width:32%;height:3px;border-radius:2px;background:#1a33ff}

.cb-side{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 36px;gap:20px}
.cb-brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:15px;letter-spacing:.2px;color:#1b1d36}
.cb-brand img{width:26px;height:26px;border-radius:6px;object-fit:cover}
.cb-brand .lg{width:24px;height:24px;border-radius:5px;background:#1a33ff;display:flex;align-items:center;justify-content:center}
.cb-brand .lg:after{content:"";width:12px;height:8px;border:2px solid #fff;border-bottom-width:3px;border-radius:2px}
.cb-brand span span{color:#1a33ff}
.cb-h1{font-size:23px;font-weight:600;margin:0;color:#1b1d36}
.cb-card{width:100%;max-width:340px;background:#fff;border:1px solid #f0f1f7;box-shadow:0 10px 40px -18px rgba(40,40,90,.25);padding:24px 22px}
.cb-seg{display:grid;grid-template-columns:1fr 1fr;border:1px solid #1a33ff;border-radius:3px;overflow:hidden;margin-bottom:16px}
.cb-seg>*{border:0;background:#fff;color:#1a33ff;font-family:inherit;font-weight:600;font-size:13px;line-height:1;padding:10px;cursor:pointer;text-align:center;text-decoration:none}
.cb-seg>.on{background:#1a33ff;color:#fff}
.cb-foot{font-size:12.5px;color:#7a7f9a;margin:0;text-align:center}
.cb-foot button{background:none;border:0;padding:0;color:#1a33ff;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer}
.cb-foot button:hover{text-decoration:underline}
@media(max-width:820px){
  .cb-page{width:100%;min-height:100%;margin:0;grid-template-columns:1fr;border-radius:0;box-shadow:none}
  #loginOverlay{display:block;background:#fff}
  .cb-art{min-height:0;height:260px}
  .l3-wrap{transform:scale(.56);padding:110px 0 0 60px}
  .cb-side{padding:26px 18px 40px}
}
"""
# Penyesuaian komponen form bawaan (lg-*) di dalam kartu
LG_CSS = r"""
#loginOverlay .cb-card .lg-title{font-size:17px;font-weight:600;text-align:center;margin:0 0 4px;color:#1b1d36}
#loginOverlay .cb-card .lg-sub{font-size:12px;text-align:center;color:#7a7f9a;margin:0 0 16px}
#loginOverlay .cb-card .lg-field{margin-bottom:12px}
#loginOverlay .cb-card .lg-field label{font-size:11.5px;font-weight:500;color:#7a7f9a;margin-bottom:5px}
#loginOverlay .cb-card .lg-field input{height:44px;border:1px solid #e3e5f0;border-radius:3px;background:#fff;font-size:14px;padding:0 44px 0 12px}
#loginOverlay .cb-card .lg-field input:focus{border-color:#1a33ff;box-shadow:0 0 0 3px rgba(26,51,255,.12)}
#loginOverlay .cb-card .lg-eye{bottom:10px;right:10px}
#loginOverlay .cb-card .lg-eye:hover,#loginOverlay .cb-card .lg-link{color:#1a33ff}
#loginOverlay .cb-card .lg-btn{height:44px;border-radius:3px;background:#1a33ff;box-shadow:none;font-weight:600;font-size:14px}
#loginOverlay .cb-card .lg-btn:hover{background:#1226d6;transform:none}
#loginOverlay .cb-card .lg-check input{accent-color:#1a33ff}
#loginOverlay .cb-card .lg-note{border-radius:3px;background:#eef0ff}
#loginOverlay .cb-card .lg-hr{border-top:1px solid #eceef5}
"""
LOGOUT_CSS = r"""
#logoutDlg{font-family:Inter,'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;background:rgba(27,29,54,.45)}
#logoutDlg .lo-card{border-radius:4px}
#logoutDlg .lo-card:before{height:4px;background:#1a33ff}
#logoutDlg .lo-ico{background:#eef0ff;color:#1a33ff;border-radius:4px}
#logoutDlg h3{font-weight:600;color:#1b1d36}
#logoutDlg h3 span{color:#1a33ff}#logoutDlg h3 span:after{display:none}
#logoutDlg button{border-radius:3px;border:1px solid #1a33ff;font-weight:600}
#logoutDlg .lo-no{color:#1a33ff}#logoutDlg .lo-no:hover{background:#eef0ff}
#logoutDlg .lo-yes{background:#1a33ff}#logoutDlg .lo-yes:hover{background:#1226d6}
"""
def keys():
    rows=[14,14,13,12,9]; out=[]
    for i,n in enumerate(rows):
        out.append('<div class="kr">%s</div>' % ''.join('<i%s></i>' % (' class="w"' if (i==4 and j==4) else '') for j in range(n)))
    return ''.join(out)
def art():
    return ('<section class="cb-art" aria-hidden="true"><div class="l3-wrap"><div class="l3">'
     '<div class="l3-sh"></div>'
     '<div class="l3-base"><div class="l3-side"></div><div class="l3-sideR"></div><div class="l3-top">'
     '<div class="l3-kb">'+keys()+'</div><div class="l3-tp"></div></div>'
     '<div class="l3-lid"><div class="l3-back"></div><div class="l3-edge"></div><div class="l3-face"><div class="l3-scr">'
     '<div class="l3-nav"><b>NISCAYA <span>MAKASSAR</span></b><div class="s"></div><div class="a"></div></div>'
     '<div class="l3-body"><div class="l3-menu"><i class="on"></i><i></i><i></i><i></i><i></i></div><div class="l3-main">'
     '<div class="l3-kpi"><div></div><div></div><div></div></div>'
     '<div class="l3-cols"><div class="l3-col"><u></u><i class="b"></i><i></i><i></i></div>'
     '<div class="l3-col"><u></u><i></i><i class="b"></i></div>'
     '<div class="l3-col"><u></u><i class="b"></i><i class="b"></i><i></i></div></div>'
     '</div></div></div></div></div></div>'
     '</div></div></section>')
