import { cart, allItems, activeCategory, setAllItems, setActiveCategory } from "./state.js";
import { fmt, escHtml, escAttr, spicyText, vegBadge } from "./utils.js";
import { renderCart } from "./ui-cart.js";

function buildCategories(items){
  const cats = ["All"];
  const seen = new Set();
  for(const it of items){
    const c = it.category || "";
    if(c && !seen.has(c)){
      seen.add(c);
      cats.push(c);
    }
  }
  return cats;
}

function visibleItems(){
  if(activeCategory === "All") return allItems;
  return allItems.filter(x => x.category === activeCategory);
}

function renderTabs(categories){
  const el = document.getElementById("tabs");
  let html = "";
  for(const c of categories){
    html += '<div class="tab ' + (c===activeCategory ? 'active' : '') + '" data-tab="' + escAttr(c) + '">' + escHtml(c) + '</div>';
  }
  el.innerHTML = html;

  el.querySelectorAll("[data-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      setActiveCategory(tab.getAttribute("data-tab"));
      renderTabs(categories);
      renderMenu();
    });
  });
}

function renderMenu(){
  const el = document.getElementById("menu");
  const items = visibleItems();

  if(items.length === 0){
    el.innerHTML = '<div class="muted">No items in this category.</div>';
    return;
  }

  let html = "";
  for(const item of items){
    const imgStyle = item.imageUrl ? ("background-image:url('" + item.imageUrl + "')") : "";
    const out = !item.available;
    const vb = vegBadge(item.isVeg);
    const spicy = spicyText(item.spicyLevel);

    html += ''
      + '<div class="card ' + (out ? 'out' : '') + '">'
      +   '<div class="img" style="' + imgStyle + '"></div>'
      +   '<div class="p">'
      +     '<div class="row">'
      +       '<div class="name">' + escHtml(item.name) + '</div>'
      +       '<div class="price">' + fmt(item.price) + '</div>'
      +     '</div>'
      +     '<div class="badges">'
      +       '<div class="badge">' + escHtml(item.category) + '</div>'
      +       '<div class="badge ' + vb.cls + '">' + vb.t + '</div>'
      +       (spicy ? ('<div class="badge">' + spicy + '</div>') : '')
      +       '<div class="badge">' + (out ? 'Out of stock' : 'Available') + '</div>'
      +     '</div>'
      +     '<div class="desc">' + escHtml(item.description || "") + '</div>'
      +     '<div class="row">'
      +       '<div class="muted">' + (out ? 'Not orderable right now' : 'Tap to add') + '</div>'
      +       '<button ' + (out ? 'disabled' : '') + ' data-add="' + escAttr(item.id) + '">Add</button>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  el.innerHTML = html;
  el.querySelectorAll("button[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.getAttribute("data-add")));
  });
}

function addToCart(id){
  const item = allItems.find(x => x.id === id);
  if(!item || !item.available) return;

  const cur = cart.get(id);
  cart.set(id, { item, qty: (cur && cur.qty ? cur.qty : 0) + 1 });
  renderCart();
}

// expose +/- globally (used by cart module wiring)
window.inc = function(id){
  const cur = cart.get(id);
  if(!cur) return;
  cart.set(id, { item: cur.item, qty: cur.qty + 1 });
  renderCart();
};
window.dec = function(id){
  const cur = cart.get(id);
  if(!cur) return;
  const q = cur.qty - 1;
  if(q <= 0) cart.delete(id);
  else cart.set(id, { item: cur.item, qty: q });
  renderCart();
};

export function initMenu(menuItems){
  setAllItems(menuItems || []);
  setActiveCategory("All");

  const categories = buildCategories(allItems);
  renderTabs(categories);
  renderMenu();
}
