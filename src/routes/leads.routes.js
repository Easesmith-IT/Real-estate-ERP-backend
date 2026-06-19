const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  listLeads,
  getLeadStats,
  getLeadPipeline,
  createLead,
  updateLead,
  advanceLeadStage,
  listSiteVisits,
  createSiteVisit,
  getLeadProfileDetail,
  getSiteVisitDetail,
  updateSiteVisit,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("leads.read"), (req, res) => {
  return sendSuccess(res, listLeads(req.query), "Lead register loaded");
});

router.get("/stats", requirePermission("leads.read"), (req, res) => {
  return sendSuccess(res, getLeadStats(), "Lead KPIs loaded");
});

router.get("/pipeline", requirePermission("leads.read"), (req, res) => {
  return sendSuccess(res, getLeadPipeline(), "Sales pipeline loaded");
});

router.get("/site-visits", requirePermission("site-visits.manage"), (req, res) => {
  return sendSuccess(res, listSiteVisits(), "Site visits loaded");
});

router.post("/site-visits", requirePermission("site-visits.manage"), (req, res, next) => {
  try {
    return Promise.resolve(createSiteVisit(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Site visit scheduled"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.get("/site-visits/:visitId", requirePermission("site-visits.manage"), (req, res, next) => {
  try {
    return Promise.resolve(getSiteVisitDetail(req.params.visitId))
      .then((data) => sendSuccess(res, data, "Site visit details loaded"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.patch("/site-visits/:visitId", requirePermission("site-visits.manage"), (req, res, next) => {
  try {
    return Promise.resolve(updateSiteVisit(req.params.visitId, req.body || {}, req.user.id))
      .then((data) => sendSuccess(res, data, "Site visit updated"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.get("/:leadId", requirePermission("leads.read"), (req, res, next) => {
  try {
    return Promise.resolve(getLeadProfileDetail(req.params.leadId))
      .then((data) => sendSuccess(res, data, "Lead profile loaded"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.post("/", requirePermission("leads.write"), (req, res, next) => {
  try {
    return Promise.resolve(createLead(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Lead created"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:leadId", requirePermission("leads.write"), (req, res, next) => {
  try {
    return Promise.resolve(updateLead(req.params.leadId, req.body || {}, req.user.id))
      .then((data) => sendSuccess(res, data, "Lead updated"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:leadId/stage", requirePermission("leads.write"), (req, res, next) => {
  try {
    return Promise.resolve(advanceLeadStage(req.params.leadId, req.body?.stage, req.user.id))
      .then((data) => sendSuccess(res, data, "Lead stage updated"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
