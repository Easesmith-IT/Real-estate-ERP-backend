const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const { getNotificationsFeed } = require("../services/demo-intelligence.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("auth.read"), (req, res) =>
  sendSuccess(res, getNotificationsFeed(), "Notification feed loaded"));

module.exports = router;
