const fs = require("fs");
const path = require("path");

const { routeDefinitions } = require("../src/connection/routeRegistry");

const BASE_URL = process.env.ERP_BASE_URL || "http://localhost:5000";
const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..");
const REPORT_PATH = path.join(
  WORKSPACE_ROOT,
  "LIVE_API_FRONTEND_BACKEND_VERIFICATION_REPORT.md",
);
const RESULTS_PATH = path.join(
  WORKSPACE_ROOT,
  "live-api-verification-results.json",
);
const ROUTE_REGISTRY_DIR = path.dirname(
  require.resolve("../src/connection/routeRegistry"),
);

const DEMO_ACCOUNTS = {
  admin: "aditi.mehra@nimbuserp.local",
  manager: "rohan.malhotra@nimbuserp.local",
  accountant: "neha.suri@nimbuserp.local",
  sales: "aman.singh@nimbuserp.local",
};

const runAt = new Date().toISOString();
const stamp = `LIVE-${runAt.replace(/[:.]/g, "-")}`;

const results = [];

const isJsonResponse = (response) =>
  `${response.headers.get("content-type") || ""}`.includes("application/json");

const summarizePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return `${payload}`;
  }

  if (Array.isArray(payload)) {
    return `array(${payload.length})`;
  }

  const data = payload.data;
  if (Array.isArray(data)) {
    return `data array(${data.length})`;
  }

  if (data && typeof data === "object") {
    const parts = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        parts.push(`${key}:${value.length}`);
      } else if (value && typeof value === "object") {
        parts.push(`${key}:object`);
      }
    }
    return parts.length ? parts.join(", ") : Object.keys(data).slice(0, 6).join(", ");
  }

  return Object.keys(payload).slice(0, 6).join(", ");
};

const pushResult = ({
  category,
  label,
  method,
  pathName,
  ok,
  status,
  durationMs,
  note,
  summary,
  details,
}) => {
  results.push({
    category,
    label,
    method,
    path: pathName,
    ok,
    status,
    durationMs,
    note,
    summary,
    details,
  });
};

const request = async (
  pathName,
  {
    method = "GET",
    token,
    demoUserId,
    body,
    formData,
    expectedStatus = 200,
    category = "api",
    label = pathName,
    timeoutMs = 15000,
  } = {},
) => {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (demoUserId) {
    headers["x-demo-user-id"] = demoUserId;
  }
  if (!formData) {
    headers["Content-Type"] = "application/json";
  }

  const startedAt = Date.now();
  let response;
  let payload;
  let note = "";

  console.log(`[${category}] ${method} ${pathName} :: ${label}`);

  try {
    response = await fetch(`${BASE_URL}${pathName}`, {
      method,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      body: formData || (body ? JSON.stringify(body) : undefined),
    });

    payload = isJsonResponse(response)
      ? await response.json()
      : await response.text();
  } catch (error) {
    pushResult({
      category,
      label,
      method,
      pathName,
      ok: false,
      status: "ERROR",
      durationMs: Date.now() - startedAt,
      note: error.message,
      summary: "request failed",
    });
    return { ok: false, error };
  }

  const ok = response.status === expectedStatus;
  if (!ok) {
    note =
      typeof payload === "string"
        ? payload.slice(0, 180)
        : payload?.message || payload?.error || `expected ${expectedStatus}`;
  }

  pushResult({
    category,
    label,
    method,
    pathName,
    ok,
    status: response.status,
    durationMs: Date.now() - startedAt,
    note,
    summary: typeof payload === "string" ? payload.slice(0, 80) : summarizePayload(payload),
    details: typeof payload === "string" ? payload : payload,
  });

  console.log(
    `[${category}] ${method} ${pathName} -> ${response.status} (${Date.now() - startedAt}ms)`,
  );

  return {
    ok,
    status: response.status,
    payload,
  };
};

const findMissingRouteGroups = () =>
  routeDefinitions
    .filter((route) => {
      try {
        require.resolve(path.resolve(ROUTE_REGISTRY_DIR, route.modulePath));
        return false;
      } catch (error) {
        return error.code === "MODULE_NOT_FOUND";
      }
    })
    .map((route) => `${route.key} (${route.mount})`);

const collectMatches = (items, predicate) => items.filter(predicate).length;

const formatDuration = (value) => `${value}ms`;

