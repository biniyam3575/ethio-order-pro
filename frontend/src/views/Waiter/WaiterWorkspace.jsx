import React, { useState, useEffect, useContext, useRef } from 'react';
import FloorPlanGrid from './FloorPlanGrid';
import OrderEntry from './OrderEntry';
import OrderStatus from './OrderStatus';
import { AuthContext } from '../../context/AuthContext';

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

    map: (
      <>
        <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),

    activity: (
      <>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
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

const WaiterWorkspace = () => {
  const { token, logoutUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('floorPlan');
  const [selectedTable, setSelectedTable] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const audioRef = useRef(null);
  const previousCountRef = useRef(0);

  // ------------------------------------------------------------
  // Notification audio
  // ------------------------------------------------------------

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');

    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          })
          .catch(() => {});
      }

      window.removeEventListener('click', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  const playNotificationSound = () => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;

    audioRef.current.play().catch(() => {});
  };

  // ------------------------------------------------------------
  // Fetch notifications
  // ------------------------------------------------------------

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/v1/orders/notifications',
        {
          headers: {
            Authorization: `Bearer ${
              token || localStorage.getItem('token')
            }`,
          },
        }
      );

      const json = await response.json();

      if (response.ok) {
        const fetchedData =
          json.data || (Array.isArray(json) ? json : []);

        if (fetchedData.length > previousCountRef.current) {
          playNotificationSound();
        }

        previousCountRef.current = fetchedData.length;
        setNotifications(fetchedData);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(interval);
  }, [token]);

  // ------------------------------------------------------------
  // Acknowledge notification
  // ------------------------------------------------------------

  const handleAcknowledgeNotification = async (notificationId) => {
    try {
      await fetch(
        `http://localhost:5000/api/v1/orders/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${
              token || localStorage.getItem('token')
            }`,
          },
        }
      );

      await fetchNotifications();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // ------------------------------------------------------------
  // Table selection
  // ------------------------------------------------------------

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveTab('orderEntry');
  };

  // ------------------------------------------------------------
  // Order submitted
  // ------------------------------------------------------------

  const handleOrderSubmitted = () => {
    setSelectedTable(null);
    setActiveTab('liveStatus');
  };

  // ------------------------------------------------------------
  // Navigation tabs
  // ------------------------------------------------------------

  const tabs = [
    {
      id: 'floorPlan',
      label: 'Floor Plan',
      icon: 'map',
    },
    {
      id: 'orderEntry',
      label: selectedTable
        ? `New Order · T-${selectedTable.table_number}`
        : 'New Order',
      icon: 'plus',
    },
    {
      id: 'liveStatus',
      label: 'Live Orders',
      icon: 'activity',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-5">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="bg-white border border-gray-200 rounded-xl overflow-visible">

        <div className="p-3 sm:p-4">

          {/* ====================================================
              TITLE + NOTIFICATION + LOGOUT
          ==================================================== */}

          <div className="relative flex items-start justify-between gap-3">

            {/* Page title */}
            <div className="min-w-0 pr-12 sm:pr-0">

              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                Waiter Workspace
              </h1>

              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Floor plan, orders and table billing
              </p>

            </div>

            {/* ==================================================
                NOTIFICATION + LOGOUT
            ================================================== */}

            <div className="flex items-center gap-2 shrink-0">

              {/* Notification */}
              <div className="relative">

                <button
                  type="button"
                  onClick={() =>
                    setShowNotifDropdown((prev) => !prev)
                  }
                  title="Notifications"
                  aria-label="Notifications"
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

                {/* ==================================================
                    NOTIFICATION DROPDOWN
                ================================================== */}

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
                        aria-label="Close notifications"
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

                        {notifications.map((n) => (

                          <div
                            key={n.notification_id || n.id}
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
                                <Icon name="bell" size={16} />
                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="text-xs leading-5 text-gray-700">
                                  {n.message}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAcknowledgeNotification(
                                      n.notification_id || n.id
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
                                  <Icon name="check" size={13} />
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

              {/* ==================================================
                  LOGOUT
              ================================================== */}

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

              {tabs.map((tab) => {

                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
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
                        isActive
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

                    <Icon
                      name={tab.icon}
                      size={18}
                    />

                    <span className="truncate">
                      {tab.label}
                    </span>

                  </button>
                );

              })}

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          PAGE CONTENT
      ======================================================== */}

      <div className="mt-3 sm:mt-4">

        {/* ------------------------------------------------------
            FLOOR PLAN
        ------------------------------------------------------ */}

        {activeTab === 'floorPlan' && (
          <FloorPlanGrid
            onSelectTable={handleSelectTable}
            selectedTableId={selectedTable?.table_id}
          />
        )}

        {/* ------------------------------------------------------
            NEW ORDER
        ------------------------------------------------------ */}

        {activeTab === 'orderEntry' && (
          <>
            {selectedTable ? (

              <OrderEntry
                selectedTable={selectedTable}
                onOrderSubmitted={handleOrderSubmitted}
                onCancel={() => setSelectedTable(null)}
              />

            ) : (

              <div className="border border-gray-200 bg-white rounded-xl p-6 sm:p-8 text-center">

                <div className="mx-auto w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 mb-3">
                  <Icon name="map" size={19} />
                </div>

                <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                  No table selected
                </h3>

                <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-4">
                  Select a table from the floor plan to start an order.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveTab('floorPlan')}
                  className="
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
                  <Icon name="map" size={15} />
                  Go to Floor Plan
                </button>

              </div>

            )}

          </>
        )}

        {/* ------------------------------------------------------
            LIVE ORDERS
        ------------------------------------------------------ */}

        {activeTab === 'liveStatus' && (
          <OrderStatus
            notifications={notifications}
            onRefreshNotifications={fetchNotifications}
          />
        )}

      </div>

    </div>
  );
};

export default WaiterWorkspace;
