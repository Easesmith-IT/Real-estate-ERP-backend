const { bootstrapServer, loadServerInstance } = require("./src/server");
const { applyCorsHeaders } = require("./src/utils/cors");

if (require.main === module) {
  loadServerInstance().catch((error) => {
    console.error("[bootstrap] Failed to start server", error);
    process.exit(1);
  });
}

module.exports = async (req, res) => {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const app = await bootstrapServer();
  return app(req, res);
};
