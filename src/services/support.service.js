"use strict";

const { randomUUID } = require("crypto");

const { ErpSupportTicket } = require("../models/erp/support.model");
const { createHttpError } = require("../utils/http");
const { getPagination } = require("../utils/query");

const buildTicketNumber = () =>
  `SUP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;

async function getSupportTickets({
  status,
  module,
  priority,
  search,
  page,
  limit,
} = {}) {
  const { page: parsedPage, limit: parsedLimit, offset } = getPagination({
    page,
    limit: limit ?? 20,
  });

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (module) {
    filter.module = module;
  }
  if (priority) {
    filter.priority = priority;
  }
  if (search) {
    filter.$or = [
      { ticketNumber: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [tickets, total] = await Promise.all([
    ErpSupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(parsedLimit)
      .lean(),
    ErpSupportTicket.countDocuments(filter),
  ]);

  return {
    tickets,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    },
  };
}

async function createSupportTicket(body, actorId) {
  const { title, description, module, priority } = body;

  if (!title || !description || !module || !priority) {
    throw createHttpError(
      400,
      "title, description, module, and priority are required",
    );
  }

  const now = new Date().toISOString();
  const ticket = await ErpSupportTicket.create({
    id: `ticket-${randomUUID()}`,
    ticketNumber: buildTicketNumber(),
    raisedBy: actorId,
    assignedTo: body.assignedTo || null,
    title,
    description,
    module,
    priority,
    status: body.status || "open",
    resolution: body.resolution || null,
    createdAt: now,
    updatedAt: now,
    comments: [],
  });

  return ticket.toObject ? ticket.toObject() : ticket;
}

async function updateSupportTicket(ticketId, updates) {
  if (!ticketId) {
    throw createHttpError(400, "ticketId is required");
  }

  const safeUpdates = {};
  if (updates.assignedTo !== undefined) {
    safeUpdates.assignedTo = updates.assignedTo;
  }
  if (updates.priority !== undefined) {
    safeUpdates.priority = updates.priority;
  }
  if (updates.status !== undefined) {
    safeUpdates.status = updates.status;
  }
  if (updates.resolution !== undefined) {
    safeUpdates.resolution = updates.resolution;
  }

  if (!Object.keys(safeUpdates).length) {
    throw createHttpError(400, "No valid fields provided for support ticket update");
  }

  safeUpdates.updatedAt = new Date().toISOString();

  const ticket = await ErpSupportTicket.findOneAndUpdate(
    { id: ticketId },
    { $set: safeUpdates },
    { new: true },
  ).lean();

  if (!ticket) {
    throw createHttpError(404, "Support ticket not found");
  }

  return ticket;
}

async function addSupportComment(ticketId, text, actorId) {
  if (!ticketId) {
    throw createHttpError(400, "ticketId is required");
  }
  if (!text || !`${text}`.trim()) {
    throw createHttpError(400, "Comment text is required");
  }

  const now = new Date().toISOString();
  const ticket = await ErpSupportTicket.findOneAndUpdate(
    { id: ticketId },
    {
      $set: { updatedAt: now },
      $push: {
        comments: {
          authorId: actorId,
          text: `${text}`.trim(),
          createdAt: now,
        },
      },
    },
    { new: true },
  ).lean();

  if (!ticket) {
    throw createHttpError(404, "Support ticket not found");
  }

  return ticket;
}

async function getSupportOverview() {
  const [recentTickets, total, open, highPriority] = await Promise.all([
    ErpSupportTicket.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ErpSupportTicket.countDocuments({}),
    ErpSupportTicket.countDocuments({ status: { $in: ["open", "in-progress"] } }),
    ErpSupportTicket.countDocuments({ priority: { $in: ["critical", "high"] } }),
  ]);

  return {
    summary: {
      total,
      open,
      highPriority,
    },
    recentTickets,
  };
}

module.exports = {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  addSupportComment,
  getSupportOverview,
};
