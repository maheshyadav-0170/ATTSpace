const Notification = require("../models/Notification");
const logger = require("../utils/logger");

// POST /notifications/fetch
async function fetchNotifications(req, res) {
  try {
    const { attuid } = req.body;
    const filter = attuid ? { attuid, status: "pending" } : { status: "pending" };

    const notifs = await Notification.find(filter).sort({ createdAt: -1 });

    if (notifs.length > 0) {
      const ids = notifs.map((n) => n._id);
      await Notification.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "sent" } }
      );
    }

    res.json(notifs);
  } catch (err) {
    logger.error("fetchNotifications error: " + err.toString());
    res.status(500).json({ message: "Internal error" });
  }
}

// POST /notifications/read
async function markRead(req, res) {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "id required" });

    const notif = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!notif) return res.status(404).json({ message: "Notification not found" });

    res.json(notif);
  } catch (err) {
    logger.error("markRead error: " + err.toString());
    res.status(500).json({ message: "Internal error" });
  }
}

// POST /notifications/readall
async function markAllRead(req, res) {
  try {
    const { attuid } = req.body;
    if (!attuid) return res.status(400).json({ message: "attuid required" });

    const result = await Notification.updateMany(
      { attuid, read: false },
      { $set: { read: true } }
    );

    res.json({
      message: "All notifications marked as read",
      modified: result.modifiedCount,
    });
  } catch (err) {
    logger.error("markAllRead error: " + err.toString());
    res.status(500).json({ message: "Internal error" });
  }
}

// POST /notifications/status
async function updateStatus(req, res) {
  try {
    const { id, status } = req.body;
    if (!id || !["pending", "sent", "failed"].includes(status)) {
      return res.status(400).json({ message: "id and valid status required" });
    }

    const notif = await Notification.findByIdAndUpdate(id, { status }, { new: true });
    if (!notif) return res.status(404).json({ message: "Notification not found" });

    res.json(notif);
  } catch (err) {
    logger.error("updateStatus error: " + err.toString());
    res.status(500).json({ message: "Internal error" });
  }
}

module.exports = { fetchNotifications, markRead, markAllRead, updateStatus };
