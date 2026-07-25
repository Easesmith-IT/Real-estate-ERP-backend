const dns = require("dns");
const mongoose = require("mongoose");

const { mongoUri, mongoDbName } = require("../config/env");
const logger = require("../utils/logger");

let dbStatus = "disconnected";
let dbErrorMessage = "";

const isLoopbackDnsServer = (server) => {
  return server === "127.0.0.1" || server === "::1";
};

const ensureMongoDnsResolvers = () => {
  const currentServers = dns.getServers();

  if (!currentServers.length || currentServers.every(isLoopbackDnsServer)) {
    const fallbackServers = ["8.8.8.8", "1.1.1.1"];
    dns.setServers(fallbackServers);
    logger.info(
      `Mongo DNS resolver overridden from ${currentServers.join(",") || "none"} to ${fallbackServers.join(",")}`,
    );
  }
};

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
    updateStatusFromReadyState();
    if (mongoose.connection.readyState === 1) {
      logger.info("Ignoring stale MongoDB disconnected event while active connection is up");
      return;
    }
    logger.error("MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    updateStatusFromReadyState();
    if (mongoose.connection.readyState === 1) {
      logger.info("Ignoring stale MongoDB error event while active connection is up");
      return;
    }
    dbStatus = "disconnected";
    dbErrorMessage = error.message || "MongoDB connection error";
    logger.error("MongoDB error:", dbErrorMessage);
  });
};

const formatMongoStartupError = (errorMessage) => {
  if (!errorMessage) {
    return "Failed to connect to MongoDB";
  }

  if (
    errorMessage.includes("querySrv") ||
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("DNS")
  ) {
    return `${errorMessage}. The MongoDB Atlas host in MONGODB_URI does not resolve. Replace it with the current Atlas connection string.`;
  }

  return errorMessage;
};

const connectMongo = async () => {
  ensureMongoDnsResolvers();

  if (!mongoUri) {
    dbStatus = "disconnected";
    dbErrorMessage = "MONGODB_URI is not configured";
    logger.error(dbErrorMessage);
    throw new Error(dbErrorMessage);
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
    return true;
  } catch (error) {
    dbStatus = "disconnected";
    dbErrorMessage = formatMongoStartupError(
      error.message || "Failed to connect to MongoDB",
    );
    logger.error("MongoDB startup connection failed:", dbErrorMessage);
    throw new Error(dbErrorMessage);
  }

  updateStatusFromReadyState();
  return false;
};

registerMongoEventHandlers();

module.exports = {
  connectMongo,
  getMongoStatus,
};
