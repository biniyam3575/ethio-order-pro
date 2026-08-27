import React from 'react';

const TicketQueue = ({ orders, onUpdateStatus }) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-lg border text-gray-500">
        ☕ No pending orders right now. Kitchen is clear!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {orders.map((order) => (
        <div
          key={order.order_id}
          className={`border-2 rounded-lg bg-white shadow-md flex flex-col justify-between overflow-hidden ${
            order.status === 'Pending'
              ? 'border-red-500'
              : order.status === 'Preparing'
              ? 'border-amber-500'
              : 'border-green-500'
          }`}
        >
          {/* Ticket Header */}
          <div
            className={`p-3 text-white flex justify-between items-center ${
              order.status === 'Pending'
                ? 'bg-red-600'
                : order.status === 'Preparing'
                ? 'bg-amber-600'
                : 'bg-green-600'
            }`}
          >
            <div>
              <span className="font-bold text-lg">Table #{order.table_number}</span>
              <span className="text-xs block opacity-90">Order #{order.order_id}</span>
            </div>
            <span className="text-xs uppercase font-extrabold px-2 py-1 bg-black bg-opacity-30 rounded">
              {order.status}
            </span>
          </div>

          {/* Items List */}
          <div className="p-4 flex-1 divide-y divide-gray-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-2 flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-800">
                    <span className="text-amber-600 text-lg mr-2">{item.quantity}x</span>
                    {item.name}
                  </p>
                  {item.note && (
                    <p className="text-xs text-red-500 italic mt-0.5">Note: {item.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status Action Button */}
          <div className="p-3 bg-gray-50 border-t">
            {order.status === 'Pending' && (
              <button
                onClick={() => onUpdateStatus(order.order_id, 'Preparing')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-2 rounded transition"
              >
                Start Preparing ⏱️
              </button>
            )}
            {order.status === 'Preparing' && (
              <button
                onClick={() => onUpdateStatus(order.order_id, 'Ready')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition"
              >
                Mark Ready for Pickup 🔔
              </button>
            )}
            {order.status === 'Ready' && (
              <div className="text-center text-xs font-bold text-green-700 py-1">
                Waiting for waiter pickup...
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketQueue;