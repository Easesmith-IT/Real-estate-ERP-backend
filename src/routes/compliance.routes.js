const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getComplianceRegister,
  getApprovalAlerts,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("compliance.read"), (req, res) => {
  return sendSuccess(res, getComplianceRegister(), "Compliance register loaded");
});

router.get("/alerts", requirePermission("approvals.read"), (req, res) => {
  return sendSuccess(res, getApprovalAlerts(), "Compliance alerts loaded");
});

module.exports = router;
