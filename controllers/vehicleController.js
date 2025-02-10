const Vehicle = require('../models/vehicle');
const InputHistory = require('../models/inputHistory');
const User = require("../models/user");
const { orderBy, round } = require('lodash');
const axios = require('axios');
const { freeTrailCount, monthNames } = require('../constants');
const { HttpsProxyAgent } = require('https-proxy-agent');
const xml2js = require('xml2js');
require('dotenv').config();
const cron = require('node-cron');
const { routes } = require('../models/routewiseEmission');
const RoutewiseEmission = require('../models/routewiseEmission');
const { generatePDF } = require('../utils/pdfGenerator');

const mongoose = require('mongoose');

const sourceAndDestination = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Lucknow', 'Varanasi', 'Kolkata', 'Chennai', 'Chandigarh'];

// const { getUlipToken } = require("../utils/ulipApiAccess.js");

let ulipToken = '';

// Placeholder function to simulate fetching the new ULIP token
async function fetchNewULIPToken() {
    const response = await axios.post('https://www.ulip.dpiit.gov.in/ulip/v1.0.0/user/login', {
        username: process.env.ULIP_PROD_USER_NAME,
        password: process.env.ULIP_PROD_PASSWORD
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
        // Function to fetch the new ULIP token
        ulipToken = await fetchNewULIPToken();
        // console.log('ULIP token ', ulipToken);
        // console.log('ULIP token updated successfully');
    } catch (error) {
        console.error('Error updating ULIP token:', error);
    }
});

const { v4: uuidv4 } = require('uuid');

