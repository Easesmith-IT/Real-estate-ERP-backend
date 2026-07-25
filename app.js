const { bootstrapServer, loadServerInstance } = require("./src/server");

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://nimbusos.easesmith.com",
]);

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-demo-user-id");
};

if (require.main === module) {
  loadServerInstance().catch((error) => {
    console.error("[bootstrap] Failed to start server", error);
    process.exit(1);
  });
}

module.exports = async (req, res) => {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const app = await bootstrapServer();
  return app(req, res);
};
