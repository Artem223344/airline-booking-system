const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const DB_PATH = path.join(__dirname, "db.json");

// =============================
// DB HELPERS
// =============================

function readDb() {
  if (!fs.existsSync(DB_PATH)) return {};
  const raw = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw || "{}");
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

// =============================
// FLIGHTS API
// =============================

app.get("/api/flights", (req, res) => {
  const db = readDb();
  res.json(db.flights || []);
});

// =============================
// AUTH API (NEW)
// =============================

app.post("/api/auth/login", (req, res) => {
  const db = readDb();
  const users = db.users || [];

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

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

  // Перший юзер стає адміном (для демо), інші - юзерами
  const role = email.includes("admin") ? "admin" : "user";

  const newUser = {
    id: Date.now(),
    email,
    password,
    role,
  };

  users.push(newUser);
  db.users = users;
  writeDb(db);

  res.status(201).json({ email: newUser.email, role: newUser.role });
});

// =============================
// START SERVER
// =============================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
