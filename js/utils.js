export function fmt(n){
  return "₹" + Number(n || 0).toFixed(0);
}

export function safe(s){
  return String(s || "").trim();
}

export function escAttr(s){
  return String(s || "").replace(/'/g, "\\'");
}

export function escHtml(s){
  s = String(s == null ? "" : s);
  return s
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

export function spicyText(lvl){
  lvl = Number(lvl || 0);
  if(lvl <= 0) return "";
  let r = "";
  for(let i=0;i<Math.min(3,lvl);i++) r += "🌶️";
  return r;
}

export function vegBadge(v){
  return (v === "NONVEG") ? { t:"🔴 NON-VEG", cls:"nonveg" } : { t:"🟢 VEG", cls:"veg" };
}
