const express = require('express');
const router = express.Router();
const { drivingLicenceVerification } = require('../utils/drivingLicenceVerification');
const { aadharVerification, digilockerOtpVerification, panVerification } = require('../utils/kyc');

router.get('/drivingLicence', drivingLicenceVerification);
router.get('/aadhar', aadharVerification);
router.get('/aadhar/otp', digilockerOtpVerification);
router.get('/pan', panVerification);

module.exports = router;