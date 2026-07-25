const path = require("path");
const { put, list } = require("@vercel/blob");

const { createHttpError } = require("./http");
const { UPLOAD_PREFIX, createUploadFilename } = require("./upload");

const buildBlobPathname = (filename) => `${UPLOAD_PREFIX}/${filename}`;

const uploadBufferedFile = async (file) => {
  if (!file || !file.buffer) {
    throw createHttpError(400, "File buffer is required");
  }

  const filename = createUploadFilename(file.originalname);
  const pathname = buildBlobPathname(filename);

  const blob = await put(pathname, file.buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.mimetype || undefined,
  });

  return {
    blob,
    filename,
    pathname,
  };
};

const findBlobByFilename = async (filename) => {
  const safeFilename = path.basename(filename || "");
  if (!safeFilename) {
    return null;
  }

  const pathname = buildBlobPathname(safeFilename);
  const { blobs } = await list({
    prefix: pathname,
    limit: 10,
  });

  return blobs.find((blob) => blob.pathname === pathname) || null;
};

module.exports = {
  uploadBufferedFile,
  findBlobByFilename,
  buildBlobPathname,
};
