const {
  createEntitySchema,
  defineModel,
} = require("./shared");

// Singleton document — one record per company
const companySettingsSchema = createEntitySchema({
  companyName: String,
  address: String,
  gstin: String, // validated in service layer: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  cin: String,
  fiscalYearStart: String, // e.g. "April"
  defaultCurrency: { type: String, default: "INR" },
  logoUrl: String,
});

// Singleton document — one record for system preferences
const systemPreferencesSchema = createEntitySchema({
  timezone: { type: String, default: "Asia/Kolkata" },
  dateFormat: { type: String, default: "DD/MM/YYYY" },
  currency: { type: String, default: "INR" },
  sessionTimeoutMinutes: {
    type: Number,
    default: 60,
    min: 15,
    max: 480,
  },
});

module.exports = {
  ErpCompanySettings: defineModel("ErpCompanySettings", "erp_company_settings", companySettingsSchema),
  ErpSystemPreferences: defineModel("ErpSystemPreferences", "erp_system_preferences", systemPreferencesSchema),
};
