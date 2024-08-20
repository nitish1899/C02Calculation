const axios = require('axios');
const { getUlipToken } = require("./ulipApiAccess.js");

async function aadharVerification(req, res) {
    const { uid, name, dob, gender, mobile } = req.body;
    const ulipToken = getUlipToken();

    try {
        // Check if any field is empty
        if (
            [uid, name, dob, gender, mobile].some((field) => field?.trim() === "")
        ) {
            throw new Error(400, "All fields are required");
        }

        const options = {
            method: 'POST',
            url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/01',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ulipToken}`,
            },
            data: { uid, name, dob, gender, mobile, consent: "Y" }
        };

        const apiResponse = await axios.request(options);
        // console.log('apiResponse:', apiResponse.data);  // Log the full API response

        const response = apiResponse?.data?.response?.[0]?.response;
        // console.log('Extracted response:', response);

        if (apiResponse.data.error === 'true' || !response) {
            throw new Error(400, ('DL Verification Failed'));
        }

        return res.status(200).json({ message: 'Aadhar Verified Successfully' });
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

module.exports = { aadharVerification };
