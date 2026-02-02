// =============================
// CONFIG
// =============================
const API_ROOT = "https://airline-api-artyom.onrender.com";
const API_BASE = `${API_ROOT}/api`;
const LS_USER = "airline_current_user";

const EXTRA_PRICES = {
  meal: 20,
  insurance: 15,
  upgrade: 50,
};

// =============================
// USER STORAGE
// =============================
function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(LS_USER);
  } else {
    localStorage.setItem(LS_USER, JSON.stringify(user));
  }
}

// =============================
// STATE
// =============================
let flights = [];
let currentUser = loadCurrentUser();
let lastSearchParams = { from: "", to: "", date: "" };
let selectedFlightId = null;
let selectedSeats = [];
let selectedFlight = null;
let payingBookingId = null;
let payingBookingTotal = null;

// =============================
// DOM
// =============================
const navLinks = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll(".view");

const searchForm = document.getElementById("searchForm");
const resultsContainer = document.getElementById("resultsContainer");
const recommendedContainer = document.getElementById("recommendedContainer");
const noResultsEl = document.getElementById("noResults");

const bookingsContainer = document.getElementById("bookingsContainer");
const noBookingsEl = document.getElementById("noBookings");

const adminFlightsContainer = document.getElementById("adminFlightsContainer");
const supportMessagesContainer = document.getElementById(
  "supportMessagesContainer"
);
const flightForm = document.getElementById("flightForm");
const resetFlightFormBtn = document.getElementById("resetFlightForm");

const bookingModal = document.getElementById("bookingModal");
const bookingFlightInfo = document.getElementById("bookingFlightInfo");
const bookingForm = document.getElementById("bookingForm");
const closeBookingModalBtn = document.getElementById("closeBookingModal");

const paymentModal = document.getElementById("paymentModal");
const paymentBookingInfo = document.getElementById("paymentBookingInfo");
const paymentForm = document.getElementById("paymentForm");
const closePaymentModalBtn = document.getElementById("closePaymentModal");

const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const closeAuthModalBtn = document.getElementById("closeAuthModal");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const currentUserLabel = document.getElementById("currentUserLabel");
const adminOnlyElems = document.querySelectorAll(".admin-only");

const fromListEl = document.getElementById("fromList");
const toListEl = document.getElementById("toList");

const seatGridEl = document.getElementById("seatGrid");
const seatHintEl = document.getElementById("seatHint");

const helpForm = document.getElementById("helpForm");
const helpMessageInput = document.getElementById("helpMessage");

// =============================
// API HELPERS
// =============================
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || res.statusText);
  }
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || res.statusText);
  }
  return data;
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || res.statusText);
  }
  return data;
}

// =============================
// BUSINESS HELPERS
// =============================
function filterFlights(list, from, to, date) {
  const fromNorm = from.trim().toLowerCase();
  const toNorm = to.trim().toLowerCase();
  const dateNorm = date.trim();

  return list.filter((f) => {
    const fromOk = !fromNorm || f.from.toLowerCase() === fromNorm;
    const toOk = !toNorm || f.to.toLowerCase() === toNorm;
    const dateOk = !dateNorm || f.date === dateNorm;
    return fromOk && toOk && dateOk;
  });
}

function fillCityLists(flights) {
  if (!fromListEl || !toListEl) return;

  const fromSet = new Set();
  const toSet = new Set();

  flights.forEach((f) => {
    if (f.from) fromSet.add(f.from);
    if (f.to) toSet.add(f.to);
  });

  fromListEl.innerHTML = "";
  toListEl.innerHTML = "";

  fromSet.forEach((city) => {
    fromListEl.insertAdjacentHTML(
      "beforeend",
      `<option value="${city}"></option>`
    );
  });

  toSet.forEach((city) => {
    toListEl.insertAdjacentHTML(
      "beforeend",
      `<option value="${city}"></option>`
    );
  });
}

