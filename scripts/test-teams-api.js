const assert = require("assert");
const { 
  listTeams, 
  getTeamDetail, 
  createTeam, 
  updateTeam, 
  deleteTeam, 
  initializeErpState 
} = require("../src/services/erp.service");

async function runTests() {
  console.log("Initializing in-memory database state...");
  await initializeErpState();

  console.log("Testing listTeams...");
  const listResult = listTeams();
  assert(listResult && Array.isArray(listResult.teams), "listTeams should return a list of teams");
  assert(listResult.teams.length > 0, "Seeded teams should be populated");
  console.log(`Successfully retrieved ${listResult.teams.length} teams.`);
  console.log(`Active: ${listResult.meta.active}, At Risk: ${listResult.meta.atRisk}, Understaffed: ${listResult.meta.understaffed}`);

  const testTeam = listResult.teams[0];
  console.log(`Testing getTeamDetail for team: ${testTeam.name} (${testTeam.id})...`);
  const detailResult = getTeamDetail(testTeam.id);
  assert(detailResult && detailResult.team, "getTeamDetail should return team details");
  assert(detailResult.team.name === testTeam.name, "Detail team name should match listed team name");
  assert(Array.isArray(detailResult.members), "Detail should include members list");
  assert(Array.isArray(detailResult.attendanceTrend), "Detail should include attendanceTrend");
  assert(Array.isArray(detailResult.coverageAnalysis), "Detail should include coverageAnalysis");
  assert(Array.isArray(detailResult.productivityMetrics), "Detail should include productivityMetrics");
  console.log("Successfully verified team details structure.");

  console.log("Testing createTeam...");
  const newTeam = await createTeam({
    name: "QA Structural Execution Pod Z",
    projectId: testTeam.projectId,
    supervisorId: testTeam.supervisorId,
    productivityScore: 88,
    healthScore: 92,
  }, "user-admin");
  assert(newTeam && newTeam.id, "createTeam should return created team with an ID");
  assert(newTeam.name === "QA Structural Execution Pod Z", "Created team name should match");
  console.log("Successfully created team: ", newTeam.id);

  console.log("Testing updateTeam...");
  const updatedTeam = await updateTeam(newTeam.id, {
    productivityScore: 94,
    status: "Inactive"
  }, "user-admin");
  assert(updatedTeam.productivityScore === 94, "Productivity score should update");
  assert(updatedTeam.status === "Inactive", "Status should update");
  console.log("Successfully updated team.");

  console.log("Testing deleteTeam...");
  const deleteResult = await deleteTeam(newTeam.id, "user-admin");
  assert(deleteResult && deleteResult.success, "deleteTeam should return success");
  
  try {
    getTeamDetail(newTeam.id);
    assert.fail("Should throw 404 error after delete");
  } catch (err) {
    assert(err.statusCode === 404, "Should throw 404 for deleted team");
    console.log("Successfully deleted team and verified 404 on retrieve.");
  }

  console.log("\nALL BACKEND TEAMS API TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
