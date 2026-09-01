import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hot Beverages');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [station, setStation] = useState('Kitchen');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = useContext(AuthContext);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/menu', {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch menu items.');
      setMenuItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/v1/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name,
          category,
          price: parseFloat(price),
          description,
          station,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create menu item.');

      setSuccess(`"${data.item.name}" added to menu!`);
      setName('');
      setPrice('');
      setDescription('');
      setStation('Kitchen');
      fetchMenuItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (itemId, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/menu/${itemId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ is_available: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update availability.');
      fetchMenuItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    const confirmed = window.confirm(`⚠️ Are you sure you want to permanently delete "${itemName}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:5000/api/v1/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSuccess(`"${itemName}" deleted permanently.`);
      fetchMenuItems();
    } catch (err) {
      alert(`❌ Action Blocked:\n${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Menu Item</h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

        <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900"
              placeholder="e.g. Special Macchiato"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900"
              placeholder="e.g. Hot Beverages, Mains"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price (ETB)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900"
              placeholder="150.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Preparation Station</label>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900 bg-white"
            >
              <option value="Kitchen">Kitchen</option>
              <option value="Bar">Bar / Drinks</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900"
              placeholder="e.g. Served with fresh butter"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition"
            >
              {isSubmitting ? 'Saving Item...' : 'Add Menu Item'}
            </button>
          </div>
        </form>
      </div>

      {/* Menu Table */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Active Menu Items</h2>

        {loading ? (
          <p className="text-gray-500">Loading menu...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Station</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {menuItems.map((item) => (
                  <tr key={item.item_id}>
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4">{item.category}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded border">
                        {item.station || 'Kitchen'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{parseFloat(item.price).toFixed(2)} ETB</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.is_available ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handleToggleAvailability(item.item_id, item.is_available)}
                        className={`px-3 py-1 text-xs font-medium rounded transition ${
                          item.is_available
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {item.is_available ? 'Out of Stock' : 'In Stock'}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.item_id, item.name)}
                        className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManagement;