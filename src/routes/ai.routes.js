const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getAssistantOverview,
  runAssistantCommand,
} = require("../services/demo-intelligence.service");
const { sendSuccess } = require("../utils/http");

router.get("/overview", requirePermission("auth.read"), (req, res) =>
  sendSuccess(
    res,
    getAssistantOverview(),
    "Demo assistant overview loaded",
  ));

router.post("/command", requirePermission("auth.read"), (req, res) =>
  sendSuccess(
    res,
    runAssistantCommand(req.body || {}),
    "Demo assistant command executed",
  ));

module.exports = router;
