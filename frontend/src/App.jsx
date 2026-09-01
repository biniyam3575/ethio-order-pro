import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Views
import Login from './views/Login/Login';
import DashboardOverview from './views/Manager/DashboardOverview';
import WaiterWorkspace from './views/Waiter/WaiterWorkspace';
import KitchenView from './views/Kitchen/KitchenView';
import AwaitingBilling from './views/Cashier/AwaitingBilling';

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Owner & Manager Shared Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Owner', 'Manager']} />}>
        <Route path="/manager" element={<DashboardOverview />} />
      </Route>

      {/* Dedicated Owner-Only Routes (Add future administrative components here) */}
      <Route element={<ProtectedRoute allowedRoles={['Owner']} />}>
        <Route path="/owner" element={<DashboardOverview />} />
      </Route>

      {/* Waitstaff Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Waiter']} />}>
        <Route path="/waiter" element={<WaiterWorkspace />} />
      </Route>

      {/* Kitchen Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Kitchen']} />}>
        <Route path="/kitchen" element={<KitchenView />} />
      </Route>

      {/* Cashier Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Cashier']} />}>
        <Route path="/cashier" element={<AwaitingBilling />} />
      </Route>

      {/* Default Fallback Redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;