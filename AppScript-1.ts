const MENU_SHEET = "Menu";
const ORDERS_SHEET = "Orders";
const COMPANY_SHEET = "Company-Info";

function doGet(e) {
  const action = (e?.parameter?.action || "").toLowerCase();

  if (action === "menu") return handleMenu_();
  if (action === "company") return handleCompany_();

  return jsonOut({ ok: false, error: "Invalid action. Use ?action=menu or ?action=company" });
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ORDERS_SHEET);
    if (!sheet) sheet = ss.insertSheet(ORDERS_SHEET);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["OrderID","Name","Phone","AddressOrTable","ItemsJSON","Subtotal","GST","GrandTotal","CreatedAt"]);
    }

    const data = JSON.parse(e?.postData?.contents || "{}");
    const orderId = "ORD-" + Utilities.getUuid().slice(0, 8).toUpperCase();
    const createdAt = new Date();

    sheet.appendRow([
      orderId,
      data.name || "",
      data.phone || "",
      data.addressOrTable || "",
      JSON.stringify(data.items || []),
      Number(data.subtotal || 0),
      Number(data.gst || 0),
      Number(data.grandTotal || 0),
      createdAt
    ]);

    return jsonOut({ ok: true, orderId });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function handleCompany_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COMPANY_SHEET);
  if (!sheet) return jsonOut({ ok: false, error: `Missing sheet: ${COMPANY_SHEET}` });

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonOut({ ok: true, company: null });

  const headers = values[0].map(h => String(h).trim());
  const row = values[1];

  const idx = (name) => headers.indexOf(name);

  const company = {
    client: String(row[idx("Client")] || "").trim(),
    address: String(row[idx("Address")] || "").trim(),
    phone: String(row[idx("Phone")] || "").trim(),
    email: String(row[idx("Email")] || "").trim(),
    website: String(row[idx("Website")] || "").trim(),
    imagePath: String(row[idx("Image Path")] || "").trim()
  };

  return jsonOut({ ok: true, company });
}

function handleMenu_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MENU_SHEET);
  if (!sheet) return jsonOut({ ok: false, error: `Missing sheet: ${MENU_SHEET}` });

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonOut({ ok: true, menu: [] });

  const headers = values[0].map(h => String(h).trim());
  const idx = (name) => headers.indexOf(name);

  const iCategory = idx("Category");
  const iItemName = idx("ItemName");
  const iPrice = idx("Price");
  const iAvailable = idx("Available");

  const iIsVeg = idx("IsVeg");
  const iSpicy = idx("SpicyLevel");
  const iDescription = idx("Description");
  const iImageURL = idx("ImageURL");
  const iSort = idx("Sort");

  const rows = values.slice(1);

  const menu = rows
    .filter(r => r[iCategory] && r[iItemName])
    .map(r => {
      const name = String(r[iItemName]).trim();
      const category = String(r[iCategory]).trim();
      const price = Number(r[iPrice] || 0);

      const available = String(r[iAvailable]).toLowerCase() === "true" || r[iAvailable] === true;

      const isVegRaw = String(iIsVeg >= 0 ? (r[iIsVeg] || "") : "").trim().toUpperCase();
      const isVeg = isVegRaw === "NONVEG" ? "NONVEG" : "VEG";

      const spicyRaw = iSpicy >= 0 ? Number(r[iSpicy] || 0) : 0;
      const spicyLevel = Math.max(0, Math.min(3, spicyRaw));

      const description = String(iDescription >= 0 ? (r[iDescription] || "") : "").trim();
      const imageUrl = String(iImageURL >= 0 ? (r[iImageURL] || "") : "").trim();
      const sort = Number(iSort >= 0 ? (r[iSort] || 9999) : 9999);

      const id = Utilities.base64EncodeWebSafe(`${category}|${name}`).slice(0, 18);

      return { id, category, name, price, available, isVeg, spicyLevel, description, imageUrl, sort };
    })
    .sort((a, b) =>
      a.category.localeCompare(b.category) ||
      a.sort - b.sort ||
      a.name.localeCompare(b.name)
    );

  return jsonOut({ ok: true, menu });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
