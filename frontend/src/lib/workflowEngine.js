import { supabase, isSupabaseConfigured } from "./supabase.js";

/**
 * Workflow Engine - Client-side workflow automation
 * Loads workflow definitions from Supabase and executes actions when triggers fire
 */

// Table names for workflow-related tables
const TABLES = {
  workflows: "workflows",
  workflow_logs: "workflow_logs",
  activities: "activities",
};

/**
 * Load all active workflows for a store from Supabase
 * @param {string} storeId - The store ID to load workflows for
 * @returns {Promise<Array>} Array of workflow objects
 */
export async function loadWorkflows(storeId) {
  try {
    if (!isSupabaseConfigured()) {
      console.warn(
        "[WorkflowEngine] Supabase not configured, returning empty workflows",
      );
      return [];
    }

    const { data, error } = await supabase
      .from(TABLES.workflows)
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true);

    if (error) {
      console.error("[WorkflowEngine] Error loading workflows:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[WorkflowEngine] Exception loading workflows:", err);
    return [];
  }
}

/**
 * Evaluate if a workflow's trigger matches the given trigger type and conditions
 * @param {object} workflow - The workflow object
 * @param {string} triggerType - The trigger type (e.g., 'deal_created')
 * @param {object} triggerData - Data from the trigger event
 * @returns {boolean} True if workflow should be triggered
 */
export function evaluateTrigger(workflow, triggerType, triggerData) {
  // Check if workflow trigger type matches
  if (workflow.trigger_type !== triggerType) {
    return false;
  }

  // If no trigger config, just match by type
  if (!workflow.trigger_config) {
    return true;
  }

  const config = workflow.trigger_config;

  // Evaluate conditions based on trigger type
  try {
    switch (triggerType) {
      case "deal_created":
      case "deal_stage_changed":
        return evaluateDealConditions(config, triggerData);

      case "contact_created":
        return evaluateContactConditions(config, triggerData);

      case "activity_completed":
        return evaluateActivityConditions(config, triggerData);

      default:
        return true;
    }
  } catch (err) {
    console.error("[WorkflowEngine] Error evaluating trigger conditions:", err);
    return false;
  }
}

/**
 * Evaluate deal-related conditions
 * @param {object} config - Trigger configuration
 * @param {object} data - Trigger data containing deal info
 * @returns {boolean}
 */
function evaluateDealConditions(config, data) {
  const deal = data.deal;

  if (!deal) {
    return false;
  }

  // Check deal value threshold
  if (config.min_value !== undefined && deal.value < config.min_value) {
    return false;
  }

  if (config.max_value !== undefined && deal.value > config.max_value) {
    return false;
  }

  // Check specific stage
  if (config.stage && deal.stage !== config.stage) {
    return false;
  }

  // Check deal source
  if (config.source && deal.source !== config.source) {
    return false;
  }

  // Check company or contact conditions
  if (config.company_id && deal.company_id !== config.company_id) {
    return false;
  }

  if (config.contact_id && deal.contact_id !== config.contact_id) {
    return false;
  }

  return true;
}

/**
 * Evaluate contact-related conditions
 * @param {object} config - Trigger configuration
 * @param {object} data - Trigger data containing contact info
 * @returns {boolean}
 */
