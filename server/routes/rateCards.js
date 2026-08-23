const express = require('express');
const db = require('../db');
const { requireRole, requireLogin } = require('../middleware/auth');
const router = express.Router();

// GET /admin/rate-cards  (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM rate_cards ORDER BY order_type, zone_relation');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rate cards.' });
  }
});

// POST /admin/rate-cards
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { order_type, zone_relation, rate_per_kg, base_price } = req.body;
    if (!order_type || !zone_relation || rate_per_kg == null) {
      return res.status(400).json({ error: 'order_type, zone_relation, and rate_per_kg are required.' });
    }
    const result = await db.query(
      `INSERT INTO rate_cards (order_type, zone_relation, rate_per_kg, base_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [order_type, zone_relation, parseFloat(rate_per_kg), parseFloat(base_price) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Rate card for this combination already exists.' });
    res.status(500).json({ error: 'Failed to create rate card.' });
  }
});

// PUT /admin/rate-cards/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { rate_per_kg, base_price } = req.body;
    if (rate_per_kg == null) return res.status(400).json({ error: 'rate_per_kg is required.' });
    const result = await db.query(
      `UPDATE rate_cards SET rate_per_kg = $1, base_price = $2 WHERE id = $3 RETURNING *`,
      [parseFloat(rate_per_kg), parseFloat(base_price) || 0, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rate card not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rate card.' });
  }
});

// GET /admin/cod-surcharge
router.get('/cod-surcharge', requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cod_surcharge_config ORDER BY order_type');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch COD surcharge config.' });
  }
});

// PUT /admin/cod-surcharge/:id
router.put('/cod-surcharge/:id', requireRole('admin'), async (req, res) => {
  try {
    const { surcharge_amount } = req.body;
    if (surcharge_amount == null) return res.status(400).json({ error: 'surcharge_amount is required.' });
    const result = await db.query(
      `UPDATE cod_surcharge_config SET surcharge_amount = $1 WHERE id = $2 RETURNING *`,
      [parseFloat(surcharge_amount), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'COD surcharge not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update COD surcharge.' });
  }
});

// GET /rate-cards/public  — needed for order creation preview (any logged-in user)
router.get('/public', requireLogin, async (req, res) => {
  try {
    const rateCards = await db.query('SELECT * FROM rate_cards');
    const codSurcharges = await db.query('SELECT * FROM cod_surcharge_config');
    res.json({ rateCards: rateCards.rows, codSurcharges: codSurcharges.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rate data.' });
  }
});

module.exports = router;
