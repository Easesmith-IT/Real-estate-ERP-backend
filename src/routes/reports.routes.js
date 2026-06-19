const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getDashboardSummary,
  getFinancialOverview,
  getDashboardReports,
  getExecutiveDashboard,
  getBudgetOverview,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("reports.read"), (req, res) => {
  return sendSuccess(res, getDashboardSummary(), "Dashboard report loaded");
});

router.get("/dashboard", requirePermission("reports.read"), (req, res) => {
  return sendSuccess(res, getDashboardSummary(), "Dashboard report loaded");
});

router.get("/financial-overview", requirePermission("reports.read"), (req, res) => {
  return sendSuccess(res, getFinancialOverview(), "Financial report loaded");
});

router.get("/dashboard-reports", requirePermission("reports.read"), (req, res) => {
  return sendSuccess(res, getDashboardReports(), "Operational dashboard reports loaded");
});

router.get("/executive-dashboard", requirePermission("reports.read"), (req, res) => {
  return sendSuccess(res, getExecutiveDashboard(), "Executive dashboard loaded");
});

router.get("/budget-overview", requirePermission("reports.read"), (req, res) => {
  return sendSuccess(res, getBudgetOverview(), "Budget overview loaded");
});

module.exports = router;
