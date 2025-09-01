const express = require("express");
const router = express.Router();
const controller = require("../controllers/profileControllers");

// Protect all profile routes
router.post("/get", controller.authMiddleware, controller.getProfile);
router.post("/update", controller.authMiddleware, controller.updateProfile);

module.exports = router;
