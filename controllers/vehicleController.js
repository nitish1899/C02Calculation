const axios = require('axios');
const Vehicle = require('../models/vehicle');
require('dotenv').config();

 async function getDistance(sourcePincode,destinationPincode){
  try {
    const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json`,
        {
            params: {
                origins: sourcePincode,
                destinations: destinationPincode,
                key: process.env.googleGeoCodingApiKey
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

async function findByType(vehicleType) {
    try {
        const vehicles = await Vehicle.find({ type: vehicleType });

        if (vehicles.length === 0) {
            return res.status(404).json({ message: 'No vehicles found for the specified type' });
        }

        return vehicles[0];
    } catch (error) {
        // Handle any errors that occur during the query
        console.error('Error finding vehicles:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function findCO2Emission(req,res){
    try{

    const token = process.env.token;
    const options = {method:'POST',
        url:process.env.url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
        data: {
            id_number: req.body.VechileNumber,
        }
    };
    
    // get vechileInfo using vehicle number
    const vehicleInfo = (await axios.request(options)).data;
    console.log(vehicleInfo)
    const dateString = vehicleInfo.data.registration_date;
    const date = new Date(dateString);
    const year = date.getFullYear();
    const vehicleCategory = vehicleInfo.data.vehicle_category;

    // get other details for vechileType
    const otherDetails = await findByType(req.body.VechileType);
        
    if(vehicleCategory !== otherDetails.category ){

        throw new Error('Vehicle type not found');
    }

    const distanceString = await getDistance(req.body.SourcePincode,req.body.DestinationPincode);
    console.log('disString',distanceString);
    const distance = parseFloat(distanceString.replace(/[^\d.]/g, '')); // Removes non-numeric characters and parses as float

    if(!distance){
        throw new Error('Invalid pincode');
    }

    let co2Emission = 0;

    if(year >= 2021){
        console.log('above2021',otherDetails.co2EPercentageAbove2021);
        if(req.body.LoadedWeight > (0.5 * otherDetails.standardLadenWeight)){
            co2Emission = distance * otherDetails.co2EPercentageAbove2021;
        } else {
            co2Emission = distance * otherDetails.co2EPercentageAbove2021*otherDetails.lodedVehicleNomalizationPercentage;
        }
    }else {
        console.log('below2021',otherDetails.co2EPercentageBelow2021);

        if(req.body.LoadedWeight > (0.5 * otherDetails.standardLadenWeight)){
            co2Emission = distance * otherDetails.co2EPercentageBelow2021;
        } else {
            console.log(otherDetails)
            co2Emission = distance * otherDetails.co2EPercentageBelow2021*otherDetails.lodedVehicleNomalizationPercentage;
        }
    }


    if(req.body.MobilisationDistance || req.body.DeMobilisationDistance){
        console.log('extraDistance',(req.body.MobilisationDistance + req.body.DeMobilisationDistance));
        if(year >= 2021){
            co2Emission = co2Emission + (req.body.MobilisationDistance + req.body.DeMobilisationDistance) * otherDetails.co2EPercentageAbove2021* otherDetails.emptyVehicleNomalizationPercentage;
        }
        else{
            co2Emission = co2Emission + (req.body.MobilisationDistance + req.body.DeMobilisationDistance) * otherDetails.co2EPercentageBelow2021* otherDetails.emptyVehicleNomalizationPercentage;
        }
    }

    console.log('overallEmission',co2Emission);

    return res.status(202).json(co2Emission);
} catch(error){
    console.log('error is : ',error)
    return res.status(500).json("vechile not found");
}

}

module.exports = {
    findCO2Emission,getDistance,findByType,getDistance,insert
};

