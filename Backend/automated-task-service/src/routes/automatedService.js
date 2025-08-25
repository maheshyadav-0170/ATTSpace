const express = require("express");
const router = express.Router();
const controller = require("../controllers/automatedServiceController");

router.post("/fetch-all", controller.getAllCachedUsers);
router.post("/fetch/:attuid", controller.getUserByAttuid);

module.exports = router;