// =============================
// NAVIGATION
// =============================
navLinks.forEach((link) => {
  link.addEventListener("click", async () => {
    const viewId = link.dataset.view;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    views.forEach((v) => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");

    if (viewId === "bookingsView") {
      await renderBookings();
    }
    if (viewId === "adminView") {
      await renderAdminFlights();
    }
  });
});

// клік по Help у футері
document.querySelectorAll('[data-view-link="helpView"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const helpBtn = document.querySelector('.nav-link[data-view="helpView"]');
    if (helpBtn) helpBtn.click();
  });
});

// =============================
// RENDER: RECOMMENDED & RESULTS
// =============================
function renderRecommended() {
  recommendedContainer.innerHTML = "";

  const recommended = flights.slice(0, 2);
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
                <button class="btn primary small" data-book="${f.id}">
                    Book
                </button>
            </div>
        `;

    resultsContainer.appendChild(card);
  });

  resultsContainer.querySelectorAll("[data-book]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-book"));
      openBookingModal(id);
    });
  });
}

// =============================
// RENDER: BOOKINGS
// =============================
async function renderBookings() {
  bookingsContainer.innerHTML = "";

  if (!currentUser) {
    noBookingsEl.textContent =
      "Щоб переглядати свої бронювання, увійдіть у систему.";
    noBookingsEl.classList.remove("hidden");
    return;
  }

  let bookings;
  try {
    const encoded = encodeURIComponent(currentUser.email);
    bookings = await apiGet(`/bookings?userEmail=${encoded}`);
  } catch (e) {
    console.error(e);
    noBookingsEl.textContent = "Помилка завантаження бронювань.";
    noBookingsEl.classList.remove("hidden");
    return;
  }

  if (!bookings.length) {
    noBookingsEl.textContent = "У вас ще немає бронювань.";
    noBookingsEl.classList.remove("hidden");
    return;
  }

  noBookingsEl.classList.add("hidden");

  bookings.forEach((b) => {
    const flight = flights.find((f) => f.id === b.flightId);
    const card = document.createElement("div");
    card.className = "card";

    const showPayButton =
      b.status === "Confirmed" && b.paymentStatus !== "Paid";
    const showTicketButton = b.paymentStatus === "Paid";

    const actionsHtml = `
            ${
              showPayButton
                ? `<button class="btn primary small" data-pay="${b.id}">Pay</button>`
                : ""
            }
            ${
              showTicketButton
                ? `<button class="btn secondary small" data-ticket="${b.id}">Ticket</button>`
                : ""
            }
            ${
              b.status === "Confirmed"
                ? `<button class="btn secondary small" data-cancel="${b.id}">Cancel</button>`
                : ""
            }
        `;

    card.innerHTML = `
            <div class="card-main">
                <div class="card-route">
                    #${b.id} · ${
      flight ? `${flight.from} → ${flight.to}` : "Flight"
    }
                </div>
                <div class="card-meta">
                    Passenger: ${b.name} · Email: ${b.email} · Status: ${
      b.status
    }
                </div>
                <div class="card-meta">
                    Passengers: ${b.passengers} · Seats: ${
      b.seats ? b.seats.join(", ") : "—"
    }
                </div>
                <div class="card-meta">
                    Extras: ${
                      b.extras
                        ? [
                            b.extras.meal && "Meal",
                            b.extras.insurance && "Insurance",
                            b.extras.upgrade && "Upgrade",
                          ]
                            .filter(Boolean)
                            .join(", ") || "None"
                        : "None"
                    } · Total: $${b.totalPrice ?? "—"}
                </div>
                <div class="card-meta">
                    Payment: ${b.paymentStatus || "Unpaid"}
                </div>
            </div>
            <div>
                ${actionsHtml}
            </div>
        `;

    const payBtn = card.querySelector("[data-pay]");
    if (payBtn) {
      payBtn.addEventListener("click", () => {
        openPaymentModal(b);
      });
    }

    const ticketBtn = card.querySelector("[data-ticket]");
    if (ticketBtn) {
      ticketBtn.addEventListener("click", () => {
        const id = Number(ticketBtn.getAttribute("data-ticket"));
        const url = `${API_ROOT}/report/booking/${id}`;
        window.open(url, "_blank");
      });
    }

    const cancelBtn = card.querySelector("[data-cancel]");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", async () => {
        const id = Number(cancelBtn.getAttribute("data-cancel"));
        if (!confirm("Cancel this booking?")) return;
        try {
          await apiPut(`/bookings/${id}/cancel`);
          await renderBookings();
          await reloadAndRenderResults();
        } catch (e) {
          alert("Помилка скасування: " + e.message);
        }
      });
    }

    bookingsContainer.appendChild(card);
  });
}

// =============================
// RENDER: ADMIN FLIGHTS + SUPPORT
// =============================
async function renderAdminFlights() {
  adminFlightsContainer.innerHTML = "";
  supportMessagesContainer.innerHTML = "";

  try {
    flights = await apiGet("/flights");
    fillCityLists(flights);
  } catch (e) {
    console.error(e);
    adminFlightsContainer.textContent = "Помилка завантаження рейсів.";
    return;
  }

  flights.forEach((f) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
            <div class="card-main">
                <div class="card-route">${f.from} → ${f.to}</div>
                <div class="card-meta">
                    Date: ${f.date} · ${f.duration} · ${f.airline}
                </div>
                <div class="card-meta">
                    Seats: <strong>${f.seats}</strong> / Total: ${
      f.totalSeats ?? f.seats
    }
                </div>
            </div>
            <div>
                <div class="card-price">$${f.price}</div>
                <button class="btn secondary small" data-edit="${
                  f.id
                }">Edit</button>
                <button class="btn secondary small" data-delete="${
                  f.id
                }">Delete</button>
            </div>
        `;

    adminFlightsContainer.appendChild(card);
  });

  adminFlightsContainer.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-edit"));
      const f = flights.find((x) => x.id === id);
      if (!f) return;

      document.getElementById("flightId").value = f.id;
      document.getElementById("flightFrom").value = f.from;
      document.getElementById("flightTo").value = f.to;
      document.getElementById("flightDate").value = f.date;
      document.getElementById("flightDuration").value = f.duration;
      document.getElementById("flightAirline").value = f.airline;
      document.getElementById("flightPrice").value = f.price;
      const seatsInput = document.getElementById("flightSeats");
      if (seatsInput) seatsInput.value = f.totalSeats ?? f.seats;
    });
  });

  adminFlightsContainer.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-delete"));
      if (!confirm("Delete this flight?")) return;
      try {
        await apiDelete(`/flights/${id}`);
        await renderAdminFlights();
        await reloadAndRenderResults();
      } catch (e) {
        alert("Помилка видалення рейсу: " + e.message);
      }
    });
  });

  // SUPPORT MESSAGES
  try {
    const msgs = await apiGet("/help");
    if (!msgs.length) {
      const p = document.createElement("p");
      p.className = "muted small";
      p.textContent = "No support messages yet.";
      supportMessagesContainer.appendChild(p);
    } else {
      msgs
        .sort((a, b) => b.id - a.id)
        .forEach((m) => {
          const card = document.createElement("div");
          card.className = "card";
          card.innerHTML = `
                        <div class="card-main">
                            <div class="card-route">
                                From: ${m.userEmail || "anonymous"}
                            </div>
                            <div class="card-meta">
                                ${new Date(m.createdAt).toLocaleString()}
                            </div>
                            <div class="card-meta">
                                ${m.message}
                            </div>
                        </div>
                    `;
          supportMessagesContainer.appendChild(card);
        });
    }
  } catch (e) {
    console.error(e);
    const p = document.createElement("p");
    p.className = "muted small";
    p.textContent = "Помилка завантаження повідомлень підтримки.";
    supportMessagesContainer.appendChild(p);
  }
}

