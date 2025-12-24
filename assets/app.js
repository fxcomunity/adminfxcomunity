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

/* =========================
   UTIL
========================= */
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
  return url.replace(/^\/+/, "");
}

/* =========================
   SKELETON LOADING (biar ga kerasa lama)
========================= */
function renderSkeleton(n = 6) {
  toggleViewBtn.textContent = viewMode === "grid" ? "⬛⬛" : "☰";
  const cardStyle = `
    border-radius:22px;
    padding:16px;
    border:1px solid var(--border);
    background: linear-gradient(180deg, var(--card), var(--card2));
    box-shadow: 0 18px 55px rgba(0,0,0,.18);
  `;

  const bar = (w) => `
    <div style="
      height:12px;
      width:${w};
      border-radius:999px;
      background: rgba(255,255,255,.10);
      margin: 8px 0;
      overflow:hidden;
      position:relative">
      <div style="
        position:absolute; inset:0;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(255,255,255,.18) 50%,
          transparent 100%);
        transform: translateX(-100%);
        animation: shimmer 1.1s infinite;">
      </div>
    </div>
  `;

  listEl.innerHTML = `
    <style>
      @keyframes shimmer{
        100%{ transform: translateX(100%); }
      }
    </style>
    ${Array.from({ length: n }).map(() => `
      <div class="card" style="${cardStyle}">
        ${bar("60%")}
        ${bar("85%")}
        <div style="height:280px;border-radius:16px;background:rgba(255,255,255,.06);margin-top:12px"></div>
        ${bar("35%")}
      </div>
    `).join("")}
  `;
}

/* =========================
   CACHE (biar buka ulang ga nunggu)
========================= */
const CACHE_KEY = "pdf_cache_v1";
const CACHE_TTL = 1000 * 60 * 10; // 10 menit

function saveCache(raw) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      t: Date.now(),
      raw
    }));
  } catch {}
}

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!c) return null;
    if (Date.now() - c.t > CACHE_TTL) return null;
    return c.raw;
  } catch {
    return null;
  }
}

/* =========================
   FETCH TIMEOUT (biar ga loading selamanya)
========================= */
async function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const res = await fetch(url, { signal: ctrl.signal });
  clearTimeout(t);
  return res;
}

/* =========================
   RENDER
========================= */
function render(items) {
  if (!items.length) {
    listEl.innerHTML = "";
    return;
  }

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

/* =========================
   FILTER
========================= */
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

/* =========================
   LOAD DATA (lebih cepat)
========================= */
async function loadData() {
  // ✅ tampilkan skeleton dulu
  renderSkeleton(6);
  setCount(0);
  setEmpty(false);

  // ✅ tampilkan cache dulu kalau ada
  const cached = loadCache();
  if (cached) {
    try {
      const items = Array.isArray(cached) ? cached : (cached.items || []);
      allItems = items;
      updatedAtEl.textContent = Array.isArray(cached) ? "-" : formatDate(cached.updatedAt);

      renderCategoryOptions(getCategories(allItems));
      applyFilters();
    } catch {}
  }

  try {
    const res = await fetchWithTimeout("data/pdfs.json?_=" + Date.now(), 8000);
    const raw = await res.json();

    // simpan cache
    saveCache(raw);

    const items = Array.isArray(raw) ? raw : (raw.items || []);
    allItems = items;

    updatedAtEl.textContent = Array.isArray(raw) ? "-" : formatDate(raw.updatedAt);

    renderCategoryOptions(getCategories(allItems));
    applyFilters();
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<div class="empty-card">
      <div class="empty-title">Gagal memuat data</div>
      <div class="empty-sub">
        Pastikan file <b>data/pdfs.json</b> ada dan bisa diakses.
        <br/>Jika GitHub lambat, coba refresh atau pakai Ctrl+Shift+R.
      </div>
    </div>`;
    setCount(0);
    setEmpty(true);
  }
}

/* =========================
   THEME
========================= */
function getTheme() {
  return localStorage.getItem("theme") || "dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  if (toggleThemeBtn) toggleThemeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
}

/* =========================
   VIEW
========================= */
function toggleView() {
  viewMode = viewMode === "grid" ? "list" : "grid";
  localStorage.setItem("viewMode", viewMode);
  applyFilters();
}

/* =========================
   INIT
========================= */
yearEl.textContent = String(new Date().getFullYear());
setTheme(getTheme());

toggleThemeBtn?.addEventListener("click", toggleTheme);
toggleViewBtn?.addEventListener("click", toggleView);
searchEl?.addEventListener("input", applyFilters);
categoryEl?.addEventListener("change", applyFilters);

loadData();
