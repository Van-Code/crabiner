// Middleware to require authentication
export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

// Middleware to attach user if authenticated (optional)
export function optionalAuth(req, res, next) {
  // User is available at req.user if authenticated
  next();
}
