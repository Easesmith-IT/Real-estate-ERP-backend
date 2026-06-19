const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getTenants,
  createTenant,
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  getVisitorLogs,
  createVisitorLog,
  checkoutVisitorLog,
  getFacilityOverview,
} = require("../services/facility.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("projects.read"), async (req, res, next) => {
  try {
    const data = await getFacilityOverview();
    return sendSuccess(res, data, "Facility overview loaded");
  } catch (error) {
    return next(error);
  }
});

router.get("/tenants", requirePermission("projects.read"), async (req, res, next) => {
  try {
    const data = await getTenants(req.query || {});
    return sendSuccess(res, data, "Tenants loaded");
  } catch (error) {
    return next(error);
  }
});

router.post("/tenants", requirePermission("projects.write"), async (req, res, next) => {
  try {
    const data = await createTenant(req.body || {}, req.user.id);
    return sendSuccess(res, data, "Tenant created");
  } catch (error) {
    return next(error);
  }
});

router.get("/maintenance", requirePermission("projects.read"), async (req, res, next) => {
  try {
    const data = await getMaintenanceRequests(req.query || {});
    return sendSuccess(res, data, "Maintenance requests loaded");
  } catch (error) {
    return next(error);
  }
});

router.post("/maintenance", requirePermission("projects.write"), async (req, res, next) => {
  try {
    const data = await createMaintenanceRequest(req.body || {}, req.user.id);
    return sendSuccess(res, data, "Maintenance request created");
  } catch (error) {
    return next(error);
  }
});

router.patch("/maintenance/:requestId", requirePermission("projects.write"), async (req, res, next) => {
  try {
    const data = await updateMaintenanceRequest(req.params.requestId, req.body || {});
    return sendSuccess(res, data, "Maintenance request updated");
  } catch (error) {
    return next(error);
  }
});

router.get("/visitors", requirePermission("projects.read"), async (req, res, next) => {
  try {
    const data = await getVisitorLogs(req.query || {});
    return sendSuccess(res, data, "Visitor logs loaded");
  } catch (error) {
    return next(error);
  }
});

router.post("/visitors", requirePermission("projects.write"), async (req, res, next) => {
  try {
    const data = await createVisitorLog(req.body || {}, req.user.id);
    return sendSuccess(res, data, "Visitor log created");
  } catch (error) {
    return next(error);
  }
});

router.patch("/visitors/:logId/checkout", requirePermission("projects.write"), async (req, res, next) => {
  try {
    const data = await checkoutVisitorLog(req.params.logId, req.body || {});
    return sendSuccess(res, data, "Visitor checked out");
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
