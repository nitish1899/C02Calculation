const express = require('express');
const app = express();
const http = require('http').Server(app);
const cors = require('cors');
require('dotenv').config();

const corsOptions = {
    origin: '*',
    credentials:true
  };
  
app.use(cors(corsOptions));
  
const mongoose = require('mongoose');
mongoose.connect("mongodb+srv://nkword1899:TP8SH1EJk6I45PnT@co2emissioncalculation.mq4im1l.mongodb.net/?retryWrites=true&w=majority&appName=CO2EmissionCalculation");

const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const vehicleRoutes = require('./routes/vehicle');

app.use(express.json()); // for parsing application/json

app.use('/api/auth', authRoutes);
app.use('/api', vehicleRoutes);
app.use('/api/otp', otpRoutes);


http.listen(3000, function(){
    console.log('Server is running');
})