/**
 * server.js
 * CampusPulse Backend (FIXED + STABLE)
 */

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// -----------------------------
// STATIC FRONTEND (Vite build)
// -----------------------------
app.use(express.static(path.join(__dirname, 'dist')));

// -----------------------------
// MYSQL POOL
// -----------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// -----------------------------
// HEALTH CHECK
// -----------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP' });
});

// -----------------------------
// LOGIN
// -----------------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email=? AND password=? LIMIT 1',
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      canRequestEvents: !!user.canRequestEvents,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// USERS
// -----------------------------
app.get('/api/users', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users');
  res.json(rows);
});

// -----------------------------
// EVENTS
// -----------------------------
app.get('/api/events', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM events ORDER BY date DESC');
  res.json(rows);
});

// -----------------------------
// FEEDBACK
// -----------------------------
app.get('/api/feedback', async (req, res) => {
  const [messages] = await pool.query(
    'SELECT * FROM feedback ORDER BY timestamp DESC'
  );

  for (let msg of messages) {
    const [replies] = await pool.query(
      'SELECT * FROM replies WHERE feedback_id=? ORDER BY timestamp ASC',
      [msg.id]
    );
    msg.replies = replies;
  }

  res.json(messages);
});

// -----------------------------
// AUDIT LOGS
// -----------------------------
app.get('/api/audit', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM audit_logs ORDER BY timestamp DESC'
  );
  res.json(rows);
});

// -----------------------------
// CONFIG (FIXED - COMPLETED)
// -----------------------------
app.get('/api/config', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM site_config WHERE id = 1'
    );

    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// FRONTEND ROUTE (FIXED “Cannot GET /”)
// -----------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// -----------------------------
// START SERVER
// -----------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
