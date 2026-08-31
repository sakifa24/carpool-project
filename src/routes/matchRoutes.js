const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/auto-match', authenticateToken, matchController.findAutoMatches);
router.get('/active-requests', matchController.getActiveRequests);
router.delete('/request/:id', authenticateToken, matchController.cancelMatchRequest);

module.exports = router;
