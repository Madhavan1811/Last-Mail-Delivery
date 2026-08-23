const express = require('express');
const db = require('../db');
const { requireLogin, requireRole } = require('../middleware/auth');
const { calculateCharge } = require('../services/rateEngine');
const { autoAssignAgent, manualAssignAgent } = require('../services/assignment');
const { notifyCustomer } = require('../services/notifications');
const router = express.Router();

// Helper: resolve pincode → zone
async function resolveZone(pincode) {
  const result = await db.query(
    `SELECT z.id, z.name FROM zone_areas za
       JOIN zones z ON z.id = za.zone_id
      WHERE LOWER(za.pincode_or_area) = LOWER($1)`,
    [pincode.trim()]
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------
// POST /orders  — Create order + charge calculation
// ---------------------------------------------------------------
router.post('/', requireLogin, async (req, res) => {
  try {
    const {
      pickup_address, drop_address,
      pickup_pincode, drop_pincode,
      length, breadth, height,
      actual_weight,
      order_type, payment_type,
      customer_id: bodyCustomerId,
    } = req.body;

    const user = req.session.user;
    // Admin can create on behalf of a customer
    const customerId = (user.role === 'admin' && bodyCustomerId) ? bodyCustomerId : user.id;

    // Validate required fields
    if (!pickup_address || !drop_address || !pickup_pincode || !drop_pincode ||
        !length || !breadth || !height || !actual_weight || !order_type || !payment_type) {
      return res.status(400).json({ error: 'All order fields are required.' });
    }

    // Resolve zones
    const pickupZone = await resolveZone(pickup_pincode);
    const dropZone   = await resolveZone(drop_pincode);

    if (!pickupZone || !dropZone) {
      return res.status(400).json({
        error: `Could not resolve zone for ${!pickupZone ? 'pickup' : 'drop'} pincode.`,
        hint: 'Available pincodes are listed in the Zone Management section.'
      });
    }

    // Fetch rate data
    const rateCardsResult   = await db.query('SELECT * FROM rate_cards');
    const codSurchargeResult = await db.query('SELECT * FROM cod_surcharge_config');

    // Calculate charge
    const breakdown = calculateCharge({
      pickupZoneId: pickupZone.id,
      dropZoneId:   dropZone.id,
      L: parseFloat(length),
      B: parseFloat(breadth),
      H: parseFloat(height),
      actualWeight: parseFloat(actual_weight),
      orderType: order_type,
      paymentType: payment_type,
      rateCards: rateCardsResult.rows,
      codSurcharges: codSurchargeResult.rows,
    });

    // Insert order
    const orderResult = await db.query(
      `INSERT INTO orders (
        customer_id, pickup_address, drop_address, pickup_pincode, drop_pincode,
        pickup_zone_id, drop_zone_id,
        length, breadth, height, actual_weight, volumetric_weight, billable_weight,
        order_type, payment_type, charge_breakdown, charge_total, current_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Created')
      RETURNING *`,
      [
        customerId, pickup_address, drop_address, pickup_pincode, drop_pincode,
        pickupZone.id, dropZone.id,
        length, breadth, height, actual_weight,
        breakdown.volumetricWeight, breakdown.billableWeight,
        order_type, payment_type, JSON.stringify(breakdown), breakdown.total,
      ]
    );

    const order = orderResult.rows[0];

    // First audit log entry
    await db.query(
      `INSERT INTO order_status_log (order_id, status, actor_id, actor_role, note)
       VALUES ($1, 'Created', $2, $3, 'Order created')`,
      [order.id, user.id, user.role]
    );

    // Notify customer
    const customerResult = await db.query('SELECT name, email, phone FROM users WHERE id = $1', [customerId]);
    if (customerResult.rows.length > 0) {
      const c = customerResult.rows[0];
      notifyCustomer({ email: c.email, name: c.name, phone: c.phone, orderId: order.id, status: 'Created' });
    }

    res.status(201).json({ order, breakdown, pickupZone, dropZone });
  } catch (err) {
    console.error('[ORDERS] Create error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create order.' });
  }
});

// ---------------------------------------------------------------
// GET /orders  — list/filter (admin: all; customer: own; agent: assigned)
// ---------------------------------------------------------------
router.get('/', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const { status, zone, agent_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let values = [];
    let idx = 1;

    if (user.role === 'customer') {
      conditions.push(`o.customer_id = $${idx++}`);
      values.push(user.id);
    } else if (user.role === 'agent') {
      // Agent sees own assigned orders
      const agentRow = await db.query('SELECT id FROM agents WHERE user_id = $1', [user.id]);
      if (agentRow.rows.length === 0) return res.json([]);
      conditions.push(`o.assigned_agent_id = $${idx++}`);
      values.push(agentRow.rows[0].id);
    }
    // admin: no filter by default

    if (status) { conditions.push(`o.current_status = $${idx++}`); values.push(status); }
    if (zone)   { conditions.push(`(o.pickup_zone_id = $${idx} OR o.drop_zone_id = $${idx})`); values.push(zone); idx++; }
    if (agent_id) { conditions.push(`o.assigned_agent_id = $${idx++}`); values.push(agent_id); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalResult = await db.query(`SELECT COUNT(*) FROM orders o ${where}`, values);
    const ordersResult = await db.query(
      `SELECT o.*, 
              pz.name as pickup_zone_name, dz.name as drop_zone_name,
              cu.name as customer_name, cu.email as customer_email,
              au.name as agent_name,
              a.id as agent_db_id
        FROM orders o
        LEFT JOIN zones pz ON pz.id = o.pickup_zone_id
        LEFT JOIN zones dz ON dz.id = o.drop_zone_id
        LEFT JOIN users cu ON cu.id = o.customer_id
        LEFT JOIN agents a  ON a.id  = o.assigned_agent_id
        LEFT JOIN users au ON au.id  = a.user_id
        ${where}
        ORDER BY o.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, parseInt(limit), offset]
    );

    res.json({
      orders: ordersResult.rows,
      total: parseInt(totalResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('[ORDERS] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// ---------------------------------------------------------------
// GET /orders/:id  — detail + tracking timeline
// ---------------------------------------------------------------
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const orderResult = await db.query(
      `SELECT o.*,
              pz.name as pickup_zone_name, dz.name as drop_zone_name,
              cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone,
              au.name as agent_name, au.phone as agent_phone,
              a.zone_id as agent_zone_id
        FROM orders o
        LEFT JOIN zones pz ON pz.id = o.pickup_zone_id
        LEFT JOIN zones dz ON dz.id = o.drop_zone_id
        LEFT JOIN users cu ON cu.id = o.customer_id
        LEFT JOIN agents a  ON a.id  = o.assigned_agent_id
        LEFT JOIN users au ON au.id  = a.user_id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const order = orderResult.rows[0];

    // Role-based access
    if (user.role === 'customer' && order.customer_id !== user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (user.role === 'agent') {
      const agentRow = await db.query('SELECT id FROM agents WHERE user_id = $1', [user.id]);
      if (agentRow.rows.length === 0 || order.assigned_agent_id !== agentRow.rows[0].id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    // Full timeline
    const logResult = await db.query(
      `SELECT osl.*, u.name as actor_name
         FROM order_status_log osl
         LEFT JOIN users u ON u.id = osl.actor_id
        WHERE osl.order_id = $1
        ORDER BY osl.created_at ASC`,
      [req.params.id]
    );

    // Reschedule requests
    const rescheduleResult = await db.query(
      'SELECT * FROM reschedule_requests WHERE order_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      order,
      timeline: logResult.rows,
      reschedules: rescheduleResult.rows,
    });
  } catch (err) {
    console.error('[ORDERS] Detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// ---------------------------------------------------------------
// PATCH /orders/:id/assign  — manual or auto assignment
// ---------------------------------------------------------------
router.patch('/:id/assign', requireRole('admin'), async (req, res) => {
  try {
    const { agent_id, auto } = req.body;
    const user = req.session.user;

    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const order = orderResult.rows[0];

    let agent;
    if (auto || !agent_id) {
      agent = await autoAssignAgent(order.id, order.pickup_zone_id, user.id, user.role);
      if (!agent) {
        return res.status(200).json({ message: 'No available agents. Order flagged as unassigned.', agent: null });
      }
    } else {
      agent = await manualAssignAgent(order.id, agent_id, user.id, user.role);
    }

    // Notify customer
    const customerResult = await db.query('SELECT name, email, phone FROM users WHERE id = $1', [order.customer_id]);
    if (customerResult.rows.length > 0) {
      const c = customerResult.rows[0];
      notifyCustomer({ email: c.email, name: c.name, phone: c.phone, orderId: order.id, status: 'Assigned' });
    }

    res.json({ message: 'Agent assigned successfully.', agent });
  } catch (err) {
    console.error('[ORDERS] Assign error:', err.message);
    res.status(500).json({ error: err.message || 'Assignment failed.' });
  }
});

// ---------------------------------------------------------------
// PATCH /orders/:id/status  — agent or admin status update
// ---------------------------------------------------------------
const VALID_STATUSES = ['Created','Assigned','Picked Up','In Transit','Out for Delivery','Delivered','Failed','Rescheduled'];

router.patch('/:id/status', requireLogin, async (req, res) => {
  try {
    const { status, note } = req.body;
    const user = req.session.user;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const order = orderResult.rows[0];

    // Agent can only update their own assigned order
    if (user.role === 'agent') {
      const agentRow = await db.query('SELECT id FROM agents WHERE user_id = $1', [user.id]);
      if (agentRow.rows.length === 0 || order.assigned_agent_id !== agentRow.rows[0].id) {
        return res.status(403).json({ error: 'You are not assigned to this order.' });
      }
    }

    // Update denormalized status field
    await db.query('UPDATE orders SET current_status = $1 WHERE id = $2', [status, order.id]);

    // Append to audit log (immutable)
    await db.query(
      `INSERT INTO order_status_log (order_id, status, actor_id, actor_role, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [order.id, status, user.id, user.role, note || null]
    );

    // Notify customer
    const customerResult = await db.query('SELECT name, email, phone FROM users WHERE id = $1', [order.customer_id]);
    if (customerResult.rows.length > 0) {
      const c = customerResult.rows[0];
      notifyCustomer({ email: c.email, name: c.name, phone: c.phone, orderId: order.id, status, note });
    }

    res.json({ message: `Status updated to "${status}".` });
  } catch (err) {
    console.error('[ORDERS] Status update error:', err.message);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ---------------------------------------------------------------
// PATCH /orders/:id/reschedule  — customer reschedule request
// ---------------------------------------------------------------
router.patch('/:id/reschedule', requireRole('customer', 'admin'), async (req, res) => {
  try {
    const { requested_date } = req.body;
    const user = req.session.user;

    if (!requested_date) return res.status(400).json({ error: 'requested_date is required.' });

    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const order = orderResult.rows[0];

    if (user.role === 'customer' && order.customer_id !== user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (order.current_status !== 'Failed') {
      return res.status(400).json({ error: 'Only failed deliveries can be rescheduled.' });
    }

    // Record reschedule request
    await db.query(
      'INSERT INTO reschedule_requests (order_id, requested_date) VALUES ($1, $2)',
      [order.id, requested_date]
    );

    // Update status → Rescheduled
    await db.query("UPDATE orders SET current_status = 'Rescheduled' WHERE id = $1", [order.id]);
    await db.query(
      `INSERT INTO order_status_log (order_id, status, actor_id, actor_role, note)
       VALUES ($1, 'Rescheduled', $2, $3, $4)`,
      [order.id, user.id, user.role, `New delivery date: ${requested_date}`]
    );

    // Attempt re-assignment
    let agent = null;
    if (order.assigned_agent_id) {
      // Try same agent first
      const sameAgent = await db.query(
        'SELECT id, is_available FROM agents WHERE id = $1', [order.assigned_agent_id]
      );
      if (sameAgent.rows.length > 0 && sameAgent.rows[0].is_available) {
        agent = await manualAssignAgent(order.id, order.assigned_agent_id, user.id, user.role);
      }
    }

    if (!agent) {
      agent = await autoAssignAgent(order.id, order.pickup_zone_id, user.id, user.role);
    }

    // Notify
    const customerResult = await db.query('SELECT name, email, phone FROM users WHERE id = $1', [order.customer_id]);
    if (customerResult.rows.length > 0) {
      const c = customerResult.rows[0];
      notifyCustomer({
        email: c.email, name: c.name, phone: c.phone,
        orderId: order.id, status: 'Rescheduled',
        note: `New delivery date: ${requested_date}`
      });
    }

    res.json({ message: 'Reschedule request submitted.', agent });
  } catch (err) {
    console.error('[ORDERS] Reschedule error:', err.message);
    res.status(500).json({ error: 'Failed to reschedule.' });
  }
});

// ---------------------------------------------------------------
// POST /orders/preview-charge  — calculate without saving
// ---------------------------------------------------------------
router.post('/preview-charge', requireLogin, async (req, res) => {
  try {
    const { pickup_pincode, drop_pincode, length, breadth, height, actual_weight, order_type, payment_type } = req.body;

    const pickupZone = await resolveZone(pickup_pincode);
    const dropZone   = await resolveZone(drop_pincode);

    const rateCardsResult    = await db.query('SELECT * FROM rate_cards');
    const codSurchargeResult = await db.query('SELECT * FROM cod_surcharge_config');

    const breakdown = calculateCharge({
      pickupZoneId: pickupZone?.id || null,
      dropZoneId:   dropZone?.id   || null,
      L: parseFloat(length), B: parseFloat(breadth), H: parseFloat(height),
      actualWeight: parseFloat(actual_weight),
      orderType: order_type, paymentType: payment_type,
      rateCards: rateCardsResult.rows,
      codSurcharges: codSurchargeResult.rows,
    });

    res.json({ breakdown, pickupZone, dropZone });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
