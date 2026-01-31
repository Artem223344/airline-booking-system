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

// Читання БД
function readDb() {
  if (!fs.existsSync(DB_PATH)) return {};
  const raw = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw || "{}");
}

// =============================
// FLIGHTS API (READ ONLY)
// =============================
app.get("/api/flights", (req, res) => {
  const db = readDb();
  res.json(db.flights || []);
});

// Запуск
app.listen(PORT, () => {
  console.log(`Mock Server running on http://localhost:${PORT}`);
});
