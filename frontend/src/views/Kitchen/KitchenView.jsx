import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import TicketQueue from './TicketQueue';
import InverntoryToggle from './InverntoryToggle';
import Navbar from '../../components/Navbar';

const KitchenView = () => {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');
  const [language, setLanguage] = useState('en');
  const { token } = useContext(AuthContext);

  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/orders/kitchen', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error('Failed to fetch kitchen orders:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/menu', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      if (res.ok) setMenuItems(await res.json());
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    fetchMenuItems();
    const interval = setInterval(fetchKitchenOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStock = async (itemId, currentStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/menu/${itemId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ is_available: !currentStatus }),
      });

      if (res.ok) {
        setMenuItems((prev) =>
          prev.map((item) =>
            item.item_id === itemId ? { ...item, is_available: !currentStatus } : item
          )
        );
      }
    } catch (err) {
      alert('Failed to update stock status.');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) fetchKitchenOrders();
    } catch (err) {
      alert('Failed to update order status.');
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading Kitchen Display System...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Header */}
      <Navbar
        currentRoleTitle={language === 'am' ? 'ወጥ ቤት' : 'Kitchen'}
        language={language}
        setLanguage={setLanguage}
      />

      <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800 text-white p-4 rounded-lg shadow">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {language === 'am' ? '🍳 የኩሽና ማዘዣ ስርዓት' : '🍳 Kitchen Display System'}
            </h1>
            <p className="text-xs text-gray-300">
              {language === 'am' ? 'የቀጥታ ትዕዛዞች ማስተካከያ' : 'Real-time ticket processing & inventory control'}
            </p>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-semibold rounded transition ${
                activeTab === 'tickets' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {language === 'am' ? '📋 የትዕዛዝ ወረቀቶች' : '📋 Order Tickets'}
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-semibold rounded transition ${
                activeTab === 'stock' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {language === 'am' ? '📦 የእቃ ሁኔታ' : '📦 Quick Stock'}
            </button>
          </div>
        </div>

        {activeTab === 'tickets' ? (
          <TicketQueue orders={orders} onUpdateStatus={handleUpdateOrderStatus} language={language} />
        ) : (
          <InverntoryToggle menuItems={menuItems} onToggleStock={handleToggleStock} language={language} />
        )}
      </main>
    </div>
  );
};

export default KitchenView;