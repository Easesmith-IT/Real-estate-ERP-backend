const {
  getApprovalAlerts,
  getDashboardSummary,
  getExecutiveDashboard,
  getFinancialOverview,
  getProjectRiskInsights,
  listAttendance,
  listEmployees,
  listLeads,
  listMaterials,
  listProjectTasks,
  listProjects,
  listPurchaseOrders,
  listPurchaseRequests,
} = require("./erp.service");
const { remember } = require("../utils/cache");

const ASSISTANT_CONTEXT_CACHE_TTL_MS = 15 * 1000;
const ASSISTANT_PAYLOAD_CACHE_TTL_MS = 30 * 1000;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const frontendRoutes = {
  dashboard: "/home/dashboard",
  stockAlerts: "/materials/stock-alerts",
  taskBoard: "/projects/tasks",
  leads: "/sales/leads",
  pipeline: "/sales/pipeline",
  collections: "/management/financial-overview",
  approvals: "/purchases/approvals",
  projectHealth: "/management/project-health",
  purchaseRequests: "/purchases/requests",
  resources: "/projects/resources",
};

const toneForSeverity = (severity) => {
  const normalized = `${severity || ""}`.toLowerCase();

  if (normalized === "critical") {
    return "error";
  }

  if (normalized === "high") {
    return "warning";
  }

  if (normalized === "medium") {
    return "info";
  }

  return "neutral";
};

const assistantCommands = [
  {
    id: "operations-summary",
    title: "Generate operations summary",
    description: "Summarize active projects, approvals, material risk, and workforce momentum.",
    keywords: ["operations", "summary", "dashboard", "daily report", "overview"],
    route: frontendRoutes.dashboard,
  },
  {
    id: "stock-alerts",
    title: "Highlight material stock alerts",
    description: "Identify low stock and critical reorder pressure across warehouses.",
    keywords: ["stock", "material", "inventory", "warehouse", "reorder"],
    route: frontendRoutes.stockAlerts,
  },
  {
    id: "delayed-milestones",
    title: "Show delayed milestones",
    description: "Surface overdue project tasks and timeline risk signals for review.",
    keywords: ["delay", "milestone", "task", "timeline", "risk"],
    route: frontendRoutes.taskBoard,
  },
  {
    id: "high-value-sales",
    title: "Draft high-value lead follow-up plan",
    description: "List priority leads and the next actions required for closure.",
    keywords: ["sales", "lead", "follow-up", "broker", "site visit", "high value"],
    route: frontendRoutes.leads,
  },
  {
    id: "collections-watch",
    title: "Review collections watchlist",
    description: "Inspect due-soon receivables and collection exposure by booking.",
    keywords: ["collection", "finance", "dues", "payment", "receivables"],
    route: frontendRoutes.collections,
  },
  {
    id: "approval-queue",
    title: "Check approval queue",
    description: "Inspect pending commercial, finance, and compliance approvals.",
    keywords: ["approval", "queue", "commercial", "finance", "pending"],
    route: frontendRoutes.approvals,
  },
];

const findCommand = (payload = {}) => {
  if (payload.commandId) {
    return (
      assistantCommands.find((command) => command.id === payload.commandId) ||
      null
    );
  }

  const normalizedQuery = `${payload.query || ""}`.trim().toLowerCase();
  if (!normalizedQuery) {
    return assistantCommands[0];
  }

  return (
    assistantCommands.find(
      (command) =>
        command.title.toLowerCase().includes(normalizedQuery) ||
        command.description.toLowerCase().includes(normalizedQuery) ||
        command.keywords.some((keyword) => normalizedQuery.includes(keyword)),
    ) || assistantCommands[0]
  );
};

const getRiskTasks = () =>
  getProjectRiskInsights()
    .alerts.filter((item) =>
      ["Task Overdue", "Milestone Delay"].includes(item.signalType),
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      projectName: item.projectName,
      completion: Number(item.metricValue) || 0,
      status: item.signalType,
      dueDate: item.dueAt || new Date().toISOString(),
    }));

