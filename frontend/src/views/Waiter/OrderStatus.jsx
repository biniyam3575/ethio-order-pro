import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icon = ({ name, size = 15 }) => {
  const common = {
    width: size,
    height: size,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const paths = {
    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
      </>
    ),
    table: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 17v3M17 17v3M7 7V4M17 7V4" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 7V4h6v3" />
      </>
    ),

    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),

    check: (
      <>
        <path d="M5 12l4 4L19 6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
};

const OrderStatus = ({
  notifications = [],
  onRefreshNotifications,
}) => {
  const { token } = useContext(AuthContext);

  const [liveOrders, setLiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

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

  const authHeaders = {
    Authorization: `Bearer ${token || localStorage.getItem('token')}`,
  };

  /* ---------------------------------------------------------
     FINANCIAL CALCULATIONS
  --------------------------------------------------------- */

  const calculateTicketTotals = (items = []) => {
    const activeItems = items.filter(
      (item) => item.status !== 'Cancelled'
    );

    const subtotal = activeItems.reduce((sum, item) => {
      const price = parseFloat(
        item.unit_price || item.price || 0
      );

      const qty = parseInt(item.quantity || 1, 10);

      return sum + price * qty;
    }, 0);

    const serviceCharge = subtotal * 0.10;
    const taxableAmount = subtotal + serviceCharge;
    const vat = taxableAmount * 0.15;
    const grandTotal = taxableAmount + vat;

    return {
      subtotal,
      serviceCharge,
      vat,
      grandTotal,
      activeItemCount: activeItems.length,
    };
  };

  const calculateTableGrandTotal = (orders = []) => {
    return orders.reduce((sum, order) => {
      if (order.order_status === 'Cancelled') {
        return sum;
      }

      const { grandTotal } = calculateTicketTotals(
        order.items || []
      );

      return sum + grandTotal;
    }, 0);
  };

  /* ---------------------------------------------------------
     STATUS BADGE
  --------------------------------------------------------- */

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'Preparing':
      case 'Cooking':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'Ready':
        return 'bg-green-50 text-green-700 border-green-200';

      case 'Served':
        return 'bg-gray-50 text-gray-600 border-gray-200';

      case 'Awaiting_Bill':
        return 'bg-gray-900 text-white border-gray-900';

      case 'Cancelled':
        return 'bg-red-50 text-red-600 border-red-200';

      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  /* ---------------------------------------------------------
     FETCH LIVE ORDERS
  --------------------------------------------------------- */

  const fetchData = async () => {
    try {
      setError('');

      const response = await fetch(
        'http://localhost:5000/api/v1/orders/live',
        {
          headers: authHeaders,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Orders fetch failed (${response.status})`
        );
      }

      const json = await response.json();

      const extractedTables =
        json.data ||
        (Array.isArray(json) ? json : []);

      setLiveOrders(extractedTables);

      if (onRefreshNotifications) {
        onRefreshNotifications();
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

  /* ---------------------------------------------------------
     NOTIFICATION ACKNOWLEDGE
     Notification state remains in WaiterWorkspace.
  --------------------------------------------------------- */

  const handleAcknowledgeNotification = async (
    notificationId
  ) => {
    try {
      await fetch(
        `http://localhost:5000/api/v1/orders/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: authHeaders,
        }
      );

      await fetchData();
    } catch (err) {
      console.error(
        'Failed to dismiss notification:',
        err
      );
    }
  };

  /* ---------------------------------------------------------
     CANCEL WHOLE ORDER
  --------------------------------------------------------- */

  const handleCancelOrder = async (orderId, reason) => {
    const response = await fetch(
      `http://localhost:5000/api/v1/orders/${orderId}/cancel`,
      {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to cancel order ticket.'
      );
    }

    return data;
  };

  /* ---------------------------------------------------------
     CANCEL INDIVIDUAL ITEM
  --------------------------------------------------------- */

  const handleCancelOrderItem = async (
    orderId,
    itemId,
    reason
  ) => {
    const response = await fetch(
      `http://localhost:5000/api/v1/orders/${orderId}/items/${itemId}/cancel`,
      {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Failed to cancel order item.'
      );
    }

    return data;
  };

  /* ---------------------------------------------------------
     REQUEST BILL
  --------------------------------------------------------- */

  const handleRequestBill = async (tableData) => {
    const tableId = tableData.table_id;

    const firstOrderId =
      tableData.orders &&
      tableData.orders[0]
        ? tableData.orders[0].order_id
        : null;

    if (!firstOrderId && !tableId) {
      setError(
        'Unable to resolve active order for this table.'
      );
      return;
    }

    setActionLoading(tableId);
    setError('');

    try {
      const endpoint = `http://localhost:5000/api/v1/orders/${firstOrderId}/request-bill`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableId }),
      });

      const contentType =
        response.headers.get('content-type');

      if (
        !contentType ||
        !contentType.includes('application/json')
      ) {
        const errorText = await response.text();

        console.error(
          'Non-JSON Response:',
          errorText
        );

        throw new Error(
          `Server returned HTML error (${response.status}). Check backend logs.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to request bill.'
        );
      }

      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------------------------------------------------------
     CANCEL MODAL
  --------------------------------------------------------- */

  const openCancelModal = (
    orderId,
    tableNumber
  ) => {
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

  const openItemCancelModal = (
    orderId,
    item,
    tableNumber
  ) => {
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

  const handleSubmitCancel = async (e) => {
    e.preventDefault();

    setCancelModal((prev) => ({
      ...prev,
      loading: true,
      error: '',
      success: '',
    }));

    try {
      if (cancelModal.itemId) {
        await handleCancelOrderItem(
          cancelModal.orderId,
          cancelModal.itemId,
          cancelModal.reason
        );

        setCancelModal((prev) => ({
          ...prev,
          loading: false,
          success: `Item "${cancelModal.itemName}" cancelled successfully.`,
        }));
      } else {
        await handleCancelOrder(
          cancelModal.orderId,
          cancelModal.reason
        );

        setCancelModal((prev) => ({
          ...prev,
          loading: false,
          success: `Order #${cancelModal.orderId} cancelled successfully.`,
        }));
      }

      setTimeout(() => {
        closeCancelModal();
        fetchData();
      }, 1000);
    } catch (err) {
      setCancelModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  };

  /* ---------------------------------------------------------
     LOADING
  --------------------------------------------------------- */

  if (loading) {
    return (
      <div className="border border-gray-200 bg-white rounded-lg h-32 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          Loading live orders...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      <section className="border border-gray-200 bg-white rounded-lg">

        <div className="px-3 py-3 sm:px-4">

          <div className="flex items-center justify-between gap-3">

            {/* Title + summary */}
            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <Icon name="table" size={15} />
                </div>

                <h2 className="text-sm font-semibold text-gray-900">
                  Live Orders
                </h2>

              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-9">

                <span className="text-[10px] text-gray-500">
                  <strong className="text-gray-800">
                    {liveOrders.length}
                  </strong>{' '}
                  Active Tables
                </span>

                <span className="text-[10px] text-gray-500">
                  <strong className="text-gray-800">
                    {liveOrders.reduce(
                      (total, table) =>
                        total +
                        (table.orders?.length || 0),
                      0
                    )}
                  </strong>{' '}
                  Orders
                </span>

              </div>

            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchData}
              title="Refresh orders"
              className="
                shrink-0
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-md
                border
                border-gray-200
                bg-white
                text-gray-500
                hover:bg-gray-50
                hover:text-gray-900
                cursor-pointer
                transition
              "
            >
              <Icon name="refresh" size={15} />
            </button>

          </div>

        </div>

      </section>

      {/* Error */}
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-md text-[11px]">
          {error}
        </div>
      )}

      {/* Empty state */}
      {liveOrders.length === 0 ? (
        <div className="border border-gray-200 bg-white rounded-lg py-12 text-center">
          <div className="text-xs font-medium text-gray-500">
            No active orders currently assigned to you.
          </div>
        </div>
      ) : (
        /*
          IMPORTANT:
          1 column mobile
          2 columns tablet
          3 columns large
          4 columns very large
        */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">

          {liveOrders.map((tableData, index) => {
            const ordersList = tableData.orders || [];

            const isTableAwaitingBill =
              tableData.table_status === 'Awaiting_Bill';
            const canRequestBill =
              ordersList.length > 0 &&
              ordersList.every((order) =>
                ['Ready', 'Served'].includes(order.order_status)
              );
            const computedTableTotal =
              calculateTableGrandTotal(ordersList);

            return (
              <div
                key={`${tableData.table_id || 'table'}-${
                  tableData.table_number || index
                }-${index}`}
                className="h-[390px] bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden"
              >

                {/* TABLE HEADER */}
                <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between shrink-0">

                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900">
                      Table #{tableData.table_number}
                    </div>

                    {tableData.section && (
                      <div className="text-[9px] text-gray-400 uppercase tracking-wide">
                        {tableData.section}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ${getStatusBadge(
                      tableData.table_status
                    )}`}
                  >
                    {tableData.table_status
                      ? tableData.table_status.replace(
                          '_',
                          ' '
                        )
                      : 'Active'}
                  </span>
                </div>

                {/* SCROLLABLE ORDER AREA */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-2">

                  {ordersList.map((order, orderIndex) => {
                    const ticketTotals =
                      calculateTicketTotals(
                        order.items || []
                      );

                    const isTicketCancelled =
                      order.order_status ===
                      'Cancelled';

                    return (
                      <div
                        key={
                          order.order_id ||
                          orderIndex
                        }
                        className="border border-gray-200 rounded-md bg-gray-50"
                      >

                        {/* Ticket header */}
                        <div className="px-2.5 py-1.5 border-b border-gray-200 flex items-center justify-between gap-2">

                          <span className="text-[10px] font-bold text-gray-700">
                            #{order.order_id}
                          </span>

                          <div className="flex items-center gap-1">

                            <span
                              className={`text-[8px] uppercase font-semibold px-1.5 py-0.5 rounded border ${getStatusBadge(
                                order.order_status
                              )}`}
                            >
                              {order.order_status
                                ? order.order_status.replace(
                                    '_',
                                    ' '
                                  )
                                : 'Pending'}
                            </span>

                            {![
                            'Ready',
                            'Served',
                            'Paid',
                            'Cancelled',
                            'Awaiting_Bill',
                          ].includes(order.order_status) &&
                            !(order.items || []).some(
                              (item) =>
                                item.status === 'Ready' ||
                                item.status === 'Served'
                            ) && (
                              <button
                                type="button"
                                onClick={() =>
                                  openCancelModal(
                                    order.order_id,
                                    tableData.table_number
                                  )
                                }
                                title="Cancel ticket"
                                className="w-5 h-5 flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer"
                              >
                                <Icon
                                  name="close"
                                  size={12}
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="p-2 space-y-1">

                          {order.items &&
                            order.items.map(
                              (item, itemIndex) => {
                                const isItemCancelled =
                                  item.status ===
                                  'Cancelled';

                                const canCancelItem =
                                  !isItemCancelled &&
                                  ![
                                    'Ready',
                                    'Served',
                                  ].includes(
                                    item.status
                                  ) &&
                                  ![
                                    'Ready',
                                    'Served',
                                    'Paid',
                                    'Cancelled',
                                    'Awaiting_Bill',
                                  ].includes(
                                    order.order_status
                                  );

                                return (
                                  <div
                                    key={
                                      item.id ||
                                      item.item_id ||
                                      itemIndex
                                    }
                                    className={`px-2 py-1.5 rounded border flex items-center justify-between gap-2 ${
                                      isItemCancelled
                                        ? 'bg-red-50 border-red-100'
                                        : 'bg-white border-gray-100'
                                    }`}
                                  >

                                    <div className="min-w-0 flex-1">

                                      <div
                                        className={`text-[10px] font-medium truncate ${
                                          isItemCancelled
                                            ? 'line-through text-gray-400'
                                            : 'text-gray-800'
                                        }`}
                                      >
                                        {item.quantity}x{' '}
                                        {item.name}
                                      </div>

                                      {item.note && (
                                        <div className="text-[9px] text-amber-600 truncate">
                                          {item.note}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">

                                      <span
                                        className={`text-[8px] px-1 py-0.5 rounded border whitespace-nowrap ${
                                          isItemCancelled
                                            ? 'bg-red-50 text-red-600 border-red-100'
                                            : 'bg-gray-50 text-gray-500 border-gray-200'
                                        }`}
                                      >
                                        {item.station ||
                                          'Kitchen'}{' '}
                                        ·{' '}
                                        {item.status}
                                      </span>

                                      {canCancelItem && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openItemCancelModal(
                                              order.order_id,
                                              item,
                                              tableData.table_number
                                            )
                                          }
                                          title="Cancel item"
                                          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                        >
                                          <Icon
                                            name="trash"
                                            size={11}
                                          />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                        </div>

                        {/* Ticket total */}
                        {!isTicketCancelled && (
                          <div className="px-2.5 py-1.5 border-t border-gray-200 flex justify-between text-[9px]">
                            <span className="text-gray-400">
                              Ticket total
                            </span>

                            <span className="font-semibold text-gray-700">
                              {ticketTotals.grandTotal.toFixed(
                                2
                              )}{' '}
                              ETB
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* TABLE FOOTER */}
                <div className="border-t border-gray-200 px-3 py-2 shrink-0 bg-white">

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-gray-500">
                      Table total
                    </span>

                    <span className="text-xs font-bold text-gray-900">
                      {computedTableTotal.toFixed(2)} ETB
                    </span>
                  </div>

                  {isTableAwaitingBill ? (
                    <div className="w-full text-center py-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-[10px] font-semibold rounded-md">
                      Bill requested
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleRequestBill(tableData)
                      }
                      disabled={
                        actionLoading === tableData.table_id ||
                        computedTableTotal === 0 ||
                        !canRequestBill
                      }
                      className="w-full h-8 bg-black text-white text-[10px] font-semibold rounded-md hover:bg-gray-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
                    >
                      <Icon
                        name="receipt"
                        size={13}
                      />

                      {actionLoading ===
                      tableData.table_id
                        ? 'Requesting...'
                        : 'Request Bill'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------
          CANCELLATION MODAL
      --------------------------------------------------- */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">

          <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg">

            {/* Modal header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">

              <div className="min-w-0 pr-3">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {cancelModal.itemId
                    ? `Cancel ${cancelModal.itemName}`
                    : `Cancel Order #${cancelModal.orderId}`}
                </h3>

                <p className="text-[10px] text-gray-500 mt-0.5">
                  Table #{cancelModal.tableNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCancelModal}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                title="Close"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            {/* Modal body */}
            <form
              onSubmit={handleSubmitCancel}
              className="p-4"
            >

              {cancelModal.error && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-[10px]">
                  {cancelModal.error}
                </div>
              )}

              {cancelModal.success && (
                <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-md text-[10px]">
                  {cancelModal.success}
                </div>
              )}

              <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                Reason for cancellation
              </label>

              <textarea
                rows="3"
                required
                placeholder="Enter cancellation reason..."
                value={cancelModal.reason}
                onChange={(e) =>
                  setCancelModal((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-xs text-gray-800 outline-none focus:border-gray-400 resize-none"
              />

              <div className="flex gap-2 mt-3">

                <button
                  type="button"
                  onClick={closeCancelModal}
                  className="flex-1 h-8 border border-gray-200 bg-white text-gray-700 text-[10px] font-semibold rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Keep
                </button>

                <button
                  type="submit"
                  disabled={cancelModal.loading}
                  className="flex-1 h-8 bg-red-600 text-white text-[10px] font-semibold rounded-md hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelModal.loading
                    ? 'Cancelling...'
                    : 'Confirm Cancellation'}
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