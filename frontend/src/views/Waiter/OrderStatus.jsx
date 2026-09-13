import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const OrderStatus = ({ onRefreshNotifications }) => {
  const { token } = useContext(AuthContext);
  const [liveOrders, setLiveOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  // Enhanced Cancel Modal State
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    orderId: null,
    itemId: null,
    itemName: null,
    tableNumber: null,
    station: null,
    reason: '',
    loading: false,
    error: '',
    success: '',
  });

  // Helper: Dynamic Financial Calculation for a single ticket or table
  const calculateTicketTotals = (items = []) => {
    // Filter out cancelled items
    const activeItems = items.filter((item) => item.status !== 'Cancelled');
    
    const subtotal = activeItems.reduce((sum, item) => {
      const price = parseFloat(item.unit_price || item.price || 0);
      const qty = parseInt(item.quantity || 1, 10);
      return sum + price * qty;
    }, 0);

    const serviceCharge = subtotal * 0.10; // 10% Service Charge
    const taxableAmount = subtotal + serviceCharge;
    const vat = taxableAmount * 0.15; // 15% VAT
    const grandTotal = taxableAmount + vat;

    return {
      subtotal,
      serviceCharge,
      vat,
      grandTotal,
      activeItemCount: activeItems.length,
    };
  };

  // Helper: Calculate Table Total across all tickets on a table
  const calculateTableGrandTotal = (orders = []) => {
    return orders.reduce((sum, ord) => {
      if (ord.order_status === 'Cancelled') return sum;
      const { grandTotal } = calculateTicketTotals(ord.items || []);
      return sum + grandTotal;
    }, 0);
  };

  // Fetch live orders
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token || localStorage.getItem('token')}` };
      const ordersRes = await fetch('http://localhost:5000/api/v1/orders/live', { headers });

      if (!ordersRes.ok) {
        throw new Error(`Orders fetch failed (${ordersRes.status})`);
      }

      const ordersJson = await ordersRes.json();
      const extractedTables = ordersJson.data || (Array.isArray(ordersJson) ? ordersJson : []);

      setLiveOrders(extractedTables);

      if (onRefreshNotifications) {
        onRefreshNotifications?.();
      }
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
      await fetch(`http://localhost:5000/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      fetchData();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // API Call: Entire Order Cancellation
  const handleCancelOrder = async (orderId, reason) => {
    const response = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel order ticket.');
    }
    return data;
  };

  // API Call: Individual Line Item Cancellation
  const handleCancelOrderItem = async (orderId, itemId, reason) => {
    const response = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/items/${itemId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel order item.');
    }
    return data;
  };

  const handleRequestBill = async (tableData) => {
    const tableId = tableData.table_id;
    const firstOrderId = tableData.orders && tableData.orders[0] ? tableData.orders[0].order_id : null;

    if (!firstOrderId && !tableId) {
      setError('Unable to resolve active order for this table.');
      return;
    }

    setActionLoading(tableId);
    setError('');

    try {
      const endpoint = `http://localhost:5000/api/v1/orders/${firstOrderId}/request-bill`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ tableId }),
      });

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

  // Open modal for Full Order Cancellation
  const openCancelModal = (orderId, tableNumber) => {
    setCancelModal({
      isOpen: true,
      orderId,
      itemId: null,
      itemName: null,
      tableNumber,
      station: null,
      reason: '',
      loading: false,
      error: '',
      success: '',
    });
  };

  // Open modal for Single Item Cancellation
  const openItemCancelModal = (orderId, item, tableNumber) => {
    setCancelModal({
      isOpen: true,
      orderId,
      itemId: item.id || item.item_id,
      itemName: item.name,
      tableNumber,
      station: item.station || 'Kitchen',
      reason: '',
      loading: false,
      error: '',
      success: '',
    });
  };

  const closeCancelModal = () => {
    setCancelModal({
      isOpen: false,
      orderId: null,
      itemId: null,
      itemName: null,
      tableNumber: null,
      station: null,
      reason: '',
      loading: false,
      error: '',
      success: '',
    });
  };

  // Handles submission for both Order and Item Cancellations
  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    setCancelModal((prev) => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      if (cancelModal.itemId) {
        // Item-level cancellation
        await handleCancelOrderItem(cancelModal.orderId, cancelModal.itemId, cancelModal.reason);
        setCancelModal((prev) => ({
          ...prev,
          loading: false,
          success: `Item "${cancelModal.itemName}" cancelled successfully! Price updated.`,
        }));
      } else {
        // Entire Order cancellation
        await handleCancelOrder(cancelModal.orderId, cancelModal.reason);
        setCancelModal((prev) => ({
          ...prev,
          loading: false,
          success: `Order #${cancelModal.orderId} cancelled successfully! Price updated.`,
        }));
      }

      setTimeout(() => {
        closeCancelModal();
        fetchData();
      }, 1200);
    } catch (err) {
      setCancelModal((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Preparing':
      case 'Cooking':
        return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
      case 'Ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Served':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Awaiting_Bill':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200 font-bold line-through';
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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Live Table Trackers</h3>
            <p className="text-xs text-gray-500">Monitor kitchen/bar processing, cancel tickets or items, and request customer bills</p>
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

              // Dynamic recalculation for entire table
              const computedTableTotal = calculateTableGrandTotal(ordersList);

              return (
                <div
                  key={`${tableData.table_id || 'table'}-${tableData.table_number || index}-${index}`}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between h-[480px] shadow-sm"
                >
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

                  <div className="my-3 space-y-3 overflow-y-auto flex-grow pr-1 custom-scrollbar">
                    {ordersList.map((ord, oIdx) => {
                      const ticketTotals = calculateTicketTotals(ord.items || []);
                      const isTicketCancelled = ord.order_status === 'Cancelled';

                      return (
                        <div key={ord.order_id || oIdx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-gray-700 border-b border-gray-100 pb-1">
                            <span>Ticket #{ord.order_id}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${getStatusBadge(ord.order_status)}`}>
                                {ord.order_status ? ord.order_status.replace('_', ' ') : 'Pending'}
                              </span>
                              {!['Ready', 'Served', 'Paid', 'Cancelled', 'Awaiting_Bill'].includes(ord.order_status) && (
                                <button
                                  onClick={() => openCancelModal(ord.order_id, tableData.table_number)}
                                  title="Cancel Entire Ticket"
                                  className="text-[10px] bg-red-50 text-red-700 border border-red-300 font-bold px-2 py-0.5 rounded hover:bg-red-100 transition"
                                >
                                  ✕ Cancel
                                </button>
                              )}
                            </div>
                          </div>

                          <ul className="space-y-1.5 text-xs">
                            {ord.items &&
                              ord.items.map((item, idx) => {
                                const isItemCancelled = item.status === 'Cancelled';
                                const canCancelItem =
                                  !isItemCancelled &&
                                  !['Ready', 'Served'].includes(item.status) &&
                                  !['Ready', 'Served', 'Paid', 'Cancelled', 'Awaiting_Bill'].includes(
                                    ord.order_status
                                  );
                                return (
                                  <li
                                    key={item.id || item.item_id || idx}
                                    className={`flex justify-between items-center p-2 rounded border ${
                                      isItemCancelled 
                                        ? 'bg-red-50/50 border-red-100 text-gray-400' 
                                        : 'bg-gray-50 border-gray-100 text-gray-800'
                                    }`}
                                  >
                                    <div className="flex flex-col pr-2">
                                      <span className={`font-medium ${isItemCancelled ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {item.quantity}x {item.name}
                                      </span>
                                      {item.note && (
                                        <span className="text-[10px] text-amber-600 italic">
                                          Note: {item.note}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold whitespace-nowrap ${
                                        isItemCancelled 
                                          ? 'bg-red-100 text-red-700 border-red-200' 
                                          : 'bg-white text-gray-600 border-gray-200'
                                      }`}>
                                        {item.station || 'Kitchen'}: {item.status}
                                      </span>

                                      {canCancelItem && (
                                        <button
                                          type="button"
                                          onClick={() => openItemCancelModal(ord.order_id, item, tableData.table_number)}
                                          title={`Cancel item: ${item.name}`}
                                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                          </ul>

                          {/* Ticket Breakdown Footer */}
                          {!isTicketCancelled && (
                            <div className="pt-1.5 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
                              <span>Ticket Total (incl. Tax/Service):</span>
                              <span className="font-bold text-gray-800">
                                {ticketTotals.grandTotal.toFixed(2)} ETB
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Table Total Section */}
                  <div className="pt-2 border-t border-gray-200 flex-shrink-0 space-y-2 bg-gray-50/50">
                    <div className="flex justify-between items-center text-xs text-gray-600 font-semibold px-1">
                      <span>Table Total (Active Items + Tax):</span>
                      <span className="text-gray-900 font-extrabold text-sm">
                        {computedTableTotal.toFixed(2)} ETB
                      </span>
                    </div>

                    {isTableAwaitingBill ? (
                      <div className="w-full text-center py-2 text-xs font-bold text-purple-700 bg-purple-50 rounded-lg border border-purple-200">
                        ⌛ Bill Requested (Cashier Processing)
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestBill(tableData)}
                        disabled={actionLoading === tableData.table_id || computedTableTotal === 0}
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

      {/* Cancellation Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {cancelModal.itemId 
                  ? `Cancel Item: ${cancelModal.itemName} (Table #${cancelModal.tableNumber})`
                  : `Cancel Order Ticket #${cancelModal.orderId} (Table #${cancelModal.tableNumber})`}
              </h3>
              <button onClick={closeCancelModal} className="text-gray-400 hover:text-gray-600 text-lg font-bold">
                ✕
              </button>
            </div>

            {cancelModal.error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-xs border border-red-200">
                {cancelModal.error}
              </div>
            )}

            {cancelModal.success && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-4 text-xs border border-emerald-200 font-semibold">
                {cancelModal.success}
              </div>
            )}

            <form onSubmit={handleSubmitCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Customer changed mind, ordered by mistake, item out of stock..."
                  value={cancelModal.reason}
                  onChange={(e) =>
                    setCancelModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCancelModal}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition"
                >
                  Keep {cancelModal.itemId ? 'Item' : 'Order'}
                </button>
                <button
                  type="submit"
                  disabled={cancelModal.loading}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {cancelModal.loading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatus;