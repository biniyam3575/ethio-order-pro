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


  const fetchLiveOrders = async () => {
    try {
      const activeToken =
        token || localStorage.getItem('token');

      if (!activeToken) return;

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


  useEffect(() => {
    fetchLiveOrders();

    // Refresh every 3 seconds
    const interval = setInterval(
      fetchLiveOrders,
      3000
    );

    return () => clearInterval(interval);
  }, [token]);


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
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {ord.status}
                </span>

              </div>


              <div className="text-gray-500">
                Items:{' '}
                {ord.item_count || 0}
              </div>


              {/* Ready message */}
              {ord.status === 'Ready' && (
                <div className="mt-2 p-2 rounded bg-green-100 text-green-800 font-bold">
                  🔔{' '}
                  {language === 'am'
                    ? 'ትዕዛዙ ዝግጁ ነው! እባክዎ ይውሰዱት።'
                    : 'Order is ready! Please pick it up.'}
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