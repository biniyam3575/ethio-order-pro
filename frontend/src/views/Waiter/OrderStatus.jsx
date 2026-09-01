import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const OrderStatus = () => {
  const { token } = useContext(AuthContext);
  const [liveOrders, setLiveOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  // Fetch live orders and waiter notifications safely
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token || localStorage.getItem('token')}` };

      const [ordersRes, notifsRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/orders/live', { headers }),
        fetch('http://localhost:5000/api/v1/orders/notifications', { headers }),
      ]);

      // Handle HTML error pages safely
      if (!ordersRes.ok) {
        const text = await ordersRes.text();
        throw new Error(`Orders fetch failed (${ordersRes.status})`);
      }

      const ordersJson = await ordersRes.json();
      const notifsJson = notifsRes.ok ? await notifsRes.json() : { data: [] };

      const extractedTables = ordersJson.data || (Array.isArray(ordersJson) ? ordersJson : []);
      const extractedNotifs = notifsJson.data || (Array.isArray(notifsJson) ? notifsJson : []);

      setLiveOrders(extractedTables);
      setNotifications(extractedNotifs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAcknowledgeNotification = async (notificationId) => {
    try {
      await fetch(`http://localhost:5000/api/v1/orders/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      fetchData();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // Request bill fix: standardizes target endpoint using an order ID or direct table URL pattern
  const handleRequestBill = async (tableData) => {
    const tableId = tableData.table_id;
    // Get the first active order ID from table orders
    const firstOrderId = tableData.orders && tableData.orders[0] ? tableData.orders[0].order_id : null;

    if (!firstOrderId && !tableId) {
      setError('Unable to resolve active order for this table.');
      return;
    }

    setActionLoading(tableId);
    setError('');

    try {
      // Use existing endpoint matching POST /api/v1/orders/:orderId/request-bill
      const endpoint = `http://localhost:5000/api/v1/orders/${firstOrderId}/request-bill`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ tableId }),
      });

      // Verify server returned JSON before parsing to avoid Unexpected token '<'
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('Non-JSON Response:', errorText);
        throw new Error(`Server returned HTML error (${response.status}). Check backend logs.`);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to request bill.');

      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
      case 'Ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Served':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Awaiting_Bill':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 font-medium">Loading active table trackers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ready Order Alert Banner */}
      {notifications.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm space-y-2">
          <h4 className="font-bold text-amber-900 flex items-center gap-2">
            🔔 Ready for Pickup ({notifications.length})
          </h4>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.notification_id || n.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200"
              >
                <span className="text-sm font-semibold text-gray-800">{n.message}</span>
                <button
                  onClick={() => handleAcknowledgeNotification(n.notification_id || n.id)}
                  className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                >
                  ✓ Served to Table
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Order Tracker Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Live Table Trackers</h3>
            <p className="text-xs text-gray-500">Monitor kitchen/bar processing and request customer bills</p>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-xs border border-red-200">
            {error}
          </div>
        )}

        {liveOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            📋 No active orders currently assigned to you.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveOrders.map((tableData, index) => {
              const ordersList = tableData.orders || [];
              const isTableAwaitingBill = tableData.table_status === 'Awaiting_Bill';

              return (
                <div
                  key={`${tableData.table_id || 'table'}-${tableData.table_number || index}-${index}`}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between h-[420px] shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 flex-shrink-0">
                    <div>
                      <span className="font-black text-gray-900 text-base block">
                        Table #{tableData.table_number}
                      </span>
                      {tableData.section && (
                        <span className="text-[10px] text-gray-500 font-semibold uppercase">
                          {tableData.section} Section
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        tableData.table_status
                      )}`}
                    >
                      {tableData.table_status ? tableData.table_status.replace('_', ' ') : 'Active'}
                    </span>
                  </div>

                  {/* Scrollable Sub-Orders Area */}
                  <div className="my-3 space-y-3 overflow-y-auto flex-grow pr-1 custom-scrollbar">
                    {ordersList.map((ord, oIdx) => (
                      <div key={ord.order_id || oIdx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-700 border-b border-gray-100 pb-1">
                          <span>Ticket #{ord.order_id}</span>
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${getStatusBadge(ord.order_status)}`}>
                            {ord.order_status ? ord.order_status.replace('_', ' ') : 'Pending'}
                          </span>
                        </div>

                        <ul className="space-y-1.5 text-xs">
                          {ord.items &&
                            ord.items.map((item, idx) => (
                              <li
                                key={item.item_id || idx}
                                className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100"
                              >
                                <div className="flex flex-col pr-2">
                                  <span className="font-medium text-gray-800">
                                    {item.quantity}x {item.name}
                                  </span>
                                  {item.note && (
                                    <span className="text-[10px] text-amber-600 italic">
                                      Note: {item.note}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 font-semibold text-gray-600 whitespace-nowrap">
                                  {item.station || 'Kitchen'}: {item.status}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-gray-200 flex-shrink-0 space-y-2 bg-gray-50/50">
                    {tableData.group_total_amount && (
                      <div className="flex justify-between items-center text-xs text-gray-600 font-semibold px-1">
                        <span>Total ({tableData.total_orders_count || ordersList.length} tickets):</span>
                        <span className="text-gray-900 font-bold">
                          {parseFloat(tableData.group_total_amount).toFixed(2)} ETB
                        </span>
                      </div>
                    )}

                    {isTableAwaitingBill ? (
                      <div className="w-full text-center py-2 text-xs font-bold text-purple-700 bg-purple-50 rounded-lg border border-purple-200">
                        ⌛ Bill Requested (Cashier Processing)
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestBill(tableData)}
                        disabled={actionLoading === tableData.table_id}
                        className="w-full py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition disabled:opacity-40"
                      >
                        {actionLoading === tableData.table_id
                          ? 'Sending Request...'
                          : '🧾 Request Bill for Table'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatus;