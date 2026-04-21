/**
 * CSV Import Utilities
 * Pure utility functions for parsing, validating, and processing CSV imports
 */

/**
 * Import schemas for different entity types
 */
export const importSchemas = {
  contacts: {
    required: ["name", "email"],
    optional: ["phone", "company", "position", "tags"],
    defaults: { store_id: "current_user_store" },
  },
  companies: {
    required: ["name"],
    optional: ["industry", "website", "address"],
    defaults: {},
  },
  deals: {
    required: ["title", "value"],
    optional: ["stage", "company", "contact", "expected_close"],
    defaults: { stage: "lead", store_id: "current_user_store" },
  },
};

/**
 * Parse CSV text into array of objects
 * Handles quoted fields, trimming whitespace, and empty cells
 * @param {string} fileContent - Raw CSV text content
 * @returns {Array} - Array of objects with header keys and row values
 */
export function parseCSV(fileContent) {
  if (!fileContent || typeof fileContent !== "string") {
    return [];
  }

  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return [];
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  // Parse data rows
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      if (header) {
        let value = values[index] || "";
        // Trim whitespace from value
        value = value.trim();
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
          // Unescape doubled quotes
          value = value.replace(/""/g, '"');
        }
        row[header] = value;
      }
    });

    // Only add row if it has at least some content
    if (Object.values(row).some((v) => v !== "")) {
      result.push(row);
    }
  }

  return result;
}

/**
 * Parse a single CSV line handling quoted fields
 * @param {string} line - CSV line to parse
 * @returns {Array} - Array of field values
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Validate parsed data against a schema
 * @param {Array} data - Parsed CSV data array
 * @param {Object} schema - Schema object with required, optional arrays
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export function validateImportData(data, schema) {
  const errors = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ["Invalid data format: expected array"] };
  }

  if (data.length === 0) {
    errors.push("No data rows found in file");
    return { valid: false, errors };
  }

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row and 1-based indexing

    // Check required fields
    for (const field of schema.required) {
      if (!row[field] || row[field].trim() === "") {
        errors.push(`Row ${rowNum}: Missing required field "${field}"`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Apply default values from schema to missing fields
 * @param {Array} data - Parsed CSV data array
 * @param {Object} schema - Schema object with defaults
 * @returns {Array} - Data with defaults applied
 */
export function applyDefaults(data, schema) {
  if (!schema.defaults || Object.keys(schema.defaults).length === 0) {
    return data;
  }

  return data.map((row) => {
    const newRow = { ...row };

    for (const [key, value] of Object.entries(schema.defaults)) {
      // Only apply default if field is missing or empty
      if (!newRow[key] || newRow[key].trim() === "") {
        // Handle special placeholder for current user store
        if (value === "current_user_store") {
          // This will be replaced with actual store_id at runtime
          newRow[key] = null; // Will be filled by the caller
        } else {
          newRow[key] = value;
        }
      }
    }

    return newRow;
  });
}

/**
 * Generate a CSV template file for download
 * @param {string} entityType - Entity type ('contacts', 'companies', 'deals')
 */
export function downloadTemplate(entityType) {
  const schema = importSchemas[entityType];

  if (!schema) {
    console.error(`Unknown entity type: ${entityType}`);
    return;
  }

  // Combine required and optional fields for template
  const allFields = [...schema.required, ...schema.optional];

  // Create header row
  const headers = allFields.join(",");

  // Create example rows for each entity type
  let exampleRows = "";

  switch (entityType) {
    case "contacts":
      exampleRows =
        "\nJohn Doe,john@example.com,+1234567890,Acme Corp,Sales Manager,sales;lead";
      break;
    case "companies":
      exampleRows =
        "\nAcme Corporation,Technology,https://acme.com,123 Business St";
      break;
    case "deals":
      exampleRows =
        "\nBig Deal,50000,negotiation,Acme Corp,John Doe,2024-12-31";
      break;
    default:
      exampleRows = "";
  }

  const csvContent = headers + exampleRows;

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${entityType}_template.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
