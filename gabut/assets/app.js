// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

// ===== State =====
let allDocs = [];
let viewMode = localStorage.getItem("viewMode") || "grid"; // grid | list
let theme = localStorage.getItem("theme") || "light";      // light | dark

// ===== Rendering =====
function makeCard(item) {
  const el = document.createElement("article");
  el.className = "card";

  const dateText = item.updated_at ? formatDate(item.updated_at) : "—";

  el.innerHTML = `
    <div class="card-top">
      <div class="file-icon">📄</div>
      <span class="tag">${item.category || "Umum"}</span>
    </div>

    <div class="title">${item.title || "Tanpa Judul"}</div>
    <div class="desc">${item.desc || "Tidak ada deskripsi."}</div>

    <div class="card-bottom">
      <div class="small">🗓️ ${dateText}</div>
      <a class="open" href="${item.url}" target="_blank" rel="noopener">Buka PDF</a>
    </div>
  `;
  return el;
}

function applyViewMode() {
  const list = $("list");
  list.classList.remove("grid", "list");
  list.classList.add(viewMode);
}

function setTheme(next) {
  theme = next;
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
  $("toggleTheme").textContent = theme === "dark" ? "☀️" : "🌙";
}

function renderCategoryOptions(items) {
  const select = $("category");
  const categories = Array.from(new Set(items.map(x => (x.category || "Umum").trim()))).sort();

  select.innerHTML = `<option value="all">Semua Kategori</option>`;
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function filterDocs() {
  const q = ($("search").value || "").toLowerCase().trim();
  const cat = $("category").value;

  const filtered = allDocs.filter(d => {
    const text = `${d.title || ""} ${d.desc || ""}`.toLowerCase();
    const okSearch = !q || text.includes(q);
    const okCat = (cat === "all") || ((d.category || "Umum") === cat);
    return okSearch && okCat;
  });

  const list = $("list");
  list.innerHTML = "";
  filtered.forEach(item => list.appendChild(makeCard(item)));

  $("count").textContent = `${filtered.length} dokumen`;
  $("empty").classList.toggle("hidden", filtered.length !== 0);
}

async function loadData() {
  try {
    // IMPORTANT for GitHub Pages / Netlify: use relative path (no leading slash)
    const res = await fetch("./data/pdfs.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} saat load data/pdfs.json`);

    const data = await res.json();

    allDocs = Array.isArray(data.items) ? data.items : [];
    renderCategoryOptions(allDocs);

    $("updatedAt").textContent = formatDate(data.updated_at || new Date().toISOString());
    filterDocs();
  } catch (err) {
    console.error("Gagal load data:", err);
    allDocs = [];
    $("list").innerHTML = "";
    $("count").textContent = "0 dokumen";
    $("updatedAt").textContent = "-";
    $("empty").classList.remove("hidden");
  }
}

// ===== Events =====
document.addEventListener("DOMContentLoaded", () => {
  $("year").textContent = new Date().getFullYear();

  setTheme(theme);
  applyViewMode();

  $("toggleTheme").addEventListener("click", () => {
    setTheme(theme === "dark" ? "light" : "dark");
  });

  $("toggleView").addEventListener("click", () => {
    viewMode = viewMode === "grid" ? "list" : "grid";
    localStorage.setItem("viewMode", viewMode);
    applyViewMode();
  });

  $("search").addEventListener("input", filterDocs);
  $("category").addEventListener("change", filterDocs);

  loadData();
});
