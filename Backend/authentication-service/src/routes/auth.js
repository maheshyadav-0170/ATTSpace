const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');

router.post('/check-attuid', controller.checkAttuid);
router.post('/verify-otp', controller.verifyOtp);
router.post('/set-password', controller.setPassword);
router.post('/login', controller.login);
router.post('/logout', controller.logout);

module.exports = router;
