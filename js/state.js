export const cart = new Map(); // id -> {item, qty}

export let allItems = [];
export let activeCategory = "All";

export function setAllItems(items){ allItems = Array.isArray(items) ? items : []; }
export function setActiveCategory(cat){ activeCategory = cat || "All"; }
