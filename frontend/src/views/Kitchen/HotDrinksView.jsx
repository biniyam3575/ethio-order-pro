import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import TicketQueue from './TicketQueue';
import InventoryToggle from './InverntoryToggle';
import { AuthContext } from '../../context/AuthContext';

const HotDrinksView = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('queue');
  const [tickets, setTickets] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const audioRef = useRef(null);
  const previousNotificationIdsRef = useRef(new Set());
  const isFirstFetchRef = useRef(true);

  // Initialize Audio Object
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
    audioRef.current.play().catch((err) => {
      console.warn('Audio playback blocked until user interacts with document:', err);
    });
  }, []);

  const handleUnlockAudio = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.play().then(() => {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }).catch(() => {});
  }, []);

  // Fetch Notifications with station parameter
  const fetchNotifications = useCallback(async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) return;

      const response = await fetch(
        'http://localhost:5000/api/v1/orders/notifications?station=Hot%20Drinks',
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Failed to fetch notifications.');

      const fetchedData = json.data || (Array.isArray(json) ? json : []);

      const currentNotificationIds = new Set(
        fetchedData.map((notif) => String(notif.notification_id || notif.id))
      );

      const previousIds = previousNotificationIdsRef.current;

      const hasNewNotification = fetchedData.some((notif) => {
        const id = String(notif.notification_id || notif.id);
        return !previousIds.has(id);
      });

      if (hasNewNotification && !isFirstFetchRef.current) {
        playNotificationSound();
      }

      isFirstFetchRef.current = false;
      previousNotificationIdsRef.current = currentNotificationIds;
      setNotifications(fetchedData);
    } catch (err) {
      console.error('Failed to fetch hot drink notifications:', err);
    }
  }, [token, playNotificationSound]);

  // Fetch Station Tickets and Menu Data using "Hot Drinks"
  const fetchStationData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token || localStorage.getItem('token')}` };

      const [ticketsRes, menuRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/orders/kitchen?station=Hot%20Drinks', { headers }),
        fetch('http://localhost:5000/api/v1/menu', { headers }),
      ]);

      const ticketsJson = await ticketsRes.json();
      const menuJson = await menuRes.json();

      if (!ticketsRes.ok) throw new Error(ticketsJson.message || 'Failed to fetch tickets.');

      setTickets(Array.isArray(ticketsJson) ? ticketsJson : ticketsJson.data || []);
      setMenuItems(Array.isArray(menuJson) ? menuJson : menuJson.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStationData();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchStationData();
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStationData, fetchNotifications]);

  const handleAcknowledgeNotification = async (notificationId) => {
    try {
      const authToken = token || localStorage.getItem('token');

      setNotifications((prev) =>
        prev.filter((n) => String(n.notification_id || n.id) !== String(notificationId))
      );

      await fetch(`http://localhost:5000/api/v1/orders/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      fetchNotifications();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
      fetchNotifications();
    }
  };

  const handleUpdateItemStatus = async (orderItemId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/orders/item/${orderItemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update item status');
      }

      fetchStationData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleStock = async (itemId, isAvailable) => {
    try {
      await fetch(`http://localhost:5000/api/v1/menu/${itemId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isAvailable }),
      });

      fetchStationData();
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 max-w-7xl mx-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-gray-600 font-medium">Loading hot drinks station...</span>
      </div>
    );
  }

  return (
    <div onClick={handleUnlockAudio} className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header & Navigation Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            ☕ Hot Drinks Station
          </h1>
          <p className="text-xs text-gray-500 font-medium">Coffee & Tea Line • Preparation Queue</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Notification Bell Icon with Badge */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifDropdown((prev) => !prev);
              }}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center justify-center gap-2 text-xs font-bold text-amber-900 shadow-sm w-full sm:w-auto"
            >
              🔔
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-full animate-pulse shadow-sm">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 space-y-2"
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="font-bold text-xs text-gray-800">Hot Drinks Alerts</span>
                  <button onClick={() => setShowNotifDropdown(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">
                    ✕
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400">No active alerts right now</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                    {notifications.map((notification) => {
                      const id = notification.notification_id || notification.id;
                      return (
                        <div key={id} className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex flex-col gap-2">
                          <span className="text-xs font-semibold text-gray-800">{notification.message}</span>
                          <button
                            onClick={() => {
                              handleAcknowledgeNotification(id);
                              setShowNotifDropdown(false);
                            }}
                            className="self-end px-2.5 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700 transition"
                          >
                            ✓ Dismiss Alert
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'queue' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Coffee Queue ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'inventory' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 86 Inventory
            </button>
            <button
              onClick={() => { fetchStationData(); fetchNotifications(); }}
              className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg ml-2 transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-200 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold">✕</button>
        </div>
      )}

      {activeTab === 'queue' ? (
      <TicketQueue
        tickets={tickets}
        currentStation="Hot Drinks"
        token={token}
        onUpdateItemStatus={handleUpdateItemStatus}
      />     ) : (
        <InventoryToggle
          menuItems={menuItems.filter((item) => item.station === 'Hot Drinks')}
          onToggleStock={handleToggleStock}
        />
      )}
    </div>
  );
};

export default HotDrinksView;