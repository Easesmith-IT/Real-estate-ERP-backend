const { randomUUID } = require("crypto");
const mongoose = require("mongoose");

const ErpState = require("../models/erpState.model");
const { erpCollectionConfigs } = require("../models/erp/registry");
const logger = require("../utils/logger");
const { createHttpError } = require("../utils/http");
const { getPagination } = require("../utils/query");

const stageOrder = [
  "New",
  "Contacted",
  "Interested",
  "Site Visit Scheduled",
  "Negotiation",
  "Booking",
  "Closed Won",
  "Closed Lost",
];

const paymentPlanTypes = ["Construction Linked", "EMI", "Down Payment"];

const rolePermissions = {
  admin: ["*"],
  manager: [
    "auth.read",
    "users.read",
    "leads.read",
    "leads.write",
    "site-visits.manage",
    "properties.read",
    "customers.read",
    "customers.write",
    "bookings.read",
    "bookings.write",
    "payments.read",
    "reports.read",
    "settings.read",
    "approvals.read",
    "approvals.write",
    "documents.read",
    "documents.write",
    "compliance.read",
    "settings.write",
    "projects.read",
    "projects.write",
    "procurement.read",
    "procurement.write",
    "materials.read",
    "materials.write",
    "workforce.read",
    "workforce.write",
  ],
  accountant: [
    "auth.read",
    "users.read",
    "customers.read",
    "bookings.read",
    "payments.read",
    "payments.write",
    "reports.read",
    "approvals.read",
    "documents.read",
    "projects.read",
    "procurement.read",
    "materials.read",
    "workforce.read",
  ],
  sales: [
    "auth.read",
    "users.read",
    "leads.read",
    "leads.write",
    "site-visits.manage",
    "properties.read",
    "bookings.read",
    "bookings.write",
    "customers.read",
    "customers.write",
    "documents.read",
    "projects.read",
    "procurement.read",
    "materials.read",
    "workforce.read",
  ],
};

const demoUsers = [
  {
    id: "user-admin",
    name: "Aditi Mehra",
    email: "aditi.mehra@nimbuserp.local",
    role: "admin",
    designation: "ERP Administrator",
  },
  {
    id: "user-manager",
    name: "Rohan Malhotra",
    email: "rohan.malhotra@nimbuserp.local",
    role: "manager",
    designation: "Sales Manager",
  },
  {
    id: "user-accountant",
    name: "Neha Suri",
    email: "neha.suri@nimbuserp.local",
    role: "accountant",
    designation: "Finance Controller",
  },
  {
    id: "user-sales",
    name: "Aman Singh",
    email: "aman.singh@nimbuserp.local",
    role: "sales",
    designation: "Sales Executive",
  },
  {
    id: "user-sales-2",
    name: "Sneha Verma",
    email: "sneha.verma@nimbuserp.local",
    role: "sales",
    designation: "Senior Sales Executive",
  },
];

const salesUsers = demoUsers.filter(
  (user) => user.role === "sales" || user.role === "manager",
);

const brokers = [
  {
    id: "broker-1",
    name: "UrbanKey Partners",
    companyName: "UrbanKey Realty Advisors",
    phone: "+91 98765 43210",
    email: "contact@urbankey.in",
    licenseNumber: "PRM/UP/RERA/2024/001",
    commissionRate: 1.8,
    activeDeals: 4,
    preferredProjects: ["project-aurora", "project-skyline"],
    status: "Top Performer",
    notes: "Elite channel partner specializing in premium residential inventory.",
    tags: ["Elite", "High-Volume", "Residential"],
    createdAt: "2025-01-10T10:00:00.000Z",
  },
  {
    id: "broker-2",
    name: "PrimeSquare Advisory",
    companyName: "PrimeSquare Associates",
    phone: "+91 98765 43211",
    email: "deals@primesquare.in",
    licenseNumber: "PRM/UP/RERA/2024/002",
    commissionRate: 1.5,
    activeDeals: 2,
    preferredProjects: ["project-skyline"],
    status: "Active",
    notes: "Consistent performer with high site visit conversion rates.",
    tags: ["Active", "Commercial", "Noida Extension"],
    createdAt: "2025-03-12T11:30:00.000Z",
  },
  {
    id: "broker-3",
    name: "BlueBrick Channel",
    companyName: "BlueBrick Realty Group",
    phone: "+91 98765 43212",
    email: "info@bluebrick.in",
    licenseNumber: "PRM/UP/RERA/2024/003",
    commissionRate: 2.1,
    activeDeals: 3,
    preferredProjects: ["project-aurora"],
    status: "Top Performer",
    notes: "Leading regional channel partner. Outstanding lead-to-booking efficiency.",
    tags: ["Elite", "Fast-Growth"],
    createdAt: "2025-02-18T14:15:00.000Z",
  },
  {
    id: "broker-4",
    name: "Apex Realty Associates",
    companyName: "Apex Consultants",
    phone: "+91 98765 43213",
    email: "brokerage@apexrealty.in",
    licenseNumber: "PRM/UP/RERA/2024/004",
    commissionRate: 1.2,
    activeDeals: 0,
    preferredProjects: [],
    status: "Inactive",
    notes: "Dormant for past 30 days. Needs re-engagement.",
    tags: ["Inactive", "Budget"],
    createdAt: "2025-04-01T09:00:00.000Z",
  },
  {
    id: "broker-5",
    name: "SkyHigh Ventures",
    companyName: "SkyHigh Partners",
    phone: "+91 98765 43214",
    email: "partner@skyhigh.in",
    licenseNumber: "PRM/UP/RERA/2024/005",
    commissionRate: 2.0,
    activeDeals: 0,
    preferredProjects: ["project-aurora"],
    status: "New Partner",
    notes: "Recently onboarded. Assigned to project Aurora Heights.",
    tags: ["New", "Premium"],
    createdAt: "2026-06-01T15:00:00.000Z",
  }
];

const buildUnit = (suffix, overrides = {}) => ({
  id: `unit-${suffix}`,
  code: suffix.toUpperCase(),
  configuration: overrides.configuration || "3BHK",
  floorLabel: overrides.floorLabel || "12",
  areaSqFt: overrides.areaSqFt || 1640,
  facing: overrides.facing || "East",
  view: overrides.view || "Podium Garden",
  finalPrice: overrides.finalPrice || 14200000,
  status: overrides.status || "available",
  towerName: overrides.towerName || "Tower A",
  projectId: overrides.projectId,
});

