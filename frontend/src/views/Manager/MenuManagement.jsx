import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icons = {

  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),

  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M12 3v9" strokeLinecap="round" />
      <path d="M7.05 5.64a9 9 0 106.9 0" strokeLinecap="round" />
    </svg>
  ),
};

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [station, setStation] = useState('Kitchen');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = useContext(AuthContext);

  const fetchMenuItems = async () => {
    try {
      setError('');

      const response = await fetch(
        '/api/v1/menu',
        {
          headers: {
            Authorization: `Bearer ${
              token || localStorage.getItem('token')
            }`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load menu.');
      }

      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [token]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCategory('Food');
    setPrice('');
    setDescription('');
    setStation('Kitchen');
  };

  const handleStartEdit = (item) => {
    setEditingId(item.item_id);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price);
    setDescription(item.description || '');
    setStation(item.station || 'Kitchen');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const isEdit = Boolean(editingId);

    const url = isEdit
      ? `/api/v1/menu/${editingId}`
      : '/api/v1/menu';

    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${
            token || localStorage.getItem('token')
          }`,
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

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed.');
      }

      setSuccess(
        isEdit
          ? `"${name}" updated successfully.`
          : `"${data.item.name}" added to menu.`
      );

      resetForm();
      fetchMenuItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (
    itemId,
    currentStatus
  ) => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch(
        `/api/v1/menu/${itemId}/availability`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${
              token || localStorage.getItem('token')
            }`,
          },
          body: JSON.stringify({
            is_available: !currentStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to update availability.'
        );
      }

      setMenuItems((prevItems) =>
        prevItems.map((item) =>
          item.item_id === itemId
            ? { ...item, is_available: !currentStatus }
            : item
        )
      );

      setSuccess(
        `Item is now ${
          !currentStatus ? 'available' : 'out of stock'
        }.`
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${itemName}"?`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch(
        `/api/v1/menu/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${
              token || localStorage.getItem('token')
            }`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete item.');
      }

      setSuccess(`"${itemName}" was deleted.`);
      fetchMenuItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputClass = `
    w-full h-10 px-3
    bg-white border border-slate-200 rounded-lg
    text-sm text-slate-800 placeholder:text-slate-400
    outline-none transition
    focus:border-amber-400 focus:ring-2 focus:ring-amber-100
  `;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit item' : 'Add item'}
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              {editingId
                ? 'Change the item information.'
                : 'Add a new item to the menu.'}
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Item name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                placeholder="Special Macchiato"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Category
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="Food">Food</option>
                <option value="Drink">Drink</option>
                <option value="Pastry">Pastry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Price
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className={`${inputClass} pr-14`}
                  placeholder="150.00"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  ETB
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Station
              </label>

              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="Kitchen">Kitchen</option>
                <option value="Bar">Bar</option>
                <option value="Hot Drinks">Hot Drinks</option>
              </select>
            </div>

            <div className="sm:col-span-2 xl:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Description
              </label>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Short description (optional)"
              />
            </div>

            <div className="sm:col-span-2 xl:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full h-10
                  inline-flex items-center justify-center gap-2
                  rounded-lg
                  bg-black text-white
                  text-sm font-semibold
                  hover:bg-slate-800
                  transition
                  cursor-pointer
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                "
              >
                {editingId ? Icons.edit : Icons.plus}

                {isSubmitting
                  ? 'Saving...'
                  : editingId
                  ? 'Save changes'
                  : 'Add item'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Menu items
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Control prices, stations and availability.
            </p>
          </div>

          <span className="text-xs text-slate-500">
            {menuItems.length} items
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Loading menu...
          </div>
        ) : menuItems.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-600">
              No menu items
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Add your first item above.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Item
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Category
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Station
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Price
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {menuItems.map((item) => (
                    <tr
                      key={item.item_id}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-slate-800">
                          {item.name}
                        </p>

                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                            {item.description}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {item.category}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                          {item.station || 'Kitchen'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-slate-800">
                          {parseFloat(item.price).toFixed(2)}
                        </span>

                        <span className="ml-1 text-xs text-slate-400">
                          ETB
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`
                            inline-flex px-2 py-1 rounded-md
                            text-[11px] font-semibold
                            ${
                              item.is_available
                                ? 'bg-green-50 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }
                          `}
                        >
                          {item.is_available
                            ? 'Available'
                            : 'Out of stock'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleAvailability(
                                item.item_id,
                                item.is_available
                              )
                            }
                            className={`
                              inline-flex items-center gap-1.5
                              px-2.5 py-1.5 rounded-md
                              text-xs font-medium
                              transition cursor-pointer
                              ${
                                item.is_available
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                  : 'text-green-700 bg-green-50 hover:bg-green-100'
                              }
                            `}
                          >
                            {Icons.power}

                            {item.is_available
                              ? 'Set out'
                              : 'Set in'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                            title="Edit item"
                          >
                            {Icons.edit}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteItem(
                                item.item_id,
                                item.name
                              )
                            }
                            className="p-2 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                            title="Delete item"
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {menuItems.map((item) => (
                <div key={item.item_id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {item.name}
                      </p>

                      {item.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <span
                      className={`
                        flex-shrink-0 px-2 py-1 rounded-md
                        text-[10px] font-semibold
                        ${
                          item.is_available
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }
                      `}
                    >
                      {item.is_available
                        ? 'Available'
                        : 'Out of stock'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[11px] text-slate-400">
                        Category
                      </p>

                      <p className="text-xs text-slate-600 mt-0.5">
                        {item.category}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">
                        Station
                      </p>

                      <p className="text-xs text-slate-600 mt-0.5">
                        {item.station || 'Kitchen'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">
                        Price
                      </p>

                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {parseFloat(item.price).toFixed(2)} ETB
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleAvailability(
                          item.item_id,
                          item.is_available
                        )
                      }
                      className={`
                        flex-1 h-9
                        inline-flex items-center justify-center gap-1.5
                        rounded-lg text-xs font-medium
                        cursor-pointer
                        ${
                          item.is_available
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-green-50 text-green-700'
                        }
                      `}
                    >
                      {Icons.power}

                      {item.is_available
                        ? 'Set out'
                        : 'Set in'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      {Icons.edit}
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteItem(
                          item.item_id,
                          item.name
                        )
                      }
                      className="h-9 px-3 inline-flex items-center justify-center rounded-lg bg-red-50 text-red-600 cursor-pointer"
                    >
                      {Icons.trash}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default MenuManagement;
