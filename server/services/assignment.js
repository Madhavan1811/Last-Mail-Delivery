/**
 * Agent Assignment Service
 * Auto-assign: zone-match first, then any available agent, then null.
 */
const db = require('../db');

/**
 * Attempt to auto-assign an available agent to an order.
 * Priority: agent in pickupZone → any available agent → null (unassigned).
 *
 * @param {number} orderId
 * @param {number} pickupZoneId
 * @param {number} actorId      - user performing the action (system = admin id or null)
 * @param {string} actorRole
 * @returns {object|null} agent row or null
 */
async function autoAssignAgent(orderId, pickupZoneId, actorId, actorRole) {
  // 1. Try agent in pickup zone first
  let result = await db.query(
    `SELECT a.id, u.name, u.email, u.phone, a.zone_id
       FROM agents a
       JOIN users u ON u.id = a.user_id
      WHERE a.is_available = TRUE AND a.zone_id = $1
      LIMIT 1`,
    [pickupZoneId]
  );

  // 2. Fallback: any available agent across any zone
  if (result.rows.length === 0) {
    result = await db.query(
      `SELECT a.id, u.name, u.email, u.phone, a.zone_id
         FROM agents a
         JOIN users u ON u.id = a.user_id
        WHERE a.is_available = TRUE
        LIMIT 1`
    );
  }

  if (result.rows.length === 0) {
    return null; // No agent available — order stays unassigned
  }

  const agent = result.rows[0];

  // 3. Assign agent + update order status
  await db.query(
    `UPDATE orders SET assigned_agent_id = $1, current_status = 'Assigned' WHERE id = $2`,
    [agent.id, orderId]
  );

  // 4. Log the assignment (append-only)
  await db.query(
    `INSERT INTO order_status_log (order_id, status, actor_id, actor_role, note)
     VALUES ($1, 'Assigned', $2, $3, $4)`,
    [orderId, actorId, actorRole, `Auto-assigned to agent: ${agent.name}`]
  );

  return agent;
}

/**
 * Manually assign a specific agent to an order.
 * @param {number} orderId
 * @param {number} agentId
 * @param {number} actorId
 * @param {string} actorRole
 * @returns {object} agent row
 */
async function manualAssignAgent(orderId, agentId, actorId, actorRole) {
  const result = await db.query(
    `SELECT a.id, u.name, u.email, u.phone, a.zone_id
       FROM agents a
       JOIN users u ON u.id = a.user_id
      WHERE a.id = $1`,
    [agentId]
  );

  if (result.rows.length === 0) {
    throw new Error('Agent not found');
  }

  const agent = result.rows[0];

  await db.query(
    `UPDATE orders SET assigned_agent_id = $1, current_status = 'Assigned' WHERE id = $2`,
    [agentId, orderId]
  );

  await db.query(
    `INSERT INTO order_status_log (order_id, status, actor_id, actor_role, note)
     VALUES ($1, 'Assigned', $2, $3, $4)`,
    [orderId, actorId, actorRole, `Manually assigned to agent: ${agent.name}`]
  );

  return agent;
}

module.exports = { autoAssignAgent, manualAssignAgent };
