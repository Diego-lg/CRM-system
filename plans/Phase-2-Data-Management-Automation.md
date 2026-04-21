# Phase 2: Data Management & Automation

## Overview
This phase adds bulk import/export CSV functionality, workflow automation for task creation, advanced filtering with saved views, and task dependencies.

---

## 1. Bulk Import/Export CSV

### 1.1 CSV Export Utility

#### Create `frontend/src/lib/csvExport.js`
```javascript
/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions {key, label}
 * @param {string} filename - Output filename without extension
 */
export function exportToCSV(data, columns, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Build header row
  const headers = columns.map((col) => col.label).join(',');

  // Build data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let value = item[col.key];

        // Handle nested values (e.g., "company.name")
        if (col.key.includes('.')) {
          const parts = col.key.split('.');
          value = parts.reduce((obj, key) => obj?.[key], item);
        }

        // Handle arrays (tags)
        if (Array.isArray(value)) {
          value = value.join('; ');
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        }

        // Escape quotes and wrap in quotes if contains comma
        value = String(value);
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      })
      .join(',');
  });

  // Combine and create blob
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export helpers for each data type
 */
export const exportContacts = (contacts, companyMap) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'score', label: 'Score' },
    { key: 'company.name', label: 'Company' },
    { key: 'lastContact', label: 'Last Contact' },
    { key: 'tags', label: 'Tags' },
  ];

  // Map company IDs to names before export
  const dataWithCompanyNames = contacts.map((c) => ({
    ...c,
    company: { name: companyMap?.[c.company]?.name || c.company },
  }));

  exportToCSV(dataWithCompanyNames, columns, 'contacts');
};

export const exportDeals = (deals, companyMap, contactMap) => {
  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'value', label: 'Value' },
    { key: 'stage', label: 'Stage' },
    { key: 'probability', label: 'Probability' },
    { key: 'priority', label: 'Priority' },
    { key: 'closeDate', label: 'Close Date' },
    { key: 'owner', label: 'Owner' },
    { key: 'company.name', label: 'Company' },
    { key: 'contact.name', label: 'Contact' },
    { key: 'notes', label: 'Notes' },
  ];

  const dataWithRelations = deals.map((d) => ({
    ...d,
    company: { name: companyMap?.[d.company]?.name || d.company },
    contact: { name: contactMap?.[d.contact]?.name || d.contact },
  }));

  exportToCSV(dataWithRelations, columns, 'deals');
};

export const exportCompanies = (companies) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'industry', label: 'Industry' },
    { key: 'size', label: 'Size' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'status', label: 'Status' },
    { key: 'employees', label: 'Employees' },
    { key: 'country', label: 'Country' },
    { key: 'website', label: 'Website' },
    { key: 'phone', label: 'Phone' },
  ];

  exportToCSV(companies, columns, 'companies');
};

export const exportActivities = (activities, contactMap) => {
  const columns = [
    { key: 'type', label: 'Type' },
    { key: 'title', label: 'Title' },
    { key: 'contact.name', label: 'Contact' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'duration', label: 'Duration (min)' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'notes', label: 'Notes' },
  ];

  const dataWithContacts = activities.map((a) => ({
    ...a,
    contact: { name: contactMap?.[a.contact]?.name || a.contact },
  }));

  exportToCSV(dataWithContacts, columns, 'activities');
};
```

### 1.2 CSV Import Utility

