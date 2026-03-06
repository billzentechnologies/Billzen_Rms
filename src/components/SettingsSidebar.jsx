import React, { useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
// import { useNavigate, useLocation } from 'react-router-dom';
import { PERMISSIONS, clearPermissions } from './permissions';
import { usePermission } from '../context/PermissionContext';
import { getAdminPageUrl } from '../services/apicall';

const SettingsSidebar = ({ isOpen, onClose, handleDayClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleNavigation = (path) => {
    onClose();
    navigate(path);
  };

  const handleAdminPage = () => {
    onClose();
    const adminUrl = getAdminPageUrl();
    window.location.href = adminUrl;
  };

  const handleDayCloseClick = () => {
    onClose();
    if (handleDayClose) {
      handleDayClose();
    } else {
      navigate('/day-close');
    }
  };

  const handleLogout = () => {
    onClose();

    // 🔐 Clear permissions on logout
    clearPermissions();

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('userId');
    localStorage.removeItem('subscriberId');
    localStorage.removeItem('restaurantName');
    localStorage.removeItem('userName');
    sessionStorage.clear();

    showToast('You have been logged out successfully', 'success');

    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
  };

  const colorMap = {
    blue: "from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200",
    green: "from-green-50 to-green-100 hover:from-green-100 hover:to-green-200",
    purple: "from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200",
    orange: "from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200",
    indigo: "from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200",
    pink: "from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200",
    teal: "from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200",
  };

  const getMenuItems = () => {
    const currentPath = location.pathname;

    const allItems = [
      {
        title: 'Billing',
        color: 'blue',
        path: '/billing',
        show: currentPath === '/tables',
        permission: null // No permission required
      },
      {
        title: 'Tables',
        color: 'green',
        path: '/tables',
        show: currentPath === '/billing',
        permission: null // No permission required
      },
      {
        title: 'Reports',
        color: 'purple',
        path: '/reports',
        show: true,
        permission: PERMISSIONS.REPORTS // 🔐 Requires REPORTS permission (ID: 5)
      },
      {
        title: 'Bill Details',
        color: 'pink',
        path: '/bill-details',
        show: true,
        permission: null // No permission required
      },
      {
        title: 'KOT Reprint',
        color: 'indigo',
        path: '/kot-reprint',
        show: true,
        permission: PERMISSIONS.KOT_REPRINT // 🔐 Requires KOT_REPRINT permission (ID: 6)
      },
      {
        title: 'Petty Cash',
        color: 'teal',
        path: '/petty-cash',
        show: true,
        permission: PERMISSIONS.PETTY_CASH // 🔐 Requires PETTY_CASH permission (ID: 10)
      },
      {
        title: 'Admin Page',
        color: 'indigo',
        isExternal: true,
        show: true,
        permission: PERMISSIONS.ADMIN_PAGE // 🔐 Requires ADMIN_PAGE permission (ID: 9)
      },
      {
        title: 'Day Print Config',
        color: 'teal',
        path: '/day-print-config',
        show: true,
        permission: null
      },
    ];

    return allItems.filter(item => item.show);
  };

  const menuItems = getMenuItems();

  const { executeWithPermission } = usePermission();

  const handleItemClick = (item) => {
    const proceed = () => {
      // Permission granted or not required, proceed with action
      if (item.isExternal) {
        handleAdminPage();
      } else if (item.isDayClose) {
        handleDayCloseClick();
      } else {
        handleNavigation(item.path);
      }
    };

    // 🔐 Check permission if required
    if (item.permission !== null && item.permission !== undefined) {
      executeWithPermission(item.permission, item.title, proceed);
    } else {
      proceed();
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          <div className="space-y-4">
            {menuItems.map((item, index) => (
              <button
                key={item.path || index}
                onClick={() => handleItemClick(item)}
                className={`w-full p-4 text-left bg-gradient-to-r ${colorMap[item.color]} rounded-lg shadow-sm hover:shadow-md transition`}
              >
                <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsSidebar;