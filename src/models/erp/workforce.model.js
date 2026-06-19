const {
  createEntitySchema,
  defineModel,
} = require("./shared");

const employeeSchema = createEntitySchema({
  name: String,
  email: String,
  department: String,
  designation: String,
  position: String,
  projectId: String,
  teamName: String,
  phone: String,
  dateJoined: String,
  emergencyContact: String,
  address: String,
  status: String,
  createdAt: String,
  updatedAt: String,
});

const contractorSchema = createEntitySchema({
  name: String,
  trade: String,
  projectId: String,
  workforce: Number,
  status: String,
  contactPerson: String,
  phone: String,
  email: String,
  gstin: String,
  pan: String,
  address: String,
  contractStart: String,
  contractEnd: String,
  rateType: String,
  rateValue: Number,
  rating: Number,
  complianceStatus: String,
  createdAt: String,
  updatedAt: String,
});

const attendanceSchema = createEntitySchema({
  employeeId: String,
  projectId: String,
  shift: String,
  checkIn: String,
  status: String,
});

const teamSchema = createEntitySchema({
  name: String,
  projectId: String,
  supervisorId: String,
  productivityScore: Number,
  healthScore: Number,
  attendanceRate: Number,
  coverageRate: Number,
  status: String,
  openPositions: Number,
  activeTasksCount: Number,
  createdAt: String,
  updatedAt: String,
});

module.exports = {
  ErpAttendance: defineModel("ErpAttendance", "erp_attendance", attendanceSchema),
  ErpContractor: defineModel("ErpContractor", "erp_contractors", contractorSchema),
  ErpEmployee: defineModel("ErpEmployee", "erp_employees", employeeSchema),
  ErpTeam: defineModel("ErpTeam", "erp_teams", teamSchema),
};

