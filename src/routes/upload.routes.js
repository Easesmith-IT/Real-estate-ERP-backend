const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const { upload } = require("../utils/upload");
const { requirePermission } = require("../middlewares/auth.middleware");
const { createDocumentRecord } = require("../services/erp.service");
const { sendSuccess, createHttpError } = require("../utils/http");

router.post("/document", requirePermission("documents.write"), (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return next(createHttpError(400, err.message));

    try {
      const file = req.file;
      if (!file) throw createHttpError(400, "File is required");

      const payload = {
        title: req.body.title || file.originalname,
        category: req.body.category || "General",
        module: req.body.module || "General",
        projectId: req.body.projectId || null,
        relatedEntityId: req.body.relatedEntityId || null,
        version: req.body.version || "v1",
        status: req.body.status || "Pending Review",
        ownerId: req.body.ownerId || req.user.id,
        expiryDate: req.body.expiryDate || null,
        fileUrl: `${req.protocol}://${req.get("host")}/api/uploads/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };

      const document = await createDocumentRecord(payload, req.user.id);
      return sendSuccess(res, document, "Document uploaded and registered");
    } catch (error) {
      return next(error);
    }
  });
});

router.get("/:filename", (_req, res, next) => {
  const filePath = path.resolve(process.cwd(), "uploads", _req.params.filename);
  if (!fs.existsSync(filePath)) {
    return next(createHttpError(404, "File not found"));
  }
  res.sendFile(filePath);
});

module.exports = router;
