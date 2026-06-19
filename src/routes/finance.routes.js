const router = require("express").Router();

const { requirePermission } = require("../middlewares/auth.middleware");
const {
  getLedgerEntries,
  createLedgerEntry,
  getBudgets,
  updateBudget,
  getCashFlow,
  getBankReconciliations,
  createBankReconciliation,
} = require("../services/finance.service");
const { sendSuccess } = require("../utils/http");

router.get("/", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const [ledger, budgets, cashFlow, reconciliations] = await Promise.all([
      getLedgerEntries({ page: 1, limit: 10 }),
      getBudgets({}),
      getCashFlow(),
      getBankReconciliations(),
    ]);

    return sendSuccess(
      res,
      {
        summary: {
          ledgerEntries: ledger.meta.total,
          budgets: budgets.budgets.length,
          cashFlowMonths: cashFlow.months.length,
          reconciliations: reconciliations.records.length,
        },
        ledger,
        budgets: budgets.budgets,
        cashFlow: cashFlow.months,
        reconciliations: reconciliations.records,
      },
      "Finance overview loaded",
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/ledger", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const data = await getLedgerEntries(req.query || {});
    return sendSuccess(res, data, "Finance ledger loaded");
  } catch (error) {
    return next(error);
  }
});

router.post("/ledger", requirePermission("payments.write"), async (req, res, next) => {
  try {
    const data = await createLedgerEntry(req.body || {}, req.user.id);
    return sendSuccess(res, data, "Finance ledger entry created");
  } catch (error) {
    return next(error);
  }
});

router.get("/budgets", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const data = await getBudgets(req.query || {});
    return sendSuccess(res, data, "Budgets loaded");
  } catch (error) {
    return next(error);
  }
});

router.patch("/budgets/:budgetId", requirePermission("payments.write"), async (req, res, next) => {
  try {
    const data = await updateBudget(req.params.budgetId, req.body || {});
    return sendSuccess(res, data, "Budget updated");
  } catch (error) {
    return next(error);
  }
});

router.get("/cash-flow", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const data = await getCashFlow();
    return sendSuccess(res, data, "Cash flow loaded");
  } catch (error) {
    return next(error);
  }
});

router.get("/reconciliations", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const data = await getBankReconciliations();
    return sendSuccess(res, data, "Bank reconciliations loaded");
  } catch (error) {
    return next(error);
  }
});

router.post("/reconciliations", requirePermission("payments.write"), async (req, res, next) => {
  try {
    const data = await createBankReconciliation(req.body || {}, req.user.id);
    return sendSuccess(res, data, "Bank reconciliation recorded");
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
