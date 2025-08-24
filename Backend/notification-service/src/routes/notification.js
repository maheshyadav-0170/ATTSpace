const express = require("express");
const router = express.Router();
const controller = require("../controllers/notificationController");

router.post("/fetch", controller.fetchNotifications);
router.post("/read", controller.markRead);
router.post("/readall", controller.markAllRead);
router.post("/status", controller.updateStatus);

module.exports = router;
