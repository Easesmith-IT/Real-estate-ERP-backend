const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  listEmployees,
  getEmployeeById,
  listContractors,
  getContractorDetail,
  listAttendance,
  getAttendanceOverview,
  getAttendanceAnalytics,
  getAttendancePendingCheckins,
  createEmployee,
  updateEmployee,
  createContractor,
  updateContractor,
  archiveContractor,
  markAttendance,
  getPayrollData,
  listTeams,
  getTeamDetail,
  createTeam,
  updateTeam,
  deleteTeam,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/employees", requirePermission("workforce.read"), (req, res) => {
  return sendSuccess(res, listEmployees(), "Employee directory loaded");
});

router.get("/employees/:employeeId", requirePermission("workforce.read"), (req, res, next) => {
  return Promise.resolve(getEmployeeById(req.params.employeeId))
    .then((data) => sendSuccess(res, data, "Employee profile loaded"))
    .catch(next);
});

router.get("/payroll", requirePermission("workforce.read"), (req, res, next) => {
  const filters = {
    search: req.query.search,
    department: req.query.department,
    projectId: req.query.projectId,
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit,
  };
  return Promise.resolve(getPayrollData(filters))
    .then((data) => sendSuccess(res, data, "Payroll cost intelligence loaded"))
    .catch(next);
});

router.get("/contractors", requirePermission("workforce.read"), (req, res) => {
  return sendSuccess(res, listContractors(), "Contractor register loaded");
});

router.get("/contractors/:contractorId", requirePermission("workforce.read"), (req, res, next) => {
  return Promise.resolve(getContractorDetail(req.params.contractorId))
    .then((data) => sendSuccess(res, data, "Contractor profile loaded"))
    .catch(next);
});

router.get("/attendance/overview", requirePermission("workforce.read"), (req, res, next) => {
  return Promise.resolve(getAttendanceOverview())
    .then((data) => sendSuccess(res, data, "Attendance overview loaded"))
    .catch(next);
});

router.get("/attendance/analytics", requirePermission("workforce.read"), (req, res, next) => {
  return Promise.resolve(getAttendanceAnalytics())
    .then((data) => sendSuccess(res, data, "Attendance analytics loaded"))
    .catch(next);
});

router.get("/attendance/pending-checkins", requirePermission("workforce.read"), (req, res, next) => {
  return Promise.resolve(getAttendancePendingCheckins())
    .then((data) => sendSuccess(res, data, "Pending check-ins loaded"))
    .catch(next);
});

router.get("/attendance", requirePermission("workforce.read"), (req, res) => {
  const filters = {
    search: req.query.search,
    status: req.query.status,
    department: req.query.department,
    projectId: req.query.projectId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: req.query.page,
    limit: req.query.limit,
  };
  return sendSuccess(res, listAttendance(filters), "Attendance summary loaded");
});

router.post("/employees", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(createEmployee(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Employee created"))
    .catch(next);
});

router.patch("/employees/:employeeId", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(updateEmployee(req.params.employeeId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Employee updated"))
    .catch(next);
});

router.post("/contractors", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(createContractor(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Contractor created"))
    .catch(next);
});

router.patch("/contractors/:contractorId", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(updateContractor(req.params.contractorId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Contractor updated"))
    .catch(next);
});

router.patch("/contractors/:contractorId/archive", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(archiveContractor(req.params.contractorId, req.user.id))
    .then((data) => sendSuccess(res, data, "Contractor archived"))
    .catch(next);
});

router.post("/attendance", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(markAttendance(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Attendance marked"))
    .catch(next);
});

// Teams endpoints
router.get("/teams", requirePermission("workforce.read"), (req, res, next) => {
  return Promise.resolve(listTeams())
    .then((data) => sendSuccess(res, data, "Teams register loaded"))
    .catch(next);
});

router.get("/teams/:teamId", requirePermission("workforce.read"), (req, res, next) => {
  return Promise.resolve(getTeamDetail(req.params.teamId))
    .then((data) => sendSuccess(res, data, "Team details loaded"))
    .catch(next);
});

router.post("/teams", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(createTeam(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Team created"))
    .catch(next);
});

router.patch("/teams/:teamId", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(updateTeam(req.params.teamId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Team updated"))
    .catch(next);
});

router.delete("/teams/:teamId", requirePermission("workforce.write"), (req, res, next) => {
  return Promise.resolve(deleteTeam(req.params.teamId, req.user.id))
    .then((data) => sendSuccess(res, data, "Team deleted"))
    .catch(next);
});

module.exports = router;
