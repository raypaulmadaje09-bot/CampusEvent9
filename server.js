import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// ---------------- API ROUTES (UNCHANGED) ----------------
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

app.get("/api/config", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM site_config WHERE id = 1");
    res.json(rows[0]);
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

// ---------------- STATIC FRONTEND ----------------
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "dist")));

// ---------------- FIXED FALLBACK ROUTE ----------------
// (THIS is the only required fix)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
