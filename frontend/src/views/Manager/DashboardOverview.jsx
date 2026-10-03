import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

import StaffManagement from './StaffManagement';
import MenuManagement from './MenuManagement';
import TableConfig from './TableConfig';
import Reports from './Reports';
import AuditLogs from './AuditLogs';
import ShiftControl from './ShiftControl';

const Icons = {
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  ),

  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),

  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
    </svg>
  ),

  menuBook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6h8M8 10h8" strokeLinecap="round" />
    </svg>
  ),

  tables: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="6" rx="1" />
      <path d="M6 10v10M18 10v10M3 20h18" strokeLinecap="round" />
    </svg>
  ),

  shifts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h3M14 13h3M7 16h2" strokeLinecap="round" />
    </svg>
  ),

  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M4 19V5M4 19h17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16v-5M12 16V8M16 16v-7M20 16v-3" strokeLinecap="round" />
    </svg>
  ),

  audit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M12 3l7 3v5c0 4.5-2.9 8.5-7 10-4.1-1.5-7-5.5-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  coffee: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M4 8h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 10h1.5a2.5 2.5 0 010 5H17M7 4c0 1 1 1 1 2M11 4c0 1 1 1 1 2" strokeLinecap="round" />
      <path d="M3 21h16" strokeLinecap="round" />
    </svg>
  ),

  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 014-2h4" strokeLinecap="round" />
      <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" />
    </svg>
  ),

  crown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M3 7l4 4 5-7 5 7 4-4-2 11H5L3 7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  ),

  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" strokeLinecap="round" />
      <path d="M10 12v2h4v-2" strokeLinecap="round" />
    </svg>
  ),
};

const DashboardOverview = () => {
  const { user, logoutUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('staff');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getUserRoles = (roles) => {
    if (!roles) return [];

    if (Array.isArray(roles)) return roles;

    if (typeof roles === 'string') {
      return roles
        .replace(/[{}"]/g, '')
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean);
    }

    return [];
  };

  const userRoles = getUserRoles(user?.roles);
  const isOwner = userRoles.includes('Owner');

  const tabs = [
    {
      id: 'staff',
      label: 'Staff',
      description: 'Manage employees',
      icon: Icons.users,
    },
    {
      id: 'menu',
      label: 'Menu',
      description: 'Manage menu items',
      icon: Icons.menuBook,
    },
    {
      id: 'tables',
      label: 'Tables',
      description: 'Manage floor plan',
      icon: Icons.tables,
    },
    {
      id: 'shifts',
      label: 'Shifts',
      description: 'Register & shifts',
      icon: Icons.shifts,
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Sales & analytics',
      icon: Icons.reports,
    },
    ...(isOwner
      ? [
          {
            id: 'audit',
            label: 'Audit Trail',
            description: 'System activity',
            icon: Icons.audit,
          },
        ]
      : []),
  ];

  const activeTabInfo =
    tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`
        flex flex-col h-full bg-white border-r border-slate-200
        ${mobile ? 'w-[270px]' : 'w-[250px]'}
      `}
    >
      <div className="h-[76px] px-6 flex items-center border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
            {Icons.coffee}
          </div>

          <div>
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
              Café Admin
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Management Portal
            </p>
          </div>
        </div>

        {mobile && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close navigation"
          >
            {Icons.close}
          </button>
        )}
      </div>

      <div
        className="
          flex-1 px-4 py-4
          overflow-y-auto
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-transparent
          hover:[&::-webkit-scrollbar-thumb]:bg-slate-300
          [&::-webkit-scrollbar-thumb]:rounded-full
        "
      >
        <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Management
        </p>

        <nav className="space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`
                  group w-full flex items-center gap-3
                  px-3 py-2.5 rounded-xl text-left
                  transition-all duration-150 cursor-pointer
                  ${
                    isActive
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <span
                  className={`
                    flex-shrink-0
                    ${
                      isActive
                        ? 'text-amber-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }
                  `}
                >
                  {tab.icon}
                </span>

                <span className="min-w-0">
                  <span
                    className={`
                      block text-sm leading-5
                      ${isActive ? 'font-semibold' : 'font-medium'}
                    `}
                  >
                    {tab.label}
                  </span>

                  <span
                    className={`
                      block text-[11px] mt-0.5 truncate
                      ${isActive ? 'text-amber-600/70' : 'text-slate-400'}
                    `}
                  >
                    {tab.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 py-4 border-t border-slate-100">
        <button
          type="button"
          onClick={logoutUser}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
        >
          <span className="text-slate-400">{Icons.logout}</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] cursor-pointer"
          />

          <div className="relative z-10 h-full shadow-xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="lg:pl-[250px] min-h-screen">
        <header className="sticky top-0 z-30 h-[76px] bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden mr-3 p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                aria-label="Open navigation"
              >
                {Icons.menu}
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 hidden sm:block">
                    {activeTabInfo.icon}
                  </span>

                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                    {activeTabInfo.label}
                  </h1>
                </div>

                <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
                  {activeTabInfo.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                  {isOwner ? Icons.crown : Icons.briefcase}
                </div>

                <div className="hidden md:block leading-tight">
                  <p className="text-xs font-semibold text-slate-700">
                    {isOwner ? 'Owner' : 'Manager'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Admin access
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={logoutUser}
                className="lg:hidden p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Sign out"
              >
                {Icons.logout}
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="w-full max-w-[1600px] mx-auto">
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'menu' && <MenuManagement />}
            {activeTab === 'tables' && <TableConfig />}
            {activeTab === 'shifts' && <ShiftControl />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'audit' && isOwner && <AuditLogs />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardOverview;