function evaluateContactConditions(config, data) {
  const contact = data.contact;

  if (!contact) {
    return false;
  }

  // Check contact type
  if (config.type && contact.type !== config.type) {
    return false;
  }

  // Check company association
  if (config.company_id && contact.company_id !== config.company_id) {
    return false;
  }

  // Check tags
  if (config.tags && config.tags.length > 0) {
    const contactTags = contact.tags || [];
    const hasMatchingTag = config.tags.some((tag) => contactTags.includes(tag));
    if (!hasMatchingTag) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluate activity-related conditions
 * @param {object} config - Trigger configuration
 * @param {object} data - Trigger data containing activity info
 * @returns {boolean}
 */
function evaluateActivityConditions(config, data) {
  const activity = data.activity;

  if (!activity) {
    return false;
  }

  // Check activity type
  if (config.activity_type && activity.type !== config.activity_type) {
    return false;
  }

  // Check deal association
  if (config.deal_id && activity.deal_id !== config.deal_id) {
    return false;
  }

  return true;
}

/**
 * Execute all actions defined in a workflow
 * @param {object} workflow - The workflow object
 * @param {object} triggerData - Data from the trigger event
 * @returns {Promise<{success: boolean, actionsRun: Array, error: string|null}>}
 */
export async function executeWorkflow(workflow, triggerData) {
  const actionsRun = [];
  let overallSuccess = true;

  if (!workflow.actions || !Array.isArray(workflow.actions)) {
    return {
      success: false,
      actionsRun: [],
      error: "No actions defined in workflow",
    };
  }

  for (const action of workflow.actions) {
    try {
      const result = await executeAction(action, triggerData, workflow);
      actionsRun.push({
        action_type: action.action_type,
        success: result.success,
        details: result.details,
      });

      if (!result.success) {
        overallSuccess = false;
      }
    } catch (err) {
      console.error(
        `[WorkflowEngine] Error executing action ${action.action_type}:`,
        err,
      );
      actionsRun.push({
        action_type: action.action_type,
        success: false,
        error: err.message,
      });
      overallSuccess = false;
    }
  }

  return {
    success: overallSuccess,
    actionsRun,
    error: overallSuccess ? null : "One or more actions failed",
  };
}

/**
 * Execute a single action
 * @param {object} action - The action configuration
 * @param {object} triggerData - Data from the trigger event
 * @param {object} workflow - The parent workflow object
 * @returns {Promise<{success: boolean, details: object}>}
 */
async function executeAction(action, triggerData, workflow) {
  const actionType = action.action_type;

  switch (actionType) {
    case "create_activity":
      return await executeCreateActivity(action, triggerData);

    case "send_email":
      return await executeSendEmail(action, triggerData, workflow);

    case "update_field":
      return await executeUpdateField(action, triggerData);

    default:
      console.warn(`[WorkflowEngine] Unknown action type: ${actionType}`);
      return {
        success: false,
        details: { error: `Unknown action type: ${actionType}` },
      };
  }
}

/**
 * Execute create_activity action
 * @param {object} action - Action configuration with title, type, description, due_days
 * @param {object} triggerData - Trigger event data
 * @returns {Promise<{success: boolean, details: object}>}
 */
async function executeCreateActivity(action, triggerData) {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[WorkflowEngine] Supabase not configured, skipping activity creation",
    );
    return {
      success: true,
      details: { message: "Demo mode - activity creation skipped" },
    };
  }

  // Build activity data from action config and trigger data
  const activityTitle = interpolateString(
    action.title || "Workflow Activity",
    triggerData,
  );
  const activityDescription = interpolateString(
    action.description || "",
    triggerData,
  );

  // Calculate due date if due_days is specified
  let dueDate = null;
  if (action.due_days !== undefined && action.due_days !== null) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + action.due_days);
    dueDate = dueDate.toISOString();
  }

  // Determine entity associations
  const activity = {
    title: activityTitle,
    type: action.type || "note",
    description: activityDescription,
    due_date: dueDate,
    // Associate with deal or contact if available
    ...(triggerData.deal && { deal_id: triggerData.deal.id }),
    ...(triggerData.contact && { contact_id: triggerData.contact.id }),
    ...(triggerData.activity && {
      related_activity_id: triggerData.activity.id,
    }),
  };

  const { data, error } = await supabase
    .from(TABLES.activities)
    .insert(activity)
    .select()
    .single();

  if (error) {
    console.error("[WorkflowEngine] Error creating activity:", error);
    return {
      success: false,
      details: { error: error.message },
    };
  }

  return {
    success: true,
    details: { activity_id: data.id, title: data.title },
  };
}

/**
 * Execute send_email action (placeholder for future email integration)
 * @param {object} action - Action configuration with to, subject, body
 * @param {object} triggerData - Trigger event data
 * @param {object} workflow - The parent workflow object
 * @returns {Promise<{success: boolean, details: object}>}
 */
