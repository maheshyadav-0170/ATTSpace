const express = require('express');
const router = express.Router();
const playArenaController = require('../controllers/playArenaController');

// Existing POST routes
router.post('/get-all-users', playArenaController.authMiddleware, playArenaController.getAllUsers);
router.post('/book-private-game', playArenaController.authMiddleware, playArenaController.bookPrivateGame);
router.post('/book-arena-game', playArenaController.authMiddleware, playArenaController.bookArenaGame);
router.post('/submit-score', playArenaController.authMiddleware, playArenaController.submitScore);
router.post('/join-arena-game', playArenaController.authMiddleware, playArenaController.joinArenaGame);
router.post('/checkin', playArenaController.authMiddleware, playArenaController.checkin);
router.post('/user-scores', playArenaController.authMiddleware, playArenaController.getUserScores);

// Updated routes (changed from GET to POST)
router.post('/available-slots', playArenaController.authMiddleware, playArenaController.getAvailableSlots);
router.post('/open-arena-games', playArenaController.authMiddleware, playArenaController.getOpenArenaGames);
router.post('/my-bookings', playArenaController.authMiddleware, playArenaController.getMyBookings);
router.post('/scores', playArenaController.authMiddleware, playArenaController.getScores);

// Existing PUT and DELETE routes
router.put('/update-booking/:bookingId', playArenaController.authMiddleware, playArenaController.updateBooking);
router.delete('/cancel-booking/:bookingId', playArenaController.authMiddleware, playArenaController.cancelBooking);

module.exports = router;