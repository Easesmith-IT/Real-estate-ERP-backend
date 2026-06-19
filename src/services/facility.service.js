"use strict";

const { randomUUID } = require("crypto");

const {
  ErpTenant,
  ErpMaintenanceRequest,
  ErpVisitorLog,
} = require("../models/erp/facility.model");
const { createHttpError } = require("../utils/http");
const { getPagination } = require("../utils/query");

async function getTenants({
  propertyId,
  status,
  page,
  limit,
} = {}) {
  const { page: parsedPage, limit: parsedLimit, offset } = getPagination({
    page,
    limit: limit ?? 20,
  });

  const filter = {};
  if (propertyId) {
    filter.propertyId = propertyId;
  }
  if (status) {
    filter.status = status;
  }

  const [tenants, total] = await Promise.all([
    ErpTenant.find(filter)
      .sort({ leaseStart: -1 })
      .skip(offset)
      .limit(parsedLimit)
      .lean(),
    ErpTenant.countDocuments(filter),
  ]);

  return {
    tenants,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    },
  };
}

async function createTenant(body, actorId) {
  const {
    propertyId,
    unitId,
    tenantName,
    leaseStart,
    leaseEnd,
    monthlyRent,
  } = body;

  if (
    !propertyId ||
    !unitId ||
    !tenantName ||
    !leaseStart ||
    !leaseEnd ||
    monthlyRent == null
  ) {
    throw createHttpError(
      400,
      "propertyId, unitId, tenantName, leaseStart, leaseEnd, and monthlyRent are required",
    );
  }

  const numericMonthlyRent = Number(monthlyRent);
  const numericDepositAmount = Number(body.depositAmount ?? 0);

  if (!Number.isFinite(numericMonthlyRent) || numericMonthlyRent < 0) {
    throw createHttpError(400, "monthlyRent must be a non-negative number");
  }

  if (!Number.isFinite(numericDepositAmount) || numericDepositAmount < 0) {
    throw createHttpError(400, "depositAmount must be a non-negative number");
  }

  const tenant = await ErpTenant.create({
    id: `tenant-${randomUUID()}`,
    propertyId,
    unitId,
    tenantName,
    contactPhone: body.contactPhone || null,
    contactEmail: body.contactEmail || null,
    leaseStart,
    leaseEnd,
    monthlyRent: numericMonthlyRent,
    depositAmount: numericDepositAmount,
    status: body.status || "active",
    createdBy: actorId,
  });

  return tenant.toObject ? tenant.toObject() : tenant;
}

async function getMaintenanceRequests({
  propertyId,
  status,
  priority,
  page,
  limit,
} = {}) {
  const { page: parsedPage, limit: parsedLimit, offset } = getPagination({
    page,
    limit: limit ?? 20,
  });

  const filter = {};
  if (propertyId) {
    filter.propertyId = propertyId;
  }
  if (status) {
    filter.status = status;
  }
  if (priority) {
    filter.priority = priority;
  }

  const [requests, total] = await Promise.all([
    ErpMaintenanceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(parsedLimit)
      .lean(),
    ErpMaintenanceRequest.countDocuments(filter),
  ]);

  return {
    requests,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    },
  };
}

async function createMaintenanceRequest(body, actorId) {
  const {
    propertyId,
    category,
    description,
    priority,
  } = body;

  if (!propertyId || !category || !description || !priority) {
    throw createHttpError(
      400,
      "propertyId, category, description, and priority are required",
    );
  }

  const request = await ErpMaintenanceRequest.create({
    id: `maint-${randomUUID()}`,
    propertyId,
    unitId: body.unitId || null,
    tenantId: body.tenantId || null,
    category,
    description,
    priority,
    status: body.status || "open",
    assignedTo: body.assignedTo || null,
    resolvedAt: body.resolvedAt || null,
    createdBy: actorId,
  });

  return request.toObject ? request.toObject() : request;
}

