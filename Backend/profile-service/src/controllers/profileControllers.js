const logger = require("../utils/logger");
const { verify } = require("../services/jwtService");
const { createClient } = require("redis");
const { redisHost, redisPort } = require("../config");

const redisClient = createClient({ socket: { host: redisHost, port: redisPort } });

redisClient.on("error", (err) =>
  logger.error("Redis error: " + err.toString())
);

async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info(`Connected to Redis at ${redisHost}:${redisPort}`);
  }
}

// 🔐 Auth middleware
async function authMiddleware(req, res, next) {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers["authorization"] &&
        req.headers["authorization"].split(" ")[1]);

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: missing authentication token." });
    }

    const decoded = verify(token);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "Unauthorized: invalid or expired token." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error(`Auth error: ${err.message}`);
    return res
      .status(401)
      .json({ message: "Unauthorized: invalid or expired token." });
  }
}

// 📌 Fetch profile from Redis
async function getProfile(req, res) {
  try {
    const { attuid } = req.body;

    if (!attuid) {
      return res
        .status(400)
        .json({ success: false, message: "Attuid is required." });
    }

    if (req.user.attuid !== attuid) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you can only access your own profile.",
      });
    }

    await initRedis(); // ensure Redis connection
    const data = await redisClient.get("all_authusers");

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "No users found in Redis." });
    }

    const users = JSON.parse(data);
    const user = users.find((u) => u.attuid === attuid);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      data: user,
    });
  } catch (error) {
    logger.error(`Error fetching profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while fetching the profile. Please try again later.",
    });
  }
}

// 📌 Update profile in Redis
async function updateProfile(req, res) {
  try {
    const { attuid, updates } = req.body;

    if (!attuid || !updates) {
      return res.status(400).json({
        success: false,
        message: "Attuid and updates are required.",
      });
    }

    if (req.user.attuid !== attuid) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you can only update your own profile.",
      });
    }

    await initRedis(); // ensure Redis connection
    const data = await redisClient.get("all_authusers");

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "No users found in Redis." });
    }

    let users = JSON.parse(data);
    let userIndex = users.findIndex((u) => u.attuid === attuid);

    if (userIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found." });
    }

    // Merge updates
    users[userIndex] = { ...users[userIndex], ...updates };

    // Save back to Redis
    await redisClient.set("all_authusers", JSON.stringify(users));

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: users[userIndex],
    });
  } catch (error) {
    logger.error(`Error updating profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while updating the profile. Please try again later.",
    });
  }
}

module.exports = { authMiddleware, getProfile, updateProfile };
