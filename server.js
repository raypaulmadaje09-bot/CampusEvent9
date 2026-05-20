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
app.use(express.static(path.join(__dirname, 'dist')));

// ---------------- DB ----------------
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

// ---------------- HEALTH ----------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP' });
});

// ---------------- CONFIG (FIXED) ----------------
app.get('/api/config', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM site_config WHERE id = 1');
    res.json(rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const c = req.body;

    const sql = `
      UPDATE site_config SET
      campusName=?, heroHeadline=?, heroSubheadline=?, heroImage=?,
      footerText=?, logoImage=?, socialLinks=?,
      exploreTitle=?, exploreLinks=?, supportTitle=?, supportLinks=?
      WHERE id=1
    `;

    await pool.query(sql, [
      c.campusName,
      c.heroHeadline,
      c.heroSubheadline,
      c.heroImage,
      c.footerText,
      c.logoImage,
      JSON.stringify(c.socialLinks || []),
      c.exploreTitle,
      JSON.stringify(c.exploreLinks || []),
      c.supportTitle,
      JSON.stringify(c.supportLinks || []),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- EVENTS (FIXED) ----------------
app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY date DESC');

    // normalize booleans
    const data = rows.map(r => ({
      ...r,
      isPopular: !!r.isPopular,
      isLive: !!r.isLive,
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const e = req.body;

    await pool.query(
      `INSERT INTO events 
      (id, title, description, date, startTime, endTime, location, category, organizer, attendees, image, isPopular, isLive, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        e.status,
      ]
    );

    res.status(201).json(e);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const e = req.body;

    await pool.query(
      `UPDATE events SET
      title=?, description=?, date=?, startTime=?, endTime=?,
      location=?, category=?, organizer=?, attendees=?, image=?,
      isPopular=?, isLive=?, status=?
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
        e.attendees || 0,
        e.image,
        e.isPopular ? 1 : 0,
        e.isLive ? 1 : 0,
        e.status,
        id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- USERS (FIXED BOOLEAN) ----------------
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');

    const data = rows.map(u => ({
      ...u,
      canRequestEvents: !!u.canRequestEvents,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const u = req.body;

    await pool.query(
      `INSERT INTO users (id, name, email, password, role, avatar, canRequestEvents)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.name,
        u.email,
        u.password,
        u.role,
        u.avatar,
        u.canRequestEvents ? 1 : 0,
      ]
    );

    res.status(201).json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const u = req.body;

    await pool.query(
      `UPDATE users SET name=?, email=?, password=?, role=?, avatar=?, canRequestEvents=?
       WHERE id=?`,
      [
        u.name,
        u.email,
        u.password,
        u.role,
        u.avatar,
        u.canRequestEvents ? 1 : 0,
        req.params.id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- FEEDBACK (SAFE) ----------------
app.get('/api/feedback', async (req, res) => {
  try {
    const [msgs] = await pool.query('SELECT * FROM feedback ORDER BY timestamp DESC');

    for (const m of msgs) {
      const [replies] = await pool.query(
        'SELECT * FROM replies WHERE feedback_id=? ORDER BY timestamp ASC',
        [m.id]
      );
      m.replies = replies;
    }

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const m = req.body;

    await pool.query(
      `INSERT INTO feedback (id, senderName, senderEmail, subject, message, timestamp, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        m.id,
        m.senderName,
        m.senderEmail,
        m.subject,
        m.message,
        m.timestamp,
        m.status,
      ]
    );

    res.status(201).json(m);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback/:id/reply', async (req, res) => {
  try {
    const { sender, text, timestamp } = req.body;

    await pool.query(
      `INSERT INTO replies (feedback_id, sender, text, timestamp)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, sender, text, timestamp]
    );

    await pool.query(
      `UPDATE feedback SET status='replied' WHERE id=?`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- AUDIT ----------------
app.get('/api/audit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit', async (req, res) => {
  try {
    const l = req.body;

    await pool.query(
      `INSERT INTO audit_logs (id, timestamp, action, actor, type, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [l.id, l.timestamp, l.action, l.actor, l.type, l.details]
    );

    res.json(l);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- FRONTEND ----------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log('SERVER RUNNING ON PORT', PORT);
});
