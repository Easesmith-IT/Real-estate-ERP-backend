const express = require("express");
const cors = require("cors");

const { mountRouteGroups } = require("./routeRegistry");
const { attachCurrentUser } = require("../middlewares/auth.middleware");
const { notFoundHandler, errorHandler } = require("../middlewares/error.middleware");

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://nimbusos.easesmith.com",
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-demo-user-id"],
  credentials: false,
  optionsSuccessStatus: 204,
};

const createExpressApp = (options = {}) => {
  const app = express();

  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));
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

  return app;
};

module.exports = {
  createExpressApp,
};
