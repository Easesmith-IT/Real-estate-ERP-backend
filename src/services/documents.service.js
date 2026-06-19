const { randomUUID } = require("crypto");
const path = require("path");

const { ErpDocument } = require("../models/erp/admin.model");
const { createHttpError } = require("../utils/http");
const { getPagination } = require("../utils/query");
const { UPLOAD_DIR } = require("../utils/upload");

/**
 * Resolve a public-style fileUrl from a multer file object.
 * Multer stores the file at `file.path` (absolute) or `file.filename` (relative to UPLOAD_DIR).
 * We normalise to a relative URL path: /uploads/<filename>
 *
 * @param {import("multer").File} file
 * @returns {string}
 */
function resolveFileUrl(file) {
  if (!file) throw createHttpError(400, "No file provided");
  const filename = file.filename || path.basename(file.path);
  return `/uploads/${filename}`;
}

/**
 * Parse the integer part from a version label like "v3" → 3.
 * @param {string} version e.g. "v1", "v12"
 * @returns {number}
 */
function parseVersionNumber(version) {
  const n = parseInt(version.replace(/^v/i, ""), 10);
  return Number.isNaN(n) ? 1 : n;
}

/**
 * Increment a version label: "v1" → "v2", "v9" → "v10".
 * @param {string} currentVersion
 * @returns {string}
 */
function incrementVersion(currentVersion) {
  return `v${parseVersionNumber(currentVersion) + 1}`;
}

// ---------------------------------------------------------------------------
// 1. uploadDocument
// ---------------------------------------------------------------------------

/**
 * Save uploaded file and create a new ErpDocument with version history.
 *
 * @param {import("multer").File} file          - Multer file object
 * @param {Object}                metadata       - Document metadata (title, category, module, projectId, …)
 * @param {string}                actorId        - ID of the uploading user
 * @returns {Promise<Object>}                    DocumentRecord with versionHistory
 *
 * Validates: Requirements 17.2, 17.3
 */
async function uploadDocument(file, metadata, actorId) {
  if (!file) {
    throw createHttpError(400, "File is required for document upload");
  }

  const fileUrl = resolveFileUrl(file);
  const now = new Date().toISOString();
  const initialVersion = "v1";

  const versionEntry = {
    version: initialVersion,
    uploadedBy: actorId,
    uploadedAt: now,
    fileUrl,
  };

  const doc = await ErpDocument.create({
    id: randomUUID(),
    title: metadata.title || file.originalname || "Untitled",
    category: metadata.category || null,
    module: metadata.module || null,
    projectId: metadata.projectId || null,
    relatedEntityId: metadata.relatedEntityId || null,
    version: initialVersion,
    status: metadata.status || "Pending Review",
    ownerId: metadata.ownerId || actorId,
    uploadedBy: actorId,
    uploadedAt: now,
    expiryDate: metadata.expiryDate || null,
    fileUrl,
    fileSize: file.size || null,
    mimeType: file.mimetype || null,
    originalName: file.originalname || null,
    tags: metadata.tags || [],
    accessRoles: metadata.accessRoles || [],
    versionHistory: [versionEntry],
    checkoutBy: null,
  });

  return doc;
}

// ---------------------------------------------------------------------------
// 2. getDocuments
// ---------------------------------------------------------------------------

/**
 * Paginated query over ErpDocument collection with optional filters.
 * Non-admin users are restricted to documents where their role is in accessRoles
 * (or accessRoles is empty, meaning publicly accessible within the ERP).
 *
 * @param {Object} filters
 * @param {string} [filters.category]
 * @param {string} [filters.module]
 * @param {string} [filters.projectId]
 * @param {string} [filters.status]
 * @param {string} [filters.tag]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @param {string} userRole
 * @returns {Promise<{ documents: Object[], meta: Object }>}
 *
 * Validates: Requirements 17.4, 17.5
 */
async function getDocuments(filters = {}, userRole) {
  const { page, limit, offset } = getPagination({ page: filters.page, limit: filters.limit ?? 20 });

  const query = {};

  if (filters.category) query.category = filters.category;
  if (filters.module) query.module = filters.module;
  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.status) query.status = filters.status;
  if (filters.tag) query.tags = filters.tag;

  // Role-based access: non-admin users only see documents where their role is listed
  // in accessRoles, or where accessRoles is empty (open to all authenticated users).
  if (userRole !== "admin") {
    query.$or = [
      { accessRoles: userRole },
      { accessRoles: { $size: 0 } },
      { accessRoles: { $exists: false } },
    ];
  }

  const [documents, total] = await Promise.all([
    ErpDocument.find(query).skip(offset).limit(limit).lean(),
    ErpDocument.countDocuments(query),
  ]);

  const meta = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };

  return { documents, meta };
}

// ---------------------------------------------------------------------------
// 3. updateDocument
// ---------------------------------------------------------------------------

/**
 * Update allowed fields on an existing document.
 * Allowed fields: title, category, status, tags, accessRoles.
 *
 * @param {string} documentId
 * @param {Object} updates
 * @param {string} actorId
 * @returns {Promise<Object>} Updated DocumentRecord
 *
 * Validates: Requirements 17.6
 */
async function updateDocument(documentId, updates, actorId) {
  const allowedFields = ["title", "category", "status", "tags", "accessRoles"];

  const safeUpdates = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw createHttpError(400, "No valid fields provided for update");
  }

  const doc = await ErpDocument.findOneAndUpdate(
    { id: documentId },
    { $set: safeUpdates },
    { new: true }
  );

  if (!doc) {
    throw createHttpError(404, `Document not found: ${documentId}`);
  }

  return doc;
}

// ---------------------------------------------------------------------------
// 4. addDocumentVersion
// ---------------------------------------------------------------------------

/**
 * Append a new version entry to the document's versionHistory,
 * increment the version label, and update the top-level fileUrl.
 * All previous history entries are preserved.
 *
 * @param {string}                documentId
 * @param {import("multer").File} file
 * @param {string}                actorId
 * @returns {Promise<Object>} Updated DocumentRecord
 *
 * Validates: Requirements 17.7
 */
async function addDocumentVersion(documentId, file, actorId) {
  if (!file) {
    throw createHttpError(400, "File is required to add a new document version");
  }

  const doc = await ErpDocument.findOne({ id: documentId });
  if (!doc) {
    throw createHttpError(404, `Document not found: ${documentId}`);
  }

  const fileUrl = resolveFileUrl(file);
  const newVersion = incrementVersion(doc.version || "v1");
  const now = new Date().toISOString();

  const newVersionEntry = {
    version: newVersion,
    uploadedBy: actorId,
    uploadedAt: now,
    fileUrl,
  };

  const updatedDoc = await ErpDocument.findOneAndUpdate(
    { id: documentId },
    {
      $set: {
        version: newVersion,
        fileUrl,
      },
      $push: {
        versionHistory: newVersionEntry,
      },
    },
    { new: true }
  );

  return updatedDoc;
}

// ---------------------------------------------------------------------------
// 5. getDocumentVersions
// ---------------------------------------------------------------------------

/**
 * Return the versionHistory array for a specific document.
 *
 * @param {string} documentId
 * @returns {Promise<Object[]>} Array of version history entries
 *
 * Validates: Requirements 17.8
 */
async function getDocumentVersions(documentId) {
  const doc = await ErpDocument.findOne({ id: documentId }).lean();

  if (!doc) {
    throw createHttpError(404, `Document not found: ${documentId}`);
  }

  return doc.versionHistory || [];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  uploadDocument,
  getDocuments,
  updateDocument,
  addDocumentVersion,
  getDocumentVersions,
};
