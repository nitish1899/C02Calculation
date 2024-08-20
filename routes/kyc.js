const express = require('express');
const router = express.Router();
const { drivingLicenceVerification } = require('../utils/drivingLicenceVerification');
const { aadharVerification } = require('../utils/aadhar');

router.get('/drivingLicence', drivingLicenceVerification);
router.get('/aadhar', aadharVerification);

module.exports = router;