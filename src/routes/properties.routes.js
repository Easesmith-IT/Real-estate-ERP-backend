const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const { listProjects, listUnits, createProject } = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("properties.read"), (req, res) => {
  return sendSuccess(res, listProjects(), "Project inventory loaded");
});

router.post("/", requirePermission("projects.write"), (req, res, next) => {
  return Promise.resolve(createProject(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Project created"))
    .catch(next);
});

router.get("/summary", requirePermission("properties.read"), (req, res) => {
  return sendSuccess(res, listProjects(), "Property summary loaded");
});

router.get("/units", requirePermission("properties.read"), (req, res) => {
  return sendSuccess(res, listUnits(req.query), "Unit inventory loaded");
});

module.exports = router;