// =============================
// SEARCH
// =============================
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const from = document.getElementById("fromInput").value;
  const to = document.getElementById("toInput").value;
  const date = document.getElementById("dateInput").value;

  lastSearchParams = { from, to, date };

  try {
    flights = await apiGet("/flights");
    fillCityLists(flights);
    const filtered = filterFlights(flights, from, to, date);
    renderResults(filtered);
  } catch (err) {
    console.error(err);
    alert("Не вдалося завантажити рейси: " + err.message);
  }
});

async function reloadAndRenderResults() {
  try {
    flights = await apiGet("/flights");
    fillCityLists(flights);
    const filtered = filterFlights(
      flights,
      lastSearchParams.from,
      lastSearchParams.to,
      lastSearchParams.date
    );
    renderResults(filtered);
    renderRecommended();
  } catch (e) {
    console.error(e);
  }
}

// =============================
// SEAT GRID
// =============================
function renderSeatGrid(flight) {
  if (!seatGridEl) return;

  seatGridEl.innerHTML = "";
  selectedSeats = [];

  const totalSeats =
    typeof flight.totalSeats === "number"
      ? flight.totalSeats
      : Number(flight.seats) + (flight.bookedSeats?.length || 0);

  const taken = new Set(flight.bookedSeats || []);

  for (let i = 1; i <= totalSeats; i++) {
    const seatDiv = document.createElement("div");
    seatDiv.className = "seat";
    seatDiv.textContent = i;
    seatDiv.dataset.seatNum = String(i);

    if (taken.has(i)) {
      seatDiv.classList.add("taken");
    } else {
      seatDiv.addEventListener("click", () => {
        const seatNum = Number(seatDiv.dataset.seatNum);
        if (seatDiv.classList.contains("selected")) {
          seatDiv.classList.remove("selected");
          selectedSeats = selectedSeats.filter((s) => s !== seatNum);
        } else {
          seatDiv.classList.add("selected");
          selectedSeats.push(seatNum);
        }
        updateSeatHint();
      });
    }

    seatGridEl.appendChild(seatDiv);
  }

  updateSeatHint();
}

