const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const AuthUser = require('../models/AuthUser');

// Auth routes
router.post('/check-attuid', controller.checkAttuid);
router.post('/verify-otp', controller.verifyOtp);
router.post('/set-password', controller.setPassword);
router.post('/login', controller.login);
router.post('/logout', controller.authMiddleware, controller.logout); // ✅ protected logout

// Protected home route (returns only schema fields)
router.get('/home', controller.authMiddleware, async (req, res) => {
  try {
    // Select only the fields explicitly in AuthUserSchema
    const user = await AuthUser.findOne(
      { attuid: req.user.attuid },
      'attuid firstname lastname email jobTitle businessUnit manager role isVerified shift'
    ).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Home route accessed successfully.',
      data: {
        user: user,
        welcomeMessage: `Welcome back, ${req.user.attuid}!`,
        timestamp: new Date().toISOString()
      }    });
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
