const router = require("express").Router();
const { upload } = require("../utils/upload");
const { uploadBufferedFile, findBlobByFilename } = require("../utils/blob");
const { requirePermission } = require("../middlewares/auth.middleware");
const { createDocumentRecord } = require("../services/erp.service");
const { sendSuccess, createHttpError } = require("../utils/http");

router.post("/document", requirePermission("documents.write"), (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return next(createHttpError(400, err.message));

    try {
      const file = req.file;
      if (!file) throw createHttpError(400, "File is required");
      const { filename } = await uploadBufferedFile(file);

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
        fileUrl: `${req.protocol}://${req.get("host")}/api/uploads/${filename}`,
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

router.get("/:filename", async (req, res, next) => {
  try {
    const blob = await findBlobByFilename(req.params.filename);
    if (!blob) {
      return next(createHttpError(404, "File not found"));
    }

    return res.redirect(307, blob.url);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
