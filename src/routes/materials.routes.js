const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  listMaterials,
  createMaterial,
  updateMaterial,
  archiveMaterial,
  createWarehouse,
  updateWarehouse,
  archiveWarehouse,
  listTransfers,
  createTransfer,
  listConsumptions,
  getMaterialAlerts,
  recordConsumption,
} = require("../services/erp.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("materials.read"), (req, res) => {
  return sendSuccess(res, listMaterials(), "Material inventory loaded");
});

router.post("/", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(createMaterial(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Material created"))
    .catch(next);
});

router.patch("/:materialId", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(updateMaterial(req.params.materialId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Material updated"))
    .catch(next);
});

router.patch("/:materialId/archive", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(archiveMaterial(req.params.materialId, req.user.id))
    .then((data) => sendSuccess(res, data, "Material archived"))
    .catch(next);
});

router.post("/warehouses", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(createWarehouse(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Warehouse created"))
    .catch(next);
});

router.patch("/warehouses/:warehouseId", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(updateWarehouse(req.params.warehouseId, req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Warehouse updated"))
    .catch(next);
});

router.patch("/warehouses/:warehouseId/archive", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(archiveWarehouse(req.params.warehouseId, req.user.id))
    .then((data) => sendSuccess(res, data, "Warehouse archived"))
    .catch(next);
});

router.get("/transfers", requirePermission("materials.read"), (req, res) => {
  return sendSuccess(res, listTransfers(), "Material transfers loaded");
});

router.post("/transfers", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(createTransfer(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Material transfer created"))
    .catch(next);
});

router.get("/consumption", requirePermission("materials.read"), (req, res) => {
  return sendSuccess(res, listConsumptions(), "Material consumption loaded");
});

router.get("/alerts", requirePermission("materials.read"), (req, res) => {
  return sendSuccess(res, getMaterialAlerts(), "Material alerts loaded");
});

router.post("/consumption", requirePermission("materials.write"), (req, res, next) => {
  return Promise.resolve(recordConsumption(req.body, req.user.id))
    .then((data) => sendSuccess(res, data, "Material consumption recorded"))
    .catch(next);
});

module.exports = router;
