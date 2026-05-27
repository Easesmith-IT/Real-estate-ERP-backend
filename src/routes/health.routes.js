const router = require("express").Router();
const { healthCheck, throwHealthError } = require("../controllers/health.controller");

router.get("/", healthCheck);
router.get("/error", throwHealthError);

module.exports = router;
