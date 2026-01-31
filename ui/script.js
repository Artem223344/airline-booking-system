// =============================
// CONFIG
// =============================
const API_ROOT = "http://localhost:3000";
const API_BASE = `${API_ROOT}/api`;

// =============================
// DOM ELEMENTS
// =============================
const navLinks = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll(".view");
const resultsContainer = document.getElementById("resultsContainer");
const recommendedContainer = document.getElementById("recommendedContainer");
const noResultsEl = document.getElementById("noResults");

// =============================
// API HELPERS
// =============================
async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    return [];
  }
}

// =============================
// RENDER FUNCTIONS
// =============================
function renderResults(list) {
  resultsContainer.innerHTML = "";

  if (!list.length) {
    noResultsEl.classList.remove("hidden");
    return;
  }
  noResultsEl.classList.add("hidden");

  list.forEach((f) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div class="card-main">
                <div class="card-route">${f.from} → ${f.to}</div>
                <div class="card-meta">
                    Date: ${f.date} · ${f.duration} · ${f.airline}
                </div>
                <div class="card-meta">
                    Available seats: <strong>${f.seats}</strong>
                </div>
            </div>
            <div>
                <div class="card-price">$${f.price}</div>
            </div>
        `;
    resultsContainer.appendChild(card);
  });
}

function renderRecommended(list) {
  recommendedContainer.innerHTML = "";
  const recommended = list.slice(0, 2);
  recommended.forEach((f) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div class="card-main">
                <div class="card-route">${f.from} → ${f.to}</div>
            </div>
            <div class="card-price">from $${f.price}</div>
        `;
    recommendedContainer.appendChild(card);
  });
}

// =============================
// NAVIGATION
// =============================
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    const viewId = link.dataset.view;
    if (!viewId) return;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    views.forEach((v) => v.classList.remove("active"));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add("active");
  });
});

// =============================
// INIT
// =============================
async function init() {
  const flights = await apiGet("/flights");
  renderResults(flights);
  renderRecommended(flights);
}

document.addEventListener("DOMContentLoaded", init);
