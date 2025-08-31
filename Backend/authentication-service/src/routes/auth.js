const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');

// Auth routes
router.post('/check-attuid', controller.checkAttuid);
router.post('/verify-otp', controller.verifyOtp);
router.post('/set-password', controller.setPassword);
router.post('/login', controller.login);
router.post('/logout', controller.authMiddleware, controller.logout); // ✅ protected logout

// Protected home route
router.get('/home', controller.authMiddleware, (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Home route accessed successfully.',
      data: {
        attuid: req.user.attuid,
        welcomeMessage: `Welcome back, ${req.user.attuid}!`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'An error occurred while accessing the home route.',
      error: error.message
    });
  }
});

module.exports = router;