#### Create `frontend/src/lib/csvImport.js`
```javascript
/**
 * Parse CSV file to array of objects
 * @param {File} file - CSV file to parse
 * @returns {Promise<Array>} Parsed data
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          reject(new Error('CSV must have header and at least one data row'));
          return;
        }

        // Parse header
        const headers = parseCSVLine(lines[0]);

        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((header, index) => {
            let value = values[index] || '';
            // Try to parse as number
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && value.trim() !== '') {
              row[header.toLowerCase().replace(/\s+/g, '_')] = numValue;
            } else {
              row[header.toLowerCase().replace(/\s+/g, '_')] = value.trim();
            }
          });
          data.push(row);
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Import validation schema
 */
export const IMPORT_SCHEMAS = {
  contacts: {
    required: ['name', 'email'],
    optional: ['phone', 'role', 'status', 'score', 'company', 'tags'],
    defaults: {
      status: 'lead',
      score: 50,
    },
  },
  companies: {
    required: ['name'],
    optional: ['industry', 'size', 'revenue', 'status', 'employees', 'country', 'website', 'phone'],
    defaults: {
      status: 'lead',
    },
  },
  deals: {
    required: ['title'],
    optional: ['value', 'stage', 'probability', 'priority', 'close_date', 'owner', 'company', 'contact', 'notes'],
    defaults: {
      stage: 'new',
      probability: 20,
      priority: 'medium',
      value: 0,
    },
  },
};

/**
 * Validate imported data
 */
export function validateImport(data, schema) {
  const errors = [];
  const validRecords = [];

  data.forEach((record, index) => {
    const recordErrors = [];

    // Check required fields
    schema.required.forEach((field) => {
      if (!record[field] || record[field].toString().trim() === '') {
        recordErrors.push(`Row ${index + 2}: Missing required field "${field}"`);
      }
    });

    // Apply defaults
    Object.keys(schema.defaults).forEach((field) => {
      if (!record[field] || record[field].toString().trim() === '') {
        record[field] = schema.defaults[field];
      }
    });

    if (recordErrors.length > 0) {
      errors.push(...recordErrors);
    } else {
      validRecords.push(record);
    }
  });

  return { errors, validRecords };
}
```

### 1.3 Import Modal Component

