const mongoose = require("mongoose");
const {
  createEntitySchema,
  defineModel,
} = require("./shared");

const projectTaskSchema = createEntitySchema({
  projectId: String,
  title: String,
  ownerId: String,
  discipline: String,
  priority: String,
  status: String,
  dueDate: String,
  completion: Number,
});

const dailyReportSchema = createEntitySchema({
  projectId: String,
  submittedBy: String,
  reportDate: String,
  laborCount: Number,
  materialUsage: String,
  blockers: mongoose.Schema.Types.Mixed,
  progressSummary: String,
});

const resourceAllocationSchema = createEntitySchema({
  projectId: String,
  resourceName: String,
  type: String,
  assignedTo: String,
  utilization: Number,
});

const budgetItemSchema = createEntitySchema({
  projectId: String,
  category: String,
  plannedAmount: Number,
  spentAmount: Number,
  fiscalYear: String,
});

const vendorPaymentSchema = createEntitySchema({
  vendorId: String,
  poId: String,
  amount: Number,
  paidDate: String,
  mode: String,
  reference: String,
  status: String,
});

module.exports = {
  ErpDailyReport: defineModel("ErpDailyReport", "erp_daily_reports", dailyReportSchema),
  ErpProjectTask: defineModel("ErpProjectTask", "erp_project_tasks", projectTaskSchema),
  ErpResourceAllocation: defineModel("ErpResourceAllocation", "erp_resource_allocations", resourceAllocationSchema),
  ErpBudgetItem: defineModel("ErpBudgetItem", "erp_budget_items", budgetItemSchema),
  ErpVendorPayment: defineModel("ErpVendorPayment", "erp_vendor_payments", vendorPaymentSchema),
};
