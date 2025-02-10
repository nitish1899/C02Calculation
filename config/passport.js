const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { generateUniqueUsername } = require('../controllers/auth');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://pureprakruti.com/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          const baseUsername = await generateUniqueUsername({ email: profile.emails[0].value, fullName: profile.displayName });

          user = new User({
            googleId: profile.id,
            userName: profile.displayName,
            email: profile.emails[0].value,
            baseUsername,
          });

          await user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user as a JWT token (instead of session)
passport.serializeUser((user, done) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  done(null, token);
});

// Deserialize user using the JWT token
passport.deserializeUser(async (token, done) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
