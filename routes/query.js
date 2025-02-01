const express = require('express');
const queryController = require('../controllers/query');
const router = express.Router();

router.post('/', queryController.createQuery);

module.exports = router;