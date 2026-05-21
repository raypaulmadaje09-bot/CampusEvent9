/**
 * server.js
 * CampusPulse Backend
 * Works with MySQL, preserves front-end design
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
app.use(express.static(path.join(__dirname, 'dist'))); // Serve front-end

// -----------------------------
// MySQL Connection Pool
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
// Health Check
// -----------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'CampusPulse Node Active' });
});

// -----------------------------
// LOGIN
// -----------------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1',
      [email, password]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
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
    console.error('Login Error:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
  }
});

// -----------------------------
// USERS CRUD
// -----------------------------
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  try {
    await pool.query(
      'INSERT INTO users (id, name, email, password, role, avatar, canRequestEvents) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.email, u.password, u.role, u.avatar, u.canRequestEvents ? 1 : 0]
    );
    res.status(201).json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=?, email=?, password=?, role=?, avatar=?, canRequestEvents=? WHERE id=?',
      [u.name, u.email, u.password, u.role, u.avatar, u.canRequestEvents ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// EVENTS CRUD
// -----------------------------
app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  const e = req.body;
  try {
    await pool.query(
      'INSERT INTO events (id, title, description, date, startTime, endTime, location, category, organizer, attendees, image, isPopular, isLive, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [e.id, e.title, e.description, e.date, e.startTime, e.endTime, e.location, e.category, e.organizer, e.attendees, e.image, e.isPopular ? 1 : 0, e.isLive ? 1 : 0, e.status]
    );
    res.status(201).json(e);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const e = req.body;
  try {
    await pool.query(
      'UPDATE events SET title=?, description=?, date=?, startTime=?, endTime=?, location=?, category=?, organizer=?, image=?, isPopular=?, isLive=?, status=? WHERE id=?',
      [e.title, e.description, e.date, e.startTime, e.endTime, e.location, e.category, e.organizer, e.image, e.isPopular ? 1 : 0, e.isLive ? 1 : 0, e.status, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM events WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// FEEDBACK & REPLIES
// -----------------------------
app.get('/api/feedback', async (req, res) => {
  try {
    const [messages] = await pool.query('SELECT * FROM feedback ORDER BY timestamp DESC');
    for (let msg of messages) {
      const [replies] = await pool.query('SELECT * FROM replies WHERE feedback_id=? ORDER BY timestamp ASC', [msg.id]);
      msg.replies = replies;
    }
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  const m = req.body;
  try {
    await pool.query(
      'INSERT INTO feedback (id, senderName, senderEmail, subject, message, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.id, m.senderName, m.senderEmail, m.subject, m.message, m.timestamp, m.status]
    );
    res.status(201).json(m);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { sender, text, timestamp } = req.body;
  try {
    await pool.query(
      'INSERT INTO replies (feedback_id, sender, text, timestamp) VALUES (?, ?, ?, ?)',
      [id, sender, text, timestamp]
    );
    await pool.query('UPDATE feedback SET status="replied" WHERE id=?', [id]);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// AUDIT LOGS
// -----------------------------
app.get('/api/audit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit', async (req, res) => {
  const l = req.body;
  try {
    await pool.query(
      'INSERT INTO audit_logs (id, timestamp, action, actor, type, details) VALUES (?, ?, ?, ?, ?, ?)',
      [l.id, l.timestamp, l.action, l.actor, l.type, l.details]
    );
    res.status(201).json(l);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// SITE CONFIG
// -----------------------------
app.get('/api/config', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM
