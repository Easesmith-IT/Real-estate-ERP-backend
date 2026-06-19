const { port, nodeEnv } = require("./config/env");
const { connectMongo, getMongoStatus } = require("./connection/mongo.connection");
const { initializeErpState } = require("./services/erp.service");
const logger = require("./utils/logger");

const loadServerInstance = async (app) => {
  await connectMongo();
  await initializeErpState();

  const server = app.listen(port, () => {
    const mongoStatus = getMongoStatus();
    logger.info(`Server running on port ${port} in ${nodeEnv} mode`);
    logger.info(`Mongo status: ${mongoStatus.status}`);
  });

  return server;
};

module.exports = {
  loadServerInstance,
};
