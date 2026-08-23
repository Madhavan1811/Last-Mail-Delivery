const nodemailer = require('nodemailer');

// -------------------------------------------------------------------
// Email transport
// -------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const STATUS_MESSAGES = {
  Created:          'Your order has been created and is awaiting assignment.',
  Assigned:         'Great news! A delivery agent has been assigned to your order.',
  'Picked Up':      'Your package has been picked up by our agent.',
  'In Transit':     'Your package is on its way!',
  'Out for Delivery': 'Your package is out for delivery today.',
  Delivered:        'Your package has been delivered. Thank you for using our service!',
  Failed:           'We were unable to deliver your package. Please reschedule.',
  Rescheduled:      'Your delivery has been rescheduled successfully.',
};

/**
 * Send email notification on status change
 * @param {object} params
 * @param {string} params.toEmail   - customer email
 * @param {string} params.toName    - customer name
 * @param {string|number} params.orderId
 * @param {string} params.status
 * @param {string} [params.note]
 */
async function sendOrderStatusEmail({ toEmail, toName, orderId, status, note }) {
  const message = STATUS_MESSAGES[status] || `Your order status has been updated to: ${status}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a73e8;padding:24px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">🚚 Delivery Update</h1>
      </div>
      <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px">
        <p style="font-size:16px">Hi <strong>${toName}</strong>,</p>
        <p style="font-size:16px">${message}</p>
        ${note ? `<p style="color:#555;font-style:italic">Note: ${note}</p>` : ''}
        <div style="background:white;border:1px solid #dee2e6;border-radius:6px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:14px;color:#666">Order ID</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#1a73e8">#${orderId}</p>
          <p style="margin:8px 0 0;font-size:14px;color:#666">Status</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#28a745">${status}</p>
        </div>
        <p style="color:#888;font-size:13px">
          Track your order at any time by visiting your dashboard.<br/>
          — The Delivery Team
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Delivery Tracker" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Order #${orderId} — ${status}`,
      html,
    });
    console.log(`[EMAIL] Sent to ${toEmail} — Order #${orderId} status: ${status}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send to ${toEmail}:`, err.message);
    // Non-fatal — we don't want notification failures to break order flow
  }
}

// -------------------------------------------------------------------
// SMS Stub
// -------------------------------------------------------------------
/**
 * Send SMS notification (stubbed — plug in Twilio/MSG91/Fast2SMS here)
 * @param {object} params
 * @param {string} params.phone
 * @param {string|number} params.orderId
 * @param {string} params.status
 */
function sendSMS({ phone, orderId, status }) {
  // TODO: Replace this stub with a real SMS provider, e.g.:
  //   const twilio = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
  //   await twilio.messages.create({
  //     body: `Your order #${orderId} status: ${status}`,
  //     from: '+1XXXXXXXXXX',
  //     to: phone,
  //   });
  console.log(`[SMS STUB] To: ${phone} | Order #${orderId} | Status: ${status}`);
}

/**
 * Notify customer via both channels
 */
async function notifyCustomer({ email, name, phone, orderId, status, note }) {
  await sendOrderStatusEmail({ toEmail: email, toName: name, orderId, status, note });
  sendSMS({ phone, orderId, status });
}

module.exports = { notifyCustomer, sendOrderStatusEmail, sendSMS };
