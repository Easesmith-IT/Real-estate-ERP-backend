const {
  getApprovalAlerts,
  getApprovalsSummary,
  getCollectionsSummary,
  getProjectRiskInsights,
  listAttendance,
  listBookings,
  listDailyReports,
  listEmployees,
  listLeads,
  listMaterials,
  listProjectTasks,
  listProjects,
  listPurchaseOrders,
  listPurchaseRequests,
  listReceipts,
  listVendors,
} = require("./erp.service");

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const monthKey = (value) => {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const dayKey = (value) => {
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
};

const buildTrailingMonths = (count) => {
  const anchor = new Date();
  anchor.setUTCDate(1);
  anchor.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (count - index - 1), 1));
    return {
      key: monthKey(date.toISOString()),
      label: date.toLocaleString("en-IN", { month: "short" }),
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
    };
  });
};

const buildTrailingDays = (count) => {
  const anchor = new Date();
  anchor.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor.getTime() - (count - index - 1) * DAY_MS);
    return {
      key: dayKey(date.toISOString()),
      label: date.toLocaleString("en-IN", { day: "2-digit", month: "short" }),
    };
  });
};

const toInitials = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const trendPercent = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
};

const toneForTrend = (value, inverse = false) => {
  if (value === 0) {
    return "neutral";
  }

  const positive = inverse ? value < 0 : value > 0;
  return positive ? "success" : "warning";
};

const portfolioForProject = (project) => {
  const location = `${project.location || ""}`.toLowerCase();

  if (
    location.includes("gurugram") ||
    location.includes("sohna") ||
    location.includes("faridabad") ||
    location.includes("dwarka")
  ) {
    return "South Zone Portfolio";
  }

  return "North Zone Portfolio";
};

const buildMonthMetricMap = (months, items, dateAccessor, valueAccessor) => {
  const monthMap = new Map(months.map((month) => [month.key, 0]));

  items.forEach((item) => {
    const key = monthKey(dateAccessor(item));
    if (!monthMap.has(key)) {
      return;
    }
    monthMap.set(key, monthMap.get(key) + valueAccessor(item));
  });

  return months.map((month) => ({
    month: month.label,
    key: month.key,
    value: Math.round(monthMap.get(month.key) || 0),
  }));
};

const buildCommandCenterContext = () => {
  const projects = listProjects().projects;
  const leads = listLeads({ page: 1, limit: 1000 }).items;
  const employees = listEmployees().employees;
  const attendance = listAttendance();
  const materials = listMaterials().materials;
  const purchaseOrders = listPurchaseOrders().purchaseOrders;
  const purchaseRequests = listPurchaseRequests().requests;
  const bookings = listBookings().bookings;
  const receipts = listReceipts().receipts;
  const dailyReports = listDailyReports().reports;
  const projectTasks = listProjectTasks().tasks;
  const collections = getCollectionsSummary();
  const approvals = getApprovalsSummary();
  const alerts = getApprovalAlerts();
  const risk = getProjectRiskInsights();
  const vendors = listVendors().vendors;

  return {
    alerts,
    approvals,
    attendance,
    bookings,
    collections,
    dailyReports,
    employees,
    leads,
    materials,
    projectTasks,
    projects,
    purchaseOrders,
    purchaseRequests,
    receipts,
    risk,
    vendors,
  };
};

const buildRevenueCollectionTrend = (context) => {
  const months = buildTrailingMonths(12);
  const revenueSeries = buildMonthMetricMap(
    months,
    context.bookings,
    (booking) => booking.bookingDate,
    (booking) => booking.totalAmount,
  );
  const collectionSeries = buildMonthMetricMap(
    months,
    context.receipts,
    (receipt) => receipt.receivedAt,
    (receipt) => receipt.amount,
  );

  return months.map((month, index) => ({
    month: month.label,
    revenue: revenueSeries[index].value,
    collections: collectionSeries[index].value,
  }));
};

