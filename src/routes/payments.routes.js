const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const { getCollectionsSummary, recordReceipt } = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("payments.read"), (req, res) => {
  return sendSuccess(res, getCollectionsSummary(), "Collections summary loaded");
});

router.get("/summary", requirePermission("payments.read"), (req, res) => {
  return sendSuccess(res, getCollectionsSummary(), "Collections summary loaded");
});

router.post("/receipts", requirePermission("payments.write"), (req, res, next) => {
  try {
    return Promise.resolve(recordReceipt(req.body, req.user.id))
      .then((data) => sendSuccess(res, data, "Receipt recorded"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