const buildMarkdown = ({
  missingRouteGroups,
  createdArtifacts,
}) => {
  const passed = results.filter((entry) => entry.ok).length;
  const failed = results.filter((entry) => !entry.ok).length;
  const grouped = results.reduce((accumulator, entry) => {
    if (!accumulator[entry.category]) {
      accumulator[entry.category] = [];
    }
    accumulator[entry.category].push(entry);
    return accumulator;
  }, {});

  const lines = [
    "# Live Frontend + Backend Verification Report",
    "",
    `- Run at: \`${runAt}\``,
    `- Backend base URL: \`${BASE_URL}\``,
    `- Total checks: \`${results.length}\``,
    `- Passed: \`${passed}\``,
    `- Failed: \`${failed}\``,
    "",
    "## Route Registry",
    "",
    `- Mounted route groups present: \`${routeDefinitions.length - missingRouteGroups.length}\``,
    `- Missing route groups skipped by backend bootstrap: \`${missingRouteGroups.length}\``,
  ];

  if (missingRouteGroups.length) {
    lines.push("", ...missingRouteGroups.map((item) => `- Missing: \`${item}\``));
  }

  lines.push("", "## Created Live Test Artifacts", "");
  Object.entries(createdArtifacts).forEach(([key, value]) => {
    lines.push(`- ${key}: \`${value || "not created"}\``);
  });

  for (const [category, entries] of Object.entries(grouped)) {
    lines.push("", `## ${category}`, "", "| Check | Method | Path | Status | Result | Duration | Note |", "| --- | --- | --- | --- | --- | --- | --- |");
    entries.forEach((entry) => {
      lines.push(
        `| ${entry.label} | \`${entry.method}\` | \`${entry.path}\` | \`${entry.status}\` | ${entry.ok ? "PASS" : "FAIL"} | \`${formatDuration(entry.durationMs)}\` | ${entry.note || entry.summary || ""} |`,
      );
    });
  }

  const failedEntries = results.filter((entry) => !entry.ok);
  lines.push("", "## Summary", "");
  if (failedEntries.length) {
    failedEntries.forEach((entry) => {
      lines.push(`- FAIL: ${entry.label} \`${entry.method} ${entry.path}\` -> ${entry.status} (${entry.note || entry.summary || "no detail"})`);
    });
  } else {
    lines.push("- All scripted live API checks passed.");
  }

  return `${lines.join("\n")}\n`;
};

