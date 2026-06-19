const {
  createEntitySchema,
  defineModel,
  towerSchema,
} = require("./shared");

const userSchema = createEntitySchema({
  name: String,
  email: String,
  role: String,
  designation: String,
});

const brokerSchema = createEntitySchema({
  name: String,
  commissionRate: Number,
  activeDeals: Number,
});

const projectSchema = createEntitySchema({
  name: String,
  code: String,
  location: String,
  managerId: String,
  stage: String,
  towers: [towerSchema],
});

module.exports = {
  ErpBroker: defineModel("ErpBroker", "erp_brokers", brokerSchema),
  ErpProject: defineModel("ErpProject", "erp_projects", projectSchema),
  ErpUser: defineModel("ErpUser", "erp_users", userSchema),
};
