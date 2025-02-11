const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { generateUniqueUsername } = require('./auth');


// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, userName: user.userName, baseUsername: user.baseUsername },
    process.env.TOKEN_SECRET,
    { expiresIn: '1d' }
  );
};

// Signup API
exports.signup = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const baseUsername = await generateUniqueUsername({ email, fullName: userName });

    // Create new user
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
      baseUsername,
    });

    // Save user to DB
    await newUser.save();

    res.status(201).json({ message: 'Signup successful' });
  } catch (error) {
    console.error(error);  // Log the error for debugging
    res.status(500).json({ message: 'Error signing up', error: error.message });
  }
};

// Login API
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: { _id: user._id, userName: user.userName, email: user.email, generateUniqueUsername: user.generateUniqueUsername },
    });
  } catch (error) {
    console.error(error);  // Log the error for debugging
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

exports.googleLoginSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User authentication failed" });
    }

    const { userName, email, googleId } = req.user;

    // Check if user exists in DB
    let user = await User.findOne({ email });

    if (!user) {
      const baseUsername = await generateUniqueUsername({ email, fullName: userName });
      // console.log('first Data', baseUsername);

      user = new User({
        userName,
        email,
        googleId,
        password: "", // Password is empty for Google users
        baseUsername,
      });
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user);

    // Redirect to frontend with token
    res.redirect(`https://pureprakruti79.netlify.app/?token=${token}`);
  } catch (error) {
    console.error("Google login error:", error.message);
    res.status(500).json({ message: "Error during Google login/signup", error: error.message });
  }
};

exports.googleLoginFailure = (req, res) => {
  res.status(401).json({ message: "Google authentication failed" });
};