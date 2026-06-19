const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  listProjectTasks,
  createProjectTask,
  getProjectTask,
  updateProjectTask,
  deleteProjectTask,
  advanceProjectTask,
  getProjectRiskInsights,
  listDailyReports,
  createDailyReport,
  getDailyReport,
  updateDailyReport,
  deleteDailyReport,
  listResourceAllocations,
  createResourceAllocation,
  getResourceAllocation,
  updateResourceAllocation,
  deleteResourceAllocation,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/tasks", requirePermission("projects.read"), (req, res) => {
  return sendSuccess(res, listProjectTasks(), "Project tasks loaded");
});

router.get("/tasks/:taskId", requirePermission("projects.read"), (req, res, next) => {
  try {
    const data = getProjectTask(req.params.taskId);
    return sendSuccess(res, data, "Project task details loaded");
  } catch (err) {
    next(err);
  }
});

router.get("/risk", requirePermission("projects.read"), (req, res) => {
  return sendSuccess(res, getProjectRiskInsights(), "Project risk insights loaded");
});

router.post("/tasks", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(createProjectTask(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Project task created"))
    .catch(next);
});

router.patch("/tasks/:taskId", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(updateProjectTask(req.params.taskId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Project task updated"))
    .catch(next);
});

router.delete("/tasks/:taskId", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(deleteProjectTask(req.params.taskId, req.user.id))
    .then((data) => sendSuccess(res, data, "Project task deleted"))
    .catch(next);
});

router.patch("/tasks/:taskId/advance", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(advanceProjectTask(req.params.taskId, req.user.id))
    .then((data) => sendSuccess(res, data, "Project task updated"))
    .catch(next);
});

router.get("/daily-reports", requirePermission("projects.read"), (req, res) => {
  return sendSuccess(res, listDailyReports(), "Daily progress reports loaded");
});

router.post("/daily-reports", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(createDailyReport(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Daily progress report created"))
    .catch(next);
});

router.get("/daily-reports/:reportId", requirePermission("projects.read"), (req, res, next) => {
  try {
    const data = getDailyReport(req.params.reportId);
    return sendSuccess(res, data, "Daily progress report details loaded");
  } catch (err) {
    next(err);
  }
});

router.put("/daily-reports/:reportId", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(updateDailyReport(req.params.reportId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Daily progress report updated"))
    .catch(next);
});

router.delete("/daily-reports/:reportId", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(deleteDailyReport(req.params.reportId, req.user.id))
    .then((data) => sendSuccess(res, data, "Daily progress report deleted"))
    .catch(next);
});

router.get("/resources", requirePermission("projects.read"), (req, res) => {
  return sendSuccess(res, listResourceAllocations(), "Resource allocations loaded");
});

router.post("/resources", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(createResourceAllocation(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Resource allocation created"))
    .catch(next);
});

router.get("/resources/:resourceId", requirePermission("projects.read"), (req, res, next) => {
  try {
    const data = getResourceAllocation(req.params.resourceId);
    return sendSuccess(res, data, "Resource allocation details loaded");
  } catch (err) {
    next(err);
  }
});

router.put("/resources/:resourceId", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(updateResourceAllocation(req.params.resourceId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Resource allocation updated"))
    .catch(next);
});

router.delete("/resources/:resourceId", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(deleteResourceAllocation(req.params.resourceId, req.user.id))
    .then((data) => sendSuccess(res, data, "Resource allocation deleted"))
    .catch(next);
});

module.exports = router;