const buildCollectionsAging = (context) => {
  const today = Date.now();
  const buckets = [
    { label: "0-30 Days", min: -Infinity, max: 30 },
    { label: "31-60 Days", min: 31, max: 60 },
    { label: "61-90 Days", min: 61, max: 90 },
    { label: "90+ Days", min: 91, max: Infinity },
  ];

  const rows = buckets.map((bucket) => ({
    bucket: bucket.label,
    north: 0,
    south: 0,
  }));

  context.bookings.forEach((booking) => {
    const project = context.projects.find((item) => item.id === booking.projectId);
    const portfolio = portfolioForProject(project || {});

    booking.scheduleSummary
      .filter((entry) => entry.status !== "Paid")
      .forEach((entry) => {
        const outstanding = Math.max(0, entry.amount - entry.paidAmount);
        if (outstanding <= 0) {
          return;
        }

        const daysDue = Math.max(
          0,
          Math.floor((today - new Date(entry.dueDate).getTime()) / DAY_MS),
        );
        const bucketIndex = buckets.findIndex(
          (bucket) => daysDue >= bucket.min && daysDue <= bucket.max,
        );

        if (bucketIndex < 0) {
          return;
        }

        if (portfolio === "South Zone Portfolio") {
          rows[bucketIndex].south += outstanding;
        } else {
          rows[bucketIndex].north += outstanding;
        }
      });
  });

  return rows.map((row) => ({
    ...row,
    total: row.north + row.south,
  }));
};

const buildAttendanceSparkline = (context) => {
  const days = buildTrailingDays(7);
  const counts = new Map(days.map((day) => [day.key, 0]));

  context.attendance.attendance.forEach((entry) => {
    const key = dayKey(entry.checkIn || entry.createdAt);
    if (!counts.has(key)) {
      return;
    }
    if (entry.status === "Present" || entry.status === "Late") {
      counts.set(key, counts.get(key) + 1);
    }
  });

  return days.map((day) => counts.get(day.key) || 0);
};

const buildProjectSparkline = (context) => {
  const months = buildTrailingMonths(6);
  const counts = new Map(months.map((month) => [month.key, 0]));

  context.projectTasks.forEach((task) => {
    const key = monthKey(task.dueDate);
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1);
    }
  });

  return months.map((month) => counts.get(month.key) || 0);
};

const buildPurchaseOrderSparkline = (context) => {
  const months = buildTrailingMonths(6);
  const counts = new Map(months.map((month) => [month.key, 0]));

  context.purchaseOrders.forEach((order) => {
    const key = monthKey(order.createdAt);
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + order.amount);
    }
  });

  return months.map((month) => Math.round((counts.get(month.key) || 0) / 100000));
};

const buildLeadSparkline = (context) => {
  const months = buildTrailingMonths(6);
  const counts = new Map(months.map((month) => [month.key, 0]));

  context.leads.forEach((lead) => {
    const key = monthKey(lead.createdAt);
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1);
    }
  });

  return months.map((month) => counts.get(month.key) || 0);
};

const buildMaterialSparkline = (context) => {
  const months = buildTrailingMonths(6);
  const counts = new Map(months.map((month) => [month.key, 0]));

  context.purchaseRequests.forEach((request) => {
    const key = monthKey(request.createdAt);
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + request.quantity);
    }
  });

  return months.map((month) => counts.get(month.key) || 0);
};

const buildProjectHealthCards = (context) => {
  const taskSummaryByProject = context.projectTasks.reduce((accumulator, task) => {
    if (!accumulator[task.projectId]) {
      accumulator[task.projectId] = { totalCompletion: 0, count: 0 };
    }

    accumulator[task.projectId].totalCompletion += task.completion;
    accumulator[task.projectId].count += 1;
    return accumulator;
  }, {});

  return context.risk.projects.map((project) => {
    const summary = taskSummaryByProject[project.id] || { totalCompletion: 0, count: 0 };
    const completion = summary.count
      ? Math.round(summary.totalCompletion / summary.count)
      : 0;
    const riskTone =
      project.riskLevel === "Critical"
        ? "critical"
        : ["High", "Medium"].includes(project.riskLevel)
          ? "attention"
          : "healthy";

    return {
      id: project.id,
      name: project.projectName,
      stage: project.stage,
      completion,
      riskScore: project.riskScore,
      riskLevel: project.riskLevel,
      tone: riskTone,
      statusLabel:
        riskTone === "healthy" ? "On Schedule" : project.primaryRisk,
      signalCount: project.openSignals,
      nextDueAt: project.nextDueAt,
      delayedMilestones: project.delayedMilestones,
      materialShortages: project.materialShortages,
      workforcePressure: project.averageResourceUtilization < 60,
    };
  });
};

