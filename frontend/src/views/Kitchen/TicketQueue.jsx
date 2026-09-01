import React, { useState } from 'react';

const TicketQueue = ({ tickets, onUpdateItemStatus }) => {
  const [updatingItemId, setUpdatingItemId] = useState(null);

  const handleNextStatus = async (item) => {
    let nextStatus = 'Preparing';
    if (item.status === 'Preparing') nextStatus = 'Ready';
    if (item.status === 'Ready') nextStatus = 'Served';

    setUpdatingItemId(item.order_item_id);
    await onUpdateItemStatus(item.order_item_id, nextStatus);
    setUpdatingItemId(null);
  };

  if (!tickets || tickets.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
        <div className="text-4xl mb-2">🍳</div>
        <h3 className="text-lg font-bold text-gray-800">Kitchen Display Clear</h3>
        <p className="text-xs text-gray-500">No active food orders in the kitchen queue right now.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tickets.map((ticket, index) => {
        const items = ticket.items || [];
        if (items.length === 0) return null;

        return (
          <div
            key={`${ticket.order_id}-${index}`}
            className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm"
          >
            {/* Ticket Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <div>
                <span className="font-black text-gray-900 text-lg block">
                  Table #{ticket.table_number || 'N/A'}
                </span>
                <span className="text-[10px] text-gray-500 font-semibold uppercase">
                  Order #{ticket.order_id} • {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>

            {/* Individual Station Items */}
            <div className="my-4 space-y-3 overflow-y-auto max-h-64 pr-1">
              {items.map((item) => {
                const isReady = item.status === 'Ready';
                const isPreparing = item.status === 'Preparing';

                return (
                  <div
                    key={item.order_item_id}
                    className={`p-3 rounded-lg border flex flex-col justify-between gap-2 transition ${
                      isReady
                        ? 'bg-emerald-50 border-emerald-200'
                        : isPreparing
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-bold text-gray-800 block">
                          {item.quantity}x {item.name}
                        </span>
                        {item.note && (
                          <span className="text-[11px] text-amber-600 italic font-medium">
                            Note: {item.note}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          isReady
                            ? 'bg-emerald-200 text-emerald-800'
                            : isPreparing
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <button
                      onClick={() => handleNextStatus(item)}
                      disabled={updatingItemId === item.order_item_id}
                      className={`w-full py-1.5 text-[11px] font-extrabold rounded transition disabled:opacity-50 ${
                        isReady
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : isPreparing
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      {updatingItemId === item.order_item_id
                        ? 'Updating...'
                        : isReady
                        ? '✓ Ready'
                        : isPreparing
                        ? '🔔 Mark as Ready'
                        : '👨‍🍳 Start Cooking'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketQueue;