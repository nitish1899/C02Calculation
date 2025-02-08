const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");

const router = express.Router();

// 🔹 Signup Route
router.post("/signup", authController.signup);

// 🔹 Login Route
router.post("/login", authController.login);

// 🔹 Google Authentication Route (Login)
router.get("/auth/google", passport.authenticate("google", { scope: ["email"] }));

// 🔹 Google Authentication Callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google/failure",
    session: false, // No session, using JWT instead
  }),
  authController.googleLoginSuccess
);

// 🔹 Google Authentication Failure Route
router.get("/auth/google/failure", authController.googleLoginFailure);

module.exports = router;