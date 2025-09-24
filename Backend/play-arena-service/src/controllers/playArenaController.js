const { redisClient, initRedis } = require('../services/helperService');
const logger = require('../utils/logger');
const { verify } = require("../services/jwtService");
const { isTokenBlacklisted } = require("../services/helperService");

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

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ message: "Unauthorized: token has been revoked." });
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

async function getAllUsers(req, res) {
  try {
    await initRedis();

    const data = await redisClient.get('all_authusers');
    if (!data) {
      logger.info('get-all-users: No users found in Redis.');
      return res.status(404).json({ success: false, message: 'No users found.' });
    }

    const users = JSON.parse(data);
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    logger.error(`get-all-users: Error fetching users from Redis - ${err.toString()}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.', error: err.message });
  }
}

module.exports = { authMiddleware, getAllUsers };
