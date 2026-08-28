import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const OrderEntry = ({ language, selectedTable, onOrderSent }) => {
  const { user, token } = useContext(AuthContext);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load available menu items
  useEffect(() => {
    fetch('http://localhost:5000/api/v1/menu', {
      headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
    })
      .then((res) => res.json())
      .then((data) => setMenuItems(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Menu load error:', err));
  }, [token]);

  // Add item or increment quantity
  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.item_id === item.item_id);
      if (exists) {
        return prev.map((i) => (i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1, note: '' }];
    });
  };

  // Adjust quantity (+ / -)
  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.item_id === itemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  // Remove individual item
  const removeItem = (itemId) => {
    setCart((prev) => prev.filter((i) => i.item_id !== itemId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
  };

  // Update kitchen notes per item
  const updateNote = (itemId, note) => {
    setCart((prev) => prev.map((i) => (i.item_id === itemId ? { ...i, note } : i)));
  };

  // Calculate bill totals
  const subtotal = cart.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0);

  // Submit order to API
  const handleSubmit = async () => {
    if (!selectedTable) {
      return alert(language === 'am' ? 'እባክዎ መጀመሪያ ጠረጴዛ ይምረጡ' : 'Select a table first!');
    }
    if (cart.length === 0) {
      return alert(language === 'am' ? 'ትዕዛዙ ባዶ ነው' : 'Cart is empty!');
    }

    // Safely retrieve staff_id matching the schema key
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const activeStaffId = user?.staff_id || user?.id || storedUser.staff_id || storedUser.id;

    if (!activeStaffId) {
      return alert('User session invalid. Staff ID is missing from local storage.');
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          table_id: selectedTable.table_id,
          waiter_id: activeStaffId, // Matches staff_id constraint
          items: cart,
          subtotal: subtotal,
          service_charge: subtotal * 0.1,
          vat_amount: subtotal * 0.15,
          total_amount: subtotal * 1.25,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(language === 'am' ? 'ትዕዛዙ ወደ ወጥ ቤት ተልኳል!' : 'Order sent to kitchen!');
        setCart([]);
        if (onOrderSent) onOrderSent();
      } else {
        alert(`Error: ${data.message || 'Failed to send order'}`);
      }
    } catch (err) {
      alert('Network error. Check backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Menu Catalog Section */}
      <div className="md:col-span-2 bg-white p-4 border rounded shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3">
          {language === 'am' ? 'ምግብ / መጠጥ ይምረጡ' : 'Menu Catalog'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {menuItems.map((item) => (
            <button
              key={item.item_id}
              onClick={() => addToCart(item)}
              className="p-3 border rounded text-left hover:border-blue-500 bg-gray-50 flex flex-col justify-between transition"
            >
              <div className="font-bold text-xs sm:text-sm">{item.name}</div>
              <div className="text-xs text-blue-600 font-bold mt-2">
                {parseFloat(item.price).toFixed(2)} ETB
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Ticket Summary */}
      <div className="bg-white p-4 border rounded shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-sm font-bold text-gray-800">
            {selectedTable
              ? `Table T-${selectedTable.table_number}`
              : language === 'am'
              ? 'ጠረጴዛ አልተመረጠም'
              : 'No Table Selected'}
          </h2>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:underline font-bold"
            >
              {language === 'am' ? 'ሁሉንም አፅዳ' : 'Clear All'}
            </button>
          )}
        </div>

        {/* Selected Items */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-4">
              {language === 'am' ? 'ምንም አልተመረጠም' : 'Cart is empty'}
            </p>
          ) : (
            cart.map((i) => (
              <div key={i.item_id} className="border-b pb-2 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span>{i.name}</span>
                  <div className="flex items-center space-x-2">
                    <span>{(parseFloat(i.price) * i.quantity).toFixed(2)} ETB</span>
                    <button
                      onClick={() => removeItem(i.item_id)}
                      className="text-red-500 hover:text-red-700 font-bold px-1"
                      title="Remove Item"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => updateQuantity(i.item_id, -1)}
                      className="px-2 py-0.5 bg-gray-200 rounded font-bold hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="font-bold px-1.5 py-0.5">{i.quantity}</span>
                    <button
                      onClick={() => updateQuantity(i.item_id, 1)}
                      className="px-2 py-0.5 bg-gray-200 rounded font-bold hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Note"
                    value={i.note}
                    onChange={(e) => updateNote(i.item_id, e.target.value)}
                    className="border px-1.5 py-0.5 text-xs w-28 rounded"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total Summary */}
        <div className="border-t pt-3">
          <div className="flex justify-between font-bold text-sm mb-3">
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)} ETB</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!selectedTable || cart.length === 0 || loading}
            className={`w-full py-2 text-xs font-bold text-white rounded transition ${
              selectedTable && cart.length > 0 && !loading
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {loading
              ? language === 'am'
                ? 'እየላከ ነው...'
                : 'Sending...'
              : language === 'am'
              ? 'ወደ ወጥ ቤት ላክ'
              : 'Send to Kitchen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderEntry;