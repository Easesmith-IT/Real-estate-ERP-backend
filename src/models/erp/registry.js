const { ErpBroker, ErpProject, ErpUser } = require("./core.model");
const {
  ErpBooking,
  ErpCustomer,
  ErpLead,
  ErpReceipt,
  ErpSiteVisit,
} = require("./sales.model");
const {
  ErpApproval,
  ErpAuditLog,
  ErpCompliance,
  ErpDocument,
  ErpNotificationSetting,
  ErpWorkflowSetting,
} = require("./admin.model");
const {
  ErpPurchaseOrder,
  ErpPurchaseRequest,
  ErpQuotation,
  ErpVendor,
} = require("./procurement.model");
const {
  ErpConsumption,
  ErpMaterial,
  ErpTransfer,
  ErpWarehouse,
} = require("./materials.model");
const {
  ErpBudgetItem,
  ErpDailyReport,
  ErpProjectTask,
  ErpResourceAllocation,
  ErpVendorPayment,
} = require("./projects.model");
const {
  ErpAttendance,
  ErpContractor,
  ErpEmployee,
  ErpTeam,
} = require("./workforce.model");
const { ErpFinanceLedger, ErpBudget, ErpBankReconciliation } = require("./finance.model");
const { ErpTenant, ErpMaintenanceRequest, ErpVisitorLog } = require("./facility.model");
const { ErpSupportTicket } = require("./support.model");
const { ErpCompanySettings, ErpSystemPreferences } = require("./settings.model");
const { ErpExportRecord } = require("./reports.model");

const erpCollectionConfigs = [
  { key: "users", model: ErpUser },
  { key: "brokers", model: ErpBroker },
  { key: "projects", model: ErpProject },
  { key: "leads", model: ErpLead },
  { key: "customers", model: ErpCustomer },
  { key: "bookings", model: ErpBooking },
  { key: "receipts", model: ErpReceipt },
  { key: "siteVisits", model: ErpSiteVisit },
  { key: "workflowSettings", model: ErpWorkflowSetting },
  { key: "notificationSettings", model: ErpNotificationSetting },
  { key: "approvals", model: ErpApproval },
  { key: "documents", model: ErpDocument },
  { key: "compliance", model: ErpCompliance },
  { key: "vendors", model: ErpVendor },
  { key: "purchaseRequests", model: ErpPurchaseRequest },
  { key: "quotations", model: ErpQuotation },
  { key: "purchaseOrders", model: ErpPurchaseOrder },
  { key: "warehouses", model: ErpWarehouse },
  { key: "materials", model: ErpMaterial },
  { key: "transfers", model: ErpTransfer },
  { key: "consumptions", model: ErpConsumption },
  { key: "projectTasks", model: ErpProjectTask },
  { key: "dailyReports", model: ErpDailyReport },
  { key: "resourceAllocations", model: ErpResourceAllocation },
  { key: "employees", model: ErpEmployee },
  { key: "contractors", model: ErpContractor },
  { key: "attendance", model: ErpAttendance },
  { key: "teams", model: ErpTeam },
  { key: "budgetItems", model: ErpBudgetItem },
  { key: "vendorPayments", model: ErpVendorPayment },
  { key: "auditLogs", model: ErpAuditLog },
  { key: "financeLedger", model: ErpFinanceLedger },
  { key: "budgets", model: ErpBudget },
  { key: "bankReconciliations", model: ErpBankReconciliation },
  { key: "tenants", model: ErpTenant },
  { key: "maintenanceRequests", model: ErpMaintenanceRequest },
  { key: "visitorLogs", model: ErpVisitorLog },
  { key: "supportTickets", model: ErpSupportTicket },
  { key: "companySettings", model: ErpCompanySettings },
  { key: "systemPreferences", model: ErpSystemPreferences },
  { key: "exportRecords", model: ErpExportRecord },
];

module.exports = {
  erpCollectionConfigs,
};
