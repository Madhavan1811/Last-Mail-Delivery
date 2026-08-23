const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /admin/agents
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.is_available, a.zone_id,
              u.name, u.email, u.phone,
              z.name as zone_name,
              (SELECT COUNT(*) FROM orders o WHERE o.assigned_agent_id = a.id
                AND o.current_status NOT IN ('Delivered','Failed')) as active_orders
         FROM agents a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN zones z ON z.id = a.zone_id
         ORDER BY u.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[AGENTS] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch agents.' });
  }
});

// PATCH /admin/agents/:id/availability
router.patch('/:id/availability', requireRole('admin'), async (req, res) => {
  try {
    const { is_available } = req.body;
    if (is_available === undefined) {
      return res.status(400).json({ error: 'is_available (boolean) is required.' });
    }
    const result = await db.query(
      'UPDATE agents SET is_available = $1 WHERE id = $2 RETURNING *',
      [Boolean(is_available), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update availability.' });
  }
});

// PATCH /admin/agents/:id/zone
router.patch('/:id/zone', requireRole('admin'), async (req, res) => {
  try {
    const { zone_id } = req.body;
    if (!zone_id) return res.status(400).json({ error: 'zone_id is required.' });
    const result = await db.query(
      'UPDATE agents SET zone_id = $1 WHERE id = $2 RETURNING *',
      [zone_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update zone.' });
  }
});

module.exports = router;