const buildSharedContextUncached = () => {
  const dashboard = getDashboardSummary();
  const executive = getExecutiveDashboard();
  const alerts = getApprovalAlerts();
  const projects = listProjects().projects;
  const tasks = listProjectTasks().tasks;
  const riskTasks = getRiskTasks();
  const materials = listMaterials().materials;
  const lowStockMaterials = materials.filter(
    (material) => material.onHand <= material.reorderLevel,
  );
  const leads = listLeads({ limit: 50 }).items;
  const highValueLeads = leads
    .filter((lead) => lead.budgetMax >= 15000000 && lead.stage !== "Closed Won")
    .slice(0, 5);
  const financial = getFinancialOverview();
  const purchaseRequests = listPurchaseRequests().requests;
  const purchaseOrders = listPurchaseOrders().purchaseOrders;
  const attendance = listAttendance();
  const employees = listEmployees().employees;
  const projectRisk = getProjectRiskInsights();

  return {
    alerts,
    attendance,
    dashboard,
    employees,
    executive,
    financial,
    highValueLeads,
    leads,
    lowStockMaterials,
    projects,
    purchaseOrders,
    purchaseRequests,
    projectRisk,
    riskTasks,
    tasks,
  };
};

const getSharedContext = () =>
  remember("assistant:context", ASSISTANT_CONTEXT_CACHE_TTL_MS, buildSharedContextUncached);

const buildRecommendations = (context) => {
  const recommendations = [];

  if (context.alerts.summary.critical > 0) {
    recommendations.push({
      id: "rec-critical-alerts",
      title: "Escalate critical alerts",
      detail: `${context.alerts.summary.critical} critical items are already affecting delivery or compliance visibility.`,
      priority: "Critical",
      route: frontendRoutes.projectHealth,
      actionLabel: "Open risk alerts",
    });
  }

  if (context.lowStockMaterials.length > 0) {
    recommendations.push({
      id: "rec-stock",
      title: "Release replenishment actions",
      detail: `${context.lowStockMaterials.length} materials are at or below reorder level and should be routed to procurement.`,
      priority: "High",
      route: frontendRoutes.stockAlerts,
      actionLabel: "Review stock risks",
    });
  }

  if (context.riskTasks.length > 0) {
    recommendations.push({
      id: "rec-delays",
      title: "Review delayed milestones",
      detail: `${context.riskTasks.length} project tasks are late or under-progress against their due dates.`,
      priority: "High",
      route: frontendRoutes.taskBoard,
      actionLabel: "Inspect tasks",
    });
  }

  if (context.financial.dueSoonSchedules.length > 0) {
    recommendations.push({
      id: "rec-collections",
      title: "Tighten collection follow-ups",
      detail: `${context.financial.dueSoonSchedules.length} customer payment schedules are due soon and require proactive reminders.`,
      priority: "Medium",
      route: frontendRoutes.collections,
      actionLabel: "Open collections",
    });
  }

  if (context.highValueLeads.length > 0) {
    recommendations.push({
      id: "rec-sales",
      title: "Protect high-value closure pipeline",
      detail: `${context.highValueLeads.length} premium leads are still open and need managed follow-up cadence.`,
      priority: "Medium",
      route: frontendRoutes.leads,
      actionLabel: "View premium leads",
    });
  }

  return recommendations.slice(0, 4);
};

const getAssistantOverview = () => {
  return remember("assistant:overview", ASSISTANT_PAYLOAD_CACHE_TTL_MS, () => {
    const context = getSharedContext();

    return {
      mode: "demo-simulation",
      headline: `${context.projects.length} active projects, ${context.alerts.summary.critical} critical alerts, ${context.projectRisk.summary.totalSignals} rule-based risk triggers`,
      summary: `This demo assistant is simulation-based, but it is reading live ERP demo state across projects, inventory, approvals, collections, and workforce activity.`,
      signals: [
        {
          label: "Portfolio value",
          value: formatCurrency(context.executive.executiveKpis.portfolioValue),
          tone: "success",
          detail: "Current executive inventory baseline across active projects.",
        },
        {
          label: "Pending approvals",
          value: `${context.executive.executiveKpis.approvalQueue}`,
          tone: context.executive.executiveKpis.approvalQueue > 0 ? "warning" : "success",
          detail: "Commercial and finance queue items that can block downstream execution.",
        },
        {
          label: "Low stock materials",
          value: `${context.lowStockMaterials.length}`,
          tone: context.lowStockMaterials.length > 0 ? "warning" : "success",
          detail: "Inventory items already at or below reorder levels.",
        },
        {
          label: "Today's attendance visibility",
          value: `${context.attendance.summary.present} present`,
          tone: "info",
          detail: `${context.employees.length} tracked employees in workforce register.`,
        },
      ],
      recommendations: buildRecommendations(context),
      suggestedCommands: assistantCommands,
      generatedAt: new Date().toISOString(),
    };
  });
};

