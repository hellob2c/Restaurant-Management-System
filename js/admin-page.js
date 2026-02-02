// js/admin-page.js
import { API } from "./config.js";

const ORDERS_API = API.orders;            // GET ...?action=orders
const UPDATE_STATUS_API = API.updateStatus; // POST to EXEC_URL with { action: "updateStatus", ... }

const STATUS_ORDER = ["NEW","ACCEPTED","PREPARING","READY","DELIVERED","CANCELLED"];
const STATUS_LABEL = {
  NEW:"New", ACCEPTED:"Accepted", PREPARING:"Preparing", READY:"Ready",
  DELIVERED:"Delivered", CANCELLED:"Cancelled"
};

// DOM nodes in your HTML
const elSub = document.getElementById("sub");
const elTabs = document.getElementById("tabs");
const elGrid = document.getElementById("grid");
const elErr = document.getElementById("err");

let allOrders = [];
let active = "NEW";
let timer = null;
let isUpdating = false;
let firstLoad = true;

const fmt = n => "₹" + Number(n || 0).toFixed(0);

function normalizeStatus(raw) {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "CANCELED") return "CANCELLED";
  if (s === "IN_PROGRESS") return "PREPARING";
  if (s === "PENDING") return "NEW";
  return s || "NEW";
}

function safeParseItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw == null) return [];
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try { return JSON.parse(t); } catch { return []; }
  }
  return [];
}

function normalizeOrder(o) {
  const orderId = o.orderId ?? o.OrderID ?? o.orderID ?? o.id ?? o.ID ?? "-";
  const status = normalizeStatus(o.status ?? o.Status ?? "NEW");
  const createdAt = o.createdAt ?? o.CreatedAt ?? null;
  const updatedAt = o.updatedAt ?? o.UpdatedAt ?? null;
  const items = safeParseItems(o.items ?? o.Items ?? o.ItemsJSON ?? "[]");

  return {
    orderId: String(orderId),
    status,
    createdAt,
    updatedAt,
    items,
    name: o.name ?? o.Name ?? "-",
    phone: o.phone ?? o.Phone ?? "-",
    addressOrTable: o.addressOrTable ?? o.AddressOrTable ?? "-",
    subtotal: Number(o.subtotal ?? o.Subtotal ?? 0),
    gst: Number(o.gst ?? o.GST ?? 0),
    grandTotal: Number(o.grandTotal ?? o.GrandTotal ?? 0)
  };
}

function pillClass(s){ return normalizeStatus(s).toLowerCase(); }