const buildRecommendationItems = (context) => {
  const now = Date.now();
  const staleLeads = context.leads.filter((lead) => {
    if (lead.stage !== "New" && lead.stage !== "Contacted") {
      return false;
    }

    return now - new Date(lead.updatedAt || lead.createdAt).getTime() > 7 * DAY_MS;
  });
  const lowStockMaterials = context.materials.filter(
    (material) => material.onHand <= material.reorderLevel,
  );
  const aging = buildCollectionsAging(context);
  const overdueCollections = aging
    .filter((row) => row.bucket !== "0-30 Days")
    .reduce((sum, row) => sum + row.total, 0);
  const pendingApprovals = context.approvals.summary.pending;
  const topRiskProject = context.risk.projects[0];

  return [
    {
      id: "sales-opportunity",
      type: "Pipeline Opportunity",
      priority: staleLeads.length > 12 ? "high" : "medium",
      color: staleLeads.length > 12 ? "yellow" : "green",
      title: `${staleLeads.length} leads have not been contacted in 7 days.`,
      detail: "Lead response times exceed SLA thresholds, impacting conversion performance.",
      actionLabel: "View Leads",
      actionRoute: "/sales/leads",
    },
    {
      id: "material-risk",
      type: "Material Supply Risk",
      priority: lowStockMaterials.length > 10 ? "high" : "medium",
      color: lowStockMaterials.length > 10 ? "red" : "yellow",
      title: `${lowStockMaterials[0]?.category || "Core material"} stock is below reorder threshold.`,
      detail: `${lowStockMaterials.length} materials are currently at or under their safety buffer.`,
      actionLabel: "Create Purchase Request",
      actionRoute: "/purchases/requests",
    },
    {
      id: "collection-risk",
      type: "Credit & Collection Risk",
      priority: overdueCollections > 10000000 ? "high" : "medium",
      color: overdueCollections > 10000000 ? "red" : "yellow",
      title: `INR ${overdueCollections.toLocaleString("en-IN")} overdue payments detected.`,
      detail: "Outstanding accounts receivable have consolidated in the 31-90 day aging buckets.",
      actionLabel: "Review Collections",
      actionRoute: "/management/financial-overview",
    },
    {
      id: "approval-bottleneck",
      type: "Pending Approval Bottleneck",
      priority: pendingApprovals > 3 ? "medium" : "low",
      color: pendingApprovals > 3 ? "yellow" : "green",
      title: `${pendingApprovals} purchase and finance approvals are pending.`,
      detail: "Pending approvals exceed SLA thresholds, delaying procurement workflows.",
      actionLabel: "Review Approvals",
      actionRoute: "/purchases/approvals",
    },
    {
      id: "project-risk",
      type: "Project Delivery Risk",
      priority: topRiskProject?.riskLevel === "Critical" ? "high" : "medium",
      color: topRiskProject?.riskLevel === "Critical" ? "red" : "yellow",
      title: `${topRiskProject?.projectName || "Top portfolio project"} milestone is delayed.`,
      detail: topRiskProject
        ? `${topRiskProject.primaryRisk} with ${topRiskProject.delayedMilestones} delayed milestones and ${topRiskProject.openSignals} open risk signals.`
        : "No critical milestone or schedule risk detected in the active portfolio.",
      actionLabel: "View Project",
      actionRoute: `/projects/${topRiskProject?.id || "all-projects"}`,
    },
  ];
};

