const axios = require('axios');
require('dotenv').config();

const sendOtpToMobileNumber = async (otp,mobileNumber) => {
    try{
    await axios.get('https://www.fast2sms.com/dev/bulkV2', {
                params: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    variables_values: otp,
                    route: 'otp',
                    numbers: mobileNumber
                }
            });
            return res.status(200).json({})
        }
        catch(error){
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });  
        }
}

module.exports = {sendOtpToMobileNumber};

