const routeDefinitions = [
  { key: "health", mount: "/api/health", load: () => require("../routes/health.routes") },
  { key: "auth", mount: "/api/auth", load: () => require("../routes/auth.routes") },
  { key: "users", mount: "/api/users", load: () => require("../routes/users.routes") },
  { key: "customers", mount: "/api/customers", load: () => require("../routes/customers.routes") },
  { key: "properties", mount: "/api/properties", load: () => require("../routes/properties.routes") },
  { key: "leads", mount: "/api/leads", load: () => require("../routes/leads.routes") },
  { key: "bookings", mount: "/api/bookings", load: () => require("../routes/bookings.routes") },
  { key: "payments", mount: "/api/payments", load: () => require("../routes/payments.routes") },
  { key: "dashboard", mount: "/api/dashboard", load: () => require("../routes/dashboard.routes") },
  { key: "reports", mount: "/api/reports", load: () => require("../routes/reports.routes") },
  { key: "admin", mount: "/api/admin", load: () => require("../routes/admin.routes") },
  { key: "projects", mount: "/api/projects", load: () => require("../routes/projects.routes") },
  { key: "procurement", mount: "/api/procurement", load: () => require("../routes/procurement.routes") },
  { key: "materials", mount: "/api/materials", load: () => require("../routes/materials.routes") },
  { key: "workforce", mount: "/api/workforce", load: () => require("../routes/workforce.routes") },
  { key: "notifications", mount: "/api/notifications", load: () => require("../routes/notifications.routes") },
  { key: "ai", mount: "/api/ai", load: () => require("../routes/ai.routes") },
  { key: "uploads", mount: "/api/uploads", load: () => require("../routes/upload.routes") },
  { key: "reservations", mount: "/api/reservations", load: () => require("../routes/reservations.routes") },
  { key: "finance", mount: "/api/finance", load: () => require("../routes/finance.routes") },
  { key: "documents", mount: "/api/documents", load: () => require("../routes/documents.routes") },
  { key: "compliance", mount: "/api/compliance", load: () => require("../routes/compliance.routes") },
  { key: "facility", mount: "/api/facility", load: () => require("../routes/facility.routes") },
  { key: "support", mount: "/api/support", load: () => require("../routes/support.routes") },
];

const loadRouteModule = (route) => {
  try {
    return route.load();
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      console.warn(
        `[routeRegistry] Skipping route group "${route.key}" because its route module could not be loaded.`,
      );
      return null;
    }

    throw error;
  }
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
