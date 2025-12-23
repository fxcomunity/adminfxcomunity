// assets/app.js (untuk index.html)

const $ = (s) => document.querySelector(s);

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
let viewMode = localStorage.getItem("viewMode") || "grid"; // grid | list

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[m]));
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
  emptyEl.classList.toggle("hidden", !isEmpty);
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
  categoryEl.innerHTML = `<option value="all">Semua Kategori</option>`;
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryEl.appendChild(opt);
  });
}

function toHref(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url.replace(/^\/+/, ""); // relatif dari root
}

function render(items) {
  if (!items.length) {
    listEl.innerHTML = "";
    return;
  }

  // ubah ikon tombol view
  toggleViewBtn.textContent = viewMode === "grid" ? "⬛⬛" : "☰";

  listEl.innerHTML = items.map((it) => {
    const title = it.title || it.judul || "Tanpa judul";
    const desc = it.desc || it.deskripsi || "";
    const category = it.category || it.kategori || "";
    const url = toHref(it.url || it.link || it.file || "");
    const preview = toHref(it.preview || it.embed || "");
    const openUrl = url || preview;

    if (viewMode === "list") {
      return `
        <div class="card" style="display:flex;gap:12px;align-items:flex-start">
          <div style="flex:1">
            <h3 style="margin:0 0 6px">${escapeHtml(title)}</h3>
            ${desc ? `<div class="sub">${escapeHtml(desc)}</div>` : ""}
            ${category ? `<div style="color:var(--muted);font-size:12px;margin-top:8px">🏷️ ${escapeHtml(category)}</div>` : ""}
          </div>
          ${openUrl ? `<a class="btn primary" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener">Buka</a>` : ""}
        </div>
      `;
    }

    return `
      <div class="card">
        <h3>${escapeHtml(title)}</h3>
        ${desc ? `<div class="sub">${escapeHtml(desc)}</div>` : ""}
        ${category ? `<div style="color:var(--muted);font-size:12px;margin:-4px 0 12px">🏷️ ${escapeHtml(category)}</div>` : ""}
        ${preview ? `<iframe src="${escapeHtml(preview)}" loading="lazy"></iframe>` : ""}
        ${openUrl ? `<div style="margin-top:12px"><a class="btn primary" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener">Buka</a></div>` : ""}
      </div>
    `;
  }).join("");
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

  render(filtered);
  setCount(filtered.length);
  setEmpty(filtered.length === 0);
}

async function loadData() {
  listEl.innerHTML = "Loading…";

  try {
    const res = await fetch("data/pdfs.json?_=" + Date.now());
    const raw = await res.json();

    const items = Array.isArray(raw) ? raw : (raw.items || []);
    allItems = items;

    updatedAtEl.textContent = Array.isArray(raw) ? "-" : formatDate(raw.updatedAt);

    renderCategoryOptions(getCategories(allItems));
    applyFilters();
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<div class="empty-card">
      <div class="empty-title">Gagal memuat data</div>
      <div class="empty-sub">Pastikan file <b>data/pdfs.json</b> ada dan bisa diakses.</div>
    </div>`;
    setCount(0);
    setEmpty(true);
  }
}

/* ---------- THEME (ini yang bikin mode malam/pagi beneran jalan) ---------- */
function getTheme() {
  return localStorage.getItem("theme") || "dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  // ikon tombol ikut berubah
  if (toggleThemeBtn) toggleThemeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
}

/* ---------- VIEW ---------- */
function toggleView() {
  viewMode = viewMode === "grid" ? "list" : "grid";
  localStorage.setItem("viewMode", viewMode);
  applyFilters();
}

/* ---------- INIT ---------- */
yearEl.textContent = String(new Date().getFullYear());

setTheme(getTheme());

toggleThemeBtn?.addEventListener("click", toggleTheme);
toggleViewBtn?.addEventListener("click", toggleView);

searchEl?.addEventListener("input", applyFilters);
categoryEl?.addEventListener("change", applyFilters);

loadData();
