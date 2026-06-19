const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const { getUsersPayload, getPermissionsMatrix } = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("users.read"), (req, res) => {
  return sendSuccess(res, getUsersPayload(), "ERP users loaded");
});

router.get("/permissions-matrix", requirePermission("users.read"), (req, res) => {
  return sendSuccess(res, getPermissionsMatrix(), "Permission matrix loaded");
});

module.exports = router;