const buildActionCenter = (context) => ({
  counts: [
    { label: "Pending Approvals", value: context.approvals.summary.pending },
    {
      label: "Material Requests",
      value: context.purchaseRequests.filter((item) => item.status !== "Approved").length,
    },
    { label: "Purchase Orders", value: context.purchaseOrders.length },
    {
      label: "Vendor Approvals",
      value: context.purchaseOrders.filter((item) => item.status === "Draft").length,
    },
  ],
  quickActions: [
    { label: "Create Project", route: "/projects/all-projects" },
    { label: "Register Lead", route: "/sales/leads" },
    { label: "Create Purchase Order", route: "/purchases/purchase-orders" },
    { label: "Register Material", route: "/materials/materials-list" },
    { label: "Record Attendance", route: "/people/attendance" },
  ],
});

const getDashboardOverview = () => {
  const context = buildCommandCenterContext();
  const revenueTrend = buildRevenueCollectionTrend(context);
  const collectionsAging = buildCollectionsAging(context);
  const projectHealthCards = buildProjectHealthCards(context);

  const currentRevenue = revenueTrend[revenueTrend.length - 1]?.revenue || 0;
  const previousRevenue = revenueTrend[revenueTrend.length - 2]?.revenue || 0;
  const currentCollections = revenueTrend[revenueTrend.length - 1]?.collections || 0;
  const previousCollections = revenueTrend[revenueTrend.length - 2]?.collections || 0;
  const inventoryValue = context.projects.reduce((sum, project) => sum + project.inventoryValue, 0);
  const activeWorkforce = context.employees.filter((employee) => employee.status === "Active").length;
  const lowStockCount = context.materials.filter((material) => material.onHand <= material.reorderLevel).length;
  const collectionRate = currentRevenue > 0 ? Math.round((currentCollections / currentRevenue) * 100) : 0;
  const workforceUtilizationBase = context.risk.projects.length
    ? Math.round(
        context.risk.projects.reduce(
          (sum, project) => sum + project.averageResourceUtilization,
          0,
        ) / context.risk.projects.length,
      )
    : 0;
  const workforceOnLeave = Math.max(
    context.attendance.summary.absent,
    Math.round(activeWorkforce * 0.07),
  );
  const workforceActive = clamp(
    Math.round(activeWorkforce * Math.max(0.58, workforceUtilizationBase / 100)),
    0,
    activeWorkforce,
  );
  const workforceIdle = Math.max(0, activeWorkforce - workforceActive - workforceOnLeave);
  const healthScore = clamp(
    Math.round(
      0.28 * collectionRate +
        0.24 * (100 - Math.min(100, lowStockCount)) +
        0.24 * (100 - context.risk.summary.criticalProjects * 8) +
        0.14 * workforceUtilizationBase +
        0.1 * (100 - context.approvals.summary.pending * 5),
    ),
    42,
    96,
  );
  const healthDelta = Math.round(
    trendPercent(currentCollections || currentRevenue, previousCollections || previousRevenue) / 4,
  );
  const leadStageCounts = context.leads.reduce((accumulator, lead) => {
    accumulator[lead.stage] = (accumulator[lead.stage] || 0) + 1;
    return accumulator;
  }, {});
  const conversionBase =
    (leadStageCounts["Closed Won"] || 0) +
    context.leads.filter((lead) => !["Closed Won", "Closed Lost"].includes(lead.stage)).length;
  const leadConversionRate = conversionBase
    ? Math.round(((leadStageCounts["Closed Won"] || 0) / conversionBase) * 100)
    : 0;
  const inventoryVelocityValue = context.materials.length
    ? Math.round(
        (context.materials.reduce(
          (sum, material) => sum + material.averageConsumption,
          0,
        ) /
          context.materials.reduce((sum, material) => sum + Math.max(material.onHand, 1), 0)) *
          100,
      ) / 100
    : 0;
  const heroSparkline = buildProjectSparkline(context);
  const leadSparkline = buildLeadSparkline(context);
  const collectionSparkline = revenueTrend.slice(-6).map((item) => Math.round(item.collections / 100000));
  const revenueSparkline = revenueTrend.slice(-6).map((item) => Math.round(item.revenue / 100000));
  const workforceSparkline = buildAttendanceSparkline(context);
  const materialSparkline = buildMaterialSparkline(context);
  const purchaseOrderSparkline = buildPurchaseOrderSparkline(context);
  const riskTone = context.risk.summary.criticalProjects > 0 ? "critical" : "healthy";

  return {
    generatedAt: new Date().toISOString(),
    portfolio: {
      current: "All Projects",
      options: ["North Zone Portfolio", "South Zone Portfolio", "All Projects"],
      healthScore,
      healthDelta,
      tone: riskTone,
      narrative: `${context.projects.length} active projects, ${context.risk.summary.totalSignals} risk triggers, and ${context.approvals.summary.pending} pending approvals are in view.`,
    },
    executiveKpis: [
      {
        id: "active-projects",
        label: "Active Projects",
        format: "number",
        value: context.projects.length,
        trendPercent: trendPercent(heroSparkline[heroSparkline.length - 1] || 0, heroSparkline[heroSparkline.length - 2] || 0),
        status: context.risk.summary.criticalProjects > 0 ? "watch" : "healthy",
        sparkline: heroSparkline,
      },
      {
        id: "workforce-active",
        label: "Workforce Present",
        format: "number",
        value: workforceActive,
        trendPercent: trendPercent(workforceSparkline[workforceSparkline.length - 1] || 0, workforceSparkline[workforceSparkline.length - 2] || 0),
        status: workforceUtilizationBase >= 65 ? "healthy" : "watch",
        sparkline: workforceSparkline,
      },
      {
        id: "inventory-value",
        label: "Inventory Value",
        format: "currency",
        value: inventoryValue,
        trendPercent: trendPercent(purchaseOrderSparkline[purchaseOrderSparkline.length - 1] || 0, purchaseOrderSparkline[purchaseOrderSparkline.length - 2] || 0),
        status: lowStockCount > 8 ? "watch" : "healthy",
        sparkline: purchaseOrderSparkline,
      },
      {
        id: "monthly-collections",
        label: "Monthly Collections",
        format: "currency",
        value: currentCollections,
        trendPercent: trendPercent(currentCollections, previousCollections),
        status: currentCollections >= previousCollections ? "healthy" : "watch",
        sparkline: collectionSparkline,
      },
    ],
    operationsKpis: [
      {
        id: "kpi-projects",
        label: "Active Projects",
        format: "number",
        value: context.projects.length,
        trendPercent: trendPercent(context.projects.length, Math.max(1, context.projects.length - 1)),
        status: context.risk.summary.criticalProjects > 0 ? "watch" : "healthy",
        sparkline: heroSparkline,
      },
      {
        id: "kpi-conversion",
        label: "Lead Conversion Rate",
        format: "percent",
        value: leadConversionRate,
        trendPercent: trendPercent(leadStageCounts["Closed Won"] || 0, leadStageCounts.Negotiation || 1),
        status: leadConversionRate >= 18 ? "healthy" : "watch",
        sparkline: leadSparkline,
      },
      {
        id: "kpi-revenue",
        label: "Monthly Revenue",
        format: "currency",
        value: currentRevenue,
        trendPercent: trendPercent(currentRevenue, previousRevenue),
        status: currentRevenue >= previousRevenue ? "healthy" : "watch",
        sparkline: revenueSparkline,
      },
      {
        id: "kpi-collections",
        label: "Collections Received",
        format: "currency",
        value: currentCollections,
        trendPercent: trendPercent(currentCollections, previousCollections),
        status: currentCollections >= previousCollections ? "healthy" : "watch",
        sparkline: collectionSparkline,
      },
      {
        id: "kpi-workforce",
        label: "Workforce Utilization",
        format: "percent",
        value: workforceUtilizationBase,
        trendPercent: trendPercent(workforceSparkline[workforceSparkline.length - 1] || 0, workforceSparkline[workforceSparkline.length - 2] || 0),
        status: workforceUtilizationBase >= 65 ? "healthy" : "watch",
        sparkline: workforceSparkline,
      },
      {
        id: "kpi-inventory",
        label: "Inventory Velocity",
        format: "decimal",
        value: inventoryVelocityValue,
        trendPercent: trendPercent(materialSparkline[materialSparkline.length - 1] || 0, materialSparkline[materialSparkline.length - 2] || 0),
        status: inventoryVelocityValue >= 1 ? "healthy" : "watch",
        sparkline: materialSparkline,
      },
      {
        id: "kpi-approvals",
        label: "Pending Approvals",
        format: "number",
        value: context.approvals.summary.pending,
        trendPercent: -trendPercent(context.approvals.summary.pending, Math.max(1, context.approvals.summary.pending + 2)),
        status: context.approvals.summary.pending > 3 ? "critical" : "watch",
        sparkline: context.alerts.alerts.slice(0, 6).map((_, index) => Math.max(1, context.approvals.summary.pending - index)),
      },
      {
        id: "kpi-material-alerts",
        label: "Material Stock Alerts",
        format: "number",
        value: lowStockCount,
        trendPercent: trendPercent(lowStockCount, Math.max(1, lowStockCount - 2)),
        status: lowStockCount > 10 ? "critical" : "watch",
        sparkline: materialSparkline,
      },
    ],
    projectHealth: {
      summary: {
        healthy: projectHealthCards.filter((item) => item.tone === "healthy").length,
        attention: projectHealthCards.filter((item) => item.tone === "attention").length,
        critical: projectHealthCards.filter((item) => item.tone === "critical").length,
      },
      projects: projectHealthCards.sort((left, right) => right.riskScore - left.riskScore),
    },
    revenueCollections: {
      totals: {
        revenue: context.bookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
        collections: context.receipts.reduce((sum, receipt) => sum + receipt.amount, 0),
        collectionRate,
        overdueAmount: collectionsAging
          .filter((row) => row.bucket !== "0-30 Days")
          .reduce((sum, row) => sum + row.total, 0),
      },
      monthlyTrend: revenueTrend,
      aging: collectionsAging,
    },
    actionCenter: buildActionCenter(context),
    workforceDistribution: [
      { name: "Active", value: workforceActive },
      { name: "Idle", value: workforceIdle },
      { name: "On Leave", value: workforceOnLeave },
    ],
  };
};

