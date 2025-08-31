const Notification = require("../models/Notification");
const logger = require("../utils/logger");
const { verify } = require("../services/jwtService");

// 🔐 Auth middleware (local to Notification service)
async function authMiddleware(req, res, next) {
  try {
    // Extract JWT from cookie or Authorization header
    const token =
      req.cookies?.auth_token ||
      (req.headers["authorization"] && req.headers["authorization"].split(" ")[1]);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: missing authentication token." });
    }

    // Verify JWT
    const decoded = verify(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized: invalid or expired token." });
    }

    // Attach user info for downstream handlers
    req.user = decoded;
    next();
  } catch (err) {
    logger.error(`Auth error: ${err.message}`);
    return res.status(401).json({ message: "Unauthorized: invalid or expired token." });
  }
}

// POST /notifications/fetch
async function fetchNotifications(req, res) {
  try {
    const { attuid } = req.body;
    if (!attuid) {
      return res.status(400).json({
        success: false,
        message: "Attuid is required to fetch notifications.",
      });
    }

    // Compare request attuid with token attuid
    if (req.user.attuid !== attuid) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you can only access your own notifications.",
      });
    }

    // Fetch notifications
    const notifications = await Notification.find({ attuid }).sort({ createdAt: -1 });

    if (notifications.length > 0) {
      const ids = notifications.map((n) => n._id);
      await Notification.updateMany(
        { _id: { $in: ids }, status: "pending" },
        { $set: { status: "sent" } }
      );
    }

    return res.status(200).json({
      success: true,
      message: notifications.length
        ? "Notifications retrieved successfully."
        : "No notifications found for the provided user ID.",
      data: notifications,
    });
  } catch (error) {
    logger.error(`Error fetching notifications: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while retrieving notifications. Please try again later.",
    });
  }
}

// POST /notifications/read
async function markRead(req, res) {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required to mark a notification as read.",
      });
    }

    const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "The specified notification could not be found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification successfully marked as read.",
      data: notification,
    });
  } catch (error) {
    logger.error(`Error marking notification as read: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while marking the notification as read. Please try again later.",
    });
  }
}

// POST /notifications/readall
async function markAllRead(req, res) {
  try {
    const { attuid } = req.body;
    if (!attuid) {
      return res.status(400).json({
        success: false,
        message: "Attuid is required to mark all notifications as read.",
      });
    }

    const result = await Notification.updateMany(
      { attuid, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully marked ${result.modifiedCount} notification(s) as read.`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    logger.error(`Error marking all notifications as read: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while marking all notifications as read. Please try again later.",
    });
  }
}

// POST /notifications/status
async function updateStatus(req, res) {
  try {
    const { id, status } = req.body;
    if (!id || !["pending", "sent", "failed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "A valid notification ID and status (pending, sent, or failed) are required.",
      });
    }

    const notification = await Notification.findByIdAndUpdate(id, { status }, { new: true });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "The specified notification could not be found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Notification status successfully updated to '${status}'.`,
      data: notification,
    });
  } catch (error) {
    logger.error(`Error updating notification status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while updating the notification status. Please try again later.",
    });
  }
}

module.exports = { authMiddleware, fetchNotifications, markRead, markAllRead, updateStatus };
