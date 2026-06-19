const routeDefinitions = [
  { key: "health", mount: "/api/health", modulePath: "../routes/health.routes" },
  { key: "auth", mount: "/api/auth", modulePath: "../routes/auth.routes" },
  { key: "users", mount: "/api/users", modulePath: "../routes/users.routes" },
  { key: "customers", mount: "/api/customers", modulePath: "../routes/customers.routes" },
  { key: "properties", mount: "/api/properties", modulePath: "../routes/properties.routes" },
  { key: "leads", mount: "/api/leads", modulePath: "../routes/leads.routes" },
  { key: "bookings", mount: "/api/bookings", modulePath: "../routes/bookings.routes" },
  { key: "payments", mount: "/api/payments", modulePath: "../routes/payments.routes" },
  { key: "dashboard", mount: "/api/dashboard", modulePath: "../routes/dashboard.routes" },
  { key: "reports", mount: "/api/reports", modulePath: "../routes/reports.routes" },
  { key: "admin", mount: "/api/admin", modulePath: "../routes/admin.routes" },
  { key: "projects", mount: "/api/projects", modulePath: "../routes/projects.routes" },
  { key: "procurement", mount: "/api/procurement", modulePath: "../routes/procurement.routes" },
  { key: "materials", mount: "/api/materials", modulePath: "../routes/materials.routes" },
  { key: "workforce", mount: "/api/workforce", modulePath: "../routes/workforce.routes" },
  { key: "notifications", mount: "/api/notifications", modulePath: "../routes/notifications.routes" },
  { key: "ai", mount: "/api/ai", modulePath: "../routes/ai.routes" },
  { key: "uploads", mount: "/api/uploads", modulePath: "../routes/upload.routes" },
  { key: "reservations", mount: "/api/reservations", modulePath: "../routes/reservations.routes" },
  { key: "finance", mount: "/api/finance", modulePath: "../routes/finance.routes" },
  { key: "documents", mount: "/api/documents", modulePath: "../routes/documents.routes" },
  { key: "compliance", mount: "/api/compliance", modulePath: "../routes/compliance.routes" },
  { key: "facility", mount: "/api/facility", modulePath: "../routes/facility.routes" },
  { key: "support", mount: "/api/support", modulePath: "../routes/support.routes" },
];

const loadRouteModule = (route) => {
  let resolvedModulePath;

  try {
    resolvedModulePath = require.resolve(route.modulePath);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      console.warn(
        `[routeRegistry] Skipping route group "${route.key}" because module "${route.modulePath}" was not found.`,
      );
      return null;
    }

    throw error;
  }

  return require(resolvedModulePath);
};

const resolveSelectedRouteKeys = (routeGroups) => {
  if (!routeGroups || routeGroups.length === 0) {
    return new Set(routeDefinitions.map((route) => route.key));
  }

  return new Set(routeGroups);
};

const mountRouteGroups = (app, options = {}) => {
  const selectedRouteKeys = resolveSelectedRouteKeys(options.routeGroups);

  for (const route of routeDefinitions) {
    if (!selectedRouteKeys.has(route.key)) {
      continue;
    }

    const routeModule = loadRouteModule(route);

    if (!routeModule) {
      continue;
    }

    app.use(route.mount, routeModule);
  }

  return selectedRouteKeys;
};

module.exports = {
  routeDefinitions,
  resolveSelectedRouteKeys,
  mountRouteGroups,
};
