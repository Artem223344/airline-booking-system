require("dotenv").config(); // 1. Має бути найпершим
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); // 2. Підключаємо один раз
const fs = require("fs");
const path = require("path");
const { calculateTotal } = require("./utils");
// Переконайся, що шлях правильний
const { sendVerificationEmail, sendTicketEmail } = require("./mailer");

const app = express(); // 3. Створюємо додаток (app) тут
const PORT = process.env.PORT || 3000;

// 4. Це дозволить кнопці з пошти працювати і на локалці, і на сервері
// (На Render потім додаси змінну CLIENT_URL)
const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5500/airline-project/ui/index.html";

app.use(cors()); // 5. Тепер це спрацює, бо app вже існує
app.use(bodyParser.json());

const DB_PATH = path.join(__dirname, "db.json");

// =============================
// DB HELPERS
// =============================

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      flights: [
        {
          id: 1,
          from: "Kyiv",
          to: "London",
          date: "2026-02-01",
          duration: "3h 20m",
          airline: "AirlineServices",
          price: 120,
          totalSeats: 24,
          seats: 24,
          bookedSeats: [],
        },
        {
          id: 2,
          from: "Kyiv",
          to: "Paris",
          date: "2026-02-01",
          duration: "3h 05m",
          airline: "AirlineServices",
          price: 130,
          totalSeats: 24,
          seats: 24,
          bookedSeats: [],
        },
        {
          id: 3,
          from: "Lviv",
          to: "Warsaw",
          date: "2026-02-01",
          duration: "1h 10m",
          airline: "PolAir",
          price: 70,
          totalSeats: 20,
          seats: 20,
          bookedSeats: [],
        },
        {
          id: 4,
          from: "Kyiv",
          to: "London",
          date: "2026-02-02",
          duration: "3h 15m",
          airline: "UKR Air",
          price: 140,
          totalSeats: 18,
          seats: 18,
          bookedSeats: [],
        },
      ],
      bookings: [],
      users: [
        {
          id: 1,
          email: "admin@airline.com",
          password: "admin",
          role: "admin",
          isVerified: true, // Адмін завжди активний
          verificationToken: null
        },
      ],
      supportMessages: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw || "{}");
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

// =============================
// AUTH API (LOGIN / REGISTER / VERIFY)
// =============================

app.post("/api/auth/login", (req, res) => {
  const db = readDb();
  const users = db.users || [];

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = users.find((u) => u.email === email);
  
  // Перевірка пароля
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // === ПЕРЕВІРКА ВЕРИФІКАЦІЇ ===
  // Якщо це не адмін і пошта не підтверджена — не пускаємо
  if (user.role !== 'admin' && user.isVerified === false) {
      return res.status(403).json({ error: "Please verify your email first! Check your inbox." });
  }
  // =============================

  res.json({ email: user.email, role: user.role });
});

app.post("/api/auth/register", (req, res) => {
  const db = readDb();
  const users = db.users || [];

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(400).json({ error: "User already exists" });
  }

  const role = email === "admin@airline.com" ? "admin" : "user";
  
  // Генеруємо токен для підтвердження
  const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const newUser = {
    id: Date.now(),
    email,
    password,
    role,
    // Адмін активний одразу, звичайний юзер - ні
    isVerified: role === 'admin' ? true : false,
    verificationToken: role === 'admin' ? null : verificationToken
  };

  users.push(newUser);
  db.users = users;
  writeDb(db);

  // === ВІДПРАВКА ЛИСТА З ПОСИЛАННЯМ ===
  if (role !== 'admin') {
      sendVerificationEmail(email, verificationToken);
  }
  // ====================================

  res.status(201).json({ message: "Registration successful! Please check your email to verify." });
});

// === НОВИЙ МАРШРУТ: Клік по посиланню з пошти ===
app.get("/api/auth/verify", (req, res) => {
    const token = req.query.token;
    
    if (!token) {
        return res.status(400).send("Invalid link");
    }

    const db = readDb();
    const users = db.users || [];

    // Шукаємо користувача з таким токеном
    const user = users.find(u => u.verificationToken === token);

    if (!user) {
        return res.status(400).send("<h1>Error</h1><p>Invalid or expired token.</p>");
    }

    // Активуємо
    user.isVerified = true;
    user.verificationToken = null; // Токен більше не потрібен
    
    db.users = users;
    writeDb(db);

    // Показуємо красиву сторінку
    res.send(`
        <html>
        <head>
            <title>Email Verified</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; background-color: #f4f4f4; }
                .container { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                h1 { color: #2f6bff; }
                a { display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #2f6bff; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Email Verified! ✅</h1>
                <p>Your account has been successfully activated.</p>
                <a href="${FRONTEND_URL}">Go to Login Page</a>
            </div>
        </body>
        </html>
    `);
});

