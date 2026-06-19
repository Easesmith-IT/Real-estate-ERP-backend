const {
  createEntitySchema,
  defineModel,
} = require("./shared");

const warehouseSchema = createEntitySchema({
  name: String,
  code: String,
  location: String,
  region: String,
  coordinates: {
    lat: String,
    lng: String,
  },
  capacity: Number,
  capacityUtilization: Number,
  storageTypes: [String],
  operatingHours: String,
  supervisor: String,
  assignedProjects: [String],
  materialCategories: [String],
  status: String,
  notes: String,
  createdAt: String,
  updatedAt: String,
});

const materialSchema = createEntitySchema({
  sku: String,
  name: String,
  category: String,
  warehouseId: String,
  projectId: String,
  onHand: Number,
  reorderLevel: Number,
  unit: String,
  averageConsumption: Number,
  status: String,
});

const transferSchema = createEntitySchema({
  materialId: String,
  fromWarehouseId: String,
  toWarehouseId: String,
  quantity: Number,
  unit: String,
  status: String,
  requestedBy: String,
  createdAt: String,
});

const consumptionSchema = createEntitySchema({
  materialId: String,
  projectId: String,
  quantity: Number,
  unit: String,
  consumedOn: String,
  recordedBy: String,
  purpose: String,
});

module.exports = {
  ErpConsumption: defineModel("ErpConsumption", "erp_consumptions", consumptionSchema),
  ErpMaterial: defineModel("ErpMaterial", "erp_materials", materialSchema),
  ErpTransfer: defineModel("ErpTransfer", "erp_transfers", transferSchema),
  ErpWarehouse: defineModel("ErpWarehouse", "erp_warehouses", warehouseSchema),
};
