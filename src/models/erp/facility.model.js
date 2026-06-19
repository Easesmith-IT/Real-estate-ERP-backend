const {
  createEntitySchema,
  defineModel,
} = require("./shared");

// ErpTenant — collection: erp_tenants
const tenantSchema = createEntitySchema({
  propertyId: { type: String, required: true },
  unitId: { type: String, required: true },
  tenantName: { type: String, required: true },
  contactPhone: String,
  contactEmail: String,
  leaseStart: { type: String, required: true },
  leaseEnd: { type: String, required: true },
  monthlyRent: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["active", "notice", "vacated"],
    default: "active",
  },
  createdBy: String,
});

// ErpMaintenanceRequest — collection: erp_maintenance_requests
const maintenanceRequestSchema = createEntitySchema({
  propertyId: { type: String, required: true },
  unitId: String,
  tenantId: String,
  category: {
    type: String,
    enum: ["electrical", "plumbing", "civil", "hvac", "other"],
    required: true,
  },
  description: { type: String, required: true },
  priority: {
    type: String,
    enum: ["high", "medium", "low"],
    required: true,
  },
  status: {
    type: String,
    enum: ["open", "in-progress", "resolved", "closed"],
    default: "open",
  },
  assignedTo: String,
  resolvedAt: String,
  createdBy: String,
});

// ErpVisitorLog — collection: erp_visitor_logs
const visitorLogSchema = createEntitySchema({
  propertyId: { type: String, required: true },
  visitorName: { type: String, required: true },
  contactPhone: String,
  hostName: { type: String, required: true },
  purpose: { type: String, required: true },
  checkIn: { type: String, required: true },
  checkOut: String,
  status: {
    type: String,
    enum: ["checked-in", "checked-out"],
    default: "checked-in",
  },
  loggedBy: String,
});

module.exports = {
  ErpTenant: defineModel("ErpTenant", "erp_tenants", tenantSchema),
  ErpMaintenanceRequest: defineModel("ErpMaintenanceRequest", "erp_maintenance_requests", maintenanceRequestSchema),
  ErpVisitorLog: defineModel("ErpVisitorLog", "erp_visitor_logs", visitorLogSchema),
};