// =============================
// FLIGHTS API
// =============================

app.get("/api/flights", (req, res) => {
  const db = readDb();
  res.json(db.flights || []);
});

app.post("/api/flights", (req, res) => {
  const db = readDb();
  const flights = db.flights || [];

  const { from, to, date, duration, airline, price, seats } = req.body;

  if (!from || !to || !date || !duration || !airline || !price || !seats) {
    return res.status(400).json({ error: "Missing required flight fields" });
  }

  const totalSeats = Number(seats);

  const newFlight = {
    id: Date.now(),
    from,
    to,
    date,
    duration,
    airline,
    price: Number(price),
    totalSeats,
    seats: totalSeats,
    bookedSeats: [],
  };

  flights.push(newFlight);
  db.flights = flights;
  writeDb(db);

  res.status(201).json(newFlight);
});

app.put("/api/flights/:id", (req, res) => {
  const db = readDb();
  const flights = db.flights || [];

  const id = Number(req.params.id);
  const idx = flights.findIndex((f) => f.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Flight not found" });
  }

  const flight = flights[idx];

  let { from, to, date, duration, airline, price, seats } = req.body;

  if (!Array.isArray(flight.bookedSeats)) {
    flight.bookedSeats = [];
  }
  if (typeof flight.totalSeats !== "number") {
    flight.totalSeats = flight.seats ?? 0;
  }

  const newTotalSeats = seats != null ? Number(seats) : flight.totalSeats;

  flight.from = from ?? flight.from;
  flight.to = to ?? flight.to;
  flight.date = date ?? flight.date;
  flight.duration = duration ?? flight.duration;
  flight.airline = airline ?? flight.airline;
  flight.price = price != null ? Number(price) : flight.price;
  flight.totalSeats = newTotalSeats;

  const used = flight.bookedSeats.length;
  flight.seats = Math.max(0, newTotalSeats - used);

  flights[idx] = flight;
  db.flights = flights;
  writeDb(db);

  res.json(flight);
});

app.delete("/api/flights/:id", (req, res) => {
  const db = readDb();
  let flights = db.flights || [];

  const id = Number(req.params.id);
  const exists = flights.some((f) => f.id === id);
  if (!exists) {
    return res.status(404).json({ error: "Flight not found" });
  }

  flights = flights.filter((f) => f.id !== id);
  db.flights = flights;
  writeDb(db);

  res.json({ success: true });
});

// =============================
// BOOKINGS API
// =============================

app.get("/api/bookings", (req, res) => {
  const db = readDb();
  let bookings = db.bookings || [];

  const { userEmail } = req.query;
  if (userEmail) {
    bookings = bookings.filter((b) => b.userEmail === userEmail);
  }

  res.json(bookings);
});

