import { safe } from "./utils.js";

export function renderCompany(company){
  if(!company) return;

  const client = safe(company.client);
  const address = safe(company.address);
  const phone = safe(company.phone);
  const email = safe(company.email);
  const websiteRaw = safe(company.website);
  const logoUrl = safe(company.imagePath);

  if(client){
    document.getElementById("companyTitle").textContent = client;
    document.title = client;
  }

  const logo = document.getElementById("companyLogo");
  if(logoUrl){
    logo.src = logoUrl;
    logo.style.display = "block";
  } else {
    logo.style.display = "none";
  }

  document.getElementById("companyAddress").textContent = address ? ("📍 " + address) : "";

  const contactsEl = document.getElementById("companyContacts");
  contactsEl.innerHTML = "";

  function addSep(){
    if(contactsEl.childNodes.length > 0){
      contactsEl.appendChild(document.createTextNode("  •  "));
    }
  }

  if(phone){
    addSep();
    const a = document.createElement("a");
    a.href = "tel:" + phone.replace(/\s+/g,"");
    a.textContent = "📞 " + phone;
    contactsEl.appendChild(a);
  }

  if(email){
    addSep();
    const a = document.createElement("a");
    a.href = "mailto:" + email;
    a.textContent = "✉️ " + email;
    contactsEl.appendChild(a);
  }

  if(websiteRaw){
    addSep();
    const url = (websiteRaw.indexOf("http://")===0 || websiteRaw.indexOf("https://")===0) ? websiteRaw : ("https://" + websiteRaw);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "🌐 " + websiteRaw;
    contactsEl.appendChild(a);
  }
}