const getDashboardProjectHealth = () => {
  const context = buildCommandCenterContext();
  const projects = buildProjectHealthCards(context).sort(
    (left, right) => right.riskScore - left.riskScore,
  );

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      healthyProjects: projects.filter((item) => item.tone === "healthy").length,
      atRiskProjects: projects.filter((item) => item.tone === "attention").length,
      criticalProjects: projects.filter((item) => item.tone === "critical").length,
    },
    projects,
  };
};

const getDashboardAnalytics = () => {
  const context = buildCommandCenterContext();
  const overview = getDashboardOverview();
  const months = buildTrailingMonths(6);
  const leadTrendMap = new Map(months.map((month) => [month.key, 0]));

  context.leads.forEach((lead) => {
    const key = monthKey(lead.createdAt);
    if (leadTrendMap.has(key)) {
      leadTrendMap.set(key, leadTrendMap.get(key) + 1);
    }
  });

  const funnelStages = ["New", "Contacted", "Interested", "Site Visit Scheduled", "Negotiation", "Closed Won"];
  const funnel = funnelStages.map((stage) => ({
    stage: stage === "Closed Won" ? "Closed" : stage,
    value: context.leads.filter((lead) => lead.stage === stage || (stage === "Closed Won" && lead.stage === "Booking")).length,
  }));

  const inventoryDistribution = Object.values(
    context.materials.reduce((accumulator, material) => {
      if (!accumulator[material.category]) {
        accumulator[material.category] = { category: material.category, value: 0 };
      }

      accumulator[material.category].value += material.onHand;
      return accumulator;
    }, {}),
  );

  return {
    generatedAt: new Date().toISOString(),
    revenueTrend: overview.revenueCollections.monthlyTrend,
    leadFunnel: funnel,
    monthlyLeadTrend: months.map((month) => ({
      month: month.label,
      value: leadTrendMap.get(month.key) || 0,
    })),
    workforceDistribution: overview.workforceDistribution,
    inventoryDistribution,
    topProjectsByValue: context.projects
      .slice()
      .sort((left, right) => right.inventoryValue - left.inventoryValue)
      .slice(0, 5)
      .map((project) => ({
        id: project.id,
        name: project.name,
        value: project.inventoryValue,
      })),
  };
};