function updatePricePreview() {
  const totalPriceEl = document.getElementById("totalPriceDisplay");
  if (!selectedFlight || !totalPriceEl) return;

  const passengers = selectedSeats.length || 1;
  let total = selectedFlight.price * passengers;

  const meal = document.getElementById("extraMeal")?.checked;
  const insurance = document.getElementById("extraInsurance")?.checked;
  const upgrade = document.getElementById("extraUpgrade")?.checked;

  if (meal) total += EXTRA_PRICES.meal * passengers;
  if (insurance) total += EXTRA_PRICES.insurance * passengers;
  if (upgrade) total += EXTRA_PRICES.upgrade * passengers;

  totalPriceEl.textContent = `$${total} (for ${passengers} passenger${
    passengers > 1 ? "s" : ""
  })`;
}

function updateSeatHint() {
  if (!seatHintEl) return;
  if (!selectedSeats.length) {
    seatHintEl.textContent = "Select seats by clicking on free squares.";
  } else {
    seatHintEl.textContent =
      "Selected seats: " + selectedSeats.sort((a, b) => a - b).join(", ");
  }

  const passengersInput = document.getElementById("bookingPassengers");
  if (passengersInput) {
    passengersInput.value = selectedSeats.length || 1;
  }

  updatePricePreview();
}

// =============================
// BOOKING FLOW
// =============================
function openBookingModal(flightId) {
  if (!currentUser) {
    alert("Щоб забронювати рейс, увійдіть або створіть обліковий запис.");
    authModal.classList.remove("hidden");
    return;
  }

  selectedFlightId = flightId;
  selectedFlight = flights.find((f) => f.id === flightId);
  const flight = selectedFlight;
  if (!flight) return;

  bookingFlightInfo.textContent = `${flight.from} → ${flight.to}, ${flight.date}, $${flight.price}`;

  bookingForm.reset();
  const passengersInput = document.getElementById("bookingPassengers");
  if (passengersInput) {
    passengersInput.readOnly = true;
    passengersInput.value = 1;
  }

  renderSeatGrid(flight);

  ["extraMeal", "extraInsurance", "extraUpgrade"].forEach((id) => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = false;
  });

  updatePricePreview();

  bookingModal.classList.remove("hidden");
}

