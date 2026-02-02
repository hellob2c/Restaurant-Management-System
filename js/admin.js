// js/admin.js
import { EXEC_URL } from "./config.js";

/*
  Admin page:
  - GET: EXEC_URL?action=orders
  - POST: EXEC_URL  with JSON { action:"updateStatus", orderId, status }
*/

const ORDERS_API = `${EXEC_URL}?action=orders`;
const UPDATE_API = EXEC_URL;

const STATUS_ORDER = ["NEW","ACCEPTED","PREPARING","READY","DELIVERED","CANCELLED"];
const STATUS_LABEL = {
  NEW:"New", ACCEPTED:"Accepted", PREPARING:"Preparing", READY:"Ready",
  DELIVERED:"Delivered", CANCELLED:"Cancelled"
};

const elSub = document.getElementById("sub");
const elTabs = document.getElementById("tabs");
const elGrid = document.getElementById("grid");
const elErr = document.getElementById("err");

let allOrders = [];
let active = "NEW";
let autoTimer = null;
let isUpdating = false;
let firstLoad = true;

const fmt = n => "₹" + Number(n || 0).toFixed(0);

function normalizeStatus(raw) {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return "NEW";
  if (s === "CANCELED") return "CANCELLED";
  if (s === "IN_PROGRESS") return "PREPARING";
  if (s === "PENDING") return "NEW";
  return s;
}

function safeParseItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function normalizeOrder(o) {
  const orderId = o.orderId ?? o.OrderID ?? o.orderID ?? o.ID ?? o.id ?? "-";
  const status = normalizeStatus(o.status ?? o.Status ?? "NEW");
  const createdAt = o.createdAt ?? o.CreatedAt ?? null;
  const updatedAt = o.updatedAt ?? o.UpdatedAt ?? o.updated ?? null;
  const items = safeParseItems(o.items ?? o.Items ?? o.ItemsJSON ?? "[]");

  return {
    orderId: String(orderId),
    status,
    createdAt,
    updatedAt,
    items: items.map(it => ({
      name: it.name ?? it.ItemName ?? it.Name ?? "",
      qty: Number(it.qty ?? it.quantity ?? it.Qty ?? 0),
      price: Number(it.price ?? it.Price ?? 0),
      lineTotal: Number(it.lineTotal ?? it.LineTotal ?? (Number(it.qty||0) * Number(it.price||0)))
    })),
    name: o.name ?? o.Name ?? "-",
    phone: o.phone ?? o.Phone ?? "-",
    addressOrTable: o.addressOrTable ?? o.AddressOrTable ?? o.table ?? "-",
    subtotal: Number(o.subtotal ?? o.Subtotal ?? 0),
    gst: Number(o.gst ?? o.GST ?? 0),
    grandTotal: Number(o.grandTotal ?? o.GrandTotal ?? 0)
  };
}

function pillClass(s) {
  return normalizeStatus(s).toLowerCase();
}

function renderTabs() {
  const counts = STATUS_ORDER.reduce((m, st) => {
    m[st] = allOrders.filter(o => normalizeStatus(o.status) === st).length;
    return m;
  }, {});
  elTabs.innerHTML = STATUS_ORDER.map(s => `
    <div class="tab ${s === active ? "active" : ""}" data-tab="${s}">${STATUS_LABEL[s]} (${counts[s]||0})</div>
  `).join("");

  elTabs.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => {
      active = btn.dataset.tab;
      renderTabs();
      renderGrid();
    };
  });
}

