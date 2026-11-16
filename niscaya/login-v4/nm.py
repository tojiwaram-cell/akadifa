# Login v4 (rilis 0021): gaya ungu "Business Startup" (referensi Magnific/Freepik 3966284) dengan laptop 3D bergoyang.
# Dipakai index.html (patch 0021, di atas 0017) dan teknisi.html (blok /*NM-LOGIN v4*/).
# Aturan: tanpa backtick, tanpa "${", tanpa backslash (CSS disisipkan ke template literal JS).
import os, importlib.util
_spec = importlib.util.spec_from_file_location("cb_parts", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "login", "parts.py"))
cb = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(cb)

ICON_USER = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237a3fae'%3E%3Ccircle cx='12' cy='8' r='4.2'/%3E%3Cpath d='M4 20.5c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5z'/%3E%3C/svg%3E\")"
ICON_LOCK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237a3fae'%3E%3Cpath d='M7 10V7.5a5 5 0 0 1 10 0V10h.5A1.5 1.5 0 0 1 19 11.5v8A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10zm2.2 0h5.6V7.5a2.8 2.8 0 0 0-5.6 0z'/%3E%3C/svg%3E\")"
ICON_MAIL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237a3fae'%3E%3Cpath d='M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zm2 .9v.3l7 4.6 7-4.6v-.3z'/%3E%3C/svg%3E\")"