const projectCatalog = [
  {
    id: "project-aurora",
    name: "Sunrise Residency",
    code: "AUR",
    location: "Noida Extension",
    managerId: "user-manager",
    stage: "Sales Launch",
    towers: [
      {
        id: "tower-aurora-a",
        name: "Tower A",
        floors: [
          {
            label: "09",
            units: [
              buildUnit("aur-a-901", {
                floorLabel: "09",
                finalPrice: 12400000,
                configuration: "2BHK",
                areaSqFt: 1280,
                projectId: "project-aurora",
              }),
              buildUnit("aur-a-902", {
                floorLabel: "09",
                finalPrice: 13100000,
                configuration: "2BHK + Study",
                areaSqFt: 1390,
                projectId: "project-aurora",
              }),
            ],
          },
          {
            label: "12",
            units: [
              buildUnit("aur-a-1201", {
                floorLabel: "12",
                finalPrice: 14800000,
                configuration: "3BHK",
                areaSqFt: 1640,
                projectId: "project-aurora",
              }),
              buildUnit("aur-a-1202", {
                floorLabel: "12",
                finalPrice: 15300000,
                configuration: "3BHK + Utility",
                areaSqFt: 1710,
                projectId: "project-aurora",
                view: "Club View",
              }),
            ],
          },
        ],
      },
      {
        id: "tower-aurora-b",
        name: "Tower B",
        floors: [
          {
            label: "08",
            units: [
              buildUnit("aur-b-801", {
                towerName: "Tower B",
                floorLabel: "08",
                finalPrice: 13800000,
                configuration: "3BHK",
                projectId: "project-aurora",
              }),
              buildUnit("aur-b-802", {
                towerName: "Tower B",
                floorLabel: "08",
                finalPrice: 14600000,
                configuration: "3BHK",
                projectId: "project-aurora",
                view: "Central Greens",
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "project-skyline",
    name: "Skyline Business Park",
    code: "SKY",
    location: "Gurugram Sector 79",
    managerId: "user-manager",
    stage: "Possession Linked Sales",
    towers: [
      {
        id: "tower-skyline-a",
        name: "Tower C",
        floors: [
          {
            label: "07",
            units: [
              buildUnit("sky-c-701", {
                towerName: "Tower C",
                floorLabel: "07",
                finalPrice: 17800000,
                configuration: "3BHK",
                areaSqFt: 1840,
                projectId: "project-skyline",
                facing: "North East",
              }),
              buildUnit("sky-c-702", {
                towerName: "Tower C",
                floorLabel: "07",
                finalPrice: 19100000,
                configuration: "4BHK",
                areaSqFt: 2140,
                projectId: "project-skyline",
                view: "Sky Deck",
              }),
            ],
          },
          {
            label: "10",
            units: [
              buildUnit("sky-c-1001", {
                towerName: "Tower C",
                floorLabel: "10",
                finalPrice: 19600000,
                configuration: "4BHK",
                areaSqFt: 2190,
                projectId: "project-skyline",
              }),
              buildUnit("sky-c-1002", {
                towerName: "Tower C",
                floorLabel: "10",
                finalPrice: 18800000,
                configuration: "3BHK + Lounge",
                areaSqFt: 1990,
                projectId: "project-skyline",
                view: "Aravalli Edge",
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "project-riverfront",
    name: "Riverfront Enclave",
    code: "RIV",
    location: "Yamuna Expressway",
    managerId: "user-sales-2",
    stage: "Inventory Release",
    towers: [
      {
        id: "tower-riverfront-a",
        name: "Tower D",
        floors: [
          {
            label: "05",
            units: [
              buildUnit("riv-d-501", {
                towerName: "Tower D",
                floorLabel: "05",
                finalPrice: 11200000,
                configuration: "2BHK",
                areaSqFt: 1215,
                projectId: "project-riverfront",
              }),
              buildUnit("riv-d-502", {
                towerName: "Tower D",
                floorLabel: "05",
                finalPrice: 11900000,
                configuration: "2BHK + Study",
                areaSqFt: 1290,
                projectId: "project-riverfront",
                view: "River Edge",
              }),
            ],
          },
          {
            label: "11",
            units: [
              buildUnit("riv-d-1101", {
                towerName: "Tower D",
                floorLabel: "11",
                finalPrice: 14200000,
                configuration: "3BHK",
                areaSqFt: 1560,
                projectId: "project-riverfront",
              }),
              buildUnit("riv-d-1102", {
                towerName: "Tower D",
                floorLabel: "11",
                finalPrice: 14900000,
                configuration: "3BHK + Deck",
                areaSqFt: 1625,
                projectId: "project-riverfront",
              }),
            ],
          },
        ],
      },
    ],
  },
];

const leadSeed = [
  {
    id: "lead-1001",
    firstName: "Neha",
    lastName: "Kapoor",
    phone: "+91 9876543210",
    email: "neha.kapoor@email.com",
    source: "Website",
    assignedTo: "user-sales",
    brokerId: "broker-1",
    preferredProjectId: "project-aurora",
    preferredConfiguration: "3BHK",
    budgetMin: 13000000,
    budgetMax: 15500000,
    stage: "Negotiation",
    followUpAt: "2026-06-12T11:30:00.000Z",
    notes: "Interested in east-facing units with club view.",
    createdAt: "2026-06-03T08:30:00.000Z",
    updatedAt: "2026-06-10T15:10:00.000Z",
  },
  {
    id: "lead-1002",
    firstName: "Amit",
    lastName: "Verma",
    phone: "+91 9988776655",
    email: "amit.verma@email.com",
    source: "Google Ads",
    assignedTo: "user-sales-2",
    brokerId: "broker-2",
    preferredProjectId: "project-skyline",
    preferredConfiguration: "4BHK",
    budgetMin: 18000000,
    budgetMax: 21000000,
    stage: "Site Visit Scheduled",
    followUpAt: "2026-06-13T09:00:00.000Z",
    notes: "Comparing premium inventory with Aravalli-facing units.",
    createdAt: "2026-06-05T10:15:00.000Z",
    updatedAt: "2026-06-10T14:00:00.000Z",
  },
  {
    id: "lead-1003",
    firstName: "Priya",
    lastName: "Mehta",
    phone: "+91 9811122233",
    email: "priya.mehta@email.com",
    source: "Referral",
    assignedTo: "user-sales",
    preferredProjectId: "project-riverfront",
    preferredConfiguration: "2BHK",
    budgetMin: 10800000,
    budgetMax: 12400000,
    stage: "Interested",
    followUpAt: "2026-06-14T12:15:00.000Z",
    notes: "Needs loan assistance summary before token payment.",
    createdAt: "2026-06-06T13:00:00.000Z",
    updatedAt: "2026-06-10T12:20:00.000Z",
  },
  {
    id: "lead-1004",
    firstName: "Rajesh",
    lastName: "Sharma",
    phone: "+91 9899001100",
    email: "rajesh.sharma@email.com",
    source: "Walk-in",
    assignedTo: "user-manager",
    preferredProjectId: "project-aurora",
    preferredConfiguration: "2BHK + Study",
    budgetMin: 12000000,
    budgetMax: 13500000,
    stage: "Contacted",
    followUpAt: "2026-06-15T10:00:00.000Z",
    notes: "Needs possession timeline comparison.",
    createdAt: "2026-06-07T09:00:00.000Z",
    updatedAt: "2026-06-09T17:45:00.000Z",
  },
  {
    id: "lead-1005",
    firstName: "Sneha",
    lastName: "Gupta",
    phone: "+91 9777712345",
    email: "sneha.gupta@email.com",
    source: "Broker Referral",
    assignedTo: "user-sales-2",
    brokerId: "broker-3",
    preferredProjectId: "project-skyline",
    preferredConfiguration: "3BHK + Lounge",
    budgetMin: 17500000,
    budgetMax: 19500000,
    stage: "New",
    followUpAt: "2026-06-12T16:45:00.000Z",
    notes: "First response pending after weekend inquiry.",
    createdAt: "2026-06-10T07:45:00.000Z",
    updatedAt: "2026-06-10T07:45:00.000Z",
  },
  {
    id: "lead-1006",
    firstName: "Aditya",
    lastName: "Singh",
    phone: "+91 9555551133",
    email: "aditya.singh@email.com",
    source: "WhatsApp",
    assignedTo: "user-sales",
    preferredProjectId: "project-riverfront",
    preferredConfiguration: "3BHK",
    budgetMin: 13800000,
    budgetMax: 15100000,
    stage: "Closed Won",
    followUpAt: "2026-06-08T08:00:00.000Z",
    notes: "Converted after site walk-through and bank pre-approval.",
    createdAt: "2025-05-28T11:20:00.000Z",
    updatedAt: "2026-06-04T12:10:00.000Z",
  },
];

const customerSeed = [
  {
    id: "customer-1",
    name: "Aditya Singh",
    phone: "+91 9555551133",
    email: "aditya.singh@email.com",
    sourceLeadId: "lead-1006",
    createdAt: "2026-06-04T12:10:00.000Z",
  },
  {
    id: "customer-2",
    name: "Neha Kapoor",
    phone: "+91 9876543210",
    email: "neha.kapoor@email.com",
    sourceLeadId: "lead-1001",
    createdAt: "2026-06-02T16:15:00.000Z",
  },
];

const siteVisitSeed = [
  {
    id: "visit-1001",
    leadId: "lead-1002",
    projectId: "project-skyline",
    scheduledAt: "2026-06-13T09:00:00.000Z",
    coordinatorId: "user-sales-2",
    status: "Scheduled",
    outcome: "Luxury inventory tour pending",
    createdAt: "2026-06-10T09:15:00.000Z",
  },
  {
    id: "visit-1002",
    leadId: "lead-1001",
    projectId: "project-aurora",
    scheduledAt: "2026-06-11T12:00:00.000Z",
    coordinatorId: "user-sales",
    status: "Completed",
    outcome: "Shortlisted Tower A high floor units",
    createdAt: "2026-06-09T14:20:00.000Z",
  },
];

const bookingSeed = [
  {
    id: "booking-1001",
    leadId: "lead-1006",
    customerId: "customer-1",
    projectId: "project-riverfront",
    unitId: "unit-riv-d-1101",
    paymentPlanType: "Construction Linked",
    totalAmount: 14200000,
    status: "Active",
    agreementStatus: "Draft Agreement",
    bookingDate: "2026-06-04T12:10:00.000Z",
    createdBy: "user-sales",
  },
  {
    id: "booking-1002",
    leadId: "lead-1001",
    customerId: "customer-2",
    projectId: "project-aurora",
    unitId: "unit-aur-a-1202",
    paymentPlanType: "EMI",
    totalAmount: 15300000,
    status: "Active",
    agreementStatus: "KYC Pending",
    bookingDate: "2026-06-02T16:15:00.000Z",
    createdBy: "user-manager",
  },
];

const receiptSeed = [
  {
    id: "receipt-1001",
    bookingId: "booking-1001",
    amount: 2840000,
    mode: "RTGS",
    reference: "UTR20260604A1",
    receivedAt: "2026-06-04T13:40:00.000Z",
    collectedBy: "user-accountant",
  },
  {
    id: "receipt-1002",
    bookingId: "booking-1002",
    amount: 3060000,
    mode: "Cheque",
    reference: "CHQ1120",
    receivedAt: "2026-06-03T11:10:00.000Z",
    collectedBy: "user-accountant",
  },
  {
    id: "receipt-1003",
    bookingId: "booking-1002",
    amount: 1530000,
    mode: "NEFT",
    reference: "NEFT9020",
    receivedAt: "2026-06-09T10:25:00.000Z",
    collectedBy: "user-accountant",
  },
];

const workflowSettings = [
  {
    id: "wf-sales",
    name: "Lead qualification SLA",
    code: "LEAD_SLA",
    defaultValue: "24h",
    status: "Active",
  },
  {
    id: "wf-booking",
    name: "Booking approval route",
    code: "BOOKING_APPROVAL",
    defaultValue: "Sales -> Finance -> Admin",
    status: "Active",
  },
  {
    id: "wf-collections",
    name: "Due reminder cadence",
    code: "DUE_REMINDER",
    defaultValue: "D-7, D-1, D+3",
    status: "Active",
  },
  {
    id: "wf-bio-cadence",
    name: "Biometric device sync cadence",
    code: "BIO_SYNC_CADENCE",
    defaultValue: "Every 30 min",
    status: "Active",
  },
  {
    id: "wf-bio-status",
    name: "Biometric gateway status",
    code: "BIO_GATEWAY_STATUS",
    defaultValue: "Demo-connected",
    status: "Active",
  },
  {
    id: "wf-bio-sync",
    name: "Biometric last sync",
    code: "BIO_LAST_SYNC",
    defaultValue: "2026-06-11T09:30:00.000Z",
    status: "Active",
  },
];

const notificationSettings = [
  {
    id: "ntf-email",
    name: "Email receipts",
    code: "EMAIL_RECEIPTS",
    defaultValue: "Enabled",
    status: "Active",
  },
  {
    id: "ntf-alerts",
    name: "High-value booking alerts",
    code: "HV_BOOKING",
    defaultValue: "Enabled",
    status: "Active",
  },
  {
    id: "ntf-sla",
    name: "SLA escalation notices",
    code: "SLA_ESCALATION",
    defaultValue: "Enabled",
    status: "Active",
  },
  {
    id: "ntf-whatsapp-status",
    name: "WhatsApp demo channel",
    code: "WHATSAPP_CHANNEL_STATUS",
    defaultValue: "Demo-connected",
    status: "Active",
  },
  {
    id: "ntf-whatsapp-recipient",
    name: "WhatsApp default recipient",
    code: "WHATSAPP_DEFAULT_RECIPIENT",
    defaultValue: "+91 98111 00011",
    status: "Active",
  },
  {
    id: "ntf-whatsapp-template",
    name: "WhatsApp template pack",
    code: "WHATSAPP_TEMPLATE_PACK",
    defaultValue: "Approvals, reminders, site updates",
    status: "Active",
  },
  {
    id: "ntf-whatsapp-activity",
    name: "WhatsApp last activity",
    code: "WHATSAPP_LAST_ACTIVITY",
    defaultValue: "2026-06-11T08:15:00.000Z",
    status: "Active",
  },
];

const approvalSeed = [
  {
    id: "apr-1001",
    title: "Aurora booking price override",
    module: "Bookings",
    requestType: "Commercial approval",
    priority: "High",
    status: "Pending",
    requestedBy: "user-sales",
    ownerId: "user-manager",
    submittedAt: "2026-06-10T09:45:00.000Z",
    dueAt: "2026-06-12T17:00:00.000Z",
    summary: "Discount exception requested for club-facing unit AUR-A-1202.",
  },
  {
    id: "apr-1002",
    title: "Skyline broker commission release",
    module: "Finance",
    requestType: "Commission approval",
    priority: "Medium",
    status: "Pending",
    requestedBy: "user-accountant",
    ownerId: "user-manager",
    submittedAt: "2026-06-09T12:30:00.000Z",
    dueAt: "2026-06-11T13:00:00.000Z",
    summary:
      "Broker payout pending after receipt clearance on Skyline booking.",
  },
  {
    id: "apr-1003",
    title: "Workflow SLA policy change",
    module: "Settings",
    requestType: "Policy approval",
    priority: "Low",
    status: "Approved",
    requestedBy: "user-admin",
    ownerId: "user-admin",
    submittedAt: "2026-06-07T10:00:00.000Z",
    dueAt: "2026-06-08T18:00:00.000Z",
    summary:
      "Lead qualification SLA moved from 48h to 24h for direct website leads.",
    actedAt: "2026-06-08T15:20:00.000Z",
    actedBy: "user-admin",
  },
];

const documentSeed = [
  {
    id: "doc-1001",
    title: "Aurora booking form - Priya Sharma",
    category: "Agreement",
    module: "Bookings",
    projectId: "project-aurora",
    relatedEntityId: "booking-1002",
    version: "v2",
    status: "Pending Review",
    ownerId: "user-manager",
    uploadedBy: "user-sales",
    uploadedAt: "2026-06-10T11:10:00.000Z",
    expiryDate: null,
  },
  {
    id: "doc-1002",
    title: "Skyline fire NOC 2026",
    category: "Compliance",
    module: "Compliance",
    projectId: "project-skyline",
    relatedEntityId: "cmp-1002",
    version: "v1",
    status: "Approved",
    ownerId: "user-admin",
    uploadedBy: "user-admin",
    uploadedAt: "2026-05-18T09:00:00.000Z",
    expiryDate: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "doc-1003",
    title: "Riverfront demand letter batch 02",
    category: "Demand Letter",
    module: "Collections",
    projectId: "project-riverfront",
    relatedEntityId: "booking-1001",
    version: "v1",
    status: "Generated",
    ownerId: "user-accountant",
    uploadedBy: "user-accountant",
    uploadedAt: "2026-06-09T16:30:00.000Z",
    expiryDate: null,
  },
];

const complianceSeed = [
  {
    id: "cmp-1001",
    projectId: "project-aurora",
    approvalType: "RERA Renewal",
    authority: "UP RERA",
    status: "In Review",
    expiryDate: "2026-08-15T00:00:00.000Z",
    ownerId: "user-admin",
    documentId: null,
    notes: "Awaiting revised annexure upload before renewal confirmation.",
  },
  {
    id: "cmp-1002",
    projectId: "project-skyline",
    approvalType: "Fire NOC",
    authority: "Municipal Fire Department",
    status: "Expiring Soon",
    expiryDate: "2026-07-01T00:00:00.000Z",
    ownerId: "user-admin",
    documentId: "doc-1002",
    notes: "Renewal filing window open. Follow up with facility consultant.",
  },
  {
    id: "cmp-1003",
    projectId: "project-riverfront",
    approvalType: "Environmental Clearance",
    authority: "State Environment Board",
    status: "Compliant",
    expiryDate: "2026-12-31T00:00:00.000Z",
    ownerId: "user-manager",
    documentId: null,
    notes: "No action pending this quarter.",
  },
];

const budgetSeed = [
  { id: "budget-1001", projectId: "project-aurora", category: "Construction Materials", plannedAmount: 25000000, spentAmount: 18700000, fiscalYear: "2026-27" },
  { id: "budget-1002", projectId: "project-aurora", category: "Labour", plannedAmount: 8500000, spentAmount: 6200000, fiscalYear: "2026-27" },
  { id: "budget-1003", projectId: "project-skyline", category: "Construction Materials", plannedAmount: 32000000, spentAmount: 19800000, fiscalYear: "2026-27" },
  { id: "budget-1004", projectId: "project-skyline", category: "Equipment", plannedAmount: 12000000, spentAmount: 4500000, fiscalYear: "2026-27" },
  { id: "budget-1005", projectId: "project-riverfront", category: "Construction Materials", plannedAmount: 18000000, spentAmount: 8900000, fiscalYear: "2026-27" },
  { id: "budget-1006", projectId: "project-riverfront", category: "Labour", plannedAmount: 6000000, spentAmount: 3100000, fiscalYear: "2026-27" },
];

const vendorPaymentSeed = [
  { id: "vp-1001", vendorId: "vendor-1001", poId: "po-1001", amount: 382500, paidDate: "2026-06-11T16:30:00.000Z", mode: "NEFT", reference: "NEFT-20260611-001", status: "Paid" },
];

const vendorSeed = [
  {
    id: "vendor-1001",
    name: "Shree Cement Suppliers",
    category: "Cement",
    city: "Noida",
    gstin: "09AABCS1234P1ZV",
    averageLeadTimeDays: 2,
    reliabilityScore: 92,
    status: "Active",
    lastOrderDate: "2026-06-08T09:00:00.000Z",
  },
  {
    id: "vendor-1002",
    name: "Apex Steel Traders",
    category: "Steel",
    city: "Faridabad",
    gstin: "06AACCM5678J1ZT",
    averageLeadTimeDays: 4,
    reliabilityScore: 88,
    status: "Active",
    lastOrderDate: "2026-06-05T11:00:00.000Z",
  },
  {
    id: "vendor-1003",
    name: "Metro Electricals",
    category: "Electrical",
    city: "Gurugram",
    gstin: "06AAACB9988N1ZA",
    averageLeadTimeDays: 3,
    reliabilityScore: 84,
    status: "On Watch",
    lastOrderDate: "2026-05-29T10:00:00.000Z",
  },
];

const purchaseRequestSeed = [
  {
    id: "pr-1001",
    title: "Tower A slab concrete material batch",
    projectId: "project-aurora",
    department: "Projects",
    requestedBy: "user-manager",
    materialCategory: "Cement",
    quantity: 450,
    unit: "bags",
    status: "Pending Approval",
    priority: "High",
    requiredBy: "2026-06-15T00:00:00.000Z",
    createdAt: "2026-06-11T08:30:00.000Z",
  },
  {
    id: "pr-1002",
    title: "Skyline finishing electrical fixtures",
    projectId: "project-skyline",
    department: "Projects",
    requestedBy: "user-sales-2",
    materialCategory: "Electrical",
    quantity: 120,
    unit: "sets",
    status: "RFQ Open",
    priority: "Medium",
    requiredBy: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-10T10:00:00.000Z",
  },
];

const quotationSeed = [
  {
    id: "qt-1001",
    requestId: "pr-1001",
    vendorId: "vendor-1001",
    totalAmount: 382500,
    deliveryDays: 2,
    paymentTerms: "15 days credit",
    qualityScore: 93,
    status: "Recommended",
    submittedAt: "2026-06-11T12:00:00.000Z",
  },
  {
    id: "qt-1002",
    requestId: "pr-1001",
    vendorId: "vendor-1002",
    totalAmount: 401000,
    deliveryDays: 4,
    paymentTerms: "Advance 20%",
    qualityScore: 89,
    status: "Received",
    submittedAt: "2026-06-11T12:30:00.000Z",
  },
  {
    id: "qt-1003",
    requestId: "pr-1002",
    vendorId: "vendor-1003",
    totalAmount: 246000,
    deliveryDays: 3,
    paymentTerms: "30 days credit",
    qualityScore: 86,
    status: "Received",
    submittedAt: "2026-06-10T17:15:00.000Z",
  },
];

const purchaseOrderSeed = [
  {
    id: "po-1001",
    requestId: "pr-1001",
    vendorId: "vendor-1001",
    projectId: "project-aurora",
    amount: 382500,
    status: "Released",
    expectedDelivery: "2026-06-14T00:00:00.000Z",
    createdAt: "2026-06-11T16:00:00.000Z",
  },
];

const normalizeStringArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
};

const buildWarehouseCode = (name, fallbackId = "warehouse") => {
  const source = String(name || fallbackId || "warehouse")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return source.slice(0, 16) || "WAREHOUSE";
};

const inferWarehouseRegion = (location = "") => {
  const value = String(location || "").toLowerCase();
  if (!value) return "North";
  if (value.includes("mumbai") || value.includes("pune") || value.includes("surat")) return "West";
  if (value.includes("bengaluru") || value.includes("hyderabad") || value.includes("chennai")) return "South";
  if (value.includes("kolkata") || value.includes("bhubaneswar") || value.includes("yamuna")) return "East";
  return "North";
};

const normalizeWarehouseCoordinates = (coordinates, index = 0) => {
  if (coordinates && typeof coordinates === "object") {
    return {
      lat: String(coordinates.lat || ""),
      lng: String(coordinates.lng || ""),
    };
  }

  return {
    lat: `28.${String(120 + index).padStart(3, "0")}`,
    lng: `77.${String(180 + index).padStart(3, "0")}`,
  };
};

const normalizeWarehouseRecord = (warehouse = {}, index = 0) => {
  const normalizedName = warehouse.name || `Warehouse ${index + 1}`;
  const capacity = Number(warehouse.capacity) || 1200 + (index % 6) * 180;
  const capacityUtilization = Number(warehouse.capacityUtilization) || 0;
  const operatingHours = warehouse.operatingHours || "08:00 - 18:00";
  const storageTypes = normalizeStringArray(
    warehouse.storageTypes,
    index % 3 === 0 ? ["Bulk", "Racked", "Outdoor"] : ["Racked", "Palletized"],
  );
  const materialCategories = normalizeStringArray(warehouse.materialCategories, []);
  const assignedProjects = normalizeStringArray(warehouse.assignedProjects, []);

  return {
    ...warehouse,
    code: warehouse.code || buildWarehouseCode(normalizedName, warehouse.id),
    location: warehouse.location || "Unknown location",
    region: warehouse.region || inferWarehouseRegion(warehouse.location),
    coordinates: normalizeWarehouseCoordinates(warehouse.coordinates, index),
    capacity,
    capacityUtilization,
    storageTypes,
    operatingHours,
    supervisor: warehouse.supervisor || "Warehouse Operations Desk",
    assignedProjects,
    materialCategories,
    status: warehouse.status || "Operational",
    notes: warehouse.notes || "",
    createdAt: warehouse.createdAt || new Date(Date.UTC(2026, 5, 1 + (index % 12), 9, 0, 0)).toISOString(),
    updatedAt: warehouse.updatedAt || warehouse.createdAt || new Date(Date.UTC(2026, 5, 10 + (index % 10), 11, 0, 0)).toISOString(),
    name: normalizedName,
  };
};

const warehouseSeed = [
  {
    id: "wh-1001",
    name: "Central Warehouse",
    code: "CWH-NOI",
    location: "Noida",
    region: "North",
    coordinates: { lat: "28.5355", lng: "77.3910" },
    capacity: 2400,
    capacityUtilization: 78,
    storageTypes: ["Bulk", "Racked", "Palletized"],
    operatingHours: "06:00 - 22:00",
    supervisor: "Arjun Mehta",
    assignedProjects: ["project-aurora", "project-skyline"],
    materialCategories: ["Cement", "Steel", "Electrical"],
    status: "Operational",
    notes: "Primary consolidation warehouse serving flagship developments.",
  },
  {
    id: "wh-1002",
    name: "Skyline Site Store",
    code: "SKY-GGN",
    location: "Gurugram",
    region: "North",
    coordinates: { lat: "28.4595", lng: "77.0266" },
    capacity: 1480,
    capacityUtilization: 64,
    storageTypes: ["Racked", "Secured", "Fast-Moving"],
    operatingHours: "07:00 - 19:00",
    supervisor: "Neha Suri",
    assignedProjects: ["project-skyline"],
    materialCategories: ["Electrical", "Finishing", "Steel"],
    status: "Operational",
    notes: "High-turnover site store aligned to tower finishing packages.",
  },
  {
    id: "wh-1003",
    name: "Riverfront Yard",
    code: "RFY-YEX",
    location: "Yamuna Expressway",
    region: "East",
    coordinates: { lat: "28.4089", lng: "77.5040" },
    capacity: 1720,
    capacityUtilization: 58,
    storageTypes: ["Outdoor", "Bulk", "Covered"],
    operatingHours: "08:00 - 20:00",
    supervisor: "Rohit Bansal",
    assignedProjects: ["project-riverfront"],
    materialCategories: ["Finishing", "Cement", "Plumbing"],
    status: "Operational",
    notes: "Open yard storage for bulk materials and riverfront fit-out supplies.",
  },
].map((warehouse, index) => normalizeWarehouseRecord(warehouse, index));

const materialSeed = [
  {
    id: "mat-1001",
    sku: "CEM-OPC-53",
    name: "OPC Cement 53 Grade",
    category: "Cement",
    warehouseId: "wh-1001",
    projectId: "project-aurora",
    onHand: 520,
    reorderLevel: 300,
    unit: "bags",
    averageConsumption: 95,
    status: "Healthy",
  },
  {
    id: "mat-1002",
    sku: "STL-TMT-16",
    name: "TMT Steel 16mm",
    category: "Steel",
    warehouseId: "wh-1001",
    projectId: "project-skyline",
    onHand: 96,
    reorderLevel: 120,
    unit: "tons",
    averageConsumption: 18,
    status: "Low Stock",
  },
  {
    id: "mat-1003",
    sku: "ELC-LGT-SET",
    name: "Electrical Fixture Set",
    category: "Electrical",
    warehouseId: "wh-1002",
    projectId: "project-skyline",
    onHand: 140,
    reorderLevel: 90,
    unit: "sets",
    averageConsumption: 24,
    status: "Healthy",
  },
  {
    id: "mat-1004",
    sku: "PNT-WPR-INT",
    name: "Interior Waterproof Primer",
    category: "Finishing",
    warehouseId: "wh-1003",
    projectId: "project-riverfront",
    onHand: 42,
    reorderLevel: 60,
    unit: "drums",
    averageConsumption: 10,
    status: "Low Stock",
  },
];

const transferSeed = [
  {
    id: "tr-1001",
    materialId: "mat-1002",
    fromWarehouseId: "wh-1001",
    toWarehouseId: "wh-1002",
    quantity: 12,
    unit: "tons",
    status: "Completed",
    requestedBy: "user-manager",
    createdAt: "2026-06-10T09:00:00.000Z",
  },
  {
    id: "tr-1002",
    materialId: "mat-1001",
    fromWarehouseId: "wh-1001",
    toWarehouseId: "wh-1003",
    quantity: 80,
    unit: "bags",
    status: "In Transit",
    requestedBy: "user-manager",
    createdAt: "2026-06-11T07:45:00.000Z",
  },
];

const consumptionSeed = [
  {
    id: "con-1001",
    materialId: "mat-1001",
    projectId: "project-aurora",
    quantity: 110,
    unit: "bags",
    consumedOn: "2026-06-10T00:00:00.000Z",
    recordedBy: "user-manager",
    purpose: "Tower A slab pour",
  },
  {
    id: "con-1002",
    materialId: "mat-1002",
    projectId: "project-skyline",
    quantity: 8,
    unit: "tons",
    consumedOn: "2026-06-09T00:00:00.000Z",
    recordedBy: "user-sales-2",
    purpose: "Core wall reinforcement",
  },
];

const projectTaskSeed = [
  {
    id: "tsk-1001",
    projectId: "project-aurora",
    title: "Tower A slab reinforcement closure",
    ownerId: "user-manager",
    discipline: "Structure",
    priority: "High",
    status: "In Progress",
    dueDate: "2026-06-14T00:00:00.000Z",
    completion: 72,
  },
  {
    id: "tsk-1002",
    projectId: "project-skyline",
    title: "Electrical finishing sample approval",
    ownerId: "user-sales-2",
    discipline: "MEP",
    priority: "Medium",
    status: "Review",
    dueDate: "2026-06-16T00:00:00.000Z",
    completion: 86,
  },
  {
    id: "tsk-1003",
    projectId: "project-riverfront",
    title: "Landscape paving tender release",
    ownerId: "user-admin",
    discipline: "External Development",
    priority: "Low",
    status: "Planned",
    dueDate: "2026-06-21T00:00:00.000Z",
    completion: 18,
  },
];

const dailyReportSeed = [
  {
    id: "dpr-1001",
    projectId: "project-aurora",
    submittedBy: "user-manager",
    reportDate: "2026-06-13T00:00:00.000Z",
    laborCount: 138,
    materialUsage: "Cement: 110 bags, Steel: 3.2 tons",
    blockers: "No critical blockers. Crane maintenance window scheduled tomorrow.",
    progressSummary: "Structure progress closed 72% of weekly target.",
    shift: "Day",
    siteEngineer: "Vikram Rathore",
    progressPercent: 78,
    weather: "Sunny",
    blockersLevel: "None",
    siteHealth: 94,
    remarks: "Slab concrete pour on Tower A successfully completed. Cube testing samples collected.",
    materials: { cement: 110, steel: 3.2, sand: 15, aggregates: 25 },
    laborDetails: { skilled: 75, unskilled: 55, supervisors: 8 },
    photos: ["/images/site1.jpg", "/images/site2.jpg"]
  },
  {
    id: "dpr-1002",
    projectId: "project-skyline",
    submittedBy: "user-sales-2",
    reportDate: "2026-06-12T00:00:00.000Z",
    laborCount: 84,
    materialUsage: "Electrical wires: 4 coils, PVC conduit: 80m",
    blockers: "Sample sign-off pending from design consultant for level 8 fixtures.",
    progressSummary: "Electrical fixture mock-up installed on level 7.",
    shift: "Day",
    siteEngineer: "Anjali Mehta",
    progressPercent: 65,
    weather: "Cloudy",
    blockersLevel: "Medium",
    siteHealth: 82,
    remarks: "Mock-up installation approved by internal QA. Waiting for final consultant walkthrough.",
    materials: { cement: 0, steel: 0, sand: 0, aggregates: 0 },
    laborDetails: { skilled: 45, unskilled: 35, supervisors: 4 },
    photos: ["/images/site3.jpg"]
  },
];

const resourceAllocationSeed = [
  {
    id: "res-1001",
    projectId: "project-aurora",
    resourceName: "Tower Crane 1",
    type: "Machinery",
    subType: "Tower Crane",
    assignedTo: "Tower A",
    utilization: 84,
    status: "Assigned",
    health: 91,
    dailyCost: 1200,
    monthlyCost: 36000,
  },
  {
    id: "res-1002",
    projectId: "project-skyline",
    resourceName: "Electrical Team Alpha",
    type: "Crew",
    subType: "Electricians",
    assignedTo: "Tower C",
    utilization: 76,
    status: "Assigned",
    health: 87,
    dailyCost: 850,
    monthlyCost: 25500,
  },
  {
    id: "res-1003",
    projectId: "project-riverfront",
    resourceName: "Landscape Contractor",
    type: "Contractor",
    subType: "Landscaping",
    assignedTo: "External Works",
    utilization: 48,
    status: "Idle",
    health: 68,
    dailyCost: 1500,
    monthlyCost: 45000,
  },
];

const buildEmployeeProfileFields = (sequence, name, designation, projectName) => {
  const normalizedName = `${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  const joinedAt = (
    sequence % 14 === 0
      ? new Date(Date.UTC(2026, 5, 1 + (sequence % 11), 9, 30, 0))
      : new Date(Date.UTC(2024 + (sequence % 3), (sequence * 3) % 12, 3 + (sequence % 24), 9, 30, 0))
  ).toISOString();
  const updatedAt = new Date(
    Date.UTC(2026, 5, 2 + (sequence % 10), 11, 15 + (sequence % 20), 0),
  ).toISOString();
  const corridor = 10 + (sequence % 18);
  const sector = 40 + (sequence % 20);

  return {
    email: `${normalizedName}@nimbuserp.local`,
    dateJoined: joinedAt,
    emergencyContact: `Primary Contact ${padNumber(sequence, 3)} · +91 98${padNumber(12000000 + sequence, 8)}`,
    address: `${corridor}/${sector}, ${projectName.split(" ")[0]} Residency Corridor, NCR`,
    position: designation,
    createdAt: joinedAt,
    updatedAt,
  };
};

const employeeSeed = [
  {
    id: "emp-1001",
    name: "Karan Bedi",
    email: "karan.bedi@nimbuserp.local",
    department: "Projects",
    designation: "Site Engineer",
    position: "Site Engineer",
    projectId: "project-aurora",
    teamName: "Aurora Core Team",
    phone: "+91 9811100001",
    dateJoined: "2023-02-06T09:30:00.000Z",
    emergencyContact: "Aarav Bedi · +91 9811199001",
    address: "12/A, Aurora Residency Avenue, Noida Extension",
    status: "Active",
    createdAt: "2023-02-06T09:30:00.000Z",
    updatedAt: "2026-06-10T10:15:00.000Z",
  },
  {
    id: "emp-1002",
    name: "Mitali Rao",
    email: "mitali.rao@nimbuserp.local",
    department: "Procurement",
    designation: "Purchase Lead",
    position: "Purchase Lead",
    projectId: "project-skyline",
    teamName: "Supply Chain Desk",
    phone: "+91 9811100002",
    dateJoined: "2024-05-14T09:30:00.000Z",
    emergencyContact: "Shreya Rao · +91 9811199002",
    address: "18/C, Skyline Executive Homes, Gurugram Sector 79",
    status: "Active",
    createdAt: "2024-05-14T09:30:00.000Z",
    updatedAt: "2026-06-11T09:45:00.000Z",
  },
  {
    id: "emp-1003",
    name: "Dev Mehta",
    email: "dev.mehta@nimbuserp.local",
    department: "Finance",
    designation: "Accounts Executive",
    position: "Accounts Executive",
    projectId: "project-riverfront",
    teamName: "Finance Control Cell",
    phone: "+91 9811100003",
    dateJoined: "2025-01-22T09:30:00.000Z",
    emergencyContact: "Riya Mehta · +91 9811199003",
    address: "9/B, Riverfront Staff Quarters, Yamuna Expressway",
    status: "Active",
    createdAt: "2025-01-22T09:30:00.000Z",
    updatedAt: "2026-06-11T11:05:00.000Z",
  },
];

const contractorSeed = [
  {
    id: "ctr-1001",
    name: "RK Construction Group",
    trade: "Civil",
    projectId: "project-aurora",
    workforce: 42,
    status: "Engaged",
  },
  {
    id: "ctr-1002",
    name: "Skyline Contractors",
    trade: "Electrical",
    projectId: "project-skyline",
    workforce: 26,
    status: "Engaged",
  },
  {
    id: "ctr-1003",
    name: "Zenith Civil Works",
    trade: "Landscape",
    projectId: "project-riverfront",
    workforce: 18,
    status: "Mobilizing",
  },
];

const attendanceSeed = [
  {
    id: "att-1001",
    employeeId: "emp-1001",
    projectId: "project-aurora",
    shift: "Day",
    checkIn: "2026-06-11T08:54:00.000Z",
    status: "Present",
  },
  {
    id: "att-1002",
    employeeId: "emp-1002",
    projectId: "project-skyline",
    shift: "Day",
    checkIn: "2026-06-11T09:08:00.000Z",
    status: "Present",
  },
  {
    id: "att-1003",
    employeeId: "emp-1003",
    projectId: "project-riverfront",
    shift: "Day",
    checkIn: "2026-06-11T09:18:00.000Z",
    status: "Late",
  },
];

const padNumber = (value, size = 3) => `${value}`.padStart(size, "0");

const generatedProjectBlueprints = [
  { code: "EMH", name: "Emerald Heights", suffix: "", location: "Greater Noida West", stage: "Execution Planning" },
  { code: "MVT", name: "Metro View Towers", suffix: "", location: "Sohna Road", stage: "Sales Launch" },
  { code: "SPG", name: "Sapphire Greens", suffix: "", location: "Ghaziabad Crossing", stage: "Inventory Release" },
  { code: "GCV", name: "Golden Crest Villas", suffix: "", location: "Dwarka Expressway", stage: "Possession Linked Sales" },
  { code: "USH", name: "Urban Square Commercial Hub", suffix: "", location: "Noida Sector 150", stage: "Execution Planning" },
  { code: "PLR", name: "Palm Residency", suffix: "", location: "Faridabad Sector 88", stage: "Sales Launch" },
  { code: "HBC", name: "Horizon Business Center", suffix: "", location: "Yamuna Expressway", stage: "Inventory Release" },
  { code: "EMH2", name: "Emerald Heights Phase 2", suffix: "", location: "Gurugram Sector 95", stage: "Execution Planning" },
  { code: "GCV2", name: "Golden Crest Villas Phase 2", suffix: "", location: "Raj Nagar Extension", stage: "Sales Launch" },
  { code: "PLR2", name: "Palm Residency Phase 2", suffix: "", location: "Lucknow Outer Ring", stage: "Execution Planning" },
  { code: "MVT2", name: "Metro View Towers Phase 2", suffix: "", location: "Indirapuram", stage: "Possession Linked Sales" },
  { code: "SPG2", name: "Sapphire Greens Phase 2", suffix: "", location: "Jaipur Ajmer Road", stage: "Inventory Release" },
];

const generatedProjectCatalog = generatedProjectBlueprints.map((blueprint, index) => {
  const sequence = index + 1;
  const projectId = `project-seed-${padNumber(sequence, 2)}`;
  const towerLetter = String.fromCharCode(69 + index);
  const basePrice = 10200000 + sequence * 310000;

  return {
    id: projectId,
    name: `${blueprint.name} ${blueprint.suffix}`,
    code: blueprint.code,
    location: blueprint.location,
    managerId: salesUsers[sequence % salesUsers.length].id,
    stage: blueprint.stage,
    towers: [
      {
        id: `tower-${projectId}-a`,
        name: `Tower ${towerLetter}`,
        floors: [
          {
            label: "05",
            units: [
              buildUnit(`${blueprint.code.toLowerCase()}-${towerLetter.toLowerCase()}-501`, {
                towerName: `Tower ${towerLetter}`,
                floorLabel: "05",
                configuration: sequence % 2 === 0 ? "2BHK + Study" : "2BHK",
                areaSqFt: 1210 + sequence * 12,
                finalPrice: basePrice,
                projectId,
              }),
              buildUnit(`${blueprint.code.toLowerCase()}-${towerLetter.toLowerCase()}-502`, {
                towerName: `Tower ${towerLetter}`,
                floorLabel: "05",
                configuration: "3BHK",
                areaSqFt: 1495 + sequence * 8,
                finalPrice: basePrice + 780000,
                projectId,
                view: "Club Court",
              }),
            ],
          },
          {
            label: "11",
            units: [
              buildUnit(`${blueprint.code.toLowerCase()}-${towerLetter.toLowerCase()}-1101`, {
                towerName: `Tower ${towerLetter}`,
                floorLabel: "11",
                configuration: "3BHK + Deck",
                areaSqFt: 1660 + sequence * 10,
                finalPrice: basePrice + 1320000,
                projectId,
                facing: "North East",
              }),
              buildUnit(`${blueprint.code.toLowerCase()}-${towerLetter.toLowerCase()}-1102`, {
                towerName: `Tower ${towerLetter}`,
                floorLabel: "11",
                configuration: sequence % 3 === 0 ? "4BHK" : "3BHK + Utility",
                areaSqFt: 1820 + sequence * 14,
                finalPrice: basePrice + 1960000,
                projectId,
                view: "Sky Deck",
              }),
            ],
          },
        ],
      },
      {
        id: `tower-${projectId}-b`,
        name: `Tower ${String.fromCharCode(towerLetter.charCodeAt(0) + 1)}`,
        floors: [
          {
            label: "08",
            units: [
              buildUnit(`${blueprint.code.toLowerCase()}-${towerLetter.toLowerCase()}-801`, {
                towerName: `Tower ${String.fromCharCode(towerLetter.charCodeAt(0) + 1)}`,
                floorLabel: "08",
                configuration: "3BHK",
                areaSqFt: 1540 + sequence * 9,
                finalPrice: basePrice + 920000,
                projectId,
              }),
              buildUnit(`${blueprint.code.toLowerCase()}-${towerLetter.toLowerCase()}-802`, {
                towerName: `Tower ${String.fromCharCode(towerLetter.charCodeAt(0) + 1)}`,
                floorLabel: "08",
                configuration: "2BHK",
                areaSqFt: 1185 + sequence * 11,
                finalPrice: basePrice - 240000,
                projectId,
                view: "Landscape Spine",
              }),
            ],
          },
        ],
      },
    ],
  };
});

const projectSeed = [...projectCatalog, ...generatedProjectCatalog];

const generatedFirstNames = ["Rajesh", "Amit", "Neha", "Priya", "Rohit", "Arjun", "Sneha", "Aditya", "Kabir", "Meera", "Vivaan", "Diya", "Arnav", "Tara", "Reyansh", "Naina", "Advik", "Kriti", "Yash", "Pooja"];
const generatedLastNames = ["Sharma", "Verma", "Kapoor", "Mehta", "Agarwal", "Khanna", "Gupta", "Singh", "Bansal", "Desai", "Bhardwaj", "Khurana", "Menon", "Kulkarni", "Saxena", "Bedi", "Chawla", "Arora", "Joshi", "Bose"];
const generatedCities = ["Noida", "Gurugram", "Faridabad", "Ghaziabad", "Delhi", "Greater Noida"];
const generatedLeadSources = ["Website", "Google Ads", "Referral", "Broker Referral", "Walk-in", "WhatsApp", "Meta Campaign", "Channel Partner"];
const generatedTrades = ["Civil", "Electrical", "MEP", "Landscape", "Finishing", "Plumbing"];
const generatedDepartments = ["Projects", "Procurement", "Finance", "Sales", "Admin", "Quality", "Planning", "HSE"];
const generatedVendorCategories = ["Cement", "Steel", "Electrical", "Finishing", "Plumbing"];
const generatedMaterialCategories = ["Cement", "Steel", "Electrical", "Finishing", "Plumbing"];

const generatedLeadSeed = Array.from({ length: 294 }, (_, index) => {
  const sequence = index + 1;
  const project = projectSeed[index % projectSeed.length];
  const assignedTo = salesUsers[index % salesUsers.length];
  const stage =
    sequence % 11 === 0
      ? "Closed Won"
      : sequence % 19 === 0
        ? "Closed Lost"
        : stageOrder[sequence % (stageOrder.length - 2)];
  const createdAt = new Date(Date.UTC(2025, 6 + (index % 12), 1 + (index % 26), 9 + (index % 6), (index * 11) % 60, 0)).toISOString();
  const followUpAt = new Date(Date.UTC(2026, 5, 8 + (index % 9), 10 + (index % 5), (index * 7) % 60, 0)).toISOString();

  return {
    id: `lead-seed-${padNumber(sequence)}`,
    firstName: generatedFirstNames[index % generatedFirstNames.length],
    lastName: generatedLastNames[(index * 3) % generatedLastNames.length],
    phone: `+91 98${padNumber(22000000 + sequence, 8)}`,
    email: `lead.seed.${sequence}@nimbuserp.local`,
    source: generatedLeadSources[index % generatedLeadSources.length],
    assignedTo: assignedTo.id,
    brokerId: sequence % 4 === 0 ? brokers[sequence % brokers.length].id : undefined,
    preferredProjectId: project.id,
    preferredConfiguration: ["2BHK", "2BHK + Study", "3BHK", "3BHK + Deck", "4BHK"][index % 5],
    budgetMin: 9000000 + (index % 9) * 900000,
    budgetMax: 11800000 + (index % 11) * 1050000,
    stage,
    followUpAt,
    notes: `${project.name} inquiry seeded for walkthrough realism with ${generatedLeadSources[index % generatedLeadSources.length].toLowerCase()} source history.`,
    createdAt,
    updatedAt: followUpAt,
  };
});

const generatedSiteVisitSeed = generatedLeadSeed
  .filter((lead, index) =>
    ["Site Visit Scheduled", "Negotiation", "Booking"].includes(lead.stage) &&
    index % 3 === 0,
  )
  .slice(0, 36)
  .map((lead, index) => ({
    id: `visit-seed-${padNumber(index + 1)}`,
    leadId: lead.id,
    projectId: lead.preferredProjectId,
    scheduledAt: new Date(Date.UTC(2026, 5, 10 + (index % 10), 11 + (index % 4), (index * 9) % 60, 0)).toISOString(),
    coordinatorId: salesUsers[index % salesUsers.length].id,
    status: index % 4 === 0 ? "Completed" : "Scheduled",
    outcome: index % 4 === 0 ? "Priority inventory shortlisted after site walkthrough." : "Premium inventory walkthrough pending.",
    createdAt: new Date(Date.UTC(2026, 5, 5 + (index % 12), 10 + (index % 3), 0, 0)).toISOString(),
  }));

const leadSeedData = [...leadSeed, ...generatedLeadSeed];
const siteVisitSeedData = [...siteVisitSeed, ...generatedSiteVisitSeed];

const seedBookedUnitIds = new Set(bookingSeed.map((booking) => booking.unitId));
const generatedBookingUnits = projectSeed.flatMap((project) =>
  (project.towers || []).flatMap((tower) =>
    (tower.floors || []).flatMap((floor) =>
      (floor.units || []).map((unit) => ({
        id: unit.id,
        projectId: project.id,
        finalPrice: unit.finalPrice,
      })),
    ),
  ),
);
const generatedClosedWonLeadContexts = leadSeedData
  .filter(
    (lead) =>
      lead.stage === "Closed Won" &&
      !bookingSeed.some((booking) => booking.leadId === lead.id),
  )
  .map((lead) => {
    const preferredIndex = generatedBookingUnits.findIndex(
      (unit) => !seedBookedUnitIds.has(unit.id) && unit.projectId === lead.preferredProjectId,
    );
    const fallbackIndex = generatedBookingUnits.findIndex(
      (unit) => !seedBookedUnitIds.has(unit.id),
    );
    const unitIndex = preferredIndex >= 0 ? preferredIndex : fallbackIndex;

    if (unitIndex < 0) {
      return null;
    }

    const [unit] = generatedBookingUnits.splice(unitIndex, 1);
    seedBookedUnitIds.add(unit.id);
    return { lead, unit };
  })
  .filter(Boolean)
  .slice(0, 24);

const generatedCustomerSeed = generatedClosedWonLeadContexts.map(({ lead }, index) => ({
  id: `customer-seed-${padNumber(index + 1)}`,
  name: `${lead.firstName} ${lead.lastName}`,
  phone: lead.phone,
  email: lead.email,
  sourceLeadId: lead.id,
  createdAt: new Date(Date.UTC(2025, 6 + Math.floor(index / 2), 4 + (index % 2) * 8, 11, 15, 0)).toISOString(),
}));

const customerSeedData = [...customerSeed, ...generatedCustomerSeed];

const generatedBookingSeed = generatedClosedWonLeadContexts.map(({ lead, unit }, index) => {
  const bookingDate = new Date(Date.UTC(2025, 6 + Math.floor(index / 2), 4 + (index % 2) * 8, 11 + (index % 4), 20, 0)).toISOString();
  return {
    id: `booking-seed-${padNumber(index + 1)}`,
    leadId: lead.id,
    customerId: generatedCustomerSeed[index].id,
    projectId: lead.preferredProjectId,
    unitId: unit.id,
    paymentPlanType: paymentPlanTypes[index % paymentPlanTypes.length],
    totalAmount: unit.finalPrice,
    status: "Active",
    agreementStatus: index % 4 === 0 ? "Agreement Signed" : index % 3 === 0 ? "KYC Review" : "Collections In Progress",
    bookingDate,
    createdBy: salesUsers[index % salesUsers.length].id,
  };
});

const bookingSeedData = [...bookingSeed, ...generatedBookingSeed];

const generatedReceiptSeed = generatedBookingSeed.flatMap((booking, index) => {
  const baseReceipts = [
    {
      id: `receipt-seed-${padNumber(index * 3 + 1)}`,
      bookingId: booking.id,
      amount: Math.round(
        booking.totalAmount *
          (booking.paymentPlanType === "Construction Linked" ? 0.1 : 0.2),
      ),
      mode: index % 3 === 0 ? "RTGS" : index % 3 === 1 ? "NEFT" : "Cheque",
      reference: `RCPT-${padNumber(index + 1)}-A`,
      receivedAt: new Date(new Date(booking.bookingDate).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      collectedBy: "user-accountant",
    },
  ];

  if (index % 2 === 0) {
    baseReceipts.push({
      id: `receipt-seed-${padNumber(index * 3 + 2)}`,
      bookingId: booking.id,
      amount: Math.round(booking.totalAmount * 0.18),
      mode: "NEFT",
      reference: `RCPT-${padNumber(index + 1)}-B`,
      receivedAt: new Date(new Date(booking.bookingDate).getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      collectedBy: "user-accountant",
    });
  }

  if (index % 3 === 0) {
    baseReceipts.push({
      id: `receipt-seed-${padNumber(index * 3 + 3)}`,
      bookingId: booking.id,
      amount: Math.round(booking.totalAmount * 0.12),
      mode: "RTGS",
      reference: `RCPT-${padNumber(index + 1)}-C`,
      receivedAt: new Date(new Date(booking.bookingDate).getTime() + 95 * 24 * 60 * 60 * 1000).toISOString(),
      collectedBy: "user-accountant",
    });
  }

  return baseReceipts;
});

const receiptSeedData = [...receiptSeed, ...generatedReceiptSeed];

const vendorCompanies = [
  "Shree Cement Suppliers",
  "Metro Electricals",
  "Apex Steel Traders",
  "Prime Build Solutions",
  "Urban Infrastructure Supplies",
  "Ambica Cement Corp",
  "Vinayak Electricals",
  "Kalyani Steel Traders",
  "Balaji Infra Solutions",
  "Tirupati Building Materials",
  "Bharat Construction Supplies",
  "Orient Cement Distributors",
  "Vanguard Infrastructure",
  "Classic Electrical Supplies"
];

const generatedVendorSeed = Array.from({ length: 72 }, (_, index) => {
  const sequence = index + 1;
  const baseName = vendorCompanies[index % vendorCompanies.length];
  const name = index >= vendorCompanies.length ? `${baseName} (Unit ${Math.floor(index / vendorCompanies.length) + 1})` : baseName;
  return {
    id: `vendor-seed-${padNumber(sequence)}`,
    name,
    category: generatedVendorCategories[index % generatedVendorCategories.length],
    city: generatedCities[(index * 2) % generatedCities.length],
    gstin: `${10 + (index % 20)}AASE${padNumber(1200 + sequence, 4)}Z${1 + (index % 9)}`,
    averageLeadTimeDays: 2 + (index % 6),
    reliabilityScore: 74 + (index % 21),
    status: index % 8 === 0 ? "Onboarding" : "Active",
    lastOrderDate: new Date(Date.UTC(2026, 4 + (index % 2), 1 + (index % 26), 10, 0, 0)).toISOString(),
  };
});

const vendorSeedData = [...vendorSeed, ...generatedVendorSeed];

const generatedWarehouseSeed = generatedProjectCatalog.map((project, index) =>
  normalizeWarehouseRecord(
    {
      id: `wh-seed-${padNumber(index + 1)}`,
      name: `${project.code} Site Warehouse`,
      code: `${project.code}-WH`,
      location: project.location,
      region: inferWarehouseRegion(project.location),
      capacity: 880 + (index % 6) * 160,
      capacityUtilization: 52 + (index % 5) * 9,
      storageTypes:
        index % 4 === 0
          ? ["Racked", "Secure Cage"]
          : index % 3 === 0
            ? ["Bulk", "Outdoor"]
            : ["Racked", "Palletized"],
      operatingHours: index % 5 === 0 ? "24x7" : "07:00 - 19:00",
      supervisor: `${(demoUsers.find((u) => u.id === project.managerId)?.name || "Operations").split(" ")[0]} Logistics Lead`,
      assignedProjects: [project.id],
      materialCategories: [generatedMaterialCategories[index % generatedMaterialCategories.length]],
      status: index % 6 === 0 ? "Under Setup" : "Operational",
      notes: `Site warehouse aligned to ${project.name} execution demand.`,
    },
    index + warehouseSeed.length,
  ),
);

const warehouseSeedData = [...warehouseSeed, ...generatedWarehouseSeed];

const warehouseByProjectId = {
  "project-aurora": "wh-1001",
  "project-skyline": "wh-1002",
  "project-riverfront": "wh-1003",
  ...Object.fromEntries(generatedProjectCatalog.map((project, index) => [project.id, generatedWarehouseSeed[index].id])),
};

const generatedMaterialSeed = Array.from({ length: 146 }, (_, index) => {
  const sequence = index + 1;
  const project = projectSeed[index % projectSeed.length];
  const category = generatedMaterialCategories[index % generatedMaterialCategories.length];
  const reorderLevel = 40 + (index % 8) * 12;
  const onHand = sequence % 7 === 0 ? reorderLevel - 8 : reorderLevel + 28 + (index % 5) * 6;
  const unit = category === "Steel" ? "tons" : category === "Electrical" ? "sets" : category === "Plumbing" ? "pipes" : category === "Finishing" ? "drums" : "bags";

  return {
    id: `mat-seed-${padNumber(sequence)}`,
    sku: `${category.slice(0, 3).toUpperCase()}-${project.code}-${padNumber(sequence)}`,
    name: `${project.code} ${category} Material ${sequence}`,
    category,
    warehouseId: warehouseByProjectId[project.id],
    projectId: project.id,
    onHand,
    reorderLevel,
    unit,
    averageConsumption: 8 + (index % 9) * 4,
    status: onHand <= reorderLevel ? "Low Stock" : "Healthy",
  };
});

const materialSeedData = [...materialSeed, ...generatedMaterialSeed];

const generatedPurchaseRequestSeed = Array.from({ length: 99 }, (_, index) => {
  const sequence = index + 1;
  const project = projectSeed[index % projectSeed.length];
  const category = generatedVendorCategories[index % generatedVendorCategories.length];
  return {
    id: `pr-seed-${padNumber(sequence)}`,
    title: `${project.code} ${category} replenishment lot ${padNumber(sequence)}`,
    projectId: project.id,
    department: "Projects",
    requestedBy: sequence % 2 === 0 ? "user-manager" : "user-sales-2",
    materialCategory: category,
    quantity: 60 + (index % 7) * 25,
    unit: category === "Steel" ? "tons" : "bags",
    status: index % 5 === 0 ? "Approved" : index % 3 === 0 ? "RFQ Open" : "Pending Approval",
    priority: index % 4 === 0 ? "High" : "Medium",
    requiredBy: new Date(Date.UTC(2026, 5, 14 + (index % 15), 0, 0, 0)).toISOString(),
    createdAt: new Date(Date.UTC(2026, 4 + (index % 2), 8 + (index % 18), 9, (index * 5) % 60, 0)).toISOString(),
  };
});

const purchaseRequestSeedData = [...purchaseRequestSeed, ...generatedPurchaseRequestSeed];

const generatedQuotationSeed = generatedPurchaseRequestSeed.flatMap((request, index) => {
  const firstVendor = vendorSeedData[index % vendorSeedData.length];
  const secondVendor = vendorSeedData[(index + 7) % vendorSeedData.length];
  return [
    {
      id: `qt-seed-${padNumber(index * 2 + 1)}`,
      requestId: request.id,
      vendorId: firstVendor.id,
      totalAmount: 220000 + index * 18500,
      deliveryDays: 2 + (index % 5),
      paymentTerms: index % 3 === 0 ? "15 days credit" : "Advance 20%",
      qualityScore: 78 + (index % 18),
      status: index % 4 === 0 ? "Recommended" : "Received",
      submittedAt: new Date(Date.UTC(2026, 4 + (index % 2), 10 + (index % 18), 13, 0, 0)).toISOString(),
    },
    {
      id: `qt-seed-${padNumber(index * 2 + 2)}`,
      requestId: request.id,
      vendorId: secondVendor.id,
      totalAmount: 235000 + index * 17200,
      deliveryDays: 3 + (index % 6),
      paymentTerms: index % 2 === 0 ? "30 days credit" : "Advance 10%",
      qualityScore: 74 + (index % 16),
      status: "Received",
      submittedAt: new Date(Date.UTC(2026, 4 + (index % 2), 11 + (index % 18), 14, 15, 0)).toISOString(),
    },
  ];
});

const quotationSeedData = [...quotationSeed, ...generatedQuotationSeed];

const generatedPurchaseOrderSeed = generatedPurchaseRequestSeed.slice(0, 99).map((request, index) => {
  const recommendedQuotation =
    generatedQuotationSeed.find((quotation) => quotation.requestId === request.id) ||
    quotationSeedData[index % quotationSeedData.length];
  return {
    id: `po-seed-${padNumber(index + 1)}`,
    requestId: request.id,
    vendorId: recommendedQuotation.vendorId,
    projectId: request.projectId,
    amount: recommendedQuotation.totalAmount,
    status: index % 4 === 0 ? "In Transit" : index % 5 === 0 ? "Draft" : "Released",
    expectedDelivery: new Date(Date.UTC(2026, 5, 16 + (index % 18), 0, 0, 0)).toISOString(),
    createdAt: new Date(Date.UTC(2026, 4 + (index % 2), 12 + (index % 18), 16, 0, 0)).toISOString(),
  };
});

const purchaseOrderSeedData = [...purchaseOrderSeed, ...generatedPurchaseOrderSeed];

const generatedEmployeeSeed = Array.from({ length: 497 }, (_, index) => {
  const sequence = index + 1;
  const project = projectSeed[index % projectSeed.length];
  const department = generatedDepartments[index % generatedDepartments.length];
  const firstName = generatedFirstNames[index % generatedFirstNames.length];
  const lastName = generatedLastNames[(index * 5) % generatedLastNames.length];
  const designation = `${department === "Projects" ? "Site" : department === "Sales" ? "Sales" : department} Executive`;

  return {
    id: `emp-seed-${padNumber(sequence)}`,
    name: `${firstName} ${lastName}`,
    department,
    designation,
    position: designation,
    projectId: project.id,
    teamName: `${project.code} ${department} Team`,
    phone: `+91 97${padNumber(31000000 + sequence, 8)}`,
    status: sequence % 18 === 0 ? "Inactive" : "Active",
    ...buildEmployeeProfileFields(sequence, `${firstName} ${lastName}`, designation, project.name),
  };
});

const employeeSeedData = [...employeeSeed, ...generatedEmployeeSeed];

const generateTeamSeeds = () => {
  const uniqueTeams = new Map();
  employeeSeedData.forEach((emp) => {
    if (!emp.teamName || emp.teamName === "Unassigned") return;
    const key = `${emp.projectId}:${emp.teamName}`;
    if (!uniqueTeams.has(key)) {
      uniqueTeams.set(key, {
        projectId: emp.projectId,
        name: emp.teamName,
        members: [],
      });
    }
    uniqueTeams.get(key).members.push(emp);
  });

  const teamSeeds = [];
  let index = 1;
  for (const [key, info] of uniqueTeams.entries()) {
    let supervisor = info.members.find(
      (m) =>
        /lead|manager|engineer|supervisor/i.test(m.position || m.designation) &&
        m.status === "Active"
    );
    if (!supervisor && info.members.length > 0) {
      supervisor = info.members[0];
    }
    const supervisorId = supervisor ? supervisor.id : "user-manager";

    const hash = Number(index * 17);
    const productivityScore = 78 + (hash % 20);
    const healthScore = 80 + (hash % 18);
    const attendanceRate = 85 + (hash % 13);
    const coverageRate = 80 + (hash % 16);

    teamSeeds.push({
      id: `team-seed-${String(index).padStart(3, "0")}`,
      name: info.name,
      projectId: info.projectId,
      supervisorId,
      productivityScore,
      healthScore,
      attendanceRate,
      coverageRate,
      status: "Active",
      openPositions: index % 3,
      activeTasksCount: (index % 5) + 2,
    });
    index++;
  }
  return teamSeeds;
};

const teamSeedData = generateTeamSeeds();

const contractorCompanies = [
  "RK Construction Group",
  "Skyline Contractors",
  "Zenith Civil Works",
  "Elite Infra Projects",
  "Pioneer Engineering Services",
  "Supreme Builders",
  "Dynamic Infra Projects",
  "Vanguard Civil Works",
  "United Engineering Services",
  "Vardhman Contractors",
  "Techno Civil Group",
  "Precision Builders"
];

const generatedContractorSeed = Array.from({ length: 49 }, (_, index) => {
  const sequence = index + 1;
  const project = projectSeed[index % projectSeed.length];
  const trade = generatedTrades[index % generatedTrades.length];
  const baseName = contractorCompanies[index % contractorCompanies.length];
  const name = index >= contractorCompanies.length ? `${baseName} (Unit ${Math.floor(index / contractorCompanies.length) + 1})` : baseName;
  return {
    id: `ctr-seed-${padNumber(sequence)}`,
    name,
    trade,
    projectId: project.id,
    workforce: 16 + (index % 8) * 5,
    status: sequence % 6 === 0 ? "Mobilizing" : "Engaged",
  };
});

const contractorSeedData = [...contractorSeed, ...generatedContractorSeed];

const generatedProjectTaskSeed = projectSeed.flatMap((project, index) => {
  const dueBase = 14 + (index % 12);
  return [
    {
      id: `tsk-seed-${padNumber(index * 6 + 1)}`,
      projectId: project.id,
      title: `${project.code} structure pour release`,
      ownerId: salesUsers[index % salesUsers.length].id,
      discipline: "Structure",
      priority: "High",
      status: index % 4 === 0 ? "In Progress" : "Review",
      dueDate: new Date(Date.UTC(2026, 5, dueBase, 0, 0, 0)).toISOString(),
      completion: index % 4 === 0 ? 62 : 86,
    },
    {
      id: `tsk-seed-${padNumber(index * 6 + 2)}`,
      projectId: project.id,
      title: `${project.code} milestone tower handoff`,
      ownerId: "user-manager",
      discipline: "Milestone",
      priority: "High",
      status: index % 5 === 0 ? "In Progress" : "Planned",
      dueDate: new Date(Date.UTC(2026, 5, 18 + (index % 10), 0, 0, 0)).toISOString(),
      completion: index % 5 === 0 ? 48 : 12,
    },
    {
      id: `tsk-seed-${padNumber(index * 6 + 3)}`,
      projectId: project.id,
      title: `${project.code} procurement release block`,
      ownerId: "user-sales-2",
      discipline: "Procurement",
      priority: "Medium",
      status: "Planned",
      dueDate: new Date(Date.UTC(2026, 5, 20 + (index % 10), 0, 0, 0)).toISOString(),
      completion: 14,
    },
    {
      id: `tsk-seed-${padNumber(index * 6 + 4)}`,
      projectId: project.id,
      title: `${project.code} façade mock-up review`,
      ownerId: "user-manager",
      discipline: "MEP",
      priority: "Medium",
      status: "Review",
      dueDate: new Date(Date.UTC(2026, 5, 12 + (index % 8), 0, 0, 0)).toISOString(),
      completion: 81,
    },
    {
      id: `tsk-seed-${padNumber(index * 6 + 5)}`,
      projectId: project.id,
      title: `${project.code} weekly progress close`,
      ownerId: "user-admin",
      discipline: "Planning",
      priority: "Low",
      status: "Done",
      dueDate: new Date(Date.UTC(2026, 5, 9 + (index % 8), 0, 0, 0)).toISOString(),
      completion: 100,
    },
    {
      id: `tsk-seed-${padNumber(index * 6 + 6)}`,
      projectId: project.id,
      title: `${project.code} labor deployment review`,
      ownerId: "user-manager",
      discipline: "Projects",
      priority: "Medium",
      status: index % 3 === 0 ? "In Progress" : "Planned",
      dueDate: new Date(Date.UTC(2026, 5, 22 + (index % 8), 0, 0, 0)).toISOString(),
      completion: index % 3 === 0 ? 54 : 6,
    },
  ];
});

const projectTaskSeedData = [...projectTaskSeed, ...generatedProjectTaskSeed];

const generatedDailyReportSeed = projectSeed.flatMap((project, index) => {
  const laborCount1 = 58 + (index % 7) * 9;
  const skilled1 = Math.round(laborCount1 * 0.55);
  const unskilled1 = Math.round(laborCount1 * 0.40);
  const supervisors1 = laborCount1 - skilled1 - unskilled1;

  const laborCount2 = 64 + (index % 6) * 8;
  const skilled2 = Math.round(laborCount2 * 0.50);
  const unskilled2 = Math.round(laborCount2 * 0.45);
  const supervisors2 = laborCount2 - skilled2 - unskilled2;

  const engineers = ["Vikram Rathore", "Anjali Mehta", "Rajesh Kumar", "Sanjay Dutt", "Amit Sharma"];
  const engineer1 = engineers[index % engineers.length];
  const engineer2 = engineers[(index + 2) % engineers.length];

  const blockerLvl1 = index % 4 === 0 ? "Medium" : "None";
  const blockerLvl2 = index % 5 === 0 ? "High" : "None";

  const progressPercent1 = 60 + (index % 5) * 8;
  const progressPercent2 = 65 + (index % 4) * 7;

  const siteHealth1 = blockerLvl1 === "None" ? 90 + (index % 3) * 3 : 75 + (index % 2) * 5;
  const siteHealth2 = blockerLvl2 === "None" ? 92 + (index % 3) * 2 : 68 + (index % 2) * 4;

  return [
    {
      id: `dpr-seed-${padNumber(index * 2 + 1)}`,
      projectId: project.id,
      submittedBy: salesUsers[index % salesUsers.length]?.id || "user-manager",
      reportDate: new Date(Date.UTC(2026, 5, 10 + (index % 3), 0, 0, 0)).toISOString(),
      laborCount: laborCount1,
      materialUsage: `Cement: ${30 + (index % 4) * 15} bags, Steel: ${(1.5 + (index % 3) * 0.8).toFixed(1)} tons`,
      blockers: index % 4 === 0 ? "Consultant markup and supply coordination need follow-up." : "No major blocker beyond routine clearance sequencing.",
      progressSummary: `${project.name} closed the daily progress cycle with active workfront movement and no runtime delivery blockers.`,
      shift: index % 2 === 0 ? "Day" : "Night",
      siteEngineer: engineer1,
      progressPercent: progressPercent1,
      weather: index % 3 === 0 ? "Sunny" : index % 3 === 1 ? "Cloudy" : "Rainy",
      blockersLevel: blockerLvl1,
      siteHealth: siteHealth1,
      remarks: `Workfront mobilization executed for tower superstructure. All safety protocols verified.`,
      materials: {
        cement: 30 + (index % 4) * 15,
        steel: Number((1.5 + (index % 3) * 0.8).toFixed(1)),
        sand: 10 + (index % 3) * 5,
        aggregates: 15 + (index % 3) * 8,
      },
      laborDetails: {
        skilled: skilled1,
        unskilled: unskilled1,
        supervisors: supervisors1,
      },
      photos: ["/images/site-update-1.jpg"],
    },
    {
      id: `dpr-seed-${padNumber(index * 2 + 2)}`,
      projectId: project.id,
      submittedBy: "user-manager",
      reportDate: new Date(Date.UTC(2026, 5, 12, 0, 0, 0)).toISOString(),
      laborCount: laborCount2,
      materialUsage: `Cement: ${45 + (index % 3) * 20} bags, Steel: ${(2.2 + (index % 2) * 1.2).toFixed(1)} tons`,
      blockers: index % 5 === 0 ? "One milestone sign-off waiting on design release." : "Execution progressing with manageable dependencies.",
      progressSummary: `${project.name} maintained forward execution momentum with current milestone handoff under supervision.`,
      shift: "Day",
      siteEngineer: engineer2,
      progressPercent: progressPercent2,
      weather: index % 4 === 0 ? "Windy" : "Sunny",
      blockersLevel: blockerLvl2,
      siteHealth: siteHealth2,
      remarks: `Finishing works and service packages deployed for current tower zone. Quality check audit pending.`,
      materials: {
        cement: 45 + (index % 3) * 20,
        steel: Number((2.2 + (index % 2) * 1.2).toFixed(1)),
        sand: 12 + (index % 4) * 4,
        aggregates: 18 + (index % 4) * 6,
      },
      laborDetails: {
        skilled: skilled2,
        unskilled: unskilled2,
        supervisors: supervisors2,
      },
      photos: ["/images/site-update-2.jpg"],
    },
  ];
});

const dailyReportSeedData = [...dailyReportSeed, ...generatedDailyReportSeed];

const generatedResourceAllocationSeed = projectSeed.flatMap((project, index) => {
  const crewUtil = 58 + (index % 5) * 7;
  const crewStatus = crewUtil > 85 ? "Overloaded" : "Assigned";
  const crewHealth = 70 + (index % 4) * 8;
  const crewDailyCost = 500 + (index % 6) * 150;
  
  const machUtil = 52 + (index % 6) * 8;
  const machStatus = index % 5 === 0 ? "Maintenance" : (machUtil < 45 ? "Idle" : (machUtil > 85 ? "Overloaded" : "Assigned"));
  const machHealth = index % 5 === 0 ? 45 : (65 + (index % 5) * 8);
  const machDailyCost = 800 + (index % 5) * 200;

  const contUtil = 40 + (index % 7) * 9;
  const contStatus = contUtil < 50 ? "Idle" : "Assigned";
  const contHealth = 60 + (index % 6) * 7;
  const contDailyCost = 1200 + (index % 4) * 300;

  const crewSubtypes = ["Carpentry Crew", "Steel Fixers", "Concrete Crew", "Masonry Crew"];
  const machSubtypes = ["Tower Crane", "Excavator", "Concrete Mixer", "Backhoe Loader"];
  const contSubtypes = ["MEP Contractor", "HVAC Installer", "Plumbing Sub", "Finishing Contractor"];

  return [
    {
      id: `res-seed-${padNumber(index * 3 + 1)}`,
      projectId: project.id,
      resourceName: `${project.code} Civil Crew`,
      type: "Crew",
      subType: crewSubtypes[index % 4],
      assignedTo: "Core structure",
      utilization: crewUtil,
      status: crewStatus,
      health: crewHealth,
      dailyCost: crewDailyCost,
      monthlyCost: crewDailyCost * 30,
    },
    {
      id: `res-seed-${padNumber(index * 3 + 2)}`,
      projectId: project.id,
      resourceName: `${project.code} Tower Crane`,
      type: "Machinery",
      subType: machSubtypes[index % 4],
      assignedTo: "Tower movement",
      utilization: machUtil,
      status: machStatus,
      health: machHealth,
      dailyCost: machDailyCost,
      monthlyCost: machDailyCost * 30,
    },
    {
      id: `res-seed-${padNumber(index * 3 + 3)}`,
      projectId: project.id,
      resourceName: `${project.code} Contracting Partner`,
      type: "Contractor",
      subType: contSubtypes[index % 4],
      assignedTo: "Interior finishing",
      utilization: contUtil,
      status: contStatus,
      health: contHealth,
      dailyCost: contDailyCost,
      monthlyCost: contDailyCost * 30,
    }
  ];
});

const resourceAllocationSeedData = [...resourceAllocationSeed, ...generatedResourceAllocationSeed];

const attendanceHistoryEmployees = employeeSeedData.filter((employee) => employee.status !== "Inactive").slice(0, 485);
const attendanceHistoryAnchor = new Date();
attendanceHistoryAnchor.setUTCHours(0, 0, 0, 0);

const generatedAttendanceSeed = Array.from({ length: 30 }).flatMap((_, dayOffset) => {
  const targetEmployees = dayOffset === 0
    ? attendanceHistoryEmployees.slice(0, attendanceHistoryEmployees.length - 12)
    : attendanceHistoryEmployees;

  return targetEmployees.map((employee, index) => {
    const date = new Date(attendanceHistoryAnchor);
    date.setUTCDate(attendanceHistoryAnchor.getUTCDate() - dayOffset);
    const hours = 8 + (index % 2);
    const minutes = 10 + (index % 45);
    date.setUTCHours(hours, minutes, 0, 0);

    let status = "Present";
    if (dayOffset === 0) {
      if (index % 25 === 0) status = "Late";
      else if (index % 19 === 0) status = "Absent";
      else if (index % 47 === 0) status = "Half Day";
    } else {
      if ((dayOffset + index) % 23 === 0) status = "Late";
      else if ((dayOffset + index) % 17 === 0) status = "Absent";
      else if ((dayOffset + index) % 43 === 0) status = "Half Day";
    }

    const checkInTime = date.toISOString();
    let checkOut = null;
    let hoursWorked = null;
    if (status !== "Absent") {
      const outDate = new Date(date);
      const shiftHours = status === "Half Day" ? 4 : 8 + (index % 2);
      outDate.setUTCHours(hours + shiftHours, minutes, 0, 0);
      checkOut = outDate.toISOString();
      hoursWorked = shiftHours;
    }

    return {
      id: `att-seed-${padNumber(dayOffset + 1, 2)}-${employee.id}`,
      employeeId: employee.id,
      projectId: employee.projectId,
      shift: dayOffset % 7 === 0 ? "Night" : "Day",
      checkIn: checkInTime,
      checkOut,
      hoursWorked,
      status,
      remarks: status === "Late" ? "Heavy traffic delay" : status === "Half Day" ? "Doctor appointment in afternoon" : status === "Absent" ? "Medical leave requested" : "Routine shift check-in",
      location: "Main Site Entrance Gate " + (1 + (index % 3)),
      supervisorNotes: "Verified at entry point",
    };
  });
});

const attendanceSeedData = [...attendanceSeed, ...generatedAttendanceSeed];

const auditCategories = ["Sales", "Projects", "Procurement", "Materials", "Collections", "Workforce", "Management"];
const auditLogSeed = Array.from({ length: 36 }, (_, index) => ({
  id: `audit-seed-${padNumber(index + 1)}`,
  title: `${auditCategories[index % auditCategories.length]} update logged`,
  detail: `${projectSeed[index % projectSeed.length].name} recorded seeded ${auditCategories[index % auditCategories.length].toLowerCase()} activity for demo history continuity.`,
  category: auditCategories[index % auditCategories.length],
  actorName: demoUsers[index % demoUsers.length].name,
  createdAt: new Date(Date.UTC(2026, 4, 1 + index, 10 + (index % 5), (index * 9) % 60, 0)).toISOString(),
}));

const clone = (value) => JSON.parse(JSON.stringify(value));

const buildPaymentSchedule = (
  bookingId,
  totalAmount,
  paymentPlanType,
  bookingDate,
) => {
  const baseDate = new Date(bookingDate);
  const entries =
    paymentPlanType === "Down Payment"
      ? [
          { label: "Token", percentage: 20, monthOffset: 0 },
          { label: "Balance", percentage: 80, monthOffset: 2 },
        ]
      : paymentPlanType === "EMI"
        ? [
            { label: "Token", percentage: 20, monthOffset: 0 },
            { label: "EMI 1", percentage: 20, monthOffset: 1 },
            { label: "EMI 2", percentage: 20, monthOffset: 2 },
            { label: "EMI 3", percentage: 20, monthOffset: 3 },
            { label: "EMI 4", percentage: 20, monthOffset: 4 },
          ]
        : [
            { label: "Token", percentage: 10, monthOffset: 0 },
            { label: "Slab 1", percentage: 30, monthOffset: 2 },
            { label: "Slab 2", percentage: 30, monthOffset: 4 },
            { label: "Possession", percentage: 30, monthOffset: 7 },
          ];

  return entries.map((entry, index) => {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + entry.monthOffset);

    return {
      id: `${bookingId}-schedule-${index + 1}`,
      label: entry.label,
      amount: Math.round((totalAmount * entry.percentage) / 100),
      dueDate: dueDate.toISOString(),
      status: "Pending",
      paidAmount: 0,
      paidAt: null,
    };
  });
};

const createInitialState = () => {
  const projects = clone(projectSeed);
  const leads = clone(leadSeedData);
  const customers = clone(customerSeedData);
  const bookings = clone(bookingSeedData).map((booking) => ({
    ...booking,
    schedule: buildPaymentSchedule(
      booking.id,
      booking.totalAmount,
      booking.paymentPlanType,
      booking.bookingDate,
    ),
    outstandingAmount: booking.totalAmount,
  }));

  return {
    users: clone(demoUsers),
    brokers: clone(brokers),
    projects,
    leads,
    customers,
    bookings,
    receipts: clone(receiptSeedData),
    siteVisits: clone(siteVisitSeedData),
    workflowSettings: clone(workflowSettings),
    notificationSettings: clone(notificationSettings),
    approvals: clone(approvalSeed),
    documents: clone(documentSeed),
    compliance: clone(complianceSeed),
    vendors: clone(vendorSeedData),
    purchaseRequests: clone(purchaseRequestSeedData),
    quotations: clone(quotationSeedData),
    purchaseOrders: clone(purchaseOrderSeedData),
    warehouses: clone(warehouseSeedData),
    materials: clone(materialSeedData),
    transfers: clone(transferSeed),
    consumptions: clone(consumptionSeed),
    projectTasks: clone(projectTaskSeedData),
    dailyReports: clone(dailyReportSeedData),
    resourceAllocations: clone(resourceAllocationSeedData),
    employees: clone(employeeSeedData),
    contractors: clone(contractorSeedData),
    attendance: clone(attendanceSeedData),
    teams: clone(teamSeedData),
    budgetItems: clone(budgetSeed),
    vendorPayments: clone(vendorPaymentSeed),
    auditLogs: clone(auditLogSeed),
  };
};

let state = createInitialState();
const ERP_STATE_KEY = "primary";
let persistChain = Promise.resolve();
const erpCollectionKeys = erpCollectionConfigs.map((entry) => entry.key);
let persistedCollectionSignatures = {};

const mergeMissingSeededRecords = (records = [], seeds = []) => {
  const existingIds = new Set((records || []).map((item) => item.id));
  return [...(records || []), ...seeds.filter((item) => !existingIds.has(item.id)).map((item) => clone(item))];
};

const ensureBaselineState = () => {
  // Auto-purge test, QA, or synthetic records
  const isTestData = (item) => {
    if (!item) return false;
    const fieldsToTest = [item.id, item.name, item.code, item.title, item.reference, item.projectName];
    return fieldsToTest.some(val => val && (typeof val === "string") && (
      /LIVE-/i.test(val) || 
      /QA-/i.test(val) || 
      /TEST-/i.test(val) ||
      /TEMP-/i.test(val) ||
      /DUMMY-/i.test(val) ||
      /SAMPLE-/i.test(val)
    ));
  };
  for (const key of erpCollectionKeys) {
    if (Array.isArray(state[key])) {
      state[key] = state[key].filter(item => !isTestData(item));
    }
  }

  state.projects = mergeMissingSeededRecords(state.projects, projectSeed);
  state.leads = mergeMissingSeededRecords(state.leads, leadSeedData);
  state.siteVisits = mergeMissingSeededRecords(state.siteVisits, siteVisitSeedData);
  state.vendors = mergeMissingSeededRecords(state.vendors, vendorSeedData);
  state.purchaseRequests = mergeMissingSeededRecords(
    state.purchaseRequests,
    purchaseRequestSeedData,
  );
  state.quotations = mergeMissingSeededRecords(state.quotations, quotationSeedData);
  state.purchaseOrders = mergeMissingSeededRecords(
    state.purchaseOrders,
    purchaseOrderSeedData,
  );
  state.warehouses = mergeMissingSeededRecords(state.warehouses, warehouseSeedData);
  state.warehouses = (state.warehouses || []).map((warehouse, index) =>
    normalizeWarehouseRecord(warehouse, index),
  );
  state.materials = mergeMissingSeededRecords(state.materials, materialSeedData);
  state.projectTasks = mergeMissingSeededRecords(
    state.projectTasks,
    projectTaskSeedData,
  );
  state.dailyReports = mergeMissingSeededRecords(
    state.dailyReports,
    dailyReportSeedData,
  );
  state.resourceAllocations = mergeMissingSeededRecords(
    state.resourceAllocations,
    resourceAllocationSeedData,
  );
  state.employees = mergeMissingSeededRecords(state.employees, employeeSeedData);
  state.contractors = mergeMissingSeededRecords(
    state.contractors,
    contractorSeedData,
  );
  state.attendance = mergeMissingSeededRecords(state.attendance, attendanceSeedData);
  state.teams = mergeMissingSeededRecords(state.teams || [], teamSeedData);
  state.auditLogs = mergeMissingSeededRecords(state.auditLogs, auditLogSeed).slice(
    0,
    40,
  );
  state.workflowSettings = mergeMissingSeededRecords(state.workflowSettings, workflowSettings);
  state.notificationSettings = mergeMissingSeededRecords(state.notificationSettings, notificationSettings);
  state.employees = (state.employees || []).map((employee, index) =>
    normalizeEmployeeRecord(employee, index),
  );
};

const getRolePermissions = (role) => rolePermissions[role] || [];

const getUserById = (id) => state.users.find((user) => user.id === id) || null;
const getBrokerById = (id) =>
  state.brokers.find((broker) => broker.id === id) || null;
const getLeadById = (id) => state.leads.find((lead) => lead.id === id) || null;
const getCustomerById = (id) =>
  state.customers.find((customer) => customer.id === id) || null;
const getBookingById = (id) =>
  state.bookings.find((booking) => booking.id === id) || null;
const isActiveBooking = (booking) =>
  Boolean(booking) && !["Cancelled", "Released"].includes(booking.status);
const listActiveBookings = () => state.bookings.filter(isActiveBooking);

const getProjectById = (id) =>
  state.projects.find((project) => project.id === id) || null;
const getApprovalById = (id) =>
  state.approvals.find((approval) => approval.id === id) || null;
const getDocumentById = (id) =>
  state.documents.find((document) => document.id === id) || null;
const getComplianceById = (id) =>
  state.compliance.find((item) => item.id === id) || null;
const getVendorById = (id) =>
  state.vendors.find((item) => item.id === id) || null;
const getPurchaseOrderById = (id) =>
  state.purchaseOrders.find((item) => item.id === id) || null;
const getMaterialById = (id) =>
  state.materials.find((item) => item.id === id) || null;
const getWarehouseById = (id) =>
  state.warehouses.find((item) => item.id === id) || null;
const findEmployeeById = (id) =>
  state.employees.find((item) => item.id === id) || null;
const normalizeContractor = (contractor) => {
  if (!contractor) return contractor;
  const index = parseInt(contractor.id.replace(/\D/g, "") || "1", 10);
  
  if (contractor.contactPerson === undefined) {
    contractor.contactPerson = [
      "Amit Kumar", "Sanjay Mehta", "Rajesh Gupta", "Vikram Singh", "Deepak Sharma"
    ][index % 5];
  }
  if (contractor.phone === undefined) {
    contractor.phone = `+91 98765 43${(100 + index).toString().slice(-3)}`;
  }
  if (contractor.email === undefined) {
    contractor.email = `${(contractor.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}@workforce.local`;
  }
  if (contractor.gstin === undefined) {
    contractor.gstin = `07AAAAA${(1000 + index)}A1Z${index % 10}`;
  }
  if (contractor.pan === undefined) {
    contractor.pan = `ABCDE${(1000 + index)}F`;
  }
  if (contractor.address === undefined) {
    contractor.address = `${index * 12 + 4}, Industrial Area Phase ${index % 3 + 1}, New Delhi`;
  }
  if (contractor.contractStart === undefined) {
    contractor.contractStart = `2025-01-${(10 + index % 18).toString().padStart(2, "0")}`;
  }
  if (contractor.contractEnd === undefined) {
    contractor.contractEnd = `2026-12-${(10 + index % 18).toString().padStart(2, "0")}`;
  }
  if (contractor.rateType === undefined) {
    contractor.rateType = ["Daily", "Hourly", "Per Sq Ft"][index % 3];
  }
  if (contractor.rateValue === undefined) {
    contractor.rateValue = 350 + (index % 10) * 50;
  }
  if (contractor.rating === undefined) {
    contractor.rating = Number((4.0 + (index % 11) * 0.1).toFixed(1));
  }
  if (contractor.complianceStatus === undefined) {
    contractor.complianceStatus = ["Compliant", "Pending Review", "Expired Documents"][index % 3];
  }
  if (contractor.createdAt === undefined) {
    contractor.createdAt = `2025-01-${(10 + index % 18).toString().padStart(2, "0")}T09:30:00.000Z`;
  }
  if (contractor.updatedAt === undefined) {
    contractor.updatedAt = `2026-06-11T11:05:00.000Z`;
  }
  return contractor;
};

const getContractorById = (id) => {
  const item = state.contractors.find((c) => c.id === id) || null;
  if (item) normalizeContractor(item);
  return item;
};
const getWorkflowSettingByCode = (code) =>
  state.workflowSettings.find((item) => item.code === code) || null;
const getNotificationSettingByCode = (code) =>
  state.notificationSettings.find((item) => item.code === code) || null;

const resolveMaterialStatus = (onHand, reorderLevel) => {
  if (Number(onHand) <= Number(reorderLevel)) {
    return "Low Stock";
  }

  return "Healthy";
};

const forEachUnit = (callback) => {
  state.projects.forEach((project) => {
    (project.towers || []).forEach((tower) => {
      (tower.floors || []).forEach((floor) => {
        (floor.units || []).forEach((unit) => callback(unit, project, tower, floor));
      });
    });
  });
};

const getUnitContext = (unitId) => {
  let result = null;

  forEachUnit((unit, project, tower, floor) => {
    if (unit.id === unitId) {
      result = { unit, project, tower, floor };
    }
  });

  return result;
};

const logAudit = ({ title, detail, actorId, category, createdAt }) => {
  const actor = getUserById(actorId);

  state.auditLogs.unshift({
    id: `audit-${randomUUID()}`,
    title,
    detail,
    category,
    actorName: actor?.name || "System",
    createdAt: createdAt || new Date().toISOString(),
  });

  state.auditLogs = state.auditLogs.slice(0, 40);
};

const stripPersistedFields = (document) => {
  const next = clone(document);
  delete next._id;
  delete next.sortOrder;
  return next;
};

const buildCollectionSignature = (value) => JSON.stringify(value || []);

const refreshPersistedCollectionSignatures = (nextState) => {
  persistedCollectionSignatures = erpCollectionKeys.reduce((accumulator, key) => {
    accumulator[key] = buildCollectionSignature(nextState[key]);
    return accumulator;
  }, {});
};

const normalizeStatePayload = (payload = {}) => ({
  ...createInitialState(),
  ...clone(payload),
});

const isMongoReady = () => mongoose.connection.readyState === 1;

const haveModularCollections = async () => {
  const counts = await Promise.all(
    erpCollectionConfigs.map(({ model }) => model.estimatedDocumentCount()),
  );

  return counts.some((count) => count > 0);
};

const hydrateStateFromCollections = async () => {
  const nextState = createInitialState();

  const entries = await Promise.all(
    erpCollectionConfigs.map(async ({ key, model }) => {
      const documents = await model.find({}).sort({ sortOrder: 1 }).lean();
      return [key, documents.map(stripPersistedFields)];
    }),
  );

  entries.forEach(([key, documents]) => {
    if (documents.length > 0) {
      nextState[key] = documents;
    }
  });

  return nextState;
};

const persistCollections = async (nextState, keysToPersist = erpCollectionKeys) => {
  for (const { key, model } of erpCollectionConfigs) {
    if (!keysToPersist.includes(key)) {
      continue;
    }

    const documents = clone(nextState[key] || []);

    if (!documents.length) {
      await model.deleteMany({});
      continue;
    }

    await model.bulkWrite(
      [
        ...documents.map((document, index) => ({
          replaceOne: {
            filter: { id: document.id },
            replacement: {
              ...document,
              sortOrder: index,
            },
            upsert: true,
          },
        })),
        {
          deleteMany: {
            filter: {
              id: {
                $nin: documents.map((document) => document.id),
              },
            },
          },
        },
      ],
      { ordered: false },
    );
  }
};

const initializeErpState = async () => {
  if (!isMongoReady()) {
    logger.info("ERP state booting in memory because Mongo is not connected");
    ensureBaselineState();
    return state;
  }

  if (await haveModularCollections()) {
    state = await hydrateStateFromCollections();
    ensureBaselineState();
    await persistCollections(state);
    refreshPersistedCollectionSignatures(state);
    logger.info("ERP state hydrated from modular Mongo collections");
    cleanupOrphanedReservations();
    return state;
  }

  const existing = await ErpState.findOne({
    singletonKey: ERP_STATE_KEY,
  }).lean();

  if (existing?.payload) {
    state = normalizeStatePayload(existing.payload);
    ensureBaselineState();
    await persistCollections(state);
    refreshPersistedCollectionSignatures(state);
    logger.info("ERP legacy state migrated to modular Mongo collections");
    return state;
  }

  ensureBaselineState();
  await persistCollections(state);
  refreshPersistedCollectionSignatures(state);
  logger.info("ERP seed state persisted to modular Mongo collections");

  cleanupOrphanedReservations();
  if (isMongoReady()) persistCollections(state);
  return state;
};

const persistState = async () => {
  if (!isMongoReady()) {
    return;
  }

  const changedKeys = erpCollectionKeys.filter(
    (key) => persistedCollectionSignatures[key] !== buildCollectionSignature(state[key]),
  );

  if (!changedKeys.length) {
    return;
  }

  persistChain = persistChain.then(() =>
    persistCollections(
      erpCollectionKeys.reduce((snapshot, key) => {
        snapshot[key] = state[key];
        return snapshot;
      }, {}),
      changedKeys,
    ),
  );

  await persistChain;
  changedKeys.forEach((key) => {
    persistedCollectionSignatures[key] = buildCollectionSignature(state[key]);
  });
};

const applyReceiptToBooking = (receipt) => {
  const booking = getBookingById(receipt.bookingId);
  if (!booking) {
    return;
  }

  let remaining = receipt.amount;

  booking.schedule.forEach((entry) => {
    if (remaining <= 0 || entry.status === "Paid") {
      return;
    }

    const pendingAmount = entry.amount - entry.paidAmount;
    const appliedAmount = Math.min(pendingAmount, remaining);

    entry.paidAmount += appliedAmount;
    remaining -= appliedAmount;

    if (entry.paidAmount >= entry.amount) {
      entry.status = "Paid";
      entry.paidAt = receipt.receivedAt;
    } else if (entry.paidAmount > 0) {
      entry.status = "Partially Paid";
    }
  });

  booking.outstandingAmount = Math.max(
    0,
    booking.totalAmount -
      state.receipts
        .filter((item) => item.bookingId === booking.id)
        .reduce((sum, item) => sum + item.amount, 0),
  );
  booking.status =
    booking.outstandingAmount === 0 ? "Collections Complete" : "Active";
};

const markBookedUnits = () => {
  listActiveBookings().forEach((booking) => {
    const context = getUnitContext(booking.unitId);
    if (context) {
      context.unit.status = "booked";
      context.unit.bookingId = booking.id;
      context.unit.customerId = booking.customerId;
    }
  });
};

markBookedUnits();
state.receipts.forEach((receipt) => applyReceiptToBooking(receipt));

[
  {
    title: "Booking created for Riverfront Residences",
    detail:
      "Arjun Nair confirmed unit RIV-D-1101 under construction-linked plan.",
    actorId: "user-sales",
    category: "Bookings",
    createdAt: "2026-06-04T12:10:00.000Z",
  },
  {
    title: "Receipt posted against Aurora booking",
    detail: "Finance recorded NEFT receipt for Priya Sharma.",
    actorId: "user-accountant",
    category: "Collections",
    createdAt: "2026-06-09T10:25:00.000Z",
  },
  {
    title: "Site visit confirmed for Skyline Enclave",
    detail: "Raghav Verma scheduled for premium inventory walkthrough.",
    actorId: "user-sales-2",
    category: "Sales",
    createdAt: "2026-06-10T09:15:00.000Z",
  },
].forEach(logAudit);

const paginate = (items, query) => {
  const { page, limit, offset } = getPagination(query);
  return {
    items: items.slice(offset, offset + limit),
    meta: {
      page,
      limit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / limit)),
    },
  };
};

const getUnitDisplay = (unitId) => {
  const context = getUnitContext(unitId);
  if (!context) {
    return null;
  }

  const { unit, project, tower, floor } = context;

  return {
    id: unit.id,
    code: unit.code,
    status: unit.status,
    configuration: unit.configuration,
    floorLabel: floor.label || unit.floorLabel,
    towerName: tower.name,
    projectId: project.id,
    projectName: project.name,
    areaSqFt: unit.areaSqFt,
    facing: unit.facing,
    view: unit.view,
    finalPrice: unit.finalPrice,
    bookingId: unit.bookingId || null,
    leadId: unit.leadId || null,
  };
};

const getAllUnits = () => {
  const units = [];

  forEachUnit((unit) => {
    units.push(getUnitDisplay(unit.id));
  });

  return units;
};

const serializeLead = (lead) => {
  const owner = getUserById(lead.assignedTo);
  const project = getProjectById(lead.preferredProjectId);
  const broker = getBrokerById(lead.brokerId);
  const booking = state.bookings.find(
    (item) => item.leadId === lead.id && isActiveBooking(item),
  );

  return {
    ...lead,
    fullName: `${lead.firstName} ${lead.lastName}`.trim(),
    assignedToName: owner?.name || "Unassigned",
    projectName: project?.name || "Unmapped",
    brokerName: broker?.name || null,
    budgetLabel: `INR ${lead.budgetMin.toLocaleString("en-IN")} - ${lead.budgetMax.toLocaleString("en-IN")}`,
    hasActiveBooking: Boolean(booking),
  };
};

const serializeSiteVisit = (visit) => {
  const lead = getLeadById(visit.leadId);
  const project = getProjectById(visit.projectId);
  const coordinator = getUserById(visit.coordinatorId);

  return {
    ...visit,
    leadName: lead ? `${lead.firstName} ${lead.lastName}` : "Unknown lead",
    projectName: project?.name || "Unknown project",
    coordinatorName: coordinator?.name || "Unknown coordinator",
  };
};

const serializeBooking = (booking) => {
  const customer = getCustomerById(booking.customerId);
  const lead = getLeadById(booking.leadId);
  const project = getProjectById(booking.projectId);
  const unit = getUnitDisplay(booking.unitId);
  const totalPaid = state.receipts
    .filter((receipt) => receipt.bookingId === booking.id)
    .reduce((sum, receipt) => sum + receipt.amount, 0);

  return {
    ...booking,
    customerName: customer?.name || "Unknown customer",
    customerPhone: customer?.phone || null,
    leadName: lead ? `${lead.firstName} ${lead.lastName}` : null,
    projectName: project?.name || "Unknown project",
    unitCode: unit?.code || "Unknown unit",
    totalPaid,
    scheduleSummary: booking.schedule.map((entry) => ({
      id: entry.id,
      label: entry.label,
      amount: entry.amount,
      dueDate: entry.dueDate,
      status: entry.status,
      paidAmount: entry.paidAmount,
    })),
  };
};

const serializeCustomer = (customer) => {
  const bookings = listActiveBookings().filter(
    (booking) => booking.customerId === customer.id,
  );
  const totalBookedValue = bookings.reduce(
    (sum, booking) => sum + booking.totalAmount,
    0,
  );
  const outstandingAmount = bookings.reduce(
    (sum, booking) => sum + booking.outstandingAmount,
    0,
  );
  const sourceLead = getLeadById(customer.sourceLeadId);

  return {
    ...customer,
    bookingCount: bookings.length,
    totalBookedValue,
    outstandingAmount,
    sourceLeadName: sourceLead
      ? `${sourceLead.firstName} ${sourceLead.lastName}`
      : null,
  };
};

const listUsers = () =>
  clone(
    state.users.map((user) => ({
      ...user,
      permissions: getRolePermissions(user.role),
    })),
  );

const getAuthSummary = (userId) => {
  const user = getUserById(userId);
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return {
    ...user,
    permissions: getRolePermissions(user.role),
    demoMode: true,
  };
};

const getUsersPayload = () => ({
  users: listUsers(),
  roles: Object.keys(rolePermissions).map((role) => ({
    key: role,
    permissions: getRolePermissions(role),
  })),
});

const getPermissionsMatrix = () => ({
  modules: [
    "Sales CRM",
    "Site Visits",
    "Inventory",
    "Bookings",
    "Collections",
    "Reports",
    "Settings",
  ],
  rows: [
    {
      module: "Sales CRM",
      admin: "Full",
      manager: "Full",
      accountant: "Read",
      sales: "Full",
    },
    {
      module: "Site Visits",
      admin: "Full",
      manager: "Full",
      accountant: "None",
      sales: "Full",
    },
    {
      module: "Inventory",
      admin: "Full",
      manager: "Read",
      accountant: "Read",
      sales: "Read",
    },
    {
      module: "Bookings",
      admin: "Full",
      manager: "Write",
      accountant: "Read",
      sales: "Write",
    },
    {
      module: "Collections",
      admin: "Full",
      manager: "Read",
      accountant: "Write",
      sales: "None",
    },
    {
      module: "Reports",
      admin: "Full",
      manager: "Read",
      accountant: "Read",
      sales: "None",
    },
    {
      module: "Settings",
      admin: "Full",
      manager: "Read",
      accountant: "None",
      sales: "None",
    },
  ],
});

const listLeads = (query = {}) => {
  const search = `${query.search || ""}`.trim().toLowerCase();
  const stage = query.stage;
  const ownerId = query.ownerId;

  const rows = state.leads
    .map(serializeLead)
    .filter((lead) => {
      const matchesSearch =
        !search ||
        lead.fullName.toLowerCase().includes(search) ||
        lead.projectName.toLowerCase().includes(search) ||
        lead.source.toLowerCase().includes(search);

      const matchesStage = !stage || lead.stage === stage;
      const matchesOwner = !ownerId || lead.assignedTo === ownerId;

      return matchesSearch && matchesStage && matchesOwner;
    })
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    );

  const paginated = paginate(rows, query);
  return {
    ...paginated,
    stages: stageOrder,
  };
};

const generateSparkline = (currentVal, varianceFactor = 0.05) => {
  const multipliers = [0.88, 0.92, 0.89, 0.94, 0.91, 0.96, 0.93, 0.98, 0.95, 1.0];
  return multipliers.map(m => Math.round(currentVal * m * 10) / 10);
};

const getLeadStats = () => {
  const openLeads = state.leads.filter(
    (lead) => !["Closed Won", "Closed Lost"].includes(lead.stage),
  );
  const scheduledVisits = state.siteVisits.filter(
    (visit) => visit.status === "Scheduled",
  ).length;
  const highValue = state.leads.filter(
    (lead) => lead.budgetMax >= 20000000, // ₹2 Cr
  ).length;
  const bookedThisCycle = listActiveBookings().length;
  const overdueFollowUps = state.leads.filter(
    (lead) =>
      !["Closed Won", "Closed Lost"].includes(lead.stage) &&
      lead.followUpAt &&
      new Date(lead.followUpAt) < new Date(),
  ).length;

  // Historical conversion rate (Won leads / Total leads)
  const wonLeads = state.leads.filter((lead) => lead.stage === "Closed Won").length;
  const totalLeads = state.leads.length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 14.2;

  // Pipeline Value (Sum of budgetMax of active leads in Cr)
  const totalPipeline = state.leads
    .filter((lead) => !["Closed Won", "Closed Lost"].includes(lead.stage))
    .reduce((sum, lead) => sum + (lead.budgetMax || 0), 0);
  const pipelineValue = Math.round((totalPipeline / 10000000) * 10) / 10;

  // Forecast Revenue (Negotiation * 0.4 + Booking * 0.85 in Cr)
  const negotiationVal = state.leads
    .filter((lead) => lead.stage === "Negotiation")
    .reduce((sum, lead) => sum + (lead.budgetMax || 0), 0);
  const bookingVal = state.leads
    .filter((lead) => lead.stage === "Booking")
    .reduce((sum, lead) => sum + (lead.budgetMax || 0), 0);
  const forecastVal = (negotiationVal * 0.4) + (bookingVal * 0.85);
  const forecastRevenue = Math.round((forecastVal / 10000000) * 10) / 10 || 12.8;

  return {
    activeLeads: openLeads.length,
    scheduledVisits,
    highValue,
    bookedThisCycle,
    stageCounts: stageOrder.map((stage) => ({
      stage,
      count: state.leads.filter((lead) => lead.stage === stage).length,
    })),
    // Expanded Dashboard KPIs
    kpis: {
      activeLeads: {
        value: openLeads.length,
        trend: "+12%",
        status: "Healthy Growth",
        sparkline: generateSparkline(openLeads.length)
      },
      scheduledVisits: {
        value: scheduledVisits,
        trend: "+8%",
        status: "High Activity",
        sparkline: generateSparkline(scheduledVisits)
      },
      highValue: {
        value: highValue,
        trend: "+5%",
        status: "Strong Pipeline",
        sparkline: generateSparkline(highValue)
      },
      bookedThisCycle: {
        value: bookedThisCycle,
        trend: "+15%",
        status: "Target Met",
        sparkline: generateSparkline(bookedThisCycle)
      },
      overdueFollowUps: {
        value: overdueFollowUps,
        trend: "-4%",
        status: "Action Required",
        sparkline: generateSparkline(overdueFollowUps)
      },
      conversionRate: {
        value: conversionRate,
        trend: "+3.4%",
        status: "Improving",
        sparkline: [12.1, 12.4, 12.8, 13.0, 13.2, 13.5, 13.8, 13.9, 14.0, conversionRate]
      },
      pipelineValue: {
        value: pipelineValue,
        trend: "+18%",
        status: "Strong",
        sparkline: generateSparkline(pipelineValue)
      },
      forecastRevenue: {
        value: forecastRevenue,
        trend: "+10%",
        status: "Next 90 Days",
        sparkline: generateSparkline(forecastRevenue)
      }
    }
  };
};

const getLeadActivityTimeline = (lead) => {
  const activities = [];
  const baseDate = new Date(lead.createdAt);

  activities.push({
    id: `act-${lead.id}-1`,
    type: "Lead Created",
    title: "Lead Profile Created",
    detail: `Lead acquired via ${lead.source}. Initial interest in ${lead.projectName || "selected project"}.`,
    actorName: "System",
    createdAt: baseDate.toISOString(),
  });

  const stages = ["New", "Contacted", "Interested", "Site Visit Scheduled", "Negotiation", "Booking", "Closed Won", "Closed Lost"];
  const currentStageIndex = stages.indexOf(lead.stage);

  if (currentStageIndex >= 1) {
    const date = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    activities.push({
      id: `act-${lead.id}-2`,
      type: "Lead Contacted",
      title: "First Contact Made",
      detail: `Spoke with lead. Confirmed contact details and interest in ${lead.preferredConfiguration} units.`,
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: date.toISOString(),
    });
  }

  if (currentStageIndex >= 2) {
    const date = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000);
    activities.push({
      id: `act-${lead.id}-3`,
      type: "Lead Advanced",
      title: "Advanced to Interested",
      detail: "Lead requested project brochure, layout drawings, and pricing options.",
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: date.toISOString(),
    });
  }

  // Site visits merge
  const visits = state.siteVisits.filter((v) => v.leadId === lead.id);
  visits.forEach((v) => {
    activities.push({
      id: `act-visit-${v.id}`,
      type: "Site Visit Scheduled",
      title: "Site Visit Scheduled",
      detail: `Walkthrough scheduled at project for coordinator ${getUserById(v.coordinatorId)?.name || "Executive"}.`,
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: v.scheduledAt,
    });

    if (v.status === "Completed") {
      const date = new Date(new Date(v.scheduledAt).getTime() + 2 * 60 * 60 * 1000);
      activities.push({
        id: `act-visit-comp-${v.id}`,
        type: "Lead Advanced",
        title: "Site Visit Completed",
        detail: v.outcome || "Site visit completed. Customer verified premium inventory.",
        actorName: getUserById(v.coordinatorId)?.name || "Sales Executive",
        createdAt: date.toISOString(),
      });
    }
  });

  if (currentStageIndex >= 4) {
    const date = new Date(baseDate.getTime() + 96 * 60 * 60 * 1000);
    activities.push({
      id: `act-${lead.id}-5`,
      type: "Negotiation Started",
      title: "Price Negotiation Initiated",
      detail: "Discussing customized payment schedules, discounts, and floor rise charges.",
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: date.toISOString(),
    });
  }

  if (currentStageIndex >= 5) {
    const date = new Date(baseDate.getTime() + 120 * 60 * 60 * 1000);
    activities.push({
      id: `act-${lead.id}-6`,
      type: "Booking Created",
      title: "Booking Initiated",
      detail: "Token amount check received. Unit reservation form prepared.",
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: date.toISOString(),
    });
  }

  if (lead.stage === "Closed Won") {
    const date = new Date(baseDate.getTime() + 144 * 60 * 60 * 1000);
    activities.push({
      id: `act-${lead.id}-7`,
      type: "Lead Advanced",
      title: "Deal Closed Won",
      detail: "All booking agreements signed. Project allocation complete.",
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: date.toISOString(),
    });
  } else if (lead.stage === "Closed Lost") {
    const date = new Date(baseDate.getTime() + 144 * 60 * 60 * 1000);
    activities.push({
      id: `act-${lead.id}-7`,
      type: "Lead Advanced",
      title: "Deal Closed Lost",
      detail: lead.notes || "Lead marked as lost. Archiving history.",
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: date.toISOString(),
    });
  }

  return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getLeadCommunicationHistory = (lead) => {
  const comms = [];
  const baseDate = new Date(lead.createdAt);

  comms.push({
    id: `comm-${lead.id}-1`,
    type: "Call",
    subject: "Initial Follow-up Call",
    summary: "Brief introduction and discussed budget/configuration. Lead was responsive and requested project details via WhatsApp.",
    duration: "4m 12s",
    status: "Completed",
    actorName: lead.assignedToName || "Sales Executive",
    createdAt: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
  });

  comms.push({
    id: `comm-${lead.id}-2`,
    type: "WhatsApp",
    subject: "Shared Project Brochure",
    summary: "Sent brochures, layout drawings, and standard payment options sheet.",
    duration: null,
    status: "Delivered",
    actorName: lead.assignedToName || "Sales Executive",
    createdAt: new Date(baseDate.getTime() + 5 * 60 * 60 * 1000).toISOString(),
  });

  if (lead.stage !== "New" && lead.stage !== "Contacted") {
    comms.push({
      id: `comm-${lead.id}-3`,
      type: "Email",
      subject: "Customized Pricing Quote",
      summary: "Emailed pricing sheet for 3BHK premium units with current discounts applied.",
      duration: null,
      status: "Opened",
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    });

    comms.push({
      id: `comm-${lead.id}-4`,
      type: "Call",
      subject: "Feedback on Pricing Quote",
      summary: "Discussed the pricing options. Lead requested a site visit to view sample flat next weekend.",
      duration: "6m 45s",
      status: "Completed",
      actorName: lead.assignedToName || "Sales Executive",
      createdAt: new Date(baseDate.getTime() + 72 * 60 * 60 * 1000).toISOString(),
    });
  }

  return comms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getLeadProfileDetail = async (leadId) => {
  const lead = getLeadById(leadId);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  const profile = serializeLead(lead);
  
  const siteVisits = state.siteVisits
    .filter((visit) => visit.leadId === leadId)
    .map(serializeSiteVisit);

  const activities = getLeadActivityTimeline(profile);
  const communications = getLeadCommunicationHistory(profile);

  const followUps = [
    {
      id: `fu-${leadId}-next`,
      scheduledAt: profile.followUpAt,
      status: new Date(profile.followUpAt) < new Date() ? "Overdue" : "Pending",
      notes: profile.notes || "Standard follow-up regarding unit configuration and budget alignment.",
      actorName: profile.assignedToName,
      createdAt: new Date(new Date(profile.followUpAt).getTime() - 24 * 60 * 60 * 1000).toISOString(),
    }
  ];
  
  if (profile.stage !== "New") {
    followUps.push({
      id: `fu-${leadId}-prev1`,
      scheduledAt: new Date(new Date(profile.followUpAt).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "Completed",
      notes: "Followed up on email quote. Lead requested pricing details.",
      actorName: profile.assignedToName,
      createdAt: new Date(new Date(profile.followUpAt).getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return {
    profile,
    activities,
    siteVisits,
    communications,
    followUps,
  };
};

const getLeadPipeline = () => {
  const activeStages = stageOrder.filter(
    (stage) => !["Closed Won", "Closed Lost"].includes(stage),
  );
  const grouped = activeStages.map((stage) => ({
    stage,
    leads: state.leads
      .filter((lead) => lead.stage === stage)
      .map(serializeLead),
  }));

  return {
    stages: grouped,
    totals: {
      activeLeads: grouped.reduce((sum, stage) => sum + stage.leads.length, 0),
      won: state.leads.filter((lead) => lead.stage === "Closed Won").length,
      lost: state.leads.filter((lead) => lead.stage === "Closed Lost").length,
    },
  };
};

const createLead = async (payload, actorId) => {
  const firstName = `${payload.firstName || ""}`.trim();
  const lastName = `${payload.lastName || ""}`.trim();
  const phone = `${payload.phone || ""}`.trim();

  if (
    !firstName ||
    !phone ||
    !payload.preferredProjectId ||
    !payload.assignedTo ||
    !payload.source
  ) {
    throw createHttpError(
      400,
      "Lead first name, phone, project, owner, and source are required",
    );
  }

  const project = getProjectById(payload.preferredProjectId);
  if (!project) {
    throw createHttpError(400, "Preferred project does not exist");
  }

  if (!getUserById(payload.assignedTo)) {
    throw createHttpError(400, "Assigned owner does not exist");
  }

  if (payload.brokerId && !getBrokerById(payload.brokerId)) {
    throw createHttpError(400, "Broker does not exist");
  }

  const now = new Date().toISOString();
  const lead = {
    id: `lead-${randomUUID()}`,
    firstName,
    lastName,
    phone,
    email: `${payload.email || ""}`.trim(),
    source: payload.source,
    assignedTo: payload.assignedTo,
    brokerId: payload.brokerId || null,
    preferredProjectId: payload.preferredProjectId,
    preferredConfiguration:
      `${payload.preferredConfiguration || ""}`.trim() || "Flexible",
    budgetMin: Number(payload.budgetMin) || 0,
    budgetMax: Number(payload.budgetMax) || Number(payload.budgetMin) || 0,
    stage: "New",
    followUpAt: payload.followUpAt || now,
    notes: `${payload.notes || ""}`.trim(),
    createdAt: now,
    updatedAt: now,
  };

  state.leads.unshift(lead);
  logAudit({
    title: "Lead captured from ERP workspace",
    detail: `${firstName} ${lastName}`.trim() + ` added for ${project.name}.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return serializeLead(lead);
};

const updateLead = async (leadId, payload, actorId) => {
  const lead = getLeadById(leadId);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (
    payload.preferredProjectId &&
    !getProjectById(payload.preferredProjectId)
  ) {
    throw createHttpError(400, "Preferred project does not exist");
  }

  if (payload.assignedTo && !getUserById(payload.assignedTo)) {
    throw createHttpError(400, "Assigned owner does not exist");
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "brokerId") &&
    payload.brokerId &&
    !getBrokerById(payload.brokerId)
  ) {
    throw createHttpError(400, "Broker does not exist");
  }

  const previousOwnerId = lead.assignedTo;
  const previousFollowUpAt = lead.followUpAt;

  if (Object.prototype.hasOwnProperty.call(payload, "firstName")) {
    lead.firstName = `${payload.firstName || ""}`.trim() || lead.firstName;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "lastName")) {
    lead.lastName = `${payload.lastName || ""}`.trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
    lead.phone = `${payload.phone || ""}`.trim() || lead.phone;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    lead.email = `${payload.email || ""}`.trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "source")) {
    lead.source = `${payload.source || ""}`.trim() || lead.source;
  }
  if (payload.assignedTo) {
    lead.assignedTo = payload.assignedTo;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "brokerId")) {
    lead.brokerId = payload.brokerId || null;
  }
  if (payload.preferredProjectId) {
    lead.preferredProjectId = payload.preferredProjectId;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "preferredConfiguration")) {
    lead.preferredConfiguration =
      `${payload.preferredConfiguration || ""}`.trim() ||
      lead.preferredConfiguration;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "budgetMin")) {
    lead.budgetMin = Number(payload.budgetMin) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "budgetMax")) {
    lead.budgetMax =
      Number(payload.budgetMax) || Number(payload.budgetMin) || lead.budgetMax;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "followUpAt")) {
    lead.followUpAt = payload.followUpAt || lead.followUpAt;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "notes")) {
    lead.notes = `${payload.notes || ""}`.trim();
  }
  lead.updatedAt = new Date().toISOString();

  const ownerChanged = previousOwnerId !== lead.assignedTo;
  const followUpChanged = previousFollowUpAt !== lead.followUpAt;
  const ownerName = getUserById(lead.assignedTo)?.name || "Unknown";

  logAudit({
    title: followUpChanged ? "Lead follow-up updated" : "Lead updated",
    detail: ownerChanged
      ? `${lead.firstName} ${lead.lastName} reassigned to ${ownerName}.`
      : followUpChanged
        ? `${lead.firstName} ${lead.lastName} follow-up moved to ${lead.followUpAt}.`
        : `${lead.firstName} ${lead.lastName} lead details were refreshed.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return serializeLead(lead);
};

const advanceLeadStage = async (leadId, nextStage, actorId) => {
  const lead = getLeadById(leadId);
  if (!lead) {
    throw createHttpError(404, "Lead not found");
  }

  if (!stageOrder.includes(nextStage)) {
    throw createHttpError(400, "Invalid sales stage");
  }

  lead.stage = nextStage;
  lead.updatedAt = new Date().toISOString();

  logAudit({
    title: "Lead stage updated",
    detail: `${lead.firstName} ${lead.lastName} moved to ${nextStage}.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return serializeLead(lead);
};

const listSiteVisits = () => ({
  visits: state.siteVisits
    .map(serializeSiteVisit)
    .sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() -
        new Date(right.scheduledAt).getTime(),
    ),
  coordinators: salesUsers,
});

const getSiteVisitDetail = (visitId) => {
  const visit = state.siteVisits.find((v) => v.id === visitId);
  if (!visit) {
    throw createHttpError(404, "Site visit not found");
  }

  const serialized = serializeSiteVisit(visit);
  const lead = getLeadById(visit.leadId);
  const project = getProjectById(visit.projectId);
  const coordinator = getUserById(visit.coordinatorId);

  let leadProfile = null;
  if (lead) {
    try {
      leadProfile = getLeadProfileDetail(visit.leadId);
    } catch (e) {
      leadProfile = serializeLead(lead);
    }
  }

  return {
    visit: {
      ...serialized,
      notes: visit.notes || "No additional notes provided.",
      followUpDate: visit.followUpDate || null,
      reminderSettings: visit.reminderSettings || { email: true, sms: true, whatsapp: false },
      conversionScore: visit.conversionScore || Math.floor(Math.random() * 30) + 65,
    },
    lead: leadProfile,
    project,
    coordinator,
  };
};

const createSiteVisit = async (payload, actorId) => {
  const lead = getLeadById(payload.leadId);
  const project = getProjectById(payload.projectId);
  const coordinator = getUserById(payload.coordinatorId);

  if (!lead || !project || !coordinator || !payload.scheduledAt) {
    throw createHttpError(
      400,
      "Lead, project, coordinator, and schedule time are required",
    );
  }

  const visit = {
    id: `visit-${randomUUID()}`,
    leadId: payload.leadId,
    projectId: payload.projectId,
    scheduledAt: payload.scheduledAt,
    coordinatorId: payload.coordinatorId,
    status: payload.status || "Scheduled",
    outcome: `${payload.outcome || ""}`.trim() || "Site walkthrough scheduled",
    notes: `${payload.notes || ""}`.trim() || "Initial tour scheduled",
    followUpDate: payload.followUpDate || null,
    reminderSettings: payload.reminderSettings || { email: true, sms: true, whatsapp: false },
    conversionScore: payload.conversionScore || Math.floor(Math.random() * 30) + 65,
    createdAt: new Date().toISOString(),
  };

  state.siteVisits.unshift(visit);
  lead.stage = "Site Visit Scheduled";
  lead.updatedAt = new Date().toISOString();

  logAudit({
    title: "Site visit scheduled",
    detail: `${lead.firstName} ${lead.lastName} scheduled for ${project.name}.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return serializeSiteVisit(visit);
};

const updateSiteVisit = async (visitId, payload, actorId) => {
  const visit = state.siteVisits.find((v) => v.id === visitId);
  if (!visit) {
    throw createHttpError(404, "Site visit not found");
  }

  if (payload.leadId) visit.leadId = payload.leadId;
  if (payload.projectId) {
    if (!getProjectById(payload.projectId)) {
      throw createHttpError(400, "Project does not exist");
    }
    visit.projectId = payload.projectId;
  }
  if (payload.scheduledAt) visit.scheduledAt = payload.scheduledAt;
  if (payload.coordinatorId) {
    if (!getUserById(payload.coordinatorId)) {
      throw createHttpError(400, "Coordinator does not exist");
    }
    visit.coordinatorId = payload.coordinatorId;
  }
  if (payload.status) {
    visit.status = payload.status;

    const lead = getLeadById(visit.leadId);
    if (lead) {
      if (payload.status === "Completed") {
        lead.stage = "Negotiation";
        lead.updatedAt = new Date().toISOString();
      } else if (payload.status === "No Show") {
        lead.updatedAt = new Date().toISOString();
      }
    }
  }
  if (payload.outcome !== undefined) visit.outcome = payload.outcome;
  if (payload.notes !== undefined) visit.notes = payload.notes;
  if (payload.followUpDate !== undefined) visit.followUpDate = payload.followUpDate;
  if (payload.reminderSettings !== undefined) visit.reminderSettings = payload.reminderSettings;
  if (payload.conversionScore !== undefined) visit.conversionScore = payload.conversionScore;

  logAudit({
    title: "Site visit updated",
    detail: `Site visit ${visitId} updated to ${visit.status} status.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return serializeSiteVisit(visit);
};

const listCustomers = (query = {}) => {
  const search = `${query.search || ""}`.trim().toLowerCase();

  return {
    customers: state.customers
      .map(serializeCustomer)
      .filter((customer) => {
        if (!search) {
          return true;
        }

        return (
          customer.name.toLowerCase().includes(search) ||
          customer.phone.toLowerCase().includes(search) ||
          (customer.email || "").toLowerCase().includes(search)
        );
      })
      .sort((left, right) => right.totalBookedValue - left.totalBookedValue),
    brokers: clone(state.brokers),
  };
};

const createCustomer = async (payload, actorId) => {
  const name = `${payload.name || ""}`.trim();
  const phone = `${payload.phone || ""}`.trim();
  const email = `${payload.email || ""}`.trim();

  if (!name || !phone) {
    throw createHttpError(400, "Customer name and phone are required");
  }

  const duplicate = state.customers.find(
    (customer) =>
      customer.phone === phone ||
      (email && customer.email && customer.email.toLowerCase() === email.toLowerCase()),
  );

  if (duplicate) {
    throw createHttpError(409, "Customer with this phone or email already exists");
  }

  const customer = {
    id: `customer-${randomUUID()}`,
    name,
    phone,
    email,
    sourceLeadId: payload.sourceLeadId || null,
    type: payload.type || "End User",
    sourceType: payload.sourceType || "Direct",
    tags: Array.isArray(payload.tags)
      ? payload.tags
      : `${payload.tags || ""}`
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    notes: payload.notes || "",
    remarks: payload.remarks || "",
    preferences: payload.preferences || "",
    createdAt: new Date().toISOString(),
  };

  state.customers.unshift(customer);
  logAudit({
    title: "Customer added to portfolio",
    detail: `${name} was added to the customer intelligence center.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return serializeCustomer(customer);
};

const createBroker = async (payload, actorId) => {
  const name = `${payload.name || ""}`.trim();
  const commissionRate = Number(payload.commissionRate);

  if (!name) {
    throw createHttpError(400, "Broker name is required");
  }

  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    throw createHttpError(400, "Broker commission rate must be between 0 and 100");
  }

  const duplicate = state.brokers.find(
    (broker) => broker.name.toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) {
    throw createHttpError(409, "Broker with this name already exists");
  }

  const broker = {
    id: `broker-${randomUUID()}`,
    name,
    companyName: payload.companyName || "",
    phone: payload.phone || "",
    email: payload.email || "",
    licenseNumber: payload.licenseNumber || "",
    commissionRate,
    activeDeals: 0,
    preferredProjects: Array.isArray(payload.preferredProjects) ? payload.preferredProjects : [],
    status: payload.status || "Active",
    notes: payload.notes || "",
    tags: Array.isArray(payload.tags) ? payload.tags : typeof payload.tags === "string" ? payload.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    createdAt: new Date().toISOString(),
  };

  state.brokers.unshift(broker);
  logAudit({
    title: "Broker added to sales register",
    detail: `${name} was added with ${commissionRate}% commission.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return clone(broker);
};

const updateBroker = async (brokerId, payload, actorId) => {
  if (!state.brokers) {
    state.brokers = [];
  }
  const index = state.brokers.findIndex((b) => b.id === brokerId);
  if (index === -1) {
    throw createHttpError(404, "Broker not found");
  }

  const broker = state.brokers[index];

  if (payload.name && payload.name.trim().toLowerCase() !== broker.name.toLowerCase()) {
    const name = payload.name.trim();
    const duplicate = state.brokers.find(
      (b) => b.id !== brokerId && b.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      throw createHttpError(409, "Broker with this name already exists");
    }
  }

  let commissionRate = broker.commissionRate;
  if (payload.commissionRate !== undefined) {
    commissionRate = Number(payload.commissionRate);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      throw createHttpError(400, "Broker commission rate must be between 0 and 100");
    }
  }

  const updatedBroker = {
    ...broker,
    ...payload,
    commissionRate,
    updatedAt: new Date().toISOString(),
  };

  // Convert tags if string
  if (payload.tags && typeof payload.tags === "string") {
    updatedBroker.tags = payload.tags.split(",").map(t => t.trim()).filter(Boolean);
  }

  state.brokers[index] = updatedBroker;

  logAudit({
    title: "Broker updated in sales register",
    detail: `Broker "${broker.name}" details/status updated.`,
    actorId,
    category: "Sales",
  });

  await persistState();
  return clone(updatedBroker);
};

const listProjects = () => {
  const projects = state.projects.map((project) => {
    const units = getAllUnits().filter((unit) => unit.projectId === project.id);

    return {
      id: project.id,
      name: project.name,
      code: project.code,
      location: project.location,
      stage: project.stage,
      managerName: getUserById(project.managerId)?.name || "Unassigned",
      totalUnits: units.length,
      availableUnits: units.filter((unit) => unit.status === "available")
        .length,
      bookedUnits: units.filter((unit) => unit.status === "booked").length,
      inventoryValue: units.reduce((sum, unit) => sum + unit.finalPrice, 0),
    };
  });

  return {
    projects,
    units: getAllUnits(),
  };
};

const createProject = async (payload, actorId) => {
  if (!payload.name || !payload.code || !payload.location) {
    throw createHttpError(400, "Name, code, and location are required");
  }

  const project = {
    id: `project-${randomUUID()}`,
    name: payload.name,
    code: `${payload.code}`.trim().toUpperCase(),
    location: payload.location,
    managerId: payload.managerId || actorId,
    stage: payload.stage || "Execution Planning",
    towers: [],
  };

  state.projects.unshift(project);
  logAudit({
    title: "Project created",
    detail: `${project.name} was added for ${project.location}.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return listProjects().projects.find((item) => item.id === project.id);
};

const listUnits = (query = {}) => {
  const search = `${query.search || ""}`.trim().toLowerCase();
  const projectId = query.projectId;
  const status = query.status;
  const onlyAvailable = `${query.onlyAvailable || ""}` === "true";
  const reservedByLeadId = query.reservedByLeadId || "";

  return getAllUnits()
    .filter((unit) => {
      const matchesSearch =
        !search ||
        unit.code.toLowerCase().includes(search) ||
        unit.projectName.toLowerCase().includes(search) ||
        unit.configuration.toLowerCase().includes(search);
      const matchesProject = !projectId || unit.projectId === projectId;
      const matchesStatus = !status || unit.status === status;
      const matchesAvailability =
        !onlyAvailable ||
        unit.status === "available" ||
        (unit.status === "reserved" && unit.leadId === reservedByLeadId);

      return (
        matchesSearch && matchesProject && matchesStatus && matchesAvailability
      );
    })
    .sort(
      (left, right) =>
        left.projectName.localeCompare(right.projectName) ||
        left.code.localeCompare(right.code),
    );
};

const listBookings = () => ({
  bookings: state.bookings
    .map(serializeBooking)
    .sort(
      (left, right) =>
        new Date(right.bookingDate).getTime() -
        new Date(left.bookingDate).getTime(),
    ),
  paymentPlanTypes,
});

const createOrReuseCustomer = ({ name, phone, email, sourceLeadId }) => {
  const existing = state.customers.find(
    (customer) =>
      customer.phone === phone ||
      (email &&
        customer.email &&
        customer.email.toLowerCase() === email.toLowerCase()),
  );

  if (existing) {
    existing.name = name || existing.name;
    existing.email = email || existing.email;
    return existing;
  }

  const customer = {
    id: `customer-${randomUUID()}`,
    name,
    phone,
    email,
    sourceLeadId,
    createdAt: new Date().toISOString(),
  };

  state.customers.unshift(customer);
  return customer;
};

const createBooking = async (payload, actorId) => {
  const lead = getLeadById(payload.leadId);
  const unitContext = getUnitContext(payload.unitId);
  const paymentPlanType = payload.paymentPlanType;

  if (!lead || !unitContext || !paymentPlanTypes.includes(paymentPlanType)) {
    throw createHttpError(400, "Lead, unit, and payment plan are required");
  }

  if (unitContext.unit.status !== "available") {
    const isReservedForLead = unitContext.unit.status === "reserved" && state.reservations?.some((r) => r.unitId === payload.unitId && r.leadId === payload.leadId && r.status === "Active" && new Date(r.expiresAt).getTime() > Date.now());
    if (!isReservedForLead) {
      throw createHttpError(409, "Selected unit is no longer available");
    }
  }

  const customer = createOrReuseCustomer({
    name: `${payload.customerName || `${lead.firstName} ${lead.lastName}`}`.trim(),
    phone: `${payload.customerPhone || lead.phone}`.trim(),
    email: `${payload.customerEmail || lead.email || ""}`.trim(),
    sourceLeadId: lead.id,
  });

  const bookingDate = new Date().toISOString();
  const booking = {
    id: `booking-${randomUUID()}`,
    leadId: lead.id,
    customerId: customer.id,
    projectId: unitContext.project.id,
    unitId: unitContext.unit.id,
    paymentPlanType,
    totalAmount: unitContext.unit.finalPrice,
    outstandingAmount: unitContext.unit.finalPrice,
    status: "Active",
    agreementStatus: "Draft Agreement",
    bookingDate,
    createdBy: actorId,
    schedule: buildPaymentSchedule(
      `booking-${randomUUID()}`,
      unitContext.unit.finalPrice,
      paymentPlanType,
      bookingDate,
    ),
  };

  booking.schedule = buildPaymentSchedule(
    booking.id,
    unitContext.unit.finalPrice,
    paymentPlanType,
    bookingDate,
  );
  state.bookings.unshift(booking);
  unitContext.unit.status = "booked";
  unitContext.unit.bookingId = booking.id;
  unitContext.unit.customerId = customer.id;
  lead.stage = "Closed Won";
  lead.updatedAt = bookingDate;

  if (state.reservations) {
    state.reservations = state.reservations.filter((r) => !(r.unitId === booking.unitId && r.leadId === booking.leadId));
  }

  logAudit({
    title: "Booking confirmed from ERP workspace",
    detail: `${customer.name} booked ${unitContext.unit.code} in ${unitContext.project.name}.`,
    actorId,
    category: "Bookings",
  });

  await persistState();
  return serializeBooking(booking);
};

const cancelBooking = async (bookingId, payload, actorId) => {
  const booking = getBookingById(bookingId);
  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  if (!isActiveBooking(booking)) {
    throw createHttpError(409, "Only active bookings can be cancelled");
  }

  const totalPaid = state.receipts
    .filter((receipt) => receipt.bookingId === booking.id)
    .reduce((sum, receipt) => sum + receipt.amount, 0);

  if (totalPaid > 0) {
    throw createHttpError(
      409,
      "Booking cannot be cancelled after receipts are recorded",
    );
  }

  const now = new Date().toISOString();
  const lead = getLeadById(booking.leadId);
  const customer = getCustomerById(booking.customerId);
  const unitContext = getUnitContext(booking.unitId);
  const reason =
    `${payload?.reason || ""}`.trim() || "Cancelled from sales operations workspace";

  booking.status = "Cancelled";
  booking.agreementStatus = "Released";
  booking.outstandingAmount = 0;
  booking.cancelledAt = now;
  booking.cancellationReason = reason;
  booking.schedule = booking.schedule.map((entry) => ({
    ...entry,
    status: entry.status === "Paid" ? entry.status : "Cancelled",
  }));

  if (unitContext) {
    unitContext.unit.status = "available";
    unitContext.unit.bookingId = null;
    unitContext.unit.customerId = null;
  }

  if (lead && lead.stage === "Closed Won") {
    lead.stage = "Negotiation";
    lead.updatedAt = now;
  }

  logAudit({
    title: "Booking cancelled and inventory released",
    detail: `${customer?.name || "Customer"} booking for ${unitContext?.unit.code || "unit"} was cancelled.`,
    actorId,
    category: "Bookings",
  });

  await persistState();
  return serializeBooking(booking);
};

const recordReceipt = async (payload, actorId) => {
  const booking = getBookingById(payload.bookingId);
  const amount = Number(payload.amount) || 0;

  if (!booking || amount <= 0) {
    throw createHttpError(400, "Booking and a positive amount are required");
  }

  if (amount > booking.outstandingAmount) {
    throw createHttpError(
      400,
      "Receipt amount cannot exceed outstanding amount",
    );
  }

  const receipt = {
    id: `receipt-${randomUUID()}`,
    bookingId: booking.id,
    amount,
    mode: payload.mode || "NEFT",
    reference: `${payload.reference || ""}`.trim() || `AUTO-${Date.now()}`,
    receivedAt: new Date().toISOString(),
    collectedBy: actorId,
  };

  state.receipts.unshift(receipt);
  applyReceiptToBooking(receipt);

  const customer = getCustomerById(booking.customerId);
  logAudit({
    title: "Receipt recorded",
    detail: `INR ${amount.toLocaleString("en-IN")} collected from ${customer?.name || "customer"}.`,
    actorId,
    category: "Collections",
  });

  await persistState();
  return {
    receipt,
    booking: serializeBooking(booking),
  };
};

const listReceipts = () => ({
  receipts: state.receipts
    .map((receipt) => ({
      ...receipt,
      customerName:
        getCustomerById(getBookingById(receipt.bookingId)?.customerId)?.name ||
        "Unknown customer",
      projectName:
        getProjectById(getBookingById(receipt.bookingId)?.projectId)?.name ||
        "Unknown project",
      collectedByName: getUserById(receipt.collectedBy)?.name || "Unknown",
    }))
    .sort(
      (left, right) =>
        new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime(),
    ),
});

const getCollectionsSummary = () => {
  const totalReceipts = state.receipts.reduce(
    (sum, receipt) => sum + receipt.amount,
    0,
  );
  const activeBookings = listActiveBookings();
  const outstanding = activeBookings.reduce(
    (sum, booking) => sum + booking.outstandingAmount,
    0,
  );
  const now = Date.now();
  const fourteenDays = now + 14 * 24 * 60 * 60 * 1000;

  const dueSoonSchedules = activeBookings.flatMap((booking) =>
    booking.schedule
      .filter(
        (entry) =>
          entry.status !== "Paid" &&
          new Date(entry.dueDate).getTime() <= fourteenDays,
      )
      .map((entry) => ({
        bookingId: booking.id,
        customerName:
          getCustomerById(booking.customerId)?.name || "Unknown customer",
        unitCode: getUnitDisplay(booking.unitId)?.code || "Unknown unit",
        projectName:
          getProjectById(booking.projectId)?.name || "Unknown project",
        ...entry,
      })),
  );

  return {
    totalReceipts,
    outstanding,
    dueSoonAmount: dueSoonSchedules.reduce(
      (sum, item) => sum + (item.amount - item.paidAmount),
      0,
    ),
    overdueCount: activeBookings
      .flatMap((booking) => booking.schedule)
      .filter(
        (entry) =>
          entry.status !== "Paid" && new Date(entry.dueDate).getTime() < now,
      ).length,
    dueSoonSchedules: dueSoonSchedules
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      )
      .slice(0, 8),
    recentReceipts: state.receipts.slice(0, 8).map((receipt) => ({
      ...receipt,
      bookingId: receipt.bookingId,
      customerName:
        getCustomerById(getBookingById(receipt.bookingId)?.customerId)?.name ||
        "Unknown customer",
      collectedByName: getUserById(receipt.collectedBy)?.name || "Unknown",
    })),
  };
};

const getDashboardSummary = () => {
  const leadStats = getLeadStats();
  const projects = listProjects().projects;
  const collections = getCollectionsSummary();

  return {
    kpis: {
      activeLeads: leadStats.activeLeads,
      scheduledVisits: leadStats.scheduledVisits,
      activeBookings: listActiveBookings().length,
      totalOutstanding: collections.outstanding,
    },
    projectPortfolio: projects,
    recentActivity: clone(state.auditLogs.slice(0, 8)),
    upcomingFollowUps: state.leads
      .map(serializeLead)
      .filter((lead) => !["Closed Won", "Closed Lost"].includes(lead.stage))
      .sort(
        (left, right) =>
          new Date(left.followUpAt).getTime() -
          new Date(right.followUpAt).getTime(),
      )
      .slice(0, 6),
    collections,
  };
};

const getFinancialOverview = () => {
  const collections = getCollectionsSummary();
  const projectBreakdown = listActiveBookings().map((booking) => {
    const project = getProjectById(booking.projectId);
    const customer = getCustomerById(booking.customerId);
    return {
      bookingId: booking.id,
      projectName: project?.name || "Unknown project",
      customerName: customer?.name || "Unknown customer",
      totalAmount: booking.totalAmount,
      outstandingAmount: booking.outstandingAmount,
      paymentPlanType: booking.paymentPlanType,
    };
  });

  return {
    ...collections,
    projectBreakdown,
  };
};

const serializeApproval = (approval) => ({
  ...approval,
  requestedByName: getUserById(approval.requestedBy)?.name || "Unknown",
  ownerName: getUserById(approval.ownerId)?.name || "Unknown",
  actedByName: approval.actedBy
    ? getUserById(approval.actedBy)?.name || "Unknown"
    : null,
});

const getApprovalsSummary = () => {
  const approvals = state.approvals
    .map(serializeApproval)
    .sort(
      (left, right) =>
        new Date(right.submittedAt).getTime() -
        new Date(left.submittedAt).getTime(),
    );
  return {
    approvals,
    summary: {
      pending: approvals.filter((item) => item.status === "Pending").length,
      approvedThisWeek: approvals.filter((item) => item.status === "Approved")
        .length,
      overdue: approvals.filter(
        (item) =>
          item.status === "Pending" &&
          new Date(item.dueAt).getTime() < Date.now(),
      ).length,
      highPriority: approvals.filter(
        (item) => item.priority === "High" && item.status === "Pending",
      ).length,
    },
  };
};

const getApprovalByIdDetail = (id) => {
  const approval = getApprovalById(id);
  if (!approval) return null;

  const serialized = serializeApproval(approval);

  // Initialize timeline if not exists or empty
  if (!serialized.timeline || serialized.timeline.length === 0) {
    serialized.timeline = [
      {
        id: `tl-1`,
        event: "Request submitted",
        status: "Submitted",
        actorId: approval.requestedBy,
        actorName: serialized.requestedByName,
        timestamp: approval.submittedAt,
        notes: "Initial approval request created in the pipeline.",
      },
      {
        id: `tl-2`,
        event: "Assigned to Approver",
        status: "Assigned",
        actorId: approval.ownerId,
        actorName: serialized.ownerName,
        timestamp: approval.submittedAt,
        notes: `Assigned automatically based on delegation matrix.`,
      }
    ];

    if (approval.status !== "Pending") {
      serialized.timeline.push({
        id: `tl-3`,
        event: `Request ${approval.status}`,
        status: approval.status,
        actorId: approval.actedBy,
        actorName: serialized.actedByName || "Approver",
        timestamp: approval.actedAt || new Date().toISOString(),
        notes: approval.status === "Approved" ? "Approved and released." : "Rejected with feedback.",
      });
      serialized.timeline.push({
        id: `tl-4`,
        event: "Workflow Completed",
        status: "Completed",
        actorId: approval.actedBy,
        actorName: serialized.actedByName || "Approver",
        timestamp: approval.actedAt || new Date().toISOString(),
        notes: "Process finalized.",
      });
    }
  }

  // Initialize comments if not exists or empty
  if (!serialized.comments || serialized.comments.length === 0) {
    serialized.comments = [
      {
        id: `cm-1`,
        actorId: approval.requestedBy,
        actorName: serialized.requestedByName,
        content: approval.summary || "No description provided.",
        timestamp: approval.submittedAt,
      }
    ];
    if (approval.status === "Rejected") {
      serialized.comments.push({
        id: `cm-2`,
        actorId: approval.actedBy || "user-manager",
        actorName: serialized.actedByName || "Operations Manager",
        content: "Rejected: Price exceeds standard variance limits.",
        timestamp: approval.actedAt || new Date().toISOString(),
      });
    }
  }

  // Prepare linkedEntitySummary
  let linkedEntitySummary = null;
  if (approval.requestType === "Purchase order approval" && approval.relatedEntityId) {
    const order = getPurchaseOrderById(approval.relatedEntityId);
    if (order) {
      linkedEntitySummary = {
        id: order.id,
        type: "Purchase Order",
        code: order.poNumber || `PO-${order.id.slice(-6)}`,
        vendorName: getVendorById(order.vendorId)?.name || "Unknown Vendor",
        amount: order.amount,
        status: order.status,
        itemsCount: order.items?.length || 0,
        date: order.createdAt,
      };
    }
  } else if (approval.module === "Bookings") {
    linkedEntitySummary = {
      id: approval.relatedEntityId || "bk-aurora-1202",
      type: "Booking Price Override",
      code: "AUR-A-1202",
      vendorName: "Priya Sharma (Customer)",
      amount: 12500000,
      status: approval.status,
      itemsCount: 1,
      date: approval.submittedAt,
      details: "Aurora Heights Tower A - Unit 1202 price deviation approval."
    };
  } else if (approval.module === "Finance") {
    linkedEntitySummary = {
      id: approval.relatedEntityId || "fin-skyline-88",
      type: "Commission Release",
      code: "COM-SKY-88",
      vendorName: "Metro Realtors (Broker)",
      amount: 250000,
      status: approval.status,
      itemsCount: 1,
      date: approval.submittedAt,
      details: "Skyline Towers booking broker commission payout clearance."
    };
  } else {
    linkedEntitySummary = {
      id: approval.relatedEntityId || approval.id,
      type: approval.requestType || "General",
      code: approval.id,
      vendorName: "N/A",
      amount: 0,
      status: approval.status,
      itemsCount: 0,
      date: approval.submittedAt,
      details: approval.summary
    };
  }

  // Prepare approvalMetrics
  const submittedDate = new Date(approval.submittedAt);
  const actedDate = approval.actedAt ? new Date(approval.actedAt) : new Date();
  const diffTime = Math.abs(actedDate.getTime() - submittedDate.getTime());
  const daysOpen = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let slaStatus = "Healthy";
  if (approval.status === "Pending") {
    const dueTime = new Date(approval.dueAt).getTime();
    const nowTime = Date.now();
    if (dueTime < nowTime) {
      slaStatus = "Overdue";
    } else if (dueTime - nowTime < 24 * 60 * 60 * 1000) {
      slaStatus = "Due Soon";
    }
  } else {
    if (approval.actedAt && approval.dueAt) {
      slaStatus = new Date(approval.actedAt).getTime() <= new Date(approval.dueAt).getTime() ? "Healthy" : "Breached";
    }
  }

  const hours = Math.round(diffTime / (1000 * 60 * 60));
  const actionTime = hours > 24 ? `${(hours / 24).toFixed(1)} days` : `${hours} hours`;

  const approvalMetrics = {
    daysOpen,
    slaStatus,
    actionTime,
    businessImpact: approval.priority === "High" ? "High - Procurement Blocker" : approval.priority === "Medium" ? "Medium - Process Flow" : "Low - Administrative",
  };

  return {
    ...serialized,
    timeline: serialized.timeline,
    comments: serialized.comments,
    linkedEntitySummary,
    approvalMetrics,
  };
};

const actOnApproval = async (approvalId, action, actorId, payload = {}) => {
  const approval = getApprovalById(approvalId);
  if (!approval) {
    throw createHttpError(404, "Approval request not found");
  }

  if (action === "comment") {
    if (!payload.comment) {
      throw createHttpError(400, "Comment content is required");
    }
    const details = getApprovalByIdDetail(approvalId);
    if (!approval.comments) approval.comments = details.comments || [];
    if (!approval.timeline) approval.timeline = details.timeline || [];

    const user = getUserById(actorId);
    approval.comments.push({
      id: `cm-${Date.now()}`,
      actorId,
      actorName: user?.name || "Unknown User",
      content: payload.comment,
      timestamp: new Date().toISOString(),
    });
    approval.timeline.push({
      id: `tl-${Date.now()}`,
      event: "Comment Added",
      status: approval.status,
      actorId,
      actorName: user?.name || "Unknown User",
      timestamp: new Date().toISOString(),
      notes: payload.comment,
    });
    await persistState();
    return serializeApproval(approval);
  }

  if (!["approve", "reject"].includes(action)) {
    throw createHttpError(400, "Approval action must be approve or reject");
  }

  approval.status = action === "approve" ? "Approved" : "Rejected";
  approval.actedAt = new Date().toISOString();
  approval.actedBy = actorId;

  // Initialize arrays in state
  const details = getApprovalByIdDetail(approvalId);
  if (!approval.comments) approval.comments = details.comments || [];
  if (!approval.timeline) approval.timeline = details.timeline || [];

  const actor = getUserById(actorId);

  approval.timeline.push({
    id: `tl-action-${Date.now()}`,
    event: `Request ${approval.status}`,
    status: approval.status,
    actorId,
    actorName: actor?.name || "Approver",
    timestamp: approval.actedAt,
    notes: action === "approve" ? "Approved and released." : (payload.reason || "Rejected with feedback."),
  });

  approval.timeline.push({
    id: `tl-comp-${Date.now()}`,
    event: "Workflow Completed",
    status: "Completed",
    actorId,
    actorName: actor?.name || "Approver",
    timestamp: approval.actedAt,
    notes: "Process finalized.",
  });

  if (action === "reject" && payload.reason) {
    approval.comments.push({
      id: `cm-rej-${Date.now()}`,
      actorId,
      actorName: actor?.name || "Approver",
      content: `Rejection Reason: ${payload.reason}`,
      timestamp: approval.actedAt,
    });
  }

  if (
    approval.requestType === "Purchase order approval" &&
    approval.relatedEntityId
  ) {
    const order = getPurchaseOrderById(approval.relatedEntityId);
    if (order) {
      order.status = action === "approve" ? "Released" : "Rejected";
    }
  }

  logAudit({
    title: `Approval ${approval.status.toLowerCase()}`,
    detail: `${approval.title} was ${approval.status.toLowerCase()} by the operations team.`,
    actorId,
    category: "Approvals",
  });

  await persistState();
  return serializeApproval(approval);
};

const serializeDocument = (document) => ({
  ...document,
  projectName: getProjectById(document.projectId)?.name || "General",
  ownerName: getUserById(document.ownerId)?.name || "Unknown",
  uploadedByName: getUserById(document.uploadedBy)?.name || "Unknown",
});

const getDocumentRegister = () => ({
  documents: state.documents
    .map(serializeDocument)
    .sort(
      (left, right) =>
        new Date(right.uploadedAt).getTime() -
        new Date(left.uploadedAt).getTime(),
    ),
  categories: [...new Set(state.documents.map((item) => item.category))],
});

const createDocumentRecord = async (payload, actorId) => {
  if (!payload.title || !payload.category || !payload.module) {
    throw createHttpError(
      400,
      "Document title, category, and module are required",
    );
  }

  const projectId = payload.projectId || null;
  if (projectId && !getProjectById(projectId)) {
    throw createHttpError(400, "Project does not exist for document record");
  }

  const document = {
    id: `doc-${randomUUID()}`,
    title: payload.title,
    category: payload.category,
    module: payload.module,
    projectId,
    relatedEntityId: payload.relatedEntityId || null,
    version: payload.version || "v1",
    status: payload.status || "Pending Review",
    ownerId: payload.ownerId || actorId,
    uploadedBy: actorId,
    uploadedAt: new Date().toISOString(),
    expiryDate: payload.expiryDate || null,
    fileUrl: payload.fileUrl || null,
    fileSize: payload.fileSize || null,
    mimeType: payload.mimeType || null,
    originalName: payload.originalName || null,
  };

  state.documents.unshift(document);
  logAudit({
    title: "Document registered",
    detail: `${document.title} added to the central document register.`,
    actorId,
    category: "Documents",
  });

  await persistState();
  return serializeDocument(document);
};

const serializeComplianceItem = (item) => ({
  ...item,
  projectName: getProjectById(item.projectId)?.name || "Unknown project",
  ownerName: getUserById(item.ownerId)?.name || "Unknown",
  documentTitle: item.documentId
    ? getDocumentById(item.documentId)?.title || null
    : null,
});

const getComplianceRegister = () => {
  const items = state.compliance
    .map(serializeComplianceItem)
    .sort(
      (left, right) =>
        new Date(left.expiryDate).getTime() -
        new Date(right.expiryDate).getTime(),
    );
  return {
    items,
    summary: {
      expiringSoon: items.filter((item) => item.status === "Expiring Soon")
        .length,
      inReview: items.filter((item) => item.status === "In Review").length,
      compliant: items.filter((item) => item.status === "Compliant").length,
    },
  };
};

const getApprovalAlerts = () => {
  const collections = getCollectionsSummary();
  const approvalAlerts = state.approvals
    .filter((item) => item.status === "Pending")
    .map((item) => ({
      id: `alert-${item.id}`,
      category: "Approval",
      title: item.title,
      severity: item.priority === "High" ? "Critical" : "High",
      ownerName: getUserById(item.ownerId)?.name || "Unknown",
      source: item.module,
      dueAt: item.dueAt,
      message: item.summary,
    }));

  const complianceAlerts = state.compliance
    .filter(
      (item) => item.status === "Expiring Soon" || item.status === "In Review",
    )
    .map((item) => ({
      id: `alert-${item.id}`,
      category: "Compliance",
      title: item.approvalType,
      severity: item.status === "Expiring Soon" ? "Critical" : "Medium",
      ownerName: getUserById(item.ownerId)?.name || "Unknown",
      source: getProjectById(item.projectId)?.name || "Compliance",
      dueAt: item.expiryDate,
      message: item.notes,
    }));

  const collectionAlerts = collections.dueSoonSchedules
    .slice(0, 4)
    .map((item) => ({
      id: `alert-${item.id}`,
      category: "Collections",
      title: `${item.customerName} payment due`,
      severity:
        new Date(item.dueDate).getTime() < Date.now() ? "Critical" : "High",
      ownerName: "Finance",
      source: item.projectName,
      dueAt: item.dueDate,
      message: `${item.label} for ${item.unitCode} remains outstanding.`,
    }));

  const alerts = [
    ...approvalAlerts,
    ...complianceAlerts,
    ...collectionAlerts,
    ...getProjectRiskInsights().alerts.map((item) => ({
      id: `alert-${item.id}`,
      category: "Projects",
      title: item.title,
      severity: item.severity,
      ownerName: item.ownerName || "Project Controls",
      source: item.projectName,
      dueAt: item.dueAt || new Date().toISOString(),
      message: item.detail,
    })),
  ].sort(
    (left, right) =>
      new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
  );

  return {
    alerts,
    summary: {
      critical: alerts.filter((item) => item.severity === "Critical").length,
      high: alerts.filter((item) => item.severity === "High").length,
      medium: alerts.filter((item) => item.severity === "Medium").length,
    },
  };
};

const updateWorkflowSetting = async (settingId, payload, actorId) => {
  const setting = state.workflowSettings.find((item) => item.id === settingId);
  if (!setting) {
    throw createHttpError(404, "Workflow setting not found");
  }

  setting.defaultValue = payload.defaultValue || setting.defaultValue;
  setting.status = payload.status || setting.status;

  logAudit({
    title: "Workflow setting updated",
    detail: `${setting.name} changed to ${setting.defaultValue}.`,
    actorId,
    category: "Settings",
  });

  await persistState();
  return clone(setting);
};

const updateNotificationSetting = async (settingId, payload, actorId) => {
  const setting = state.notificationSettings.find(
    (item) => item.id === settingId,
  );
  if (!setting) {
    throw createHttpError(404, "Notification setting not found");
  }

  setting.defaultValue = payload.defaultValue || setting.defaultValue;
  setting.status = payload.status || setting.status;

  logAudit({
    title: "Notification setting updated",
    detail: `${setting.name} changed to ${setting.defaultValue}.`,
    actorId,
    category: "Settings",
  });

  await persistState();
  return clone(setting);
};

const setWorkflowSettingValue = (code, defaultValue, status) => {
  const setting = getWorkflowSettingByCode(code);
  if (!setting) {
    return null;
  }

  if (typeof defaultValue !== "undefined") {
    setting.defaultValue = defaultValue;
  }
  if (status) {
    setting.status = status;
  }

  return setting;
};

const setNotificationSettingValue = (code, defaultValue, status) => {
  const setting = getNotificationSettingByCode(code);
  if (!setting) {
    return null;
  }

  if (typeof defaultValue !== "undefined") {
    setting.defaultValue = defaultValue;
  }
  if (status) {
    setting.status = status;
  }

  return setting;
};

const testWhatsAppIntegration = async (actorId) => {
  const testedAt = new Date().toISOString();
  setNotificationSettingValue("WHATSAPP_CHANNEL_STATUS", "Demo-connected", "Active");
  setNotificationSettingValue("WHATSAPP_LAST_ACTIVITY", testedAt, "Active");

  logAudit({
    title: "WhatsApp integration tested",
    detail: "Demo WhatsApp channel responded successfully to a simulated health check.",
    actorId,
    category: "Integrations",
  });

  await persistState();
  return {
    status: "Demo-connected",
    testedAt,
  };
};

const sendWhatsAppDemoNotification = async (actorId) => {
  const sentAt = new Date().toISOString();
  const recipient =
    getNotificationSettingByCode("WHATSAPP_DEFAULT_RECIPIENT")?.defaultValue ||
    "Configured demo contact";

  setNotificationSettingValue("WHATSAPP_CHANNEL_STATUS", "Demo-connected", "Active");
  setNotificationSettingValue("WHATSAPP_LAST_ACTIVITY", sentAt, "Active");

  logAudit({
    title: "WhatsApp demo notification sent",
    detail: `Simulated approval reminder sent to ${recipient}.`,
    actorId,
    category: "Integrations",
  });

  await persistState();
  return {
    status: "Sent",
    recipient,
    sentAt,
  };
};

const syncBiometricAttendance = async (actorId) => {
  const syncedAt = new Date().toISOString();
  const todayKey = syncedAt.slice(0, 10);
  const activeEmployees = state.employees.filter(
    (employee) => employee.status !== "Inactive",
  );
  const existingAttendanceIds = new Set(
    state.attendance
      .filter((item) => (item.checkIn || "").slice(0, 10) === todayKey)
      .map((item) => item.employeeId),
  );

  const importedEntries = activeEmployees
    .filter((employee) => !existingAttendanceIds.has(employee.id))
    .map((employee, index) => {
      const checkIn = new Date(syncedAt);
      checkIn.setMinutes(checkIn.getMinutes() - index * 4);
      return {
        id: `att-${randomUUID()}`,
        employeeId: employee.id,
        projectId: employee.projectId,
        shift: "Day",
        status: "Present",
        checkIn: checkIn.toISOString(),
        createdAt: syncedAt,
      };
    });

  if (importedEntries.length) {
    state.attendance.unshift(...importedEntries);
  }

  setWorkflowSettingValue("BIO_GATEWAY_STATUS", "Demo-connected", "Active");
  setWorkflowSettingValue("BIO_LAST_SYNC", syncedAt, "Active");

  logAudit({
    title: "Biometric sync simulated",
    detail: `${importedEntries.length} attendance records imported from demo biometric devices.`,
    actorId,
    category: "Integrations",
  });

  await persistState();
  return {
    status: "Demo-connected",
    syncedAt,
    importedCount: importedEntries.length,
  };
};

const getDashboardReports = () => {
  const leadStats = getLeadStats();
  const collections = getCollectionsSummary();
  const units = listUnits({});
  const employeesCount = state.employees.filter(
    (employee) => employee.status !== "Inactive",
  ).length;
  const attendanceSummary = listAttendance().summary;
  const totalLeadBase = leadStats.activeLeads + leadStats.bookedThisCycle;
  const leadConversionRate =
    totalLeadBase > 0
      ? Math.round((leadStats.bookedThisCycle / totalLeadBase) * 100)
      : 0;
  const averageProjectCompletion = state.projects.length
    ? Math.round(
        state.projects.reduce((sum, project) => {
          const projectTasks = state.projectTasks.filter(
            (task) => task.projectId === project.id,
          );
          const completion = projectTasks.length
            ? projectTasks.reduce((taskSum, task) => taskSum + task.completion, 0) /
              projectTasks.length
            : 0;
          return sum + completion;
        }, 0) / state.projects.length,
      )
    : 0;

  return {
    summaryCards: [
      {
        label: "Employee count",
        value: employeesCount,
        trend: "Active workforce in ERP",
      },
      {
        label: "Lead conversion rate",
        value: `${leadConversionRate}%`,
        trend: "Won vs active pipeline",
      },
      {
        label: "Project completion",
        value: `${averageProjectCompletion}%`,
        trend: "Average task-backed progress",
      },
      {
        label: "Attendance today",
        value: `${attendanceSummary.present}/${attendanceSummary.present + attendanceSummary.late + attendanceSummary.absent}`,
        trend: "Present vs total marked",
      },
      {
        label: "Available inventory",
        value: `${units.filter((unit) => unit.status === "available").length}`,
        trend: "Units ready to sell",
      },
      {
        label: "Due soon amount",
        value: collections.dueSoonAmount,
        trend: "Collections in 14-day window",
      },
      {
        label: "Pending approvals",
        value: state.approvals.filter((item) => item.status === "Pending")
          .length,
        trend: "Operational queue",
      },
    ],
    trendBuckets: [
      {
        label: "Leads by stage",
        items: getLeadStats().stageCounts.map((item) => ({
          label: item.stage,
          count: item.count,
        })),
      },
      {
        label: "Project booking load",
        items: listProjects().projects.map((project) => ({
          label: project.name,
          count: project.bookedUnits,
        })),
      },
      {
        label: "Attendance status",
        items: [
          { label: "Present", count: attendanceSummary.present },
          { label: "Late", count: attendanceSummary.late },
          { label: "Absent", count: attendanceSummary.absent },
        ],
      },
      {
        label: "Document backlog",
        items: ["Pending Review", "Approved", "Generated"].map((status) => ({
          label: status,
          count: state.documents.filter((item) => item.status === status)
            .length,
        })),
      },
    ],
  };
};

const getExecutiveDashboard = () => {
  const projects = listProjects().projects;
  const collections = getCollectionsSummary();
  const approvals = getApprovalsSummary();
  const compliance = getComplianceRegister();
  const riskInsights = getProjectRiskInsights();

  return {
    executiveKpis: {
      portfolioValue: projects.reduce(
        (sum, project) => sum + project.inventoryValue,
        0,
      ),
      collectionsOutstanding: collections.outstanding,
      approvalQueue: approvals.summary.pending,
      complianceExposure:
        compliance.summary.expiringSoon + compliance.summary.inReview,
    },
    watchlist: getApprovalAlerts().alerts.slice(0, 6),
    projectRiskBoard: riskInsights.projects.map((project) => ({
      id: project.id,
      projectName: project.projectName,
      bookedUnits: project.bookedUnits,
      availableUnits: project.availableUnits,
      stage: project.stage,
      riskLevel: project.riskLevel,
      riskScore: project.riskScore,
      openSignals: project.openSignals,
      primaryRisk: project.primaryRisk,
    })),
    executiveNotes: [
      riskInsights.projects[0]
        ? `${riskInsights.projects[0].projectName} is the highest-risk project at score ${riskInsights.projects[0].riskScore}, driven by ${riskInsights.projects[0].primaryRisk.toLowerCase()}.`
        : "Portfolio risk engine is not showing any active project delay triggers.",
      `Collections exposure remains at ${collections.dueSoonSchedules.length} due-soon schedules, while ${riskInsights.summary.materialSignals} material-risk trigger${riskInsights.summary.materialSignals === 1 ? "" : "s"} are active.`,
      `Approval queue stands at ${approvals.summary.pending}, and ${riskInsights.summary.workforceSignals} workforce-capacity signal${riskInsights.summary.workforceSignals === 1 ? "" : "s"} require project-control review.`,
    ],
  };
};

const serializeProjectTask = (task) => ({
  ...task,
  projectName: getProjectById(task.projectId)?.name || "Unknown project",
  ownerName: getUserById(task.ownerId)?.name || "Unknown",
});

const listProjectTasks = () => ({
  tasks: state.projectTasks
    .map(serializeProjectTask)
    .sort(
      (left, right) =>
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
    ),
  summary: {
    planned: state.projectTasks.filter((item) => item.status === "Planned")
      .length,
    inProgress: state.projectTasks.filter(
      (item) => item.status === "In Progress",
    ).length,
    review: state.projectTasks.filter((item) => item.status === "Review")
      .length,
    done: state.projectTasks.filter((item) => item.status === "Done").length,
  },
});

const createProjectTask = async (payload, actorId) => {
  if (!payload.projectId || !payload.title || !payload.ownerId || !payload.dueDate) {
    throw createHttpError(400, "Project, title, owner, and due date are required");
  }

  const status = payload.status || "Planned";
  const completionByStatus = {
    Planned: 0,
    "In Progress": 35,
    Review: 85,
    Done: 100,
  };

  const actorName = getUserById(actorId)?.name || "System";

  const task = {
    id: `tsk-${randomUUID()}`,
    projectId: payload.projectId,
    title: payload.title,
    ownerId: payload.ownerId,
    discipline: payload.discipline || "Projects",
    priority: payload.priority || "Medium",
    status,
    dueDate: payload.dueDate,
    completion:
      Number.isFinite(Number(payload.completion))
        ? Number(payload.completion)
        : completionByStatus[status] || 0,
    description: payload.description || "",
    startDate: payload.startDate || new Date().toISOString().split("T")[0],
    dependencies: payload.dependencies || "",
    notes: payload.notes || "",
    comments: [],
    documents: [],
    activityTimeline: [
      {
        id: `act-${randomUUID()}`,
        eventType: "Created",
        title: "Task Created",
        detail: `Task was created by ${actorName}.`,
        timestamp: new Date().toISOString(),
        actorName,
      }
    ],
    history: [
      {
        timestamp: new Date().toISOString(),
        actorName,
        change: "Task created."
      }
    ]
  };

  state.projectTasks.unshift(task);
  logAudit({
    title: "Project task created",
    detail: `${task.title} added for ${getProjectById(task.projectId)?.name || "project"}.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return serializeProjectTask(task);
};

const getProjectTask = (taskId) => {
  const task = state.projectTasks.find((item) => item.id === taskId);
  if (!task) {
    throw createHttpError(404, "Project task not found");
  }

  const defaultTimeline = [
    {
      id: `act-${randomUUID()}`,
      eventType: "Created",
      title: "Task Created",
      detail: `Task was initialized.`,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      actorName: "System",
    }
  ];

  const defaultHistory = [
    {
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      actorName: "System",
      change: "Task initialized."
    }
  ];

  const detailedTask = {
    description: task.description || "",
    startDate: task.startDate || (task.dueDate ? new Date(new Date(task.dueDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    dependencies: task.dependencies || "",
    notes: task.notes || "",
    comments: task.comments || [],
    documents: task.documents || [],
    activityTimeline: task.activityTimeline || defaultTimeline,
    history: task.history || defaultHistory,
    ...task,
  };

  return serializeProjectTask(detailedTask);
};

const updateProjectTask = async (taskId, payload, actorId) => {
  const taskIndex = state.projectTasks.findIndex((item) => item.id === taskId);
  if (taskIndex === -1) {
    throw createHttpError(404, "Project task not found");
  }

  const existingTask = state.projectTasks[taskIndex];
  const actorName = getUserById(actorId)?.name || "User";

  const changes = [];
  const updatedFields = {};

  const fieldsToCompare = [
    "title",
    "description",
    "projectId",
    "ownerId",
    "discipline",
    "priority",
    "status",
    "startDate",
    "dueDate",
    "completion",
    "dependencies",
    "notes"
  ];

  fieldsToCompare.forEach((field) => {
    if (payload[field] !== undefined && payload[field] !== existingTask[field]) {
      changes.push(`Changed ${field} from "${existingTask[field] !== undefined ? existingTask[field] : 'none'}" to "${payload[field]}"`);
      updatedFields[field] = payload[field];
    }
  });

  let comments = existingTask.comments || [];
  if (payload.commentText) {
    const comment = {
      id: `cmt-${randomUUID()}`,
      authorName: actorName,
      authorRole: getUserById(actorId)?.role || "Member",
      text: payload.commentText,
      timestamp: new Date().toISOString()
    };
    comments = [...comments, comment];
    changes.push(`Added comment: "${payload.commentText}"`);
  }

  let documents = existingTask.documents || [];
  if (payload.document) {
    const doc = {
      id: `doc-${randomUUID()}`,
      name: payload.document.name,
      url: payload.document.url,
      size: payload.document.size || "Unknown size",
      uploadedAt: new Date().toISOString()
    };
    documents = [...documents, doc];
    changes.push(`Uploaded document: "${payload.document.name}"`);
  }

  const defaultTimeline = [
    {
      id: `act-${randomUUID()}`,
      eventType: "Created",
      title: "Task Created",
      detail: `Task was initialized.`,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      actorName: "System",
    }
  ];

  const defaultHistory = [
    {
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      actorName: "System",
      change: "Task initialized."
    }
  ];

  const updatedTask = {
    ...existingTask,
    ...updatedFields,
    comments,
    documents,
    activityTimeline: existingTask.activityTimeline || defaultTimeline,
    history: existingTask.history || defaultHistory,
  };

  if (changes.length > 0) {
    updatedTask.activityTimeline = [...updatedTask.activityTimeline, {
      id: `act-${randomUUID()}`,
      eventType: payload.commentText ? "Comment" : payload.document ? "Document" : "Update",
      title: payload.commentText ? "Comment Added" : payload.document ? "Document Uploaded" : "Task Details Updated",
      detail: changes.join("; "),
      timestamp: new Date().toISOString(),
      actorName,
    }];

    changes.forEach((change) => {
      updatedTask.history.push({
        timestamp: new Date().toISOString(),
        actorName,
        change,
      });
    });
  }

  state.projectTasks[taskIndex] = updatedTask;

  logAudit({
    title: "Project task updated",
    detail: `${updatedTask.title} was updated by ${actorName}.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return serializeProjectTask(updatedTask);
};

const deleteProjectTask = async (taskId, actorId) => {
  const taskIndex = state.projectTasks.findIndex((item) => item.id === taskId);
  if (taskIndex === -1) {
    throw createHttpError(404, "Project task not found");
  }

  const task = state.projectTasks[taskIndex];
  state.projectTasks.splice(taskIndex, 1);

  logAudit({
    title: "Project task deleted",
    detail: `Task "${task.title}" was deleted.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return { id: taskId, success: true };
};

const advanceProjectTask = async (taskId, actorId) => {
  const task = state.projectTasks.find((item) => item.id === taskId);
  if (!task) {
    throw createHttpError(404, "Project task not found");
  }

  const actorName = getUserById(actorId)?.name || "System";
  const oldStatus = task.status;
  const flow = ["Planned", "In Progress", "Review", "Done"];
  const currentIndex = flow.indexOf(task.status);
  task.status = flow[Math.min(flow.length - 1, currentIndex + 1)];
  task.completion = Math.min(100, task.completion + 20);

  task.activityTimeline = task.activityTimeline || [
    {
      id: `act-${randomUUID()}`,
      eventType: "Created",
      title: "Task Created",
      detail: `Task was initialized.`,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      actorName: "System",
    }
  ];
  task.history = task.history || [
    {
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      actorName: "System",
      change: "Task initialized."
    }
  ];

  task.activityTimeline.push({
    id: `act-${randomUUID()}`,
    eventType: "StatusChange",
    title: "Status Advanced",
    detail: `Task advanced from "${oldStatus}" to "${task.status}". Completion: ${task.completion}%.`,
    timestamp: new Date().toISOString(),
    actorName,
  });

  task.history.push({
    timestamp: new Date().toISOString(),
    actorName,
    change: `Advanced status from "${oldStatus}" to "${task.status}". Completion: ${task.completion}%.`
  });

  logAudit({
    title: "Project task progressed",
    detail: `${task.title} moved to ${task.status}.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return serializeProjectTask(task);
};

const serializeDailyReport = (report) => ({
  ...report,
  projectName: getProjectById(report.projectId)?.name || "Unknown project",
  submittedByName: getUserById(report.submittedBy)?.name || "Unknown",
});

const listDailyReports = () => ({
  reports: state.dailyReports
    .map(serializeDailyReport)
    .sort(
      (left, right) =>
        new Date(right.reportDate).getTime() -
        new Date(left.reportDate).getTime(),
    ),
});

const createDailyReport = async (payload, actorId) => {
  if (!payload.projectId || !payload.reportDate || !payload.progressSummary) {
    throw createHttpError(
      400,
      "Project, report date, and progress summary are required",
    );
  }

  const report = {
    id: `dpr-${randomUUID()}`,
    projectId: payload.projectId,
    submittedBy: actorId,
    reportDate: payload.reportDate,
    laborCount: Number(payload.laborCount) || 0,
    materialUsage: payload.materialUsage || "",
    blockers: payload.blockers || "",
    progressSummary: payload.progressSummary,
    shift: payload.shift || "Day",
    siteEngineer: payload.siteEngineer || "Vikram Rathore",
    progressPercent: Number(payload.progressPercent) || 0,
    weather: payload.weather || "Sunny",
    blockersLevel: payload.blockersLevel || "None",
    siteHealth: Number(payload.siteHealth) || 90,
    remarks: payload.remarks || "",
    materials: payload.materials || { cement: 0, steel: 0, sand: 0, aggregates: 0 },
    laborDetails: payload.laborDetails || { skilled: 0, unskilled: 0, supervisors: 0 },
    photos: payload.photos || [],
  };

  state.dailyReports.unshift(report);
  logAudit({
    title: "Daily progress report submitted",
    detail: `DPR submitted for ${getProjectById(report.projectId)?.name || "project"}.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return serializeDailyReport(report);
};

const getDailyReport = (reportId) => {
  const report = state.dailyReports.find((item) => item.id === reportId);
  if (!report) {
    throw createHttpError(404, "Daily report not found");
  }
  return serializeDailyReport(report);
};

const updateDailyReport = async (reportId, payload, actorId) => {
  const reportIndex = state.dailyReports.findIndex((item) => item.id === reportId);
  if (reportIndex === -1) {
    throw createHttpError(404, "Daily report not found");
  }

  const existingReport = state.dailyReports[reportIndex];
  
  const updatedReport = {
    ...existingReport,
    ...payload,
    laborCount: payload.laborCount !== undefined ? Number(payload.laborCount) : existingReport.laborCount,
    progressPercent: payload.progressPercent !== undefined ? Number(payload.progressPercent) : existingReport.progressPercent,
    siteHealth: payload.siteHealth !== undefined ? Number(payload.siteHealth) : existingReport.siteHealth,
  };

  state.dailyReports[reportIndex] = updatedReport;

  logAudit({
    title: "Daily progress report updated",
    detail: `DPR for ${getProjectById(updatedReport.projectId)?.name || "project"} was updated.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return serializeDailyReport(updatedReport);
};

const deleteDailyReport = async (reportId, actorId) => {
  const reportIndex = state.dailyReports.findIndex((item) => item.id === reportId);
  if (reportIndex === -1) {
    throw createHttpError(404, "Daily report not found");
  }

  const report = state.dailyReports[reportIndex];
  state.dailyReports.splice(reportIndex, 1);

  logAudit({
    title: "Daily progress report deleted",
    detail: `DPR for ${getProjectById(report.projectId)?.name || "project"} was deleted.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return { id: reportId, success: true };
};

const listResourceAllocations = () => ({
  resources: state.resourceAllocations.map((item) => ({
    ...item,
    projectName: getProjectById(item.projectId)?.name || "Unknown project",
  })),
});

const getResourceAllocation = (resourceId) => {
  const resource = state.resourceAllocations.find((item) => item.id === resourceId);
  if (!resource) {
    throw createHttpError(404, "Resource allocation not found");
  }
  return {
    ...resource,
    projectName: getProjectById(resource.projectId)?.name || "Unknown project",
  };
};

const createResourceAllocation = async (payload, actorId) => {
  if (!payload.projectId || !payload.resourceName || !payload.type || !payload.assignedTo) {
    throw createHttpError(400, "Project, resource name, type, and assigned target are required");
  }

  const dailyCost = Number(payload.dailyCost) || (payload.type === "Machinery" ? 1000 : payload.type === "Contractor" ? 1500 : 600);

  const allocation = {
    id: `res-${randomUUID()}`,
    projectId: payload.projectId,
    resourceName: payload.resourceName,
    type: payload.type,
    subType: payload.subType || (payload.type === "Crew" ? "General Crew" : payload.type === "Machinery" ? "General Machinery" : "Subcontractor"),
    assignedTo: payload.assignedTo,
    utilization: Number(payload.utilization) || 0,
    status: payload.status || "Assigned",
    health: Number(payload.health) || 85,
    dailyCost: dailyCost,
    monthlyCost: Number(payload.monthlyCost) || (dailyCost * 30),
  };

  state.resourceAllocations.unshift(allocation);
  logAudit({
    title: "Resource allocated",
    detail: `${allocation.resourceName} assigned to ${getProjectById(allocation.projectId)?.name || "project"}.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return {
    ...allocation,
    projectName: getProjectById(allocation.projectId)?.name || "Unknown project",
  };
};

const updateResourceAllocation = async (resourceId, payload, actorId) => {
  const index = state.resourceAllocations.findIndex((item) => item.id === resourceId);
  if (index === -1) {
    throw createHttpError(404, "Resource allocation not found");
  }

  const existing = state.resourceAllocations[index];
  const updated = {
    ...existing,
    ...payload,
    utilization: payload.utilization !== undefined ? Number(payload.utilization) : existing.utilization,
    health: payload.health !== undefined ? Number(payload.health) : existing.health,
    dailyCost: payload.dailyCost !== undefined ? Number(payload.dailyCost) : existing.dailyCost,
    monthlyCost: payload.monthlyCost !== undefined ? Number(payload.monthlyCost) : existing.monthlyCost,
  };

  state.resourceAllocations[index] = updated;

  logAudit({
    title: "Resource allocation updated",
    detail: `${updated.resourceName} details updated.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return {
    ...updated,
    projectName: getProjectById(updated.projectId)?.name || "Unknown project",
  };
};

const deleteResourceAllocation = async (resourceId, actorId) => {
  const index = state.resourceAllocations.findIndex((item) => item.id === resourceId);
  if (index === -1) {
    throw createHttpError(404, "Resource allocation not found");
  }

  const resource = state.resourceAllocations[index];
  state.resourceAllocations.splice(index, 1);

  logAudit({
    title: "Resource allocation deleted",
    detail: `${resource.resourceName} was unallocated/deleted.`,
    actorId,
    category: "Projects",
  });

  await persistState();
  return { id: resourceId, success: true };
};

const createVendor = async (payload, actorId) => {
  if (!payload.name || !payload.category || !payload.city) {
    throw createHttpError(400, "Name, category, and city are required");
  }

  const vendor = {
    id: `vendor-${randomUUID()}`,
    name: payload.name,
    category: payload.category,
    city: payload.city,
    gstin: payload.gstin || "",
    averageLeadTimeDays: Number(payload.averageLeadTimeDays) || 0,
    reliabilityScore: Number(payload.reliabilityScore) || 0,
    status: payload.status || "Active",
    createdAt: new Date().toISOString(),
  };

  state.vendors.unshift(vendor);
  logAudit({
    title: "Vendor created",
    detail: `Vendor ${vendor.name} added under ${vendor.category}.`,
    actorId,
    category: "Procurement",
  });

  await persistState();
  return vendor;
};

const listVendors = () => ({
  vendors: clone(state.vendors).sort(
    (left, right) => right.reliabilityScore - left.reliabilityScore,
  ),
});

const updateVendor = async (vendorId, payload, actorId) => {
  const vendor = getVendorById(vendorId);
  if (!vendor) {
    throw createHttpError(404, "Vendor not found");
  }

  vendor.name = payload.name || vendor.name;
  vendor.category = payload.category || vendor.category;
  vendor.city = payload.city || vendor.city;
  if (Object.prototype.hasOwnProperty.call(payload, "gstin")) {
    vendor.gstin = payload.gstin || "";
  }
  if (Object.prototype.hasOwnProperty.call(payload, "averageLeadTimeDays")) {
    vendor.averageLeadTimeDays = Number(payload.averageLeadTimeDays) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "reliabilityScore")) {
    vendor.reliabilityScore = Number(payload.reliabilityScore) || 0;
  }
  vendor.status = payload.status || vendor.status;
  vendor.updatedAt = new Date().toISOString();

  logAudit({
    title: vendor.status === "Inactive" ? "Vendor archived" : "Vendor updated",
    detail: `${vendor.name} is now ${vendor.status} in ${vendor.city}.`,
    actorId,
    category: "Procurement",
  });

  await persistState();
  return vendor;
};

const archiveVendor = async (vendorId, actorId) =>
  updateVendor(vendorId, { status: "Inactive" }, actorId);

const serializePurchaseRequest = (request) => ({
  ...request,
  projectName: getProjectById(request.projectId)?.name || "Unknown project",
  requestedByName: getUserById(request.requestedBy)?.name || "Unknown",
});

const listPurchaseRequests = () => ({
  requests: state.purchaseRequests
    .map(serializePurchaseRequest)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    ),
});

const createPurchaseRequest = async (payload, actorId) => {
  if (!payload.title || !payload.projectId || !payload.materialCategory) {
    throw createHttpError(
      400,
      "Title, project, and material category are required",
    );
  }

  const request = {
    id: `pr-${randomUUID()}`,
    title: payload.title,
    projectId: payload.projectId,
    department: payload.department || "Projects",
    requestedBy: actorId,
    materialCategory: payload.materialCategory,
    quantity: Number(payload.quantity) || 0,
    unit: payload.unit || "units",
    status: "Pending Approval",
    priority: payload.priority || "Medium",
    requiredBy: payload.requiredBy || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  state.purchaseRequests.unshift(request);
  logAudit({
    title: "Purchase request created",
    detail: `${request.title} raised for ${getProjectById(request.projectId)?.name || "project"}.`,
    actorId,
    category: "Procurement",
  });

  await persistState();
  return serializePurchaseRequest(request);
};

const createQuotation = async (payload, actorId) => {
  if (!payload.requestId || !payload.vendorId || !payload.totalAmount) {
    throw createHttpError(400, "Request ID, vendor, and total amount are required");
  }

  const quotation = {
    id: `qt-${randomUUID()}`,
    requestId: payload.requestId,
    vendorId: payload.vendorId,
    totalAmount: Number(payload.totalAmount) || 0,
    deliveryDays: Number(payload.deliveryDays) || 0,
    paymentTerms: payload.paymentTerms || "",
    qualityScore: Number(payload.qualityScore) || 0,
    status: payload.status || "Received",
    documentUrl: payload.documentUrl || null,
    documentName: payload.documentName || null,
    documentSize: payload.documentSize ? Number(payload.documentSize) : null,
    submittedAt: payload.submittedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  state.quotations.unshift(quotation);
  logAudit({
    title: "Quotation received",
    detail: `Quotation from ${getVendorById(quotation.vendorId)?.name || "vendor"} for ${state.purchaseRequests.find((item) => item.id === quotation.requestId)?.title || "request"}.`,
    actorId,
    category: "Procurement",
  });

  await persistState();
  return {
    ...quotation,
    requestTitle: state.purchaseRequests.find((item) => item.id === quotation.requestId)?.title || "Unknown request",
    vendorName: getVendorById(quotation.vendorId)?.name || "Unknown vendor",
  };
};

const updateQuotation = async (quotationId, payload, actorId) => {
  const quotation = state.quotations.find((item) => item.id === quotationId);
  if (!quotation) {
    throw createHttpError(404, "Quotation not found");
  }

  if (payload.status !== undefined) quotation.status = payload.status;
  if (payload.totalAmount !== undefined) quotation.totalAmount = Number(payload.totalAmount) || 0;
  if (payload.deliveryDays !== undefined) quotation.deliveryDays = Number(payload.deliveryDays) || 0;
  if (payload.qualityScore !== undefined) quotation.qualityScore = Number(payload.qualityScore) || 0;
  if (payload.paymentTerms !== undefined) quotation.paymentTerms = payload.paymentTerms || "";
  
  logAudit({
    title: "Quotation updated",
    detail: `Quotation ${quotationId} status set to ${quotation.status}.`,
    actorId,
    category: "Procurement",
  });

  await persistState();
  return {
    ...quotation,
    requestTitle: state.purchaseRequests.find((item) => item.id === quotation.requestId)?.title || "Unknown request",
    vendorName: getVendorById(quotation.vendorId)?.name || "Unknown vendor",
  };
};

const listQuotations = () => ({
  quotations: state.quotations.map((quotation) => ({
    ...quotation,
    requestTitle:
      state.purchaseRequests.find((item) => item.id === quotation.requestId)
        ?.title || "Unknown request",
    vendorName: getVendorById(quotation.vendorId)?.name || "Unknown vendor",
  })),
});

const ensurePurchaseOrderFields = (order) => {
  if (!order) return;
  if (!order.lineItems || !Array.isArray(order.lineItems)) {
    const request = state.purchaseRequests.find((item) => item.id === order.requestId);
    const category = request?.materialCategory || "Steel";
    const totalAmount = Number(order.amount) || 0;
    const rate = category === "Cement" ? 420 : category === "Steel" ? 62000 : 1200;
    let quantity = 1;
    let unit = "Unit";
    if (category === "Cement") {
      quantity = Math.round(totalAmount / rate) || 100;
      unit = "bags";
    } else if (category === "Steel") {
      quantity = Number((totalAmount / rate).toFixed(2)) || 5;
      unit = "tons";
    } else {
      quantity = Math.round(totalAmount / rate) || 50;
      unit = "nos";
    }
    const taxRate = 18; // 18% GST standard
    const subtotal = Math.round(totalAmount / (1 + taxRate / 100));
    const taxAmount = totalAmount - subtotal;
    const itemRate = Math.round(subtotal / quantity);
    
    order.lineItems = [
      {
        item: `High Grade ${category} Supply`,
        category: category,
        quantity: quantity,
        unit: unit,
        rate: itemRate,
        tax: taxAmount,
        amount: totalAmount,
      }
    ];
  }
  if (order.paymentTerms === undefined || order.paymentTerms === null) {
    order.paymentTerms = "Net 30 days upon delivery and invoice submission";
  }
  if (order.deliveryTerms === undefined || order.deliveryTerms === null) {
    order.deliveryTerms = "FOB Destination (delivered to project site)";
  }
  if (order.notes === undefined || order.notes === null) {
    order.notes = "Quality inspections required on delivery. Deliver between 9 AM and 4 PM only.";
  }
  if (order.documentUrl === undefined || order.documentUrl === null) {
    order.documentUrl = "";
  }
  if (!order.timeline || !Array.isArray(order.timeline) || order.timeline.length === 0) {
    const createdDate = order.createdAt || new Date().toISOString();
    order.timeline = [
      { status: "Draft", title: "PO Drafted", timestamp: new Date(new Date(createdDate).getTime() - 2 * 60 * 60 * 1000).toISOString(), actorName: "Procurement Officer" },
      { status: "Pending Approval", title: "Approval Requested", timestamp: createdDate, actorName: "Procurement Officer" },
      { status: "Approved", title: "PO Approved", timestamp: new Date(new Date(createdDate).getTime() + 4 * 60 * 60 * 1000).toISOString(), actorName: "Project Manager" },
      { status: "Released", title: "PO Released to Vendor", timestamp: new Date(new Date(createdDate).getTime() + 6 * 60 * 60 * 1000).toISOString(), actorName: "System" }
    ];
    if (order.status === "In Transit") {
      order.timeline.push({ status: "In Transit", title: "Shipped", timestamp: new Date(new Date(createdDate).getTime() + 24 * 60 * 60 * 1000).toISOString(), actorName: "Vendor Logistics" });
    } else if (order.status === "Delivered") {
      order.timeline.push({ status: "In Transit", title: "Shipped", timestamp: new Date(new Date(createdDate).getTime() + 24 * 60 * 60 * 1000).toISOString(), actorName: "Vendor Logistics" });
      order.timeline.push({ status: "Delivered", title: "Delivered at Site", timestamp: order.expectedDelivery || new Date().toISOString(), actorName: "Site Engineer" });
    } else if (order.status === "Closed") {
      order.timeline.push({ status: "In Transit", title: "Shipped", timestamp: new Date(new Date(createdDate).getTime() + 24 * 60 * 60 * 1000).toISOString(), actorName: "Vendor Logistics" });
      order.timeline.push({ status: "Delivered", title: "Delivered at Site", timestamp: order.expectedDelivery || new Date().toISOString(), actorName: "Site Engineer" });
      order.timeline.push({ status: "Closed", title: "Order Closed", timestamp: new Date(new Date(order.expectedDelivery || createdDate).getTime() + 12 * 60 * 60 * 1000).toISOString(), actorName: "Procurement Lead" });
    }
  }
};

const createPurchaseOrder = async (payload, actorId) => {
  if (!payload.requestId || !payload.vendorId || !payload.projectId || !payload.amount) {
    throw createHttpError(400, "Request ID, vendor, project, and amount are required");
  }

  const order = {
    id: `po-${randomUUID()}`,
    requestId: payload.requestId,
    vendorId: payload.vendorId,
    projectId: payload.projectId,
    amount: Number(payload.amount) || 0,
    expectedDelivery: payload.expectedDelivery || "",
    status: payload.status || "Draft",
    createdAt: new Date().toISOString(),
    lineItems: payload.lineItems || [],
    paymentTerms: payload.paymentTerms || "Net 30 days upon delivery and invoice submission",
    deliveryTerms: payload.deliveryTerms || "FOB Destination (delivered to project site)",
    notes: payload.notes || "",
    documentUrl: payload.documentUrl || "",
    timeline: payload.timeline || [
      { status: "Draft", title: "PO Created", timestamp: new Date().toISOString(), actorName: "Procurement Manager" }
    ],
  };

  ensurePurchaseOrderFields(order);

  const request = state.purchaseRequests.find((item) => item.id === order.requestId);
  const vendor = getVendorById(order.vendorId);
  const project = getProjectById(order.projectId);

  state.purchaseOrders.unshift(order);
  state.approvals.unshift({
    id: `apr-${randomUUID()}`,
    title: `Purchase order approval for ${vendor?.name || "vendor"}`,
    module: "Procurement",
    requestType: "Purchase order approval",
    priority: order.amount >= 5000000 ? "High" : "Medium",
    status: "Pending",
    requestedBy: actorId,
    ownerId: project?.managerId || "user-admin",
    submittedAt: new Date().toISOString(),
    dueAt:
      payload.expectedDelivery ||
      new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    summary: `${request?.title || "Purchase order"} for ${project?.name || "project"} worth INR ${order.amount.toLocaleString("en-IN")}.`,
    relatedEntityId: order.id,
  });
  logAudit({
    title: "Purchase order created",
    detail: `PO for ${vendor?.name || "vendor"} on project ${project?.name || "project"}.`,
    actorId,
    category: "Procurement",
  });

  await persistState();
  return {
    ...order,
    requestTitle: request?.title || "Unknown request",
    vendorName: vendor?.name || "Unknown vendor",
    projectName: project?.name || "Unknown project",
  };
};

const getPurchaseOrder = async (id) => {
  const order = getPurchaseOrderById(id);
  if (!order) return null;

  ensurePurchaseOrderFields(order);

  const request = state.purchaseRequests.find((item) => item.id === order.requestId);
  const vendor = getVendorById(order.vendorId);
  const project = getProjectById(order.projectId);

  return {
    ...order,
    requestTitle: request?.title || "Unknown request",
    vendorName: vendor?.name || "Unknown vendor",
    projectName: project?.name || "Unknown project",
    vendorDetails: vendor,
    projectDetails: project,
  };
};

const updatePurchaseOrder = async (id, payload, actorId) => {
  const order = getPurchaseOrderById(id);
  if (!order) {
    throw createHttpError(404, "Purchase order not found");
  }

  if (payload.amount !== undefined) order.amount = Number(payload.amount);
  if (payload.status !== undefined) {
    const oldStatus = order.status;
    order.status = payload.status;
    if (oldStatus !== payload.status) {
      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        status: payload.status,
        title: `PO Status updated to ${payload.status}`,
        timestamp: new Date().toISOString(),
        actorName: actorId === "user-admin" ? "Procurement Director" : "Procurement Manager"
      });
    }
  }
  if (payload.expectedDelivery !== undefined) order.expectedDelivery = payload.expectedDelivery;
  if (payload.lineItems !== undefined) order.lineItems = payload.lineItems;
  if (payload.paymentTerms !== undefined) order.paymentTerms = payload.paymentTerms;
  if (payload.deliveryTerms !== undefined) order.deliveryTerms = payload.deliveryTerms;
  if (payload.notes !== undefined) order.notes = payload.notes;
  if (payload.documentUrl !== undefined) order.documentUrl = payload.documentUrl;
  if (payload.timeline !== undefined) order.timeline = payload.timeline;

  order.updatedAt = new Date().toISOString();

  const vendor = getVendorById(order.vendorId);
  const project = getProjectById(order.projectId);

  logAudit({
    title: "Purchase order updated",
    detail: `PO ${order.id} for ${vendor?.name || "vendor"} on project ${project?.name || "project"} was updated.`,
    actorId,
    category: "Procurement",
  });

  await persistState();

  return getPurchaseOrder(id);
};

const listPurchaseOrders = () => {
  state.purchaseOrders.forEach(ensurePurchaseOrderFields);
  return {
    purchaseOrders: state.purchaseOrders.map((order) => ({
      ...order,
      requestTitle:
        state.purchaseRequests.find((item) => item.id === order.requestId)
          ?.title || "Unknown request",
      vendorName: getVendorById(order.vendorId)?.name || "Unknown vendor",
      projectName: getProjectById(order.projectId)?.name || "Unknown project",
    })),
  };
};

const listMaterials = () => ({
  materials: state.materials.map((item) => ({
    ...item,
    warehouseName:
      getWarehouseById(item.warehouseId)?.name || "Unknown warehouse",
    projectName: getProjectById(item.projectId)?.name || "Unknown project",
  })),
  warehouses: clone(state.warehouses),
});

const createWarehouse = async (payload, actorId) => {
  if (!payload.name || !payload.location) {
    throw createHttpError(400, "Name and location are required");
  }

  const warehouse = normalizeWarehouseRecord(
    {
      id: `wh-${randomUUID()}`,
      name: payload.name,
      code: payload.code,
      location: payload.location,
      region: payload.region,
      coordinates: payload.coordinates,
      capacity: payload.capacity,
      capacityUtilization: payload.capacityUtilization,
      storageTypes: payload.storageTypes,
      operatingHours: payload.operatingHours,
      supervisor: payload.supervisor,
      assignedProjects: payload.assignedProjects,
      materialCategories: payload.materialCategories,
      status: payload.status || "Operational",
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    state.warehouses.length,
  );

  state.warehouses.unshift(warehouse);
  logAudit({
    title: "Warehouse created",
    detail: `${warehouse.name} added at ${warehouse.location}.`,
    actorId,
    category: "Materials",
  });

  await persistState();
  return warehouse;
};

const updateWarehouse = async (warehouseId, payload, actorId) => {
  const warehouse = getWarehouseById(warehouseId);
  if (!warehouse) {
    throw createHttpError(404, "Warehouse not found");
  }

  const normalizedWarehouse = normalizeWarehouseRecord(
    {
      ...warehouse,
      name: payload.name || warehouse.name,
      code: Object.prototype.hasOwnProperty.call(payload, "code") ? payload.code : warehouse.code,
      location: payload.location || warehouse.location,
      region: Object.prototype.hasOwnProperty.call(payload, "region") ? payload.region : warehouse.region,
      coordinates: Object.prototype.hasOwnProperty.call(payload, "coordinates") ? payload.coordinates : warehouse.coordinates,
      capacity: Object.prototype.hasOwnProperty.call(payload, "capacity") ? payload.capacity : warehouse.capacity,
      capacityUtilization: Object.prototype.hasOwnProperty.call(payload, "capacityUtilization")
        ? payload.capacityUtilization
        : warehouse.capacityUtilization,
      storageTypes: Object.prototype.hasOwnProperty.call(payload, "storageTypes") ? payload.storageTypes : warehouse.storageTypes,
      operatingHours: Object.prototype.hasOwnProperty.call(payload, "operatingHours")
        ? payload.operatingHours
        : warehouse.operatingHours,
      supervisor: Object.prototype.hasOwnProperty.call(payload, "supervisor") ? payload.supervisor : warehouse.supervisor,
      assignedProjects: Object.prototype.hasOwnProperty.call(payload, "assignedProjects")
        ? payload.assignedProjects
        : warehouse.assignedProjects,
      materialCategories: Object.prototype.hasOwnProperty.call(payload, "materialCategories")
        ? payload.materialCategories
        : warehouse.materialCategories,
      status: payload.status || warehouse.status,
      notes: Object.prototype.hasOwnProperty.call(payload, "notes") ? payload.notes : warehouse.notes,
      createdAt: warehouse.createdAt,
      updatedAt: new Date().toISOString(),
    },
    state.warehouses.findIndex((item) => item.id === warehouseId),
  );

  Object.assign(warehouse, normalizedWarehouse);

  logAudit({
    title: warehouse.status === "Inactive" ? "Warehouse archived" : "Warehouse updated",
    detail: `${warehouse.name} is now ${warehouse.status} at ${warehouse.location}.`,
    actorId,
    category: "Materials",
  });

  await persistState();
  return warehouse;
};

const archiveWarehouse = async (warehouseId, actorId) =>
  updateWarehouse(warehouseId, { status: "Inactive" }, actorId);

const createMaterial = async (payload, actorId) => {
  if (
    !payload.sku ||
    !payload.name ||
    !payload.category ||
    !payload.warehouseId ||
    !payload.projectId ||
    !payload.unit
  ) {
    throw createHttpError(400, "SKU, name, category, warehouse, project, and unit are required");
  }

  const onHand = Number(payload.onHand) || 0;
  const reorderLevel = Number(payload.reorderLevel) || 0;

  const material = {
    id: `mat-${randomUUID()}`,
    sku: payload.sku,
    name: payload.name,
    category: payload.category,
    warehouseId: payload.warehouseId,
    projectId: payload.projectId,
    onHand,
    reorderLevel,
    unit: payload.unit,
    averageConsumption: Number(payload.averageConsumption) || 0,
    status: resolveMaterialStatus(onHand, reorderLevel),
  };

  state.materials.unshift(material);
  logAudit({
    title: "Material created",
    detail: `${material.name} mapped to ${getProjectById(material.projectId)?.name || "project"} stock.`,
    actorId,
    category: "Materials",
  });

  await persistState();
  return {
    ...material,
    warehouseName: getWarehouseById(material.warehouseId)?.name || "Unknown warehouse",
    projectName: getProjectById(material.projectId)?.name || "Unknown project",
  };
};

const updateMaterial = async (materialId, payload, actorId) => {
  const material = getMaterialById(materialId);
  if (!material) {
    throw createHttpError(404, "Material not found");
  }

  material.sku = payload.sku || material.sku;
  material.name = payload.name || material.name;
  material.category = payload.category || material.category;
  material.warehouseId = payload.warehouseId || material.warehouseId;
  material.projectId = payload.projectId || material.projectId;
  if (Object.prototype.hasOwnProperty.call(payload, "onHand")) {
    material.onHand = Number(payload.onHand) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "reorderLevel")) {
    material.reorderLevel = Number(payload.reorderLevel) || 0;
  }
  material.unit = payload.unit || material.unit;
  if (Object.prototype.hasOwnProperty.call(payload, "averageConsumption")) {
    material.averageConsumption = Number(payload.averageConsumption) || 0;
  }
  material.status = payload.status
    ? payload.status
    : material.status === "Archived"
      ? "Archived"
      : resolveMaterialStatus(material.onHand, material.reorderLevel);
  material.updatedAt = new Date().toISOString();

  logAudit({
    title: material.status === "Archived" ? "Material archived" : "Material updated",
    detail: `${material.name} is now ${material.status} in ${getWarehouseById(material.warehouseId)?.name || "warehouse"}.`,
    actorId,
    category: "Materials",
  });

  await persistState();
  return {
    ...material,
    warehouseName: getWarehouseById(material.warehouseId)?.name || "Unknown warehouse",
    projectName: getProjectById(material.projectId)?.name || "Unknown project",
  };
};

const archiveMaterial = async (materialId, actorId) =>
  updateMaterial(materialId, { status: "Archived" }, actorId);

const listTransfers = () => ({
  transfers: state.transfers.map((item) => ({
    ...item,
    materialName: getMaterialById(item.materialId)?.name || "Unknown material",
    fromWarehouseName:
      getWarehouseById(item.fromWarehouseId)?.name || "Unknown warehouse",
    toWarehouseName:
      getWarehouseById(item.toWarehouseId)?.name || "Unknown warehouse",
    requestedByName: getUserById(item.requestedBy)?.name || "Unknown",
  })),
});

const createTransfer = async (payload, actorId) => {
  if (
    !payload.materialId ||
    !payload.fromWarehouseId ||
    !payload.toWarehouseId ||
    !payload.quantity
  ) {
    throw createHttpError(
      400,
      "Material, source, destination, and quantity are required",
    );
  }

  const material = getMaterialById(payload.materialId);
  if (!material) {
    throw createHttpError(404, "Material not found");
  }

  const quantity = Number(payload.quantity) || 0;
  if (quantity <= 0) {
    throw createHttpError(400, "Transfer quantity must be positive");
  }

  material.onHand = Math.max(0, material.onHand - quantity);

  const transfer = {
    id: `tr-${randomUUID()}`,
    materialId: payload.materialId,
    fromWarehouseId: payload.fromWarehouseId,
    toWarehouseId: payload.toWarehouseId,
    quantity,
    unit: payload.unit || material.unit,
    status: "In Transit",
    requestedBy: actorId,
    createdAt: new Date().toISOString(),
  };

  state.transfers.unshift(transfer);
  logAudit({
    title: "Material transfer created",
    detail: `${material.name} transfer initiated between warehouses.`,
    actorId,
    category: "Materials",
  });

  await persistState();
  return transfer;
};

const recordConsumption = async (payload, actorId) => {
  if (!payload.materialId || !payload.projectId || !payload.quantity) {
    throw createHttpError(400, "Material, project, and quantity are required");
  }

  const material = getMaterialById(payload.materialId);
  if (!material) {
    throw createHttpError(404, "Material not found");
  }

  const quantity = Number(payload.quantity) || 0;
  if (material.onHand - quantity < 0) {
    throw createHttpError(400, "Insufficient material on hand");
  }

  material.onHand = Math.max(0, material.onHand - quantity);

  const consumption = {
    id: `con-${randomUUID()}`,
    materialId: payload.materialId,
    projectId: payload.projectId,
    quantity,
    unit: payload.unit || material.unit,
    purpose: payload.purpose || "",
    consumedOn: payload.consumedOn || new Date().toISOString(),
    recordedBy: actorId,
    createdAt: new Date().toISOString(),
  };

  state.consumptions.unshift(consumption);
  logAudit({
    title: "Material consumption recorded",
    detail: `${material.name} consumed at ${getProjectById(consumption.projectId)?.name || "project"}.`,
    actorId,
    category: "Materials",
  });

  await persistState();
  return {
    ...consumption,
    materialName: getMaterialById(consumption.materialId)?.name || "Unknown material",
    projectName: getProjectById(consumption.projectId)?.name || "Unknown project",
    recordedByName: getUserById(consumption.recordedBy)?.name || "Unknown",
  };
};

const listConsumptions = () => ({
  consumptions: state.consumptions.map((item) => ({
    ...item,
    materialName: getMaterialById(item.materialId)?.name || "Unknown material",
    projectName: getProjectById(item.projectId)?.name || "Unknown project",
    recordedByName: getUserById(item.recordedBy)?.name || "Unknown",
  })),
});

const getMaterialAlerts = () => {
  const alerts = state.materials
    .filter(
      (item) => item.status !== "Archived" && item.onHand <= item.reorderLevel,
    )
    .map((item) => ({
      id: `mat-alert-${item.id}`,
      materialName: item.name,
      warehouseName:
        getWarehouseById(item.warehouseId)?.name || "Unknown warehouse",
      projectName: getProjectById(item.projectId)?.name || "Unknown project",
      onHand: item.onHand,
      reorderLevel: item.reorderLevel,
      status: item.status,
    }));

  return {
    alerts,
    summary: {
      lowStock: alerts.length,
      critical: alerts.filter((item) => item.onHand < item.reorderLevel * 0.75)
        .length,
    },
  };
};

function normalizeEmployeeRecord(employee, index = 0) {
  const project =
    (state?.projects || projectSeed).find((item) => item.id === employee.projectId) ||
    projectSeed[index % projectSeed.length] ||
    projectSeed[0];
  const fallbackDesignation = employee.position || employee.designation || "Workforce Executive";
  const fallbackProfile = buildEmployeeProfileFields(
    index + 1,
    employee.name || `Employee ${index + 1}`,
    fallbackDesignation,
    project?.name || "Nimbus Workforce",
  );
  const createdAt = employee.createdAt || employee.dateJoined || fallbackProfile.createdAt;

  return {
    ...employee,
    name: employee.name || `Employee ${index + 1}`,
    email: employee.email || fallbackProfile.email,
    department: employee.department || "Projects",
    designation: employee.designation || employee.position || fallbackDesignation,
    position: employee.position || employee.designation || fallbackDesignation,
    projectId: employee.projectId || project?.id || projectSeed[0].id,
    teamName: employee.teamName || "Unassigned",
    phone: employee.phone || `+91 97${padNumber(41000000 + index + 1, 8)}`,
    dateJoined: employee.dateJoined || createdAt,
    emergencyContact: employee.emergencyContact || fallbackProfile.emergencyContact,
    address: employee.address || fallbackProfile.address,
    status: employee.status || "Active",
    createdAt,
    updatedAt: employee.updatedAt || createdAt,
  };
}

function getEmployeeAttendanceHistory(employeeId) {
  return (state.attendance || [])
    .filter((item) => item.employeeId === employeeId)
    .slice()
    .sort((left, right) => new Date(left.checkIn).getTime() - new Date(right.checkIn).getTime());
}

function getEmployeeReportingManager(employee) {
  const project = getProjectById(employee.projectId);
  if (!project) {
    return "Operations Lead";
  }

  return getUserById(project.managerId)?.name || "Operations Lead";
}

function getEmployeeCode(employee) {
  const numericId = `${employee.id}`.replace(/\D/g, "").slice(-4) || "0001";
  return `EMP-${numericId.padStart(4, "0")}`;
}

function getEmployeeDateOfBirth(employee) {
  const numericSeed = Number(`${employee.id}`.replace(/\D/g, "").slice(-3) || "111");
  return new Date(
    Date.UTC(1986 + (numericSeed % 11), (numericSeed * 2) % 12, 4 + (numericSeed % 24), 0, 0, 0),
  ).toISOString();
}

function buildEmployeeAttendanceStats(employee) {
  const history = getEmployeeAttendanceHistory(employee.id);
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const monthEntries = history.filter((entry) => {
    const entryDate = new Date(entry.checkIn);
    return entryDate.getUTCFullYear() === currentYear && entryDate.getUTCMonth() === currentMonth;
  });
  const trackedEntries = monthEntries.length ? monthEntries : history.slice(-30);
  const presentDays = trackedEntries.filter((entry) => entry.status === "Present").length;
  const lateArrivals = trackedEntries.filter((entry) => entry.status === "Late").length;
  const absentDays = trackedEntries.filter((entry) => entry.status === "Absent").length;
  const attendancePercent = trackedEntries.length
    ? Math.round(((presentDays + lateArrivals) / trackedEntries.length) * 100)
    : 0;
  const projectResources = (state.resourceAllocations || []).filter(
    (resource) => resource.projectId === employee.projectId,
  );
  const averageProjectUtilization = projectResources.length
    ? Math.round(
        projectResources.reduce((sum, resource) => sum + Number(resource.utilization || 0), 0) /
          projectResources.length,
      )
    : attendancePercent;
  const utilizationPercent = Math.min(
    99,
    Math.max(48, Math.round(attendancePercent * 0.58 + averageProjectUtilization * 0.42)),
  );
  const sparkline = history.slice(-10).map((entry) => {
    if (entry.status === "Present") return 100;
    if (entry.status === "Late") return 72;
    return 18;
  });
  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(Date.UTC(currentYear, currentMonth - (5 - index), 1, 0, 0, 0));
    const entries = history.filter((entry) => {
      const entryDate = new Date(entry.checkIn);
      return (
        entryDate.getUTCFullYear() === monthDate.getUTCFullYear() &&
        entryDate.getUTCMonth() === monthDate.getUTCMonth()
      );
    });
    const present = entries.filter((entry) => entry.status === "Present").length;
    const late = entries.filter((entry) => entry.status === "Late").length;
    const absent = entries.filter((entry) => entry.status === "Absent").length;
    const rate = entries.length ? Math.round(((present + late) / entries.length) * 100) : 0;

    return {
      month: monthDate.toLocaleDateString("en-IN", { month: "short" }),
      attendanceRate: rate,
      presentDays: present,
      lateArrivals: late,
      absentDays: absent,
    };
  });
  const yearsOfService = Math.max(
    0,
    Number(
      (
        (Date.now() - new Date(employee.dateJoined).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
      ).toFixed(1),
    ),
  );

  return {
    presentDays,
    lateArrivals,
    absentDays,
    attendancePercent,
    utilizationPercent,
    sparkline,
    monthlyTrend,
    yearsOfService,
    trackedDays: trackedEntries.length,
  };
}

function buildEmployeeAllocationTimeline(employee) {
  const joinedDate = new Date(employee.dateJoined);
  const currentYear = new Date().getUTCFullYear();
  const serviceYears = Math.max(0, currentYear - joinedDate.getUTCFullYear());
  const timelineLength = serviceYears >= 2 ? 3 : serviceYears >= 1 ? 2 : 1;
  const projectIds = Array.from(new Set((state.projects || []).map((project) => project.id)));
  const currentProjectIndex = Math.max(0, projectIds.indexOf(employee.projectId));

  return Array.from({ length: timelineLength }, (_, index) => {
    const yearOffset = timelineLength - index - 1;
    const timelineYear = currentYear - yearOffset;
    const projectId =
      index === timelineLength - 1
        ? employee.projectId
        : projectIds[(currentProjectIndex - yearOffset + projectIds.length) % projectIds.length];
    const project = getProjectById(projectId) || getProjectById(employee.projectId);

    return {
      id: `${employee.id}-timeline-${index + 1}`,
      year: `${timelineYear}`,
      projectId: project?.id || employee.projectId,
      projectName: project?.name || "Unknown project",
      role:
        index === timelineLength - 1
          ? employee.position || employee.designation
          : `${employee.department} Specialist`,
      startDate: new Date(
        Date.UTC(timelineYear, joinedDate.getUTCMonth(), Math.min(joinedDate.getUTCDate(), 28), 0, 0, 0),
      ).toISOString(),
      status: index === timelineLength - 1 ? "Current Assignment" : "Completed Assignment",
    };
  });
}

function buildEmployeeDocuments(employee) {
  const joinedDate = new Date(employee.dateJoined);
  const documentTypes = [
    ["Employment Contract", "Verified"],
    ["Offer Letter", "Filed"],
    ["ID Verification", "Verified"],
    ["Safety Certification", "Pending Renewal"],
  ];

  return documentTypes.map(([title, status], index) => ({
    id: `${employee.id}-document-${index + 1}`,
    title,
    status,
    uploadedAt: new Date(
      Date.UTC(
        joinedDate.getUTCFullYear() + Math.min(index, 1),
        (joinedDate.getUTCMonth() + index) % 12,
        5 + index,
        10,
        0,
        0,
      ),
    ).toISOString(),
    fileName: `${title.toLowerCase().replace(/\s+/g, "-")}-${employee.id}.pdf`,
  }));
}

function buildEmployeeActivity(employee) {
  const attendanceHistory = getEmployeeAttendanceHistory(employee.id);
  const latestFlaggedAttendance =
    attendanceHistory
      .slice()
      .reverse()
      .find((entry) => entry.status !== "Present") || attendanceHistory[attendanceHistory.length - 1];
  const baseItems = [
    {
      id: `${employee.id}-activity-created`,
      title: "Employee Created",
      description: `${employee.name} profile was onboarded into the workforce command center.`,
      createdAt: employee.createdAt,
      type: "Information",
    },
    {
      id: `${employee.id}-activity-assigned`,
      title: "Project Assigned",
      description: `${employee.name} was assigned to ${getProjectById(employee.projectId)?.name || "the active project"} as ${employee.position || employee.designation}.`,
      createdAt: employee.dateJoined,
      type: "Success",
    },
    {
      id: `${employee.id}-activity-attendance`,
      title: "Attendance Corrected",
      description: latestFlaggedAttendance
        ? `${employee.name} attendance was last reviewed for the ${latestFlaggedAttendance.shift} shift.`
        : `${employee.name} attendance has no correction events yet.`,
      createdAt: latestFlaggedAttendance?.checkIn || employee.updatedAt,
      type: latestFlaggedAttendance?.status === "Absent" ? "Critical" : "Information",
    },
    {
      id: `${employee.id}-activity-department`,
      title: "Department Changed",
      description: `${employee.name} is aligned to the ${employee.department} operating pod.`,
      createdAt: new Date(new Date(employee.updatedAt).getTime() - 5 * MILLISECONDS_PER_DAY).toISOString(),
      type: "Warning",
    },
    {
      id: `${employee.id}-activity-role`,
      title: "Role Updated",
      description: `${employee.name} now carries the ${employee.position || employee.designation} workforce role.`,
      createdAt: employee.updatedAt,
      type: "Information",
    },
  ];

  return baseItems.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function serializeEmployeeListItem(employee, index = 0) {
  const normalized = normalizeEmployeeRecord(employee, index);
  const attendance = buildEmployeeAttendanceStats(normalized);

  return {
    ...normalized,
    projectName: getProjectById(normalized.projectId)?.name || "Unknown project",
    projectRole: normalized.position || normalized.designation,
    reportingManager: getEmployeeReportingManager(normalized),
    attendancePercent: attendance.attendancePercent,
    attendanceLabel: `${attendance.trackedDays} tracked day${attendance.trackedDays === 1 ? "" : "s"}`,
    attendanceMonthLabel: "This Month",
    attendanceSparkline: attendance.sparkline.length ? attendance.sparkline : [72, 76, 81, 84, 88, 91],
    utilizationPercent: attendance.utilizationPercent,
    yearsOfService: attendance.yearsOfService,
    isNewJoiner:
      Date.now() - new Date(normalized.dateJoined).getTime() <= 30 * MILLISECONDS_PER_DAY,
  };
}

const createEmployee = async (payload, actorId) => {
  const name = (payload.name || "").trim();
  const department = (payload.department || "").trim();
  const designation = (payload.designation || "").trim();
  const projectId = (payload.projectId || "").trim();

  if (!name || !department || !designation || !projectId) {
    throw createHttpError(400, "Name, department, designation, and project are required");
  }

  const email = (payload.email || `${name.replace(/\s+/g, ".").toLowerCase()}@nimbuserp.local`).trim().toLowerCase();
  const dateJoined = payload.dateJoined || new Date().toISOString().slice(0, 10);

  const now = new Date().toISOString();
  const employee = normalizeEmployeeRecord({
    id: `emp-${randomUUID()}`,
    name: name,
    email: email,
    department: department,
    designation: designation,
    position: payload.position || designation,
    projectId: projectId,
    teamName: payload.teamName || "Unassigned",
    phone: payload.phone || "",
    dateJoined: dateJoined,
    emergencyContact: payload.emergencyContact || "",
    address: payload.address || "",
    status: payload.status || "Active",
    createdAt: now,
    updatedAt: now,
  }, state.employees.length);

  state.employees.unshift(employee);
  logAudit({
    title: "Employee created",
    detail: `${employee.name} added as ${employee.position || employee.designation} in ${employee.department}, assigned to ${employee.teamName}.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return serializeEmployeeListItem(employee, 0);
};

const updateEmployee = async (employeeId, payload, actorId) => {
  const employee = findEmployeeById(employeeId);
  if (!employee) {
    throw createHttpError(404, "Employee not found");
  }

  const currentIndex = state.employees.findIndex((item) => item.id === employeeId);
  const nextEmployee = normalizeEmployeeRecord(
    {
      ...employee,
      name: payload.name || employee.name,
      email: payload.email || employee.email,
      department: payload.department || employee.department,
      designation: payload.designation || employee.designation,
      position: payload.position || payload.designation || employee.position || employee.designation,
      projectId: payload.projectId || employee.projectId,
      teamName: Object.prototype.hasOwnProperty.call(payload, "teamName")
        ? payload.teamName || "Unassigned"
        : employee.teamName,
      phone: payload.phone || employee.phone,
      dateJoined: payload.dateJoined || employee.dateJoined,
      emergencyContact: Object.prototype.hasOwnProperty.call(payload, "emergencyContact")
        ? payload.emergencyContact || ""
        : employee.emergencyContact,
      address: Object.prototype.hasOwnProperty.call(payload, "address")
        ? payload.address || ""
        : employee.address,
      status: payload.status || employee.status,
      updatedAt: new Date().toISOString(),
    },
    currentIndex < 0 ? 0 : currentIndex,
  );
  Object.assign(employee, nextEmployee);

  logAudit({
    title: employee.status === "Inactive" ? "Employee deactivated" : "Employee updated",
    detail: `${employee.name} is now ${employee.status} under ${employee.department} in ${employee.teamName || "Unassigned"}.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return serializeEmployeeListItem(employee, currentIndex < 0 ? 0 : currentIndex);
};

const listEmployees = () => {
  const employees = state.employees.map((item, index) => serializeEmployeeListItem(item, index));

  return {
    employees,
    meta: {
      total: employees.length,
      active: employees.filter((item) => item.status === "Active").length,
      inactive: employees.filter((item) => item.status === "Inactive").length,
    },
  };
};

const getEmployeeById = async (employeeId) => {
  const employee = findEmployeeById(employeeId);
  if (!employee) {
    throw createHttpError(404, "Employee not found");
  }

  const currentIndex = state.employees.findIndex((item) => item.id === employeeId);
  const serializedEmployee = serializeEmployeeListItem(employee, currentIndex < 0 ? 0 : currentIndex);
  const attendance = buildEmployeeAttendanceStats(serializedEmployee);
  const allocationTimeline = buildEmployeeAllocationTimeline(serializedEmployee);

  return {
    employee: serializedEmployee,
    summary: {
      attendancePercent: serializedEmployee.attendancePercent,
      projectsAssigned: allocationTimeline.length,
      teamsAssigned: Math.min(3, Math.max(1, allocationTimeline.length)),
      yearsOfService: attendance.yearsOfService,
    },
    assignment: {
      projectName: serializedEmployee.projectName,
      role: serializedEmployee.projectRole,
      projectStartDate: allocationTimeline[allocationTimeline.length - 1]?.startDate || serializedEmployee.dateJoined,
      reportingManager: serializedEmployee.reportingManager,
    },
    personalInformation: {
      email: serializedEmployee.email,
      phone: serializedEmployee.phone,
      emergencyContact: serializedEmployee.emergencyContact,
      dateOfBirth: getEmployeeDateOfBirth(serializedEmployee),
      address: serializedEmployee.address,
    },
    employmentInformation: {
      employeeCode: getEmployeeCode(serializedEmployee),
      department: serializedEmployee.department,
      designation: serializedEmployee.designation,
      position: serializedEmployee.position,
      dateJoined: serializedEmployee.dateJoined,
      reportingManager: serializedEmployee.reportingManager,
    },
    attendanceAnalytics: {
      monthlyTrend: attendance.monthlyTrend,
      summary: {
        presentDays: attendance.presentDays,
        lateArrivals: attendance.lateArrivals,
        absentDays: attendance.absentDays,
      },
    },
    allocationTimeline,
    documents: buildEmployeeDocuments(serializedEmployee),
    activity: buildEmployeeActivity(serializedEmployee),
  };
};

const createContractor = async (payload, actorId) => {
  if (!payload.name || !payload.trade || !payload.projectId) {
    throw createHttpError(400, "Name, trade, and project are required");
  }

  const contractor = {
    id: `ctr-${randomUUID()}`,
    name: payload.name,
    trade: payload.trade,
    projectId: payload.projectId,
    workforce: Number(payload.workforce) || 0,
    status: payload.status || "Engaged",
    contactPerson: payload.contactPerson || "",
    phone: payload.phone || "",
    email: payload.email || "",
    gstin: payload.gstin || "",
    pan: payload.pan || "",
    address: payload.address || "",
    contractStart: payload.contractStart || "",
    contractEnd: payload.contractEnd || "",
    rateType: payload.rateType || "Daily",
    rateValue: Number(payload.rateValue) || 0,
    rating: Number(payload.rating) || 5.0,
    complianceStatus: payload.complianceStatus || "Compliant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.contractors.unshift(contractor);
  logAudit({
    title: "Contractor engaged",
    detail: `${contractor.name} engaged for ${contractor.trade} at ${getProjectById(contractor.projectId)?.name || "project"}.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return {
    ...contractor,
    projectName: getProjectById(contractor.projectId)?.name || "Unknown project",
  };
};

const listContractors = () => ({
  contractors: state.contractors.map((item) => {
    normalizeContractor(item);
    return {
      ...item,
      projectName: getProjectById(item.projectId)?.name || "Unknown project",
    };
  }),
});

const updateContractor = async (contractorId, payload, actorId) => {
  const contractor = getContractorById(contractorId);
  if (!contractor) {
    throw createHttpError(404, "Contractor not found");
  }

  contractor.name = payload.name || contractor.name;
  contractor.trade = payload.trade || contractor.trade;
  contractor.projectId = payload.projectId || contractor.projectId;
  if (Object.prototype.hasOwnProperty.call(payload, "workforce")) {
    contractor.workforce = Number(payload.workforce) || 0;
  }
  contractor.status = payload.status || contractor.status;
  
  if (payload.contactPerson !== undefined) contractor.contactPerson = payload.contactPerson;
  if (payload.phone !== undefined) contractor.phone = payload.phone;
  if (payload.email !== undefined) contractor.email = payload.email;
  if (payload.gstin !== undefined) contractor.gstin = payload.gstin;
  if (payload.pan !== undefined) contractor.pan = payload.pan;
  if (payload.address !== undefined) contractor.address = payload.address;
  if (payload.contractStart !== undefined) contractor.contractStart = payload.contractStart;
  if (payload.contractEnd !== undefined) contractor.contractEnd = payload.contractEnd;
  if (payload.rateType !== undefined) contractor.rateType = payload.rateType;
  if (Object.prototype.hasOwnProperty.call(payload, "rateValue")) {
    contractor.rateValue = Number(payload.rateValue) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "rating")) {
    contractor.rating = Number(payload.rating) || 0;
  }
  if (payload.complianceStatus !== undefined) contractor.complianceStatus = payload.complianceStatus;
  
  contractor.updatedAt = new Date().toISOString();

  logAudit({
    title: contractor.status === "Closed" ? "Contractor archived" : "Contractor updated",
    detail: `${contractor.name} is now ${contractor.status} for ${contractor.trade} at ${getProjectById(contractor.projectId)?.name || "project"}.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return {
    ...contractor,
    projectName: getProjectById(contractor.projectId)?.name || "Unknown project",
  };
};

const archiveContractor = async (contractorId, actorId) =>
  updateContractor(contractorId, { status: "Closed" }, actorId);

const getContractorDetail = async (contractorId) => {
  const contractor = getContractorById(contractorId);
  if (!contractor) {
    throw createHttpError(404, "Contractor not found");
  }

  normalizeContractor(contractor);

  const index = parseInt(contractor.id.replace(/\D/g, "") || "1", 10);
  const total = contractor.workforce || 0;
  const supervisors = Math.max(1, Math.floor(total * 0.08));
  const engineers = Math.max(1, Math.floor(total * 0.05));
  const skilled = Math.floor(total * 0.4);
  const semiSkilled = Math.floor(total * 0.25);
  const laborers = Math.max(0, total - (supervisors + engineers + skilled + semiSkilled));

  const project1 = getProjectById(contractor.projectId);
  const allProjects = state.projects || [];
  const project2 = allProjects[(index + 1) % allProjects.length] || project1;

  const engagementHistory = [
    {
      id: `eng-${index}-1`,
      projectId: contractor.projectId,
      projectName: project1?.name || "Current Project",
      duration: "6 Months (Active)",
      workforceDeployed: total,
      performanceRating: contractor.rating || 4.5,
      status: "Active",
    },
    {
      id: `eng-${index}-2`,
      projectId: project2?.id || "proj-other",
      projectName: project2?.name || "Previous Project",
      duration: "12 Months (Completed)",
      workforceDeployed: Math.round(total * 0.8),
      performanceRating: Number(Math.min(5.0, (contractor.rating || 4.5) + 0.2).toFixed(1)),
      status: "Completed",
    },
  ];

  const complianceSummary = {
    agreementStatus: contractor.complianceStatus === "Compliant" ? "Active & Signed" : contractor.complianceStatus === "Pending Review" ? "Under Review" : "Expired",
    insuranceStatus: contractor.complianceStatus === "Compliant" ? "Valid" : "Pending Renewal",
    licenseStatus: "Valid",
    safetyCertification: "Certified",
  };

  const workforceTrend = [
    { date: "Jan", value: Math.round(total * 0.7) },
    { date: "Feb", value: Math.round(total * 0.8) },
    { date: "Mar", value: Math.round(total * 0.95) },
    { date: "Apr", value: total },
    { date: "May", value: total },
    { date: "Jun", value: total },
  ];

  const productivityTrend = [
    { date: "Jan", value: 85 + (index % 10) },
    { date: "Feb", value: 88 + (index % 5) },
    { date: "Mar", value: 92 + (index % 4) },
    { date: "Apr", value: 90 + (index % 6) },
    { date: "May", value: 94 + (index % 3) },
    { date: "Jun", value: 95 + (index % 2) },
  ];

  const attendanceTrend = [
    { date: "Jan", value: 90 + (index % 8) },
    { date: "Feb", value: 92 + (index % 5) },
    { date: "Mar", value: 91 + (index % 6) },
    { date: "Apr", value: 94 + (index % 4) },
    { date: "May", value: 95 + (index % 3) },
    { date: "Jun", value: 96 + (index % 2) },
  ];

  const projectContribution = [
    { name: project1?.name || "Current Project", value: 65 },
    { name: project2?.name || "Previous Project", value: 35 },
  ];

  const rateValue = contractor.rateValue || 350;
  const invoicesRaised = total * rateValue * 25;
  const invoicesPaid = Math.round(invoicesRaised * 0.85);
  const outstandingAmount = invoicesRaised - invoicesPaid;
  const paymentPerformance = index % 3 === 0 ? "Delayed" : "On Time";

  const timelineData = [
    {
      id: `tml-${index}-1`,
      title: "Contract Created",
      detail: `Initial contract signed under trade ${contractor.trade}`,
      timestamp: contractor.contractStart,
      category: "Contract",
    },
    {
      id: `tml-${index}-2`,
      title: "Project Assigned",
      detail: `Assigned to ${project1?.name || "Project"} with initial mobilization of ${Math.round(total * 0.5)} workers.`,
      timestamp: contractor.contractStart,
      category: "Workforce",
    },
    {
      id: `tml-${index}-3`,
      title: "Compliance Verified",
      detail: `Labor licensing and safety clearance documents approved.`,
      timestamp: contractor.contractStart,
      category: "Compliance",
    },
    {
      id: `tml-${index}-4`,
      title: "Workforce Increased",
      detail: `Mobilized additional workers to reach peak capacity of ${total}.`,
      timestamp: `2026-04-15`,
      category: "Workforce",
    },
    {
      id: `tml-${index}-5`,
      title: "Payment Processed",
      detail: `Milestone billing for invoice cycle Q1 cleared.`,
      timestamp: `2026-05-10`,
      category: "Finance",
    },
  ];

  const documents = [
    {
      id: `doc-${index}-1`,
      name: "Master Service Agreement (MSA)",
      status: contractor.complianceStatus === "Expired Documents" ? "Expired Documents" : "Compliant",
      expiryDate: contractor.contractEnd,
      documentType: "Agreement",
    },
    {
      id: `doc-${index}-2`,
      name: "Workmen Compensation Insurance Policy",
      status: contractor.complianceStatus === "Pending Review" ? "Pending Review" : "Compliant",
      expiryDate: `2026-08-30`,
      documentType: "Insurance",
    },
    {
      id: `doc-${index}-3`,
      name: "Trade License & Registration",
      status: "Compliant",
      expiryDate: `2027-03-31`,
      documentType: "License",
    },
    {
      id: `doc-${index}-4`,
      name: "Safety Audit Compliance Certificate",
      status: "Compliant",
      expiryDate: `2026-11-15`,
      documentType: "Safety Certification",
    },
  ];

  return {
    profile: contractor,
    engagementHistory,
    workforceBreakdown: {
      skilled,
      semiSkilled,
      supervisors,
      engineers,
      laborers,
    },
    complianceSummary,
    performanceMetrics: {
      workforceTrend,
      productivityTrend,
      attendanceTrend,
      projectContribution,
    },
    financialSummary: {
      invoicesRaised,
      invoicesPaid,
      outstandingAmount,
      paymentPerformance,
    },
    timelineData,
    documents,
  };
};

const markAttendance = async (payload, actorId) => {
  if (!payload.employeeId || !payload.projectId) {
    throw createHttpError(400, "Employee and project are required");
  }

  const attendance = {
    id: `att-${randomUUID()}`,
    employeeId: payload.employeeId,
    projectId: payload.projectId,
    shift: payload.shift || "Day",
    status: payload.status || "Present",
    checkIn: payload.checkIn || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  state.attendance.unshift(attendance);
  logAudit({
    title: "Attendance marked",
    detail: `${findEmployeeById(attendance.employeeId)?.name || "Employee"} marked ${attendance.status} for ${attendance.shift} shift.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return {
    ...attendance,
    employeeName: findEmployeeById(attendance.employeeId)?.name || "Unknown employee",
    projectName: getProjectById(attendance.projectId)?.name || "Unknown project",
  };
};

const getAttendanceDateKey = (entry) => {
  const value = entry?.checkIn || entry?.createdAt;

  if (!value) {
    return null;
  }

  const parsedTime = new Date(value).getTime();
  if (Number.isNaN(parsedTime)) {
    return null;
  }

  return new Date(parsedTime).toISOString().slice(0, 10);
};

const getAttendanceSnapshotDate = () => {
  const latestTimestamp = state.attendance.reduce((latest, entry) => {
    const value = entry?.checkIn || entry?.createdAt;
    const parsedTime = value ? new Date(value).getTime() : Number.NaN;

    if (Number.isNaN(parsedTime)) {
      return latest;
    }

    return parsedTime > latest ? parsedTime : latest;
  }, 0);

  return latestTimestamp
    ? new Date(latestTimestamp).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
};

const getAttendanceEntriesForSnapshotDate = () => {
  const snapshotDate = getAttendanceSnapshotDate();

  return state.attendance.filter(
    (entry) => getAttendanceDateKey(entry) === snapshotDate,
  );
};

const getPastDateKeys = (snapshotDate, daysCount) => {
  const result = [];
  const baseDate = new Date(snapshotDate);
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setUTCDate(baseDate.getUTCDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
};

const getAttendanceSummary = () => {
  const entries = getAttendanceEntriesForSnapshotDate();
  return {
    present: entries.filter((item) => item.status === "Present").length,
    late: entries.filter((item) => item.status === "Late").length,
    absent: entries.filter((item) => item.status === "Absent").length,
  };
};

const getAttendanceOverview = () => {
  const snapshotDate = getAttendanceSnapshotDate();
  const activeEmployees = state.employees.filter((emp) => emp.status !== "Inactive");
  const totalActive = activeEmployees.length;

  const past7Days = getPastDateKeys(snapshotDate, 7);

  const dailyStats = past7Days.map(dateKey => {
    const entries = state.attendance.filter((e) => getAttendanceDateKey(e) === dateKey);
    const present = entries.filter((e) => e.status === "Present" || e.status === "Late" || e.status === "Half Day").length;
    const absent = entries.filter((e) => e.status === "Absent").length;
    const late = entries.filter((e) => e.status === "Late").length;
    const activeSites = new Set(entries.filter((e) => e.status !== "Absent").map((e) => e.projectId)).size;
    const rate = totalActive > 0 ? (present / totalActive) * 100 : 0;
    const availability = 91 + (present % 3);
    return { present, absent, late, activeSites, rate, availability };
  });

  const today = dailyStats[6];
  const yesterday = dailyStats[5];
  const lastWeekDate = new Date(snapshotDate);
  lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);
  const lastWeekDateKey = lastWeekDate.toISOString().slice(0, 10);
  const lastWeekEntries = state.attendance.filter((e) => getAttendanceDateKey(e) === lastWeekDateKey);
  const lastWeekPresent = lastWeekEntries.filter((e) => e.status === "Present" || e.status === "Late" || e.status === "Half Day").length;
  const lastWeekRate = totalActive > 0 ? (lastWeekPresent / totalActive) * 100 : 0;

  const rateDiff = today.rate - lastWeekRate;
  const rateTrendText = rateDiff >= 0
    ? `+${rateDiff.toFixed(1)}% vs last week`
    : `${rateDiff.toFixed(1)}% vs last week`;

  const absentDiff = today.absent - yesterday.absent;
  const absentTrendText = absentDiff >= 0
    ? `+${absentDiff} vs yesterday`
    : `${absentDiff} vs yesterday`;

  const lateDiff = today.late - yesterday.late;
  const lateTrendText = lateDiff >= 0
    ? `+${lateDiff} vs yesterday`
    : `${lateDiff} vs yesterday`;

  return {
    presentToday: {
      value: today.present,
      trend: `${Math.round(today.rate)}% attendance`,
      trendType: "up",
      status: "Healthy",
      sparkline: dailyStats.map(s => s.present),
    },
    attendanceRate: {
      value: `${today.rate.toFixed(1)}%`,
      trend: rateTrendText,
      trendType: rateDiff >= 0 ? "up" : "down",
      status: today.rate >= 90 ? "Healthy" : "Warning",
      sparkline: dailyStats.map(s => Math.round(s.rate)),
    },
    absentEmployees: {
      value: today.absent,
      trend: absentTrendText,
      trendType: absentDiff <= 0 ? "down" : "up",
      status: today.absent > 40 ? "Warning" : "Healthy",
      sparkline: dailyStats.map(s => s.absent),
    },
    lateCheckins: {
      value: today.late,
      trend: today.late > 15 ? "Needs attention" : "Normal level",
      trendType: today.late > 15 ? "warning" : "neutral",
      status: today.late > 15 ? "Warning" : "Healthy",
      sparkline: dailyStats.map(s => s.late),
    },
    activeSites: {
      value: today.activeSites || 14,
      trend: "Fully staffed",
      trendType: "neutral",
      status: "Healthy",
      sparkline: dailyStats.map(s => s.activeSites || 14),
    },
    workforceAvailability: {
      value: `${today.availability}%`,
      trend: today.availability >= 90 ? "Healthy" : "Needs attention",
      trendType: "neutral",
      status: "Healthy",
      sparkline: dailyStats.map(s => s.availability),
    },
  };
};

const getAttendanceAnalytics = () => {
  const snapshotDate = getAttendanceSnapshotDate();
  const activeEmployees = state.employees.filter((emp) => emp.status !== "Inactive");
  const totalActive = activeEmployees.length;

  const past30Days = getPastDateKeys(snapshotDate, 30);

  const attendanceTrend = past30Days.map(dateKey => {
    const entries = state.attendance.filter((e) => getAttendanceDateKey(e) === dateKey);
    const present = entries.filter((e) => e.status === "Present" || e.status === "Late" || e.status === "Half Day").length;
    const rate = totalActive > 0 ? Math.round((present / totalActive) * 100) : 0;
    return {
      date: dateKey.slice(5),
      percentage: rate,
      present,
      total: totalActive,
    };
  });

  const departments = [...new Set(activeEmployees.map(e => e.department).filter(Boolean))];
  const todayEntries = state.attendance.filter((e) => getAttendanceDateKey(e) === snapshotDate);

  const departmentAttendance = departments.map(dept => {
    const deptEmployees = activeEmployees.filter(e => e.department === dept);
    const deptTotal = deptEmployees.length;
    const deptPresent = todayEntries.filter(entry => {
      const emp = findEmployeeById(entry.employeeId);
      return emp && emp.department === dept && (entry.status === "Present" || entry.status === "Late" || entry.status === "Half Day");
    }).length;
    const rate = deptTotal > 0 ? Math.round((deptPresent / deptTotal) * 100) : 0;
    return {
      department: dept,
      rate,
      present: deptPresent,
      total: deptTotal,
    };
  }).sort((a, b) => b.rate - a.rate);

  const projectEntriesMap = {};
  let totalPresentCount = 0;
  todayEntries.forEach(entry => {
    if (entry.status === "Present" || entry.status === "Late" || entry.status === "Half Day") {
      const projName = getProjectById(entry.projectId)?.name || "Unknown Site";
      projectEntriesMap[projName] = (projectEntriesMap[projName] || 0) + 1;
      totalPresentCount++;
    }
  });

  const siteAttendance = Object.keys(projectEntriesMap).map(site => {
    const count = projectEntriesMap[site];
    const percentage = totalPresentCount > 0 ? Math.round((count / totalPresentCount) * 1000) / 10 : 0;
    return {
      site,
      count,
      percentage,
    };
  }).sort((a, b) => b.count - a.count);

  const lateArrivalTrend = past30Days.map(dateKey => {
    const entries = state.attendance.filter((e) => getAttendanceDateKey(e) === dateKey);
    const count = entries.filter((e) => e.status === "Late").length;
    return {
      date: dateKey.slice(5),
      count,
    };
  });

  return {
    attendanceTrend,
    departmentAttendance,
    siteAttendance,
    lateArrivalTrend,
  };
};

const getAttendancePendingCheckins = () => {
  const snapshotDate = getAttendanceSnapshotDate();
  const activeEmployees = state.employees.filter((emp) => emp.status !== "Inactive");
  const todayEntries = state.attendance.filter((e) => getAttendanceDateKey(e) === snapshotDate);
  const checkedInIds = new Set(todayEntries.map(e => e.employeeId));

  const pending = activeEmployees.filter(emp => !checkedInIds.has(emp.id)).map(emp => {
    const proj = getProjectById(emp.projectId);
    return {
      id: emp.id,
      name: emp.name,
      department: emp.department || "Projects",
      designation: emp.designation || "Façade Supervisor",
      projectName: proj?.name || "Unassigned Site",
      projectLocation: proj?.location || "N/A",
      avatar: null,
    };
  });

  return pending;
};

const listAttendance = (filters = {}) => {
  const snapshotDate = getAttendanceSnapshotDate();

  let filtered = state.attendance.map((item) => {
    const employee = findEmployeeById(item.employeeId);
    const proj = getProjectById(item.projectId);
    return {
      ...item,
      employeeName: employee?.name || "Unknown employee",
      employeeDesignation: employee?.designation || "Staff",
      employeeDepartment: employee?.department || "Unassigned",
      projectName: proj?.name || "Unknown project",
      projectSite: proj?.location || "N/A",
    };
  });

  if (filters.search) {
    const term = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      item.employeeName.toLowerCase().includes(term) ||
      item.employeeDesignation.toLowerCase().includes(term)
    );
  }
  if (filters.status) {
    filtered = filtered.filter(item => item.status === filters.status);
  }
  if (filters.department) {
    filtered = filtered.filter(item => item.employeeDepartment === filters.department);
  }
  if (filters.projectId) {
    filtered = filtered.filter(item => item.projectId === filters.projectId);
  }
  if (filters.startDate) {
    filtered = filtered.filter(item => new Date(item.checkIn) >= new Date(filters.startDate));
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setUTCDate(end.getUTCDate() + 1);
    filtered = filtered.filter(item => new Date(item.checkIn) < end);
  }

  const totalCount = filtered.length;
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    attendance: paginated,
    snapshotDate,
    summary: getAttendanceSummary(),
    pagination: {
      totalCount,
      page,
      limit,
      pageCount: Math.ceil(totalCount / limit),
    }
  };
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const isMilestoneTask = (task) =>
  `${task?.discipline || ""}`.toLowerCase() === "milestone" ||
  `${task?.title || ""}`.toLowerCase().includes("milestone");

const severityRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Stable: 1,
};

const riskLevelFromScore = (score) => {
  if (score >= 70) {
    return "Critical";
  }

  if (score >= 40) {
    return "High";
  }

  if (score >= 20) {
    return "Medium";
  }

  return "Stable";
};

const getProjectRiskInsights = () => {
  const now = Date.now();
  const projects = listProjects().projects;
  const tasks = state.projectTasks.map(serializeProjectTask);
  const attendanceEntries = getAttendanceEntriesForSnapshotDate();
  const reportsByProject = state.dailyReports.reduce((accumulator, report) => {
    const current = accumulator[report.projectId];
    if (
      !current ||
      new Date(report.reportDate).getTime() > new Date(current.reportDate).getTime()
    ) {
      accumulator[report.projectId] = report;
    }
    return accumulator;
  }, {});

  const rows = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const openTasks = projectTasks.filter((task) => task.status !== "Done");
    const overdueTasks = openTasks.filter((task) => {
      const dueTime = new Date(task.dueDate).getTime();
      return dueTime < now - 3 * MILLISECONDS_PER_DAY;
    });
    const overdueMilestones = openTasks.filter((task) => {
      const dueTime = new Date(task.dueDate).getTime();
      return isMilestoneTask(task) && dueTime < now;
    });
    const materialShortages = state.materials.filter(
      (material) =>
        material.projectId === project.id &&
        material.status !== "Archived" &&
        Number(material.onHand) <= Number(material.reorderLevel),
    );
    const criticalMaterialShortages = materialShortages.filter(
      (material) => Number(material.onHand) < Number(material.reorderLevel) * 0.75,
    );
    const presentLabor = attendanceEntries.filter(
      (entry) => entry.projectId === project.id && entry.status === "Present",
    ).length;
    const lateLabor = attendanceEntries.filter(
      (entry) => entry.projectId === project.id && entry.status === "Late",
    ).length;
    const activeContractors = state.contractors.filter(
      (contractor) => contractor.projectId === project.id && contractor.status !== "Closed",
    );
    const engagedContractorWorkforce = activeContractors.reduce((sum, contractor) => {
      const effectiveWorkforce =
        contractor.status === "Mobilizing"
          ? Math.round(contractor.workforce * 0.6)
          : contractor.workforce;
      return sum + effectiveWorkforce;
    }, 0);
    const resourceRows = state.resourceAllocations.filter((item) => item.projectId === project.id);
    const averageResourceUtilization = resourceRows.length
      ? Math.round(resourceRows.reduce((sum, item) => sum + item.utilization, 0) / resourceRows.length)
      : 0;
    const workforcePressure =
      openTasks.length > 0 &&
      (presentLabor === 0 ||
        engagedContractorWorkforce < 20 ||
        averageResourceUtilization < 55 ||
        activeContractors.some((contractor) => contractor.status === "Mobilizing"));

    const signals = [];

    if (overdueTasks.length) {
      const maxOverdueDays = Math.max(
        ...overdueTasks.map((task) =>
          Math.max(0, Math.floor((now - new Date(task.dueDate).getTime()) / MILLISECONDS_PER_DAY)),
        ),
      );
      const severity = maxOverdueDays >= 7 ? "Critical" : "High";
      signals.push({
        id: `risk-task-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        signalType: "Task Overdue",
        title: `${overdueTasks.length} task${overdueTasks.length > 1 ? "s are" : " is"} overdue`,
        severity,
        scoreImpact: severity === "Critical" ? 32 : 22,
        ownerName: overdueTasks[0]?.ownerName || project.managerName,
        detail: `${project.name} has ${overdueTasks.length} open task${overdueTasks.length > 1 ? "s" : ""} overdue by more than 3 days. The oldest delay is ${maxOverdueDays} days.`,
        metricLabel: "Overdue tasks",
        metricValue: `${overdueTasks.length}`,
        dueAt: overdueTasks.slice().sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0]?.dueDate || null,
      });
    }

    if (overdueMilestones.length) {
      const maxMilestoneDelayDays = Math.max(
        ...overdueMilestones.map((task) =>
          Math.max(0, Math.floor((now - new Date(task.dueDate).getTime()) / MILLISECONDS_PER_DAY)),
        ),
      );
      const severity = maxMilestoneDelayDays >= 5 ? "Critical" : "High";
      signals.push({
        id: `risk-milestone-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        signalType: "Milestone Delay",
        title: `${overdueMilestones.length} milestone${overdueMilestones.length > 1 ? "s are" : " is"} overdue`,
        severity,
        scoreImpact: severity === "Critical" ? 36 : 26,
        ownerName: overdueMilestones[0]?.ownerName || project.managerName,
        detail: `${project.name} has overdue milestone commitments. The longest milestone slippage is ${maxMilestoneDelayDays} days against the planned date.`,
        metricLabel: "Delayed milestones",
        metricValue: `${overdueMilestones.length}`,
        dueAt: overdueMilestones.slice().sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0]?.dueDate || null,
      });
    }

    if (workforcePressure) {
      const severity = presentLabor === 0 || engagedContractorWorkforce < 15 ? "High" : "Medium";
      signals.push({
        id: `risk-workforce-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        signalType: "Workforce Allocation",
        title: "Workforce allocation is below target",
        severity,
        scoreImpact: severity === "High" ? 20 : 14,
        ownerName: project.managerName,
        detail: `${project.name} has ${presentLabor} present staff, ${engagedContractorWorkforce} external workforce capacity, and ${averageResourceUtilization}% average resource utilization against ${openTasks.length} open workfronts.`,
        metricLabel: "Present workforce",
        metricValue: `${presentLabor} present / ${engagedContractorWorkforce} external`,
        dueAt: openTasks.slice().sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0]?.dueDate || null,
      });
    }

    if (materialShortages.length) {
      const severity = criticalMaterialShortages.length > 0 || materialShortages.length >= 2 ? "High" : "Medium";
      signals.push({
        id: `risk-material-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        signalType: "Material Shortage",
        title: `${materialShortages.length} material shortage trigger${materialShortages.length > 1 ? "s" : ""}`,
        severity,
        scoreImpact: severity === "High" ? 22 : 14,
        ownerName: "Supply Chain Desk",
        detail: `${project.name} is carrying ${materialShortages.length} low-stock material${materialShortages.length > 1 ? "s" : ""}, with ${criticalMaterialShortages.length} already below critical buffer.`,
        metricLabel: "Low stock materials",
        metricValue: `${materialShortages.length}`,
        dueAt: null,
      });
    }

    const sortedSignals = signals.sort((left, right) => {
      const severityDelta = (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0);
      if (severityDelta !== 0) {
        return severityDelta;
      }
      return right.scoreImpact - left.scoreImpact;
    });
    const riskScore = Math.min(100, sortedSignals.reduce((sum, signal) => sum + signal.scoreImpact, 0));
    const latestReport = reportsByProject[project.id] || null;

    return {
      id: project.id,
      projectName: project.name,
      stage: project.stage,
      bookedUnits: project.bookedUnits,
      availableUnits: project.availableUnits,
      riskScore,
      riskLevel: riskLevelFromScore(riskScore),
      openSignals: sortedSignals.length,
      delayedTasks: overdueTasks.length,
      delayedMilestones: overdueMilestones.length,
      materialShortages: materialShortages.length,
      criticalMaterialShortages: criticalMaterialShortages.length,
      presentLabor,
      lateLabor,
      engagedContractorWorkforce,
      averageResourceUtilization,
      latestReportSummary: latestReport?.progressSummary || "No field report logged yet.",
      latestReportDate: latestReport?.reportDate || null,
      nextDueAt: openTasks.slice().sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0]?.dueDate || null,
      primaryRisk: sortedSignals[0]?.title || "No active risk triggers",
      signals: sortedSignals,
    };
  });

  const sortedProjects = rows.sort((left, right) => {
    if (right.riskScore !== left.riskScore) {
      return right.riskScore - left.riskScore;
    }
    return left.projectName.localeCompare(right.projectName);
  });
  const alerts = sortedProjects.flatMap((project) => project.signals).sort((left, right) => {
    const severityDelta = (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return right.scoreImpact - left.scoreImpact;
  });

  return {
    summary: {
      totalProjects: sortedProjects.length,
      criticalProjects: sortedProjects.filter((project) => project.riskLevel === "Critical").length,
      watchProjects: sortedProjects.filter((project) => ["High", "Medium"].includes(project.riskLevel)).length,
      healthyProjects: sortedProjects.filter((project) => project.riskLevel === "Stable").length,
      totalSignals: alerts.length,
      delayedTaskSignals: alerts.filter((item) => item.signalType === "Task Overdue").length,
      milestoneSignals: alerts.filter((item) => item.signalType === "Milestone Delay").length,
      workforceSignals: alerts.filter((item) => item.signalType === "Workforce Allocation").length,
      materialSignals: alerts.filter((item) => item.signalType === "Material Shortage").length,
    },
    projects: sortedProjects,
    alerts,
    rules: [
      {
        id: "rule-task-overdue",
        title: "Task overdue",
        threshold: "Open task overdue by more than 3 days",
        description: "If an open project task misses its due date by 3+ days, the engine creates a schedule risk signal.",
      },
      {
        id: "rule-milestone-overdue",
        title: "Milestone overdue",
        threshold: "Open milestone task past its due date",
        description: "Milestone-tagged tasks immediately raise a delay signal when the milestone due date slips.",
      },
      {
        id: "rule-workforce-allocation",
        title: "Low workforce allocation",
        threshold: "Open workfronts with weak attendance, mobilizing crews, or sub-55% resource utilization",
        description: "The engine flags execution pressure when staffing coverage is weak against current open workfronts.",
      },
      {
        id: "rule-material-shortage",
        title: "Material shortage",
        threshold: "Material on hand at or below reorder level",
        description: "Low-stock materials raise supply-risk indicators at the project level without any ML or forecast model.",
      },
    ],
    generatedAt: new Date().toISOString(),
  };
};

const getAdminSettings = () => ({
  workflowSettings: clone(state.workflowSettings),
  notificationSettings: clone(state.notificationSettings),
  permissionsMatrix: getPermissionsMatrix(),
  auditLogs: clone(state.auditLogs.slice(0, 12)),
});

const RESERVATION_HOLD_DAYS = 7;

const listReservations = () => {
  const now = Date.now();
  return {
    reservations: clone(state.reservations || []).map((r) => ({
      ...r,
      leadName: getLeadById(r.leadId) ? `${getLeadById(r.leadId).firstName} ${getLeadById(r.leadId).lastName}` : "Unknown",
      projectName: getProjectById(r.projectId)?.name || "Unknown",
      unitCode: getUnitDisplay(r.unitId)?.code || "Unknown",
      isExpired: new Date(r.expiresAt).getTime() < now,
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
};

const createReservation = async (payload, actorId) => {
  const lead = getLeadById(payload.leadId);
  const unitContext = getUnitContext(payload.unitId);
  if (!lead || !unitContext) {
    throw createHttpError(400, "Lead and unit are required");
  }
  if (unitContext.unit.status !== "available") {
    throw createHttpError(409, "Unit is not available for reservation");
  }

  const expiresAt = new Date(Date.now() + RESERVATION_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const reservation = {
    id: `res-${randomUUID()}`,
    leadId: payload.leadId,
    unitId: payload.unitId,
    projectId: unitContext.project.id,
    notes: `${payload.notes || ""}`.trim(),
    status: "Active",
    createdAt: new Date().toISOString(),
    expiresAt,
    createdBy: actorId,
  };

  if (!state.reservations) state.reservations = [];
  state.reservations.unshift(reservation);
  unitContext.unit.status = "reserved";
  unitContext.unit.leadId = payload.leadId;
  lead.stage = lead.stage === "Negotiation" ? lead.stage : "Negotiation";
  lead.updatedAt = new Date().toISOString();

  logAudit({
    title: "Unit reserved for lead",
    detail: `${lead.firstName} ${lead.lastName} reserved ${unitContext.unit.code} in ${unitContext.project.name} (${RESERVATION_HOLD_DAYS}-day hold).`,
    actorId,
    category: "Sales",
  });
  await persistState();
  return { reservation: { ...reservation, leadName: `${lead.firstName} ${lead.lastName}`, projectName: unitContext.project.name, unitCode: unitContext.unit.code, isExpired: false } };
};

const releaseReservation = async (reservationId, actorId) => {
  if (!state.reservations) throw createHttpError(404, "No reservations found");
  const idx = state.reservations.findIndex((r) => r.id === reservationId);
  if (idx === -1) throw createHttpError(404, "Reservation not found");
  const reservation = state.reservations[idx];
  const unitContext = getUnitContext(reservation.unitId);
  if (unitContext && unitContext.unit.status === "reserved") {
    unitContext.unit.status = "available";
    delete unitContext.unit.leadId;
  }
  state.reservations.splice(idx, 1);

  logAudit({
    title: "Reservation released",
    detail: `Reservation ${reservationId} was released, unit returned to available inventory.`,
    actorId,
    category: "Sales",
  });
  await persistState();
  return { released: true };
};

const releaseExpiredReservations = () => {
  if (!state.reservations) return 0;
  const now = Date.now();
  let released = 0;
  state.reservations = state.reservations.filter((r) => {
    if (new Date(r.expiresAt).getTime() < now) {
      const unitContext = getUnitContext(r.unitId);
      if (unitContext && unitContext.unit.status === "reserved") {
        unitContext.unit.status = "available";
        delete unitContext.unit.leadId;
      }
      released++;
      return false;
    }
    return true;
  });
  return released;
};

const cleanupOrphanedReservations = () => {
  const activeUnitIds = new Set((state.reservations || []).map((r) => r.unitId));
  forEachUnit((unit) => {
    if (unit.status === "reserved" && !activeUnitIds.has(unit.id)) {
      unit.status = "available";
      delete unit.leadId;
    }
  });
};

setInterval(releaseExpiredReservations, 5 * 60 * 1000);

const getBudgetOverview = () => {
  const budgetMap = {};
  (state.budgetItems || []).forEach((item) => {
    const project = getProjectById(item.projectId);
    const projectName = project?.name || "Unknown";
    if (!budgetMap[item.projectId]) {
      budgetMap[item.projectId] = { projectId: item.projectId, projectName, categories: [], totalPlanned: 0, totalSpent: 0 };
    }
    budgetMap[item.projectId].categories.push(item);
    budgetMap[item.projectId].totalPlanned += item.plannedAmount;
    budgetMap[item.projectId].totalSpent += item.spentAmount;
  });
  return { budgetOverview: Object.values(budgetMap) };
};

const getVendorPayments = () => ({
  vendorPayments: (state.vendorPayments || []).map((p) => ({
    ...p,
    vendorName: getVendorById(p.vendorId)?.name || "Unknown vendor",
    poRef: (state.purchaseOrders || []).find((po) => po.id === p.poId)?.id || p.poId,
  })),
});

const recordVendorPayment = async (payload, actorId) => {
  if (!payload.vendorId || !payload.amount) throw createHttpError(400, "Vendor and amount are required");
  const payment = {
    id: `vp-${randomUUID()}`,
    vendorId: payload.vendorId,
    poId: payload.poId || "",
    amount: Number(payload.amount) || 0,
    paidDate: new Date().toISOString(),
    mode: payload.mode || "NEFT",
    reference: payload.reference || `AUTO-${Date.now()}`,
    status: "Paid",
  };
  if (!state.vendorPayments) state.vendorPayments = [];
  state.vendorPayments.unshift(payment);
  logAudit({
    title: "Vendor payment recorded",
    detail: `INR ${payment.amount.toLocaleString("en-IN")} paid to ${getVendorById(payment.vendorId)?.name || "vendor"}.`,
    actorId,
    category: "Procurement",
  });
  await persistState();
  return { ...payment, vendorName: getVendorById(payment.vendorId)?.name || "Unknown vendor", poRef: payment.poId };
};

const getDepartmentRate = (department, designation) => {
  const baseRates = {
    "Projects": 2200,
    "Procurement": 1800,
    "Finance": 2500,
    "Sales": 2000,
    "Admin": 1500
  };
  let base = baseRates[department] || 1600;
  const lowerDesignation = (designation || "").toLowerCase();
  if (lowerDesignation.includes("lead") || lowerDesignation.includes("manager") || lowerDesignation.includes("senior") || lowerDesignation.includes("engineer")) {
    base *= 1.35;
  } else if (lowerDesignation.includes("assistant") || lowerDesignation.includes("junior")) {
    base *= 0.85;
  }
  return Math.round(base);
};

const mapToPrimaryDepartment = (dept) => {
  const primary = ["Projects", "Procurement", "Finance", "Sales", "Admin"];
  if (primary.includes(dept)) return dept;
  if (dept === "Planning" || dept === "Quality" || dept === "HSE") return "Projects";
  return "Admin";
};

const getPayrollData = (filters = {}) => {
  const allEmployees = state.employees || [];
  
  const processed = allEmployees.map((emp) => {
    const history = getEmployeeAttendanceHistory(emp.id);
    const presentDays = history.filter((e) => e.status === "Present").length;
    const lateDays = history.filter((e) => e.status === "Late").length;
    const halfDays = history.filter((e) => e.status === "Half Day").length;
    const absentDays = history.filter((e) => e.status === "Absent").length;
    const trackedDays = history.length;

    const hoursWorked = history.reduce((sum, entry) => {
      if (entry.hoursWorked != null) return sum + entry.hoursWorked;
      if (entry.status === "Present" || entry.status === "Late") return sum + 8;
      if (entry.status === "Half Day") return sum + 4;
      return sum;
    }, 0);

    const primaryDept = mapToPrimaryDepartment(emp.department);
    const dailyRate = getDepartmentRate(primaryDept, emp.designation || emp.position);

    const grossPayEstimate = Math.round((presentDays + lateDays + halfDays * 0.5) * dailyRate);
    const attendanceRate = trackedDays ? Math.round(((presentDays + lateDays) / trackedDays) * 100) : 0;
    
    let recommendedPay = grossPayEstimate;
    let payrollStatus = "On Track";

    if (trackedDays > 0) {
      if (attendanceRate < 75 || lateDays > 5) {
        payrollStatus = "Needs Attention";
        recommendedPay = Math.round(grossPayEstimate * 0.90);
      } else if (attendanceRate < 85 || lateDays > 2) {
        payrollStatus = "Review";
        recommendedPay = Math.round(grossPayEstimate * 0.96);
      } else if (attendanceRate >= 95) {
        recommendedPay = Math.round(grossPayEstimate * 1.03);
      }
    } else {
      payrollStatus = "Needs Attention";
      recommendedPay = 0;
    }

    let productivityScore = 0;
    if (trackedDays > 0) {
      productivityScore = Math.round(attendanceRate * 0.9 + (hoursWorked / (trackedDays * 8)) * 10 - (lateDays * 1));
      productivityScore = Math.max(55, Math.min(100, productivityScore));
    }

    const proj = getProjectById(emp.projectId);

    return {
      id: emp.id,
      name: emp.name,
      department: primaryDept,
      originalDepartment: emp.department,
      designation: emp.designation || "Staff",
      projectName: proj?.name || emp.projectName || "Unassigned Project",
      projectRole: emp.position || emp.designation || "Staff",
      presentDays,
      lateDays,
      hoursWorked,
      dailyRate,
      grossPayEstimate,
      recommendedPay,
      status: payrollStatus,
      productivityScore,
      trackedDays,
      attendanceRate
    };
  });

  let filtered = processed;

  if (filters.search) {
    const term = filters.search.toLowerCase();
    filtered = filtered.filter(
      (emp) =>
        emp.name.toLowerCase().includes(term) ||
        emp.designation.toLowerCase().includes(term)
    );
  }

  if (filters.department) {
    filtered = filtered.filter((emp) => emp.department === filters.department);
  }

  if (filters.projectId) {
    const proj = getProjectById(filters.projectId);
    const targetName = proj?.name?.toLowerCase() || filters.projectId.toLowerCase();
    filtered = filtered.filter(
      (emp) =>
        emp.projectName.toLowerCase().includes(targetName) ||
        allEmployees.find((e) => e.id === emp.id)?.projectId === filters.projectId
    );
  }

  if (filters.status) {
    filtered = filtered.filter((emp) => emp.status === filters.status);
  }

  let totalPayrollCost = 0;
  let totalLiability = 0;
  let totalPresentDays = 0;
  let totalTrackedDays = 0;
  let totalProductivity = 0;
  let productivityCount = 0;
  
  const projectLaborCostsMap = {};
  const deptCostsMap = { Projects: 0, Procurement: 0, Sales: 0, Finance: 0, Admin: 0 };
  const deptEmployeeCount = { Projects: 0, Procurement: 0, Sales: 0, Finance: 0, Admin: 0 };
  const deptAttendanceSum = { Projects: 0, Procurement: 0, Sales: 0, Finance: 0, Admin: 0 };
  const deptProductivitySum = { Projects: 0, Procurement: 0, Sales: 0, Finance: 0, Admin: 0 };

  processed.forEach((emp) => {
    totalPayrollCost += emp.recommendedPay;
    
    if (emp.status === "Review" || emp.status === "Needs Attention") {
      totalLiability += emp.recommendedPay;
    }

    totalPresentDays += emp.presentDays;
    totalTrackedDays += emp.trackedDays;

    if (emp.productivityScore > 0) {
      totalProductivity += emp.productivityScore;
      productivityCount++;
    }

    if (emp.projectName && emp.projectName !== "Unassigned Project") {
      if (!projectLaborCostsMap[emp.projectName]) {
        projectLaborCostsMap[emp.projectName] = {
          projectName: emp.projectName,
          laborCost: 0,
          workforceCount: 0,
          totalEfficiency: 0,
          efficiencyCount: 0
        };
      }
      projectLaborCostsMap[emp.projectName].laborCost += emp.recommendedPay;
      projectLaborCostsMap[emp.projectName].workforceCount += 1;
      projectLaborCostsMap[emp.projectName].totalEfficiency += emp.productivityScore;
      projectLaborCostsMap[emp.projectName].efficiencyCount += 1;
    }

    const primaryDept = emp.department;
    if (deptCostsMap[primaryDept] !== undefined) {
      deptCostsMap[primaryDept] += emp.recommendedPay;
      deptEmployeeCount[primaryDept] += 1;
      deptAttendanceSum[primaryDept] += emp.attendanceRate;
      deptProductivitySum[primaryDept] += emp.productivityScore;
    }
  });

  const projectLaborCosts = Object.values(projectLaborCostsMap).map((p) => {
    const avgEfficiency = p.efficiencyCount ? Math.round(p.totalEfficiency / p.efficiencyCount) : 85;
    const trendSeed = p.projectName.length % 3;
    const costTrend = trendSeed === 0 ? "+4%" : trendSeed === 1 ? "+2%" : "-1%";
    return {
      projectName: p.projectName,
      laborCost: p.laborCost,
      workforceCount: p.workforceCount,
      costTrend,
      efficiencyScore: avgEfficiency
    };
  }).sort((a, b) => b.laborCost - a.laborCost);

  const primaryDepts = ["Projects", "Procurement", "Sales", "Finance", "Admin"];
  const totalDeptCosts = primaryDepts.reduce((sum, d) => sum + deptCostsMap[d], 0) || 1;
  const payrollDistribution = primaryDepts.map((d) => ({
    name: d,
    value: Math.round((deptCostsMap[d] / totalDeptCosts) * 100)
  }));

  const productivityMatrix = primaryDepts.map((d) => {
    const empCount = deptEmployeeCount[d] || 1;
    const avgAttendance = Math.round(deptAttendanceSum[d] / empCount) || 92;
    const avgProductivity = Math.round(deptProductivitySum[d] / empCount) || 85;
    const costEfficiency = Math.round((avgProductivity * 0.6) + (avgAttendance * 0.4));
    
    return {
      department: d,
      attendanceRate: avgAttendance,
      payrollCost: deptCostsMap[d],
      productivityScore: avgProductivity,
      costEfficiency: Math.max(70, Math.min(98, costEfficiency))
    };
  });

  const avgAttendanceEfficiency = totalTrackedDays ? Math.round((totalPresentDays / totalTrackedDays) * 100) : 94;
  const avgProductivityIndex = productivityCount ? Math.round(totalProductivity / productivityCount) : 88;
  const payrollUtilizationScore = 91;

  const monthlyTrend = [
    { month: "Jul 25", cost: Math.round(totalPayrollCost * 0.88) },
    { month: "Aug 25", cost: Math.round(totalPayrollCost * 0.90) },
    { month: "Sep 25", cost: Math.round(totalPayrollCost * 0.92) },
    { month: "Oct 25", cost: Math.round(totalPayrollCost * 0.94) },
    { month: "Nov 25", cost: Math.round(totalPayrollCost * 0.95) },
    { month: "Dec 25", cost: Math.round(totalPayrollCost * 0.97) },
    { month: "Jan 26", cost: Math.round(totalPayrollCost * 0.96) },
    { month: "Feb 26", cost: Math.round(totalPayrollCost * 0.98) },
    { month: "Mar 26", cost: Math.round(totalPayrollCost * 0.99) },
    { month: "Apr 26", cost: Math.round(totalPayrollCost * 1.01) },
    { month: "May 26", cost: Math.round(totalPayrollCost * 1.02) },
    { month: "Jun 26", cost: totalPayrollCost }
  ];

  const costByDepartment = primaryDepts.map((d) => ({
    department: d,
    cost: deptCostsMap[d]
  })).sort((a, b) => b.cost - a.cost);

  const efficiencyTrend = [
    { label: "Jan", attendance: 92, payrollEfficiency: 86 },
    { label: "Feb", attendance: 93, payrollEfficiency: 88 },
    { label: "Mar", attendance: 94, payrollEfficiency: 89 },
    { label: "Apr", attendance: 92, payrollEfficiency: 90 },
    { label: "May", attendance: 95, payrollEfficiency: 92 },
    { label: "Jun", attendance: avgAttendanceEfficiency, payrollEfficiency: payrollUtilizationScore }
  ];

  const lowAttendanceCount = processed.filter(e => e.trackedDays > 0 && e.attendanceRate < 75).length;
  const missingConfigCount = processed.filter(e => e.trackedDays === 0).length;

  const recommendations = [];
  recommendations.push({
    id: "rec-payroll-risk",
    category: "Payroll Risk",
    title: "Projects department payroll increased 14% this month.",
    description: "Labor expenditure rose due to overtime hours at Skyline Enclave and additional site supervisor shifts.",
    priority: "Warning",
    status: "warning",
    action: "Review Cost"
  });

  if (lowAttendanceCount > 0) {
    recommendations.push({
      id: "rec-attendance-impact",
      category: "Attendance Impact",
      title: `${lowAttendanceCount} employees below 75% attendance.`,
      description: "Critical attendance deficit flags recorded on core sites, impacting project timelines and milestone delivery.",
      priority: "Critical",
      status: "critical",
      action: "View Attendance"
    });
  }

  recommendations.push({
    id: "rec-cost-opportunity",
    category: "Cost Opportunity",
    title: "Skyline Enclave workforce utilization below target.",
    description: "Current site utilization sits at 68% against an 80% target. Recommend reallocating 8 workers to Aurora Heights.",
    priority: "Information",
    status: "info",
    action: "Review Allocation"
  });

  recommendations.push({
    id: "rec-rate-gap",
    category: "Rate Gap",
    title: "Procurement department rates below contractor benchmark.",
    description: "Internal daily staff rates are 12% lower than external contractor equivalents, posing a potential talent retention risk.",
    priority: "Information",
    status: "info",
    action: "Review Rates"
  });

  if (missingConfigCount > 0) {
    recommendations.push({
      id: "rec-data-issue",
      category: "Data Issue",
      title: `${missingConfigCount} employees missing payroll configuration.`,
      description: "Mandatory bank account, PAN, or daily rate tier settings are missing for newly onboarded team members.",
      priority: "Critical",
      status: "critical",
      action: "View Employees"
    });
  }

  const totalCount = filtered.length;
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    employees: paginated,
    pagination: {
      totalCount,
      page,
      limit,
      pageCount: Math.ceil(totalCount / limit)
    },
    analytics: {
      monthlyTrend,
      costByDepartment,
      payrollDistribution,
      efficiencyTrend,
      topProjects: projectLaborCosts.slice(0, 5).map(p => ({ project: p.projectName, cost: p.laborCost }))
    },
    summaries: {
      monthlyPayrollCost: totalPayrollCost,
      monthlyPayrollCostTrend: "+6.2% vs last month",
      payrollLiability: totalLiability,
      payrollLiabilityStatus: "Pending processing",
      costPerProject: Math.round(totalPayrollCost / Math.max(1, projectLaborCosts.length)),
      costPerProjectTrend: "Across active projects",
      attendanceEfficiency: avgAttendanceEfficiency,
      attendanceEfficiencyStatus: "Healthy",
      payrollUtilization: payrollUtilizationScore,
      payrollUtilizationStatus: "Optimal budget alignment",
      productivityIndex: avgProductivityIndex,
      productivityIndexStatus: "Above benchmark",
      sparklines: {
        monthlyCost: [32, 33, 34, 34, 35, 36, 35, 36, 37, 37, 38, 38],
        liability: [5, 6, 7, 6, 8, 9, 8, 8, 7, 8, 9, 8],
        costPerProject: [4, 4, 5, 5, 5, 6, 5, 6, 6, 6, 6, 6],
        attendance: [91, 92, 92, 93, 94, 94, 93, 94, 94, 95, 94, avgAttendanceEfficiency],
        utilization: [88, 89, 90, 89, 91, 92, 90, 91, 91, 92, 91, payrollUtilizationScore],
        productivity: [84, 85, 86, 86, 88, 88, 87, 88, 88, 89, 88, avgProductivityIndex]
      }
    },
    recommendations,
    projectLaborCosts,
    productivityMatrix
  };
};

const listTeams = () => {
  const teams = (state.teams || []).map((team) => {
    const project = getProjectById(team.projectId) || { name: "Unknown Project" };
    const supervisor = state.employees.find((emp) => emp.id === team.supervisorId) || { name: "Operations Lead" };
    
    // Calculate headcount from employees
    const headcount = state.employees.filter(
      (emp) => emp.projectId === team.projectId && emp.teamName === team.name && emp.status === "Active"
    ).length;

    // Calculate present today
    const presentToday = state.employees.filter((emp) => {
      if (emp.projectId !== team.projectId || emp.teamName !== team.name || emp.status !== "Active") return false;
      return state.attendance.some(
        (att) => att.employeeId === emp.id && att.status === "Present"
      );
    }).length;

    const attendanceRate = headcount > 0 ? Math.round((presentToday / headcount) * 100) : team.attendanceRate || 0;
    const coverageRate = headcount > 0 ? Math.round((presentToday / headcount) * 100) : team.coverageRate || 0;

    let riskLevel = "Healthy";
    if (team.healthScore < 70 || attendanceRate < 75) {
      riskLevel = "Critical";
    } else if (team.healthScore < 85 || attendanceRate < 90) {
      riskLevel = "Watch";
    }

    let attendanceLabel = "Excellent";
    if (attendanceRate < 75) {
      attendanceLabel = "Poor";
    } else if (attendanceRate < 90) {
      attendanceLabel = "Good";
    }

    // Attendance Trend 30 days
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const dayVariation = (Math.sin(i + (team.name.length % 5)) * 10) + (team.name.charCodeAt(0) % 5);
      trend.push(Math.min(100, Math.max(50, Math.round(attendanceRate + dayVariation))));
    }

    return {
      ...team,
      projectName: project.name,
      supervisorName: supervisor.name,
      headcount,
      attendance: `${presentToday}/${headcount}`,
      attendanceRate,
      coverageRate,
      riskLevel,
      attendanceLabel,
      openPositions: team.openPositions || (team.name.length % 3),
      activeTasksCount: team.activeTasksCount || (team.name.length % 5 + 2),
      attendanceTrend30Days: trend,
    };
  });

  return {
    teams,
    meta: {
      total: teams.length,
      active: teams.filter((t) => t.status === "Active").length,
      atRisk: teams.filter((t) => t.riskLevel === "Critical" || t.riskLevel === "Watch").length,
      understaffed: teams.reduce((sum, t) => sum + (t.openPositions || 0), 0),
    }
  };
};

const getTeamDetail = (teamId) => {
  const team = (state.teams || []).find((t) => t.id === teamId);
  if (!team) {
    throw createHttpError(404, "Team not found");
  }

  const project = getProjectById(team.projectId) || { name: "Unknown Project" };
  const supervisor = state.employees.find((emp) => emp.id === team.supervisorId) || { name: "Operations Lead" };

  // Members in this team
  const members = state.employees
    .filter((emp) => emp.projectId === team.projectId && emp.teamName === team.name)
    .map((emp, index) => serializeEmployeeListItem(emp, index));

  const headcount = members.filter((m) => m.status === "Active").length;
  const presentToday = members.filter((m) => {
    if (m.status !== "Active") return false;
    return state.attendance.some(
      (att) => att.employeeId === m.id && att.status === "Present"
    );
  }).length;

  const attendanceRate = headcount > 0 ? Math.round((presentToday / headcount) * 100) : team.attendanceRate || 0;
  const coverageRate = headcount > 0 ? Math.round((presentToday / headcount) * 100) : team.coverageRate || 0;

  // Role coverage analysis
  const designations = Array.from(new Set(members.map((m) => m.designation)));
  const coverageAnalysis = designations.map((desig) => {
    const assigned = members.filter((m) => m.designation === desig && m.status === "Active").length;
    const required = assigned + (desig.length % 2);
    return {
      role: desig,
      required,
      assigned,
      shortfall: Math.max(0, required - assigned),
      status: assigned >= required ? "Fully Staffed" : "Understaffed",
    };
  });

  // Productivity metrics over last 6 months
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const productivityMetrics = months.map((month, idx) => {
    const val = team.productivityScore + (idx % 2 === 0 ? 3 : -2) - (idx === 4 ? 6 : 0);
    return {
      month,
      score: Math.min(100, Math.max(40, val)),
      attendance: attendanceRate + (idx % 2 === 0 ? 2 : -3),
    };
  });

  // 30 days attendance trends
  const attendanceTrend = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayVariation = (Math.sin(i + (team.name.length % 5)) * 10) + (team.name.charCodeAt(0) % 5);
    attendanceTrend.push({
      date: date.toISOString().slice(5, 10),
      rate: Math.min(100, Math.max(50, Math.round(attendanceRate + dayVariation))),
    });
  }

  // Timeline events
  const activityTimeline = [
    {
      id: "evt-1",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      type: "attendance",
      title: "Morning Roll Call Completed",
      description: `${presentToday} of ${headcount} members present for shift start.`,
      icon: "UserCheck",
    },
    {
      id: "evt-2",
      timestamp: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
      type: "productivity",
      title: "Daily Target Surpassed",
      description: "Concrete casting milestone completed 2 hours ahead of schedule.",
      icon: "TrendingUp",
    },
    {
      id: "evt-3",
      timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
      type: "roster",
      title: "Member Transferred In",
      description: "Aarav Sharma transferred from Foundation Team A to assist with reinforcement works.",
      icon: "Users",
    },
    {
      id: "evt-4",
      timestamp: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
      type: "compliance",
      title: "Safety Briefing Complete",
      description: "Weekly Tool Box Talk (TBT) conducted by supervisor. 100% compliance.",
      icon: "ShieldAlert",
    }
  ];

  return {
    team: {
      ...team,
      projectName: project.name,
      supervisorName: supervisor.name,
      headcount,
      attendanceRate,
      coverageRate,
      activeTasksCount: team.activeTasksCount || (team.name.length % 5 + 2),
      openPositions: team.openPositions || (team.name.length % 3),
    },
    members,
    attendanceTrend,
    coverageAnalysis,
    productivityMetrics,
    activityTimeline,
  };
};

const createTeam = async (payload, actorId) => {
  const name = (payload.name || "").trim();
  const projectId = (payload.projectId || "").trim();
  const supervisorId = (payload.supervisorId || "").trim();

  if (!name || !projectId || !supervisorId) {
    throw createHttpError(400, "Name, Project, and Supervisor are required");
  }

  const now = new Date().toISOString();
  const newTeam = {
    id: `team-${randomUUID()}`,
    name,
    projectId,
    supervisorId,
    productivityScore: Number(payload.productivityScore) || 85,
    healthScore: Number(payload.healthScore) || 90,
    attendanceRate: Number(payload.attendanceRate) || 92,
    coverageRate: Number(payload.coverageRate) || 88,
    status: payload.status || "Active",
    openPositions: Number(payload.openPositions) || 0,
    activeTasksCount: Number(payload.activeTasksCount) || 3,
    createdAt: now,
    updatedAt: now,
  };

  if (!state.teams) {
    state.teams = [];
  }
  state.teams.unshift(newTeam);

  logAudit({
    title: "Workforce team created",
    detail: `Team ${name} created for project ${getProjectById(projectId)?.name || "Unknown project"}.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return newTeam;
};

const updateTeam = async (teamId, payload, actorId) => {
  if (!state.teams) {
    state.teams = [];
  }
  const index = state.teams.findIndex((t) => t.id === teamId);
  if (index === -1) {
    throw createHttpError(404, "Team not found");
  }

  const team = state.teams[index];
  const updatedTeam = {
    ...team,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  if (payload.productivityScore !== undefined) updatedTeam.productivityScore = Number(payload.productivityScore);
  if (payload.healthScore !== undefined) updatedTeam.healthScore = Number(payload.healthScore);
  if (payload.attendanceRate !== undefined) updatedTeam.attendanceRate = Number(payload.attendanceRate);
  if (payload.coverageRate !== undefined) updatedTeam.coverageRate = Number(payload.coverageRate);
  if (payload.openPositions !== undefined) updatedTeam.openPositions = Number(payload.openPositions);
  if (payload.activeTasksCount !== undefined) updatedTeam.activeTasksCount = Number(payload.activeTasksCount);

  state.teams[index] = updatedTeam;

  logAudit({
    title: "Workforce team updated",
    detail: `Team ${team.name} updated: supervisor, status or metrics updated.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return updatedTeam;
};

const deleteTeam = async (teamId, actorId) => {
  if (!state.teams) {
    state.teams = [];
  }
  const index = state.teams.findIndex((t) => t.id === teamId);
  if (index === -1) {
    throw createHttpError(404, "Team not found");
  }

  const team = state.teams[index];
  state.teams.splice(index, 1);

  logAudit({
    title: "Workforce team deleted",
    detail: `Team ${team.name} removed from registry.`,
    actorId,
    category: "Workforce",
  });

  await persistState();
  return { success: true };
};

module.exports = {
  getPayrollData,
  listTeams,
  getTeamDetail,
  createTeam,
  updateTeam,
  deleteTeam,
  actOnApproval,
  advanceLeadStage,
  advanceProjectTask,
  cancelBooking,
  createBooking,
  createBroker,
  updateBroker,
  createCustomer,
  createReservation,
  listReservations,
  releaseReservation,
  releaseExpiredReservations,
  createDailyReport,
  getDailyReport,
  updateDailyReport,
  deleteDailyReport,
  deleteProjectTask,
  createProject,
  createProjectTask,
  getProjectTask,
  updateProjectTask,
  createResourceAllocation,
  getResourceAllocation,
  updateResourceAllocation,
  deleteResourceAllocation,
  createDocumentRecord,
  createLead,
  createMaterial,
  createPurchaseRequest,
  createSiteVisit,
  createTransfer,
  getSiteVisitDetail,
  createWarehouse,
  getAdminSettings,
  getApprovalAlerts,
  getApprovalById,
  getApprovalByIdDetail,
  getApprovalsSummary,
  getAuthSummary,
  getBookingById,
  getComplianceRegister,
  getCollectionsSummary,
  getCurrentUser: getAuthSummary,
  getDashboardReports,
  getDashboardSummary,
  getDocumentRegister,
  getEmployeeById,
  getExecutiveDashboard,
  getFinancialOverview,
  getProjectRiskInsights,
  getLeadById,
  getLeadPipeline,
  getLeadStats,
  getLeadProfileDetail,
  getMaterialAlerts,
  getPermissionsMatrix,
  getProjectById,
  getRolePermissions,
  getUserById,
  getUsersPayload,
  createContractor,
  getContractorDetail,
  createEmployee,
  createPurchaseOrder,
  createQuotation,
  updateQuotation,
  createVendor,
  archiveContractor,
  archiveMaterial,
  archiveVendor,
  archiveWarehouse,
  listAttendance,
  getAttendanceOverview,
  getAttendanceAnalytics,
  getAttendancePendingCheckins,
  initializeErpState,
  markAttendance,
  recordConsumption,
  listBookings,
  listCustomers,
  listConsumptions,
  listContractors,
  listDailyReports,
  listEmployees,
  listLeads,
  listMaterials,
  listProjectTasks,
  listProjects,
  listPurchaseOrders,
  listPurchaseRequests,
  listReceipts,
  listQuotations,
  listResourceAllocations,
  listSiteVisits,
  listTransfers,
  listUnits,
  listVendors,
  recordReceipt,
  sendWhatsAppDemoNotification,
  syncBiometricAttendance,
  testWhatsAppIntegration,
  updateContractor,
  updateMaterial,
  updateVendor,
  updateWarehouse,
  updateLead,
  updateEmployee,
  updateSiteVisit,
  updateNotificationSetting,
  updateWorkflowSetting,
  getBudgetOverview,
  getVendorPayments,
  recordVendorPayment,
  getPurchaseOrder,
  updatePurchaseOrder,
};
