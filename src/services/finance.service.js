"use strict";

const { randomUUID } = require("crypto");

const {
  ErpFinanceLedger,
  ErpBudget,
  ErpBankReconciliation,
} = require("../models/erp/finance.model");
const { createHttpError } = require("../utils/http");
const { getPagination } = require("../utils/query");

// ─────────────────────────────────────────────────────────────────────────────
// Ledger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve paginated ledger entries with optional filters.
 *
 * @param {Object} params
 * @param {string} [params.projectId]
 * @param {string} [params.transactionType]
 * @param {string} [params.startDate]   - ISO date string (inclusive)
 * @param {string} [params.endDate]     - ISO date string (inclusive)
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
async function getLedgerEntries({
  projectId,
  transactionType,
  startDate,
  endDate,
  page,
  limit,
} = {}) {
  const { page: parsedPage, limit: parsedLimit, offset } = getPagination({
    page,
    limit: limit ?? 20,
  });

  const filter = {};

  if (projectId) {
    filter.projectId = projectId;
  }

  if (transactionType) {
    filter.transactionType = transactionType;
  }

  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) {
      filter.transactionDate.$gte = startDate;
    }
    if (endDate) {
      filter.transactionDate.$lte = endDate;
    }
  }

  const [items, total] = await Promise.all([
    ErpFinanceLedger.find(filter)
      .sort({ transactionDate: -1 })
      .skip(offset)
      .limit(parsedLimit)
      .lean(),
    ErpFinanceLedger.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
    },
  };
}

/**
 * Create a new ledger entry.
 * Computes gstLiability and tdsAmount from the supplied rates.
 *
 * @param {Object} body
 * @param {string} actorId
 * @returns {Promise<Object>} The saved ledger document.
 */
async function createLedgerEntry(body, actorId) {
  const { projectId, transactionType, amount, transactionDate } = body;

  if (!projectId || !transactionType || amount == null || !transactionDate) {
    throw createHttpError(
      400,
      "projectId, transactionType, amount, and transactionDate are required",
    );
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw createHttpError(400, "amount must be a non-negative number");
  }

  const gstRate = Number(body.gstRate) || 0;
  const tdsRate = Number(body.tdsRate) || 0;

  const gstLiability = parseFloat((numericAmount * (gstRate / 100)).toFixed(2));
  const tdsAmount = parseFloat((numericAmount * (tdsRate / 100)).toFixed(2));

  const entry = await ErpFinanceLedger.create({
    id: `ledger-${randomUUID()}`,
    projectId,
    transactionType,
    amount: numericAmount,
    reference: body.reference || null,
    gstRate,
    tdsRate,
    gstLiability,
    tdsAmount,
    transactionDate,
    createdBy: actorId,
    notes: body.notes || null,
  });

  return entry.toObject ? entry.toObject() : entry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve budgets with optional project / fiscal-year filters.
 *
 * @param {Object} params
 * @param {string} [params.projectId]
 * @param {string} [params.fiscalYear]
 * @returns {Promise<{ budgets: Object[] }>}
 */
async function getBudgets({ projectId, fiscalYear } = {}) {
  const filter = {};

  if (projectId) {
    filter.projectId = projectId;
  }

  if (fiscalYear) {
    filter.fiscalYear = fiscalYear;
  }

  const budgets = await ErpBudget.find(filter).sort({ projectId: 1 }).lean();

  return { budgets };
}

/**
 * Update a budget's spentAmount and/or status.
 *
 * @param {string} budgetId
 * @param {Object} updates  - May contain spentAmount and/or status
 * @returns {Promise<Object>} The updated budget document.
 */
async function updateBudget(budgetId, updates) {
  if (!budgetId) {
    throw createHttpError(400, "budgetId is required");
  }

  const allowedFields = {};

  if (updates.spentAmount !== undefined) {
    const spent = Number(updates.spentAmount);
    if (!Number.isFinite(spent) || spent < 0) {
      throw createHttpError(400, "spentAmount must be a non-negative number");
    }
    allowedFields.spentAmount = spent;
  }

  if (updates.status !== undefined) {
    const validStatuses = ["active", "exhausted", "closed"];
    if (!validStatuses.includes(updates.status)) {
      throw createHttpError(
        400,
        `status must be one of: ${validStatuses.join(", ")}`,
      );
    }
    allowedFields.status = updates.status;
  }

  const updated = await ErpBudget.findOneAndUpdate(
    { id: budgetId },
    { $set: allowedFields },
    { new: true },
  ).lean();

  if (!updated) {
    throw createHttpError(404, "Budget not found");
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cash Flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate ledger entries by calendar month.
 * For each month: inflow = sum of receipts, outflow = sum of expenses.
 *
 * @returns {Promise<{ months: Array<{ month: string, inflow: number, outflow: number, net: number }> }>}
 */
async function getCashFlow() {
  const entries = await ErpFinanceLedger.find({
    transactionType: { $in: ["receipt", "expense"] },
  })
    .select("transactionDate transactionType amount")
    .lean();

  // Group by "YYYY-MM"
  const monthMap = new Map();

  for (const entry of entries) {
    const dateStr = entry.transactionDate || "";
    // transactionDate is stored as an ISO string or date string; extract YYYY-MM
    const month = dateStr.slice(0, 7);
    if (!month || month.length < 7) continue;

    if (!monthMap.has(month)) {
      monthMap.set(month, { month, inflow: 0, outflow: 0 });
    }

    const bucket = monthMap.get(month);

    if (entry.transactionType === "receipt") {
      bucket.inflow += Number(entry.amount) || 0;
    } else if (entry.transactionType === "expense") {
      bucket.outflow += Number(entry.amount) || 0;
    }
  }

  // Sort by month ascending
  const months = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((bucket) => ({
      month: bucket.month,
      inflow: parseFloat(bucket.inflow.toFixed(2)),
      outflow: parseFloat(bucket.outflow.toFixed(2)),
      net: parseFloat((bucket.inflow - bucket.outflow).toFixed(2)),
    }));

  return { months };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bank Reconciliation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve all bank reconciliation records.
 *
 * @returns {Promise<{ records: Object[] }>}
 */
async function getBankReconciliations() {
  const records = await ErpBankReconciliation.find({})
    .sort({ statementDate: -1 })
    .lean();

  return { records };
}

/**
 * Create a new bank reconciliation record.
 * Computes variance = closingBalance - openingBalance - reconciledAmount.
 *
 * @param {Object} body
 * @param {string} actorId
 * @returns {Promise<Object>} The saved reconciliation document.
 */
async function createBankReconciliation(body, actorId) {
  const {
    bankName,
    accountNumber,
    statementDate,
    openingBalance,
    closingBalance,
  } = body;

  if (
    !bankName ||
    !accountNumber ||
    !statementDate ||
    openingBalance == null ||
    closingBalance == null
  ) {
    throw createHttpError(
      400,
      "bankName, accountNumber, statementDate, openingBalance, and closingBalance are required",
    );
  }

  const numericOpening = Number(openingBalance);
  const numericClosing = Number(closingBalance);
  const reconciledAmount = Number(body.reconciledAmount) || 0;

  if (!Number.isFinite(numericOpening) || !Number.isFinite(numericClosing)) {
    throw createHttpError(400, "openingBalance and closingBalance must be valid numbers");
  }

  const variance = parseFloat(
    (numericClosing - numericOpening - reconciledAmount).toFixed(2),
  );

  const record = await ErpBankReconciliation.create({
    id: `recon-${randomUUID()}`,
    bankName,
    accountNumber,
    statementDate,
    openingBalance: numericOpening,
    closingBalance: numericClosing,
    reconciledAmount,
    variance,
    status: body.status || "pending",
    createdBy: actorId,
  });

  return record.toObject ? record.toObject() : record;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getLedgerEntries,
  createLedgerEntry,
  getBudgets,
  updateBudget,
  getCashFlow,
  getBankReconciliations,
  createBankReconciliation,
};
