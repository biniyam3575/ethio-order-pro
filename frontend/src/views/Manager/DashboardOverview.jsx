import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import StaffManagement from './StaffManagement';
import MenuManagement from './MenuManagement';
import TableConfig from './TableConfig';
import Reports from './Reports';
import AuditLogs from './AuditLogs';
import ShiftControl from './ShiftControl';

const DashboardOverview = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('staff');

  // Safely parse user roles (handles Postgres "{Role}" strings & JS Arrays)
  const getUserRoles = (roles) => {
    if (!roles) return [];
    if (Array.isArray(roles)) return roles;
    if (typeof roles === 'string') {
      return roles.replace(/[{}"\s]/g, '').split(',');
    }
    return [];
  };

  const userRoles = getUserRoles(user?.roles);
  const isOwner = userRoles.includes('Owner');

  const tabs = [
    { id: 'staff', label: '👥 Staff Roster' },
    { id: 'menu', label: '🍽️ Menu Management' },
    { id: 'tables', label: '🪑 Floor Plan & Tables' },
    { id: 'shifts', label: '💵 Register & Shifts' },
    { id: 'reports', label: '📊 Sales & Analytics' },
    ...(isOwner ? [{ id: 'audit', label: '🛡️ Audit Trail' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isOwner ? '👑 Owner Workspace' : '💼 Manager Workspace'}
            </h1>
            <p className="text-sm text-gray-500">
              Logged in as <span className="font-semibold text-gray-700">{user?.full_name || user?.username}</span>
            </p>
          </div>

          <button
            onClick={logoutUser}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition font-medium text-sm"
          >
            Logout
          </button>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex border-b border-gray-200 bg-white rounded-t-lg px-4 pt-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-6 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab View Rendering */}
        <div className="mt-4">
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'tables' && <TableConfig />}
          {activeTab === 'shifts' && <ShiftControl />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'audit' && isOwner && <AuditLogs />}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;