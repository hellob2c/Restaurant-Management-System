import { cart } from "./state.js";
import { GST_RATE, LAST_ORDER_KEY } from "./config.js";
import { fmt, safe, escHtml } from "./utils.js";
import { postOrder } from "./api.js";

export function computeTotals(){
  const items = Array.from(cart.values());
  let subtotal = 0;
  let count = 0;

  for(const x of items){
    subtotal += (Number(x.item.price)||0) * (Number(x.qty)||0);
    count += (Number(x.qty)||0);
  }

  const gst = Math.round(subtotal * GST_RATE);
  const grandTotal = subtotal + gst;
  return { items, subtotal, gst, grandTotal, count };
}

export function renderCart(){
  const cartEl = document.getElementById("cart");
  const t = computeTotals();

  document.getElementById("subtotal").textContent = fmt(t.subtotal);
  document.getElementById("gst").textContent = fmt(t.gst);
  document.getElementById("grand").textContent = fmt(t.grandTotal);
  document.getElementById("count").textContent = t.count + " item" + (t.count===1 ? "" : "s");

  if(t.items.length === 0){
    cartEl.innerHTML = '<div class="muted" style="padding:10px 0;">No items yet.</div>';
    return;
  }

  let html = "";
  for(const {item, qty} of t.items){
    html += ''
      + '<div class="cartItem">'
      +   '<div>'
      +     '<div style="font-weight:950;">' + escHtml(item.name) + '</div>'
      +     '<div class="muted">' + fmt(item.price) + ' × ' + qty + ' = ' + fmt((Number(item.price)||0) * qty) + '</div>'
      +   '</div>'
      +   '<div class="qty">'
      +     '<button class="mini" data-dec="' + escHtml(item.id) + '">−</button>'
      +     '<div style="min-width:18px;text-align:center;font-weight:950;">' + qty + '</div>'
      +     '<button class="mini" data-inc="' + escHtml(item.id) + '">+</button>'
      +   '</div>'
      + '</div>';
  }
  cartEl.innerHTML = html;

  // Wire +/- buttons
  cartEl.querySelectorAll("button[data-inc]").forEach(btn => {
    btn.addEventListener("click", () => window.inc(btn.getAttribute("data-inc")));
  });
  cartEl.querySelectorAll("button[data-dec]").forEach(btn => {
    btn.addEventListener("click", () => window.dec(btn.getAttribute("data-dec")));
  });
}

async function placeOrder(){
  const status = document.getElementById("status");
  status.textContent = "";

  const t = computeTotals();
  const orderItems = t.items.map(x => ({
    id: x.item.id,
    category: x.item.category,
    name: x.item.name,
    price: x.item.price,
    qty: x.qty,
    isVeg: x.item.isVeg,
    spicyLevel: x.item.spicyLevel,
    lineTotal: (Number(x.item.price)||0) * (Number(x.qty)||0)
  }));

  const name = safe(document.getElementById("name").value);
  const phone = safe(document.getElementById("phone").value);
  const addressOrTable = safe(document.getElementById("addr").value);

  if(orderItems.length === 0){ status.innerHTML = '<span class="err">Add at least 1 item.</span>'; return; }
  if(!name){ status.innerHTML = '<span class="err">Enter customer name.</span>'; return; }
  if(!phone){ status.innerHTML = '<span class="err">Enter phone number.</span>'; return; }

  const payload = { name, phone, addressOrTable, items: orderItems, subtotal: t.subtotal, gst: t.gst, grandTotal: t.grandTotal };

  const btn = document.getElementById("place");
  btn.disabled = true; btn.textContent = "Placing…";

  try{
    const json = await postOrder(payload);
    if(json && json.ok){
      const saved = {
        orderId: json.orderId,
        createdAt: new Date().toLocaleString(),
        name, phone, addressOrTable,
        items: orderItems,
        subtotal: t.subtotal,
        gst: t.gst,
        grandTotal: t.grandTotal
      };
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(saved));

      status.innerHTML = '<span class="ok">✅ Order placed! Order ID: ' + escHtml(json.orderId) + '</span>';
      cart.clear();
      renderCart();
    } else {
      status.innerHTML = '<span class="err">❌ Failed: ' + escHtml((json && json.error) ? json.error : "Unknown error") + '</span>';
    }
  }catch(e){
    status.innerHTML = '<span class="err">❌ Network error: ' + escHtml(e.message) + '</span>';
  }finally{
    btn.disabled = false; btn.textContent = "Place Order";
  }
}

export function initCart(){
  document.getElementById("place").addEventListener("click", placeOrder);
  renderCart();
}