function generateUuidNumber() {
    const uniqueId = uuidv4().split('-')[0]; // Shorten the UUID
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

        const source = response?.data?.origin_addresses;
        const destination = response?.data?.destination_addresses;

        if (!source?.[0].length) { throw new Error('Source not found'); }

        if (!destination?.[0].length) { throw new Error('Destination not found'); }


        // Extract distance information
        const distanceInfo = response?.data?.rows[0]?.elements[0];
        const distance = distanceInfo?.distance?.text;
        // console.log(distance);
        return { distanceString: distance, source: source?.[0], destination: destination?.[0] };
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


async function findByVehicleCategory(vehicleCategory) {
    try {
        const vehicles = await Vehicle.find({ category: vehicleCategory });

        if (vehicles.length === 0) {
            throw new Error('No vehicles found for the specified type');
        }

        return vehicles;
    } catch (error) {
        // Handle any errors that occur during the query
        console.error('Error finding vehicles:', error.message);
        return error.message;
    }
}

async function parseXmlToJson(xml) {
    try {
        const parser = new xml2js.Parser();
        const vehicleJsonData = (await parser.parseStringPromise(xml))?.VehicleDetails;
        // console.log('vehicleJsonData', vehicleJsonData);
        return vehicleJsonData;
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}

async function findCO2Emission(req, res) {
    try {
        // const ulipToken = getUlipToken();
        const {
            VechileNumber,
            SourcePincode,
            DestinationPincode,
            MobilisationDistance,
            DeMobilisationDistance,
            LoadedWeight,
            gstin,
            userId
        } = req.body;
        const user = await User.findByIdAndUpdate(userId, { gstin });
        const vehicleNumber = VechileNumber.replace(" ", '').toUpperCase();
        const options = {
            method: 'POST',
            // url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/VAHAN/01',
            url: 'https://www.ulip.dpiit.gov.in/ulip/v1.0.0/VAHAN/01',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: {
                vehiclenumber: vehicleNumber,
            },
        };

        // Validate vehicle number
        if (!/^[a-zA-Z0-9]+$/.test(vehicleNumber) || vehicleNumber.length > 10) {
            return res.status(400).json({ error: 'Invalid vehicle number. Only alphanumeric characters are allowed.' });
        }

        if (!Number(SourcePincode) || SourcePincode.length != 6 || !Number(DestinationPincode) || DestinationPincode.length != 6) {
            throw new Error('Invalid source or destination pincode');
        }

        const vehicleData = await axios.request(options);
        const vehicleDetails = vehicleData?.data?.response?.[0]?.response;

        // console.log('EV-Respose: ', vehicleData?.data?.response?.[0]?.response);
        // console.log((vehicleData?.data?.response?.[0]?.response).includes('ULIPNICDC')) 

        //  ULIPNICDC is not authorized to access Non-Transport vehicle data
        if (vehicleDetails?.includes('ULIPNICDC')) {
            return res.status(404).json({ error: 'Non-Transport vehicle found' });
        }

        //  Vehicle Details not Found
        if (vehicleDetails?.includes('Vehicle Details not Found')) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // rc_fuel_desc: ELECTRIC(BOV)

        // get vechileInfo using vehicle number
        // console.log('vehicleData', vehicleXMLData);
        const vehicleJsonData = (await parseXmlToJson(vehicleDetails));
        // console.log('vehicleDataType : ', typeof (vehicleJsonData));
        // console.log('vehicleData : ', vehicleJsonData);


        // const vehicleInfo = vehicleData.data;
        // // console.log('vehicleInfo',vehicleInfo)
        const dateString = vehicleJsonData?.rc_regn_dt?.[0];
        const date = new Date(dateString);
        const year = date.getFullYear();
        const vehicleCategory = vehicleJsonData?.rc_vch_catg;
        // console.log('vehicleCategory', vehicleCategory);
        // const vehicleOwner = vehicleJsonData?.rc_owner_name?.[0];

        // get other details for vechileType
        const vechileCategories = await findByVehicleCategory(vehicleCategory);
        const orderedVechileCategory = orderBy(vechileCategories, 'standardLadenWeight', 'desc');
        const ladenWeight = vehicleJsonData?.[0]?.rc_gvw - vehicleJsonData?.[0]?.rc_unld_wt;
        const nearestVechileCategory = orderedVechileCategory.filter(v => v.standardLadenWeight <= ladenWeight);

        const otherDetails = nearestVechileCategory.length ? nearestVechileCategory[0] : orderedVechileCategory[orderedVechileCategory.length - 1];
        // console.log('otherDetails', otherDetails);
        const { distanceString, source, destination } = await getDistance(SourcePincode, DestinationPincode);

        // console.log('disString', distanceString);
        const distance = parseFloat(distanceString.replace(/[^\d.]/g, '')); // Removes non-numeric characters and parses as float

        if (!distance) {
            return res.status(404).json({ error: 'Invalid pin' });
        }

        // function getRandomNumber(min, max) {
        //     return Math.floor(Math.random() * (max - min + 1)) + min;
        // }

        // 1000 kg co2 emission is equivalent to 12 trees

        let co2Emission = 0;

        if (vehicleJsonData.rc_fuel_desc[0] !== 'ELECTRIC(BOV)') {
            if (year >= 2021) {
                // console.log('above2021', otherDetails.co2EPercentageAbove2021);
                if (round((LoadedWeight), 2) > (0.5 * otherDetails.standardLadenWeight)) {
                    co2Emission = distance * otherDetails.co2EPercentageAbove2021;
                } else {
                    co2Emission = distance * otherDetails.co2EPercentageAbove2021 * otherDetails.lodedVehicleNomalizationPercentage;
                }
            } else {
                // console.log('below2021', otherDetails.co2EPercentageBelow2021);
                if (round((LoadedWeight), 2) > (0.5 * otherDetails.standardLadenWeight)) {
                    co2Emission = distance * otherDetails.co2EPercentageBelow2021;
                } else {
                    // console.log(otherDetails)
                    co2Emission = distance * otherDetails.co2EPercentageBelow2021 * otherDetails.lodedVehicleNomalizationPercentage;
                }
            }

            const mobilisationDistance = MobilisationDistance?.length ? Number(MobilisationDistance) : '';
            const deMobilisationDistance = DeMobilisationDistance?.length ? Number(DeMobilisationDistance) : '';

            if (mobilisationDistance || deMobilisationDistance) {
                // console.log('extraDistance', (mobilisationDistance + deMobilisationDistance));
                if (year >= 2021) {
                    co2Emission = co2Emission + (MobilisationDistance + DeMobilisationDistance) * otherDetails.co2EPercentageAbove2021 * otherDetails.emptyVehicleNomalizationPercentage;
                }
                else {
                    co2Emission = co2Emission + (MobilisationDistance + DeMobilisationDistance) * otherDetails.co2EPercentageBelow2021 * otherDetails.emptyVehicleNomalizationPercentage;
                }
            }
        }

        const count = await InputHistory.countDocuments({ _user: userId });

        if (count > freeTrailCount) {
            throw new Error('You have exceeded your free trial limit.');
        }

        // console.log('overallEmission', co2Emission);
        let currentDate = new Date();
        let month = monthNames[currentDate.getMonth()];

        // // Formulate the desired date string
        const certificateIssueDate = `${month} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
        const certificateNumber = generateUuidNumber();

        // console.log('fuelType:', vehicleJsonData?.rc_fuel_desc?.[0])

        const inputHistory = await InputHistory.create({
            vehicleNumber,
            sourcePincode: SourcePincode,
            destinationPincode: DestinationPincode,
            lodedWeight: LoadedWeight,
            mobilizationDistance: MobilisationDistance,
            deMobilizationDistance: DeMobilisationDistance,
            carbonFootprint: co2Emission,
            certificateNumber,
            user: user,
            fuelType: vehicleJsonData?.rc_fuel_desc?.[0],
            distance,
        });

        await addco2EmissionToRoute(user, round(co2Emission, 2), source, destination);

        return res.status(201).json({
            co2Emission: round(co2Emission, 2),
            vehicleNumber,
            certificateIssueDate,
            certificateNumber,
            vehicleJsonData,
            id: inputHistory._id
        });
    } catch (error) {
        // console.log('error is : ', error.message)
        return res.status(404).json({ error: error.message });
    }
}

const generateCarbonFootprintPDF = async (req, res) => {
    try {
        const { userId, id } = req.body;

        if (!userId) {
            throw new Error('User Id is required!');
        }

        const user = User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const inputHistory = await InputHistory.findById(id);

        if (inputHistory.pdfUrl) {
            return res.status(200).json({ success: true, url: inputHistory.url });
        }

        const response = await generatePDF(
            {
                certificateNumber: inputHistory.certificateNumber,
                certificateIssueDate: inputHistory.certificateIssueDate,
                userName: user.userName,
                vehicleNumber: inputHistory.vehicleNumber,
                co2Emission: inputHistory.carbonFootprint,
                baseUsername: user.baseUsername,
            });

        inputHistory.pdfUrl = response.url;

        await inputHistory.save();

        return res.status(200).json({ success: true, url: response.url });
    } catch (error) {
        console.log(error.message);
        return res.status(400).json({ success: false, error: error.message });
    }

}

const addco2EmissionToRoute = async (user, co2Emission, sourceDetails, destinationDetails) => {
    try {
        const regex = new RegExp(sourceAndDestination.join("|"), "i");
        const sourceMatch = sourceDetails.match(regex);
        const destinationMatch = destinationDetails.match(regex);

        const source = sourceMatch ? sourceMatch[0] : null;
        const destination = destinationMatch ? destinationMatch[0] : null;

        if (!source || !destination) {
            console.error("Source or Destination not found in predefined list.");
            return;
        }

        // Determine the route correctly
        const route = routes.includes(`${source}-${destination}`)
            ? `${source}-${destination}`
            : routes.includes(`${destination}-${source}`)
                ? `${destination}-${source}`
                : "Other Routes";

        // Find the emission record for the route
        let routewiseEmissionData = await RoutewiseEmission.findOne({ user, route });

        if (!routewiseEmissionData) {
            // Create a new entry if no existing record is found
            routewiseEmissionData = new RoutewiseEmission({ user, route, emission: 0 });
        }

        // Update total emission
        routewiseEmissionData.totalEmission += Number(co2Emission);

        // Save the updated record
        await routewiseEmissionData.save();

        // console.log(`Updated emissions for route ${route}: ${routewiseEmissionData.totalEmission}`);
    } catch (error) {
        console.error("Error updating CO2 emissions:", error);
    }
};

async function getCabonFootPrints(req, res) {
    try {
        // const ulipToken = getUlipToken();
        const {
            VechileNumber,
            SourcePincode,
            DestinationPincode,
            MobilisationDistance,
            DeMobilisationDistance,
            LoadedWeight,
            // gstin,
            // userId
        } = req.body;
        // const user = await User.findOneAndUpdate(userId, { gstin });
        const vehicleNumber = VechileNumber.replace(" ", '').toUpperCase();
        const options = {
            method: 'POST',
            url: 'https://www.ulip.dpiit.gov.in/ulip/v1.0.0/VAHAN/01',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: {
                vehiclenumber: vehicleNumber,
            },
        };

        // Validate vehicle number
        if (!/^[a-zA-Z0-9]+$/.test(vehicleNumber) || vehicleNumber.length > 10) {
            return res.status(400).json({ error: 'Invalid vehicle number. Only alphanumeric characters are allowed.' });
        }

        if (!Number(SourcePincode) || SourcePincode.length != 6 || !Number(DestinationPincode) || DestinationPincode.length != 6) {
            throw new Error('Invalid source or destination pincode');
        }

        const vehicleData = await axios.request(options);
        const vehicleDetails = vehicleData?.data?.response?.[0]?.response;

        // console.log('EV-Respose: ', vehicleData?.data?.response?.[0]?.response);
        // console.log((vehicleData?.data?.response?.[0]?.response).includes('ULIPNICDC')) 

        //  ULIPNICDC is not authorized to access Non-Transport vehicle data
        if (vehicleDetails.includes('ULIPNICDC')) {
            return res.status(404).json({ error: 'Non-Transport vehicle found' });
        }

        //  Vehicle Details not Found
        if (vehicleDetails.includes('Vehicle Details not Found')) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // rc_fuel_desc: ELECTRIC(BOV)

        // get vechileInfo using vehicle number
        // console.log('vehicleData', vehicleXMLData);
        const vehicleJsonData = (await parseXmlToJson(vehicleDetails));
        // console.log('vehicleDataType : ', typeof (vehicleJsonData));
        // console.log('vehicleData : ', vehicleJsonData);


        // const vehicleInfo = vehicleData.data;
        // console.log('vehicleInfo',vehicleJsonData)
        const dateString = vehicleJsonData?.rc_regn_dt?.[0];
        const date = new Date(dateString);
        const year = date.getFullYear();
        const vehicleCategory = vehicleJsonData?.rc_vch_catg;
        // console.log('vehicleCategory', vehicleCategory);
        // const vehicleOwner = vehicleJsonData?.rc_owner_name?.[0];

        // get other details for vechileType
        const vechileCategories = await findByVehicleCategory(vehicleCategory);
        const orderedVechileCategory = orderBy(vechileCategories, 'standardLadenWeight', 'desc');
        const ladenWeight = vehicleJsonData?.[0]?.rc_gvw - vehicleJsonData?.[0]?.rc_unld_wt;
        const nearestVechileCategory = orderedVechileCategory.filter(v => v.standardLadenWeight <= ladenWeight);

        const otherDetails = nearestVechileCategory.length ? nearestVechileCategory[0] : orderedVechileCategory[orderedVechileCategory.length - 1];
        // console.log('otherDetails', otherDetails);
        const distanceString = await getDistance(SourcePincode, DestinationPincode);
        // console.log('disString', distanceString);
        const distance = parseFloat(distanceString.replace(/[^\d.]/g, '')); // Removes non-numeric characters and parses as float

        if (!distance) {
            return res.status(404).json({ error: 'Invalid pin' });
        }

        // function getRandomNumber(min, max) {
        //     return Math.floor(Math.random() * (max - min + 1)) + min;
        // }

        // 1000 kg co2 emission is equivalent to 12 trees

        let co2Emission = 0;

        if (vehicleJsonData.rc_fuel_desc[0] !== 'ELECTRIC(BOV)') {
            if (year >= 2021) {
                // console.log('above2021', otherDetails.co2EPercentageAbove2021);
                if (round((LoadedWeight), 2) > (0.5 * otherDetails.standardLadenWeight)) {
                    co2Emission = distance * otherDetails.co2EPercentageAbove2021;
                } else {
                    co2Emission = distance * otherDetails.co2EPercentageAbove2021 * otherDetails.lodedVehicleNomalizationPercentage;
                }
            } else {
                // console.log('below2021', otherDetails.co2EPercentageBelow2021);
                if (round((LoadedWeight), 2) > (0.5 * otherDetails.standardLadenWeight)) {
                    co2Emission = distance * otherDetails.co2EPercentageBelow2021;
                } else {
                    // console.log(otherDetails)
                    co2Emission = distance * otherDetails.co2EPercentageBelow2021 * otherDetails.lodedVehicleNomalizationPercentage;
                }
            }

            const mobilisationDistance = MobilisationDistance?.length ? Number(MobilisationDistance) : '';
            const deMobilisationDistance = DeMobilisationDistance?.length ? Number(DeMobilisationDistance) : '';

            if (mobilisationDistance || deMobilisationDistance) {
                // console.log('extraDistance', (mobilisationDistance + deMobilisationDistance));
                if (year >= 2021) {
                    co2Emission = co2Emission + (MobilisationDistance + DeMobilisationDistance) * otherDetails.co2EPercentageAbove2021 * otherDetails.emptyVehicleNomalizationPercentage;
                }
                else {
                    co2Emission = co2Emission + (MobilisationDistance + DeMobilisationDistance) * otherDetails.co2EPercentageBelow2021 * otherDetails.emptyVehicleNomalizationPercentage;
                }
            }
        }

        // console.log('overallEmission', co2Emission);
        let currentDate = new Date();
        let month = monthNames[currentDate.getMonth()];

        // // Formulate the desired date string
        const certificateIssueDate = `${month} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;

        return res.status(201).json({
            co2Emission: round(co2Emission, 2),
            vehicleNumber,
            certificateIssueDate,
            certificateNumber: generateUuidNumber()
        });
    } catch (error) {
        if (error.response) {
            return res.status(404).json({ error: 'Failed to load response' });
        }
        // console.log('error is : ', error.message)
        return res.status(404).json({ error: error.message });
    }
}

async function getCarbonFootprintByVehicleNumber(req, res) {
    try {
        const { vehicleNumber } = req.params;

        // Validate vehicle number
        if (!vehicleNumber || !/^[a-zA-Z0-9]+$/.test(vehicleNumber)) {
            return res.status(400).json({ error: 'Invalid vehicle number.' });
        }

        // Fetch data from InputHistory for the vehicle number
        const data = await InputHistory.aggregate([
            { $match: { vehicleNumber: vehicleNumber } }, // Match the vehicle number
            {
                $project: {
                    carbonFootprint: { $toDouble: "$carbonFootprint" }, // Ensure carbonFootprint is treated as a number
                    createdAt: 1, // Include the createdAt field
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date
                    totalEmission: { $sum: "$carbonFootprint" }, // Sum of emissions per day
                }
            },
            { $sort: { "_id": 1 } }, // Sort by date ascending
        ]);

        if (data.length === 0) {
            return res.status(404).json({ error: 'No carbon footprint data found for this vehicle number.' });
        }

        // Format the response
        const response = data.map(item => ({
            date: item._id,
            carbonFootprint: item.totalEmission.toFixed(2),
        }));

        return res.status(200).json({
            vehicleNumber,
            carbonFootprintData: response,
        });
    } catch (error) {
        console.error('Error fetching carbon footprint data:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

async function getCarbonFootprintByVehicleNumberbydate(req, res) {
    try {
        const { vehicleNumber, startDate, endDate, daily, last7days, last15days, monthly } = req.query;

        if (!vehicleNumber || !/^[a-zA-Z0-9]+$/.test(vehicleNumber)) {
            return res.status(400).json({ error: 'Invalid vehicle number.' });
        }

        let start = startDate && startDate.length > 0 ? new Date(startDate) : new Date(); // Default to provided startDate
        let end = endDate && endDate.length > 0 ? new Date(endDate) : new Date();     // Default to provided endDate

        if (daily === "true") {
            start = new Date(); // Start of today
            end = new Date();   // End of today
        }

        if (last7days === "true") {
            start = new Date(); // Set start to today
            start.setDate(start.getDate() - 7); // Go back 7 days
            end = new Date();   // End is today
        }

        if (last15days === "true") {
            start = new Date(); // Set start to today
            start.setDate(start.getDate() - 15); // Go back 15 days
            end = new Date();   // End is today
        }

        if (monthly === "true") {
            start = new Date(); // Set start to today
            start.setDate(start.getDate() - 30); // Go back 30 days
            end = new Date();   // End is today
        }

        if (!start || !end) {
            return res.status(400).json({ error: 'Start and End dates are required.' });
        }

        // Format start to the beginning of the day
        start.setHours(0, 0, 0, 0);

        // Format end to the end of the day
        end.setHours(23, 59, 59, 999);

        // console.log('start', start, 'end', end);

        const data = await InputHistory.aggregate([
            {
                $match: {
                    vehicleNumber: vehicleNumber,
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $project: {
                    carbonFootprint: { $toDouble: "$carbonFootprint" }, // Convert carbonFootprint to a number
                    createdAt: 1, // Include the createdAt field
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalEmission: { $sum: "$carbonFootprint" },
                },
            },
            { $sort: { "_id": 1 } },
        ]);

        if (data.length === 0) {
            return res.status(404).json({ error: 'No carbon footprint data found for this vehicle number in the given date range.' });
        }

        const response = data.map(item => ({
            date: item._id,
            carbonFootprint: item.totalEmission.toFixed(2),
        }));

        return res.status(200).json({
            vehicleNumber,
            startDate,
            endDate,
            carbonFootprintData: response,
        });
    } catch (error) {
        console.error('Error fetching carbon footprint data:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

async function getFuelTypeByVehicleNumber(req, res) {
    try {
        const { vehicleNumber } = req.params;

        // Find the document based on vehicleNumber
        const inputRecord = await InputHistory.findOne({ vehicleNumber });

        if (!inputRecord) {
            return res.status(404).json({
                success: false,
                message: `No record found for vehicle number: ${vehicleNumber}`
            });
        }

        // Respond with the fuelType
        res.status(200).json({
            success: true,
            fuelType: inputRecord.fuelType
        });
    } catch (error) {
        console.error('Error fetching fuelType by vehicle number:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

async function getCarbonFootprintByDieselVehiclesAllTime(req, res) {
    try {
        const fuelType = "DIESEL"; // Ensure the case matches your database

        // Aggregate query for fetching diesel vehicle carbon footprint data
        const data = await InputHistory.aggregate([
            {
                $match: {
                    fuelType: { $eq: fuelType } // Match documents with fuelType "DIESEL"
                },
            },
            {
                $project: {
                    carbonFootprint: { $toDouble: "$carbonFootprint" }, // Convert carbonFootprint to a number
                    createdAt: 1, // Include createdAt field
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date
                    totalEmission: { $sum: "$carbonFootprint" }, // Sum carbonFootprint for each date
                },
            },
            {
                $sort: { "_id": 1 }, // Sort by date in ascending order
            },
        ]);

        // Check if data is empty
        if (!data || data.length === 0) {
            return res.status(404).json({
                error: 'No carbon footprint data found for diesel vehicles.',
            });
        }

        // Format the response data
        const response = data.map((item) => ({
            date: item._id, // Date in YYYY-MM-DD format
            carbonFootprint: item.totalEmission.toFixed(2), // Format the carbon footprint to 2 decimal places
        }));

        return res.status(200).json({
            fuelType,
            carbonFootprintData: response,
        });
    } catch (error) {
        console.error('Error fetching carbon footprint data for diesel vehicles:', error);
        return res.status(500).json({
            error: 'Internal server error.',
        });
    }
}

async function getCarbonFootprintByDieselVehiclesByDate1(req, res) {
    try {
        const { userId } = req.params;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        // Fetch diesel vehicle data without grouping
        const data = await InputHistory.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId), // Convert userId to ObjectId
                    fuelType: "DIESEL"
                }
            },
            {
                $project: {
                    carbonFootprint: {
                        $ifNull: [{ $toDouble: "$carbonFootprint" }, 0]  // Default 0 if null
                    },
                    distance: {
                        $ifNull: [{ $toDouble: "$distance" }, 0]  // Default 0 if null
                    },
                    createdAt: 1,
                    vehicleNumber: 1,
                    fuelType: 1,
                    updatedAt: 1
                }
            },
            {
                $sort: { createdAt: 1 } // Sort by createdAt timestamp
            }
        ]);

        if (data.length === 0) {
            return res.status(404).json({ error: 'No diesel vehicle data found for the given user ID.' });
        }

        // Format the response
        const response = data.map(item => ({
            date: item.createdAt.toISOString().split('T')[0], // Format date as YYYY-MM-DD
            vehicleNumber: item.vehicleNumber || "Unknown", // Default "Unknown" if missing
            carbonFootprint: (item.carbonFootprint || 0).toFixed(2), // Ensure value before toFixed
            totalDistance: (item.distance || 0).toFixed(2), // Ensure value before toFixed
            fuelType: item.fuelType || "DIESEL", // Default to "DIESEL"
            updatedAt: item.updatedAt || new Date().toISOString(), // Default current timestamp
            pdfUrl: item.pdfurl
        }));

        return res.status(200).json({
            userId,
            carbonFootprintData: response,
            message: `Diesel vehicle carbon footprint and distance listed separately for user ID ${userId}`
        });
    } catch (error) {
        console.error('Error fetching diesel vehicle carbon footprint by date and vehicle:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

async function getCarbonFootprintByDieselVehiclesByDate(req, res) {
    try {
        const { userId } = req.params;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        // Fetch and group diesel vehicle data by date
        const data = await InputHistory.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId), // Convert userId to ObjectId
                    fuelType: "DIESEL"
                }
            },
            {
                $project: {
                    carbonFootprint: { $toDouble: "$carbonFootprint" }, // Ensure carbonFootprint is treated as a number
                    distance: { $toDouble: "$distance" }, // Ensure distance is treated as a number
                    createdAt: 1,
                    vehicleNumber: 1,
                    fuelType: 1,
                    updatedAt: 1
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date
                    totalEmission: { $sum: "$carbonFootprint" }, // Sum of emissions for each date
                    totalDistance: { $sum: "$distance" }, // Sum of distances for each date
                    vehicleNumber: { $first: "$vehicleNumber" }, // Take the first vehicleNumber in each group
                    fuelType: { $first: "$fuelType" }, // Take the first fuelType in each group
                    updatedAt: { $first: "$updatedAt" } // Take the first updatedAt in each group
                }
            },
            { $sort: { "_id": 1 } } // Sort by date ascending
        ]);

        if (data.length === 0) {
            return res.status(404).json({ error: 'No diesel vehicle data found for the given user ID.' });
        }

        // Format the response
        const response = data.map(item => ({
            date: item._id,
            carbonFootprint: item.totalEmission.toFixed(2), // Limit to 2 decimal places
            totalDistance: item.totalDistance.toFixed(2), // Limit to 2 decimal places
            vehicleNumber: item.vehicleNumber,
            fuelType: item.fuelType,
            updatedAt: item.updatedAt
        }));

        return res.status(200).json({
            userId,
            carbonFootprintData: response,
            message: `Diesel vehicle carbon footprint and distance grouped by date for user ID ${userId}`
        });
    } catch (error) {
        console.error('Error fetching diesel vehicle carbon footprint by date:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}



const ownerVehicleInfo = async (req, res) => {
    try {
        const { userId } = req.params; // Extract userId from request parameters
        const { startDate, endDate, daily, last7days, last15days, monthly, yearly, last5years, all } = req.query; // Extract timestamps from query parameters

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        let start = startDate && startDate.length > 0 ? new Date(startDate) : new Date(); // Default to provided startDate
        let end = endDate && endDate.length > 0 ? new Date(endDate) : new Date();     // Default to provided endDate

        if (daily === "true") {
            start = new Date(); // Start of today
            end = new Date();   // End of today
        }

        if (last7days === "true") {
            start = new Date(); // Set start to today
            start.setDate(start.getDate() - 7); // Go back 7 days
            end = new Date();   // End is today
        }

        if (last15days === "true") {
            start = new Date(); // Set start to today
            start.setDate(start.getDate() - 15); // Go back 15 days
            end = new Date();   // End is today
        }

        if (monthly === "true") {
            start = new Date(); // Set start to today
            start.setDate(start.getDate() - 30); // Go back 30 days
            end = new Date();   // End is today
        }


        if (yearly === "true") {
            start = new Date(); // Set start to today
            start.setFullYear(start.getFullYear());
            start.setMonth(0, 1);
            end = new Date();   // End is today
        }

        if (last5years === "true") {
            start = new Date(); // Set start to today
            start.setFullYear(start.getFullYear() - 5); // Go back 5 years
            start.setMonth(0, 1);
            end = new Date();   // End is today
        }

        if (all === "true") {
            start = new Date(0); // Unix epoch start time (January 1, 1970)
            end = new Date();    // End is today
        }


        if (!start || !end) {
            return res.status(400).json({ error: 'Start and End dates are required.' });
        }

        // Format start to the beginning of the day
        start.setHours(0, 0, 0, 0);

        // Format end to the end of the day
        end.setHours(23, 59, 59, 999);

        // console.log('start', start, 'end', end);

        // Ensure both timestamps are provided
        if (!start || !end) {
            return res.status(400).json({ error: "Both startTime and endTime are required." });
        }

        // Aggregation pipeline
        const records = await InputHistory.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date (YYYY-MM-DD)
                        fuelType: "$fuelType", // Group by fuelType
                    },
                    totalCarbonFootprint: { $sum: "$carbonFootprint" }, // Sum of carbonFootprint
                    count: { $sum: 1 } // Count of records
                }
            },
            {
                $sort: { "_id.date": 1, "_id.fuelType": 1 } // Sort by fuelType and date
            }
        ]);

        return res.status(200).json(records);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getRouteWiseEmission = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            throw new Error('User Id is required!');
        }
        const routewiseEmission = await RoutewiseEmission.find({ user: userId });

        const routewiseEmissionData = routes.map(route => {
            const routeData = routewiseEmission?.find(r => r.route === route);
            const totalEmission = routeData ? routeData.totalEmission : 0;
            return { route, totalEmission };
        })
        // console.log(routewiseEmission);
        return res.status(200).json({
            success: true,
            routewiseEmissionData
        })
    } catch (error) {
        console.log(error)
    }

}


async function getCarbonFootprintByDate(req, res) {
    try {
        const { fuelType, startDate, endDate, daily, last7days, monthly, yearly } = req.query;

        let start = startDate && startDate.length > 0 ? new Date(startDate) : null;
        let end = endDate && endDate.length > 0 ? new Date(endDate) : new Date();

        // Apply default filters based on user selection
        if (daily === "true") {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        } else if (last7days === "true") {
            start = new Date();
            start.setDate(start.getDate() - 7);
        } else if (monthly === "true") {
            start = new Date();
            start.setDate(start.getDate() - 30);
        } else if (yearly === "true") {
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
        }

        if (!start || !end) {
            return res.status(400).json({ error: 'Start and End dates are required.' });
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const matchStage = {
            createdAt: { $gte: start, $lte: end }
        };

        // Apply fuel type filter if provided
        if (fuelType) {
            matchStage.fuelType = fuelType;
        }

        const data = await InputHistory.aggregate([
            { $match: matchStage },
            {
                $project: {
                    vehicleNumber: 1,
                    fuelType: 1,
                    carbonFootprint: { $toDouble: "$carbonFootprint" }, // Ensure numeric data
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        vehicleNumber: "$vehicleNumber",
                        fuelType: "$fuelType"
                    },
                    totalEmission: { $sum: "$carbonFootprint" },
                    lastUpdated: { $max: "$updatedAt" } // Get latest updatedAt timestamp
                },
            },
            { $sort: { "_id.date": 1 } },
        ]);

        if (data.length === 0) {
            return res.status(404).json({ error: 'No carbon footprint data found in the given date range.' });
        }

        return res.status(200).json({
            fuelType: fuelType || "All",
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0],
            carbonFootprintData: data.map(item => ({
                date: item._id.date,
                vehicleNumber: item._id.vehicleNumber,
                fuelType: item._id.fuelType,
                carbonFootprint: item.totalEmission.toFixed(2),
                updatedAt: new Date(item.lastUpdated).toISOString(), // Format updatedAt
            })),
        });
    } catch (error) {
        console.error('Error fetching carbon footprint data:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}


async function getCarbonFootprintByDieselVehiclesByDate1(req, res) {
    try {
        const { userId } = req.params;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        // Fetch and group diesel vehicle data by date and vehicleNumber
        const data = await InputHistory.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId), // Convert userId to ObjectId
                    fuelType: "DIESEL"
                }
            },
            {
                $project: {
                    carbonFootprint: { $toDouble: "$carbonFootprint" }, // Ensure carbonFootprint is treated as a number
                    distance: { $toDouble: "$distance" }, // Ensure distance is treated as a number
                    createdAt: 1,
                    vehicleNumber: 1,
                    fuelType: 1,
                    updatedAt: 1,
                    pdfUrl: 1
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by date
                        vehicleNumber: "$vehicleNumber" // Group by vehicleNumber
                    },
                    totalEmission: { $sum: "$carbonFootprint" }, // Sum emissions for each vehicle on the same date
                    totalDistance: { $sum: "$distance" }, // Sum distances for each vehicle on the same date
                    fuelType: { $first: "$fuelType" }, // Take the first fuelType in each group
                    updatedAt: { $first: "$updatedAt" }, // Take the first updatedAt in each group
                    pdfUrl: { $first: "$pdfUrl" }
                }
            },
            { $sort: { "_id.date": 1, "_id.vehicleNumber": 1 } } // Sort by date and vehicleNumber ascending
        ]);

        if (data.length === 0) {
            return res.status(404).json({ error: 'No diesel vehicle data found for the given user ID.' });
        }

        // Format the response
        const response = data.map(item => ({
            date: item._id.date,
            vehicleNumber: item._id.vehicleNumber,
            carbonFootprint: item.totalEmission.toFixed(2), // Limit to 2 decimal places
            totalDistance: item.totalDistance.toFixed(2), // Limit to 2 decimal places
            fuelType: item.fuelType,
            updatedAt: item.updatedAt,
            pdfUrl: item.pdfUrl,
        }));

        return res.status(200).json({
            userId,
            carbonFootprintData: response,
            message: `Diesel vehicle carbon footprint and distance grouped by date and vehicle for user ID ${userId}`
        });
    } catch (error) {
        console.error('Error fetching diesel vehicle carbon footprint by date and vehicle:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = {
    findCO2Emission, findByVehicleCategory, getCabonFootPrints, getCarbonFootprintByVehicleNumberbydate,
    getCarbonFootprintByVehicleNumber, getFuelTypeByVehicleNumber, getCarbonFootprintByDieselVehiclesAllTime,
    getCarbonFootprintByDieselVehiclesByDate, ownerVehicleInfo, getRouteWiseEmission, getCarbonFootprintByDate,
    getCarbonFootprintByDieselVehiclesByDate1, generateCarbonFootprintPDF
};

