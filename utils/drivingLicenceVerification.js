const axios = require('axios');
const { getUlipToken } = require("./ulipApiAccess.js");

async function drivingLicenceVerification(req, res) {
    try {

        const { dlnumber, dob } = req.body;
        const ulipToken = getUlipToken();

        console.log('ulipToken ', ulipToken);

        if (
            [dlnumber, dob].some((field) => field?.trim() === "")
        ) {
            throw new Error(400, "All fields are required");
        }

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/SARATHI/01',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { dlnumber, dob }
        };

        const apiResponse = await axios.request(options);
        const response = apiResponse?.data?.response?.[0]?.response;

        if (apiResponse.data.error === 'true' || !response) {
            throw new Error(400, ('DL Verification Failed'));
        }
        // console.log('apiResponse', apiResponse.data.response);
        // console.log('response', response?.dldetobj?.[0]?.transReqObj?.[0]);

        return res.status(200).json({ message: 'DL Verified Successfully' });
    } catch (error) {
        // throw new Error(400, error.message);
        return res.status(200).json(error.message);
    }
};

module.exports = { drivingLicenceVerification };