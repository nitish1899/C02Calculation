const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

router.post('/findCO2Emission', vehicleController.findCO2Emission);
// router.post('/insert', vehicleController.insert);
// router.post('/vehicleInfo', vehicleController.insert);
router.get('/vehicles/type', vehicleController.findByVehicleCategory);

// router.get('/distance', vehicleController.getDistance);
router.post('/getCabonFootPrints', vehicleController.getCabonFootPrints);

router.get('/carbonfootprint/:vehicleNumber', vehicleController.getCarbonFootprintByVehicleNumber);

router.post('/carbonfootprint1', vehicleController.getCarbonFootprintByVehicleNumberbydate);

router.get('/fueltype/:vehicleNumber',vehicleController.getFuelTypeByVehicleNumber);

router.get('/carbonfootprint/diesel/:fuelType', vehicleController.getCarbonFootprintByDieselVehiclesAllTime);

router.get('/carbonfootprint/dieselvehicles/:userId', vehicleController.getCarbonFootprintByDieselVehiclesByDate);


module.exports = router;

