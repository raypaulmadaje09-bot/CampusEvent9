import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ---------------- MYSQL POOL ----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

// ---------------- API ROUTES ----------------
app.get("/api/health", (req, res) => {
  res.json({ status: "UP" });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ db: "connected", result: rows[0].result });
  } catch (err) {
    res.status(500).json({ db: "failed", error: err.message });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM events ORDER BY date DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SERVE FRONTEND ----------------
const __dirname = path.resolve();

// IMPORTANT: make sure dist exists after build
app.use(express.static(path.join(__dirname, "dist")));

// React fallback (FIXED)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
