const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getDashboardActivityFeed,
  getDashboardAnalytics,
  getDashboardOverview,
  getDashboardProjectHealth,
  getDashboardRecommendations,
} = require("../services/dashboard.service");
const { sendSuccess } = require("../utils/http");

router.get("/overview", requirePermission("reports.read"), (req, res) =>
  sendSuccess(res, getDashboardOverview(), "Dashboard overview loaded"),
);

router.get("/project-health", requirePermission("reports.read"), (req, res) =>
  sendSuccess(res, getDashboardProjectHealth(), "Dashboard project health loaded"),
);

router.get("/analytics", requirePermission("reports.read"), (req, res) =>
  sendSuccess(res, getDashboardAnalytics(), "Dashboard analytics loaded"),
);

router.get("/recommendations", requirePermission("reports.read"), (req, res) =>
  sendSuccess(res, getDashboardRecommendations(), "Dashboard recommendations loaded"),
);

router.get("/activity-feed", requirePermission("reports.read"), (req, res) =>
  sendSuccess(res, getDashboardActivityFeed(), "Dashboard activity feed loaded"),
);

module.exports = router;
