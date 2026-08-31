const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/search', rideController.searchRides);
router.get('/vehicles', rideController.getVehicles);
router.get('/my-rides', authenticateToken, rideController.getMyRides);
router.get('/:id', rideController.getRideDetails);

router.post('/create', authenticateToken, rideController.createRide);
router.post('/request-join', authenticateToken, rideController.requestJoinRide);
router.post('/handle-request', authenticateToken, rideController.handleRideRequest);
router.post('/update-status', authenticateToken, rideController.updateRideStatus);

module.exports = router;