const buildCommandResponse = (command, payload = {}) => {
  const context = getSharedContext();

  switch (command.id) {
    case "stock-alerts":
      return {
        mode: "demo-simulation",
        commandId: command.id,
        title: "Material stock alert summary",
        summary: `${context.lowStockMaterials.length} materials need replenishment review across the tracked warehouses.`,
        insights: context.lowStockMaterials.slice(0, 4).map(
          (material) =>
            `${material.name} at ${material.warehouseName} is down to ${material.onHand} ${material.unit} against reorder ${material.reorderLevel}.`,
        ),
        recommendations: [
          {
            id: "cmd-stock-pr",
            title: "Raise replenishment request",
            detail: "Route the affected items into the procurement queue before the next site consumption cycle.",
            priority: "High",
            route: frontendRoutes.purchaseRequests,
            actionLabel: "Open procurement",
          },
        ],
        generatedAt: new Date().toISOString(),
        matchedQuery: payload.query || "",
      };
    case "delayed-milestones":
      return {
        mode: "demo-simulation",
        commandId: command.id,
        title: "Delayed milestone review",
        summary: `${context.riskTasks.length} tasks are showing delay pressure based on due date or low completion progress.`,
        insights: context.riskTasks.slice(0, 5).map(
          (task) =>
            `${task.projectName}: ${task.title} is ${task.status} at ${task.completion}% with due date ${task.dueDate.slice(0, 10)}.`,
        ),
        recommendations: [
          {
            id: "cmd-delay-review",
            title: "Reallocate project attention",
            detail: "Review owner bandwidth and sequence risks before the delay cascades into downstream milestones.",
            priority: "High",
            route: frontendRoutes.resources,
            actionLabel: "Open resource board",
          },
        ],
        generatedAt: new Date().toISOString(),
        matchedQuery: payload.query || "",
      };
    case "high-value-sales":
      return {
        mode: "demo-simulation",
        commandId: command.id,
        title: "High-value lead follow-up plan",
        summary: `${context.highValueLeads.length} premium leads are open and should be handled with manager visibility.`,
        insights: context.highValueLeads.map(
          (lead) =>
            `${lead.fullName} is at ${lead.stage} for ${lead.projectName} with budget up to ${formatCurrency(lead.budgetMax)} and next follow-up ${lead.followUpAt.slice(0, 10)}.`,
        ),
        recommendations: [
          {
            id: "cmd-sales-broker",
            title: "Prioritize assisted closures",
            detail: "Route premium leads to site visit confirmation, broker alignment, or manager-supported commercial closure.",
            priority: "Medium",
            route: frontendRoutes.pipeline,
            actionLabel: "Open pipeline",
          },
        ],
        generatedAt: new Date().toISOString(),
        matchedQuery: payload.query || "",
      };
    case "collections-watch":
      return {
        mode: "demo-simulation",
        commandId: command.id,
        title: "Collections watchlist",
        summary: `${context.financial.dueSoonSchedules.length} due-soon schedules are in the collection window, with outstanding value of ${formatCurrency(context.financial.outstanding)} overall.`,
        insights: context.financial.dueSoonSchedules.slice(0, 5).map(
          (item) =>
            `${item.customerName} for ${item.projectName} ${item.unitCode}: ${item.label} of ${formatCurrency(item.amount)} due on ${item.dueDate.slice(0, 10)}.`,
        ),
        recommendations: [
          {
            id: "cmd-collections-reminder",
            title: "Trigger reminder workflow",
            detail: "Use WhatsApp or finance follow-up to clear near-term dues before they age into overdue status.",
            priority: "High",
            route: frontendRoutes.collections,
            actionLabel: "Open collections",
          },
        ],
        generatedAt: new Date().toISOString(),
        matchedQuery: payload.query || "",
      };
    case "approval-queue":
      return {
        mode: "demo-simulation",
        commandId: command.id,
        title: "Approval queue snapshot",
        summary: `${context.alerts.summary.critical + context.alerts.summary.high} high-priority operational alerts are active across approvals, compliance, and collections.`,
        insights: context.alerts.alerts.slice(0, 5).map(
          (item) =>
            `${item.category}: ${item.title} owned by ${item.ownerName} with ${item.severity} severity and due ${item.dueAt.slice(0, 10)}.`,
        ),
        recommendations: [
          {
            id: "cmd-approvals-clear",
            title: "Clear blocking approvals",
            detail: "Resolve commercial and finance approvals first because they directly affect booking and cash-flow conversion.",
            priority: "High",
            route: frontendRoutes.approvals,
            actionLabel: "Open approvals",
          },
        ],
        generatedAt: new Date().toISOString(),
        matchedQuery: payload.query || "",
      };
    case "operations-summary":
    default:
      return {
        mode: "demo-simulation",
        commandId: "operations-summary",
        title: "Construction ERP operations summary",
        summary: `${context.projects.length} projects, ${context.purchaseRequests.length} purchase requests, ${context.purchaseOrders.length} purchase orders, and ${context.dashboard.recentActivity.length} recent activity events are in the current operating picture.`,
        insights: [
          `${context.alerts.summary.critical} critical alerts and ${context.alerts.summary.high} high-priority alerts need same-cycle attention.`,
          `${context.riskTasks.length} project tasks are at risk of delay based on due date or completion momentum.`,
          `${context.lowStockMaterials.length} inventory items are below reorder threshold across the tracked warehouses.`,
          `${context.financial.dueSoonSchedules.length} collection milestones are due soon, with portfolio outstanding at ${formatCurrency(context.financial.outstanding)}.`,
        ],
        recommendations: buildRecommendations(context),
        generatedAt: new Date().toISOString(),
        matchedQuery: payload.query || "",
      };
  }
};

