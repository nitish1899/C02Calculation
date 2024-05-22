const express = require('express'); 
const authController = require('../controllers/otp');
const router = express.Router(); 

router.post('/', authController.sendOtp); 
router.post('/verify',authController.verifyOtp);

module.exports = router;