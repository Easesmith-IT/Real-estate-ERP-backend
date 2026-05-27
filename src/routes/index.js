const router = require("express").Router();

const healthRoutes = require("./health.routes");

router.use("/health", healthRoutes);

module.exports = router;
