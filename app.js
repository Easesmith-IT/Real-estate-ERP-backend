const { bootstrapServer, loadServerInstance } = require("./src/server");

if (require.main === module) {
  loadServerInstance().catch((error) => {
    console.error("[bootstrap] Failed to start server", error);
    process.exit(1);
  });
}

module.exports = async (req, res) => {
  const app = await bootstrapServer();
  return app(req, res);
};
