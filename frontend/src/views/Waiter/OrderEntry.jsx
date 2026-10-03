import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icons = {
  order: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 3h12v18H6z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  ),

  plus: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),

  minus: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
    </svg>
  ),

  close: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),

  cart: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  ),

  arrow: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),

  alert: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3l9 17H3L12 3Z" />
      <path d="M12 9v4M12 16h.01" />
    </svg>
  ),

  check: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),
};

const OrderEntry = ({ selectedTable, onOrderSubmitted, onCancel }) => {
  const { token, user } = useContext(AuthContext);

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /*
  |--------------------------------------------------------------------------
  | FETCH MENU
  |--------------------------------------------------------------------------
  | The waiter menu is refreshed every 2 seconds so availability changes
  | made by Kitchen, Bar, or Hot Drinks appear without a page refresh.
  */
  useEffect(() => {
    let isMounted = true;

    const fetchMenu = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        }

        const response = await fetch(
          'http://localhost:5000/api/v1/menu',
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
          throw new Error(
            data.message || 'Failed to fetch menu.'
          );
        }

        const items = Array.isArray(data)
          ? data
          : data.items || [];

        if (!isMounted) return;

        setMenuItems(items);

        /*
        |--------------------------------------------------------------------------
        | UPDATE CATEGORIES
        |--------------------------------------------------------------------------
        | Categories are rebuilt from the latest menu data so newly added
        | categories also appear without refreshing the page.
        */
        const cats = [
          'All',
          ...new Set(
            items.map((i) => i.category || 'General')
          ),
        ];

        setCategories(cats);

        /*
        |--------------------------------------------------------------------------
        | CLEAR MENU FETCH ERROR
        |--------------------------------------------------------------------------
        | If a previous background refresh failed but a later refresh works,
        | remove the old error.
        */
        setError('');
      } catch (err) {
        /*
        |--------------------------------------------------------------------------
        | IMPORTANT
        |--------------------------------------------------------------------------
        | Do not replace the existing menu with an empty list when a background
        | refresh temporarily fails.
        |
        | This prevents a short network problem from making the whole menu
        | disappear.
        */
        if (isMounted && isInitialLoad) {
          setError(err.message);
        }
      } finally {
        if (isMounted && isInitialLoad) {
          setLoading(false);
        }
      }
    };

    fetchMenu(true);

    /*
    |--------------------------------------------------------------------------
    | LIVE MENU REFRESH
    |--------------------------------------------------------------------------
    | Every 2 seconds the waiter checks the latest menu availability.
    */
    const intervalId = setInterval(() => {
      fetchMenu(false);
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | ADD TO CART
  |--------------------------------------------------------------------------
  | Unavailable items cannot be added even if a click somehow reaches
  | this function.
  */
  const addToCart = (item) => {
    if (item.is_available === false) {
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find(
        (ci) => ci.item_id === item.item_id
      );

      if (existing) {
        return prevCart.map((ci) =>
          ci.item_id === item.item_id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }

      return [
        ...prevCart,
        {
          ...item,
          quantity: 1,
          note: '',
        },
      ];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((ci) => {
          if (ci.item_id === itemId) {
            const newQty = ci.quantity + delta;

            return newQty > 0
              ? { ...ci, quantity: newQty }
              : null;
          }

          return ci;
        })
        .filter(Boolean)
    );
  };

  const updateNote = (itemId, note) => {
    setCart((prevCart) =>
      prevCart.map((ci) =>
        ci.item_id === itemId
          ? { ...ci, note }
          : ci
      )
    );
  };

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + parseFloat(item.price) * item.quantity,
    0
  );

  const serviceCharge = subtotal * 0.10;
  const taxableTotal = subtotal + serviceCharge;
  const vatAmount = taxableTotal * 0.15;
  const grandTotal = taxableTotal + vatAmount;

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  /*
  |--------------------------------------------------------------------------
  | SUBMIT ORDER
  |--------------------------------------------------------------------------
  */
  const handleSubmitOrder = async () => {
    if (!selectedTable) {
      return alert('Please select a table first.');
    }

    if (cart.length === 0) {
      return alert('Cart is empty.');
    }

    /*
    |--------------------------------------------------------------------------
    | LIVE AVAILABILITY CHECK
    |--------------------------------------------------------------------------
    | The menu is refreshed every 2 seconds, but we also check the current
    | menu state immediately before submitting.
    |
    | This handles the case where:
    | - waiter adds an item to cart
    | - station marks that item unavailable
    | - waiter tries to submit
    |--------------------------------------------------------------------------
    */
    const unavailableItems = cart.filter((cartItem) => {
      const latestItem = menuItems.find(
        (menuItem) => menuItem.item_id === cartItem.item_id
      );

      return (
        latestItem &&
        latestItem.is_available === false
      );
    });

    if (unavailableItems.length > 0) {
      const itemNames = unavailableItems
        .map((item) => item.name)
        .join(', ');

      setError(
        `${itemNames} ${
          unavailableItems.length === 1 ? 'is' : 'are'
        } currently out of stock. Please remove ${
          unavailableItems.length === 1 ? 'it' : 'them'
        } from the order.`
      );

      return;
    }

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

      const response = await fetch(
        'http://localhost:5000/api/v1/orders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${
              token || localStorage.getItem('token')
            }`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to submit order.'
        );
      }

      setCart([]);

      if (onOrderSubmitted) {
        onOrderSubmitted(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems =
    selectedCategory === 'All'
      ? menuItems
      : menuItems.filter(
          (i) =>
            (i.category || 'General') ===
            selectedCategory
        );

  return (
    <div className="space-y-3">

      {/* Compact Table Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            {Icons.order('w-4 h-4')}
          </div>

          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="font-bold text-slate-900">
              Table #{selectedTable?.table_number}
            </span>

            {selectedTable?.section && (
              <>
                <span className="text-slate-300">•</span>
                <span className="truncate text-slate-500">
                  {selectedTable.section}
                </span>
              </>
            )}

            {selectedTable?.capacity && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                  {selectedTable.capacity} seats
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
        >
          {Icons.close('w-3.5 h-3.5')}
          Change
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {Icons.alert('w-4 h-4 shrink-0 mt-0.5')}
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">

        {/* ================= MENU ================= */}
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white">

          {/* Menu Header */}
          <div className="border-b border-slate-200 px-3 py-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex min-w-0 items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Menu
                </h3>

                <span className="text-[10px] text-slate-400">
                  {filteredItems.length} items
                </span>
              </div>

              {/* Categories */}
              <div className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5 sm:max-w-[70%]">
                {categories.map((cat) => {
                  const active =
                    selectedCategory === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(cat)
                      }
                      className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No menu items
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  There are no items in this category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">

                {filteredItems.map((item) => {
                  const isAvailable =
                    item.is_available !== false;

                  return (
                    <button
                      key={item.item_id}
                      type="button"
                      onClick={() => addToCart(item)}
                      disabled={!isAvailable}
                      className={`group relative min-w-0 rounded-lg border p-2.5 text-left transition ${
                        isAvailable
                          ? 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                          : 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">

                        <div className="min-w-0">
                          <h4
                            className={`truncate text-xs font-bold ${
                              isAvailable
                                ? 'text-slate-900'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.name}
                          </h4>

                          <p className="mt-1 truncate text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            {item.station || 'Kitchen'}
                          </p>
                        </div>

                        {isAvailable ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white group-hover:bg-amber-600">
                            {Icons.plus('w-3 h-3')}
                          </span>
                        ) : (
                          <span className="flex h-6 shrink-0 items-center justify-center rounded-md bg-slate-200 px-1.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Out
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <span
                          className={`text-xs font-bold ${
                            isAvailable
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {parseFloat(item.price).toFixed(2)}
                        </span>

                        <span className="text-[9px] text-slate-400">
                          ETB
                        </span>
                      </div>

                      {/* Out of Stock Label */}
                      {!isAvailable && (
                        <div className="mt-2 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
                          {Icons.close('w-3 h-3 text-slate-400')}

                          <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}

              </div>
            )}
          </div>
        </section>

        {/* ================= CURRENT ORDER ================= */}
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white lg:sticky lg:top-3 lg:self-start">

          {/* Order Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
            <div className="flex items-center gap-2">
              {Icons.cart('w-4 h-4 text-slate-700')}

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Current Order
                </h3>

                <p className="text-[9px] text-slate-400">
                  Table #{selectedTable?.table_number}
                </p>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
              {totalItems} items
            </span>
          </div>

          {/* Cart */}
          <div className="p-3">

            {cart.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400">
                  {Icons.cart('w-4 h-4')}
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-700">
                  Order is empty
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Select items from the menu.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">

                {cart.map((item) => {
                  const latestMenuItem = menuItems.find(
                    (menuItem) =>
                      menuItem.item_id === item.item_id
                  );

                  const isCurrentlyAvailable =
                    latestMenuItem?.is_available !== false;

                  return (
                    <div
                      key={item.item_id}
                      className={`rounded-lg border p-2.5 ${
                        isCurrentlyAvailable
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      {/* Item Name + Total */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`truncate text-xs font-bold ${
                                isCurrentlyAvailable
                                  ? 'text-slate-900'
                                  : 'text-red-700'
                              }`}
                            >
                              {item.name}
                            </p>

                            {!isCurrentlyAvailable && (
                              <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-600">
                                Out of Stock
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {parseFloat(item.price).toFixed(2)} ETB each
                          </p>
                        </div>

                        <span className="shrink-0 text-xs font-bold text-slate-900">
                          {(
                            parseFloat(item.price) *
                            item.quantity
                          ).toFixed(2)}{' '}
                          ETB
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="mt-2 flex items-center gap-1.5">

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.item_id,
                              -1
                            )
                          }
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          {Icons.minus('w-3 h-3')}
                        </button>

                        <span className="flex h-7 min-w-7 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-bold text-slate-900">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.item_id,
                              1
                            )
                          }
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                        >
                          {Icons.plus('w-3 h-3')}
                        </button>

                        <input
                          type="text"
                          placeholder="Note..."
                          value={item.note}
                          onChange={(e) =>
                            updateNote(
                              item.item_id,
                              e.target.value
                            )
                          }
                          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                        />
                      </div>
                    </div>
                  );
                })}

              </div>
            )}

            {/* Totals */}
            <div className="mt-3 border-t border-slate-200 pt-3">

              <div className="space-y-1.5 text-[10px]">

                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {subtotal.toFixed(2)} ETB
                  </span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Service 10%</span>
                  <span className="font-semibold text-slate-900">
                    {serviceCharge.toFixed(2)} ETB
                  </span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>VAT 15%</span>
                  <span className="font-semibold text-slate-900">
                    {vatAmount.toFixed(2)} ETB
                  </span>
                </div>

              </div>

              {/* Grand Total */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-xs font-bold text-slate-700">
                  Total
                </span>

                <span className="text-lg font-bold text-slate-900">
                  {grandTotal.toFixed(2)} ETB
                </span>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={
                  submitting || cart.length === 0
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Order
                    {Icons.arrow('w-3.5 h-3.5')}
                  </>
                )}
              </button>

            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OrderEntry;