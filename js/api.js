import { MENU_API, COMPANY_API, EXEC_URL } from "./config.js";

export async function fetchMenu(){
  const res = await fetch(MENU_API);
  const json = await res.json();
  if(!json || !json.ok) throw new Error((json && json.error) ? json.error : "Failed to load menu");
  return json.menu || [];
}

export async function fetchCompany(){
  const res = await fetch(COMPANY_API);
  const json = await res.json();
  if(!json || !json.ok) return null;
  return json.company || null;
}

export async function postOrder(payload){
  const res = await fetch(EXEC_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload || {})
  });
  return await res.json();
}
