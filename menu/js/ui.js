// js/ui.js
(function () {
  const $ = (id) => document.getElementById(id);

  function show(el, yes) {
    el.classList.toggle("hidden", !yes);
  }

  function moneyINR(n) {
    const x = Math.round(Number(n) || 0);
    return "₹" + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function normalizeFoodType(t) {
    const v = String(t || "").trim().toUpperCase();
    if (v.includes("NON")) return "NONVEG";
    if (v.includes("EGG")) return "EGG";
    return "VEG";
  }

  function spicyText(level) {
    const l = Math.max(0, Math.min(3, Number(level) || 0));
    if (l === 0) return { text: "Mild", dots: 0 };
    if (l === 1) return { text: "Medium", dots: 1 };
    if (l === 2) return { text: "Hot", dots: 2 };
    return { text: "Extra Hot", dots: 3 };
  }

  function vegBadge(type) {
    const t = normalizeFoodType(type);
    const label = t === "VEG" ? "Veg" : t === "EGG" ? "Egg" : "Non-Veg";
    const ring =
      t === "VEG"
        ? "ring-emerald-200 text-emerald-700 bg-emerald-50"
        : t === "EGG"
        ? "ring-amber-200 text-amber-700 bg-amber-50"
        : "ring-rose-200 text-rose-700 bg-rose-50";
    const dot = t === "VEG" ? "bg-emerald-600" : t === "EGG" ? "bg-amber-600" : "bg-rose-600";

    return `
      <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${ring}">
        <span class="h-2 w-2 rounded-full ${dot}"></span>${label}
      </span>`;
  }

  function spicyPips(level) {
    const { dots, text } = spicyText(level);
    let html = `<span class="inline-flex items-center gap-1" title="${text}">`;
    for (let i = 0; i < 3; i++) {
      html += `<span class="h-1.5 w-4 rounded-full ${i < dots ? "bg-orange-500" : "bg-slate-200"}"></span>`;
    }
    html += `</span>`;
    return html;
  }

  function setBusinessInfo(infoObj) {
    // These keys should match your Info sheet left column exactly
    $("bizName").textContent = infoObj["Client"] || "Restaurant Menu";
    $("bizPhone").textContent = infoObj["Phone"] || "";
    $("bizEmail").textContent = infoObj["Email"] || "";
    $("bizAddress").textContent = infoObj["Address"] || "";
    const site = infoObj["Website"] || "";
    $("bizWebsite").textContent = site ? site : "";
    $("bizWebsite").href = site ? site : "#";
  }

  function renderCategories({ categories, items, activeCategoryId, onSelect }) {
    const el = $("categories");
    el.innerHTML = "";

    categories.forEach((c) => {
      const count = items.filter((x) => x.CategoryId === c.CategoryId && x.Active).length;
      const active = c.CategoryId === activeCategoryId;

      const btn = document.createElement("button");
      btn.className = active
        ? "flex w-full items-center justify-between rounded-2xl bg-slate-900 px-3 py-2 text-left text-sm font-medium text-white"
        : "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50";

      btn.innerHTML = `
        <span class="truncate">${c.CategoryName}</span>
        <span class="${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"} ml-2 rounded-full px-2 py-0.5 text-xs">${count}</span>
      `;

      btn.addEventListener("click", () => onSelect(c.CategoryId));
      el.appendChild(btn);
    });
  }

  function renderMenuSection({ category, filteredItems }) {
    const content = $("content");
    content.innerHTML = "";

    if (!filteredItems.length) return;

    const section = document.createElement("section");
    section.className = "scroll-mt-28";
    section.setAttribute("data-section", category.CategoryId);

    section.innerHTML = `
      <div class="mb-3 flex items-end justify-between">
        <div>
          <div class="text-xl font-semibold">${category.CategoryName}</div>
          ${category.Description ? `<div class="mt-1 text-sm text-slate-600">${category.Description}</div>` : ""}
        </div>
        <button id="backTop" class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          Back to top
        </button>
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2" id="cards"></div>
    `;

    const cards = section.querySelector("#cards");

    filteredItems.forEach((x) => {
      const unavailableOverlay = x.Available
        ? ""
        : `<div class="absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold text-slate-700">Unavailable</div>`;

      const { text } = spicyText(x.SpicyLevel);

      const card = document.createElement("div");
      card.className = `group rounded-3xl border bg-white p-4 shadow-sm transition ${
        x.Available ? "border-slate-200 hover:shadow-md" : "border-slate-200 opacity-70"
      }`;

      card.innerHTML = `
        <div class="flex gap-4">
          <div class="relative h-24 w-28 flex-none overflow-hidden rounded-2xl bg-slate-100">
            <img src="${x.ImageURL || ""}" alt="${x.ItemName}"
              class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              onerror="this.style.display='none'"
            />
            ${unavailableOverlay}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-base font-semibold">${x.ItemName}</div>
                <div class="mt-1 line-clamp-2 text-sm text-slate-600">${x.Description || ""}</div>
              </div>

              <div class="text-right">
                <div class="text-base font-semibold">${moneyINR(x.Price)}</div>
                <div class="mt-1 text-xs text-slate-500">${x.PrepTimeMin ? `${x.PrepTimeMin} min` : "—"}</div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              ${vegBadge(x.FoodType)}
              <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700" title="${text}">
                ${spicyPips(x.SpicyLevel)}
                <span class="text-slate-600">${text}</span>
              </div>

              <span class="ml-auto rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                Code: ${x.ItemCode}
              </span>
            </div>
          </div>
        </div>
      `;

      cards.appendChild(card);
    });

    content.appendChild(section);

    section.querySelector("#backTop").addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.UI = {
    $,
    show,
    setBusinessInfo,
    renderCategories,
    renderMenuSection,
  };
})();
