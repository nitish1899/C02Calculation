const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: false,
  },
  baseUsername: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  googleId: {
    type: String,
    required: false,
  },
  mobileNumber: {
    type: String,
  },
  pin: { type: String, required: false },
  gstin: { type: String }
},
  { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
