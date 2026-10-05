import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import { AuthContext } from '../../context/AuthContext';
import PaymentCheckout from './PaymentCheckout';
import ShiftManager from './ShiftManager';

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

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
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),

    history: (
      <>
        <path d="M3 12a9 9 0 109-9c-2.5 0-4.7 1-6.4 2.6L3 8" />
        <path d="M3 4v4h4" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    shift: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 018 0v3" />
      </>
    ),

    table: (
      <>
        <rect x="4" y="7" width="16" height="10" rx="2" />
        <path d="M8 7V5M16 7V5M8 17v2M16 17v2" />
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

    arrowRight: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 00-14.9-4M4 5v4h4" />
        <path d="M4 13a8.1 8.1 0 0014.9 4M20 19v-4h-4" />
      </>
    ),

    logout: (
      <>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 014-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const AwaitingBilling = () => {
  const { token, logoutUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('queue');
  const [billingQueue, setBillingQueue] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [shiftOpen, setShiftOpen] = useState(true);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const audioRef = useRef(null);
  const knownNotifIdsRef = useRef(new Set());
  const isInitialNotifFetch = useRef(true);

  /* ---------------------------------------------------------------------- */
  /* Audio                                                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;

    audioRef.current.play().catch(() => {
      // Browser may block autoplay until user interaction.
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Notifications                                                           */
  /* ---------------------------------------------------------------------- */

  const fetchNotifications = useCallback(async () => {
    try {
      const authToken =
        token || localStorage.getItem('token');

      const response = await fetch(
        '/api/v1/orders/notifications',
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const json = await response.json();

      if (!response.ok) return;

      const fetchedData =
        json.data || (Array.isArray(json) ? json : []);

      let hasBrandNewNotification = false;

      fetchedData.forEach((notification) => {
        const notificationId =
          notification.notification_id || notification.id;

        if (
          notificationId &&
          !knownNotifIdsRef.current.has(notificationId)
        ) {
          if (!isInitialNotifFetch.current) {
            hasBrandNewNotification = true;
          }

          knownNotifIdsRef.current.add(notificationId);
        }
      });

      isInitialNotifFetch.current = false;

      if (hasBrandNewNotification) {
        playNotificationSound();
      }

      setNotifications(fetchedData);
    } catch (err) {
      console.error(
        'Failed to fetch notifications:',
        err
      );
    }
  }, [token, playNotificationSound]);

  const handleAcknowledgeNotification = async (
    notificationId
  ) => {
    try {
      const authToken =
        token || localStorage.getItem('token');

      await fetch(
        `/api/v1/orders/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      fetchNotifications();
    } catch (err) {
      console.error(
        'Failed to dismiss notification:',
        err
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Awaiting Bills                                                          */
  /* ---------------------------------------------------------------------- */

  const fetchAwaitingBills = useCallback(async () => {
    try {
      setError('');

      const authToken =
        token || localStorage.getItem('token');

      const response = await fetch(
        '/api/v1/bills/awaiting-bill',
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to load awaiting bills queue.'
        );
      }

      setShiftOpen(data.shift_open !== false);

      const list = Array.isArray(data)
        ? data
        : data.data || [];

      setBillingQueue(list);

      if (selectedTable) {
        const updatedSelected = list.find(
          (table) =>
            table.table_id === selectedTable.table_id
        );

        setSelectedTable(updatedSelected || null);
      }
    } catch (err) {
      console.error(
        'Failed to load awaiting bills:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedTable]);

  /* ---------------------------------------------------------------------- */
  /* Payment History                                                         */
  /* ---------------------------------------------------------------------- */

  const fetchPaymentHistory = useCallback(async () => {
    try {
      const authToken =
        token || localStorage.getItem('token');

      const response = await fetch(
        `/api/v1/bills/history?date=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPaymentHistory(data.data || []);
      }
    } catch (err) {
      console.error(
        'Failed to load payment history:',
        err
      );
    }
  }, [token, selectedDate]);

  /* ---------------------------------------------------------------------- */
  /* Initial Load                                                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    fetchAwaitingBills();
    fetchNotifications();
  }, [
    fetchAwaitingBills,
    fetchNotifications,
  ]);

  /* ---------------------------------------------------------------------- */
  /* History Tab                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPaymentHistory();
    }
  }, [
    activeTab,
    selectedDate,
    fetchPaymentHistory,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Polling                                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAwaitingBills();
      fetchNotifications();

      if (activeTab === 'history') {
        fetchPaymentHistory();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [
    fetchAwaitingBills,
    fetchNotifications,
    fetchPaymentHistory,
    activeTab,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleSelectTable = (table) => {
    if (!shiftOpen) {
      setActiveTab('shift');
      return;
    }

    setSelectedTable(table);
  };

  const handlePaymentSuccess = () => {
    setSelectedTable(null);
    fetchAwaitingBills();
    fetchPaymentHistory();
  };

  const dailyTotalCollected = paymentHistory.reduce(
    (sum, item) =>
      sum + parseFloat(item.total_amount || 0),
    0
  );

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                  */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
          <span>Loading cashier workspace...</span>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Tab Button                                                               */
  /* ---------------------------------------------------------------------- */

  const TabButton = ({
    id,
    icon,
    children,
    count,
  }) => {
    const active = activeTab === id;

    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        title={children}
        className={`
          min-w-0
          min-h-[50px]
          sm:min-h-[48px]
          sm:px-5
          px-2
          py-2.5
          flex
          items-center
          justify-center
          gap-2
          rounded-lg
          border
          text-xs
          sm:text-sm
          font-semibold
          cursor-pointer
          transition
          whitespace-nowrap
          ${
            active
              ? `
                bg-black
                text-white
                border-black
                hover:bg-gray-800
              `
              : `
                bg-white
                text-gray-600
                border-gray-300
                hover:bg-gray-50
                hover:text-gray-900
              `
          }
        `}
      >
        <Icon name={icon} size={18} />

        <span className="truncate">
          {children}
        </span>

        {typeof count === 'number' && (
          <span
            className={`
              min-w-[18px]
              h-[18px]
              px-1
              flex
              items-center
              justify-center
              rounded-full
              text-[10px]
              font-bold
              ${
                active
                  ? 'bg-white/15 text-white'
                  : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-5">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="bg-white border border-gray-200 rounded-xl overflow-visible">

        <div className="p-3 sm:p-4">

          {/* ====================================================
              TITLE + CONTROLS
          ==================================================== */}

          <div className="relative flex items-start justify-between gap-3">

            {/* Page title */}

            <div className="min-w-0 pr-20 sm:pr-0">

              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                Cashier Workspace
              </h1>

              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Billing, payments and register management
              </p>

            </div>

            {/* ==================================================
                RIGHT CONTROLS
            ================================================== */}

            <div className="flex items-center gap-2 shrink-0">

              {/* Register status */}

              <button
                type="button"
                onClick={() => setActiveTab('shift')}
                title={
                  shiftOpen
                    ? 'Register is open'
                    : 'Register is closed'
                }
                className={`
                  hidden
                  sm:flex
                  items-center
                  gap-2
                  h-10
                  px-3
                  rounded-lg
                  border
                  text-xs
                  font-semibold
                  cursor-pointer
                  transition
                  ${
                    shiftOpen
                      ? `
                        border-gray-300
                        bg-white
                        text-gray-700
                        hover:bg-gray-50
                        hover:text-gray-900
                      `
                      : `
                        border-amber-200
                        bg-amber-50
                        text-amber-800
                        hover:bg-amber-100
                      `
                  }
                `}
              >
                <span
                  className={`
                    w-2
                    h-2
                    rounded-full
                    ${
                      shiftOpen
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }
                  `}
                />

                {shiftOpen
                  ? 'Register Open'
                  : 'Register Closed'}
              </button>

              {/* Notifications */}

              <div className="relative">

                <button
                  type="button"
                  onClick={() =>
                    setShowNotifDropdown(
                      (prev) => !prev
                    )
                  }
                  title="Notifications"
                  className="
                    relative
                    w-10
                    h-10
                    sm:w-11
                    sm:h-11
                    flex
                    items-center
                    justify-center
                    border
                    border-gray-300
                    bg-white
                    text-gray-700
                    hover:bg-gray-50
                    hover:text-black
                    rounded-lg
                    cursor-pointer
                    transition
                  "
                  aria-label="Notifications"
                >
                  <Icon name="bell" size={19} />

                  {notifications.length > 0 && (
                    <span
                      className="
                        absolute
                        -top-1.5
                        -right-1.5
                        min-w-[18px]
                        h-[18px]
                        px-1
                        flex
                        items-center
                        justify-center
                        rounded-full
                        bg-amber-500
                        text-white
                        text-[10px]
                        font-bold
                        border-2
                        border-white
                      "
                    >
                      {notifications.length > 9
                        ? '9+'
                        : notifications.length}
                    </span>
                  )}
                </button>

                {/* Notification dropdown */}

                {showNotifDropdown && (
                  <div
                    className="
                      absolute
                      right-0
                      top-12
                      w-[300px]
                      max-w-[calc(100vw-24px)]
                      bg-white
                      border
                      border-gray-200
                      rounded-xl
                      shadow-lg
                      z-50
                      overflow-hidden
                    "
                  >

                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">

                      <span className="text-sm font-semibold text-gray-900">
                        Notifications
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setShowNotifDropdown(false)
                        }
                        title="Close"
                        className="
                          w-7
                          h-7
                          flex
                          items-center
                          justify-center
                          text-gray-400
                          hover:text-gray-700
                          hover:bg-gray-100
                          rounded-md
                          cursor-pointer
                          transition
                        "
                      >
                        <Icon name="close" size={15} />
                      </button>

                    </div>

                    {notifications.length === 0 ? (

                      <div className="px-4 py-8 text-center text-xs text-gray-400">
                        No new notifications
                      </div>

                    ) : (

                      <div className="max-h-72 overflow-y-auto">

                        {notifications.map((notification) => (

                          <div
                            key={
                              notification.notification_id ||
                              notification.id
                            }
                            className="
                              px-4
                              py-3
                              border-b
                              border-gray-100
                              last:border-0
                            "
                          >

                            <div className="flex items-start gap-3">

                              <div className="mt-0.5 text-amber-600 shrink-0">
                                <Icon
                                  name="bell"
                                  size={16}
                                />
                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="text-xs leading-5 text-gray-700">
                                  {notification.message}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAcknowledgeNotification(
                                      notification.notification_id ||
                                        notification.id
                                    );

                                    setShowNotifDropdown(false);
                                  }}
                                  className="
                                    mt-2
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-1.5
                                    px-3
                                    py-1.5
                                    bg-black
                                    text-white
                                    text-xs
                                    font-semibold
                                    rounded-md
                                    cursor-pointer
                                    hover:bg-gray-800
                                    transition
                                  "
                                >
                                  <Icon
                                    name="check"
                                    size={13}
                                  />
                                  Mark as Read
                                </button>

                              </div>

                            </div>

                          </div>

                        ))}

                      </div>

                    )}

                  </div>
                )}

              </div>

              {/* Logout */}

              <button
                type="button"
                onClick={logoutUser}
                title="Logout"
                aria-label="Logout"
                className="
                  w-10
                  h-10
                  sm:w-11
                  sm:h-11
                  flex
                  items-center
                  justify-center
                  border
                  border-gray-300
                  bg-white
                  text-gray-500
                  hover:bg-red-50
                  hover:text-red-600
                  hover:border-red-200
                  rounded-lg
                  cursor-pointer
                  transition
                "
              >
                <Icon name="logout" size={18} />
              </button>

            </div>

          </div>

          {/* ====================================================
              MOBILE REGISTER STATUS
          ==================================================== */}

          <div className="mt-3 sm:hidden">

            <button
              type="button"
              onClick={() => setActiveTab('shift')}
              className={`
                w-full
                h-10
                flex
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                text-xs
                font-semibold
                cursor-pointer
                transition
                ${
                  shiftOpen
                    ? `
                      border-gray-300
                      bg-white
                      text-gray-700
                      hover:bg-gray-50
                    `
                    : `
                      border-amber-200
                      bg-amber-50
                      text-amber-800
                      hover:bg-amber-100
                    `
                }
              `}
            >
              <span
                className={`
                  w-2
                  h-2
                  rounded-full
                  ${
                    shiftOpen
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }
                `}
              />

              {shiftOpen
                ? 'Register Open'
                : 'Register Closed'}
            </button>

          </div>

          {/* ====================================================
              NAVIGATION BUTTONS
          ==================================================== */}

          <div className="mt-4 sm:mt-5">

            <div
              className="
                grid
                grid-cols-3
                gap-2
                sm:flex
                sm:items-center
                sm:gap-2
              "
            >

              <TabButton
                id="queue"
                icon="receipt"
                count={billingQueue.length}
              >
                Billing Queue
              </TabButton>

              <TabButton
                id="history"
                icon="history"
              >
                Payment History
              </TabButton>

              <TabButton
                id="shift"
                icon="shift"
              >
                Register
              </TabButton>

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          PAGE CONTENT
      ======================================================== */}

      <div className="mt-3 sm:mt-4">

        {/* ------------------------------------------------------
            ERROR
        ------------------------------------------------------ */}

        {error && (
          <div
            className="
              mb-4
              flex
              items-start
              justify-between
              gap-3
              px-4
              py-3
              rounded-lg
              border
              border-red-200
              bg-red-50
              text-red-700
            "
          >

            <p className="text-xs sm:text-sm">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError('')}
              title="Close error"
              className="
                shrink-0
                w-6
                h-6
                flex
                items-center
                justify-center
                rounded-md
                hover:bg-red-100
                cursor-pointer
                transition
              "
            >
              <Icon name="close" size={14} />
            </button>

          </div>
        )}

        {/* ------------------------------------------------------
            QUEUE
        ------------------------------------------------------ */}

        {activeTab === 'queue' && (
          <>
            {!shiftOpen ? (

              <div
                className="
                  border
                  border-gray-200
                  bg-white
                  rounded-xl
                  p-6
                  sm:p-8
                  text-center
                "
              >

                <div
                  className="
                    mx-auto
                    w-12
                    h-12
                    flex
                    items-center
                    justify-center
                    border
                    border-gray-200
                    rounded-lg
                    bg-gray-50
                    text-gray-400
                    mb-4
                  "
                >
                  <Icon name="shift" size={22} />
                </div>

                <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                  Register is closed
                </h2>

                <p className="max-w-md mx-auto text-xs sm:text-sm text-gray-500 mt-1.5 leading-6">
                  Open your cashier shift before processing guest
                  payments. Your billing queue will become
                  available once the register is open.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveTab('shift')}
                  className="
                    mt-5
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    px-4
                    py-2.5
                    bg-black
                    text-white
                    text-xs
                    sm:text-sm
                    font-semibold
                    rounded-lg
                    hover:bg-gray-800
                    cursor-pointer
                    transition
                  "
                >
                  Open Register
                  <Icon name="arrowRight" size={15} />
                </button>

              </div>

            ) : (

              <div
                className="
                  grid
                  grid-cols-1
                  xl:grid-cols-[380px_minmax(0,1fr)]
                  gap-4
                  sm:gap-5
                  items-start
                "
              >

                {/* ==================================================
                    BILLING QUEUE
                ================================================== */}

                <section
                  className="
                    border
                    border-gray-200
                    bg-white
                    rounded-xl
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      px-3
                      py-3
                      sm:px-4
                      sm:py-4
                      border-b
                      border-gray-200
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <div className="text-amber-600 shrink-0">
                          <Icon name="receipt" size={17} />
                        </div>

                        <h2 className="text-sm font-semibold text-gray-900">
                          Awaiting Payment
                        </h2>

                      </div>

                      <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                        Select a table to begin checkout.
                      </p>

                    </div>

                    <span
                      className="
                        shrink-0
                        min-w-6
                        h-6
                        px-1.5
                        flex
                        items-center
                        justify-center
                        rounded-full
                        bg-gray-100
                        text-[10px]
                        font-bold
                        text-gray-600
                      "
                    >
                      {billingQueue.length}
                    </span>

                  </div>

                  <div className="p-3">

                    {billingQueue.length === 0 ? (

                      <div className="py-12 px-4 text-center">

                        <div
                          className="
                            mx-auto
                            w-10
                            h-10
                            flex
                            items-center
                            justify-center
                            border
                            border-gray-200
                            rounded-lg
                            bg-gray-50
                            text-gray-400
                            mb-3
                          "
                        >
                          <Icon name="receipt" size={18} />
                        </div>

                        <p className="text-sm font-semibold text-gray-600">
                          No bills awaiting payment
                        </p>

                        <p className="text-xs text-gray-400 mt-1.5 leading-5">
                          When a waiter requests a bill, the table
                          will appear here.
                        </p>

                      </div>

                    ) : (

                      <div className="space-y-2">

                        {billingQueue.map((table) => {

                          const isSelected =
                            selectedTable?.table_id ===
                            table.table_id;

                          return (
                            <button
                              key={table.table_id}
                              type="button"
                              onClick={() =>
                                handleSelectTable(table)
                              }
                              className={`
                                w-full
                                text-left
                                p-3
                                sm:p-3.5
                                rounded-lg
                                border
                                cursor-pointer
                                transition
                                ${
                                  isSelected
                                    ? `
                                      border-black
                                      bg-gray-50
                                    `
                                    : `
                                      border-gray-200
                                      bg-white
                                      hover:border-gray-300
                                      hover:bg-gray-50
                                    `
                                }
                              `}
                            >

                              <div className="flex items-start justify-between gap-3">

                                <div className="flex items-start gap-3 min-w-0">

                                  <div
                                    className={`
                                      shrink-0
                                      w-9
                                      h-9
                                      rounded-lg
                                      flex
                                      items-center
                                      justify-center
                                      ${
                                        isSelected
                                          ? 'bg-black text-white'
                                          : 'bg-gray-100 text-gray-600'
                                      }
                                    `}
                                  >
                                    <Icon name="table" size={16} />
                                  </div>

                                  <div className="min-w-0">

                                    <p className="text-sm font-bold text-gray-900">
                                      Table #{table.table_number}
                                    </p>

                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                      {table.waiter_name ||
                                        'Unassigned'}
                                    </p>

                                  </div>

                                </div>

                                <Icon
                                  name="arrowRight"
                                  size={16}
                                />

                              </div>

                              <div
                                className="
                                  mt-3
                                  pt-3
                                  border-t
                                  border-gray-100
                                  flex
                                  items-end
                                  justify-between
                                  gap-3
                                "
                              >

                                <div>

                                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                    Tickets
                                  </p>

                                  <p className="text-xs font-semibold text-gray-700 mt-0.5">
                                    {table.total_orders_count || 1}
                                  </p>

                                </div>

                                <div className="text-right">

                                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                    Amount Due
                                  </p>

                                  <p className="text-sm font-bold text-gray-950 mt-0.5">
                                    {parseFloat(
                                      table.group_total_amount || 0
                                    ).toFixed(2)}{' '}
                                    <span className="text-[10px] font-medium text-gray-500">
                                      ETB
                                    </span>
                                  </p>

                                </div>

                              </div>

                            </button>
                          );
                        })}

                      </div>

                    )}

                  </div>

                </section>

                {/* ==================================================
                    CHECKOUT
                ================================================== */}

                <section className="min-w-0">

                  {selectedTable ? (

                    <PaymentCheckout
                      table={selectedTable}
                      token={token}
                      onPaymentSuccess={handlePaymentSuccess}
                    />

                  ) : (

                    <div
                      className="
                        min-h-[420px]
                        sm:min-h-[480px]
                        border
                        border-gray-200
                        bg-white
                        rounded-xl
                        flex
                        items-center
                        justify-center
                        px-6
                      "
                    >

                      <div className="text-center max-w-sm">

                        <div
                          className="
                            mx-auto
                            w-12
                            h-12
                            flex
                            items-center
                            justify-center
                            border
                            border-gray-200
                            rounded-lg
                            bg-gray-50
                            text-gray-400
                            mb-4
                          "
                        >
                          <Icon name="receipt" size={22} />
                        </div>

                        <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                          Select a bill
                        </h2>

                        <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-6">
                          Choose a table from the billing queue to
                          review the order and complete payment.
                        </p>

                      </div>

                    </div>

                  )}

                </section>

              </div>

            )}

          </>
        )}

        {/* ------------------------------------------------------
            HISTORY
        ------------------------------------------------------ */}

        {activeTab === 'history' && (
          <section className="space-y-3 sm:space-y-4">

            {/* History Header */}

            <div
              className="
                border
                border-gray-200
                bg-white
                rounded-xl
                p-3
                sm:p-4
              "
            >

              <div
                className="
                  flex
                  flex-col
                  lg:flex-row
                  lg:items-center
                  lg:justify-between
                  gap-3
                  sm:gap-4
                "
              >

                <div>

                  <div className="flex items-center gap-2">

                    <div className="text-amber-600 shrink-0">
                      <Icon name="history" size={18} />
                    </div>

                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                      Payment History
                    </h2>

                  </div>

                  <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                    Payments processed by your cashier account.
                  </p>

                </div>

                <div className="flex flex-col sm:flex-row gap-2">

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) =>
                      setSelectedDate(e.target.value)
                    }
                    className="
                      h-10
                      sm:h-9
                      px-3
                      rounded-lg
                      border
                      border-gray-300
                      bg-white
                      text-xs
                      font-medium
                      text-gray-700
                      outline-none
                      focus:border-gray-500
                    "
                  />

                  <button
                    type="button"
                    onClick={fetchPaymentHistory}
                    className="
                      h-10
                      sm:h-9
                      px-4
                      rounded-lg
                      bg-black
                      text-white
                      text-xs
                      font-semibold
                      hover:bg-gray-800
                      transition
                      cursor-pointer
                    "
                  >
                    Apply Date
                  </button>

                </div>

              </div>

            </div>

            {/* Summary */}

            <div
              className="
                grid
                grid-cols-2
                gap-2
                sm:gap-3
              "
            >

              <div
                className="
                  border
                  border-gray-200
                  bg-white
                  rounded-xl
                  p-3
                  sm:p-5
                "
              >

                <p className="text-[11px] sm:text-xs font-medium text-gray-400">
                  Total Collected
                </p>

                <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold tracking-tight text-gray-950">
                  {dailyTotalCollected.toFixed(2)}

                  <span className="ml-1 text-[10px] sm:text-sm font-medium text-gray-400">
                    ETB
                  </span>
                </p>

                <p className="mt-1 text-[10px] sm:text-[11px] text-gray-400">
                  {selectedDate}
                </p>

              </div>

              <div
                className="
                  border
                  border-gray-200
                  bg-white
                  rounded-xl
                  p-3
                  sm:p-5
                "
              >

                <p className="text-[11px] sm:text-xs font-medium text-gray-400">
                  Transactions
                </p>

                <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold tracking-tight text-gray-950">
                  {paymentHistory.length}
                </p>

                <p className="mt-1 text-[10px] sm:text-[11px] text-gray-400">
                  Completed payments
                </p>

              </div>

            </div>

            {/* History Table */}

            <div
              className="
                border
                border-gray-200
                bg-white
                rounded-xl
                overflow-hidden
              "
            >

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left">

                  <thead>

                    <tr className="border-b border-gray-200 bg-gray-50">

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Table
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Order
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Waiter
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Method
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Receipt / Reference
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 text-right">
                        Amount
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Time
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {paymentHistory.length === 0 ? (

                      <tr>

                        <td
                          colSpan="7"
                          className="px-6 py-14 text-center"
                        >

                          <div
                            className="
                              w-10
                              h-10
                              mx-auto
                              mb-3
                              rounded-lg
                              bg-gray-50
                              border
                              border-gray-200
                              text-gray-400
                              flex
                              items-center
                              justify-center
                            "
                          >
                            <Icon name="history" size={18} />
                          </div>

                          <p className="text-sm font-semibold text-gray-600">
                            No payments found
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            No completed payments were recorded for{' '}
                            {selectedDate}.
                          </p>

                        </td>

                      </tr>

                    ) : (

                      paymentHistory.map((item, index) => (

                        <tr
                          key={
                            item.order_id ||
                            item.aggregated_order_ids ||
                            index
                          }
                          className="hover:bg-gray-50 transition"
                        >

                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            Table #{item.table_number}
                          </td>

                          <td className="px-4 py-3">

                            <span className="font-mono text-xs font-semibold text-gray-700">
                              {item.aggregated_order_ids ||
                                `#${item.order_id}`}
                            </span>

                          </td>

                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.waiter_name || 'N/A'}
                          </td>

                          <td className="px-4 py-3">

                            <span
                              className="
                                inline-flex
                                px-2
                                py-1
                                rounded-md
                                bg-gray-100
                                border
                                border-gray-200
                                text-[10px]
                                font-bold
                                uppercase
                                tracking-wide
                                text-gray-700
                              "
                            >
                              {item.payment_method}
                            </span>

                          </td>

                          <td className="px-4 py-3">

                            <span className="font-mono text-[11px] text-gray-500">
                              {item.fiscal_receipt_no ||
                                item.payment_ref ||
                                'N/A'}
                            </span>

                          </td>

                          <td
                            className="
                              px-4
                              py-3
                              text-right
                              font-mono
                              text-sm
                              font-bold
                              text-gray-950
                            "
                          >
                            {parseFloat(
                              item.total_amount || 0
                            ).toFixed(2)}{' '}

                            <span className="text-[10px] text-gray-400">
                              ETB
                            </span>

                          </td>

                          <td className="px-4 py-3 text-xs text-gray-500">

                            {item.paid_at
                              ? new Date(
                                  item.paid_at
                                ).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}

                          </td>

                        </tr>

                      ))

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </section>
        )}

        {/* ------------------------------------------------------
            SHIFT
        ------------------------------------------------------ */}

        {activeTab === 'shift' && (

          <div className="max-w-2xl mx-auto">

            <ShiftManager
              onShiftChange={fetchAwaitingBills}
            />

          </div>

        )}

      </div>

    </div>
  );
};

export default AwaitingBilling;