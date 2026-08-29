import React, { useEffect, useState } from 'react';

export default function AwaitingBilling({ onSelectOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/orders/awaiting-bill', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (err) {
      console.error('Failed to fetch awaiting bill orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Loading pending bills...</div>;

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.length === 0 ? (
        <p className="text-gray-500 col-span-full">No orders currently awaiting checkout.</p>
      ) : (
        orders.map((order) => (
          <div key={order.order_id} className="border p-4 rounded-lg shadow bg-white flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">Table #{order.table_number}</h3>
                <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 font-semibold">
                  Bill Requested
                </span>
              </div>
              <p className="text-sm text-gray-600">Waiter: {order.waiter_name}</p>
              <p className="text-xs text-gray-400 mt-1">
                Items Count: {order.items ? order.items.length : 0}
              </p>
              <div className="text-xl font-extrabold text-gray-900 my-3">
                ETB {parseFloat(order.total_amount).toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => onSelectOrder(order)}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition-colors"
            >
              Process Payment
            </button>
          </div>
        ))
      )}
    </div>
  );
}