const main = async () => {
  const missingRouteGroups = findMissingRouteGroups();

  await request("/api/health", {
    category: "backend-health",
    label: "Health endpoint",
  });
  await request("/", {
    category: "backend-health",
    label: "Root endpoint",
  });

  const authTokens = {};
  const authUsers = {};
  for (const [role, email] of Object.entries(DEMO_ACCOUNTS)) {
    const response = await request("/api/auth/login", {
      method: "POST",
      category: "auth",
      label: `Login as ${role}`,
      body: { email },
    });
    if (response.ok) {
      authTokens[role] = response.payload.data.token;
      authUsers[role] = response.payload.data.user;
    }
  }

  const adminToken = authTokens.admin;
  if (!adminToken) {
    throw new Error("Admin login failed; cannot continue live API verification");
  }

  await request("/api/auth/me", {
    token: adminToken,
    category: "auth",
    label: "Auth me with admin bearer token",
  });
  await request("/api/auth/roles", {
    token: adminToken,
    category: "auth",
    label: "Auth roles catalogue",
  });
  await request("/api/admin/settings", {
    token: authTokens.sales,
    category: "permissions",
    label: "Sales role denied for admin settings",
    expectedStatus: 403,
  });

  const usersResponse = await request("/api/users", {
    token: adminToken,
    category: "context",
    label: "Load users context",
  });
  const customersResponse = await request("/api/customers", {
    token: adminToken,
    category: "context",
    label: "Load customers context",
  });
  const propertiesResponse = await request("/api/properties/summary", {
    token: adminToken,
    category: "context",
    label: "Load properties context",
  });
  const leadsResponse = await request("/api/leads?limit=500", {
    token: adminToken,
    category: "context",
    label: "Load leads context",
  });
  const bookingsResponse = await request("/api/bookings", {
    token: adminToken,
    category: "context",
    label: "Load bookings context",
  });
  const approvalsResponse = await request("/api/admin/approvals", {
    token: adminToken,
    category: "context",
    label: "Load approvals context",
  });
  const settingsResponse = await request("/api/admin/settings", {
    token: adminToken,
    category: "context",
    label: "Load settings context",
  });
  const vendorsResponse = await request("/api/procurement/vendors", {
    token: adminToken,
    category: "context",
    label: "Load vendors context",
  });
  const requestsResponse = await request("/api/procurement/requests", {
    token: adminToken,
    category: "context",
    label: "Load purchase requests context",
  });
  const materialsResponse = await request("/api/materials", {
    token: adminToken,
    category: "context",
    label: "Load materials context",
  });
  const workforceResponse = await request("/api/workforce/employees", {
    token: adminToken,
    category: "context",
    label: "Load workforce context",
  });

  const users = usersResponse.payload.data.users;
  const brokers = customersResponse.payload.data.brokers;
  const projects = propertiesResponse.payload.data.projects;
  const units = propertiesResponse.payload.data.units;
  const existingLeads = leadsResponse.payload.data.items;
  const paymentPlanTypes = bookingsResponse.payload.data.paymentPlanTypes;
  const approvals = approvalsResponse.payload.data.approvals;
  const workflowSettings = settingsResponse.payload.data.workflowSettings;
  const notificationSettings = settingsResponse.payload.data.notificationSettings;
  const vendors = vendorsResponse.payload.data.vendors;
  const purchaseRequests = requestsResponse.payload.data.requests;
  const materials = materialsResponse.payload.data.materials;
  const warehouses = materialsResponse.payload.data.warehouses;
  const employees = workforceResponse.payload.data.employees;

  const salesOwner =
    users.find((user) => user.role === "sales") ||
    users.find((user) => user.role === "manager") ||
    users[0];
  const managerUser =
    users.find((user) => user.role === "manager") || users[0];
  const firstProject = projects[0];
  const availableUnits = units.filter((unit) => unit.status === "available");
  const firstVendor = vendors[0];
  const firstRequest = purchaseRequests[0];
  const firstWarehouse = warehouses[0];
  const secondWarehouse =
    warehouses.find((warehouse) => warehouse.id !== firstWarehouse.id) ||
    firstWarehouse;
  const firstMaterial = materials[0];
  const firstEmployee = employees[0];
  const firstPendingApproval =
    approvals.find((approval) => approval.status === "Pending") || approvals[0];
  const firstWorkflowSetting = workflowSettings[0];
  const firstNotificationSetting = notificationSettings[0];

  const createdArtifacts = {
    leadId: null,
    secondLeadId: null,
    thirdLeadId: null,
    brokerId: null,
    projectId: null,
    taskId: null,
    reportId: null,
    resourceId: null,
    vendorId: null,
    requestId: null,
    quotationId: null,
    purchaseOrderId: null,
    warehouseId: null,
    materialId: null,
    employeeId: null,
    contractorId: null,
    reservationId: null,
    bookingId: null,
    uploadDocumentId: null,
  };

  const createdLeadResponse = await request("/api/leads", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create lead",
    body: {
      firstName: "Live",
      lastName: stamp,
      phone: `+91${Date.now().toString().slice(-10)}`,
      email: `live.${stamp.toLowerCase()}@nimbuserp.local`,
      preferredProjectId: firstProject.id,
      preferredConfiguration: "3BHK",
      budgetMin: 12000000,
      budgetMax: 15000000,
      assignedTo: salesOwner.id,
      source: "Website",
      brokerId: brokers[0]?.id || "",
      followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: `${stamp} lead created by live smoke suite`,
    },
  });
  createdArtifacts.leadId = createdLeadResponse.payload?.data?.id || null;

  await request(`/api/leads/${createdArtifacts.leadId}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Update lead",
    body: {
      notes: `${stamp} lead updated by smoke suite`,
      budgetMax: 15800000,
      assignedTo: managerUser.id,
    },
  });
  await request(`/api/leads/${createdArtifacts.leadId}/stage`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Advance lead stage",
    body: { stage: "Contacted" },
  });
  await request("/api/leads/site-visits", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create site visit",
    body: {
      leadId: createdArtifacts.leadId,
      projectId: firstProject.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      coordinatorId: salesOwner.id,
      outcome: `${stamp} site visit scheduled`,
    },
  });

  const brokerCreateResponse = await request("/api/customers/brokers", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create broker",
    body: {
      name: `${stamp} Broker`,
      commissionRate: 2.5,
    },
  });
  createdArtifacts.brokerId = brokerCreateResponse.payload?.data?.id || null;

  const createdProjectResponse = await request("/api/properties", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create project",
    body: {
      name: `${stamp} Project`,
      code: stamp.slice(-8),
      location: "Client Demo Sector",
      stage: "Execution Planning",
      managerId: managerUser.id,
    },
  });
  createdArtifacts.projectId = createdProjectResponse.payload?.data?.id || null;

  const createdTaskResponse = await request("/api/projects/tasks", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create project task",
    body: {
      projectId: createdArtifacts.projectId,
      title: `${stamp} Task`,
      ownerId: managerUser.id,
      discipline: "Milestone",
      priority: "High",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  createdArtifacts.taskId = createdTaskResponse.payload?.data?.id || null;

  await request(`/api/projects/tasks/${createdArtifacts.taskId}/advance`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Advance project task",
  });

  const createdReportResponse = await request("/api/projects/daily-reports", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create daily report",
    body: {
      projectId: createdArtifacts.projectId,
      reportDate: new Date().toISOString(),
      laborCount: 42,
      materialUsage: "Cement and steel issued for slab preparation",
      blockers: "No critical blockers",
      progressSummary: `${stamp} DPR submitted through live suite`,
    },
  });
  createdArtifacts.reportId = createdReportResponse.payload?.data?.id || null;

  const createdResourceResponse = await request("/api/projects/resources", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create resource allocation",
    body: {
      projectId: createdArtifacts.projectId,
      resourceName: `${stamp} Tower Crane`,
      type: "Equipment",
      assignedTo: "Core Structure",
      utilization: 72,
    },
  });
  createdArtifacts.resourceId = createdResourceResponse.payload?.data?.id || null;

  const vendorCreateResponse = await request("/api/procurement/vendors", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create vendor",
    body: {
      name: `${stamp} Vendor`,
      category: "Cement",
      city: "Noida",
      gstin: `09AAAL${Date.now().toString().slice(-6)}Z5`,
      averageLeadTimeDays: 3,
      reliabilityScore: 88,
      status: "Active",
    },
  });
  createdArtifacts.vendorId = vendorCreateResponse.payload?.data?.id || null;

  await request(`/api/procurement/vendors/${createdArtifacts.vendorId}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Update vendor",
    body: {
      city: "Greater Noida",
      reliabilityScore: 91,
    },
  });

  const createRequestResponse = await request("/api/procurement/requests", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create purchase request",
    body: {
      title: `${stamp} Cement Request`,
      projectId: createdArtifacts.projectId,
      materialCategory: "Cement",
      quantity: 120,
      unit: "bags",
      priority: "High",
      requiredBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  createdArtifacts.requestId = createRequestResponse.payload?.data?.id || null;

  const createQuotationResponse = await request("/api/procurement/quotations", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create quotation",
    body: {
      requestId: createdArtifacts.requestId,
      vendorId: createdArtifacts.vendorId,
      totalAmount: 845000,
      deliveryDays: 4,
      paymentTerms: "40% advance, balance on delivery",
      qualityScore: 89,
      status: "Received",
    },
  });
  createdArtifacts.quotationId = createQuotationResponse.payload?.data?.id || null;

  const createPurchaseOrderResponse = await request(
    "/api/procurement/purchase-orders",
    {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Create purchase order",
      body: {
        requestId: createdArtifacts.requestId,
        vendorId: createdArtifacts.vendorId,
        projectId: createdArtifacts.projectId,
        amount: 845000,
        expectedDelivery: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        status: "Draft",
      },
    },
  );
  createdArtifacts.purchaseOrderId =
    createPurchaseOrderResponse.payload?.data?.id || null;

  const approvalsAfterPo = await request("/api/admin/approvals", {
    token: adminToken,
    category: "write-flows",
    label: "Refresh approvals after PO creation",
  });
  const purchaseOrderApproval = approvalsAfterPo.payload.data.approvals.find(
    (approval) => approval.relatedEntityId === createdArtifacts.purchaseOrderId,
  );

  await request(`/api/admin/approvals/${purchaseOrderApproval?.id || firstPendingApproval.id}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Act on approval",
    body: { action: "approve" },
  });

  await request("/api/procurement/payments", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Record vendor payment",
    body: {
      vendorId: createdArtifacts.vendorId,
      poId: createdArtifacts.purchaseOrderId,
      amount: 250000,
      mode: "NEFT",
      reference: `${stamp}-VP`,
    },
  });

  const createWarehouseResponse = await request("/api/materials/warehouses", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create warehouse",
    body: {
      name: `${stamp} Warehouse`,
      location: "Demo Logistics Yard",
      capacityUtilization: 44,
      status: "Operational",
    },
  });
  createdArtifacts.warehouseId = createWarehouseResponse.payload?.data?.id || null;

  await request(`/api/materials/warehouses/${createdArtifacts.warehouseId}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Update warehouse",
    body: {
      location: "Demo Logistics Hub",
      capacityUtilization: 51,
    },
  });

  const createMaterialResponse = await request("/api/materials", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create material",
    body: {
      sku: `${stamp.slice(-6)}-MAT`,
      name: `${stamp} Cement Stock`,
      category: "Cement",
      warehouseId: createdArtifacts.warehouseId,
      projectId: createdArtifacts.projectId,
      onHand: 220,
      reorderLevel: 90,
      unit: "bags",
      averageConsumption: 18,
    },
  });
  createdArtifacts.materialId = createMaterialResponse.payload?.data?.id || null;

  await request(`/api/materials/${createdArtifacts.materialId}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Update material",
    body: {
      onHand: 205,
      reorderLevel: 95,
      averageConsumption: 20,
    },
  });

  await request("/api/materials/transfers", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create material transfer",
    body: {
      materialId: createdArtifacts.materialId,
      fromWarehouseId: createdArtifacts.warehouseId,
      toWarehouseId: secondWarehouse.id,
      quantity: 12,
      unit: "bags",
    },
  });

  await request("/api/materials/consumption", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Record material consumption",
    body: {
      materialId: createdArtifacts.materialId,
      projectId: createdArtifacts.projectId,
      quantity: 8,
      unit: "bags",
      purpose: `${stamp} slab consumption`,
      consumedOn: new Date().toISOString(),
    },
  });

  const createEmployeeResponse = await request("/api/workforce/employees", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create employee",
    body: {
      name: `${stamp} Employee`,
      department: "Projects",
      designation: "Site Engineer",
      projectId: createdArtifacts.projectId,
      teamName: "Execution Cell",
      phone: `+91${(Date.now() + 17).toString().slice(-10)}`,
      status: "Active",
    },
  });
  createdArtifacts.employeeId = createEmployeeResponse.payload?.data?.id || null;

  await request(`/api/workforce/employees/${createdArtifacts.employeeId}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Update employee",
    body: {
      designation: "Senior Site Engineer",
      teamName: "Execution Pod A",
    },
  });

  const createContractorResponse = await request("/api/workforce/contractors", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create contractor",
    body: {
      name: `${stamp} Contractor`,
      trade: "Civil",
      projectId: createdArtifacts.projectId,
      workforce: 28,
      status: "Engaged",
    },
  });
  createdArtifacts.contractorId =
    createContractorResponse.payload?.data?.id || null;

  await request(`/api/workforce/contractors/${createdArtifacts.contractorId}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Update contractor",
    body: {
      workforce: 31,
      status: "Mobilizing",
    },
  });

  await request(
    `/api/workforce/contractors/${createdArtifacts.contractorId}/archive`,
    {
      method: "PATCH",
      token: adminToken,
      category: "write-flows",
      label: "Archive contractor",
    },
  );

  await request("/api/workforce/attendance", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Mark attendance",
    body: {
      employeeId: createdArtifacts.employeeId,
      projectId: createdArtifacts.projectId,
      shift: "Day",
      status: "Present",
      checkIn: new Date().toISOString(),
    },
  });

  await request(`/api/admin/workflow-settings/${firstWorkflowSetting.id}`, {
    method: "PATCH",
    token: adminToken,
    category: "write-flows",
    label: "Update workflow setting",
    body: {
      defaultValue: `${firstWorkflowSetting.defaultValue} [${stamp}]`,
      status: "Active",
    },
  });

  await request(
    `/api/admin/notification-settings/${firstNotificationSetting.id}`,
    {
      method: "PATCH",
      token: adminToken,
      category: "write-flows",
      label: "Update notification setting",
      body: {
        defaultValue: `${firstNotificationSetting.defaultValue} [${stamp}]`,
        status: "Active",
      },
    },
  );

  await request("/api/admin/integrations/whatsapp/test", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Test WhatsApp integration",
  });
  await request("/api/admin/integrations/whatsapp/send-demo", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Send WhatsApp demo notification",
  });
  await request("/api/admin/integrations/biometric/sync", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Sync biometric attendance",
  });

  await request("/api/ai/command", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Run assistant command",
    body: {
      commandId: "operations-summary",
      query: "operations summary",
    },
  });

  await request("/api/admin/documents", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Create document record",
    body: {
      title: `${stamp} Document Record`,
      category: "Contracts",
      module: "Projects",
      projectId: createdArtifacts.projectId,
      version: "v1",
      status: "Pending Review",
      ownerId: managerUser.id,
    },
  });

  const uploadForm = new FormData();
  uploadForm.append(
    "file",
    new Blob([`Live upload payload for ${stamp}\n`], {
      type: "text/plain",
    }),
    `${stamp}.txt`,
  );
  uploadForm.append("title", `${stamp} Uploaded Doc`);
  uploadForm.append("category", "General");
  uploadForm.append("module", "Projects");
  uploadForm.append("projectId", createdArtifacts.projectId);
  uploadForm.append("status", "Pending Review");
  uploadForm.append("ownerId", managerUser.id);
  const uploadResponse = await request("/api/uploads/document", {
    method: "POST",
    token: adminToken,
    category: "write-flows",
    label: "Upload document",
    formData: uploadForm,
  });
  createdArtifacts.uploadDocumentId = uploadResponse.payload?.data?.id || null;

  if (availableUnits.length >= 1 && createdArtifacts.leadId) {
    const reservationResponse = await request("/api/reservations", {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Create reservation",
      body: {
        leadId: createdArtifacts.leadId,
        unitId: availableUnits[0].id,
        notes: `${stamp} reservation`,
      },
    });
    createdArtifacts.reservationId =
      reservationResponse.payload?.data?.reservation?.id || null;
  }

  if (availableUnits.length >= 2) {
    const secondLeadResponse = await request("/api/leads", {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Create second lead for reservation release",
      body: {
        firstName: "Release",
        lastName: stamp,
        phone: `+91${(Date.now() + 31).toString().slice(-10)}`,
        email: `release.${stamp.toLowerCase()}@nimbuserp.local`,
        preferredProjectId: availableUnits[1].projectId,
        preferredConfiguration: "2BHK",
        budgetMin: 9000000,
        budgetMax: 11000000,
        assignedTo: salesOwner.id,
        source: "WhatsApp",
        followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    createdArtifacts.secondLeadId =
      secondLeadResponse.payload?.data?.id || null;

    const secondReservation = await request("/api/reservations", {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Create second reservation",
      body: {
        leadId: createdArtifacts.secondLeadId,
        unitId: availableUnits[1].id,
        notes: `${stamp} release reservation`,
      },
    });
    const secondReservationId =
      secondReservation.payload?.data?.reservation?.id || null;
    if (secondReservationId) {
      await request(`/api/reservations/${secondReservationId}`, {
        method: "DELETE",
        token: adminToken,
        category: "write-flows",
        label: "Release reservation with DELETE",
      });
    }
  }

  if (availableUnits.length >= 3) {
    const thirdLeadResponse = await request("/api/leads", {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Create third lead for booking flow",
      body: {
        firstName: "Booking",
        lastName: stamp,
        phone: `+91${(Date.now() + 41).toString().slice(-10)}`,
        email: `booking.${stamp.toLowerCase()}@nimbuserp.local`,
        preferredProjectId: availableUnits[2].projectId,
        preferredConfiguration: "3BHK",
        budgetMin: 13000000,
        budgetMax: 17000000,
        assignedTo: salesOwner.id,
        source: "Referral",
        followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    createdArtifacts.thirdLeadId = thirdLeadResponse.payload?.data?.id || null;

    await request("/api/reservations", {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Reserve unit for booking",
      body: {
        leadId: createdArtifacts.thirdLeadId,
        unitId: availableUnits[2].id,
        notes: `${stamp} bookable reservation`,
      },
    });

    const bookingResponse = await request("/api/bookings", {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Create booking",
      body: {
        leadId: createdArtifacts.thirdLeadId,
        unitId: availableUnits[2].id,
        paymentPlanType: paymentPlanTypes[0],
        customerName: `Booking ${stamp}`,
        customerPhone: `+91${(Date.now() + 51).toString().slice(-10)}`,
        customerEmail: `customer.${stamp.toLowerCase()}@nimbuserp.local`,
      },
    });
    createdArtifacts.bookingId = bookingResponse.payload?.data?.id || null;

    await request("/api/payments/receipts", {
      method: "POST",
      token: adminToken,
      category: "write-flows",
      label: "Record receipt",
      body: {
        bookingId: createdArtifacts.bookingId,
        amount: 100000,
        mode: "NEFT",
        reference: `${stamp}-RCPT`,
      },
    });
  }

  const readSuite = [
    ["/api/health", "Health check"],
    ["/api/auth/me", "Auth me"],
    ["/api/users", "Users directory"],
    ["/api/users/permissions-matrix", "Permissions matrix"],
    ["/api/customers", "Customers register"],
    ["/api/customers/brokers", "Brokers register"],
    ["/api/properties", "Properties register"],
    ["/api/properties/summary", "Properties summary"],
    ["/api/properties/units", "Units register"],
    ["/api/leads?limit=200", "Lead register"],
    ["/api/leads/stats", "Lead stats"],
    ["/api/leads/pipeline", "Lead pipeline"],
    ["/api/leads/site-visits", "Site visits"],
    ["/api/reservations", "Reservations"],
    ["/api/bookings", "Bookings"],
    ["/api/payments", "Collections"],
    ["/api/payments/summary", "Collections summary"],
    ["/api/reports", "Reports root"],
    ["/api/reports/dashboard", "Dashboard report"],
    ["/api/reports/financial-overview", "Financial overview"],
    ["/api/reports/dashboard-reports", "Dashboard reports"],
    ["/api/reports/executive-dashboard", "Executive dashboard"],
    ["/api/reports/budget-overview", "Budget overview"],
    ["/api/admin", "Admin root"],
    ["/api/admin/settings", "Admin settings"],
    ["/api/admin/approvals", "Approvals"],
    ["/api/admin/documents", "Documents"],
    ["/api/admin/compliance", "Compliance"],
    ["/api/finance", "Finance overview"],
    ["/api/documents", "Documents module"],
    ["/api/compliance", "Compliance module"],
    ["/api/facility", "Facility overview"],
    ["/api/support", "Support overview"],
    ["/api/admin/alerts/approval", "Approval alerts"],
    ["/api/projects/tasks", "Project tasks"],
    ["/api/projects/risk", "Project risk"],
    ["/api/projects/daily-reports", "Daily reports"],
    ["/api/projects/resources", "Project resources"],
    ["/api/procurement/vendors", "Vendors"],
    ["/api/procurement/requests", "Purchase requests"],
    ["/api/procurement/quotations", "Quotations"],
    ["/api/procurement/purchase-orders", "Purchase orders"],
    ["/api/procurement/payments", "Vendor payments"],
    ["/api/materials", "Materials"],
    ["/api/materials/transfers", "Transfers"],
    ["/api/materials/consumption", "Consumption"],
    ["/api/materials/alerts", "Material alerts"],
    ["/api/workforce/employees", "Employees"],
    ["/api/workforce/contractors", "Contractors"],
    ["/api/workforce/attendance", "Attendance"],
    ["/api/notifications", "Notifications"],
    ["/api/ai/overview", "AI overview"],
  ];

  for (const [pathName, label] of readSuite) {
    await request(pathName, {
      token: adminToken,
      category: "read-suite",
      label,
    });
  }

  await request(`/api/leads?search=${encodeURIComponent(stamp)}&limit=50`, {
    token: adminToken,
    category: "visibility-checks",
    label: "Search for smoke leads",
  });
  await request("/api/properties/summary", {
    token: adminToken,
    category: "visibility-checks",
    label: "Verify project visibility after create",
  });
  await request("/api/procurement/vendors", {
    token: adminToken,
    category: "visibility-checks",
    label: "Verify vendor visibility after create",
  });
  await request("/api/materials", {
    token: adminToken,
    category: "visibility-checks",
    label: "Verify material visibility after create",
  });
  await request("/api/workforce/employees", {
    token: adminToken,
    category: "visibility-checks",
    label: "Verify employee visibility after create",
  });
  await request("/api/bookings", {
    token: adminToken,
    category: "visibility-checks",
    label: "Verify booking visibility after create",
  });

  const leadVisibilityResponse = await request(
    `/api/leads?search=${encodeURIComponent(stamp)}&limit=200`,
    {
      token: adminToken,
      category: "assertions",
      label: "Assert created leads searchable",
    },
  );
  const propertyVisibilityResponse = await request("/api/properties/summary", {
    token: adminToken,
    category: "assertions",
    label: "Assert created project visible",
  });
  const vendorVisibilityResponse = await request("/api/procurement/vendors", {
    token: adminToken,
    category: "assertions",
    label: "Assert created vendor visible",
  });
  const materialVisibilityResponse = await request("/api/materials", {
    token: adminToken,
    category: "assertions",
    label: "Assert created material visible",
  });
  const employeeVisibilityResponse = await request(
    "/api/workforce/employees",
    {
      token: adminToken,
      category: "assertions",
      label: "Assert created employee visible",
    },
  );

  pushResult({
    category: "assertions",
    label: "Lead visibility match count",
    method: "ASSERT",
    pathName: "/api/leads",
    ok:
      collectMatches(
        leadVisibilityResponse.payload.data.items,
        (item) =>
          `${item.firstName} ${item.lastName}`.includes(stamp) ||
          `${item.notes || ""}`.includes(stamp),
      ) >= 3,
    status: "ASSERT",
    durationMs: 0,
    note: `matched ${collectMatches(
      leadVisibilityResponse.payload.data.items,
      (item) =>
        `${item.firstName} ${item.lastName}`.includes(stamp) ||
        `${item.notes || ""}`.includes(stamp),
    )} smoke leads`,
    summary: "created leads should be searchable",
  });

  pushResult({
    category: "assertions",
    label: "Project visibility assertion",
    method: "ASSERT",
    pathName: "/api/properties/summary",
    ok:
      propertyVisibilityResponse.payload.data.projects.some(
        (project) => project.id === createdArtifacts.projectId,
      ),
    status: "ASSERT",
    durationMs: 0,
    note: createdArtifacts.projectId,
    summary: "created project should appear in property summary",
  });

  pushResult({
    category: "assertions",
    label: "Vendor visibility assertion",
    method: "ASSERT",
    pathName: "/api/procurement/vendors",
    ok:
      vendorVisibilityResponse.payload.data.vendors.some(
        (vendor) => vendor.id === createdArtifacts.vendorId,
      ),
    status: "ASSERT",
    durationMs: 0,
    note: createdArtifacts.vendorId,
    summary: "created vendor should appear in vendor register",
  });

  pushResult({
    category: "assertions",
    label: "Material visibility assertion",
    method: "ASSERT",
    pathName: "/api/materials",
    ok:
      materialVisibilityResponse.payload.data.materials.some(
        (material) => material.id === createdArtifacts.materialId,
      ),
    status: "ASSERT",
    durationMs: 0,
    note: createdArtifacts.materialId,
    summary: "created material should appear in material register",
  });

  pushResult({
    category: "assertions",
    label: "Employee visibility assertion",
    method: "ASSERT",
    pathName: "/api/workforce/employees",
    ok:
      employeeVisibilityResponse.payload.data.employees.some(
        (employee) => employee.id === createdArtifacts.employeeId,
      ),
    status: "ASSERT",
    durationMs: 0,
    note: createdArtifacts.employeeId,
    summary: "created employee should appear in employee register",
  });

  const report = {
    runAt,
    baseUrl: BASE_URL,
    missingRouteGroups,
    createdArtifacts,
    authUsers,
    results,
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    REPORT_PATH,
    buildMarkdown({
      missingRouteGroups,
      createdArtifacts,
    }),
  );

  const failed = results.filter((entry) => !entry.ok).length;
  console.log(
    JSON.stringify(
      {
        reportPath: REPORT_PATH,
        resultsPath: RESULTS_PATH,
        totalChecks: results.length,
        failedChecks: failed,
        createdArtifacts,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
