import React, { useState, useEffect, useContext } from 'react';
import FloorPlanGrid from './FloorPlanGrid';
import OrderEntry from './OrderEntry';
import OrderStatus from './OrderStatus';
import { AuthContext } from '../../context/AuthContext';

const WaiterWorkspace = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('floorPlan'); // 'floorPlan' | 'orderEntry' | 'liveStatus'
  const [selectedTable, setSelectedTable] = useState(null);
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Fetch waiter notifications across all workspace views
  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/orders/notifications', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      const json = await response.json();
      if (response.ok) {
        setNotifications(json.data || (Array.isArray(json) ? json : []));
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Dismiss notification and trigger status updates
  const handleAcknowledgeNotification = async (notificationId) => {
    try {
      await fetch(`http://localhost:5000/api/v1/orders/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // Handle table selection from floor plan grid
  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveTab('orderEntry');
  };

  // Called when an order is submitted successfully
  const handleOrderSubmitted = () => {
    setSelectedTable(null);
    setActiveTab('liveStatus');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Waiter Terminal
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Ethio-Order Pro POS • Floor Plan & Live Table Management
          </p>
        </div>

        {/* Tab Selection & Global Notification Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          
          {/* Global Notification Bell */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="w-full sm:w-auto px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center justify-center gap-2 text-xs font-bold text-amber-900 shadow-sm"
            >
              🔔 Notifications
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-full animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="font-bold text-xs text-gray-800">Ready Orders & Alerts</span>
                  <button
                    onClick={() => setShowNotifDropdown(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400">
                    No active alerts right now
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                    {notifications.map((n) => (
                      <div
                        key={n.notification_id || n.id}
                        className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex flex-col gap-2"
                      >
                        <span className="text-xs font-semibold text-gray-800">{n.message}</span>
                        <button
                          onClick={() => {
                            handleAcknowledgeNotification(n.notification_id || n.id);
                            setShowNotifDropdown(false);
                          }}
                          className="self-end px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition"
                        >
                          ✓ Mark Served
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('floorPlan')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'floorPlan'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🗺️ Floor Plan
            </button>
            <button
              onClick={() => setActiveTab('orderEntry')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'orderEntry'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📝 New Order {selectedTable ? `(T-${selectedTable.table_number})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('liveStatus')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'liveStatus'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Live Status & Bills
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content Display */}
      {activeTab === 'floorPlan' && (
        <FloorPlanGrid
          onSelectTable={handleSelectTable}
          selectedTableId={selectedTable?.table_id}
        />
      )}

      {activeTab === 'orderEntry' && (
        <>
          {selectedTable ? (
            <OrderEntry
              selectedTable={selectedTable}
              onOrderSubmitted={handleOrderSubmitted}
              onCancel={() => setSelectedTable(null)}
            />
          ) : (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="text-4xl">🪑</div>
              <h3 className="text-lg font-bold text-gray-800">No Table Selected</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Please select an active or available table from the floor plan to start taking an order ticket.
              </p>
              <button
                onClick={() => setActiveTab('floorPlan')}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition"
              >
                Go to Floor Plan
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'liveStatus' && <OrderStatus />}
    </div>
  );
};

export default WaiterWorkspace;