app.post("/api/bookings", (req, res) => {
  const db = readDb();
  const bookings = db.bookings || [];
  const flights = db.flights || [];

  const { flightId, userEmail, name, email, seats, extras } = req.body;

  if (!flightId || !userEmail || !name || !email || !Array.isArray(seats)) {
    return res.status(400).json({ error: "Missing booking fields" });
  }

  const flight = flights.find((f) => f.id === Number(flightId));
  if (!flight) {
    return res.status(404).json({ error: "Flight not found" });
  }

  if (!Array.isArray(flight.bookedSeats)) {
    flight.bookedSeats = [];
  }
  if (typeof flight.totalSeats !== "number") {
    flight.totalSeats = flight.seats ?? 0;
  }

  const requestedSeats = seats.map(Number);

  if (requestedSeats.length === 0) {
    return res.status(400).json({ error: "No seats selected" });
  }

  const invalid = requestedSeats.some((s) => s < 1 || s > flight.totalSeats);
  if (invalid) {
    return res.status(400).json({ error: "Invalid seat numbers" });
  }

  const already = new Set(flight.bookedSeats);
  const conflict = requestedSeats.some((s) => already.has(s));
  if (conflict) {
    return res.status(400).json({ error: "Some seats are already taken" });
  }

  const passengers = requestedSeats.length;

  // Використовуємо функцію з utils.js
  const ex = extras || {};
  const pricing = calculateTotal(flight.price, passengers, ex);
  const { basePrice, extraPrice, totalPrice } = pricing;

  flight.bookedSeats = [...flight.bookedSeats, ...requestedSeats];
  const usedCount = flight.bookedSeats.length;
  flight.seats = Math.max(0, flight.totalSeats - usedCount);

  const newBooking = {
    id: Date.now(),
    flightId: flight.id,
    userEmail,
    name,
    email,
    passengers,
    seats: requestedSeats,
    extras: ex,
    basePrice,
    extraPrice,
    totalPrice,
    status: "Confirmed",
    paymentStatus: "Unpaid",
    paymentInfo: null,
    createdAt: new Date().toISOString(),
  };

  bookings.push(newBooking);
  db.bookings = bookings;
  db.flights = flights;
  writeDb(db);

  res.status(201).json(newBooking);
});

app.put("/api/bookings/:id/cancel", (req, res) => {
  const db = readDb();
  const bookings = db.bookings || [];
  const flights = db.flights || [];

  const id = Number(req.params.id);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status === "Canceled") {
    return res.status(400).json({ error: "Booking already canceled" });
  }

  const flight = flights.find((f) => f.id === booking.flightId);

  if (flight) {
    if (!Array.isArray(flight.bookedSeats)) {
      flight.bookedSeats = [];
    }
    if (typeof flight.totalSeats !== "number") {
      flight.totalSeats = flight.seats ?? 0;
    }

    const bookingSeats = booking.seats || [];
    const removeSet = new Set(bookingSeats);
    flight.bookedSeats = flight.bookedSeats.filter((s) => !removeSet.has(s));

    const usedCount = flight.bookedSeats.length;
    flight.seats = Math.max(0, flight.totalSeats - usedCount);
  }

  booking.status = "Canceled";
  booking.canceledAt = new Date().toISOString();

  db.bookings = bookings;
  db.flights = flights;
  writeDb(db);

  res.json(booking);
});

app.post("/api/bookings/:id/pay", (req, res) => {
  const db = readDb();
  const bookings = db.bookings || [];

  const id = Number(req.params.id);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status === "Canceled") {
    return res.status(400).json({ error: "Cannot pay for canceled booking" });
  }

  if (booking.paymentStatus === "Paid") {
    return res.status(400).json({ error: "Booking already paid" });
  }

  const { cardNumber, method } = req.body || {};
  const last4 =
    typeof cardNumber === "string" && cardNumber.length >= 4
      ? cardNumber.slice(-4)
      : null;

  booking.paymentStatus = "Paid";
  booking.paymentInfo = {
    method: method || "Card",
    paidAt: new Date().toISOString(),
    last4,
  };

  db.bookings = bookings;
  writeDb(db);

  // === ВІДПРАВКА КВИТКА ===
  const flights = db.flights || [];
  const flight = flights.find(f => f.id === booking.flightId);
  if (flight) {
      sendTicketEmail(booking, flight);
  }
  // ======================

  res.json(booking);
});

// =============================
// HELP / SUPPORT API
// =============================

