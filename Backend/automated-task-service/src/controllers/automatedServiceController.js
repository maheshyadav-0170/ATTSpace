// src/controllers/cacheController.js
const { createClient } = require("redis");
const logger = require("../utils/logger");

// Redis client
const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "redis",
    port: process.env.REDIS_PORT || 6379,
  },
});

redis.on("error", (err) => logger.error("Redis Client Error: " + err));
redis.connect();

// Fetch all cached users
async function getAllCachedUsers(req, res) {
  try {
    const data = await redis.get("authusers:all");
    if (!data) {
      return res
        .status(404)
        .json({ message: "Cache empty. Please refresh first." });
    }
    return res.json(JSON.parse(data));
  } catch (err) {
    logger.error("Error fetching all users from cache: " + err.toString());
    res.status(500).json({ message: "Internal error" });
  }
}

// Fetch user by attuid
async function getUserByAttuid(req, res) {
  try {
    const { attuid } = req.params;
    if (!attuid) return res.status(400).json({ message: "attuid required" });

    const data = await redis.get(`authuser:${attuid}`);
    if (!data) {
      return res.status(404).json({ message: "User not found in cache" });
    }
    return res.json(JSON.parse(data));
  } catch (err) {
    logger.error("Error fetching user from cache: " + err.toString());
    res.status(500).json({ message: "Internal error" });
  }
}

module.exports = { getAllCachedUsers, getUserByAttuid };
