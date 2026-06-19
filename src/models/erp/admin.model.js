const {
  createEntitySchema,
  defineModel,
} = require("./shared");

const settingSchema = createEntitySchema({
  name: String,
  code: String,
  defaultValue: String,
  status: String,
});

const approvalSchema = createEntitySchema({
  title: String,
  module: String,
  requestType: String,
  priority: String,
  status: String,
  requestedBy: String,
  ownerId: String,
  submittedAt: String,
  dueAt: String,
  summary: String,
  actedAt: String,
  actedBy: String,
  relatedEntityId: String,
  timeline: [
    {
      id: String,
      event: String,
      status: String,
      actorId: String,
      actorName: String,
      timestamp: String,
      notes: String,
    },
  ],
  comments: [
    {
      id: String,
      actorId: String,
      actorName: String,
      content: String,
      timestamp: String,
    },
  ],
});

const documentSchema = createEntitySchema({
  title: String,
  category: String,
  module: String,
  projectId: String,
  relatedEntityId: String,
  version: { type: String, default: "v1" },
  status: String,
  ownerId: String,
  uploadedBy: String,
  uploadedAt: String,
  expiryDate: String,
  // extended fields
  fileUrl: String,
  fileSize: Number,
  mimeType: String,
  originalName: String,
  ocrText: String,
  tags: [String],
  accessRoles: [String],
  versionHistory: [
    {
      version: String,
      uploadedBy: String,
      uploadedAt: String,
      fileUrl: String,
    },
  ],
  checkoutBy: String,
});

const complianceSchema = createEntitySchema({
  projectId: String,
  approvalType: String,
  authority: String,
  status: String,
  expiryDate: String,
  ownerId: String,
  documentId: String,
  notes: String,
  // extended fields
  renewalLeadDays: { type: Number, default: 30 },
  reminderSentAt: String,
  attachments: [String],
  auditTrail: [
    {
      action: String,
      actorId: String,
      timestamp: String,
      notes: String,
      oldStatus: String,
      newStatus: String,
    },
  ],
});

const auditLogSchema = createEntitySchema({
  title: String,
  detail: String,
  category: String,
  actorName: String,
  createdAt: String,
});

module.exports = {
  ErpApproval: defineModel("ErpApproval", "erp_approvals", approvalSchema),
  ErpAuditLog: defineModel("ErpAuditLog", "erp_audit_logs", auditLogSchema),
  ErpCompliance: defineModel("ErpCompliance", "erp_compliance", complianceSchema),
  ErpDocument: defineModel("ErpDocument", "erp_documents", documentSchema),
  ErpNotificationSetting: defineModel("ErpNotificationSetting", "erp_notification_settings", settingSchema),
  ErpWorkflowSetting: defineModel("ErpWorkflowSetting", "erp_workflow_settings", settingSchema),
};
