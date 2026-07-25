const { createExpressApp } = require("./connection/express_connection");
const { port, nodeEnv } = require("./config/env");
const { connectMongo, getMongoStatus } = require("./connection/mongo.connection");
const { initializeErpState } = require("./services/erp.service");
const logger = require("./utils/logger");

let bootstrapPromise;

const bootstrapServer = async (options = {}) => {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await connectMongo();
      await initializeErpState();

      return createExpressApp(options);
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
};

const loadServerInstance = async (options = {}) => {
  const app = await bootstrapServer(options);

  const server = app.listen(port, () => {
    const mongoStatus = getMongoStatus();
    logger.info(`Server running on port ${port} in ${nodeEnv} mode`);
    logger.info(`Mongo status: ${mongoStatus.status}`);
  });

  return server;
};

module.exports = {
  bootstrapServer,
  loadServerInstance,
};
