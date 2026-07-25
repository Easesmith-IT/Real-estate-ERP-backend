const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");

const UPLOAD_PREFIX = "uploads";

const createUploadFilename = (originalname = "") => {
  const ext = path.extname(originalname) || "";
  return `${randomUUID()}${ext}`;
};

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_PREFIX, createUploadFilename };
