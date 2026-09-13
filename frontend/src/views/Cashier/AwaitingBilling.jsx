import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import PaymentCheckout from './PaymentCheckout';
import ShiftManager from './ShiftManager';

const AwaitingBilling = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('queue');
  const [billingQueue, setBillingQueue] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calendar Date Filter State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Audio Reference & Tracking Flags
  const audioRef = useRef(null);
  const knownNotifIdsRef = useRef(new Set());
  const isInitialNotifFetch = useRef(true);

  // Preload audio once on mount
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.load();
  }, []);

  // Safe isolated sound player
  const playNotificationSound = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Browsers require initial user gesture before playing audio
    });
  }, []);

  // Fetch Notifications strictly isolated from UI clicks
  const fetchNotifications = useCallback(async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/orders/notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await response.json();

      if (response.ok) {
        const fetchedData = json.data || (Array.isArray(json) ? json : []);
        let hasBrandNewNotification = false;

        fetchedData.forEach((n) => {
          const notifId = n.notification_id || n.id;
          if (notifId && !knownNotifIdsRef.current.has(notifId)) {
            if (!isInitialNotifFetch.current) {
              hasBrandNewNotification = true;
            }
            knownNotifIdsRef.current.add(notifId);
          }
        });

        isInitialNotifFetch.current = false;

        if (hasBrandNewNotification) {
          playNotificationSound();
        }

        setNotifications(fetchedData);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token, playNotificationSound]);

  const handleAcknowledgeNotification = async (notificationId) => {
    try {
      const authToken = token || localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/v1/orders/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const fetchAwaitingBills = useCallback(async () => {
    try {
      setError('');
      const authToken = token || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/bills/awaiting-bill', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load awaiting bills queue.');

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setBillingQueue(list);

      if (selectedTable) {
        const updatedSelected = list.find((t) => t.table_id === selectedTable.table_id);
        setSelectedTable(updatedSelected || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedTable]);

  const fetchPaymentHistory = useCallback(async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/v1/bills/history?date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const data = await response.json();
      if (response.ok) {
        setPaymentHistory(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load payment history:', err);
    }
  }, [token, selectedDate]);

  // Initial Load
  useEffect(() => {
    fetchAwaitingBills();
    fetchNotifications();
  }, [fetchAwaitingBills, fetchNotifications]);

  // Tab or Date Change Effect
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPaymentHistory();
    }
  }, [activeTab, selectedDate, fetchPaymentHistory]);

  // Polling Interval (8s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAwaitingBills();
      fetchNotifications();
      if (activeTab === 'history') {
        fetchPaymentHistory();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchAwaitingBills, fetchNotifications, fetchPaymentHistory, activeTab]);

  const handleSelectTable = (table) => {
    setSelectedTable(table);
  };

  const handlePaymentSuccess = () => {
    setSelectedTable(null);
    fetchAwaitingBills();
    fetchPaymentHistory();
  };

  const dailyTotalCollected = paymentHistory.reduce(
    (sum, item) => sum + parseFloat(item.total_amount || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-3 text-sm font-semibold text-gray-600">Loading Cashier Workstation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Cashier Workstation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage guest billing, register shifts, and daily payment history</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Notification Bell */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="w-full sm:w-auto px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center justify-center gap-2 text-xs font-bold text-amber-900 shadow-sm"
            >
              🔔
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-full animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="font-bold text-xs text-gray-800">Bill Requests & Alerts</span>
                  <button onClick={() => setShowNotifDropdown(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">
                    ✕
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400">No active alerts right now</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                    {notifications.map((n) => (
                      <div key={n.notification_id || n.id} className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex flex-col gap-2">
                        <span className="text-xs font-semibold text-gray-800">{n.message}</span>
                        <button
                          onClick={() => {
                            handleAcknowledgeNotification(n.notification_id || n.id);
                            setShowNotifDropdown(false);
                          }}
                          className="self-end px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition"
                        >
                          ✓ Dismiss Alert
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition ${
                activeTab === 'queue' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Queue ({billingQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition ${
                activeTab === 'history' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📜 Payment History
            </button>
            <button
              onClick={() => setActiveTab('shift')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition ${
                activeTab === 'shift' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔑 Register Shift
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold">✕</button>
        </div>
      )}

      {/* Queue View */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {billingQueue.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs">
                📋 No tables awaiting billing settlement.
              </div>
            ) : (
              billingQueue.map((table) => {
                const isSelected = selectedTable?.table_id === table.table_id;
                return (
                  <div
                    key={table.table_id}
                    onClick={() => handleSelectTable(table)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-200'
                        : 'bg-white border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-black text-gray-900 text-base">Table #{table.table_number}</h3>
                        <p className="text-xs text-gray-500">Waiter: {table.waiter_name || 'Unassigned'}</p>
                      </div>
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                        {table.total_orders_count || 1} Ticket(s)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100 font-bold text-gray-800">
                      <span>Total Due:</span>
                      <span className="text-emerald-700 text-sm font-mono font-black">
                        {parseFloat(table.group_total_amount || 0).toFixed(2)} ETB
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="lg:col-span-7">
            {selectedTable ? (
              <PaymentCheckout table={selectedTable} token={token} onPaymentSuccess={handlePaymentSuccess} />
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-16 text-center text-gray-400 text-xs">
                👈 Select a table from the left to open settlement checkout.
              </div>
            )}
          </div>
        </div>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-gray-900 text-base">Payment History</h3>
              <p className="text-xs text-gray-500">Confirmed settlements recorded by cashiers</p>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
              <label htmlFor="calendar-picker" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                📅 Date:
              </label>
              <input
                id="calendar-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={fetchPaymentHistory}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition"
              >
                Filter
              </button>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                Total Money Collected ({selectedDate})
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-0.5">
                {dailyTotalCollected.toFixed(2)} ETB
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-800">
                Total Transactions: {paymentHistory.length}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold">
                    <th className="p-3">Table</th>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Waiter</th>
                    <th className="p-3">Cashier</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Receipt / Ref</th>
                    <th className="p-3">Money Collected</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-gray-400 font-medium">
                        No payments found for {selectedDate}. Pick another date using the calendar above.
                      </td>
                    </tr>
                  ) : (
                    paymentHistory.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-black text-gray-900 text-sm">
                          Table #{item.table_number}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {item.aggregated_order_ids || `#${item.order_id}`}
                        </td>
                        <td className="p-3 text-gray-700 font-medium">
                          {item.waiter_name || 'N/A'}
                        </td>
                        <td className="p-3 text-gray-700 font-medium">
                          {item.cashier_name || 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-bold uppercase text-gray-800">
                            {item.payment_method}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-gray-600 text-[11px]">
                          {item.fiscal_receipt_no || item.payment_ref || 'N/A'}
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-700 text-sm">
                          {parseFloat(item.total_amount || 0).toFixed(2)} ETB
                        </td>
                        <td className="p-3 text-gray-500 font-medium">
                          {item.paid_at
                            ? new Date(item.paid_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Shift View */}
      {activeTab === 'shift' && (
        <div className="max-w-md mx-auto">
          <ShiftManager onShiftChange={fetchAwaitingBills} />
        </div>
      )}
    </div>
  );
};

export default AwaitingBilling;