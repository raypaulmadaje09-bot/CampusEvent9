import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- FIX __dirname (REQUIRED) ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ---------------- MYSQL POOL ----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL
    ? { rejectUnauthorized: false }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ---------------- API ROUTES ----------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "UP" });
});

// DB test
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ db: "connected", result: rows[0].result });
  } catch (err) {
    res.status(500).json({ db: "failed", error: err.message });
  }
});

// ---------------- EVENTS ----------------
app.get("/api/events", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM events ORDER BY date DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    const e = req.body;

    await pool.query(
      `INSERT INTO events 
      (id,title,description,date,startTime,endTime,location,category,organizer,attendees,image,isPopular,isLive,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        e.id,
        e.title,
        e.description,
        e.date,
        e.startTime,
        e.endTime,
        e.location,
        e.category,
        e.organizer,
        e.attendees || 0,
        e.image,
        e.isPopular ? 1 : 0,
        e.isLive ? 1 : 0,
        e.status || "Pending",
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const e = req.body;

    await pool.query(
      `UPDATE events SET
        title=?,
        description=?,
        date=?,
        startTime=?,
        endTime=?,
        location=?,
        category=?,
        organizer=?,
        image=?,
        isPopular=?,
        isLive=?,
        status=?
      WHERE id=?`,
      [
        e.title,
        e.description,
        e.date,
        e.startTime,
        e.endTime,
        e.location,
        e.category,
        e.organizer,
        e.image,
        e.isPopular ? 1 : 0,
        e.isLive ? 1 : 0,
        e.status,
        id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM events WHERE id=?", [
      req.params.id,
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- USERS ----------------
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- FEEDBACK ----------------
app.get("/api/feedback", async (req, res) => {
  try {
    const [msgs] = await pool.query(
      "SELECT * FROM feedback ORDER BY timestamp DESC"
    );

    for (let m of msgs) {
      const [replies] = await pool.query(
        "SELECT * FROM replies WHERE feedback_id=? ORDER BY timestamp ASC",
        [m.id]
      );
      m.replies = replies;
    }

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AUDIT ----------------
app.get("/api/audit", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM audit_logs ORDER BY timestamp DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- CONFIG ----------------
app.get("/api/config", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM site_config WHERE id=1"
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- STATIC REACT BUILD ----------------
app.use(express.static(path.join(__dirname, "dist")));

// ---------------- FIX "Cannot GET /" ----------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
