import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ---------------- MYSQL CONNECTION POOL ----------------
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

// ---------------- HEALTH CHECK ----------------
app.get("/api/health", (req, res) => {
  res.json({ status: "UP" });
});

// ---------------- DB TEST ----------------
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({
      db: "connected",
      result: rows[0].result,
    });
  } catch (err) {
    res.status(500).json({
      db: "failed",
      error: err.message,
    });
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

    res.json({ success: true, id: e.id });
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

app.post("/api/feedback", async (req, res) => {
  try {
    const f = req.body;

    await pool.query(
      `INSERT INTO feedback 
      (id,senderName,senderEmail,recipientId,subject,message,timestamp,status)
      VALUES (?,?,?,?,?,?,?,?)`,
      [
        f.id,
        f.senderName,
        f.senderEmail,
        f.recipientId,
        f.subject,
        f.message,
        f.timestamp,
        f.status || "new",
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/feedback/:id/reply", async (req, res) => {
  try {
    const reply = req.body;
    const { id } = req.params;

    await pool.query(
      `INSERT INTO replies 
      (id, feedback_id, sender, senderName, text, timestamp)
      VALUES (?,?,?,?,?,?)`,
      [
        Math.random().toString(36).substr(2, 9),
        id,
        reply.sender,
        reply.senderName,
        reply.text,
        reply.timestamp,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AUDIT LOGS ----------------
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

app.post("/api/audit", async (req, res) => {
  try {
    const log = req.body;

    await pool.query(
      `INSERT INTO audit_logs 
      (id,timestamp,type,action,actor,details)
      VALUES (?,?,?,?,?,?)`,
      [
        log.id,
        log.timestamp,
        log.type,
        log.action,
        log.actor,
        log.details,
      ]
    );

    res.json({ success: true });
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

app.post("/api/config", async (req, res) => {
  try {
    const c = req.body;

    await pool.query(
      `UPDATE site_config SET
        campusName=?,
        heroHeadline=?,
        heroSubheadline=?,
        heroImage=?,
        footerText=?,
        logoImage=?,
        socialLinks=?,
        exploreTitle=?,
        exploreLinks=?,
        supportTitle=?,
        supportLinks=?
      WHERE id=1`,
      [
        c.campusName,
        c.heroHeadline,
        c.heroSubheadline,
        c.heroImage,
        c.footerText,
        c.logoImage,
        JSON.stringify(c.socialLinks),
        c.exploreTitle,
        JSON.stringify(c.exploreLinks),
        c.supportTitle,
        JSON.stringify(c.supportLinks),
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
