const localOriginPattern = /^http:\/\/(?:localhost|127\.0\.0\.1|(?:10|192\.168)\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/i;

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "https://nimbusos.easesmith.com",
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return allowedOrigins.has(origin) || (process.env.NODE_ENV !== "production" && localOriginPattern.test(origin));
};

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-demo-user-id");
  res.setHeader("Access-Control-Max-Age", "86400");
};

module.exports = {
  allowedOrigins,
  applyCorsHeaders,
  isAllowedOrigin,
};