const getDashboardRecommendations = () => {
  const context = buildCommandCenterContext();
  const items = buildRecommendationItems(context);

  return {
    generatedAt: new Date().toISOString(),
    opportunities: items.filter((item) => item.type === "Sales Opportunity"),
    risks: items.filter((item) => item.type === "Project Risk" || item.type === "Collection Risk" || item.type === "Material Risk"),
    alerts: items.filter((item) => item.type === "Approval Bottleneck"),
    items,
  };
};

const getDashboardActivityFeed = () => {
  const context = buildCommandCenterContext();

  const items = [
    ...context.attendance.attendance.slice(0, 8).map((entry) => ({
      id: `activity-${entry.id}`,
      type: "attendance",
      title: "Attendance marked",
      detail: `${entry.employeeName} marked ${entry.status} for ${entry.projectName}.`,
      actorName: entry.employeeName,
      avatarLabel: toInitials(entry.employeeName),
      iconKey: "user-check",
      timestamp: entry.checkIn || entry.createdAt,
    })),
    ...context.dailyReports.slice(0, 6).map((report) => ({
      id: `activity-${report.id}`,
      type: "dpr",
      title: "DPR submitted",
      detail: `${report.projectName} submitted daily progress with ${report.laborCount} labor on site.`,
      actorName: report.submittedByName,
      avatarLabel: toInitials(report.submittedByName),
      iconKey: "clipboard-list",
      timestamp: report.reportDate,
    })),
    ...context.approvals.approvals.slice(0, 5).map((approval) => ({
      id: `activity-${approval.id}`,
      type: "approval",
      title: approval.status === "Pending" ? "Purchase order approved" : "Approval workflow updated",
      detail: approval.summary,
      actorName: approval.ownerName,
      avatarLabel: toInitials(approval.ownerName),
      iconKey: "badge-check",
      timestamp: approval.submittedAt,
    })),
    ...context.leads.slice(0, 6).map((lead) => ({
      id: `activity-${lead.id}`,
      type: "lead",
      title: "Lead created",
      detail: `${lead.fullName} entered the ${lead.projectName} pipeline from ${lead.source}.`,
      actorName: lead.assignedToName,
      avatarLabel: toInitials(lead.assignedToName),
      iconKey: "sparkles",
      timestamp: lead.createdAt,
    })),
    ...context.purchaseOrders.slice(0, 5).map((order) => ({
      id: `activity-${order.id}`,
      type: "material",
      title: "Material received",
      detail: `${order.vendorName} order for ${order.projectName} is ${order.status.toLowerCase()}.`,
      actorName: order.vendorName,
      avatarLabel: toInitials(order.vendorName),
      iconKey: "package-check",
      timestamp: order.createdAt,
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    )
    .slice(0, 14)
    .map((item) => ({
      ...item,
      relativeTime: new Date(item.timestamp).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

  return {
    generatedAt: new Date().toISOString(),
    items,
  };
};

module.exports = {
  getDashboardActivityFeed,
  getDashboardAnalytics,
  getDashboardOverview,
  getDashboardProjectHealth,
  getDashboardRecommendations,
};
