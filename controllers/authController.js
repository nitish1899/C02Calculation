const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');


// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, userName: user.userName },
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

    // Create new user
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
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
      user: { _id: user._id, userName: user.userName, email: user.email },
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
      user = new User({
        userName,
        email,
        googleId,
        password: "", // Password is empty for Google users
      });
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user);

    // Redirect to frontend with token
    res.redirect(`http://localhost:3000/auth/google/callback?token=${token}`);
  } catch (error) {
    console.error("Google login error:", error.message);
    res.status(500).json({ message: "Error during Google login/signup", error: error.message });
  }
};

exports.googleLoginFailure = (req, res) => {
  res.status(401).json({ message: "Google authentication failed" });
};


// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const User = require("../models/user");

// // Generate JWT Token
// const generateToken = (user) => {
//   return jwt.sign(
//     { userId: user._id, email: user.email },
//     process.env.TOKEN_SECRET,
//     { expiresIn: "1d" }
//   );
// };



// // Signup API
// exports.signup = async (req, res) => {
//   try {
//     const { userName, email, password } = req.body;

//     if (!userName || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) return res.status(400).json({ message: "User already exists" });

//     // Create new user without googleId
//     const newUser = new User({ userName, email, password });

//     // Hash the password before saving
//     const hashedPassword = await bcrypt.hash(password, 10);
//     newUser.password = hashedPassword;

//     // Save user to DB
//     await newUser.save();

//     res.status(201).json({ message: "Signup successful" });
//   } catch (error) {
//     console.error(error);  // Log the error for debugging
//     res.status(500).json({ message: "Error signing up", error: error.message });
//   }
// };



// // Login API
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // Generate token
//     const token = generateToken(user);

//     res.json({
//       message: "Login successful",
//       token,
//       user: { _id: user._id, userName: user.userName, email: user.email }
//     });
//   } catch (error) {
//     console.error(error);  // Log the error for debugging
//     res.status(500).json({ message: "Error logging in", error: error.message });
//   }
// };


// // Google Login Success API
// exports.googleLoginSuccess = async (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ message: "User authentication failed" });
//   }

//   const { _id, userName, email, googleId } = req.user;

//   // Check if user already exists
//   let user = await User.findOne({ email });

//   // If the user does not exist, create a new user and store the googleId
//   if (!user) {
//     user = new User({ userName, email, googleId });
//     await user.save();
//   }

//   const token = generateToken(user);

//   res.json({
//     status: "success",
//     message: "Google login successful",
//     token,
//     user: { _id, userName, email, googleId },
//   });
// };
// // Google Login Failure API
// exports.googleLoginFailure = (req, res) => {
//   res.status(401).json({ message: "Google authentication failed" });
// };


// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const User = require("../models/user");

// // Generate JWT Token
// const generateToken = (user) => {
//   return jwt.sign(
//     { userId: user._id, email: user.email },
//     process.env.TOKEN_SECRET,
//     { expiresIn: "1d" }
//   );
// };

// // Signup API
// exports.signup = async (req, res) => {
//   try {
//     const { userName, email, password, googleId } = req.body;

//     if (!userName || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) return res.status(400).json({ message: "User already exists" });

//     // Create new user
//     const newUser = new User({ userName, email, password, googleId: googleId || null });

//     // Hash the password before saving
//     const hashedPassword = await bcrypt.hash(password, 10);
//     newUser.password = hashedPassword;

//     // Save user to DB
//     await newUser.save();

//     res.status(201).json({ message: "Signup successful" });
//   } catch (error) {
//     console.error(error);  // Log the error for debugging
//     res.status(500).json({ message: "Error signing up", error: error.message });
//   }
// };

// // Login API
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // Generate token
//     const token = generateToken(user);

//     res.json({
//       message: "Login successful",
//       token,
//       user: { _id: user._id, userName: user.userName, email: user.email }
//     });
//   } catch (error) {
//     console.error(error);  // Log the error for debugging
//     res.status(500).json({ message: "Error logging in", error: error.message });
//   }
// };

// // Google Login Success API
// exports.googleLoginSuccess = (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ message: "User authentication failed" });
//   }

