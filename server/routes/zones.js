const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// All routes require admin
router.use(requireRole('admin'));

// GET /admin/zones
router.get('/', async (req, res) => {
  try {
    const zones = await db.query('SELECT * FROM zones ORDER BY name');
    // Attach area counts
    const areas = await db.query(
      'SELECT zone_id, COUNT(*) as area_count FROM zone_areas GROUP BY zone_id'
    );
    const areaMap = {};
    areas.rows.forEach(r => { areaMap[r.zone_id] = parseInt(r.area_count); });
    const result = zones.rows.map(z => ({ ...z, area_count: areaMap[z.id] || 0 }));
    res.json(result);
  } catch (err) {
    console.error('[ZONES] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch zones.' });
  }
});

// POST /admin/zones
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Zone name is required.' });
    const result = await db.query(
      'INSERT INTO zones (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Zone already exists.' });
    res.status(500).json({ error: 'Failed to create zone.' });
  }
});

// PUT /admin/zones/:id
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Zone name is required.' });
    const result = await db.query(
      'UPDATE zones SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zone not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Zone name already exists.' });
    res.status(500).json({ error: 'Failed to update zone.' });
  }
});

// DELETE /admin/zones/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM zones WHERE id = $1', [req.params.id]);
    res.json({ message: 'Zone deleted.' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete zone — it has agents or orders.' });
    }
    res.status(500).json({ error: 'Failed to delete zone.' });
  }
});

// GET /admin/zones/:id/areas
router.get('/:id/areas', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM zone_areas WHERE zone_id = $1 ORDER BY pincode_or_area',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch zone areas.' });
  }
});

// POST /admin/zones/:id/areas
router.post('/:id/areas', async (req, res) => {
  try {
    const { pincode_or_area } = req.body;
    if (!pincode_or_area) return res.status(400).json({ error: 'Pincode/area is required.' });

    // Check zone exists
    const zone = await db.query('SELECT id FROM zones WHERE id = $1', [req.params.id]);
    if (zone.rows.length === 0) return res.status(404).json({ error: 'Zone not found.' });

    const result = await db.query(
      'INSERT INTO zone_areas (zone_id, pincode_or_area) VALUES ($1, $2) RETURNING *',
      [req.params.id, pincode_or_area.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Pincode already assigned to a zone.' });
    res.status(500).json({ error: 'Failed to add area.' });
  }
});

// DELETE /admin/zones/:id/areas/:areaId
router.delete('/:id/areas/:areaId', async (req, res) => {
  try {
    await db.query('DELETE FROM zone_areas WHERE id = $1 AND zone_id = $2', [req.params.areaId, req.params.id]);
    res.json({ message: 'Area removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove area.' });
  }
});

// GET /admin/zones/all-areas (public-ish — needed for order creation)
router.get('/all-areas', async (req, res) => {
  try {
    const result = await db.query('SELECT za.*, z.name as zone_name FROM zone_areas za JOIN zones z ON z.id = za.zone_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all areas.' });
  }
});

module.exports = router;
