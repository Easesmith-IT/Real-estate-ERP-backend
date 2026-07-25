const { getMongoStatus } = require("../connection/mongo.connection");

const healthCheck = (req, res) => {
  const mongo = getMongoStatus();
  const isHealthy = mongo.status === "connected";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? "API is healthy" : "API is degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: mongo,
  });
};

const throwHealthError = (req, res, next) => {
  const error = new Error("Forced health error");
  error.statusCode = 500;
  next(error);
};

module.exports = {
  healthCheck,
  throwHealthError,
};
