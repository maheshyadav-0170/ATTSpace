// src/cacheAuthUsers.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { createClient } = require("redis");
const logger = require("./utils/logger");
const AuthUser = require("./models/AuthUser");

// Load env vars
const mongoUrl = process.env.MONGO_URL;
const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || 6379;
const CACHE_TTL = parseInt(process.env.CACHE_TTL, 10) || 86400; // default 24h

// Sanity check
if (!mongoUrl) {
  console.error("❌ Missing MONGO_URL in .env");
  process.exit(1);
}

// Init Redis client
const redis = createClient({
  socket: { host: redisHost, port: redisPort },
});
redis.on("error", (err) => logger.error("Redis Client Error: " + err));

async function cacheAuthUsers() {
  try {
    await mongoose.connect(mongoUrl);
    logger.info("✅ Connected to MongoDB (auth-db)");

    await redis.connect();

    const users = await AuthUser.find(
      {},
      {
        _id: 1,
        attuid: 1,
        firstname: 1,
        lastname: 1,
        email: 1,
        jobTitle: 1,
        businessUnit: 1,
        manager: 1,
      }
    ).lean();

    logger.info(`📦 Fetched ${users.length} users from DB`);

    // Cache individual users
    for (const user of users) {
      await redis.setEx(
        `authuser:${user.attuid}`,
        CACHE_TTL,
        JSON.stringify(user)
      );
    }

    // Cache all users list
    await redis.setEx("authusers:all", CACHE_TTL, JSON.stringify(users));

    logger.info(
      `🚀 Cached ${users.length} users in Redis (TTL: ${CACHE_TTL} seconds)`
    );

    await redis.quit();
    process.exit(0);
  } catch (err) {
    logger.error("❌ Error caching users: " + err.toString());
    process.exit(1);
  }
}

module.exports = cacheAuthUsers;

// Run if executed directly
if (require.main === module) {
  cacheAuthUsers();
}