//   const { _id, userName, email, googleId } = req.user;
//   const token = generateToken(req.user);

//   res.json({
//     status: "success",
//     message: "Google login successful",
//     token,
//     user: { _id, userName, email, googleId }, // Only send googleId if it exists
//   });
// };

// // Google Login Failure API
// exports.googleLoginFailure = (req, res) => {
//   res.status(401).json({ message: "Google authentication failed" });
// };


// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const User = require("../models/user");

// // Generate JWT Token
// const generateToken = (user) => {
//   return jwt.sign(
//     { userId: user._id, email: user.email },
//     process.env.TOKEN_SECRET,
//     { expiresIn: "1d" }
//   );
// };


// exports.signup = async (req, res) => {
//   try {
//     const { userName, email, password, googleId } = req.body;  // Ensure googleId is passed only during Google signup

//     if (!userName || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) return res.status(400).json({ message: "User already exists" });

//     const newUser = new User({ userName, email, password, googleId: googleId || null });  // Only set googleId if provided
//     await newUser.save();

//     res.status(201).json({ message: "Signup successful" });
//   } catch (error) {
//     res.status(500).json({ message: "Error signing up", error: error.message });
//   }
// };


// // 🔹 Login API
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // Generate token
//     const token = generateToken(user);

//     res.json({ message: "Login successful", token, user });
//   } catch (error) {
//     res.status(500).json({ message: "Error logging in", error: error.message });
//   }
// };


// // In your Google login success route
// exports.googleLoginSuccess = (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ message: "User authentication failed" });
//   }

//   const { _id, userName, email, googleId } = req.user;
//   const token = generateToken(req.user);

//   res.json({
//     status: "success",
//     message: "Google login successful",
//     token,
//     user: { _id, userName, email, googleId }, // Only send googleId if it exists
//   });
// };

// // 🔹 Google Login Failure API
// exports.googleLoginFailure = (req, res) => {
//   res.status(401).json({ message: "Google authentication failed" });
// };


// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const User = require("../models/user");

// // Generate JWT Token
// const generateToken = (user) => {
//   return jwt.sign({ userId: user._id, email: user.email }, process.env.TOKEN_SECRET, { expiresIn: "1d" });
// };

// // Signup API
// exports.signup = async (req, res) => {
//   try {
//     const { userName, email, password } = req.body;

//     if (!userName || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) return res.status(400).json({ message: "User already exists" });

//     const newUser = new User({ userName, email, password });
//     await newUser.save();

//     res.status(201).json({ message: "Signup successful" });
//   } catch (error) {
//     res.status(500).json({ message: "Error signing up", error: error.message });
//   }
// };

// // Login API
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

//     const token = generateToken(user);

//     res.json({ message: "Login successful", token, user });
//   } catch (error) {
//     res.status(500).json({ message: "Error logging in", error: error.message });
//   }
// };

// // Google Login Success API
// exports.googleLoginSuccess = (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ message: "User authentication failed" });
//   }

//   const token = generateToken(req.user);

//   res.json({
//     status: "success",
//     message: "Google login successful",
//     token,
//     user: {
//       _id: req.user._id,
//       userName: req.user.userName,
//       email: req.user.email,
//       googleId: req.user.googleId,
//     },
//   });
// };

// // Google Login Failure API
// exports.googleLoginFailure = (req, res) => {
//   res.status(401).json({ message: "Google authentication failed" });
// };


// const jwt = require("jsonwebtoken");

// exports.googleLoginSuccess = (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ message: "User authentication failed" });
//   }

//   // Generate JWT Token
//   const token = jwt.sign(
//     { userId: req.user._id, email: req.user.email },
//     process.env.TOKEN_SECRET,
//     { expiresIn: "1d" }
//   );

//   res.json({
//     status: "success",
//     message: "Google login successful",
//     token,
//     user: {
//       _id: req.user._id,
//       userName: req.user.userName,
//       email: req.user.email,
//       googleId: req.user.googleId,
//     },
//   });
// };

// exports.googleLoginFailure = (req, res) => {
//   res.status(401).json({ message: "Google authentication failed" });
// };