#### Create `frontend/src/components/ImportModal.jsx`
```jsx
import React, { useState, useRef } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV, validateImport, IMPORT_SCHEMAS } from '../lib/csvImport';
import { exportContacts, exportCompanies, exportDeals, exportActivities } from '../lib/csvExport';

export default function ImportModal({ open, onClose, type, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const schema = IMPORT_SCHEMAS[type];

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrors(['Please select a CSV file']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    try {
      const data = await parseCSV(selectedFile);
      const { errors: validationErrors, validRecords } = validateImport(data, schema);

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setPreview(null);
      } else {
        setPreview(validRecords.slice(0, 5)); // Preview first 5
      }
    } catch (error) {
      setErrors([error.message]);
    }
  };

  const handleImport = async () => {
    if (!preview && !file) return;

    setImporting(true);
    try {
      const data = await parseCSV(file);
      const { validRecords } = validateImport(data, schema);
      await onImport(validRecords);
      onClose();
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setImporting(false);
    }
  };

  const handleExportTemplate = () => {
    const templateData = [schema.required.concat(schema.optional).reduce((acc, field) => {
      acc[field] = field === 'name' ? 'Example Name' : '';
      return acc;
    }, {})];

    const columns = schema.required.concat(schema.optional).map((field) => ({
      key: field,
      label: field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    }));

    // Simple template export
    const headers = columns.map((c) => c.label).join(',');
    const templateCSV = headers + '\n' + templateData.map((r) => columns.map((c) => r[c.key] || '').join(',')).join('\n');

    const blob = new Blob([templateCSV], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${type}_import_template.csv`;
    link.click();
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg card max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Import {type}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* File Upload */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Click to upload or drag and drop CSV file
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <FileText size={16} className="text-gray-500" />
              <span className="text-sm flex-1">{file.name}</span>
              <button onClick={() => { setFile(null); setPreview(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-2">
                <AlertCircle size={16} />
                {errors.length} error(s) found
              </div>
              <ul className="text-xs text-red-600 space-y-1">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
              </ul>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Preview (first 5 of {preview.length} records)
              </p>
              <div className="overflow-x-auto border rounded">
                <table className="text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="px-2 py-1 text-left capitalize">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-2 py-1 truncate max-w-[100px]">
                            {val?.toString() || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between p-4 border-t">
          <button onClick={handleExportTemplate} className="btn-secondary text-sm">
            Download Template
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={handleImport}
              disabled={!file || errors.length > 0 || importing}
              className="btn-primary disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 2. Workflow Automation

### 2.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- WORKFLOW AUTOMATION
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL, -- 'deal_created', 'deal_stage_changed', 'contact_created', 'activity_completed'
    trigger_config JSONB, -- {stage_from: 'new', stage_to: 'qualified'}
    actions JSONB NOT NULL, -- [{type: 'create_activity', config: {...}}, {type: 'send_email', config: {...}}]
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_type TEXT,
    triggered_by TEXT, -- record ID that triggered
    actions_run JSONB,
    status TEXT DEFAULT 'success', -- 'success', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workflows" ON workflows FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can view workflow logs" ON workflow_logs FOR SELECT USING (true);

-- Insert sample workflow
INSERT INTO workflows (name, trigger_type, actions, is_active) VALUES
    ('Follow up qualified deals', 'deal_stage_changed', 
     '{"stage_to": "qualified"}',
     '[{"type": "create_activity", "config": {"title": "Follow up with contact", "type": "task", "days_after": 1, "priority": "medium"}}]',
     TRUE);
```

### 2.2 Workflow Engine

#### Create `frontend/src/lib/workflowEngine.js`
```javascript
import { supabase } from './supabase';

/**
 * Workflow Engine - evaluates and executes workflows
 */
class WorkflowEngine {
  constructor() {
    this.cache = null;
  }

  /**
   * Load active workflows from database
   */
  async loadWorkflows() {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load workflows:', error);
      return [];
    }

    this.cache = data;
    return data;
  }

  /**
   * Evaluate and execute workflows for a trigger
   * @param {string} triggerType - Event type (deal_created, deal_stage_changed, etc.)
   * @param {Object} record - The record that triggered the event
   */
  async evaluate(triggerType, record) {
    if (!this.cache) {
      await this.loadWorkflows();
    }

    const matchingWorkflows = this.cache.filter((w) => w.trigger_type === triggerType);

    for (const workflow of matchingWorkflows) {
      await this.execute(workflow, record);
    }
  }

  /**
   * Execute a single workflow
   */
  async execute(workflow, record) {
    try {
      // Check trigger conditions
      if (!this.matchesTriggerConfig(workflow.trigger_config, record)) {
        return { skipped: true, reason: 'trigger_config_mismatch' };
      }

      // Execute actions
      const results = [];
      for (const action of workflow.actions) {
        const result = await this.executeAction(action, record);
        results.push(result);
      }

      // Log execution
      await this.logExecution(workflow.id, triggerType, record.id, results, 'success');

      return { success: true, results };
    } catch (error) {
      await this.logExecution(workflow.id, triggerType, record.id, [], 'failed', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if record matches trigger config
   */
  matchesTriggerConfig(config, record) {
    if (!config) return true;

    for (const [key, value] of Object.entries(config)) {
      if (record[key] !== value) return false;
    }

    return true;
  }

  /**
   * Execute a single action
   */
  async executeAction(action, record) {
    switch (action.type) {
      case 'create_activity':
        return this.createActivity(action.config, record);
      case 'send_email':
        return this.sendEmail(action.config, record);
      case 'update_field':
        return this.updateField(action.config, record);
      default:
        console.warn(`Unknown action type: ${action.type}`);
        return { skipped: true, reason: 'unknown_action_type' };
    }
  }

  /**
   * Create activity action
   */
  async createActivity(config, record) {
    const daysAfter = config.days_after || 0;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAfter);

    const activity = {
      type: config.type || 'task',
      title: this.interpolateTemplate(config.title || 'Follow up', record),
      contact: record.contact || record.id,
      date: targetDate.toISOString().split('T')[0],
      status: 'scheduled',
      priority: config.priority || 'medium',
      notes: `Auto-created from workflow: ${record.id}`,
      storeId: record.storeId,
    };

    const { data, error } = await supabase.from('activities').insert(activity);
    return { action: 'create_activity', data, error };
  }

  /**
   * Send email action
   */
  async sendEmail(config, record) {
    // Implementation would integrate with email service
    console.log('Email action:', config, record);
    return { action: 'send_email', sent: true };
  }

  /**
   * Update field action
   */
  async updateField(config, record) {
    const { table, record_id, field, value } = config;

    const { data, error } = await supabase
      .from(table)
      .update({ [field]: value })
      .eq('id', record_id);

    return { action: 'update_field', data, error };
  }

  /**
   * Interpolate template variables
   */
  interpolateTemplate(template, record) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => record[key] || match);
  }

  /**
   * Log workflow execution
   */
  async logExecution(workflowId, triggerType, triggeredBy, actionsRun, status, errorMessage = null) {
    await supabase.from('workflow_logs').insert({
      workflow_id: workflowId,
      trigger_type: triggerType,
      triggered_by: triggeredBy,
      actions_run: actionsRun,
      status,
      error_message: errorMessage,
    });
  }
}

export const workflowEngine = new WorkflowEngine();
```

---

## 3. Saved Views & Advanced Filtering

### 3.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- SAVED VIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS saved_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'contacts', 'companies', 'deals', 'activities'
    filters JSONB NOT NULL, -- {status: 'customer', score: {min: 80}}
    columns JSONB, -- ['name', 'email', 'status', 'score']
    sort_by TEXT,
    sort_dir TEXT DEFAULT 'asc',
    is_default BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own views" ON saved_views FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view shared views" ON saved_views FOR SELECT USING (is_default = true OR auth.uid() = user_id);
```

### 3.2 Saved Views Component

#### Create `frontend/src/components/SavedViews.jsx`
```jsx
import React, { useState, useMemo } from 'react';
import { ChevronDown, Star, Save, X, Plus } from 'lucide-react';
import useCRM from '../store/useCRM';

export default function SavedViews({ entityType, filters, onApply }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);

  const savedViews = useCRM((s) => s.savedViews?.[entityType] || []);
  const addSavedView = useCRM((s) => s.addSavedView);
  const deleteSavedView = useCRM((s) => s.deleteSavedView);

  const handleSave = async () => {
    if (!viewName.trim()) return;

    const newView = {
      name: viewName,
      entityType,
      filters,
      isDefault: makeDefault,
    };

    await addSavedView(newView);
    setShowSaveDialog(false);
    setViewName('');
  };

  const handleApply = (view) => {
    onApply(view.filters);
    setShowDropdown(false);
  };

  const handleDelete = async (viewId) => {
    if (confirm('Delete this saved view?')) {
      await deleteSavedView(viewId);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-50"
      >
        <Star size={14} />
        Saved Views
        <ChevronDown size={14} />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-2 border-b">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100"
            >
              <Plus size={14} />
              Save current filters
            </button>
          </div>

          {savedViews.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No saved views yet
            </div>
          ) : (
            <div className="max-h-64 overflow-auto">
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 group"
                >
                  <button
                    onClick={() => handleApply(view)}
                    className="flex items-center gap-2 text-sm flex-1"
                  >
                    {view.isDefault && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                    {view.name}
                  </button>
                  <button
                    onClick={() => handleDelete(view.id)}
                    className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80">
            <h3 className="font-semibold mb-4">Save View</h3>
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="View name"
              className="input w-full mb-4"
              autoFocus
            />
            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
              />
              Set as default view
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSaveDialog(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Task Dependencies

### 4.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- TASK DEPENDENCIES
-- ============================================

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    depends_on_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, depends_on_id)
);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage task dependencies" ON task_dependencies FOR ALL USING (true);

-- Get tasks that a task depends on
CREATE OR REPLACE FUNCTION get_task_dependencies(task_uuid UUID)
RETURNS TABLE(dependent_id UUID, title TEXT, status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.status
  FROM activities a
  JOIN task_dependencies td ON a.id = td.task_id
  JOIN activities t ON td.depends_on_id = t.id
  WHERE a.id = task_uuid;
END;
$$ LANGUAGE plpgsql;

-- Check if all dependencies are complete
CREATE OR REPLACE FUNCTION check_dependencies_complete(task_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  incomplete_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO incomplete_count
  FROM task_dependencies td
  JOIN activities a ON td.depends_on_id = a.id
  WHERE td.task_id = task_uuid AND a.status != 'completed';

  RETURN incomplete_count = 0;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Implementation Checklist

- [ ] Create `frontend/src/lib/csvExport.js` with export helpers
- [ ] Create `frontend/src/lib/csvImport.js` with CSV parsing and validation
- [ ] Create `frontend/src/components/ImportModal.jsx` for bulk import UI
- [ ] Create `frontend/src/components/SavedViews.jsx` for saved views UI
- [ ] Create `frontend/src/lib/workflowEngine.js` for automation
- [ ] Update `supabase/schema.sql` with workflow tables
- [ ] Update `supabase/schema.sql` with saved_views tables
- [ ] Update `supabase/schema.sql` with task_dependencies tables
- [ ] Add import/export buttons to Contacts, Companies, Deals, Activities pages
- [ ] Add saved views selector to filter sections
- [ ] Integrate workflow engine with deal/contact creation

---

## Next Phase
See [Phase 3: Communication & Collaboration](./Phase-3-Communication-Collaboration.md)