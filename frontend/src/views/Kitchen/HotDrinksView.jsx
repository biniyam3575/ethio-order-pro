import React, { useState, useEffect, useContext } from 'react';
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

  const fetchHotDrinksData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token || localStorage.getItem('token')}` };
      const [ticketsRes, menuRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/orders/kitchen?station=Hot%20Drinks', { headers }),
        fetch('http://localhost:5000/api/v1/menu', { headers }),
      ]);

      const ticketsJson = await ticketsRes.json();
      const menuJson = await menuRes.json();

      if (!ticketsRes.ok) throw new Error(ticketsJson.message || 'Failed to fetch tickets.');

      setTickets(Array.isArray(ticketsJson) ? ticketsJson : (ticketsJson.data || []));
      setMenuItems(Array.isArray(menuJson) ? menuJson : (menuJson.data || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotDrinksData();
    const interval = setInterval(fetchHotDrinksData, 5000);
    return () => clearInterval(interval);
  }, [token]);

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

      fetchHotDrinksData();
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
      fetchHotDrinksData();
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 max-w-7xl mx-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-gray-600 font-medium">Loading hot drinks terminal...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            ☕ Hot Drinks Station Terminal
          </h1>
          <p className="text-xs text-gray-500 font-medium">Coffee, Tea & Hot Beverage Queue</p>
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
            onClick={fetchHotDrinksData}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg ml-2 transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-200">{error}</div>}

      {activeTab === 'queue' ? (
        <TicketQueue tickets={tickets} onUpdateItemStatus={handleUpdateItemStatus} />
        ) : (
        <InventoryToggle 
            menuItems={menuItems.filter(item => item.station === 'Hot Drinks')} 
            onToggleStock={handleToggleStock} 
        />
        )}
    </div>
  );
};

export default HotDrinksView;