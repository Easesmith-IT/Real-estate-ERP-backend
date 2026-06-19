const mongoose = require("mongoose");
const {
  createEntitySchema,
  defineModel,
} = require("./shared");

const exportRecordSchema = createEntitySchema({
  reportType: { type: String, required: true },
  requestedBy: { type: String, required: true },
  requestedAt: { type: String, default: () => new Date().toISOString() },
  status: {
    type: String,
    enum: ["pending", "ready", "failed"],
    default: "pending",
  },
  downloadUrl: String, // nullable until ready
  filters: mongoose.Schema.Types.Mixed,
});

module.exports = {
  ErpExportRecord: defineModel("ErpExportRecord", "erp_export_records", exportRecordSchema),
};
