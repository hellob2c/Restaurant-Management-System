import { fetchMenu, fetchCompany } from "./api.js";
import { renderCompany } from "./ui-company.js";
import { initMenu } from "./ui-menu.js";
import { initCart } from "./ui-cart.js";
import { initOrderModal } from "./ui-order-modal.js";

console.log("VERSION: 2026-01-22-MODULAR");

async function boot(){
  try{
    // Company header (optional)
    const company = await fetchCompany();
    renderCompany(company);

    // Init UI
    initCart();
    initOrderModal();

    // Menu
    const menu = await fetchMenu();
    initMenu(menu);

    document.getElementById("subtitle").textContent = "Menu loaded • " + (menu.length || 0) + " items";
  }catch(err){
    document.getElementById("subtitle").textContent = "Menu load failed";
    document.getElementById("menu").innerHTML = '<div class="err">' + (err && err.message ? err.message : "Unknown error") + '</div>';
  }
}

boot();
