// Permission utility functions

// Permission IDs mapping
export const PERMISSIONS = {
  ORDER_CANCEL: 1,
  ITEM_VOID: 2,
  DISCOUNT: 3,
  NC: 4,
  REPORTS: 5,
  KOT_REPRINT: 6,
  BILL_REPRINT: 7,
  DAY_CLOSE: 8,
  ADMIN_PAGE: 9,
  PETTY_CASH: 10,
  ITEM_COMPLIMENTARY: 11,
  DAY_REPORT_PRINT: 12
};

// Permission names mapping
export const PERMISSION_NAMES = {
  1: 'Order Cancel',
  2: 'Item Void',
  3: 'Discount',
  4: 'NC',
  5: 'Reports',
  6: 'Kot Reprint',
  7: 'Bill Reprint',
  8: 'Day Close',
  9: 'Admin Page',
  10: 'Petty Cash',
  11: 'Item Complimentary',
  12: 'Day Report Print'
};

// Global callback for permission denied (will be set by PermissionProvider)
let permissionDeniedCallback = null;

/**
 * Set the global permission denied callback
 * @param {Function} callback - Function to call when permission is denied
 */
export const setPermissionDeniedCallback = (callback) => {
  permissionDeniedCallback = callback;
};

/**
 * Store user permissions in localStorage
 * @param {Array} permissions - Array of permission objects from API
 */
export const storePermissions = (permissions) => {
  try {
    if (!Array.isArray(permissions)) {
      console.error('Invalid permissions data');
      return;
    }

    // Create a permission map for quick lookup
    const permissionMap = {};
    permissions.forEach(perm => {
      permissionMap[perm.posPermissionId] = perm.isactive;
    });

    localStorage.setItem('userPermissions', JSON.stringify(permissionMap));
    console.log('✅ Permissions stored:', permissionMap);
  } catch (error) {
    console.error('❌ Error storing permissions:', error);
  }
};

/**
 * Get all user permissions from localStorage
 * @returns {Object} Permission map
 */
export const getPermissions = () => {
  try {
    const permissions = localStorage.getItem('userPermissions');
    if (!permissions) {
      return {};
    }
    return JSON.parse(permissions);
  } catch (error) {
    console.error('❌ Error getting permissions:', error);
    return {};
  }
};

/**
 * Check if user has a specific permission
 * @param {number} permissionId - Permission ID to check
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (permissionId) => {
  const permissions = getPermissions();
  return permissions[permissionId] === true;
};

/**
 * Clear all stored permissions (for logout)
 */
export const clearPermissions = () => {
  localStorage.removeItem('userPermissions');
};

/**
 * Show permission denied message (uses modal if available, falls back to alert)
 * @param {string} featureName - Name of the feature being accessed
 */
export const showPermissionDenied = (featureName) => {
  if (permissionDeniedCallback) {
    // Use modal if callback is set
    permissionDeniedCallback(featureName);
  } else {
    // Fallback to alert if modal is not available
    alert(`⚠️ Access Denied\n\nYou do not have permission to access "${featureName}".\n\nPlease contact your administrator.`);
  }
};

/**
 * Check permission and show modal/alert if denied
 * @param {number} permissionId - Permission ID to check
 * @returns {boolean} True if user has permission
 */
export const checkPermission = (permissionId) => {
  const hasAccess = hasPermission(permissionId);
  if (!hasAccess) {
    const permissionName = PERMISSION_NAMES[permissionId] || 'this feature';
    showPermissionDenied(permissionName);
  }
  return hasAccess;
};