const routeDefinitions = [
  { key: "health", mount: "/api/health", loader: () => require("../routes/health.routes") },
  { key: "auth", mount: "/api/auth", loader: () => require("../routes/auth.routes") },
  { key: "users", mount: "/api/users", loader: () => require("../routes/users.routes") },
  { key: "customers", mount: "/api/customers", loader: () => require("../routes/customers.routes") },
  { key: "properties", mount: "/api/properties", loader: () => require("../routes/properties.routes") },
  { key: "leads", mount: "/api/leads", loader: () => require("../routes/leads.routes") },
  { key: "bookings", mount: "/api/bookings", loader: () => require("../routes/bookings.routes") },
  { key: "payments", mount: "/api/payments", loader: () => require("../routes/payments.routes") },
  { key: "reports", mount: "/api/reports", loader: () => require("../routes/reports.routes") },
  { key: "admin", mount: "/api/admin", loader: () => require("../routes/admin.routes") },
];

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

    app.use(route.mount, route.loader());
  }

  return selectedRouteKeys;
};

module.exports = {
  routeDefinitions,
  resolveSelectedRouteKeys,
  mountRouteGroups,
};
