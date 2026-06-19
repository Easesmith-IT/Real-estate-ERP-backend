const express = require("express");
const cors = require("cors");

const { mountRouteGroups } = require("./routeRegistry");
const { attachCurrentUser } = require("../middlewares/auth.middleware");
const { notFoundHandler, errorHandler } = require("../middlewares/error.middleware");
const { loadServerInstance } = require("../server");

const bootstrapExpressConnection = async (options = {}) => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(attachCurrentUser);

  app.get("/", (req, res) => {
    res.json({
      message: "Real Estate ERP backend is running",
      timestamp: new Date().toISOString(),
    });
  });

  mountRouteGroups(app, {
    routeGroups: options.routeGroups,
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return loadServerInstance(app);
};

module.exports = {
  bootstrapExpressConnection,
};
