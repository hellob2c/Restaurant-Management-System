// dashboard.js
import { EXEC_URL } from "./js/config.js";

/**
 * APIs
 */
const COMPANY_API = buildUrl({ action: "company" });
const ORDERS_API  = (limit=200) => buildUrl({ action: "orders", limit: String(limit) });

function buildUrl(params){
  const base = EXEC_URL.includes("?") ? EXEC_URL + "&" : EXEC_URL + "?";
  const q = new URLSearchParams(params);
  return base + q.toString();
}

/**
 * DOM
 */
const elBrandTitle = document.getElementById("brandTitle");
const elBrandSub = document.getElementById("brandSub");
const elLogo = document.getElementById("logo");
const elConn = document.getElementById("connChip");

const elFrom = document.getElementById("fromDate");
const elTo = document.getElementById("toDate");
const elStatus = document.getElementById("statusFilter");
const elRefresh = document.getElementById("refreshBtn");

const elKpis = document.getElementById("kpis");
const elInsights = document.getElementById("insights");

const elTopItems = document.getElementById("topItems");
const elTopCustomers = document.getElementById("topCustomers");
const elLatestOrders = document.getElementById("latestOrders");
const elLastSync = document.getElementById("lastSync");

/**
 * Helpers
 */
const fmt = (n) => "₹" + Number(n || 0).toFixed(0);
const safe = (s) => String(s || "").trim();

const STATUS_FLOW = ["NEW","ACCEPTED","PREPARING","READY","DELIVERED","CANCELLED"];
const STATUS_LABEL = {
  NEW:"New", ACCEPTED:"Accepted", PREPARING:"Preparing", READY:"Ready",
  DELIVERED:"Delivered", CANCELLED:"Cancelled"
};

function clampDateISO(d){
  // date input value is yyyy-mm-dd
  return d ? new Date(d + "T00:00:00") : null;
}
function endOfDayISO(d){
  return d ? new Date(d + "T23:59:59.999") : null;
}

function pct(part, total){
  if(!total) return "0%";
  return Math.round((part/total)*100) + "%";
}

/**
 * Minimal charts (no CDN)
 * Draw simple bar chart + donut chart on canvas
 */
function clearCanvas(c){
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
}

function drawBarChart(canvas, labels, values, opts={}){
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.parentElement.clientWidth - 2;
  const h = canvas.height = canvas.height; // keep passed height
  ctx.clearRect(0,0,w,h);

  const pad = 22;
  const max = Math.max(...values, 1);
  const n = values.length;
  const gap = 8;
  const barW = Math.max(10, (w - pad*2 - gap*(n-1)) / n);

  // axis line
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pad, h - pad, w - pad*2, 1);
  ctx.globalAlpha = 1;

  for(let i=0;i<n;i++){
    const v = values[i];
    const bh = Math.max(2, ((h - pad*2) * (v/max)));
    const x = pad + i*(barW+gap);
    const y = h - pad - bh;

    // bar
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#5b8cff";
    ctx.fillRect(x, y, barW, bh);

    // label (every few)
    if(opts.showLabels){
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#eaf0ff";
      ctx.font = "11px system-ui";
      ctx.fillText(labels[i], x, h - 8);
    }
  }
}

function drawDonut(canvas, slices, opts={}){
  // slices: [{label,value}]
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.parentElement.clientWidth - 2;
  const h = canvas.height = canvas.height;

  ctx.clearRect(0,0,w,h);

  const total = slices.reduce((s,x)=>s+x.value,0) || 1;
  const cx = w*0.35;
  const cy = h*0.55;
  const r = Math.min(w,h) * 0.28;

  // palette
  const colors = ["#5b8cff","#8dffb0","#ffcd8d","#ff8df5","#c8c8c8","#ff8d8d","#9bb7ff"];

  let a = -Math.PI/2;
  slices.forEach((s, i)=>{
    const ang = (s.value/total) * Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.9;
    ctx.arc(cx,cy,r,a,a+ang);
    ctx.closePath();
    ctx.fill();
    a += ang;
  });

  // hole
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.fillStyle = "#0b0f17";
  ctx.arc(cx,cy,r*0.62,0,Math.PI*2);
  ctx.fill();

  // center text
  ctx.fillStyle = "#eaf0ff";
  ctx.font = "900 16px system-ui";
  ctx.fillText(opts.centerTitle || "Total", cx - 24, cy - 2);
  ctx.font = "900 18px system-ui";
  ctx.fillText(opts.centerValue || "", cx - 26, cy + 20);

  // legend
  const lx = w*0.62;
  let ly = 18;
  ctx.font = "12px system-ui";
  slices.forEach((s, i)=>{
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(lx, ly, 10, 10);

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#eaf0ff";
    ctx.fillText(`${s.label} (${s.value})`, lx + 16, ly + 10);
    ly += 18;
  });
}

