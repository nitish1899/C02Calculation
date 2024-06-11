const express = require('express');
const app = express();
const http = require('http').Server(app);
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database')

const corsOptions = {
  origin: '*',
  credentials: true
};

app.use(cors(corsOptions));

connectDB();

const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const vehicleRoutes = require('./routes/vehicle');

app.use(express.json()); // for parsing application/json

app.use('/', (req, res) => res.json({ 'message': 'Welcome to CO2e Calculator' }));
app.use('/api/auth', authRoutes);
app.use('/api', vehicleRoutes);
app.use('/api/otp', otpRoutes);


http.listen(3000, function () {
  console.log('Server is running');
})