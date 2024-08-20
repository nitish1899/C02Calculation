const axios = require('axios');
const { getUlipToken } = require("./ulipApiAccess.js");

// const aadharVerification = asyncHandler(
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
        // throw new Error(400, error.message);
        return res.status(200).json(error.message);
    }
}

// );


// For new users only. User do not have digilocker account will recieve otp on moible number
// async function digilockerOtpVerification(req, res) {

//     try {
//         const { mobile, otp, code_challenge, code_verifier } = req.body;

//         if (
//             [mobile, otp, code_challenge, code_verifier].some((field) => field?.trim() === "")
//         ) {
//             throw new ApiError(400, "All fields are required")
//         }

//         const options = {
//             method: 'POST',
//             url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/02',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${ulipToken}`,
//             },
//             data: { mobile, otp, code_challenge, code_verifier }
//         }

//         const apiResponse = await axios.request(options);
//         const response = apiResponse?.data?.response?.[0]?.response;

//         return res.status(200).json(response);
//     }
//     catch (error) {
//         console.log('Error', error);
//         res.status(400).json(error.message);
//     }
// };

// async function digilockerToken(code, code_verifier) {

//     // console.log('code && code_verifier', code, code_verifier)

//     try {

//         if (
//             [code, code_verifier].some((field) => field?.trim() === "")
//         ) {
//             throw new ApiError(400, "All fields are required")
//         }

//         const options = {
//             method: 'POST',
//             url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/03',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${ulipToken}`,
//             },
//             data: { code, code_verifier }
//         }

//         const apiResponse = await axios.request(options);
//         const token = apiResponse?.data?.response?.[0]?.response.access_token;

//         return token;
//     }
//     catch (error) {
//         // console.log('Error', error);
//         throw new ApiError(error.message);
//     }
// };

// async function panVerification(req, res) {
// async function panVerification(panno, PANFullName, code, code_verifier) {
//     try {
//         // const { panno, PANFullName, code, code_verifier } = req.body;

//         if (
//             [panno, PANFullName, code, code_verifier].some((field) => field?.trim() === "")
//         ) {
//             throw new ApiError(400, "All fields are required")
//         }

//         const token = await digilockerToken(code, code_verifier);

//         // console.log('token', token);

//         const options = {
//             method: 'POST',
//             url: 'https://www.ulipstaging.dpiit.gov.in/ulip/v1.0.0/DIGILOCKER/04',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${ulipToken}`,
//             },
//             data: { panno, PANFullName, token, consent: "Y" }
//         }

//         const apiResponse = await axios.request(options);
//         const response = apiResponse?.data?.response?.[0]?.response;

//         if (apiResponse.data.error === 'true') {
//             throw new ApiError(400, ('Pan Verification Failed'));
//         }

//         return res.status(200).json(response);
//     }
//     catch (error) {
//         // console.log('Error', error);

//         throw new ApiError(400, (error.message));
//         // res.status(400).json(error.message);
//     }
// };

module.exports = { aadharVerification };
