const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

router.post('/findCO2Emission', vehicleController.findCO2Emission);
router.post('/insert', vehicleController.insert);
// router.post('/vehicleInfo', vehicleController.insert);
router.get('/vehicles/type', vehicleController.findByType);
// router.get('/distance', vehicleController.getDistance);

module.exports = router;