closeBookingModalBtn.addEventListener("click", () => {
  bookingModal.classList.add("hidden");
  selectedFlightId = null;
  selectedSeats = [];
  selectedFlight = null;
});

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedFlightId) return;

  if (!currentUser) {
    alert("Бронювання недоступне без входу в систему.");
    bookingModal.classList.add("hidden");
    authModal.classList.remove("hidden");
    return;
  }

  const name = document.getElementById("bookingName").value.trim();
  const email = document.getElementById("bookingEmail").value.trim();

  if (!name || !email) {
    alert("Заповніть ім'я та email.");
    return;
  }

  if (!selectedSeats.length) {
    alert("Оберіть хоча б одне місце.");
    return;
  }

  const flight = flights.find((f) => f.id === selectedFlightId);
  if (!flight) {
    alert("Рейс не знайдено.");
    return;
  }

  const extras = {
    meal: document.getElementById("extraMeal")?.checked || false,
    insurance: document.getElementById("extraInsurance")?.checked || false,
    upgrade: document.getElementById("extraUpgrade")?.checked || false,
  };

  const bookingPayload = {
    flightId: flight.id,
    userEmail: currentUser.email,
    name,
    email,
    seats: selectedSeats.slice(),
    extras,
  };

  try {
    const created = await apiPost("/bookings", bookingPayload);

    alert(
      `Бронювання створено!\nBooking ID: ${created.id}\nTotal: $${
        created.totalPrice ?? "N/A"
      }\nТепер виконаємо оплату.`
    );

    bookingModal.classList.add("hidden");
    selectedFlightId = null;
    selectedSeats = [];
    selectedFlight = null;

    await reloadAndRenderResults();
    await renderBookings();
    await renderAdminFlights();

    openPaymentModal(created);
  } catch (err) {
    alert("Помилка бронювання: " + err.message);
  }
});

// =============================
// PAYMENT FLOW
// =============================
function openPaymentModal(booking) {
  payingBookingId = booking.id;
  payingBookingTotal = booking.totalPrice ?? 0;

  paymentForm.reset();
  paymentBookingInfo.textContent = `Booking #${booking.id} · Total: $${
    booking.totalPrice ?? 0
  }`;

  paymentModal.classList.remove("hidden");
}

closePaymentModalBtn.addEventListener("click", () => {
  paymentModal.classList.add("hidden");
  payingBookingId = null;
  payingBookingTotal = null;
});

paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!payingBookingId) return;

  const cardNumber = document.getElementById("cardNumber").value.trim();
  const cardName = document.getElementById("cardName").value.trim();
  const cardExpiry = document.getElementById("cardExpiry").value.trim();
  const cardCvv = document.getElementById("cardCvv").value.trim();

  if (!cardNumber || cardNumber.replace(/\s/g, "").length < 8) {
    alert("Введіть умовний номер картки (мінімум 8 цифр).");
    return;
  }
  if (!cardName || !cardExpiry || !cardCvv) {
    alert("Заповніть усі поля картки (демо).");
    return;
  }

  try {
    const paid = await apiPost(`/bookings/${payingBookingId}/pay`, {
      method: "Card",
      cardNumber,
    });

    paymentModal.classList.add("hidden");
    payingBookingId = null;
    payingBookingTotal = null;

    alert(
      `Оплата виконана!\nBooking #${paid.id}\nStatus: ${paid.paymentStatus}`
    );

    await renderBookings();

    const url = `${API_ROOT}/report/booking/${paid.id}`;
    window.open(url, "_blank");
  } catch (err) {
    alert("Помилка оплати: " + err.message);
  }
});

// =============================
// AUTH (FIXED FOR EMAIL VERIFICATION)
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

loginBtn.addEventListener("click", () => {
  authModal.classList.remove("hidden");
});

closeAuthModalBtn.addEventListener("click", () => {
  authModal.classList.add("hidden");
});

logoutBtn.addEventListener("click", () => {
  currentUser = null;
  saveCurrentUser(null);
  updateAuthUI();
});