/**
 * Data transforms
 */
function normalizeOrders(raw){
  // your API may or may not return status/updatedAt yet; default NEW
  return (raw || []).map(o => ({
    orderId: safe(o.orderId),
    name: safe(o.name),
    phone: safe(o.phone),
    addressOrTable: safe(o.addressOrTable),
    items: Array.isArray(o.items) ? o.items : [],
    subtotal: Number(o.subtotal || 0),
    gst: Number(o.gst || 0),
    grandTotal: Number(o.grandTotal || 0),
    createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
    updatedAt: o.updatedAt ? new Date(o.updatedAt) : null,
    status: safe(o.status) || "NEW",
  })).filter(o => o.orderId); // ignore blanks
}

function filterOrders(orders){
  const from = clampDateISO(elFrom.value);
  const to = endOfDayISO(elTo.value);
  const status = elStatus.value;

  return orders.filter(o=>{
    if(from && o.createdAt < from) return false;
    if(to && o.createdAt > to) return false;
    if(status !== "ALL" && o.status !== status) return false;
    return true;
  });
}

/**
 * Build analytics
 */
function computeAnalytics(orders){
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s,o)=>s+o.grandTotal,0);
  const totalGST = orders.reduce((s,o)=>s+o.gst,0);
  const avgOrder = totalOrders ? (totalRevenue/totalOrders) : 0;

  const statusCounts = STATUS_FLOW.reduce((m,s)=>(m[s]=0,m),{});
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status]||0)+1; });

  // Top items
  const itemMap = new Map(); // name -> {qty,revenue}
  orders.forEach(o=>{
    (o.items||[]).forEach(it=>{
      const name = safe(it.name);
      if(!name) return;
      const qty = Number(it.qty||0);
      const line = Number(it.lineTotal || ((it.price||0)*(it.qty||0)));
      const cur = itemMap.get(name) || { qty:0, revenue:0 };
      cur.qty += qty;
      cur.revenue += line;
      itemMap.set(name, cur);
    });
  });

  const topItems = Array.from(itemMap.entries())
    .map(([name,v]) => ({ name, qty:v.qty, revenue:v.revenue }))
    .sort((a,b)=> b.revenue - a.revenue)
    .slice(0,10);

  // Categories (from items if category present)
  const catMap = new Map();
  orders.forEach(o=>{
    (o.items||[]).forEach(it=>{
      const cat = safe(it.category) || "Uncategorized";
      const line = Number(it.lineTotal || ((it.price||0)*(it.qty||0)));
      catMap.set(cat, (catMap.get(cat)||0) + line);
    });
  });
  const categories = Array.from(catMap.entries())
    .map(([category,revenue])=>({category,revenue}))
    .sort((a,b)=>b.revenue-a.revenue)
    .slice(0,8);

  // Customers
  const custMap = new Map(); // phone or name -> spend
  orders.forEach(o=>{
    const key = safe(o.phone) || safe(o.name) || "Unknown";
    custMap.set(key, (custMap.get(key)||0) + o.grandTotal);
  });
  const topCustomers = Array.from(custMap.entries())
    .map(([key,spend])=>({key,spend}))
    .sort((a,b)=>b.spend-a.spend)
    .slice(0,10);

  // Trend last 14 days
  const days = [];
  const today = new Date();
  for(let i=13;i>=0;i--){
    const d = new Date(today);
    d.setDate(today.getDate()-i);
    const k = d.toISOString().slice(0,10);
    days.push(k);
  }
  const trend = days.map(k=>{
    const sum = orders
      .filter(o=> o.createdAt.toISOString().slice(0,10) === k)
      .reduce((s,o)=>s+o.grandTotal,0);
    return { day:k.slice(5), sum };
  });

  // Hour distribution
  const hours = Array.from({length:24},(_,i)=>i);
  const byHour = hours.map(h=>{
    const count = orders.filter(o=> o.createdAt.getHours() === h).length;
    return { h, count };
  });

  // Best hour
  const bestHour = byHour.slice().sort((a,b)=>b.count-a.count)[0];

  return {
    totalOrders, totalRevenue, totalGST, avgOrder,
    statusCounts, topItems, categories, topCustomers,
    trend, byHour, bestHour
  };
}