async function executeSendEmail(action, triggerData, workflow) {
  // Interpolate email fields with trigger data
  const emailTo = interpolateString(action.to || "", triggerData);
  const emailSubject = interpolateString(
    action.subject || "Workflow Notification",
    triggerData,
  );
  const emailBody = interpolateString(action.body || "", triggerData);

  // Log the email for future processing
  console.log("[WorkflowEngine] Email queued for sending:", {
    to: emailTo,
    subject: emailSubject,
    workflow_id: workflow.id,
    trigger_type: workflow.trigger_type,
  });

  // In a real implementation, this would queue the email for sending
  // via a backend service or email provider integration
  return {
    success: true,
    details: {
      message: "Email logged for future sending",
      to: emailTo,
      subject: emailSubject,
      queued: true,
    },
  };
}

/**
 * Execute update_field action (placeholder for future field updates)
 * @param {object} action - Action configuration with entity_type, field, value
 * @param {object} triggerData - Trigger event data
 * @returns {Promise<{success: boolean, details: object}>}
 */
async function executeUpdateField(action, triggerData) {
  const entityType = action.entity_type;
  const field = action.field;
  const value = interpolateString(action.value || "", triggerData);

  if (!entityType || !field) {
    return {
      success: false,
      details: {
        error: "entity_type and field are required for update_field action",
      },
    };
  }

  console.log("[WorkflowEngine] Field update requested:", {
    entityType,
    field,
    value,
    triggerData,
  });

  // Determine the entity ID from trigger data
  let entityId = null;
  switch (entityType) {
    case "deal":
      entityId = triggerData.deal?.id;
      break;
    case "contact":
      entityId = triggerData.contact?.id;
      break;
    case "company":
      entityId = triggerData.company?.id;
      break;
    default:
      return {
        success: false,
        details: { error: `Unknown entity type: ${entityType}` },
      };
  }

  if (!entityId) {
    return {
      success: false,
      details: { error: `No ${entityType} ID found in trigger data` },
    };
  }

  // Placeholder for actual field update
  // In a real implementation, this would update the Supabase record
  return {
    success: true,
    details: {
      message: "Field update logged for future processing",
      entityType,
      entityId,
      field,
      value,
    },
  };
}

/**
 * Interpolate template strings with trigger data
 * Supports {{deal.fieldName}}, {{contact.fieldName}}, etc.
 * @param {string} template - Template string with placeholders
 * @param {object} data - Data object to interpolate
 * @returns {string} Interpolated string
 */
function interpolateString(template, data) {
  if (!template || typeof template !== "string") {
    return template;
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split(".");
    let value = data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return match; // Keep original placeholder if not found
      }
    }

    return value !== undefined ? String(value) : match;
  });
}

/**
 * Main entry point: Load workflows, evaluate triggers, execute matching workflows
 * @param {string} triggerType - The trigger type (e.g., 'deal_created')
 * @param {object} triggerData - Data from the trigger event
 * @param {string} storeId - The store ID
 * @returns {Promise<{triggered: Array, failed: Array}>}
 */
export async function triggerWorkflows(triggerType, triggerData, storeId) {
  const results = {
    triggered: [],
    failed: [],
  };

  try {
    // Load all active workflows for the store
    const workflows = await loadWorkflows(storeId);

    if (workflows.length === 0) {
      console.log(
        `[WorkflowEngine] No active workflows found for store ${storeId}`,
      );
      return results;
    }

    console.log(
      `[WorkflowEngine] Loaded ${workflows.length} workflows, evaluating trigger: ${triggerType}`,
    );

    for (const workflow of workflows) {
      try {
        const shouldTrigger = evaluateTrigger(
          workflow,
          triggerType,
          triggerData,
        );

        if (shouldTrigger) {
          console.log(
            `[WorkflowEngine] Triggering workflow: ${workflow.name} (ID: ${workflow.id})`,
          );

          const executionResult = await executeWorkflow(workflow, triggerData);

          // Log the execution
          await createWorkflowLog(
            workflow.id,
            triggerType,
            triggerData.triggeredBy || "system",
            executionResult.actionsRun,
            executionResult.success ? "success" : "failed",
            executionResult.error,
          );

          if (executionResult.success) {
            results.triggered.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              actionsRun: executionResult.actionsRun,
            });
          } else {
            results.failed.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              error: executionResult.error,
              actionsRun: executionResult.actionsRun,
            });
          }
        }
      } catch (err) {
        console.error(
          `[WorkflowEngine] Error processing workflow ${workflow.id}:`,
          err,
        );

        // Log the failure
        await createWorkflowLog(
          workflow.id,
          triggerType,
          triggerData.triggeredBy || "system",
          [],
          "failed",
          err.message,
        );

        results.failed.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          error: err.message,
        });
      }
    }
  } catch (err) {
    console.error("[WorkflowEngine] Fatal error in triggerWorkflows:", err);
  }

  return results;
}

