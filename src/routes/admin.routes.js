const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getAdminSettings,
  getApprovalsSummary,
  getApprovalByIdDetail,
  actOnApproval,
  getDocumentRegister,
  createDocumentRecord,
  getComplianceRegister,
  getApprovalAlerts,
  updateWorkflowSetting,
  updateNotificationSetting,
  testWhatsAppIntegration,
  sendWhatsAppDemoNotification,
  syncBiometricAttendance,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("settings.read"), (req, res) => {
  return sendSuccess(res, getAdminSettings(), "Admin settings loaded");
});

router.get("/settings", requirePermission("settings.read"), (req, res) => {
  return sendSuccess(res, getAdminSettings(), "Admin settings loaded");
});

router.get("/approvals", requirePermission("approvals.read"), (req, res) => {
  return sendSuccess(res, getApprovalsSummary(), "Approval queue loaded");
});

router.get("/approvals/:approvalId", requirePermission("approvals.read"), (req, res, next) => {
  try {
    const data = getApprovalByIdDetail(req.params.approvalId);
    if (!data) {
      const { createHttpError } = require("../utils/http");
      throw createHttpError(404, "Approval request not found");
    }
    return sendSuccess(res, data, "Approval details loaded");
  } catch (error) {
    return next(error);
  }
});

router.patch("/approvals/:approvalId", requirePermission("approvals.write"), (req, res, next) => {
  try {
    return Promise.resolve(actOnApproval(req.params.approvalId, req.body?.action, req.user.id, req.body))
      .then((data) => sendSuccess(res, data, "Approval action recorded"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.get("/documents", requirePermission("documents.read"), (req, res) => {
  return sendSuccess(res, getDocumentRegister(), "Document register loaded");
});

router.post("/documents", requirePermission("documents.write"), (req, res, next) => {
  try {
    return Promise.resolve(createDocumentRecord(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Document record created"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.get("/compliance", requirePermission("compliance.read"), (req, res) => {
  return sendSuccess(res, getComplianceRegister(), "Compliance register loaded");
});

router.get("/alerts/approval", requirePermission("approvals.read"), (req, res) => {
  return sendSuccess(res, getApprovalAlerts(), "Approval and compliance alerts loaded");
});

router.patch("/workflow-settings/:settingId", requirePermission("settings.write"), (req, res, next) => {
  try {
    return Promise.resolve(updateWorkflowSetting(req.params.settingId, req.body || {}, req.user.id))
      .then((data) => sendSuccess(res, data, "Workflow setting updated"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.patch("/notification-settings/:settingId", requirePermission("settings.write"), (req, res, next) => {
  try {
    return Promise.resolve(updateNotificationSetting(req.params.settingId, req.body || {}, req.user.id))
      .then((data) => sendSuccess(res, data, "Notification setting updated"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.post("/integrations/whatsapp/test", requirePermission("settings.write"), (req, res, next) => {
  try {
    return Promise.resolve(testWhatsAppIntegration(req.user.id))
      .then((data) => sendSuccess(res, data, "WhatsApp integration test completed"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.post("/integrations/whatsapp/send-demo", requirePermission("settings.write"), (req, res, next) => {
  try {
    return Promise.resolve(sendWhatsAppDemoNotification(req.user.id))
      .then((data) => sendSuccess(res, data, "Demo WhatsApp notification sent"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.post("/integrations/biometric/sync", requirePermission("settings.write"), (req, res, next) => {
  try {
    return Promise.resolve(syncBiometricAttendance(req.user.id))
      .then((data) => sendSuccess(res, data, "Biometric attendance sync simulated"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
