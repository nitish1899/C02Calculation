
require('dotenv').config();

async function calculateDistance(sourcePincode,destinationPincode){
        try {
          const response = await axios.get(
              `https://maps.googleapis.com/maps/api/distancematrix/json`,
              {
                params: {
                origins: sourcePincode,
                destinations: destinationPincode,
                key: process.env.GOOGLE_GEOCODING_API_KEY
                }
              }
          );
      
          // Extract distance information
          const distanceInfo = response.data.rows[0].elements[0];
          const distance = distanceInfo.distance.text;
          
          return distance;
      
      } catch (error) {
              console.error(error);
          return res.status(500).json({ error: 'Internal Server Error' });
      }
}

module.exports = {calculateDistance};