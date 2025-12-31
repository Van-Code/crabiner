import express from "express";
import passport from "passport";

const router = express.Router();

// Google OAuth login
router.get(
  "/google",
  (req, res, next) => {
    // Store returnTo in session if provided
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo;
    }
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/?auth=failed",
  }),
  (req, res) => {
    // Successful authentication - check for returnTo in session
    const returnTo = req.session.returnTo || "/";
    delete req.session.returnTo; // Clear it

    // Add auth=success query param
    const separator = returnTo.includes("?") ? "&" : "?";
    res.redirect(`${returnTo}${separator}auth=success`);
  }
);

// Logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.redirect("/");
  });
});

// Check auth status
router.get("/status", (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user
      ? {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          profilePicture: req.user.profile_picture,
        }
      : null,
  });
});

export default router;
