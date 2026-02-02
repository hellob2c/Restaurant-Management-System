import { LAST_ORDER_KEY } from "./config.js";
import { fmt, escHtml } from "./utils.js";

function openOrderModal(){
  renderLastOrder();
  const modal = document.getElementById("orderModal");
  if(modal) modal.style.display = "flex";
}

function closeOrderModal(){
  const modal = document.getElementById("orderModal");
  if(modal) modal.style.display = "none";
}

function renderLastOrder(){
  const sub = document.getElementById("orderModalSub");
  const body = document.getElementById("orderModalBody");
  if(!sub || !body) return;

  body.innerHTML = "";
  sub.textContent = "";

  const raw = localStorage.getItem(LAST_ORDER_KEY);
  if(!raw){
    sub.textContent = "No placed order found on this device yet.";
    body.innerHTML = '<div class="muted">Place an order first, then click “View Order”.</div>';
    return;
  }

  let o = null;
  try { o = JSON.parse(raw); } catch(e){ o = null; }

  if(!o){
    sub.textContent = "No valid order found.";
    body.innerHTML = '<div class="muted">Order data corrupted.</div>';
    return;
  }

  sub.innerHTML = 'Order ID: <span class="mono">' + escHtml(o.orderId || "-") + '</span> • ' + escHtml(o.createdAt || "");

  let rows = "";
  (o.items || []).forEach(it => {
    rows += '<tr>'
      + '<td>' + escHtml(it.name || "") + '</td>'
      + '<td>' + escHtml(it.qty || 0) + '</td>'
      + '<td>' + escHtml(fmt(it.price)) + '</td>'
      + '<td>' + escHtml(fmt(it.lineTotal)) + '</td>'
      + '</tr>';
  });

  body.innerHTML = ''
    + '<div class="summaryRow"><div class="muted">Customer</div><div><b>' + escHtml(o.name || '-') + '</b></div></div>'
    + '<div class="summaryRow"><div class="muted">Phone</div><div>' + escHtml(o.phone || '-') + '</div></div>'
    + '<div class="summaryRow"><div class="muted">Table/Address</div><div>' + escHtml(o.addressOrTable || '-') + '</div></div>'
    + '<table class="summaryTable"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Line Total</th></tr></thead><tbody>'
    + rows
    + '</tbody></table>'
    + '<div style="height:10px"></div>'
    + '<div class="summaryRow"><div>Subtotal</div><div><b>' + escHtml(fmt(o.subtotal)) + '</b></div></div>'
    + '<div class="summaryRow"><div>GST</div><div><b>' + escHtml(fmt(o.gst)) + '</b></div></div>'
    + '<div class="summaryRow" style="border-bottom:none;"><div>Total</div><div><b>' + escHtml(fmt(o.grandTotal)) + '</b></div></div>';
}

function printOrder(){
  const raw = localStorage.getItem(LAST_ORDER_KEY);
  if(!raw){ alert("No order to print."); return; }

  let o = null;
  try { o = JSON.parse(raw); } catch(e){ alert("Order data invalid."); return; }

  const win = window.open("", "_blank");
  if(!win){ alert("Popup blocked. Allow popups for this site to print."); return; }

  win.document.open();
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Order</title>'
    + '<style>'
    + 'body{font-family:Arial,Helvetica,sans-serif;padding:16px;color:#111}'
    + 'h2{margin:0 0 8px}'
    + 'table{width:100%;border-collapse:collapse;margin-top:10px}'
    + 'th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}'
    + '</style>'
    + '</head><body>'
    + '<h2>Order Summary</h2>'
    + '<div><b>Order ID:</b> ' + escHtml(o.orderId || '-') + '</div>'
    + '<div><b>Name:</b> ' + escHtml(o.name || '-') + '</div>'
    + '<div><b>Phone:</b> ' + escHtml(o.phone || '-') + '</div>'
    + '<div><b>Table/Address:</b> ' + escHtml(o.addressOrTable || '-') + '</div>'
    + '<div style="margin-top:8px"><b>Created:</b> ' + escHtml(o.createdAt || '-') + '</div>'
    + '<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>'
  );

  (o.items || []).forEach(it => {
    win.document.write('<tr><td>' + escHtml(it.name || '') + '</td><td>' + escHtml(it.qty || 0) + '</td><td>' + escHtml(fmt(it.price)) + '</td><td>' + escHtml(fmt(it.lineTotal)) + '</td></tr>');
  });

  win.document.write('</tbody></table>'
    + '<div style="margin-top:10px"><b>Subtotal:</b> ' + escHtml(fmt(o.subtotal)) + '</div>'
    + '<div><b>GST:</b> ' + escHtml(fmt(o.gst)) + '</div>'
    + '<div><b>Grand Total:</b> ' + escHtml(fmt(o.grandTotal)) + '</div>'
    + '</body></html>'
  );

  win.document.close();
  win.onload = function(){
    try{ win.focus(); win.print(); } catch(e){}
  };
}

export function initOrderModal(){
  const viewBtn = document.getElementById("viewOrderBtn");
  const closeTop = document.getElementById("closeModalBtnTop");
  const closeBottom = document.getElementById("closeModalBtnBottom");
  const printBtn = document.getElementById("printBtn");
  const modal = document.getElementById("orderModal");

  if(viewBtn) viewBtn.addEventListener("click", openOrderModal);
  if(closeTop) closeTop.addEventListener("click", closeOrderModal);
  if(closeBottom) closeBottom.addEventListener("click", closeOrderModal);
  if(printBtn) printBtn.addEventListener("click", printOrder);

  if(modal){
    modal.addEventListener("click", (e) => {
      if(e.target && e.target.id === "orderModal") closeOrderModal();
    });
  }
}