const getNotificationsFeed = () => {
  return remember("assistant:notifications", ASSISTANT_PAYLOAD_CACHE_TTL_MS, () => {
    const dashboard = getDashboardSummary();
    const alerts = getApprovalAlerts();

    const alertItems = alerts.alerts.slice(0, 8).map((item) => ({
      id: `notification-${item.id}`,
      title: item.title,
      message: item.message,
      category: item.category,
      severity: item.severity,
      source: item.source,
      status: "Unread",
      read: false,
      createdAt: item.dueAt,
      dueAt: item.dueAt,
      actionLabel: "Open queue",
      actionRoute:
        item.category === "Collections"
          ? frontendRoutes.collections
          : frontendRoutes.projectHealth,
    }));

    const activityItems = dashboard.recentActivity.slice(0, 6).map((item) => ({
      id: `notification-activity-${item.id}`,
      title: item.title,
      message: item.detail,
      category: item.category,
      severity: "Info",
      source: item.actorName,
      status: "Unread",
      read: false,
      createdAt: item.createdAt,
      dueAt: null,
      actionLabel: "Open dashboard",
      actionRoute: frontendRoutes.dashboard,
    }));

    const notifications = [...alertItems, ...activityItems].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    return {
      notifications,
      summary: {
        total: notifications.length,
        unread: notifications.filter((item) => !item.read).length,
        critical: notifications.filter((item) => item.severity === "Critical")
          .length,
        high: notifications.filter((item) => item.severity === "High").length,
        info: notifications.filter((item) => item.severity === "Info").length,
      },
      severityTones: {
        Critical: toneForSeverity("Critical"),
        High: toneForSeverity("High"),
        Medium: toneForSeverity("Medium"),
        Info: toneForSeverity("Info"),
      },
      generatedAt: new Date().toISOString(),
    };
  });
};

const runAssistantCommand = (payload = {}) => {
  const command = findCommand(payload) || assistantCommands[0];
  return buildCommandResponse(command, payload);
};

module.exports = {
  getAssistantOverview,
  getNotificationsFeed,
  runAssistantCommand,
};
