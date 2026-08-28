import React, {
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';

import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({
  currentRoleTitle,
  language,
  setLanguage,
}) => {
  const {
    user,
    token,
    logoutUser,
  } = useContext(AuthContext);

  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] =
    useState(false);

  // Keep track of previous notification IDs
  const previousNotificationIds = useRef([]);

  // Prevent sound from playing on first page load
  const firstNotificationLoad = useRef(true);

  /**
   * Play notification sound
   */
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');

      audio.volume = 1.0;

      audio.play().catch((err) => {
        console.warn(
          'Notification sound could not play:',
          err
        );
      });
    } catch (err) {
      console.error(
        'Notification audio error:',
        err
      );
    }
  };

  /**
   * Fetch unread notifications
   */
  const fetchNotifications = async () => {
    const activeToken =
      token || localStorage.getItem('token');

    if (!activeToken) {
      return;
    }

    try {
      const res = await fetch(
        'http://localhost:5000/api/v1/orders/notifications',
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }
      );

      if (res.status === 401) {
        console.error(
          'Notification request failed: 401 Unauthorized'
        );
        return;
      }

      if (res.status === 403) {
        console.error(
          'Notification request failed: 403 Forbidden'
        );
        return;
      }

      if (!res.ok) {
        console.error(
          'Notification request failed:',
          res.status
        );
        return;
      }

      const data = await res.json();

      const newNotifications =
        Array.isArray(data) ? data : [];

      /*
       * Detect notifications that were not present
       * during the previous request.
       */
      const previousIds =
        previousNotificationIds.current;

      const newNotificationArr =
        newNotifications.filter(
          (notification) =>
            !previousIds.includes(
              notification.notification_id
            )
        );

      /*
       * Don't play sound when the page initially loads.
       *
       * Only play it when a notification arrives
       * after the initial request.
       */
      if (
        !firstNotificationLoad.current &&
        newNotificationArr.length > 0
      ) {
        playNotificationSound();
      }

      // Save current notification IDs
      previousNotificationIds.current =
        newNotifications.map(
          (notification) =>
            notification.notification_id
        );

      firstNotificationLoad.current = false;

      setNotifications(newNotifications);
    } catch (err) {
      console.error(
        'Error fetching notifications:',
        err
      );
    }
  };

  /**
   * Mark notification as read
   */
  const markAsRead = async (notificationId) => {
    const activeToken =
      token || localStorage.getItem('token');

    if (!activeToken) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/v1/orders/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }
      );

      if (res.ok) {
        setNotifications((prev) =>
          prev.filter(
            (notification) =>
              notification.notification_id !==
              notificationId
          )
        );

        previousNotificationIds.current =
          previousNotificationIds.current.filter(
            (id) => id !== notificationId
          );
      }
    } catch (err) {
      console.error(
        'Error marking notification read:',
        err
      );
    }
  };

  /**
   * Start notification polling
   */
  useEffect(() => {
    firstNotificationLoad.current = true;
    previousNotificationIds.current = [];

    fetchNotifications();

    const interval = setInterval(
      fetchNotifications,
      3000
    );

    return () => clearInterval(interval);
  }, [token]);

  /**
   * Logout
   */
  const handleLogout = () => {
    logoutUser();
    navigate('/login', {
      replace: true,
    });
  };

  return (
    <nav className="bg-white border-b border-gray-300 px-4 py-2 sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">

        {/* Active Role */}
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-800 text-base sm:text-lg">
            {currentRoleTitle}
          </span>

          {user && (
            <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
              ({user.full_name || user.username})
            </span>
          )}
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center space-x-4">

          {/* Notification */}
          <div className="relative">

            <button
              onClick={() =>
                setShowNotifications(
                  !showNotifications
                )
              }
              className="relative p-1.5 text-gray-600 hover:text-blue-600 focus:outline-none"
              title="Notifications"
            >
              <span className="text-lg">
                🔔
              </span>

              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-gray-800 rounded shadow-xl border border-gray-200 z-50 overflow-hidden">

                <div className="flex justify-between items-center px-3 py-2 bg-gray-100 border-b">
                  <span className="font-bold text-xs text-gray-700">
                    {language === 'am'
                      ? 'ማሳወቂያዎች'
                      : 'Notifications'}
                  </span>

                  <span className="text-xs text-gray-500">
                    {notifications.length}{' '}
                    {language === 'am'
                      ? 'አዲስ'
                      : 'unread'}
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">

                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      {language === 'am'
                        ? 'ምንም አዲስ ማሳወቂያ የለም'
                        : 'No new notifications'}
                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <div
                          key={
                            notification.notification_id
                          }
                          onClick={() =>
                            markAsRead(
                              notification.notification_id
                            )
                          }
                          className="p-3 hover:bg-blue-50 cursor-pointer transition text-xs flex justify-between items-start space-x-2"
                        >
                          <p className="text-gray-800 leading-tight">
                            {notification.message}
                          </p>

                          <span className="text-green-600 font-bold text-xs">
                            ✓
                          </span>
                        </div>
                      )
                    )
                  )}

                </div>
              </div>
            )}
          </div>

          {/* Language */}
          <div className="flex border border-gray-400 rounded overflow-hidden">

            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-xs font-bold ${
                language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              English
            </button>

            <button
              onClick={() => setLanguage('am')}
              className={`px-3 py-1 text-xs font-bold ${
                language === 'am'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              አማርኛ
            </button>

          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold"
          >
            {language === 'am'
              ? 'ውጣ'
              : 'Logout'}
          </button>

        </div>

        {/* Mobile Controls */}
        <div className="md:hidden flex items-center space-x-2">

          <button
            onClick={() =>
              setShowNotifications(
                !showNotifications
              )
            }
            className="relative p-1.5 text-gray-600"
          >
            <span className="text-lg">
              🔔
            </span>

            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 border border-gray-400 rounded text-sm font-bold text-gray-700 bg-gray-50"
          >
            {isOpen
              ? 'Close ✕'
              : 'Menu ☰'}
          </button>

        </div>

      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden mt-2 pt-3 border-t border-gray-200 space-y-3 pb-2">

          {user && (
            <div className="text-xs font-semibold text-gray-600">
              User:{' '}
              {user.full_name ||
                user.username}
            </div>
          )}

          <div className="flex items-center justify-between">

            <span className="text-xs font-bold text-gray-600">
              {language === 'am'
                ? 'ቋንቋ'
                : 'Language'}
            </span>

            <div className="flex border border-gray-400 rounded overflow-hidden">

              <button
                onClick={() =>
                  setLanguage('en')
                }
                className={`px-3 py-1 text-xs font-bold ${
                  language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                English
              </button>

              <button
                onClick={() =>
                  setLanguage('am')
                }
                className={`px-3 py-1 text-xs font-bold ${
                  language === 'am'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                አማርኛ
              </button>

            </div>

          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 rounded text-sm font-bold"
          >
            {language === 'am'
              ? 'ውጣ'
              : 'Logout'}
          </button>

        </div>
      )}

    </nav>
  );
};

export default Navbar;

