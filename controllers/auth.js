const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function register(req, res) {
  // console.log('req.body', req.body);
  try {
    const { userName, mobileNumber, pin } = req.body;

    const existingUser = await User.findOne({ mobileNumber });

    if (existingUser) {
      return res.status(400).json({ status: "failed", msg: "User already exists" });
    }

    const hashPin = await bcrypt.hash(pin.toString(), 10);

    const newUser = await User.create({ userName, mobileNumber, pin: hashPin });

    const token = jwt.sign(
      {
        mobileNumber: newUser.mobileNumber,
        id: newUser._id,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      status: 'created',
      statusbar: '201 Created',
      msg: 'User is created successfully',
      data: {
        userId: newUser._id,
        userName: newUser.userName,
        mobileNumber: newUser.mobileNumber,
        token: token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      statusbar: '500 Internal server error',
      msg: 'Something went wrong',
      error: error?.message,
      stack: error?.stack,
    });
  }
}

async function login(req, res) {
  try {
    const { mobileNumber, pin } = req.body;
    const existingUser = await User.findOne({ mobileNumber });
    // console.log('existingUser', existingUser)
    if (!existingUser) {
      // user is not registered yet need to register yourself.
      return res.status(404).json({ msg: "User does not exist." });
    }

    // console.log(' existingUser.pin', existingUser.pin)
    const isPinCorrect = await bcrypt.compare(pin.toString(), existingUser.pin);
    // console.log('isPinCorrect', isPinCorrect)
    if (!isPinCorrect)
      return res.status(400).json({
        msg: "Invalid Credentials",
        statusbar: "400 Bad Request",
      });

    // const token = jwt.sign(
    //   {
    //     mobileNumber: existingUser.mobileNumber,
    //     id: existingUser._id,
    //   },
    //   process.env.TOKEN_SECRET,
    //   { expiresIn: "1d" }
    // );

    res.status(200).json({
      status: "success",
      data: {
        userId: existingUser._id,
        userName: existingUser.userName,
        mobileNumber: existingUser.mobileNumber,
        // image:existingUser.image,
        // token: token,
      },
    })
  } catch (error) {
    // console.log("Internal server error", error)

    res.status(500).json({
      status: "failed",
      error: error?.message,
      stack: error?.stack
    })
  }
}

module.exports = { register, login };