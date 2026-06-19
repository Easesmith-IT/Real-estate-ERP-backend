const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  listVendors,
  listPurchaseRequests,
  createPurchaseRequest,
  createVendor,
  updateVendor,
  archiveVendor,
  createQuotation,
  updateQuotation,
  createPurchaseOrder,
  listQuotations,
  listPurchaseOrders,
  getVendorPayments,
  recordVendorPayment,
  getPurchaseOrder,
  updatePurchaseOrder,
} = require("../services/erp.service");
const { sendSuccess, createHttpError } = require("../utils/http");

router.get("/vendors", requirePermission("procurement.read"), (req, res) => {
  return sendSuccess(res, listVendors(), "Vendor register loaded");
});

router.get("/requests", requirePermission("procurement.read"), (req, res) => {
  return sendSuccess(res, listPurchaseRequests(), "Purchase requests loaded");
});

router.post("/requests", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(createPurchaseRequest(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Purchase request created"))
    .catch(next);
});

router.get("/quotations", requirePermission("procurement.read"), (req, res) => {
  return sendSuccess(res, listQuotations(), "Quotation register loaded");
});

router.get("/purchase-orders", requirePermission("procurement.read"), (req, res) => {
  return sendSuccess(res, listPurchaseOrders(), "Purchase orders loaded");
});

router.post("/vendors", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(createVendor(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Vendor created"))
    .catch(next);
});

router.patch("/vendors/:vendorId", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(updateVendor(req.params.vendorId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Vendor updated"))
    .catch(next);
});

router.patch("/vendors/:vendorId/archive", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(archiveVendor(req.params.vendorId, req.user.id))
    .then((data) => sendSuccess(res, data, "Vendor archived"))
    .catch(next);
});

router.post("/quotations", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(createQuotation(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Quotation created"))
    .catch(next);
});

router.patch("/quotations/:quotationId", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(updateQuotation(req.params.quotationId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Quotation updated"))
    .catch(next);
});

router.post("/purchase-orders", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(createPurchaseOrder(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Purchase order created"))
    .catch(next);
});

router.get("/purchase-orders/:purchaseOrderId", requirePermission("procurement.read"), (req, res, next) => {
  return Promise.resolve(getPurchaseOrder(req.params.purchaseOrderId))
    .then((data) => {
      if (!data) return next(createHttpError(404, "Purchase order not found"));
      return sendSuccess(res, data, "Purchase order details loaded");
    })
    .catch(next);
});

router.patch("/purchase-orders/:purchaseOrderId", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(updatePurchaseOrder(req.params.purchaseOrderId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Purchase order updated"))
    .catch(next);
});

router.get("/payments", requirePermission("procurement.read"), (req, res) => {
  return sendSuccess(res, getVendorPayments(), "Vendor payments loaded");
});

router.post("/payments", requirePermission("procurement.write"), (req, res, next) => {
  return Promise.resolve(recordVendorPayment(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Vendor payment recorded"))
    .catch(next);
});

module.exports = router;