O = ":is(#loginOverlay,#tLogin)"
CSS = r"""
/*NM-LOGIN v4*/
:is(#loginOverlay,#tLogin){background:radial-gradient(1200px 700px at 85% 10%,#a777d6 0%,rgba(167,119,214,0) 60%),linear-gradient(135deg,#2e1250 0%,#4a1f78 45%,#6a2f9a 100%);color:#2d1748;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-family:Poppins,'Plus Jakarta Sans',Inter,'Segoe UI',system-ui,-apple-system,sans-serif}
:is(#loginOverlay,#tLogin):before{content:"";position:fixed;inset:0;pointer-events:none;background-image:radial-gradient(1.6px 1.6px at 6% 12%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 18% 74%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 31% 28%,rgba(255,255,255,.9) 50%,transparent 51%),radial-gradient(1.3px 1.3px at 47% 91%,#fff 50%,transparent 51%),radial-gradient(1.8px 1.8px at 63% 8%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 77% 63%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 92% 37%,#fff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 97% 86%,#fff 50%,transparent 51%);opacity:.75;animation:nmTw 5s ease-in-out infinite}
@keyframes nmTw{0%,100%{opacity:.75}50%{opacity:.35}}
:is(#loginOverlay,#tLogin) .cb-page{position:relative;width:min(1640px,calc(100% - 64px));max-width:none;min-height:min(920px,calc(100vh - 64px));margin:32px auto;grid-template-columns:1.25fr 1fr;border-radius:18px;background:linear-gradient(140deg,#5b2589 0%,#7a3aae 52%,#9a5cc9 100%);box-shadow:0 50px 120px -30px rgba(10,0,30,.75),inset 0 0 0 1px rgba(255,255,255,.08)}
:is(#loginOverlay,#tLogin) .cb-art{background:none;min-height:620px;overflow:visible;z-index:1}
.cb-art:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(2px 2px at 9% 18%,#fff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 22% 62%,#fff 50%,transparent 51%),radial-gradient(2.4px 2.4px at 38% 12%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 56% 84%,#fff 50%,transparent 51%),radial-gradient(1.8px 1.8px at 71% 22%,#fff 50%,transparent 51%),radial-gradient(1.3px 1.3px at 12% 88%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 84% 70%,#fff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 48% 40%,rgba(255,255,255,.8) 50%,transparent 51%);animation:nmTw 4s ease-in-out infinite reverse}
.nm-orb{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.28),rgba(255,255,255,.05) 70%);animation:nmOrb 9s ease-in-out infinite}
.nm-orb.o1{width:150px;height:150px;left:-40px;top:-30px;background:radial-gradient(circle at 40% 40%,rgba(214,90,200,.75),rgba(150,50,160,.15) 72%)}
.nm-orb.o2{width:90px;height:90px;left:12%;bottom:12%;animation-delay:-3s}
.nm-orb.o3{width:46px;height:46px;left:52%;top:16%;animation-delay:-6s}
@keyframes nmOrb{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
.nm-hero{position:absolute;left:8%;top:7.5%;color:#fff;z-index:3}
.nm-hero h2{margin:0;font-weight:600;font-size:clamp(28px,2.6vw,52px);letter-spacing:.3px;line-height:1.1;text-shadow:0 6px 24px rgba(30,0,60,.35)}
.nm-hero p{margin:8px 0 0 2px;font-size:clamp(13px,1vw,19px);opacity:.88;letter-spacing:.4px}
.nm-trail{position:absolute;inset:0;pointer-events:none;z-index:1}
.nm-trail i{position:absolute;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.4),0 10px 30px -10px rgba(60,10,100,.5);animation:nmBub 4.5s ease-in-out infinite}
.nm-trail i:nth-child(1){width:14px;height:14px;left:47%;top:70%;opacity:.55;animation-delay:-.2s}
.nm-trail i:nth-child(2){width:20px;height:20px;left:53%;top:73%;opacity:.65;animation-delay:-.6s}
.nm-trail i:nth-child(3){width:28px;height:28px;left:59%;top:70%;opacity:.75;animation-delay:-1s}
.nm-trail i:nth-child(4){width:38px;height:38px;left:66%;top:74%;opacity:.85;animation-delay:-1.4s}
.nm-trail i:nth-child(5){width:52px;height:52px;left:73%;top:69%;opacity:.92;animation-delay:-1.8s}
.nm-trail i:nth-child(6){width:70px;height:70px;left:80%;top:73%;animation-delay:-2.2s}
.nm-trail i:nth-child(7){width:92px;height:92px;left:87%;top:64%;animation-delay:-2.6s}
.nm-trail i:nth-child(8){width:120px;height:120px;left:92%;top:76%;animation-delay:-3s}
.nm-trail i:nth-child(9){width:24px;height:24px;left:63%;top:62%;opacity:.5;animation-delay:-3.4s}
.nm-trail i:nth-child(10){width:44px;height:44px;left:84%;top:56%;opacity:.8;animation-delay:-3.8s}
@keyframes nmBub{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(4px,-8px) scale(1.06)}}
:is(#loginOverlay,#tLogin) .l3-wrap{z-index:2;padding:250px 40px 0 0;perspective:1800px;transform:scale(1.05);transform-origin:45% 55%}
:is(#loginOverlay,#tLogin) .l3{animation:nmWob 6.5s ease-in-out infinite;will-change:transform}
@keyframes nmWob{
0%,100%{transform:rotateX(57deg) rotateY(0deg) rotateZ(-32deg) translateZ(-26px)}
20%{transform:rotateX(63deg) rotateY(7deg) rotateZ(-25deg) translateZ(-6px)}
40%{transform:rotateX(55deg) rotateY(-3deg) rotateZ(-38deg) translateZ(-20px)}
60%{transform:rotateX(61deg) rotateY(-8deg) rotateZ(-29deg) translateZ(4px)}
80%{transform:rotateX(52deg) rotateY(4deg) rotateZ(-35deg) translateZ(-14px)}}
:is(#loginOverlay,#tLogin) .l3-lid{animation:nmLid 6.5s ease-in-out infinite}
@keyframes nmLid{0%,100%{transform:rotateX(-102deg)}35%{transform:rotateX(-96deg)}70%{transform:rotateX(-108deg)}}
:is(#loginOverlay,#tLogin) .l3-sh{background:radial-gradient(closest-side,rgba(20,0,45,.7),rgba(20,0,45,0));animation:nmSh 6.5s ease-in-out infinite}
@keyframes nmSh{0%,100%{opacity:.9}20%,60%{opacity:.55}}
:is(#loginOverlay,#tLogin) .l3-scr:after{animation:nmGlare 6.5s ease-in-out infinite}
@keyframes nmGlare{0%,100%{opacity:1;transform:translateX(0)}50%{opacity:.55;transform:translateX(18%)}}
:is(#loginOverlay,#tLogin) .l3-nav b span,:is(#loginOverlay,#tLogin) .l3-menu i.on{color:#7a3fae}
:is(#loginOverlay,#tLogin) .l3-nav .a,:is(#loginOverlay,#tLogin) .l3-menu i.on,:is(#loginOverlay,#tLogin) .l3-col i.b:before{background:#7a3fae}
:is(#loginOverlay,#tLogin) .cb-side{position:relative;background:#fff;padding:60px clamp(36px,4vw,90px);gap:18px;z-index:2}
:is(#loginOverlay,#tLogin) .cb-side:before{content:"";position:absolute;left:-60px;top:0;bottom:0;width:122px;pointer-events:none;background:radial-gradient(circle at 64px 62px,#fff 50px,transparent 51px) 0 0/122px 150px repeat-y,radial-gradient(circle at 90px 24px,#fff 38px,transparent 39px) 0 40px/122px 110px repeat-y,radial-gradient(circle at 44px 34px,#fff 30px,transparent 31px) 0 70px/122px 190px repeat-y,linear-gradient(#fff,#fff) 92px 0/30px 100% no-repeat}
:is(#loginOverlay,#tLogin) .cb-brand{font-size:15px;color:#2d1748}
:is(#loginOverlay,#tLogin) .cb-brand .lg{background:#7a3fae}
:is(#loginOverlay,#tLogin) .cb-brand span span{color:#7a3fae}
:is(#loginOverlay,#tLogin) .cb-h1{font-size:clamp(20px,1.5vw,28px);font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#6a2c91}
:is(#loginOverlay,#tLogin) .cb-card{max-width:clamp(330px,24vw,440px);border:0;box-shadow:none;padding:4px 0 0;background:transparent}
:is(#loginOverlay,#tLogin) .cb-seg{border:1.5px solid #7a3fae;border-radius:999px;margin-bottom:22px}
:is(#loginOverlay,#tLogin) .cb-seg>*{color:#7a3fae;font-weight:600;padding:11px}
:is(#loginOverlay,#tLogin) .cb-seg>.on{background:#7a3fae;color:#fff}
:is(#loginOverlay,#tLogin) .cb-seg>:not(.on):hover{background:#f4ecfb}
:is(#loginOverlay,#tLogin) .cb-foot{color:#9a86ad}
:is(#loginOverlay,#tLogin) .cb-foot button{color:#7a3fae}
#loginOverlay .cb-card .lg-title,#tLogin .cb-ttl{font-size:16px;font-weight:600;color:#6a2c91;text-align:center;margin:0 0 4px}
#loginOverlay .cb-card .lg-sub,#tLogin .cb-sub{font-size:12.5px;color:#9a86ad;text-align:center;margin:0 0 20px}
#loginOverlay .cb-card .lg-field{margin-bottom:14px}
#loginOverlay .cb-card .lg-field label,#tLogin .cb-card label{font-size:12px;font-weight:600;color:#7a3fae;margin:0 0 6px 14px}
#loginOverlay .cb-card .lg-field input,#tLogin .cb-card input{height:48px;border:0;border-radius:999px;background:#e3d2f2;color:#2d1748;font-size:14.5px;padding:0 48px 0 20px;box-shadow:inset 0 1px 2px rgba(80,30,120,.12);transition:box-shadow .15s,background .15s}
#loginOverlay .cb-card .lg-field input::placeholder,#tLogin .cb-card input::placeholder{color:#8e6aae}
#loginOverlay .cb-card .lg-field input:focus,#tLogin .cb-card input:focus{outline:none;border:0;background:#ecdff7;box-shadow:0 0 0 3px rgba(122,63,174,.28)}
#loginOverlay .cb-card #lgUser,#tLogin .cb-card #lu{padding-left:48px;background-image:__USER__;background-repeat:no-repeat;background-position:18px 50%;background-size:18px}
#loginOverlay .cb-card #lgPass,#tLogin .cb-card #lp{padding-left:48px;background-image:__LOCK__;background-repeat:no-repeat;background-position:18px 50%;background-size:18px}
#loginOverlay .cb-card .lg-eye{bottom:12px;right:16px;color:#8e6aae}
#loginOverlay .cb-card .lg-eye:hover,#loginOverlay .cb-card .lg-link{color:#7a3fae}
#loginOverlay .cb-card .lg-btn,#tLogin .cb-go{height:48px;border-radius:999px;background:linear-gradient(90deg,#6a2c91,#8f4fc2);color:#fff;font-weight:600;font-size:14px;letter-spacing:1.6px;text-transform:uppercase;box-shadow:0 14px 26px -14px rgba(106,44,145,.9);transition:transform .15s,filter .15s}
#loginOverlay .cb-card .lg-btn:hover,#tLogin .cb-go:hover{background:linear-gradient(90deg,#6a2c91,#8f4fc2);filter:brightness(1.08);transform:translateY(-1px)}
#loginOverlay .cb-card .lg-check{color:#7d6893}
#loginOverlay .cb-card .lg-check input{accent-color:#7a3fae}
#loginOverlay .cb-card .lg-note{border-radius:14px;background:#f4ecfb;color:#4d2d6b}
#loginOverlay .cb-card .lg-hr{border-top:1px dashed #e6d9f2}
#tLogin .cb-card .err{text-align:center}
@media(min-width:1500px){:is(#loginOverlay,#tLogin) .l3-wrap{transform:scale(1.3)}}
@media(min-width:1800px){:is(#loginOverlay,#tLogin) .l3-wrap{transform:scale(1.48)}#loginOverlay .cb-card .lg-field input,#tLogin .cb-card input,#loginOverlay .cb-card .lg-btn,#tLogin .cb-go{height:54px;font-size:15.5px}}
@media(min-width:2400px){:is(#loginOverlay,#tLogin) .l3-wrap{transform:scale(1.8)}}
@media(max-width:1100px){:is(#loginOverlay,#tLogin) .l3-wrap{transform:scale(.85)}}
@media(max-width:820px){
  :is(#loginOverlay,#tLogin){background:linear-gradient(160deg,#3a1763,#6a2f9a)}
  :is(#loginOverlay,#tLogin) .cb-page{width:100%;min-height:100%;margin:0;grid-template-columns:1fr;border-radius:0;box-shadow:none}
  :is(#loginOverlay,#tLogin) .cb-art{min-height:0;height:360px;overflow:hidden}
  :is(#loginOverlay,#tLogin) .l3-wrap{transform:scale(.58);padding:300px 30px 0 0}
  .nm-hero{left:22px;top:22px}
  .nm-trail i:nth-child(n+6){display:none}
  :is(#loginOverlay,#tLogin) .cb-side{padding:34px 20px 44px;border-radius:26px 26px 0 0}
  :is(#loginOverlay,#tLogin) .cb-side:before{left:0;right:0;top:-40px;bottom:auto;width:auto;height:80px;background:radial-gradient(circle at 50px 46px,#fff 34px,transparent 35px) 0 0/96px 80px repeat-x,radial-gradient(circle at 20px 58px,#fff 26px,transparent 27px) 0 0/96px 80px repeat-x}
  #loginOverlay{display:block}
}
@media(prefers-reduced-motion:reduce){:is(#loginOverlay,#tLogin) *,:is(#loginOverlay,#tLogin):before{animation:none!important}}
/*NM-END*/
""".replace("__USER__", ICON_USER).replace("__LOCK__", ICON_LOCK)

LOGOUT_CSS = r"""
/*NM-LOGOUT v4*/
#logoutDlg{background:rgba(46,18,80,.6)}
#logoutDlg .lo-card{border-radius:16px}
#logoutDlg .lo-card:before{height:5px;background:linear-gradient(90deg,#6a2c91,#9a5cc9)}
#logoutDlg .lo-ico{background:#f4ecfb;color:#7a3fae;border-radius:50%}
#logoutDlg h3 span{color:#7a3fae}
#logoutDlg button{border-radius:999px;border:1.5px solid #7a3fae}
#logoutDlg .lo-no{color:#7a3fae}#logoutDlg .lo-no:hover{background:#f4ecfb}
#logoutDlg .lo-yes{background:#7a3fae;border-color:#7a3fae}#logoutDlg .lo-yes:hover{background:#6a2c91}
/*NM-LOGOUT-END*/
"""

def art():
    a = cb.art()
    head = '<section class="cb-art" aria-hidden="true">'
    assert a.startswith(head)
    extra = ('<div class="nm-orb o1"></div><div class="nm-orb o2"></div><div class="nm-orb o3"></div>'
             '<div class="nm-hero"><h2>Niscaya Makassar</h2><p>Selamat datang di sistem toko laptop second</p></div>'
             '<div class="nm-trail">' + '<i></i>' * 10 + '</div>')
    return head + extra + a[len(head):]

for s in (CSS, LOGOUT_CSS, art()):
    assert "`" not in s and "${" not in s and "\\" not in s, "karakter terlarang"
