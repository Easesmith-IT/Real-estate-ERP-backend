const {
  bookingScheduleEntrySchema,
  createEntitySchema,
  defineModel,
} = require("./shared");

const leadSchema = createEntitySchema({
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  source: String,
  assignedTo: String,
  brokerId: String,
  preferredProjectId: String,
  preferredConfiguration: String,
  budgetMin: Number,
  budgetMax: Number,
  stage: String,
  followUpAt: String,
  notes: String,
  createdAt: String,
  updatedAt: String,
});

const customerSchema = createEntitySchema({
  name: String,
  phone: String,
  email: String,
  sourceLeadId: String,
  createdAt: String,
});

const bookingSchema = createEntitySchema({
  leadId: String,
  customerId: String,
  projectId: String,
  unitId: String,
  paymentPlanType: String,
  totalAmount: Number,
  outstandingAmount: Number,
  status: String,
  agreementStatus: String,
  bookingDate: String,
  createdBy: String,
  schedule: [bookingScheduleEntrySchema],
});

const receiptSchema = createEntitySchema({
  bookingId: String,
  amount: Number,
  mode: String,
  reference: String,
  receivedAt: String,
  collectedBy: String,
});

const siteVisitSchema = createEntitySchema({
  leadId: String,
  projectId: String,
  scheduledAt: String,
  coordinatorId: String,
  status: String,
  outcome: String,
  createdAt: String,
});

module.exports = {
  ErpBooking: defineModel("ErpBooking", "erp_bookings", bookingSchema),
  ErpCustomer: defineModel("ErpCustomer", "erp_customers", customerSchema),
  ErpLead: defineModel("ErpLead", "erp_leads", leadSchema),
  ErpReceipt: defineModel("ErpReceipt", "erp_receipts", receiptSchema),
  ErpSiteVisit: defineModel("ErpSiteVisit", "erp_site_visits", siteVisitSchema),
};
