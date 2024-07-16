const express = require('express');
const app = express();
const http = require('http').Server(app);
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const corsOptions = {
  origin: '*',
  credentials: true
};

app.use(cors(corsOptions));

connectDB();

const authRoutes = require('./routes/auth');
const otpRoutes = require('./routes/otp');
const vehicleRoutes = require('./routes/vehicle');
const { default: axios } = require('axios');

app.use(express.json()); // for parsing application/json

app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/vehicle', vehicleRoutes);

app.use('/', (req, res) => res.json({ message: 'Welcome to CO2e Calculator' }));

// Schedule a cron job to update the ULIP token every hour
cron.schedule('*/20 * * * *', async () => {
  try {
    // Function to fetch the new ULIP token
    const newToken = await fetchNewULIPToken();

    // Update the .env file with the new ULIP token
    const envFilePath = path.resolve(__dirname, '.env');
    const envConfig = fs.readFileSync(envFilePath, 'utf8').split('\n');
    const updatedEnvConfig = envConfig.map(line => {
      if (line.startsWith('ULIP_TOKEN=')) {
        return `ULIP_TOKEN=${newToken}`;
      }
      return line;
    }).join('\n');

    fs.writeFileSync(envFilePath, updatedEnvConfig, 'utf8');
    console.log('ULIP token updated successfully');
  } catch (error) {
    console.error('Error updating ULIP token:', error);
  }
});

// Placeholder function to simulate fetching the new ULIP token
async function fetchNewULIPToken() {
  const response = await axios.post('https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/user/login', {
    username: 'transvue_usr',
    password: 'transvue@27022024'
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Implement the logic to fetch the new ULIP token from the required source
  return response?.data?.response?.id; // Replace this with the actual new token
}

http.listen(process.env.PORT || 4500, function () {
  console.log('Server is running');
});

