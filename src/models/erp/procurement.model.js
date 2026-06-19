const {
  createEntitySchema,
  defineModel,
} = require("./shared");

const vendorSchema = createEntitySchema({
  name: String,
  category: String,
  city: String,
  gstin: String,
  averageLeadTimeDays: Number,
  reliabilityScore: Number,
  status: String,
  lastOrderDate: String,
});

const purchaseRequestSchema = createEntitySchema({
  title: String,
  projectId: String,
  department: String,
  requestedBy: String,
  materialCategory: String,
  quantity: Number,
  unit: String,
  status: String,
  priority: String,
  requiredBy: String,
  createdAt: String,
});

const quotationSchema = createEntitySchema({
  requestId: String,
  vendorId: String,
  totalAmount: Number,
  deliveryDays: Number,
  paymentTerms: String,
  qualityScore: Number,
  status: String,
  submittedAt: String,
});

const purchaseOrderSchema = createEntitySchema({
  requestId: String,
  vendorId: String,
  projectId: String,
  amount: Number,
  status: String,
  expectedDelivery: String,
  createdAt: String,
  lineItems: Array,
  paymentTerms: String,
  deliveryTerms: String,
  notes: String,
  documentUrl: String,
  timeline: Array,
});

module.exports = {
  ErpPurchaseOrder: defineModel("ErpPurchaseOrder", "erp_purchase_orders", purchaseOrderSchema),
  ErpPurchaseRequest: defineModel("ErpPurchaseRequest", "erp_purchase_requests", purchaseRequestSchema),
  ErpQuotation: defineModel("ErpQuotation", "erp_quotations", quotationSchema),
  ErpVendor: defineModel("ErpVendor", "erp_vendors", vendorSchema),
};
