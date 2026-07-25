const logger = require("../utils/logger");

const attachRequestTiming = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const origin = req.headers.origin ? ` origin=${req.headers.origin}` : "";
    const cacheHint = res.getHeader("x-cache") ? ` cache=${res.getHeader("x-cache")}` : "";
    const message = `[request] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsedMs.toFixed(1)}ms)${origin}${cacheHint}`;

    if (res.statusCode >= 500) {
      logger.error(message);
      return;
    }

    logger.info(message);
  });

  next();
};

module.exports = {
  attachRequestTiming,
};
