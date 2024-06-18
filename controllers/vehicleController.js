const Vehicle = require('../models/vehicle');
const InputHistory = require('../models/inputHistory');
const User = require("../models/user");
const { orderBy, round } = require('lodash');
const axios = require('axios');
const { freeTrailCount, monthNames } = require('../constants');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

function generateUuidNumber() {
    const uniqueId = uuidv4();
    return `CERT-${uniqueId}`;
}

async function getDistance(sourcePincode, destinationPincode) {
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

        if (!response) {
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

async function findCO2Emission(req, res) {
    try {
        const { VechileNumber, SourcePincode, DestinationPincode, MobilisationDistance, DeMobilisationDistance, LoadedWeight, userId } = req.body;
        const user = await User.findOne({ _id: userId });

        if (!user) {
            throw new Error('User not found');
        }

        const vehicleNumber = VechileNumber.toUpperCase();

        // Validate vehicle number
        if (!/^[a-zA-Z0-9]+$/.test(vehicleNumber) || vehicleNumber.length > 10) {
            return res.status(400).json({ error: 'Invalid vehicle number. Only alphanumeric characters are allowed.' });
        }

        if (!Number(SourcePincode) || Number(SourcePincode).length != 6 || !Number(DestinationPincode) || Number(DestinationPincode).length != 6) {
            throw new Error('Invalid source or destination pincode');
        }

        const options = {
            method: 'POST',
            url: process.env.SURE_PASS_RC_FULL_DETAILS_API,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SURE_PASS_TOKEN}`,
            },
            data: {
                id_number: vehicleNumber,
            }
        };

        // get vechileInfo using vehicle number
        const vehicleData = await axios.request(options);
        console.log('vehicleData', vehicleData);
        if (!vehicleData) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        const vehicleInfo = vehicleData.data;
        // console.log('vehicleInfo',vehicleInfo)
        const dateString = vehicleInfo.data.registration_date;
        const date = new Date(dateString);
        const year = date.getFullYear();
        const vehicleCategory = vehicleInfo.data.vehicle_category;
        const vehicleOwner = vehicleInfo.data.owner_name;

        // get other details for vechileType
        const vechileCategories = await findByVehicleCategory(vehicleCategory);
        const orderedVechileCategory = orderBy(vechileCategories, 'standardLadenWeight', 'desc');
        const ladenWeight = vehicleInfo.vehicle_gross_weight - vehicleInfo.unladen_weight;
        const nearestVechileCategory = orderedVechileCategory.filter(v => v.standardLadenWeight <= ladenWeight);

        const otherDetails = nearestVechileCategory.length ? nearestVechileCategory[0] : orderedVechileCategory[orderedVechileCategory.length - 1];
        // console.log('otherDetails', otherDetails);
        const distanceString = await getDistance(SourcePincode, DestinationPincode);
        // console.log('disString', distanceString);
        const distance = parseFloat(distanceString.replace(/[^\d.]/g, '')); // Removes non-numeric characters and parses as float

        if (!distance) {
            return res.status(404).json({ error: 'Invalid pin' });
        }

        let co2Emission = 0;

        if (year >= 2021) {
            console.log('above2021', otherDetails.co2EPercentageAbove2021);
            if (round((LoadedWeight), 2) > (0.5 * otherDetails.standardLadenWeight)) {
                co2Emission = distance * otherDetails.co2EPercentageAbove2021;
            } else {
                co2Emission = distance * otherDetails.co2EPercentageAbove2021 * otherDetails.lodedVehicleNomalizationPercentage / 100;
            }
        } else {
            console.log('below2021', otherDetails.co2EPercentageBelow2021);

            if (round((LoadedWeight), 2) > (0.5 * otherDetails.standardLadenWeight)) {
                co2Emission = distance * otherDetails.co2EPercentageBelow2021;
            } else {
                console.log(otherDetails)
                co2Emission = distance * otherDetails.co2EPercentageBelow2021 * otherDetails.lodedVehicleNomalizationPercentage / 100;
            }
        }

        const mobilisationDistance = Number(MobilisationDistance);
        const deMobilisationDistance = Number(DeMobilisationDistance);

        if (mobilisationDistance || deMobilisationDistance) {
            console.log('extraDistance', (mobilisationDistance + deMobilisationDistance));
            if (year >= 2021) {
                co2Emission = co2Emission + (MobilisationDistance + DeMobilisationDistance) * otherDetails.co2EPercentageAbove2021 * otherDetails.emptyVehicleNomalizationPercentage / 100;
            }
            else {
                co2Emission = co2Emission + (MobilisationDistance + DeMobilisationDistance) * otherDetails.co2EPercentageBelow2021 * otherDetails.emptyVehicleNomalizationPercentage / 100;
            }
        }

        const count = await InputHistory.countDocuments({ _user: userId });

        if (count > freeTrailCount) {
            throw new Error('You have exceeded your free trial limit.');
        }

        await InputHistory.create({
            vehicleNumber,
            sourcePincode: SourcePincode,
            destinationPincode: DestinationPincode,
            lodedWeight: LoadedWeight,
            mobilizationDistance: mobilisationDistance,
            deMobilizationDistance: deMobilisationDistance,
            _user: user,
        })

        console.log('overallEmission', co2Emission);
        let currentDate = new Date();

        let month = monthNames[currentDate.getMonth()];

        // Formulate the desired date string
        const certificateIssueDate = `${month} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;

        return res.status(201).json({ co2Emission: round(co2Emission, 2), vehicleOwner, vehicleNumber, certificateIssueDate, certificateNumber: generateUuidNumber() });
    } catch (error) {
        console.log('error is : ', error.message)
        return res.status(404).json({ error: error });
    }
}

module.exports = {
    findCO2Emission, findByVehicleCategory
};

