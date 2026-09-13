import React, { useState } from 'react';
import axios from 'axios';

const TicketQueue = ({
  tickets = [],
  currentStation = 'Kitchen',
  token = '',
  onUpdateItemStatus,
  onDismissCancelledTicket,
}) => {
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [dismissedTicketIds, setDismissedTicketIds] = useState([]);

  const getAuthToken = () => {
    return token || localStorage.getItem('token') || '';
  };

  const getTicketStatus = (ticket) => {
    if (ticket.order_status === 'Cancelled') {
      return 'Cancelled';
    }

    const items = ticket.items || [];

    if (items.length === 0) {
      return 'Pending';
    }

    const activeItems = items.filter(
      (item) => item.status !== 'Cancelled'
    );

    if (activeItems.length === 0) {
      return 'Cancelled';
    }

    if (activeItems.every((item) => item.status === 'Ready')) {
      return 'Ready';
    }

    if (
      activeItems.some(
        (item) =>
          item.status === 'Preparing' ||
          item.status === 'Ready'
      )
    ) {
      return 'Preparing';
    }

    return 'Pending';
  };

  const handleNextTicketStatus = async (ticket) => {
    const items = ticket.items || [];

    const activeItems = items.filter(
      (item) => item.status !== 'Cancelled'
    );

    if (activeItems.length === 0) {
      return;
    }

    const currentStatus = getTicketStatus(ticket);

    if (
      currentStatus === 'Ready' ||
      currentStatus === 'Cancelled'
    ) {
      return;
    }

    const nextStatus =
      currentStatus === 'Preparing'
        ? 'Ready'
        : 'Preparing';

    setUpdatingTicketId(ticket.order_id);

    try {
      await Promise.all(
        activeItems.map(async (item) => {
          const itemId =
            item.order_item_id || item.id;

          if (
            nextStatus === 'Preparing' &&
            item.status === 'Pending'
          ) {
            if (onUpdateItemStatus) {
              await onUpdateItemStatus(
                itemId,
                'Preparing'
              );
            }
          }

          if (
            nextStatus === 'Ready' &&
            item.status === 'Preparing'
          ) {
            if (onUpdateItemStatus) {
              await onUpdateItemStatus(
                itemId,
                'Ready'
              );
            }
          }
        })
      );
    } catch (error) {
      console.error(
        'Error updating item statuses:',
        error.response?.data || error.message
      );
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleDismissTicket = async (orderId) => {
    const authToken = getAuthToken();

    if (!authToken) {
      console.error('Authentication token is missing');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5000/api/v1/orders/station/dismiss',
        {
          orderId,
          station: currentStation,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setDismissedTicketIds((prev) => {
        if (prev.includes(orderId)) {
          return prev;
        }

        return [...prev, orderId];
      });

      if (onDismissCancelledTicket) {
        onDismissCancelledTicket(orderId);
      }
    } catch (error) {
      console.error(
        'Failed to dismiss station ticket:',
        error.response?.data || error.message
      );
    }
  };

  const visibleTickets = (tickets || []).filter(
    (ticket) =>
      !dismissedTicketIds.includes(ticket.order_id)
  );

  if (visibleTickets.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
        <div className="text-4xl mb-2">🍳</div>

        <h3 className="text-lg font-bold text-gray-800">
          Display Queue Clear
        </h3>

        <p className="text-xs text-gray-500">
          No active preparation tickets in the queue right now.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visibleTickets.map((ticket, index) => {
        const items = ticket.items || [];

        if (items.length === 0) {
          return null;
        }

        const ticketStatus = getTicketStatus(ticket);

        const isCancelled =
          ticketStatus === 'Cancelled';

        const isReady =
          ticketStatus === 'Ready';

        const isPreparing =
          ticketStatus === 'Preparing';

        const isUpdating =
          updatingTicketId === ticket.order_id;

        return (
          <div
            key={`${ticket.order_id}-${index}`}
            className={`border rounded-xl p-4 flex flex-col justify-between shadow-sm transition-all ${
              isCancelled
                ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                : isReady
                ? 'bg-emerald-50 border-emerald-300'
                : isPreparing
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <div>
                  <span className="font-black text-gray-900 text-lg block">
                    Table #{ticket.table_number || 'N/A'}
                  </span>

                  <span className="text-[10px] text-gray-500 font-semibold uppercase">
                    Order #{ticket.order_id} •{' '}
                    {ticket.created_at
                      ? new Date(
                          ticket.created_at
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>

                <span
                  className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-full ${
                    isCancelled
                      ? 'bg-red-200 text-red-900 animate-pulse'
                      : isReady
                      ? 'bg-emerald-200 text-emerald-800'
                      : isPreparing
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isCancelled
                    ? 'Order Cancelled'
                    : ticketStatus}
                </span>
              </div>

              <div className="my-4 space-y-2 overflow-y-auto max-h-64 pr-1">
                {items.map((item) => {
                  const isItemCancelled =
                    item.status === 'Cancelled' ||
                    ticket.order_status === 'Cancelled';

                  const itemId =
                    item.order_item_id || item.id;

                  return (
                    <div
                      key={itemId}
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                        isItemCancelled
                          ? 'bg-red-100/60 border-red-200 text-red-900'
                          : item.status === 'Ready'
                          ? 'bg-emerald-50 border-emerald-200 text-gray-800'
                          : item.status === 'Preparing'
                          ? 'bg-blue-50 border-blue-200 text-gray-800'
                          : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-sm font-bold block ${
                            isItemCancelled
                              ? 'line-through text-red-700 opacity-75'
                              : 'text-gray-800'
                          }`}
                        >
                          {item.quantity}x{' '}
                          {item.name ||
                            item.item_name}
                        </span>

                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            isItemCancelled
                              ? 'bg-red-200 text-red-800'
                              : item.status === 'Ready'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Preparing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {isItemCancelled
                            ? 'Cancelled'
                            : item.status}
                        </span>
                      </div>

                      {isItemCancelled ? (
                        <span className="text-[11px] text-red-600 font-semibold italic">
                          🚫 Cancelled:{' '}
                          {item.cancellation_reason ||
                            'Removed by staff'}
                        </span>
                      ) : (
                        item.note && (
                          <span className="text-[11px] text-amber-600 italic font-medium">
                            Note: {item.note}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isCancelled || isReady ? (
              <button
                type="button"
                onClick={() =>
                  handleDismissTicket(
                    ticket.order_id
                  )
                }
                disabled={isUpdating}
                className={`w-full py-2.5 text-xs font-extrabold rounded-lg text-white shadow-sm transition-all disabled:opacity-60 ${
                  isCancelled
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                🗑️ Clear Order
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleNextTicketStatus(ticket)
                }
                disabled={isUpdating}
                className={`w-full py-2.5 text-xs font-extrabold rounded-lg text-white transition disabled:opacity-75 ${
                  isPreparing
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {isUpdating
                  ? 'Updating...'
                  : isPreparing
                  ? '🔔 Mark Ready'
                  : '👨‍🍳 Start Preparing'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TicketQueue;