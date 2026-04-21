/**
 * CSV Export Utilities
 * Pure utility functions for exporting data to CSV format
 */

/**
 * Escape a value for CSV format
 * Handles commas, quotes, and newlines
 * @param {*} value - The value to escape
 * @returns {string} - Escaped CSV value
 */
export function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if escaping is needed
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    // Double quotes and wrap in quotes
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }

  return stringValue;
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot notation path (e.g., 'contact.name')
 * @returns {*} - Value at path or empty string if not found
 */
export function getNestedValue(obj, path) {
  if (!path || !obj) return "";

  const parts = path.split(".");
  let value = obj;

  for (const part of parts) {
    if (value === null || value === undefined) return "";
    value = value[part];
  }

  return value ?? "";
}

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{key, header}]
 * @returns {string} - CSV formatted string
 */
export function arrayToCSV(data, columns) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return "";
  }

  // Header row
  const headers = columns.map((col) => escapeCSVValue(col.header || col.key));
  const rows = [headers.join(",")];

  // Data rows
  for (const item of data) {
    const row = columns.map((col) => {
      const value = getNestedValue(item, col.key);

      // Handle arrays by joining with semicolon
      if (Array.isArray(value)) {
        return escapeCSVValue(value.join(";"));
      }

      return escapeCSVValue(value);
    });
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/**
 * Trigger browser download of CSV content
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Download filename (without .csv extension)
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Main export function - converts data array to CSV and triggers download
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions [{key, header}]
 * @param {string} filename - Download filename (without .csv extension)
 */
export function exportToCSV(data, columns, filename) {
  const csvContent = arrayToCSV(data, columns);
  if (csvContent) {
    downloadCSV(csvContent, filename);
  }
}

/**
 * Export contacts to CSV
 * @param {Array} contacts - Array of contact objects
 * @param {string} filename - Download filename
 */
export function exportContacts(contacts, filename = "contacts") {
  const columns = [
    { key: "id", header: "id" },
    { key: "name", header: "name" },
    { key: "email", header: "email" },
    { key: "phone", header: "phone" },
    { key: "company", header: "company" },
    { key: "position", header: "position" },
    { key: "tags", header: "tags" },
    { key: "created_at", header: "created_at" },
  ];

  exportToCSV(contacts, columns, filename);
}

/**
 * Export companies to CSV
 * @param {Array} companies - Array of company objects
 * @param {string} filename - Download filename
 */
export function exportCompanies(companies, filename = "companies") {
  const columns = [
    { key: "id", header: "id" },
    { key: "name", header: "name" },
    { key: "industry", header: "industry" },
    { key: "website", header: "website" },
    { key: "address", header: "address" },
    { key: "created_at", header: "created_at" },
  ];

  exportToCSV(companies, columns, filename);
}

/**
 * Export deals to CSV
 * @param {Array} deals - Array of deal objects
 * @param {string} filename - Download filename
 */
export function exportDeals(deals, filename = "deals") {
  const columns = [
    { key: "id", header: "id" },
    { key: "title", header: "title" },
    { key: "value", header: "value" },
    { key: "stage", header: "stage" },
    { key: "company", header: "company" },
    { key: "contact", header: "contact" },
    { key: "expected_close", header: "expected_close" },
    { key: "created_at", header: "created_at" },
  ];

  exportToCSV(deals, columns, filename);
}

/**
 * Export activities to CSV
 * @param {Array} activities - Array of activity objects
 * @param {string} filename - Download filename
 */
export function exportActivities(activities, filename = "activities") {
  const columns = [
    { key: "id", header: "id" },
    { key: "type", header: "type" },
    { key: "title", header: "title" },
    { key: "description", header: "description" },
    { key: "deal_id", header: "deal_id" },
    { key: "contact_id", header: "contact_id" },
    { key: "due_date", header: "due_date" },
    { key: "completed_at", header: "completed_at" },
    { key: "created_at", header: "created_at" },
  ];

  exportToCSV(activities, columns, filename);
}
