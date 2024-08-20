const axios = require('axios');
require('dotenv').config();
const cron = require('node-cron');


let ulipToken = '';

// Placeholder function to simulate fetching the new ULIP token
async function fetchNewULIPToken() {
    const response = await axios.post('https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/user/login', {
        username: process.env.ULIP_USER_NAME,
        password: process.env.ULIP_PASSWORD
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    // Implement the logic to fetch the new ULIP token from the required source
    return response?.data?.response?.id; // Replace this with the actual new token
}

// Schedule a cron job to update the ULIP token every hour
cron.schedule('*/1 * * * *', async () => {
    try {
        ulipToken = await fetchNewULIPToken();
        // console.log('ulipToken', ulipToken)
    } catch (error) {
        console.error('Error updating ULIP token:', error);
    }
});

// Export a function to get the latest ulipToken
function getUlipToken() {
    return ulipToken;
}

module.exports = { getUlipToken };