const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/my-rooms', authenticateToken, chatController.getMyChatRooms);
router.get('/ride/:ride_group_id', authenticateToken, chatController.getChatRoom);
router.post('/send', authenticateToken, chatController.sendMessage);

module.exports = router;
