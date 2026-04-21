/**
 * Role-Based Access Control (RBAC) for CRM System
 * Defines roles, permissions matrix, and helper functions
 */

// Role constants
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES_REP: 'sales_rep',
};

// Permission matrix per role per resource
// 'own' means only own records, true means all records, false means no access
export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    users: { read: true, write: true, delete: true },
    settings: { read: true, write: true },
    contacts: { read: true, write: true, delete: true },
    companies: { read: true, write: true, delete: true },
    deals: { read: true, write: true, delete: true },
    activities: { read: true, write: true, delete: true },
    stores: { read: true, write: true, delete: true },
    reports: { read: true, write: true },
    exports: { read: true, write: true },
  },
  [ROLES.MANAGER]: {
    users: { read: true, write: false, delete: false },
    settings: { read: true, write: false },
    contacts: { read: true, write: true, delete: true },
    companies: { read: true, write: true, delete: true },
    deals: { read: true, write: true, delete: true },
    activities: { read: true, write: true, delete: true },
    stores: { read: true, write: true, delete: false },
    reports: { read: true, write: true },
    exports: { read: true, write: true },
  },
  [ROLES.SALES_REP]: {
    users: { read: false, write: false, delete: false },
    settings: { read: true, write: false },
    contacts: { read: 'own', write: true, delete: 'own' },
    companies: { read: 'own', write: true, delete: 'own' },
    deals: { read: 'own', write: true, delete: 'own' },
    activities: { read: true, write: true, delete: 'own' },
    stores: { read: true, write: false, delete: false },
    reports: { read: 'own', write: false },
    exports: { read: 'own', write: false },
  },
};

/**
 * Check if a role has permission for an action on a resource
 * @param {string} role - User role (admin, manager, sales_rep)
 * @param {string} resource - Resource name (users, settings, contacts, etc.)
 * @param {string} action - Action (read, write, delete)
 * @returns {boolean}
 */
export function hasPermission(role, resource, action) {
  const perms = PERMISSIONS[role];
  if (!perms) return false;

  const resourcePerms = perms[resource];
  if (!resourcePerms) return false;

  const actionPerm = resourcePerms[action];
  return actionPerm === true;
}

/**
 * Check if a user can access a specific record
 * @param {string} userId - Current user ID
 * @param {string} role - Current user role
 * @param {string} recordUserId - Owner ID of the record (user_id or owner field)
 * @returns {boolean}
 */
export function canAccessRecord(userId, role, recordUserId) {
  // Admins and managers can access all records
  if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true;
  }

  // Sales reps can only access their own records
  if (role === ROLES.SALES_REP) {
    return userId === recordUserId;
  }

  return false;
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {object|null}
 */
export function getRolePermissions(role) {
  return PERMISSIONS[role] || null;
}

/**
 * Check if role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}
