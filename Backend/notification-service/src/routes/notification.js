const express = require("express");
const router = express.Router();
const controller = require("../controllers/notificationController");

// Protect routes with authMiddleware
router.post("/fetch", controller.authMiddleware, controller.fetchNotifications);
router.post("/read", controller.authMiddleware, controller.markRead);
router.post("/readall", controller.authMiddleware, controller.markAllRead);
router.post("/status", controller.authMiddleware, controller.updateStatus);

module.exports = router;
