const express = require('express');
const router = express.Router();
const fareController = require('../controllers/fareController');

router.post('/calculate', fareController.calculateFareSplit);
router.get('/estimates', fareController.getCampusRouteEstimates);

module.exports = router;
