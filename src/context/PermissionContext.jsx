import React, { createContext, useContext, useState, useCallback } from 'react';
import { checkPermission, PERMISSION_NAMES } from '../components/permissions';
import SupervisorPasswordModal from '../components/SupervisorPasswordModal';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        permissionName: '',
        onSuccess: null
    });

    const closeModal = useCallback(() => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, []);

    /**
     * Execute an action requiring permission.
     * If user has permission, executes immediately.
     * If not, prompts for supervisor password.
     * 
     * @param {number} permissionId - ID from PERMISSIONS constant
     * @param {string} featureName - Human readable name (optional, defaults to mapping)
     * @param {Function} callback - Action to execute on success
     */
    const executeWithPermission = useCallback((permissionId, featureName, callback) => { // Removed featureName default value check inside
        // 1. Check if user already has permission
        // passing false as second arg to checkPermission to suppress default alert
        // But checkPermission implementation shows alert if false.
        // We should use hasPermission check directly to avoid alert.

        // Importing hasPermission would be better, but we can rely on checkPermission behavior
        // Actually, let's look at permissions.jsx again. checkPermission calls showPermissionDenied.
        // We want to intercept that.

        // For now, let's assume we can import hasPermission or we just use checkPermission logic locally
        // To match existing code style, we'll use LocalStorage directly or rely on the helper
        // but we want to avoid the default alert.

        // Let's rely on standard check first.
        // Ideally we should modify permissions.jsx to allow checking without alert, 
        // but strictly adhering to plan, we build context around it.

        const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
        const hasAccess = userPermissions[permissionId] === true;

        if (hasAccess) {
            if (callback) callback();
            return;
        }

        // 2. If no access, show supervisor modal
        const name = featureName || PERMISSION_NAMES[permissionId] || 'Restricted Action';

        setModalState({
            isOpen: true,
            permissionName: name,
            onSuccess: callback
        });

    }, []);

    return (
        <PermissionContext.Provider value={{ executeWithPermission }}>
            {children}
            <SupervisorPasswordModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onSuccess={modalState.onSuccess}
                permissionName={modalState.permissionName}
            />
        </PermissionContext.Provider>
    );
};

export const usePermission = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermission must be used within a PermissionProvider');
    }
    return context;
};

export default PermissionContext;
