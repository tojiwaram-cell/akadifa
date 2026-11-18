# Sejak rilis 0042: hasil edit sudah sesuai 0040 (komisi terpisah dari laba) agar 0024 & 0040 tidak saling membalik tiap deploy.
# Edit tepat (lama -> baru) untuk index.html terpasang. Dipakai build_patch.py
EDITS = [
 ["r.omzet += jual; r.modal += modal; r.biaya += biaya; r.laba += laba;",
  "const _kom = (typeof nmKomisiSale==='function') ? nmKomisiSale(s) : 0; r.omzet += jual; r.modal += modal; r.biaya += biaya; r.laba += laba; r.komisi = (r.komisi||0) + _kom;"],
 ["<div class=\"lbl\">Total Untung Bersih</div><div class=\"val\" style=\"font-size:19px; color:var(--ready)\">${rupiah(totalUntung)}</div>",
  "<div class=\"lbl\">Total Untung Bersih</div><div class=\"val\" style=\"font-size:19px; color:${totalUntung<0?'var(--danger)':'var(--ready)'}\">${rupiah(totalUntung)}</div><div class=\"dim\" style=\"font-size:11px;margin-top:2px\">komisi marketing tidak dipotong</div>"],
 ["<td class=\"mono\" style=\"color:var(--ready-dark)\">${rupiah(x.untung)}</td>",
  "<td class=\"mono\" style=\"color:${Number(x.untung)<0?'var(--danger)':'var(--ready-dark)'}\">${rupiah(x.untung)}</td>"],
 ["Laba = omzet − modal − biaya service",
  "Laba = omzet − modal − biaya service (komisi marketing dicatat terpisah)"],
 ["function priceHtml(s){ return (Number(s.diskon)||0)>0 ?",
  "function priceHtml(s){ if(!(Number(s.hargaJual)>0)) return '<span class=\"no-price\" style=\"color:#8590a2;font-weight:600\">Tanya harga</span>'; return (Number(s.diskon)||0)>0 ?"],
]
