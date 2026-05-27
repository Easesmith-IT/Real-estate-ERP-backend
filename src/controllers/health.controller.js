const { getMongoStatus } = require("../connection/mongo.connection");

const healthCheck = (req, res) => {
  const mongo = getMongoStatus();

  res.status(200).json({
    success: true,
    message: "API is healthy",
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
