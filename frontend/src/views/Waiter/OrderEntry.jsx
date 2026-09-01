import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const OrderEntry = ({ selectedTable, onOrderSubmitted, onCancel }) => {
  const { token, user } = useContext(AuthContext);

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch Menu Items
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/v1/menu', {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch menu.');
        
        const items = Array.isArray(data) ? data : data.items || [];
        setMenuItems(items);

        // Extract unique categories dynamically
        const cats = ['All', ...new Set(items.map((i) => i.category || 'General'))];
        setCategories(cats);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [token]);

  // Cart Handlers
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existing = prevCart.find((ci) => ci.item_id === item.item_id);
      if (existing) {
        return prevCart.map((ci) =>
          ci.item_id === item.item_id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prevCart, { ...item, quantity: 1, note: '' }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((ci) => {
          if (ci.item_id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean)
    );
  };

  const updateNote = (itemId, note) => {
    setCart((prevCart) =>
      prevCart.map((ci) => (ci.item_id === itemId ? { ...ci, note } : ci))
    );
  };

  // Tax calculations matching system specifications (10% Service Charge + 15% VAT)
  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const serviceCharge = subtotal * 0.10;
  const taxableTotal = subtotal + serviceCharge;
  const vatAmount = taxableTotal * 0.15;
  const grandTotal = taxableTotal + vatAmount;

  // Submit Order to Backend
  const handleSubmitOrder = async () => {
    if (!selectedTable) return alert('Please select a table first.');
    if (cart.length === 0) return alert('Cart is empty.');

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        table_id: selectedTable.table_id,
        waiter_id: user?.staff_id,
        items: cart.map((ci) => ({
          item_id: ci.item_id,
          quantity: ci.quantity,
          note: ci.note || '',
        })),
      };

      const response = await fetch('http://localhost:5000/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit order.');

      setCart([]);
      if (onOrderSubmitted) onOrderSubmitted(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems =
    selectedCategory === 'All'
      ? menuItems
      : menuItems.filter((i) => (i.category || 'General') === selectedCategory);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu Catalog Section */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Menu Items — <span className="text-blue-600">Table #{selectedTable?.table_number}</span>
          </h3>
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            ✕ Change Table
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 py-6 text-center">Loading menu catalog...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <button
                key={item.item_id}
                onClick={() => addToCart(item)}
                className="p-3 border border-gray-200 rounded-xl text-left bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition flex flex-col justify-between group"
              >
                <div>
                  <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-700">
                    {item.name}
                  </h4>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                    Station: {item.station || 'Kitchen'}
                  </span>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-sm font-black text-gray-900">
                    {parseFloat(item.price).toFixed(2)} ETB
                  </span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                    + Add
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary & Checkout */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
            Current Order Ticket
          </h3>

          {error && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-lg mb-3 text-xs border border-red-200">
              {error}
            </div>
          )}

          {cart.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              🛒 Click menu items to add them to this ticket.
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.item_id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm"
                >
                  <div className="flex justify-between items-start font-bold text-gray-800">
                    <span>{item.name}</span>
                    <span>{(parseFloat(item.price) * item.quantity).toFixed(2)} ETB</span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <input
                      type="text"
                      placeholder="Add note (e.g. No onions)"
                      value={item.note}
                      onChange={(e) => updateNote(item.item_id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 w-2/3 bg-white text-gray-900"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.item_id, -1)}
                        className="w-6 h-6 rounded bg-gray-200 font-bold hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.item_id, 1)}
                        className="w-6 h-6 rounded bg-gray-200 font-bold hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total Calculations */}
        <div className="mt-6 pt-4 border-t border-gray-200 space-y-1.5 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-900">{subtotal.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between">
            <span>Service Charge (10%)</span>
            <span className="font-semibold text-gray-900">{serviceCharge.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (15%)</span>
            <span className="font-semibold text-gray-900">{vatAmount.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t">
            <span>Grand Total</span>
            <span className="text-blue-600">{grandTotal.toFixed(2)} ETB</span>
          </div>

          <button
            onClick={handleSubmitOrder}
            disabled={submitting || cart.length === 0}
            className="w-full mt-4 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Submitting Ticket...' : '🚀 Send Order to Stations'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderEntry;