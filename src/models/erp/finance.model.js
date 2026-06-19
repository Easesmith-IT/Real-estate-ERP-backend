const mongoose = require("mongoose");
const {
  createEntitySchema,
  defineModel,
} = require("./shared");

// ErpFinanceLedger — collection: erp_finance_ledger
const financeLedgerSchema = createEntitySchema({
  projectId: { type: String, required: true },
  transactionType: {
    type: String,
    enum: ["receipt", "expense", "tds-deduction", "gst-liability"],
    required: true,
  },
  amount: { type: Number, required: true },
  reference: String,
  gstRate: { type: Number, default: 0 },
  tdsRate: { type: Number, default: 0 },
  gstLiability: Number,   // computed: amount * (gstRate / 100)
  tdsAmount: Number,      // computed: amount * (tdsRate / 100)
  transactionDate: { type: String, required: true },
  createdBy: { type: String, required: true },
  notes: String,
});

// ErpBudget — collection: erp_budgets
const budgetSchema = createEntitySchema({
  projectId: { type: String, required: true },
  category: { type: String, required: true },
  allocatedAmount: { type: Number, required: true },
  spentAmount: { type: Number, default: 0 },
  fiscalYear: { type: String, required: true },
  status: {
    type: String,
    enum: ["active", "exhausted", "closed"],
    default: "active",
  },
});

// ErpBankReconciliation — collection: erp_bank_reconciliations
const bankReconciliationSchema = createEntitySchema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  statementDate: { type: String, required: true },
  openingBalance: { type: Number, required: true },
  closingBalance: { type: Number, required: true },
  reconciledAmount: { type: Number, default: 0 },
  variance: Number,       // computed: closingBalance - openingBalance - reconciledAmount
  status: {
    type: String,
    enum: ["pending", "reconciled", "discrepancy"],
    default: "pending",
  },
  createdBy: String,
});

module.exports = {
  ErpFinanceLedger: defineModel("ErpFinanceLedger", "erp_finance_ledger", financeLedgerSchema),
  ErpBudget: defineModel("ErpBudget", "erp_budgets", budgetSchema),
  ErpBankReconciliation: defineModel("ErpBankReconciliation", "erp_bank_reconciliations", bankReconciliationSchema),
};
