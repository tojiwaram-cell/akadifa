# Edit tepat (lama -> baru) untuk index.html terpasang. Dipakai build_patch.py
EDITS = [
 ["r.omzet += jual; r.modal += modal; r.biaya += biaya; r.laba += laba;",
  "const _kom = (typeof nmKomisiSale==='function') ? nmKomisiSale(s) : 0; r.omzet += jual; r.modal += modal; r.biaya += biaya + _kom; r.laba += laba - _kom; r.komisi = (r.komisi||0) + _kom;"],
 ["const totalUntung = rows.reduce((a,s)=>a+Number(s.untung||0),0);",
  "const totalUntung = rows.reduce((a,s)=>a+Number(s.untung||0)-((typeof nmKomisiSale==='function')?nmKomisiSale(s):0),0);"],
 ["<div class=\"lbl\">Total Untung Bersih</div><div class=\"val\" style=\"font-size:19px; color:var(--ready)\">${rupiah(totalUntung)}</div>",
  "<div class=\"lbl\">Total Untung Bersih</div><div class=\"val\" style=\"font-size:19px; color:${totalUntung<0?'var(--danger)':'var(--ready)'}\">${rupiah(totalUntung)}</div><div class=\"dim\" style=\"font-size:11px;margin-top:2px\">setelah komisi marketing</div>"],
 ["<td class=\"mono\" style=\"color:var(--ready-dark)\">${rupiah(x.untung)}</td>",
  "<td class=\"mono\" style=\"color:${Number(x.untung)<0?'var(--danger)':'var(--ready-dark)'}\">${rupiah(x.untung)}</td>"],
 ["<th style=\"text-align:right\">Modal+Biaya</th>",
  "<th style=\"text-align:right\">Modal+Biaya+Komisi</th>"],
 ["Laba = omzet − modal − biaya service",
  "Laba = omzet − modal − biaya service − komisi marketing"],
 ["function priceHtml(s){ return (Number(s.diskon)||0)>0 ?",
  "function priceHtml(s){ if(!(Number(s.hargaJual)>0)) return '<span class=\"no-price\" style=\"color:#8590a2;font-weight:600\">Tanya harga</span>'; return (Number(s.diskon)||0)>0 ?"],
]
