const mongoose = require("mongoose");

const schemaOptions = {
  _id: false,
  strict: false,
};

const createEmbeddedSchema = (definition) =>
  new mongoose.Schema(definition, schemaOptions);

const createEntitySchema = (definition) =>
  new mongoose.Schema(
    {
      id: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      sortOrder: {
        type: Number,
        default: 0,
        index: true,
      },
      ...definition,
    },
    {
      versionKey: false,
      strict: false,
    },
  );

const defineModel = (modelName, collectionName, schema) =>
  mongoose.models[modelName] || mongoose.model(modelName, schema, collectionName);

const unitSchema = createEmbeddedSchema({
  id: String,
  code: String,
  configuration: String,
  floorLabel: String,
  areaSqFt: Number,
  facing: String,
  view: String,
  finalPrice: Number,
  status: String,
  towerName: String,
  projectId: String,
  bookingId: String,
  customerId: String,
});

const floorSchema = createEmbeddedSchema({
  label: String,
  units: [unitSchema],
});

const towerSchema = createEmbeddedSchema({
  id: String,
  name: String,
  floors: [floorSchema],
});

const bookingScheduleEntrySchema = createEmbeddedSchema({
  id: String,
  label: String,
  percentage: Number,
  amount: Number,
  dueDate: String,
  status: String,
  paidAmount: Number,
  paidAt: String,
});

module.exports = {
  bookingScheduleEntrySchema,
  createEmbeddedSchema,
  createEntitySchema,
  defineModel,
  floorSchema,
  towerSchema,
  unitSchema,
};