app.post("/api/help", (req, res) => {
  const db = readDb();
  const list = db.supportMessages || [];

  const { userEmail, message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const msg = {
    id: Date.now(),
    userEmail: userEmail || null,
    message: message.trim(),
    status: "new",
    createdAt: new Date().toISOString(),
  };

  list.push(msg);
  db.supportMessages = list;
  writeDb(db);

  res.status(201).json(msg);
});

app.get("/api/help", (req, res) => {
  const db = readDb();
  res.json(db.supportMessages || []);
});

// =============================
// HTML REPORT (TICKET)
// =============================

app.get("/report/booking/:id", (req, res) => {
  const db = readDb();
  const bookings = db.bookings || [];
  const flights = db.flights || [];

  const id = Number(req.params.id);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).send("Booking not found");
  }

  const flight = flights.find((f) => f.id === booking.flightId);

  const passengers =
    booking.passengers != null
      ? booking.passengers
      : booking.seats
      ? booking.seats.length
      : 1;

  const flightPrice = flight ? Number(flight.price || 0) : 0;
  const computedBase = flightPrice * passengers;
  const basePrice =
    booking.basePrice && booking.basePrice > 0
      ? Number(booking.basePrice)
      : computedBase;

  const extras = booking.extras || {};
  let extraPrice = 0;
  if (extras.meal) extraPrice += 20 * passengers;
  if (extras.insurance) extraPrice += 15 * passengers;
  if (extras.upgrade) extraPrice += 50 * passengers;

  if (booking.extraPrice && booking.extraPrice > 0) {
    extraPrice = Number(booking.extraPrice);
  }

  const totalPrice =
    booking.totalPrice && booking.totalPrice > 0
      ? Number(booking.totalPrice)
      : basePrice + extraPrice;

  const extrasList =
    [
      extras.meal && "Meal",
      extras.insurance && "Insurance",
      extras.upgrade && "Upgrade",
    ]
      .filter(Boolean)
      .join(", ") || "None";

  const paid =
    booking.paymentStatus === "Paid" && booking.paymentInfo
      ? `Paid (${booking.paymentInfo.method}${
          booking.paymentInfo.last4 ? " ••••" + booking.paymentInfo.last4 : ""
        }) on ${booking.paymentInfo.paidAt}`
      : "Not paid";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Ticket #${booking.id}</title>
<style>
body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f3f4f6;
    margin: 0;
    padding: 20px;
}
.ticket {
    max-width: 700px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 10px 30px rgba(15,23,42,0.12);
}
h1 {
    margin-top: 0;
    font-size: 24px;
}
.section-title {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b7280;
    margin-bottom: 4px;
}
.row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}
.label {
    color: #6b7280;
    font-size: 13px;
}
.value {
    font-weight: 600;
}
.total {
    font-size: 18px;
    color: #111827;
}
.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
}
.badge-paid {
    background: #dcfce7;
    color: #166534;
}
.badge-unpaid {
    background: #fee2e2;
    color: #b91c1c;
}
</style>
</head>
<body>
<div class="ticket">
  <h1>AirlineServices – E-Ticket</h1>
  <p class="label">Booking ID: <span class="value">#${booking.id}</span></p>

  <div class="section">
    <div class="section-title">Passenger</div>
    <div class="row">
      <div>
        <div class="label">Name</div>
        <div class="value">${booking.name}</div>
      </div>
      <div>
        <div class="label">Email</div>
        <div class="value">${booking.email}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Flight</div>
    <div class="row">
      <div>
        <div class="label">Route</div>
        <div class="value">${
          flight ? `${flight.from} → ${flight.to}` : "N/A"
        }</div>
      </div>
      <div>
        <div class="label">Date</div>
        <div class="value">${flight ? flight.date : "N/A"}</div>
      </div>
    </div>
    <div class="row">
      <div>
        <div class="label">Airline</div>
        <div class="value">${flight ? flight.airline : "N/A"}</div>
      </div>
      <div>
        <div class="label">Seats</div>
        <div class="value">${(booking.seats || []).join(", ")}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Extras & Price</div>
    <div class="row">
      <div>
        <div class="label">Passengers</div>
        <div class="value">${passengers}</div>
      </div>
      <div>
        <div class="label">Extras</div>
        <div class="value">${extrasList}</div>
      </div>
    </div>
    <div class="row">
      <div>
        <div class="label">Base price</div>
        <div class="value">$${basePrice.toFixed(2)}</div>
      </div>
      <div>
        <div class="label">Extras price</div>
        <div class="value">$${extraPrice.toFixed(2)}</div>
      </div>
    </div>
    <div class="row">
      <div class="total">Total: $${totalPrice.toFixed(2)}</div>
      <div>
        <span class="badge ${
          booking.paymentStatus === "Paid" ? "badge-paid" : "badge-unpaid"
        }">
          ${booking.paymentStatus || "Unpaid"}
        </span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payment</div>
    <p class="label">${paid}</p>
  </div>
</div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// =============================
// START SERVER
// =============================

module.exports = app;

// Запускаємо сервер тільки якщо файл запущено напряму
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}