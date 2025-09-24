const express = require('express');
const router = express.Router();
const playArenaController = require('../controllers/playArenaController');

// New route: Get all users from Redis
router.post('/get-all-users', playArenaController.authMiddleware, playArenaController.getAllUsers);

module.exports = router;
