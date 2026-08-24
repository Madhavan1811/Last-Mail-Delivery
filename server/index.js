require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');

const app = express();

// Trust reverse proxy (required for Vercel/Render HTTPS session cookies)
app.set('trust proxy', 1);

// ---------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------
// Session
// ---------------------------------------------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// ---------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/admin/zones', require('./routes/zones'));
app.use('/api/admin/rate-cards', require('./routes/rateCards'));
app.use('/api/rate-cards',  require('./routes/rateCards'));  // /public endpoint
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/admin/agents', require('./routes/agents'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------
// Serve React build (production)
// ---------------------------------------------------------------
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found.' });
  }
});

// ---------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---------------------------------------------------------------
// Start
// ---------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚚 Delivery Tracker API running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('   React dev server: http://localhost:5173 (run npm run client)');
  }
});

module.exports = app;