function renderTabs() {
  const counts = STATUS_ORDER.reduce((m, s) => {
    m[s] = allOrders.filter(o => normalizeStatus(o.status) === s).length;
    return m;
  }, {});
  elTabs.innerHTML = STATUS_ORDER.map(s => {
    const cls = s === active ? "tab active" : "tab";
    return `<div class="${cls}" data-tab="${s}">${STATUS_LABEL[s]} (${counts[s] || 0})</div>`;
  }).join("");

  // attach handlers
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

function nextStatus(s) {
  const st = normalizeStatus(s);
  const idx = STATUS_ORDER.indexOf(st);
  if (idx < 0) return null;
  const next = STATUS_ORDER[idx + 1];
  if (!next || next === "CANCELLED") return null;
  return next;
}

function actionButtonsHtml(o) {
  const s = normalizeStatus(o.status || "NEW");
  if (s === "DELIVERED" || s === "CANCELLED") return `<button class="secondary" disabled>Completed</button>`;

  const next = nextStatus(s);
  let html = "";
  if (next) html += `<button class="btn-action" data-id="${o.orderId}" data-status="${next}">Move → ${STATUS_LABEL[next]}</button>`;
  html += `<button class="btn-action secondary" data-id="${o.orderId}" data-status="ACCEPTED">Accept</button>`;
  html += `<button class="btn-action secondary" data-id="${o.orderId}" data-status="PREPARING">Preparing</button>`;
  html += `<button class="btn-action secondary" data-id="${o.orderId}" data-status="READY">Ready</button>`;
  html += `<button class="btn-action secondary" data-id="${o.orderId}" data-status="DELIVERED">Delivered</button>`;
  html += `<button class="btn-action danger" data-id="${o.orderId}" data-status="CANCELLED">Cancel</button>`;
  return html;
}

function renderGrid() {
  const list = sortOrders(allOrders.filter(o => normalizeStatus(o.status) === active));

  if (!list.length) {
    elGrid.innerHTML = `<div class="muted">No orders in ${STATUS_LABEL[active]}.</div>`;
    return;
  }

  elGrid.innerHTML = list.map(o => {
    const itemsHtml = (o.items || []).map(it => {
      return `<div class="item"><div>${escapeHtml(it.name ?? "-")} <span class="muted">× ${Number(it.qty||0)}</span></div><div><b>${fmt(it.lineTotal ?? 0)}</b></div></div>`;
    }).join("");

    const created = o.createdAt ? new Date(o.createdAt).toLocaleString() : "-";

    return `
      <div class="card" data-id="${escapeHtml(o.orderId)}">
        <div class="cardHead">
          <div>
            <div style="font-weight:950">${escapeHtml(o.orderId)}</div>
            <div class="muted">${created}</div>
          </div>
          <div class="pill ${pillClass(o.status)}">${STATUS_LABEL[normalizeStatus(o.status)] || escapeHtml(o.status)}</div>
        </div>
        <div class="cardBody">
          <div class="row"><div class="k">Customer</div><div class="v">${escapeHtml(o.name)}</div></div>
          <div class="row"><div class="k">Phone</div><div class="v">${escapeHtml(o.phone)}</div></div>
          <div class="row"><div class="k">Table/Address</div><div class="v">${escapeHtml(o.addressOrTable)}</div></div>

          <div class="items">${itemsHtml || `<div class="muted">No items</div>`}</div>

          <div class="totals">
            <div class="row"><div class="k">Subtotal</div><div class="v">${fmt(o.subtotal)}</div></div>
            <div class="row"><div class="k">GST</div><div class="v">${fmt(o.gst)}</div></div>
            <div class="row"><div class="k">Grand Total</div><div class="v">${fmt(o.grandTotal)}</div></div>
          </div>

          <div class="actions">${actionButtonsHtml(o)}</div>
        </div>
      </div>
    `;
  }).join("");

  // attach click handlers for action buttons (delegation)
  elGrid.querySelectorAll(".btn-action").forEach(btn => {
    btn.onclick = () => setStatus(btn.dataset.id, btn.dataset.status);
  });
}

function escapeHtml(s) {
  return String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// setStatus posts JSON to your Apps Script; includes { action:"updateStatus", orderId, status }
async function setStatus(orderId, status) {
  if (isUpdating) return;
  isUpdating = true;

  // optimistic update
  const st = normalizeStatus(status);
  const found = allOrders.find(x => String(x.orderId) === String(orderId));
  if (found) {
    found.status = st;
    found.updatedAt = new Date().toISOString();
    renderTabs();
    renderGrid();
  }

  try {
    const payload = {
      action: "updateStatus",
      orderId: String(orderId || ""),
      status: String(st || "")
    };

    const res = await fetch(UPDATE_STATUS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Status update failed");

    elErr.textContent = "";
  } catch (err) {
    elErr.textContent = "Status update failed: " + (err?.message || String(err));
    // refresh to recover actual state
    await fetchOrders(true);
  } finally {
    isUpdating = false;
  }
}

function sortDescByCreated(list) {
  return list.slice().sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function fetchOrders(force = false) {
  if (!elSub) return;
  elSub.textContent = "Loading orders…";

  try {
    const res = await fetch(ORDERS_API + "&limit=200");
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Orders load failed");

    const raw = Array.isArray(json.orders) ? json.orders : [];
    const orders = raw.map(normalizeOrder);

    // ignore empty after first load to avoid blanking UI
    if (!orders.length && !firstLoad) {
      elSub.textContent = "✅ Connected";
      return;
    }

    allOrders = orders;

    // default tab selection logic
    if (!STATUS_ORDER.includes(active)) active = "NEW";
    if (allOrders.length && allOrders.filter(o => normalizeStatus(o.status) === active).length === 0) {
      const firstNonEmpty = STATUS_ORDER.find(s => allOrders.some(o => normalizeStatus(o.status) === s));
      if (firstNonEmpty) active = firstNonEmpty;
    }

    renderTabs();
    renderGrid();

    elSub.textContent = `Loaded ${allOrders.length} orders • Auto-refresh every 8s`;
    firstLoad = false;
  } catch (err) {
    elSub.textContent = "Load failed";
    elErr.textContent = (err?.message || String(err));
  }
}

async function boot() {
  await fetchOrders(true);
  timer = setInterval(() => fetchOrders(false), 8000);
}

// start
boot();
