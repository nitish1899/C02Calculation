const express = require('express');
const app = express();
const session = require("express-session");
const passport = require("./config/passport");
const http = require('http').Server(app);
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');

const corsOptions = {
  origin: '*',
  credentials: true
};

app.use(cors(corsOptions));

connectDB();

// Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require("./routes/authRoutes");
const otpRoutes = require('./routes/otp');
const vehicleRoutes = require('./routes/vehicle');
const kycRoutes = require('./routes/kyc');
const queryRoutes = require('./routes/query');


app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: false }));

app.use('/', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/vehicle', vehicleRoutes);
app.use('/api/kyc/verify', kycRoutes);
app.use('/api/query', queryRoutes);

app.use('/', (req, res) => res.json({ message: 'Welcome to CO2e Calculator' }));

http.listen(process.env.PORT || 4500, function () {
  console.log('Server is running');
});

