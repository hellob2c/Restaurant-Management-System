// js/app.js
(function () {
  // state
  let categories = [];
  let items = [];

  let activeCategoryId = "";
  let onlyAvailable = true;
  let foodFilter = "ALL";
  let searchTerm = "";

  function setError(msg) {
    UI.$("errorText").textContent = msg;
    UI.show(UI.$("errorBox"), true);
  }

  function applyFilters() {
    const term = searchTerm.trim().toLowerCase();

    return items.filter((x) => {
      if (activeCategoryId && x.CategoryId !== activeCategoryId) return false;
      if (onlyAvailable && !x.Available) return false;

      const ft = String(x.FoodType || "").toUpperCase().includes("NON")
        ? "NONVEG"
        : String(x.FoodType || "").toUpperCase().includes("EGG")
        ? "EGG"
        : "VEG";

      if (foodFilter !== "ALL" && ft !== foodFilter) return false;

      if (!term) return true;
      const hay = `${x.ItemName} ${x.Description} ${x.Category}`.toLowerCase();
      return hay.includes(term);
    });
  }

  function renderAll() {
    const filtered = applyFilters();

    UI.show(UI.$("emptyState"), filtered.length === 0);
    UI.show(UI.$("content"), filtered.length > 0);

    const category = categories.find((c) => c.CategoryId === activeCategoryId) || categories[0];
    if (!category) return;

    UI.renderMenuSection({ category, filteredItems: filtered });
  }

  function renderSidebar() {
    UI.renderCategories({
      categories,
      items,
      activeCategoryId,
      onSelect: (id) => {
        activeCategoryId = id;
        renderSidebar();
        renderAll();
      },
    });
  }

  async function boot() {
    try {
      UI.show(UI.$("errorBox"), false);
      UI.show(UI.$("loading"), true);
      UI.show(UI.$("content"), false);
      UI.show(UI.$("emptyState"), false);

      const [infoRes, catRes, menuRes] = await Promise.all([
        Api.info(),
        Api.categories(),
        Api.menu(),
      ]);

      UI.setBusinessInfo(infoRes.data || {});

 categories = (catRes.data || []).filter(
  (c) => String(c.Active).toLowerCase() === "true"
);

      items = (menuRes.data || []).filter((x) => x.Active);

      categories.sort((a, b) => (a.CategorySort || 0) - (b.CategorySort || 0));
      items.sort((a, b) => (a.CategorySort - b.CategorySort) || (a.Sort - b.Sort));

      activeCategoryId = categories[0]?.CategoryId || "";

      renderSidebar();
      renderAll();

      UI.show(UI.$("loading"), false);
      UI.show(UI.$("content"), true);
    } catch (e) {
      UI.show(UI.$("loading"), false);
      UI.show(UI.$("content"), false);
      UI.show(UI.$("emptyState"), false);
      setError(String(e?.message || e));
    }
  }

  // events
  document.addEventListener("DOMContentLoaded", () => {
    UI.$("year").textContent = new Date().getFullYear();

    UI.$("search").addEventListener("input", (e) => {
      searchTerm = e.target.value || "";
      renderAll();
    });

    UI.$("toggleAvailable").addEventListener("click", () => {
      onlyAvailable = !onlyAvailable;

      UI.$("toggleAvailable").textContent = onlyAvailable ? "Available Only" : "All Items";
      UI.$("toggleAvailable").className = onlyAvailable
        ? "rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition"
        : "rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";

      renderAll();
    });

    document.querySelectorAll(".foodBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        foodFilter = btn.getAttribute("data-food") || "ALL";

        document.querySelectorAll(".foodBtn").forEach((b) => {
          b.className = "foodBtn rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
        });
        btn.className = "foodBtn rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white";

        renderAll();
      });
    });

    boot();
  });
})();
