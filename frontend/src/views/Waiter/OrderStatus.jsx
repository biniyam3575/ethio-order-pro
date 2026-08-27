import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const OrderStatus = ({ language }) => {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/v1/orders/live', {
      headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
    })
      .then((res) => res.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, [token]);

  return (
    <div className="bg-white p-4 border rounded">
      <h2 className="text-sm font-bold text-gray-700 mb-3">
        {language === 'am' ? 'የትዕዛዝ ሁኔታ' : 'Live Order Tracker'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {orders.map((ord) => (
          <div key={ord.order_id} className="border p-3 rounded bg-gray-50 text-xs space-y-2">
            <div className="flex justify-between font-bold border-b pb-1">
              <span>Order #{ord.order_id} (T-{ord.table_number})</span>
              <span className={`px-2 py-0.5 rounded ${
                ord.status === 'Ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {ord.status}
              </span>
            </div>
            <div className="text-gray-500">Items: {ord.item_count || 'Detailed view'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderStatus;