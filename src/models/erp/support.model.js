const {
  createEntitySchema,
  defineModel,
} = require("./shared");

const supportTicketSchema = createEntitySchema({
  ticketNumber: { type: String, unique: true, index: true },
  raisedBy: { type: String, required: true },
  assignedTo: String,
  title: { type: String, required: true },
  description: { type: String, required: true },
  module: { type: String, required: true },
  priority: {
    type: String,
    enum: ["critical", "high", "medium", "low"],
    required: true,
  },
  status: {
    type: String,
    enum: ["open", "in-progress", "resolved", "closed"],
    default: "open",
  },
  resolution: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  comments: [
    {
      authorId: String,
      text: String,
      createdAt: String,
    },
  ],
});

module.exports = {
  ErpSupportTicket: defineModel("ErpSupportTicket", "erp_support_tickets", supportTicketSchema),
};
