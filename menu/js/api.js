// js/api.js
(function () {
  const base = () => window.APP_CONFIG.WEBAPP_URL;

  async function getJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  window.Api = {
    info: () => getJson(`${base()}?route=info`),
    categories: () => getJson(`${base()}?route=categories&active=true`),
    menu: () => getJson(`${base()}?route=menu&active=true`)
  };
})();
