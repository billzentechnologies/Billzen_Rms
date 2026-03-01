import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import RestaurantBilling from './pages/resturantbilling';
import TablePage from './pages/tables';
import MergeTransferPage from './pages/TableMergeModal';
import TableSplitPage from './pages/TableSplitModal';
import AddChairPage from './pages/AddChairModal';
import LoginPage from './pages/login';
import Reports from './pages/reports';
import BillDetails from './pages/BillDetails';
import KOTReprint from './pages/KOTReprint';
import PettyCash from './pages/PettyCash';
import ProtectedRoute from './components/ProtectedRoute';
import { PermissionProvider } from './context/PermissionContext';
import DayPrintConfig from './pages/DayPrintConfig';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    // Skip restrictions on login page
    if (isLoginPage) {
      return;
    }

    // Disable right click
    const disableRightClick = (e) => {
      e.preventDefault();
    };

    // Disable keyboard shortcuts & zoom
    const disableKeys = (e) => {
      // Block Ctrl + key actions
      if (
        e.ctrlKey &&
        ['+', '-', '=', 'p', 'P', 'c', 'C', 'v', 'V', 'x', 'X', 'a', 'A'].includes(e.key)
      ) {
        e.preventDefault();
      }
    };

    // Block Ctrl + Mouse Wheel zoom
    const disableZoom = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableKeys);
    document.addEventListener('wheel', disableZoom, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableKeys);
      document.removeEventListener('wheel', disableZoom);
    };
  }, [isLoginPage]);

  return (
    <Routes>
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <RestaurantBilling />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tables"
        element={
          <ProtectedRoute>
            <TablePage />
          </ProtectedRoute>
        }
      />

      {/* Table Management Routes */}
      <Route
        path="/tables/mergetransfer"
        element={
          <ProtectedRoute>
            <MergeTransferPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tables/split"
        element={
          <ProtectedRoute>
            <TableSplitPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tables/addchair"
        element={
          <ProtectedRoute>
            <AddChairPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kot-reprint"
        element={
          <ProtectedRoute>
            <KOTReprint />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bill-details"
        element={
          <ProtectedRoute>
            <BillDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/petty-cash"
        element={
          <ProtectedRoute>
            <PettyCash />
          </ProtectedRoute>
        }
      />

      <Route
        path="/day-print-config"
        element={
          <ProtectedRoute>
            <DayPrintConfig />
          </ProtectedRoute>
        }
      />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <PermissionProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </PermissionProvider>
  );
}

export default App;