/**
 * UI renderers
 */
function renderKpis(a){
  const kpiData = [
    { label:"Total Revenue", value: fmt(a.totalRevenue), meta:`GST collected: ${fmt(a.totalGST)}` },
    { label:"Total Orders", value: String(a.totalOrders), meta:`Avg order value: ${fmt(a.avgOrder)}` },
    { label:"Open Orders", value: String((a.statusCounts.NEW||0)+(a.statusCounts.ACCEPTED||0)+(a.statusCounts.PREPARING||0)+(a.statusCounts.READY||0)),
      meta:`Delivered: ${a.statusCounts.DELIVERED||0} • Cancelled: ${a.statusCounts.CANCELLED||0}` },
    { label:"Best Hour", value: a.bestHour ? `${String(a.bestHour.h).padStart(2,"0")}:00` : "—",
      meta:`Orders at peak: ${a.bestHour?.count || 0}` },
  ];

  elKpis.innerHTML = kpiData.map(x=>`
    <div class="kpi">
      <div class="kpiLabel">${x.label}</div>
      <div class="kpiValue">${x.value}</div>
      <div class="kpiMeta">${x.meta}</div>
    </div>
  `).join("");
}

function renderInsights(a){
  // pointers you can show management
  const topItem = a.topItems[0];
  const topCat = a.categories[0];
  const open = (a.statusCounts.NEW||0)+(a.statusCounts.ACCEPTED||0)+(a.statusCounts.PREPARING||0)+(a.statusCounts.READY||0);

  const insights = [
    {
      title:"Today’s operational focus",
      text:`You have <b>${open}</b> open orders. Highest stage currently is <b>${bestStatus(a.statusCounts)}</b>.`
    },
    {
      title:"Bestseller",
      text: topItem
        ? `<b>${topItem.name}</b> leads with <b>${topItem.qty}</b> qty, revenue <b>${fmt(topItem.revenue)}</b>.`
        : `No items found yet.`
    },
    {
      title:"Top category",
      text: topCat
        ? `<b>${topCat.category}</b> drives <b>${fmt(topCat.revenue)}</b> revenue (filtered range).`
        : `No category data found.`
    },
  ];

  elInsights.innerHTML = insights.map(i=>`
    <div class="insight">
      <div class="insightTitle">${i.title}</div>
      <div class="insightText">${i.text}</div>
    </div>
  `).join("");
}

function bestStatus(counts){
  const entries = Object.entries(counts || {})
    .filter(([k])=>k!=="CANCELLED")
    .sort((a,b)=>b[1]-a[1]);
  const best = entries[0]?.[0] || "NEW";
  return STATUS_LABEL[best] || best;
}

function renderTables(a, orders){
  elTopItems.innerHTML = a.topItems.length
    ? a.topItems.map((x,i)=>`
        <div class="tRow">
          <div class="tLeft">
            <div class="badge">${i+1}</div>
            <div>
              <div><b>${x.name}</b></div>
              <div class="muted">Qty ${x.qty}</div>
            </div>
          </div>
          <div><b>${fmt(x.revenue)}</b></div>
        </div>
      `).join("")
    : `<div class="muted">No data</div>`;

  elTopCustomers.innerHTML = a.topCustomers.length
    ? a.topCustomers.map((x,i)=>`
        <div class="tRow">
          <div class="tLeft">
            <div class="badge">${i+1}</div>
            <div>
              <div><b>${x.key}</b></div>
              <div class="muted">Spend</div>
            </div>
          </div>
          <div><b>${fmt(x.spend)}</b></div>
        </div>
      `).join("")
    : `<div class="muted">No data</div>`;

  const latest = orders
    .slice()
    .sort((a,b)=> b.createdAt - a.createdAt)
    .slice(0,10);

  elLatestOrders.innerHTML = latest.length
    ? latest.map(o=>`
        <div class="tRow">
          <div class="tLeft">
            <div class="badge">${STATUS_LABEL[o.status] || o.status}</div>
            <div>
              <div><b>${o.orderId}</b> <span class="muted">• ${o.name || "-"}</span></div>
              <div class="muted">${o.createdAt.toLocaleString()} • ${o.phone || "-"} • ${o.addressOrTable || "-"}</div>
            </div>
          </div>
          <div><b>${fmt(o.grandTotal)}</b></div>
        </div>
      `).join("")
    : `<div class="muted">No orders</div>`;
}

function renderCharts(a){
  const trendC = document.getElementById("trendChart");
  const statusC = document.getElementById("statusChart");
  const hourC = document.getElementById("hourChart");
  const catC = document.getElementById("categoryChart");

  // Trend (bar)
  drawBarChart(trendC, a.trend.map(x=>x.day), a.trend.map(x=>x.sum), { showLabels:true });

  // Status (donut)
  const statusSlices = STATUS_FLOW.map(s=>({ label: STATUS_LABEL[s] || s, value: a.statusCounts[s] || 0 }))
    .filter(x=>x.value>0);
  drawDonut(statusC, statusSlices.length ? statusSlices : [{label:"No data",value:1}], {
    centerTitle: "Orders",
    centerValue: String(a.totalOrders)
  });

  // Hour (bar)
  drawBarChart(hourC, a.byHour.map(x=>String(x.h)), a.byHour.map(x=>x.count));

  // Category (donut)
  const catSlices = a.categories.map(c=>({ label:c.category, value: c.revenue }));
  drawDonut(catC, catSlices.length ? catSlices : [{label:"No data",value:1}], {
    centerTitle: "Revenue",
    centerValue: fmt(a.totalRevenue)
  });
}

/**
 * Loaders
 */
async function loadCompany(){
  try{
    const res = await fetch(COMPANY_API);
    const json = await res.json();
    if(!json.ok || !json.company) return;

    const c = json.company;
    const client = safe(c.client);
    const logoUrl = safe(c.imagePath);

    if(client) elBrandTitle.textContent = client + " • Dashboard";
    if(logoUrl){
      elLogo.src = logoUrl;
      elLogo.style.display = "block";
    }
  }catch(e){}
}

async function loadOrders(){
  elConn.textContent = "Loading…";
  elConn.style.opacity = "0.85";

  const res = await fetch(ORDERS_API(200));
  const json = await res.json();
  if(!json.ok) throw new Error(json.error || "Orders load failed");

  const orders = normalizeOrders(json.orders || []);
  const filtered = filterOrders(orders);
  const analytics = computeAnalytics(filtered);

  renderKpis(analytics);
  renderInsights(analytics);
  renderTables(analytics, filtered);
  renderCharts(analytics);

  elBrandSub.textContent = `Showing ${filtered.length} orders • Range filtered`;
  elConn.textContent = "✅ Connected";
  elConn.style.opacity = "1";
  elLastSync.textContent = "Last sync: " + new Date().toLocaleString();
}

/**
 * Defaults: last 7 days
 */
function setDefaultDates(){
  const today = new Date();
  const to = today.toISOString().slice(0,10);

  const fromD = new Date(today);
  fromD.setDate(today.getDate()-6);
  const from = fromD.toISOString().slice(0,10);

  elFrom.value = from;
  elTo.value = to;
}

async function boot(){
  setDefaultDates();
  await loadCompany();

  try{
    await loadOrders();
  }catch(e){
    elConn.textContent = "❌ Error";
    elBrandSub.textContent = "Load failed";
    console.error(e);
    alert("Dashboard load failed: " + e.message);
  }
}

elRefresh.addEventListener("click", ()=> loadOrders().catch(e=>alert(e.message)));
elFrom.addEventListener("change", ()=> loadOrders().catch(()=>{}));
elTo.addEventListener("change", ()=> loadOrders().catch(()=>{}));
elStatus.addEventListener("change", ()=> loadOrders().catch(()=>{}));

boot();
