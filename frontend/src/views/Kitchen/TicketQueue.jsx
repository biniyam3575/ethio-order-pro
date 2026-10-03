import React, { useState } from 'react';
import axios from 'axios';

const Icon = ({ name, size = 18 }) => {
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
    check: (
      <>
        <path d="M5 12l4 4L19 6" />
      </>
    ),

    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </>
    ),

    play: (
      <>
        <path d="M8 5v14l11-7L8 5z" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),

    utensils: (
      <>
        <path d="M7 3v7" />
        <path d="M4 3v4a3 3 0 0 0 6 0V3" />
        <path d="M7 10v11" />
        <path d="M16 3v18" />
        <path d="M16 3c3 2 4 5 4 8h-4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
};

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

    if (activeItems.every((item) => item.status === 'Served')) {
      return 'Served';
    }

    if (
      activeItems.every(
        (item) =>
          item.status === 'Ready' ||
          item.status === 'Served'
      )
    ) {
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
      currentStatus === 'Served' ||
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

  // ------------------------------------------------------------
  // EMPTY STATE
  // ------------------------------------------------------------

  if (visibleTickets.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-10 text-center">
        <div className="mx-auto w-11 h-11 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 mb-3">
          <Icon name="utensils" size={20} />
        </div>

        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
          Display Queue Clear
        </h3>

        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          No active preparation tickets in the queue right now.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // TICKET QUEUE
  // ------------------------------------------------------------

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            className={`
              bg-white
              border
              rounded-xl
              overflow-hidden
              flex
              flex-col
              transition
              ${
                isCancelled
                  ? 'border-red-300'
                  : isReady
                  ? 'border-emerald-300'
                  : isPreparing
                  ? 'border-blue-200'
                  : 'border-gray-200'
              }
            `}
          >
            {/* ====================================================
                TICKET HEADER
            ==================================================== */}

            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-base font-bold text-gray-900">
                    Table #{ticket.table_number || 'N/A'}
                  </span>

                  <span className="block mt-1 text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                    Order #{ticket.order_id}
                    {ticket.created_at
                      ? ` • ${new Date(
                          ticket.created_at
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ''}
                  </span>
                </div>

                <span
                  className={`
                    shrink-0
                    px-2.5
                    py-1
                    rounded-full
                    text-[9px]
                    uppercase
                    font-bold
                    border
                    ${
                      isCancelled
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : isReady
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isPreparing
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }
                  `}
                >
                  {isCancelled
                    ? 'Cancelled'
                    : ticketStatus}
                </span>
              </div>
            </div>

            {/* ====================================================
                ITEMS
            ==================================================== */}

            <div className="p-4">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isItemCancelled =
                    item.status === 'Cancelled' ||
                    ticket.order_status === 'Cancelled';

                  const itemId =
                    item.order_item_id || item.id;

                  return (
                    <div
                      key={itemId}
                      className={`
                        p-3
                        rounded-lg
                        border
                        ${
                          isItemCancelled
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`
                            text-xs sm:text-sm
                            font-semibold
                            leading-5
                            ${
                              isItemCancelled
                                ? 'line-through text-red-700'
                                : 'text-gray-800'
                            }
                          `}
                        >
                          {item.quantity}x{' '}
                          {item.name || item.item_name}
                        </span>

                        <span
                          className={`
                            shrink-0
                            px-1.5
                            py-0.5
                            rounded
                            text-[9px]
                            uppercase
                            font-bold
                            ${
                              isItemCancelled
                                ? 'bg-red-100 text-red-700'
                                : item.status === 'Ready'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.status === 'Preparing'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-white text-gray-500 border border-gray-200'
                            }
                          `}
                        >
                          {isItemCancelled
                            ? 'Cancelled'
                            : item.status}
                        </span>
                      </div>

                      {isItemCancelled ? (
                        <p className="mt-1.5 text-[11px] text-red-600 font-medium">
                          Cancelled:{' '}
                          {item.cancellation_reason ||
                            'Removed by staff'}
                        </p>
                      ) : (
                        item.note && (
                          <p className="mt-1.5 text-[11px] text-gray-500 italic">
                            Note: {item.note}
                          </p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ====================================================
    ACTION
==================================================== */}

<div className="mt-auto p-4 pt-0">
  {isCancelled ? (
    <button
      type="button"
      onClick={() =>
        handleDismissTicket(ticket.order_id)
      }
      disabled={isUpdating}
      className="
        w-full
        min-h-[44px]
        px-4
        py-2.5
        inline-flex
        items-center
        justify-center
        gap-2
        bg-red-50
        text-red-600
        border
        border-red-200
        text-xs
        font-semibold
        rounded-lg
        hover:bg-red-100
        disabled:opacity-50
        disabled:cursor-not-allowed
        cursor-pointer
        transition
      "
    >
      <Icon name="check" size={15} />
      Clear Cancelled Order
    </button>
  ) : ticketStatus === 'Ready' ? (
    <button
      type="button"
      onClick={() =>
        handleDismissTicket(ticket.order_id)
      }
      disabled={isUpdating}
      className="
        w-full
        min-h-[44px]
        px-4
        py-2.5
        inline-flex
        items-center
        justify-center
        gap-2
        bg-green-50
        text-green-700
        border
        border-green-200
        text-xs
        font-semibold
        rounded-lg
        hover:bg-green-100
        disabled:opacity-50
        disabled:cursor-not-allowed
        cursor-pointer
        transition
      "
    >
      <Icon name="check" size={15} />
      Clear Order
    </button>
  ) : ticketStatus === 'Served' ? (
    <button
      type="button"
      onClick={() =>
        handleDismissTicket(ticket.order_id)
      }
      disabled={isUpdating}
      className="
        w-full
        min-h-[44px]
        px-4
        py-2.5
        inline-flex
        items-center
        justify-center
        gap-2
        bg-gray-50
        text-gray-600
        border
        border-gray-200
        text-xs
        font-semibold
        rounded-lg
        hover:bg-gray-100
        disabled:opacity-50
        disabled:cursor-not-allowed
        cursor-pointer
        transition
      "
    >
      <Icon name="check" size={15} />
      Clear Order
    </button>
  ) : isPreparing ? (
    <button
      type="button"
      onClick={() =>
        handleNextTicketStatus(ticket)
      }
      disabled={isUpdating}
      className="
        w-full
        min-h-[44px]
        px-4
        py-2.5
        inline-flex
        items-center
        justify-center
        gap-2
        bg-blue-50
        text-blue-700
        border
        border-blue-200
        text-xs
        font-semibold
        rounded-lg
        hover:bg-blue-100
        disabled:opacity-50
        disabled:cursor-not-allowed
        cursor-pointer
        transition
      "
    >
      <Icon name="check" size={15} />

      {isUpdating
        ? 'Updating...'
        : 'Mark Ready'}
    </button>
  ) : (
    <button
      type="button"
      onClick={() =>
        handleNextTicketStatus(ticket)
      }
      disabled={isUpdating}
      className="
        w-full
        min-h-[44px]
        px-4
        py-2.5
        inline-flex
        items-center
        justify-center
        gap-2
        bg-amber-50
        text-amber-700
        border
        border-amber-200
        text-xs
        font-semibold
        rounded-lg
        hover:bg-amber-100
        disabled:opacity-50
        disabled:cursor-not-allowed
        cursor-pointer
        transition
      "
    >
      <Icon name="play" size={15} />

      {isUpdating
        ? 'Updating...'
        : 'Start Preparing'}
    </button>
  )}
</div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketQueue;