import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import PaymentCheckout from './PaymentCheckout';
import ReceiptPreview from './ReceiptPreview';

const AwaitingBilling = () => {
  const { token } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [showReceipt, setShowReceipt] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  /*
  |--------------------------------------------------------------------------
  | FETCH AWAITING BILL ORDERS
  |--------------------------------------------------------------------------
  */

  const fetchOrders = useCallback(
    async (showLoading = false) => {
      const activeToken =
        token || localStorage.getItem('token');

      if (!activeToken) {
        setLoading(false);
        setError('Your session has expired. Please login again.');
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError('');

        const res = await fetch(
          'http://localhost:5000/api/v1/orders/awaiting-bill',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${activeToken}`,
              Accept: 'application/json',
            },
          }
        );

        if (res.status === 401) {
          setError(
            'Your session has expired. Please login again.'
          );
          return;
        }

        if (res.status === 403) {
          setError(
            'You do not have permission to access the cashier billing queue.'
          );
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              'Failed to load awaiting bill orders.'
          );
        }

        const newOrders = Array.isArray(data) ? data : [];

        setOrders(newOrders);

        /*
         * Keep the selected order synchronized with
         * the refreshed server data.
         */
        setSelectedOrder((currentSelected) => {
          if (!currentSelected) {
            return null;
          }

          const updatedSelected = newOrders.find(
            (order) =>
              Number(order.order_id) ===
              Number(currentSelected.order_id)
          );

          /*
           * If the order was paid by another cashier,
           * it will disappear from Awaiting_Bill.
           */
          return updatedSelected || null;
        });
      } catch (err) {
        console.error(
          'Error fetching awaiting bill orders:',
          err
        );

        setError(
          err.message ||
            'Unable to load billing queue.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD + AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchOrders(true);

    const interval = setInterval(() => {
      fetchOrders(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  /*
  |--------------------------------------------------------------------------
  | SELECT ORDER
  |--------------------------------------------------------------------------
  */

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setShowReceipt(false);
    setError('');
  };

  /*
  |--------------------------------------------------------------------------
  | PAYMENT SUCCESS
  |--------------------------------------------------------------------------
  */

  const handlePaymentSuccess = async () => {
    setSelectedOrder(null);
    setShowReceipt(false);

    await fetchOrders(false);
  };

  /*
  |--------------------------------------------------------------------------
  | MANUAL REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh = () => {
    fetchOrders(false);
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-white border rounded-xl shadow-sm p-10 text-center">
          <div className="text-3xl mb-3">💳</div>

          <p className="font-bold text-gray-700">
            Loading billing queue...
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Please wait while we load orders awaiting payment.
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-full">
      {/* PAGE HEADER */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
            Cashier Billing
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Process customer bill requests and complete payments.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
            refreshing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
          }`}
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          <div className="flex items-start gap-2">
            <span>⚠️</span>

            <div className="flex-1">
              <p className="font-bold">
                Billing queue error
              </p>

              <p className="text-xs mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchOrders(true)}
              className="text-xs font-bold underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================================================================
            BILLING QUEUE
        ================================================================= */}

        <div className="lg:col-span-4">
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            {/* QUEUE HEADER */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-extrabold text-gray-800">
                    Awaiting Checkout
                  </h2>

                  <p className="text-xs text-gray-500 mt-1">
                    Orders waiting for payment
                  </p>
                </div>

                <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-full bg-blue-100 text-blue-700 text-sm font-extrabold">
                  {orders.length}
                </span>
              </div>
            </div>

            {/* QUEUE */}
            <div className="p-3 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
              {orders.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="text-4xl mb-3">
                    ✓
                  </div>

                  <p className="font-bold text-gray-600">
                    No pending bills
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    The billing queue is clear.
                  </p>
                </div>
              ) : (
                orders.map((ord) => {
                  const isSelected =
                    selectedOrder?.order_id ===
                    ord.order_id;

                  const total =
                    parseFloat(
                      ord.total_amount
                    ) || 0;

                  return (
                    <button
                      key={ord.order_id}
                      type="button"
                      onClick={() =>
                        handleSelectOrder(ord)
                      }
                      className={`w-full text-left p-4 border rounded-xl transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className="font-extrabold text-gray-800">
                            Table {ord.table_number}
                          </p>

                          <p className="text-xs text-gray-500 mt-1">
                            Order #{ord.order_id}
                          </p>
                        </div>

                        <span className="text-sm font-extrabold text-blue-600 whitespace-nowrap">
                          ETB {total.toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Waiter
                        </span>

                        <span className="text-xs font-bold text-gray-700">
                          {ord.waiter_name || 'Unknown'}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Items
                        </span>

                        <span className="text-xs font-bold text-gray-700">
                          {Array.isArray(ord.items)
                            ? ord.items.reduce(
                                (sum, item) =>
                                  sum +
                                  (parseFloat(
                                    item.quantity
                                  ) || 0),
                                0
                              )
                            : 0}
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="inline-flex px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase">
                          Awaiting Bill
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ================================================================
            WORKSPACE
        ================================================================= */}

        <div className="lg:col-span-8">
          <div className="bg-white border rounded-xl shadow-sm min-h-[500px]">
            {selectedOrder ? (
              showReceipt ? (
                <ReceiptPreview
                  order={selectedOrder}
                  onBack={() =>
                    setShowReceipt(false)
                  }
                />
              ) : (
                <PaymentCheckout
                  order={selectedOrder}
                  onSuccess={
                    handlePaymentSuccess
                  }
                  onPrintPreview={() =>
                    setShowReceipt(true)
                  }
                />
              )
            ) : (
              <div className="min-h-[500px] flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <div className="text-5xl mb-4">
                    💳
                  </div>

                  <h2 className="font-extrabold text-gray-700 text-lg">
                    Select an order
                  </h2>

                  <p className="text-sm text-gray-400 mt-2">
                    Select a bill request from the
                    queue to view the order and
                    process payment.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwaitingBilling;