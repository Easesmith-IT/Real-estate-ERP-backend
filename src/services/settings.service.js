"use strict";

const { ErpCompanySettings, ErpSystemPreferences } = require("../models/erp/settings.model");
const { createHttpError } = require("../utils/http");

// Fixed sentinel IDs for singleton documents
const COMPANY_SETTINGS_ID = "singleton-company-settings";
const SYSTEM_PREFERENCES_ID = "singleton-system-preferences";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Upsert-find the singleton company settings document.
 * @returns {Promise<Object>} The company settings document.
 */
async function getCompanySettings() {
  const settings = await ErpCompanySettings.findOneAndUpdate(
    { id: COMPANY_SETTINGS_ID },
    { $setOnInsert: { id: COMPANY_SETTINGS_ID } },
    { new: true, upsert: true }
  );
  return settings;
}

/**
 * Validate and persist company settings updates.
 * Validates GSTIN format if present.
 * @param {Object} updates - Fields to update.
 * @param {string} actorId - ID of the user making the update.
 * @returns {Promise<Object>} The updated company settings document.
 */
async function updateCompanySettings(updates, actorId) {
  if (updates.gstin !== undefined && updates.gstin !== null && updates.gstin !== "") {
    if (!GSTIN_REGEX.test(updates.gstin)) {
      throw createHttpError(400, "Invalid GSTIN format. Must match the standard 15-character GSTIN pattern.");
    }
  }

  const settings = await ErpCompanySettings.findOneAndUpdate(
    { id: COMPANY_SETTINGS_ID },
    { $set: { ...updates, id: COMPANY_SETTINGS_ID } },
    { new: true, upsert: true }
  );
  return settings;
}

/**
 * Upsert-find the singleton system preferences document.
 * @returns {Promise<Object>} The system preferences document.
 */
async function getSystemPreferences() {
  const preferences = await ErpSystemPreferences.findOneAndUpdate(
    { id: SYSTEM_PREFERENCES_ID },
    { $setOnInsert: { id: SYSTEM_PREFERENCES_ID } },
    { new: true, upsert: true }
  );
  return preferences;
}

/**
 * Validate and persist system preferences updates.
 * Validates sessionTimeoutMinutes is an integer in [15, 480] if present.
 * @param {Object} updates - Fields to update.
 * @param {string} actorId - ID of the user making the update.
 * @returns {Promise<Object>} The updated system preferences document.
 */
async function updateSystemPreferences(updates, actorId) {
  if (updates.sessionTimeoutMinutes !== undefined) {
    const timeout = updates.sessionTimeoutMinutes;
    if (!Number.isInteger(timeout) || timeout < 15 || timeout > 480) {
      throw createHttpError(400, "sessionTimeoutMinutes must be an integer between 15 and 480.");
    }
  }

  const preferences = await ErpSystemPreferences.findOneAndUpdate(
    { id: SYSTEM_PREFERENCES_ID },
    { $set: { ...updates, id: SYSTEM_PREFERENCES_ID } },
    { new: true, upsert: true }
  );
  return preferences;
}

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  getSystemPreferences,
  updateSystemPreferences,
};
