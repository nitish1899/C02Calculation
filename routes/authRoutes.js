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


// const express = require("express");
// const passport = require("passport");
// const authController = require("../controllers/authController");

// const router = express.Router();

// // 🔹 Signup Route
// router.post("/signup", authController.signup);

// // 🔹 Login Route
// router.post("/login", authController.login);

// // 🔹 Google Authentication Route (Login)
// router.get("/auth/google", passport.authenticate("google", { scope: ["email"] }));

// // 🔹 Google Authentication Callback
// router.get(
//   "/auth/google/callback",
//   passport.authenticate("google", {
//     failureRedirect: "/auth/google/failure",
//     session: false, 
//   }),
//   authController.googleLoginSuccess
// );

// // 🔹 Google Authentication Failure Route
// router.get("/auth/google/failure", authController.googleLoginFailure);

// module.exports = router;


// const express = require("express");
// const passport = require("passport");
// const authController = require("../controllers/authController");

// const router = express.Router();

// // Normal Signup & Login Routes
// router.post("/signup", authController.signup);
// router.post("/login", authController.login);

// // Google Authentication Routes
// router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }), authController.googleLoginSuccess);
// router.get("/auth/google/failure", authController.googleLoginFailure);

// module.exports = router;


// const express = require("express");
// const passport = require("passport");
// const authController = require("../controllers/authController");

// const router = express.Router();

// // Redirect to Google Login
// router.get(
//   "/auth/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );

// // Google Callback URL
// router.get(
//   "/auth/google/callback",
//   passport.authenticate("google", { failureRedirect: "/" }),
//   authController.googleLoginSuccess
// );

// // Authentication failure route
// router.get("/auth/google/failure", authController.googleLoginFailure);

// module.exports = router;
