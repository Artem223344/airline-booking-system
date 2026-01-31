// =============================
// CONFIG
// =============================
const API_ROOT = "http://localhost:3000";
const API_BASE = `${API_ROOT}/api`;
const LS_USER = "airline_current_user";

// =============================
// HELPERS (Storage & API)
// =============================
function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user) {
  if (!user) localStorage.removeItem(LS_USER);
  else localStorage.setItem(LS_USER, JSON.stringify(user));
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || res.statusText);
  return data;
}

// =============================
// STATE
// =============================
let currentUser = loadCurrentUser();

// =============================
// DOM ELEMENTS
// =============================
const navLinks = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll(".view");
const resultsContainer = document.getElementById("resultsContainer");
const recommendedContainer = document.getElementById("recommendedContainer");
const noResultsEl = document.getElementById("noResults");

// Auth Elements
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const closeAuthModalBtn = document.getElementById("closeAuthModal");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const currentUserLabel = document.getElementById("currentUserLabel");
const adminOnlyElems = document.querySelectorAll(".admin-only");

// =============================
// AUTH LOGIC
// =============================
function updateAuthUI() {
  if (currentUser) {
    currentUserLabel.textContent = currentUser.email;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    currentUserLabel.textContent = "Guest";
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }

  const isAdmin = currentUser && currentUser.role === "admin";
  adminOnlyElems.forEach((el) => {
    if (isAdmin) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}

loginBtn.addEventListener("click", () => authModal.classList.remove("hidden"));
closeAuthModalBtn.addEventListener("click", () =>
  authModal.classList.add("hidden")
);

logoutBtn.addEventListener("click", () => {
  currentUser = null;
  saveCurrentUser(null);
  updateAuthUI();
  if (document.getElementById("adminView").classList.contains("active")) {
    document.querySelector('[data-view="searchView"]').click();
  }
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  if (!email || !password) return alert("Enter email and password");

  try {
    currentUser = await apiPost("/auth/login", { email, password });
    saveCurrentUser(currentUser);
    updateAuthUI();
    authModal.classList.add("hidden");
  } catch (err) {
    if (confirm("Login failed. Create new account?")) {
      try {
        currentUser = await apiPost("/auth/register", { email, password });
        saveCurrentUser(currentUser);
        updateAuthUI();
        authModal.classList.add("hidden");
        alert("Account created!");
      } catch (regErr) {
        alert("Error: " + regErr.message);
      }
    }
  }
});

// =============================
// RENDER & INIT
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
                <div class="card-meta">Date: ${f.date} · ${f.airline}</div>
                <div class="card-meta">Seats: <strong>${f.seats}</strong></div>
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
  list.slice(0, 2).forEach((f) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div class="card-main"><div class="card-route">${f.from} → ${f.to}</div></div>
            <div class="card-price">from $${f.price}</div>
        `;
    recommendedContainer.appendChild(card);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const viewId = link.dataset.view;
    if (!viewId) return;
    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    views.forEach((v) => v.classList.remove("active"));
    document.getElementById(viewId)?.classList.add("active");
  });
});

async function init() {
  updateAuthUI();
  const flights = await apiGet("/flights").catch(() => []);
  renderResults(flights);
  renderRecommended(flights);
}

document.addEventListener("DOMContentLoaded", init);
