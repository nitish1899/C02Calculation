const Vehicle = require('../models/vehicle');
const { orderBy, round } = require('lodash');
const axios = require('axios');
require('dotenv').config();

async function getDistance(sourcePincode,destinationPincode){
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
  
      if(!response){
        throw new Error('Invalid pincode');
      }

      // Extract distance information
      const distanceInfo = response?.data?.rows[0]?.elements[0];
      const distance = distanceInfo?.distance?.text;
      console.log(distance);
      return distance;
  
  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
  }

/*
async function insert(req, res) {
    try {
        // Create a new vehicle record using the request body
        const vehicleInfo = await Vehicle.create({
            category:req.body.category,
            type: req.body.type,
            standardLadenWeight: req.body.standardLadenWeight,
            co2EPercentageAbove2021: req.body.co2EPercentageAbove2021,
            co2EPercentageBelow2021: req.body.co2EPercentageBelow2021,
            lodedVehicleNomalizationPercentage: req.body.lodedVehicleNomalizationPercentage,
            emptyVehicleNomalizationPercentage: req.body.emptyVehicleNomalizationPercentage,
        });

        // Send the created vehicle record as a response
        return res.status(201).json(vehicleInfo);
    } catch (error) {
        // Handle any errors that occur during the creation
        console.error('Error creating vehicle:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
*/

async function findByVehicleCategory(vehicleCategory) {
    try {
        const vehicles = await Vehicle.find({ category: vehicleCategory });

        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No vehicles found for the specified type' });
        }

        return vehicles;
    } catch (error) {
        // Handle any errors that occur during the query
        console.error('Error finding vehicles:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function findCO2Emission(req,res){
    try{   
    const token = process.env.SURE_PASS_TOKEN;
    const options = {method:'POST',
        url:process.env.SURE_PASS_RC_FULL_DETAILS_API,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
        data: {
            id_number: req.body.VechileNumber,
        }
    };
    
    // get vechileInfo using vehicle number
    const vehicleData = await axios.request(options);

    if(!vehicleData) {
        return res.status(404).json({error:'Vehicle not found'});
    }

    const vehicleInfo = vehicleData.data;
    // console.log('vehicleInfo',vehicleInfo)
   
   

    const dateString = vehicleInfo.data.registration_date;
    const date = new Date(dateString);
    const year = date.getFullYear();
    const vehicleCategory = vehicleInfo.data.vehicle_category;

    // get other details for vechileType
    const vechileCategories = await findByVehicleCategory(vehicleCategory);
    const orderedVechileCategory = orderBy(vechileCategories,'standardLadenWeight','desc');
    const ladenWeight = vehicleInfo.vehicle_gross_weight - vehicleInfo.unladen_weight;
    const nearestVechileCategory = orderedVechileCategory.filter(v => v.standardLadenWeight <= ladenWeight);

    const otherDetails = nearestVechileCategory.length ? nearestVechileCategory[0]:orderedVechileCategory[orderedVechileCategory.length -1];
    console.log('otherDetails',otherDetails);
    const distanceString = await getDistance(req.body.SourcePincode,req.body.DestinationPincode);
    console.log('disString',distanceString);
    const distance = parseFloat(distanceString.replace(/[^\d.]/g, '')); // Removes non-numeric characters and parses as float

    if(!distance){
        return res.status(404).json({error:'Invalid pin'});
    }

    let co2Emission = 0;

    if(year >= 2021){
        console.log('above2021',otherDetails.co2EPercentageAbove2021);
        if(req.body.LoadedWeight > (0.5 * otherDetails.standardLadenWeight)){
            co2Emission = distance * otherDetails.co2EPercentageAbove2021/100;
        } else {
            co2Emission = distance * otherDetails.co2EPercentageAbove2021/100*otherDetails.lodedVehicleNomalizationPercentage/100;
        }
    } else {
        console.log('below2021',otherDetails.co2EPercentageBelow2021);

        if(req.body.LoadedWeight > (0.5 * otherDetails.standardLadenWeight)){
            co2Emission = distance * otherDetails.co2EPercentageBelow2021/100;
        } else {
            console.log(otherDetails)
            co2Emission = distance * otherDetails.co2EPercentageBelow2021/100*otherDetails.lodedVehicleNomalizationPercentage/100;
        }
    }

    const mobilisationDistance = Number(req.body.MobilisationDistance);
    const deMobilisationDistance = Number(req.body.DeMobilisationDistance);

    if(mobilisationDistance || deMobilisationDistance){
        console.log('extraDistance',(mobilisationDistance + deMobilisationDistance));
        if(year >= 2021){
            co2Emission = co2Emission + (req.body.MobilisationDistance + req.body.DeMobilisationDistance) * otherDetails.co2EPercentageAbove2021/100* otherDetails.emptyVehicleNomalizationPercentage/100;
        }
        else{
            co2Emission = co2Emission + (req.body.MobilisationDistance + req.body.DeMobilisationDistance) * otherDetails.co2EPercentageBelow2021/100* otherDetails.emptyVehicleNomalizationPercentage/100;
        }
    }

    console.log('overallEmission',co2Emission);

    return res.status(201).json(round(co2Emission,3));
} catch(error){
    console.log('error is : ',error)
    return res.status(404).json({error: 'Vehicle not found'});
}

}

module.exports = {
    findCO2Emission,findByVehicleCategory
};

