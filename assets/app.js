// assets/app.js (untuk index.html root)

const $ = (sel) => document.querySelector(sel);

const listEl = $("#list");
const emptyEl = $("#empty");
const countEl = $("#count");
const updatedAtEl = $("#updatedAt");
const yearEl = $("#year");

const searchEl = $("#search");
const categoryEl = $("#category");
const toggleViewBtn = $("#toggleView");
const toggleThemeBtn = $("#toggleTheme");

let allItems = [];
let viewMode = "grid"; // "grid" | "list"

// ---------- helpers ----------
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

function toBasePath(url) {
  // kalau url sudah absolute (https://...) biarin
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  // kalau url relatif seperti "pdf/nama.pdf" atau "preview/..."
  // dari beranda (root) cukup pakai apa adanya:
  return url.replace(/^\/+/, "");
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "-";
  }
}

function setEmpty(isEmpty) {
  if (isEmpty) {
    emptyEl.classList.remove("hidden");
  } else {
    emptyEl.classList.add("hidden");
  }
}

function setCount(n) {
  countEl.textContent = `${n} dokumen`;
}

function getCategories(items) {
  const set = new Set();
  items.forEach((it) => {
    const cat = (it.category || it.kategori || "").trim();
    if (cat) set.add(cat);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderCategoryOptions(categories) {
  // reset
  categoryEl.innerHTML = `<option value="all">Semua Kategori</option>`;
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryEl.appendChild(opt);
  });
}

function applyFilters() {
  const q = (searchEl.value || "").toLowerCase().trim();
  const cat = categoryEl.value || "all";

  const filtered = allItems.filter((it) => {
    const title = (it.title || it.judul || "").toLowerCase();
    const desc = (it.desc || it.deskripsi || "").toLowerCase();
    const category = (it.category || it.kategori || "").trim();

    const matchQ = !q || title.includes(q) || desc.includes(q);
    const matchCat = cat === "all" || category === cat;
    return matchQ && matchCat;
  });

  renderList(filtered);
  setCount(filtered.length);
  setEmpty(filtered.length === 0);
}

function makeCard(it) {
  const title = it.title || it.judul || "Tanpa judul";
  const desc = it.desc || it.deskripsi || "";
  const category = it.category || it.kategori || "";
  const url = toBasePath(it.url || it.link || it.file || "");
  const preview = toBasePath(it.preview || it.embed || "");

  // kalau ada preview gunakan iframe, kalau tidak ada tampilkan tombol buka
  const previewHtml = preview
    ? `<iframe src="${escapeHtml(preview)}" loading="lazy"></iframe>`
    : "";

  const openUrl = url || preview;

  return `
    <div class="card">
      <h3>${escapeHtml(title)}</h3>
      ${desc ? `<div style="color:#a1a1aa;font-size:13px;line-height:1.4;margin:-6px 0 12px">${escapeHtml(desc)}</div>` : ""}
      ${category ? `<div style="color:#a1a1aa;font-size:12px;margin:-4px 0 12px">🏷️ ${escapeHtml(category)}</div>` : ""}
      ${previewHtml}
      ${openUrl ? `
        <div style="margin-top:12px">
          <a class="btn primary" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener">Buka</a>
        </div>
      ` : ""}
    </div>
  `;
}

function makeRow(it) {
  const title = it.title || it.judul || "Tanpa judul";
  const desc = it.desc || it.deskripsi || "";
  const category = it.category || it.kategori || "";
  const url = toBasePath(it.url || it.link || it.file || "");
  const preview = toBasePath(it.preview || it.embed || "");
  const openUrl = url || preview;

  return `
    <div class="card" style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex:1">
        <h3 style="margin:0 0 6px">${escapeHtml(title)}</h3>
        ${desc ? `<div style="color:#a1a1aa;font-size:13px;line-height:1.4">${escapeHtml(desc)}</div>` : ""}
        ${category ? `<div style="color:#a1a1aa;font-size:12px;margin-top:8px">🏷️ ${escapeHtml(category)}</div>` : ""}
      </div>
      ${openUrl ? `<a class="btn primary" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener">Buka</a>` : ""}
    </div>
  `;
}

function renderList(items) {
  // set layout class di container
  listEl.className = viewMode === "grid" ? "grid" : "grid";
  // list mode = masih pake grid tapi kartu melebar (dibikin di makeRow)

  if (!items.length) {
    listEl.innerHTML = "";
    return;
  }

  listEl.innerHTML = items
    .map((it) => (viewMode === "grid" ? makeCard(it) : makeRow(it)))
    .join("");
}

// ---------- theme & view ----------
function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.dataset.theme = saved; // kalau css kamu pakai
  toggleThemeBtn.textContent = saved === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  const cur = localStorage.getItem("theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  document.documentElement.dataset.theme = next;
  toggleThemeBtn.textContent = next === "dark" ? "🌙" : "☀️";
}

function toggleView() {
  viewMode = viewMode === "grid" ? "list" : "grid";
  toggleViewBtn.textContent = viewMode === "grid" ? "⬛⬛" : "☰";
  applyFilters();
}

// ---------- data load ----------
async function loadData() {
  listEl.innerHTML = "Loading…";

  try {
    const res = await fetch("data/pdfs.json?_=" + Date.now());
    const raw = await res.json();

    // dukung 2 format:
    // 1) { updatedAt: "...", items: [...] }
    // 2) [ ... ]
    const items = Array.isArray(raw) ? raw : (raw.items || []);
    allItems = items;

    const updatedAt = Array.isArray(raw) ? null : raw.updatedAt;
    updatedAtEl.textContent = updatedAt ? formatDate(updatedAt) : "-";

    renderCategoryOptions(getCategories(allItems));
    applyFilters();
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<div class="empty-card" style="padding:18px">
      <div class="empty-title">Gagal memuat data</div>
      <div class="empty-sub">Pastikan file <b>data/pdfs.json</b> ada di repo dan bisa diakses.</div>
    </div>`;
    setCount(0);
    setEmpty(true);
  }
}

// ---------- init ----------
yearEl.textContent = String(new Date().getFullYear());

toggleThemeBtn?.addEventListener("click", toggleTheme);
toggleViewBtn?.addEventListener("click", toggleView);

searchEl?.addEventListener("input", applyFilters);
categoryEl?.addEventListener("change", applyFilters);

initTheme();
loadData();