/**
 * Create a log entry in the workflow_logs table
 * @param {string} workflowId - The workflow ID
 * @param {string} triggerType - The trigger type that fired
 * @param {string} triggeredBy - What triggered the workflow (e.g., 'user', 'system')
 * @param {Array} actionsRun - Array of action results
 * @param {string} status - Execution status ('success', 'failed', 'pending')
 * @param {string|null} errorMessage - Error message if failed
 * @returns {Promise<{success: boolean, logId: string|null}>}
 */
export async function createWorkflowLog(
  workflowId,
  triggerType,
  triggeredBy,
  actionsRun,
  status,
  errorMessage,
) {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[WorkflowEngine] Workflow log (demo mode):", {
        workflowId,
        triggerType,
        triggeredBy,
        actionsRun,
        status,
        errorMessage,
      });
      return { success: true, logId: null };
    }

    const logEntry = {
      workflow_id: workflowId,
      trigger_type: triggerType,
      triggered_by: triggeredBy,
      actions_run: actionsRun,
      status,
      error_message: errorMessage,
      executed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLES.workflow_logs)
      .insert(logEntry)
      .select("id")
      .single();

    if (error) {
      console.error("[WorkflowEngine] Error creating workflow log:", error);
      return { success: false, logId: null };
    }

    return { success: true, logId: data.id };
  } catch (err) {
    console.error("[WorkflowEngine] Exception creating workflow log:", err);
    return { success: false, logId: null };
  }
}

/**
 * Get workflow logs for a specific workflow
 * @param {string} workflowId - The workflow ID
 * @param {number} limit - Maximum number of logs to return
 * @returns {Promise<Array>}
 */
export async function getWorkflowLogs(workflowId, limit = 50) {
  try {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLES.workflow_logs)
      .select("*")
      .eq("workflow_id", workflowId)
      .order("executed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[WorkflowEngine] Error fetching workflow logs:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[WorkflowEngine] Exception fetching workflow logs:", err);
    return [];
  }
}

/**
 * Get workflow execution statistics
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<{total: number, success: number, failed: number}>}
 */
export async function getWorkflowStats(workflowId) {
  try {
    if (!isSupabaseConfigured()) {
      return { total: 0, success: 0, failed: 0 };
    }

    const { data, error } = await supabase
      .from(TABLES.workflow_logs)
      .select("status")
      .eq("workflow_id", workflowId);

    if (error) {
      console.error("[WorkflowEngine] Error fetching workflow stats:", error);
      return { total: 0, success: 0, failed: 0 };
    }

    const stats = {
      total: data?.length || 0,
      success: data?.filter((log) => log.status === "success").length || 0,
      failed: data?.filter((log) => log.status === "failed").length || 0,
    };

    return stats;
  } catch (err) {
    console.error("[WorkflowEngine] Exception fetching workflow stats:", err);
    return { total: 0, success: 0, failed: 0 };
  }
}

// Export trigger types and action types for reference
export const TRIGGER_TYPES = {
  DEAL_CREATED: "deal_created",
  DEAL_STAGE_CHANGED: "deal_stage_changed",
  CONTACT_CREATED: "contact_created",
  ACTIVITY_COMPLETED: "activity_completed",
};

export const ACTION_TYPES = {
  CREATE_ACTIVITY: "create_activity",
  SEND_EMAIL: "send_email",
  UPDATE_FIELD: "update_field",
};