// НОВА ЛОГІКА ВХОДУ ТА РЕЄСТРАЦІЇ
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  if (!email || !password) {
    alert("Введіть email та пароль.");
    return;
  }

  try {
    // 1. Спроба ВХОДУ (Login)
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    // A) Вхід успішний (200 OK)
    if (loginRes.ok) {
      const user = await loginRes.json();
      currentUser = user;
      saveCurrentUser(currentUser);
      updateAuthUI();
      authModal.classList.add("hidden");
      return;
    }

    const loginData = await loginRes.json();

    // B) Вхід не вдався: ПОШТА НЕ ПІДТВЕРДЖЕНА (403)
    if (loginRes.status === 403) {
      alert(
        loginData.error ||
          "Будь ласка, спочатку підтвердіть вашу пошту (перевірте email)."
      );
      return; // Зупиняємось, не пропонуємо реєстрацію
    }

    // C) Вхід не вдався: Користувача немає або пароль невірний
    // Запитуємо про реєстрацію
    if (
      !confirm(
        "Користувач не знайдений або пароль невірний. Створити новий обліковий запис?"
      )
    ) {
      return;
    }

    // 2. Спроба РЕЄСТРАЦІЇ (Register)
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const regData = await regRes.json();

    if (regRes.ok) {
      // D) Реєстрація успішна
      // ВАЖЛИВО: Ми НЕ входимо в систему, а просимо перевірити пошту
      alert(
        regData.message ||
          "Реєстрація успішна! Будь ласка, перевірте пошту для активації акаунту."
      );

      // Очищаємо поля
      document.getElementById("authEmail").value = "";
      document.getElementById("authPassword").value = "";

      // currentUser залишається null
    } else {
      // E) Помилка реєстрації
      alert("Помилка реєстрації: " + (regData.error || "Unknown error"));
    }
  } catch (err) {
    console.error(err);
    alert("Помилка з'єднання з сервером.");
  }
});

// =============================
// ADMIN: FLIGHT FORM
// =============================
flightForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("flightId").value;
  const from = document.getElementById("flightFrom").value.trim();
  const to = document.getElementById("flightTo").value.trim();
  const date = document.getElementById("flightDate").value.trim();
  const duration = document.getElementById("flightDuration").value.trim();
  const airline = document.getElementById("flightAirline").value.trim();
  const price = Number(document.getElementById("flightPrice").value);
  const seatsInput = document.getElementById("flightSeats");
  const seats = seatsInput ? Number(seatsInput.value || 0) : 0;

  if (!from || !to || !date || !duration || !airline || !price || !seats) {
    alert("Please fill all fields (including seats).");
    return;
  }

  const payload = {
    from,
    to,
    date,
    duration,
    airline,
    price,
    seats,
  };

  try {
    if (id) {
      await apiPut(`/flights/${id}`, payload);
    } else {
      await apiPost("/flights", payload);
    }

    flightForm.reset();
    document.getElementById("flightId").value = "";

    await renderAdminFlights();
    await reloadAndRenderResults();
  } catch (err) {
    alert("Помилка збереження рейсу: " + err.message);
  }
});

resetFlightFormBtn.addEventListener("click", () => {
  flightForm.reset();
  document.getElementById("flightId").value = "";
});

// =============================
// HELP FORM
// =============================
if (helpForm) {
  helpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = helpMessageInput.value.trim();
    if (!msg) {
      alert("Напишіть повідомлення для підтримки.");
      return;
    }
    try {
      await apiPost("/help", {
        userEmail: currentUser ? currentUser.email : null,
        message: msg,
      });
      alert("Повідомлення надіслано адміну. Ми зв'яжемося з вами на email.");
      helpForm.reset();
    } catch (err) {
      alert("Не вдалося надіслати повідомлення: " + err.message);
    }
  });
}

// =============================
// INIT
// =============================
async function init() {
  updateAuthUI();

  try {
    flights = await apiGet("/flights");
    fillCityLists(flights);
  } catch (e) {
    console.error(e);
    flights = [];
    alert("Не вдалося завантажити рейси з сервера.");
  }

  renderRecommended();
  renderResults(flights);
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((e) => console.error(e));

  ["extraMeal", "extraInsurance", "extraUpgrade"].forEach((id) => {
    const cb = document.getElementById(id);
    if (cb) {
      cb.addEventListener("change", () => {
        updatePricePreview();
      });
    }
  });
});