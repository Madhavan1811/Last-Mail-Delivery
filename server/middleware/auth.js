/**
 * Auth middleware
 * requireLogin   — 401 if no session
 * requireRole    — 403 if role doesn't match
 */

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

/**
 * @param {...string} roles - allowed roles, e.g. requireRole('admin', 'agent')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
