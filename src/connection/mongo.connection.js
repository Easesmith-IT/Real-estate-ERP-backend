const mongoose = require("mongoose");

const { mongoUri, mongoDbName } = require("../config/env");
const logger = require("../utils/logger");

let dbStatus = "disconnected";
let dbErrorMessage = "";

const getMongoStatus = () => {
  return {
    status: dbStatus,
    error: dbErrorMessage || null,
  };
};

const updateStatusFromReadyState = () => {
  const readyState = mongoose.connection.readyState;

  if (readyState === 1) {
    dbStatus = "connected";
    return;
  }

  if (readyState === 2) {
    dbStatus = "connecting";
    return;
  }

  dbStatus = "disconnected";
};

const registerMongoEventHandlers = () => {
  mongoose.connection.on("connected", () => {
    dbStatus = "connected";
    dbErrorMessage = "";
    logger.info("MongoDB connected");
  });

  mongoose.connection.on("disconnected", () => {
    dbStatus = "disconnected";
    logger.error("MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    dbStatus = "disconnected";
    dbErrorMessage = error.message || "MongoDB connection error";
    logger.error("MongoDB error:", dbErrorMessage);
  });
};

const connectMongo = async () => {
  if (!mongoUri) {
    dbStatus = "disconnected";
    dbErrorMessage = "MONGODB_URI is not configured";
    logger.error(dbErrorMessage);
    return;
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
  };
  if (mongoDbName) {
    options.dbName = mongoDbName;
  }

  try {
    dbStatus = "connecting";
    await mongoose.connect(mongoUri, options);
    dbStatus = "connected";
    dbErrorMessage = "";
  } catch (error) {
    dbStatus = "disconnected";
    dbErrorMessage = error.message || "Failed to connect to MongoDB";
    logger.error("MongoDB startup connection failed:", dbErrorMessage);
  }

  updateStatusFromReadyState();
};

registerMongoEventHandlers();

module.exports = {
  connectMongo,
  getMongoStatus,
};