function sortOrders(list) {
  return list.slice().sort((a,b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function progressPercent(status) {
  const s = normalizeStatus(status);
  if (s === "CANCELLED") return 0;
  if (s === "DELIVERED") return 100;
  const idx = STATUS_ORDER.indexOf(s);
  if (idx < 0) return 0;
  const denom = STATUS_ORDER.length - 2; // exclude CANCELLED as terminal
  return Math.round((Math.min(idx, denom) / denom) * 100);
}

function nextStatus(status) {
  const s = normalizeStatus(status);
  if (s === "CANCELLED" || s === "DELIVERED") return null;
  const i = STATUS_ORDER.indexOf(s);
  if (i < 0) return "ACCEPTED";
  const n = STATUS_ORDER[i+1];
  if (!n || n === "CANCELLED") return null;
  return n;
}

function renderGrid() {
  const list = sortOrders(allOrders).filter(o => normalizeStatus(o.status) === active);

  if (!list.length) {
    elGrid.innerHTML = `<div class="muted">No orders in ${STATUS_LABEL[active]}.</div>`;
    return;
  }

  elGrid.innerHTML = list.map(o => {
    const itemsHtml = (o.items || []).map(it => `
      <div class="item">
        <div>${escapeHtml(it.name)} <span class="mutedSmall">× ${it.qty}</span></div>
        <div><b>${fmt(it.lineTotal)}</b></div>
      </div>
    `).join("");

    const createdLabel = o.createdAt ? new Date(o.createdAt).toLocaleString() : "-";
    const pct = progressPercent(o.status);
    const next = nextStatus(o.status);

    return `
      <div class="card" data-id="${escapeHtml(o.orderId)}">
        <div class="cardHead">
          <div>
            <div style="font-weight:800">${escapeHtml(o.orderId)}</div>
            <div class="muted">${createdLabel}</div>
          </div>
          <div class="pill ${pillClass(o.status)}">${STATUS_LABEL[normalizeStatus(o.status)] || o.status}</div>
        </div>
        <div class="cardBody">
          <div class="row"><div class="k">Customer</div><div class="v">${escapeHtml(o.name)}</div></div>
          <div class="row"><div class="k">Phone</div><div class="v">${escapeHtml(o.phone)}</div></div>
          <div class="row"><div class="k">Table/Address</div><div class="v">${escapeHtml(o.addressOrTable)}</div></div>

          <div class="items">
            ${itemsHtml || `<div class="muted">No items</div>`}
          </div>

          <div class="totals">
            <div class="row"><div class="k">Subtotal</div><div class="v">${fmt(o.subtotal)}</div></div>
            <div class="row"><div class="k">GST</div><div class="v">${fmt(o.gst)}</div></div>
            <div class="row"><div class="k">Grand Total</div><div class="v">${fmt(o.grandTotal)}</div></div>
          </div>

          <div class="progress" style="margin-top:6px"><i style="width:${pct}%;"></i></div>

          <div class="actions">
            ${ (o.status === "DELIVERED" || o.status === "CANCELLED")
               ? `<button class="secondary" disabled>Completed</button>`
               : `
                 ${ next ? `<button class="secondary" data-id="${escapeHtml(o.orderId)}" data-status="${next}">Move → ${STATUS_LABEL[next]}</button>` : "" }
                 <button class="secondary" data-id="${escapeHtml(o.orderId)}" data-status="ACCEPTED">Accept</button>
                 <button class="secondary" data-id="${escapeHtml(o.orderId)}" data-status="PREPARING">Preparing</button>
                 <button class="secondary" data-id="${escapeHtml(o.orderId)}" data-status="READY">Ready</button>
                 <button class="secondary" data-id="${escapeHtml(o.orderId)}" data-status="DELIVERED">Delivered</button>
                 <button class="danger" data-id="${escapeHtml(o.orderId)}" data-status="CANCELLED">Cancel</button>
               `}
          </div>
        </div>
      </div>
    `;
  }).join("");

  // attach handlers
  elGrid.querySelectorAll("button[data-id]").forEach(btn => {
    btn.onclick = () => handleSetStatus(btn.dataset.id, btn.dataset.status);
  });
}

function escapeHtml(s) {
  return String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

// set status via POST JSON { action:"updateStatus", orderId, status }
async function handleSetStatus(orderId, status) {
  if (isUpdating) return;
  isUpdating = true;

  // optimistic
  const st = normalizeStatus(status);
  const found = allOrders.find(x => String(x.orderId) === String(orderId));
  if (found) {
    found.status = st;
    found.updatedAt = new Date().toISOString();
    renderTabs();
    renderGrid();
  }

  try {
    const payload = { action: "updateStatus", orderId: String(orderId), status: String(st) };
    const res = await fetch(UPDATE_API, {
      method: "POST",
      headers: { "Content-Type":"application/json;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "update failed");
    elErr.textContent = "";
  } catch (err) {
    elErr.textContent = "Status update failed: " + (err?.message || String(err));
    // refresh truth
    await fetchOrders(true);
  } finally {
    isUpdating = false;
  }
}

async function fetchOrders(force = false) {
  elSub.textContent = "Loading orders…";
  try {
    const res = await fetch(ORDERS_API + "&limit=200");
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load orders");

    const raw = Array.isArray(json.orders) ? json.orders : [];
    // normalize
    allOrders = raw.map(normalizeOrder);

    if (!allOrders.length && !firstLoad) {
      elSub.textContent = "No orders";
      return;
    }

    // default active tab selection
    if (!STATUS_ORDER.includes(active)) active = "NEW";
    if (allOrders.length && allOrders.filter(o => normalizeStatus(o.status) === active).length === 0) {
      const firstNon = STATUS_ORDER.find(s => allOrders.some(o => normalizeStatus(o.status) === s));
      if (firstNon) active = firstNon;
    }

    renderTabs();
    renderGrid();
    elSub.textContent = `Loaded ${allOrders.length} orders • Auto-refresh every 8s`;
    firstLoad = false;
    elErr.textContent = "";
  } catch (err) {
    elSub.textContent = "Load failed";
    elErr.textContent = (err?.message || String(err));
  }
}

function renderTabs() {
  // wrapper function to avoid duplication above
  const counts = STATUS_ORDER.reduce((m, st) => {
    m[st] = allOrders.filter(o => normalizeStatus(o.status) === st).length;
    return m;
  }, {});
  elTabs.innerHTML = STATUS_ORDER.map(s => `
    <div class="tab ${s===active?'active':''}" data-tab="${s}">${STATUS_LABEL[s]} (${counts[s]||0})</div>
  `).join("");
  elTabs.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => {
      active = btn.dataset.tab;
      renderTabs();
      renderGrid();
    };
  });
}

// boot
(async function boot(){
  await fetchOrders(true);
  autoTimer = setInterval(() => fetchOrders(false), 8000);
})();
