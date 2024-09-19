const express = require('express');
const router = express.Router();
const { drivingLicenceVerification } = require('../utils/drivingLicenceVerification');
const { aadharVerification, digilockerOtpVerification, panVerification } = require('../utils/kyc');

router.post('/drivingLicence', drivingLicenceVerification);
router.post('/aadhar', aadharVerification);
router.post('/aadhar/otp', digilockerOtpVerification);
router.post('/pan', panVerification);

module.exports = router;