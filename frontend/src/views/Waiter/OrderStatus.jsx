
import React, {
  useState,
  useEffect,
  useContext,
} from 'react';

import { AuthContext } from '../../context/AuthContext';

const OrderStatus = ({ language }) => {
  const { token } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingBill, setRequestingBill] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | GET LIVE ORDERS
  |--------------------------------------------------------------------------
  */

  const fetchLiveOrders = async () => {
    try {
      const activeToken =
        token || localStorage.getItem('token');

      if (!activeToken) {
        setLoading(false);
        return;
      }

      const res = await fetch(
        'http://localhost:5000/api/v1/orders/live',
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();

        setOrders(
          Array.isArray(data) ? data : []
        );
      } else {
        console.error(
          'Live orders request failed:',
          res.status
        );
      }
    } catch (err) {
      console.error(
        'Error loading live orders:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD + AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchLiveOrders();

    // Refresh every 3 seconds
    const interval = setInterval(
      fetchLiveOrders,
      3000
    );

    return () => clearInterval(interval);
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | REQUEST BILL
  |--------------------------------------------------------------------------
  */

  const handleRequestBill = async (orderId) => {
    const activeToken =
      token || localStorage.getItem('token');

    if (!activeToken) {
      alert(
        language === 'am'
          ? 'የመግቢያ ጊዜዎ አብቅቷል። እባክዎ እንደገና ይግቡ።'
          : 'Your session has expired. Please login again.'
      );

      return;
    }

    const confirmed = window.confirm(
      language === 'am'
        ? 'ለዚህ ትዕዛዝ የክፍያ ሂሳብ ጥያቄ ወደ ካሺየር ልከው?'
        : 'Send the bill request to the cashier?'
    );

    if (!confirmed) {
      return;
    }

    setRequestingBill(orderId);

    try {
      const res = await fetch(
        `http://localhost:5000/api/v1/orders/${orderId}/request-bill`,
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert(
          language === 'am'
            ? 'የክፍያ ሂሳብ ጥያቄ ወደ ካሺየር ተልኳል!'
            : 'Bill request sent to cashier!'
        );

        /*
         * Refresh immediately instead of waiting
         * for the 3-second interval.
         */
        await fetchLiveOrders();

      } else {
        alert(
          data.message ||
            'Failed to request bill.'
        );
      }

    } catch (err) {
      console.error(
        'Request bill error:',
        err
      );

      alert(
        language === 'am'
          ? 'የኔትወርክ ችግር ተፈጥሯል።'
          : 'Network error. Check the backend server.'
      );

    } finally {
      setRequestingBill(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="bg-white p-4 border rounded shadow-sm">
        <p className="text-xs text-gray-400 text-center py-4">
          {language === 'am'
            ? 'ትዕዛዞችን በመጫን ላይ...'
            : 'Loading orders...'}
        </p>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="bg-white p-4 border rounded shadow-sm">

      <h2 className="text-sm font-bold text-gray-700 mb-3">
        {language === 'am'
          ? 'የትዕዛዝ ሁኔታ'
          : 'Live Order Tracker'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

        {orders.length === 0 ? (

          <p className="text-xs text-gray-400 italic col-span-full text-center py-4">
            {language === 'am'
              ? 'ምንም የሚጠበቅ ትዕዛዝ የለም'
              : 'No active orders processing.'}
          </p>

        ) : (

          orders.map((ord) => (

            <div
              key={ord.order_id}
              className="border p-3 rounded bg-gray-50 text-xs space-y-2"
            >

              {/* ORDER HEADER */}

              <div className="flex justify-between items-center font-bold border-b pb-1">

                <span>
                  Order #{ord.order_id}{' '}
                  (T-{ord.table_number})
                </span>

                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    ord.status === 'Ready'
                      ? 'bg-green-500 text-white animate-pulse'

                      : ord.status === 'Cooking'
                      ? 'bg-amber-500 text-white'

                      : ord.status === 'Awaiting_Bill'
                      ? 'bg-blue-500 text-white'

                      : ord.status === 'Served'
                      ? 'bg-purple-500 text-white'

                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {ord.status}
                </span>

              </div>

              {/* ITEM COUNT */}

              <div className="text-gray-500">
                Items:{' '}
                {ord.item_count || 0}
              </div>

              {/* 
              |--------------------------------------------------------------------------
              | READY
              |--------------------------------------------------------------------------
              */}

              {ord.status === 'Ready' && (

                <div className="mt-2 p-2 rounded bg-green-100 text-green-800 font-bold">
                  🔔{' '}
                  {language === 'am'
                    ? 'ትዕዛዙ ዝግጁ ነው! እባክዎ ይውሰዱት።'
                    : 'Order is ready! Please pick it up.'}
                </div>

              )}

              {/* 
              |--------------------------------------------------------------------------
              | SERVED → REQUEST BILL
              |--------------------------------------------------------------------------
              */}

              {ord.status === 'Served' && (

                <div className="mt-2 space-y-2">

                  <div className="p-2 rounded bg-purple-50 text-purple-700 font-semibold">
                    ✓{' '}
                    {language === 'am'
                      ? 'ትዕዛዙ ተሰጥቷል። የክፍያ ሂሳብ መጠየቅ ይችላሉ።'
                      : 'Order served. You can now request the bill.'}
                  </div>

                  <button
                    onClick={() =>
                      handleRequestBill(
                        ord.order_id
                      )
                    }
                    disabled={
                      requestingBill ===
                      ord.order_id
                    }
                    className={`w-full py-2 px-3 rounded font-bold text-white transition ${
                      requestingBill ===
                      ord.order_id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >

                    {requestingBill ===
                    ord.order_id
                      ? (
                        language === 'am'
                          ? 'ለካሺየር በመላክ ላይ...'
                          : 'Sending to Cashier...'
                      )
                      : (
                        language === 'am'
                          ? '💳 የክፍያ ሂሳብ ይጠይቁ'
                          : '💳 Request Bill'
                      )}

                  </button>

                </div>

              )}

              {/* 
              |--------------------------------------------------------------------------
              | AWAITING BILL
              |--------------------------------------------------------------------------
              */}

              {ord.status === 'Awaiting_Bill' && (

                <div className="mt-2 p-2 rounded bg-blue-100 text-blue-800 font-bold">

                  💳{' '}
                  {language === 'am'
                    ? 'የክፍያ ሂሳብ ለካሺየር ተልኳል።'
                    : 'Bill request sent to cashier.'}

                </div>

              )}

            </div>

          ))

        )}

      </div>

    </div>
  );
};

export default OrderStatus;

