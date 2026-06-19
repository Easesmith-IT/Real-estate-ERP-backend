const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getDocumentRegister,
  createDocumentRecord,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("documents.read"), (req, res) => {
  return sendSuccess(res, getDocumentRegister(), "Document register loaded");
});

router.post("/", requirePermission("documents.write"), (req, res, next) => {
  try {
    return Promise.resolve(createDocumentRecord(req.body || {}, req.user.id))
      .then((data) => sendSuccess(res, data, "Document record created"))
      .catch(next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