async function updateMaintenanceRequest(requestId, updates) {
  if (!requestId) {
    throw createHttpError(400, "requestId is required");
  }

  const safeUpdates = {};
  if (updates.status !== undefined) {
    safeUpdates.status = updates.status;
  }
  if (updates.assignedTo !== undefined) {
    safeUpdates.assignedTo = updates.assignedTo;
  }
  if (updates.resolvedAt !== undefined) {
    safeUpdates.resolvedAt = updates.resolvedAt;
  }

  if (!Object.keys(safeUpdates).length) {
    throw createHttpError(400, "No valid fields provided for maintenance update");
  }

  const request = await ErpMaintenanceRequest.findOneAndUpdate(
    { id: requestId },
    { $set: safeUpdates },
    { new: true },
  ).lean();

  if (!request) {
    throw createHttpError(404, "Maintenance request not found");
  }

  return request;
}

async function getVisitorLogs({
  propertyId,
  status,
  page,
  limit,
} = {}) {
  const { page: parsedPage, limit: parsedLimit, offset } = getPagination({
    page,
    limit: limit ?? 20,
  });

  const filter = {};
  if (propertyId) {
    filter.propertyId = propertyId;
  }
  if (status) {
    filter.status = status;
  }

  const [visitors, total] = await Promise.all([
    ErpVisitorLog.find(filter)
      .sort({ checkIn: -1 })
      .skip(offset)
      .limit(parsedLimit)
      .lean(),
    ErpVisitorLog.countDocuments(filter),
  ]);

  return {
    visitors,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    },
  };
}

async function createVisitorLog(body, actorId) {
  const {
    propertyId,
    visitorName,
    hostName,
    purpose,
    checkIn,
  } = body;

  if (!propertyId || !visitorName || !hostName || !purpose || !checkIn) {
    throw createHttpError(
      400,
      "propertyId, visitorName, hostName, purpose, and checkIn are required",
    );
  }

  const visitor = await ErpVisitorLog.create({
    id: `visit-${randomUUID()}`,
    propertyId,
    visitorName,
    contactPhone: body.contactPhone || null,
    hostName,
    purpose,
    checkIn,
    checkOut: body.checkOut || null,
    status: body.status || "checked-in",
    loggedBy: actorId,
  });

  return visitor.toObject ? visitor.toObject() : visitor;
}

async function checkoutVisitorLog(logId, body = {}) {
  if (!logId) {
    throw createHttpError(400, "logId is required");
  }

  const visitor = await ErpVisitorLog.findOneAndUpdate(
    { id: logId },
    {
      $set: {
        checkOut: body.checkOut || new Date().toISOString(),
        status: "checked-out",
      },
    },
    { new: true },
  ).lean();

  if (!visitor) {
    throw createHttpError(404, "Visitor log not found");
  }

  return visitor;
}

async function getFacilityOverview() {
  const [tenants, maintenance, visitors, tenantCount, activeTenants, openMaintenance, activeVisitors] = await Promise.all([
    ErpTenant.find({}).sort({ leaseStart: -1 }).limit(5).lean(),
    ErpMaintenanceRequest.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ErpVisitorLog.find({}).sort({ checkIn: -1 }).limit(5).lean(),
    ErpTenant.countDocuments({}),
    ErpTenant.countDocuments({ status: "active" }),
    ErpMaintenanceRequest.countDocuments({ status: { $in: ["open", "in-progress"] } }),
    ErpVisitorLog.countDocuments({ status: "checked-in" }),
  ]);

  return {
    summary: {
      tenants: tenantCount,
      activeTenants,
      openMaintenance,
      activeVisitors,
    },
    tenants,
    maintenance,
    visitors,
  };
}

module.exports = {
  getTenants,
  createTenant,
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  getVisitorLogs,
  createVisitorLog,
  checkoutVisitorLog,
  getFacilityOverview,
};
