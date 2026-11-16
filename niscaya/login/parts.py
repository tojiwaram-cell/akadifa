# Potongan bersama gaya login "Contractbook" untuk index.html (patch 0017) dan teknisi.html
CSS = r"""
#loginOverlay,#tLogin{background:#c9c9d6;font-family:Inter,'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif;color:#1b1d36}
.cb-page{width:calc(100% - 48px);max-width:1080px;min-height:min(640px,calc(100% - 48px));margin:24px auto;display:grid;grid-template-columns:1.12fr 1fr;background:#fff;box-shadow:0 30px 80px -20px rgba(30,30,70,.35);border-radius:4px;overflow:hidden}
#loginOverlay{display:flex;align-items:center}
.cb-art{background:#f6f7fd;position:relative;overflow:hidden;min-height:560px}
.cb-fl{position:absolute;background:#fff;box-shadow:0 12px 30px -10px rgba(40,40,90,.22);border-radius:4px;animation:cbBob 6s ease-in-out infinite;z-index:3}
@keyframes cbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.cb-lap{position:absolute;left:50%;top:50%;width:300px;transform:translate(-50%,-46%)}
.cb-lid{background:#2b2d36;border-radius:10px 10px 2px 2px;padding:9px 9px 12px;transform:perspective(700px) rotateX(8deg);transform-origin:bottom}
.cb-scr{background:#fff;height:172px;border-radius:2px;padding:9px;display:flex;flex-direction:column;gap:6px;overflow:hidden}
.cb-st{display:flex;gap:5px;align-items:center}.cb-st b{font-size:8px;letter-spacing:.3px;white-space:nowrap}.cb-st b span{color:#1a33ff}
.cb-pl{height:6px;border-radius:3px;background:#e8eaf6}
.cb-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;flex:1}
.cb-col{background:#f2f4fb;border-radius:3px;padding:4px;display:flex;flex-direction:column;gap:4px}
.cb-col i{font-style:normal;font-size:6px;font-weight:700;color:#7a7f9a}
.cb-cr{background:#fff;border-radius:2px;height:18px;box-shadow:0 1px 2px rgba(0,0,0,.08);position:relative}
.cb-cr:after{content:"";position:absolute;left:4px;top:5px;width:60%;height:3px;border-radius:2px;background:#d7dbee}
.cb-cr.b:before{content:"";position:absolute;left:4px;top:11px;width:30%;height:3px;border-radius:2px;background:#1a33ff}
.cb-base{height:150px;margin:-2px 0 0 -6%;width:112%;background:linear-gradient(#c8cad2,#a7aab4);clip-path:polygon(5% 0,95% 0,100% 100%,0 100%);border-radius:0 0 10px 10px;position:relative}
.cb-keys{position:absolute;left:12%;right:12%;top:12px;height:62px;background:repeating-linear-gradient(90deg,#2f313a 0 14px,transparent 14px 17px);-webkit-mask:repeating-linear-gradient(#000 0 11px,transparent 11px 14px);mask:repeating-linear-gradient(#000 0 11px,transparent 11px 14px)}
.cb-pad{position:absolute;left:36%;right:36%;bottom:16px;height:44px;border-radius:5px;background:#b9bcc5;box-shadow:inset 0 0 0 1px #9da0aa}
.cb-sold{left:13%;top:9%;width:122px;padding:12px 10px;text-align:center;animation-delay:-1s}
.cb-sold .ic{width:26px;height:30px;margin:0 auto 6px;border:2px solid #39c486;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#39c486;font-weight:800;font-size:13px}
.cb-sold b{font-size:11px;display:block}.cb-sold small{font-size:8px;color:#7a7f9a;display:block;margin:3px 0 7px}.cb-sold em{display:block;height:9px;background:#1a33ff;border-radius:2px}
.cb-spec{left:6%;top:42%;display:flex;gap:8px;align-items:center;padding:9px 12px;font-size:10px;font-weight:600;animation-delay:-3s}
.cb-doc{width:14px;height:17px;border:1.5px solid #b8bcd3;border-radius:2px;flex:none}
.cb-qc{right:7%;bottom:15%;width:132px;padding:10px;font-size:8px;animation-delay:-2s}
.cb-qc .t{font-weight:700;font-size:9px;display:flex;gap:6px;align-items:center}
.cb-qc .r{display:flex;justify-content:space-between;color:#7a7f9a;margin-top:4px}.cb-qc .r b{color:#1b1d36}
.cb-clock{position:absolute;left:14%;bottom:9%;width:64px;height:64px;border-radius:50%;border:2px solid #1b1d36;background:conic-gradient(#7ee0b4 0 38%,#fff 38%);animation:cbBob 7s ease-in-out infinite -4s}
.cb-clock:before,.cb-clock:after{content:"";position:absolute;left:50%;top:50%;height:2px;background:#1b1d36;transform-origin:0 50%;border-radius:2px}
.cb-clock:before{width:22px;transform:rotate(-30deg)}.cb-clock:after{width:15px;transform:rotate(160deg)}
.cb-bd{position:absolute;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid #c9cdf5;background:#eef0ff;color:#1a33ff;font-size:15px;animation:cbBob 5s ease-in-out infinite}
.cb-b1{left:9%;top:61%;animation-delay:-2.5s}.cb-b2{right:9%;top:46%;animation-delay:-1.2s}
.cb-rk{position:absolute;left:43%;top:11%;color:#1a33ff;font-size:16px;transform:rotate(-12deg)}
.cb-ring{position:absolute;right:9%;top:8%;width:118px;height:118px;border-radius:50%;background:#fff;border:2px solid #1b1d36;box-shadow:6px 6px 0 -1px #c9cdf5;display:flex;align-items:center;justify-content:center;text-align:center;animation:cbBob 8s ease-in-out infinite -5s}
.cb-ring b{font-size:22px;line-height:1;color:#1a33ff}.cb-ring small{display:block;font-size:9px;color:#7a7f9a;margin-top:4px}
.cb-tag{position:absolute;left:28px;bottom:22px;margin:0;font-size:11px;color:#7a7f9a}
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
  .cb-art{min-height:0;height:240px}
  .cb-lap{transform:translate(-50%,-50%) scale(.6)}
  .cb-ring{width:74px;height:74px;top:7%;right:6%}.cb-ring b{font-size:16px}.cb-ring small{font-size:8px}
  .cb-qc,.cb-spec,.cb-sold,.cb-clock,.cb-tag,.cb-rk{display:none}
  .cb-b1{left:8%;top:40%}.cb-b2{right:8%;top:62%}
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
def art(ring_num, ring_txt):
    return ('<section class="cb-art" aria-hidden="true">'
      '<div class="cb-fl cb-sold"><div class="ic">✓</div><b>Terjual</b><small>ThinkPad T480 · i5 · 8GB</small><em></em></div>'
      '<span class="cb-rk">➶</span>'
      '<div class="cb-ring"><div><b>' + ring_num + '</b><small>' + ring_txt + '</small></div></div>'
      '<div class="cb-fl cb-spec"><span class="cb-doc"></span>Garansi toko 30 hari</div>'
      '<span class="cb-bd cb-b1">👍</span><span class="cb-bd cb-b2">⚙</span>'
      '<div class="cb-lap"><div class="cb-lid"><div class="cb-scr">'
      '<div class="cb-st"><b>NISCAYA <span>MAKASSAR</span></b><div class="cb-pl" style="flex:1"></div><div class="cb-pl" style="width:24px;background:#1a33ff"></div></div>'
      '<div class="cb-cols"><div class="cb-col"><i>READY</i><div class="cb-cr b"></div><div class="cb-cr"></div><div class="cb-cr"></div></div>'
      '<div class="cb-col"><i>BOOKING</i><div class="cb-cr"></div><div class="cb-cr b"></div></div>'
      '<div class="cb-col"><i>SOLD</i><div class="cb-cr b"></div><div class="cb-cr b"></div><div class="cb-cr"></div></div></div>'
      '</div></div><div class="cb-base"><div class="cb-keys"></div><div class="cb-pad"></div></div></div>'
      '<div class="cb-clock"></div>'
      '<div class="cb-fl cb-qc"><div class="t"><span class="cb-doc" style="width:10px;height:12px"></span>QC Teknisi</div><div class="r">Baterai<b>92%</b></div><div class="r">Status<b>Lolos</b></div></div>'
      '<p class="cb-tag">Laptop second berkualitas, tercatat rapi.</p></section>')
