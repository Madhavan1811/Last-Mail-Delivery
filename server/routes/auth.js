const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const router = express.Router();

const SALT_ROUNDS = 10;
const VALID_ROLES = ['customer', 'agent']; // admin is seeded only

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Role must be "customer" or "agent".' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone`,
      [name, email, passwordHash, role, phone || null]
    );
    const user = result.rows[0];

    // If agent, create agent record (zone assigned later by admin)
    if (role === 'agent') {
      // Pick first zone as default — admin can reassign
      const firstZone = await db.query('SELECT id FROM zones LIMIT 1');
      if (firstZone.rows.length > 0) {
        await db.query(
          'INSERT INTO agents (user_id, zone_id, is_available) VALUES ($1, $2, TRUE)',
          [user.id, firstZone.rows[0].id]
        );
      }
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.status(201).json({ user: req.session.user });
  } catch (err) {
    console.error('[AUTH] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, role, phone FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    };
    res.json({ user: req.session.user });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

// GET /auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
