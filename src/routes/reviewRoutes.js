const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, reviewController.createReview);
router.get('/student/:student_id', reviewController.getStudentReviews);

module.exports = router;
