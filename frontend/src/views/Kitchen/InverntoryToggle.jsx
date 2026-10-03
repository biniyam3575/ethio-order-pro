import React, { useState } from 'react';

const Icon = ({ name, size = 18 }) => {
  const common = {
    width: size,
    height: size,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),

    package: (
      <>
        <path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" />
        <path d="M4 7l8 4 8-4" />
        <path d="M12 11v10" />
      </>
    ),

    check: (
      <>
        <path d="M5 12l4 4L19 6" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
};

const InverntoryToggle = ({
  menuItems = [],
  onToggleStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = menuItems.filter((item) =>
    (item.name || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 shrink-0">
                <Icon name="package" size={16} />
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                86 List / Inventory Control
              </h3>
            </div>

            <p className="text-xs text-gray-500 mt-1">
              Toggle item availability when ingredients run out
            </p>
          </div>

          {/* ====================================================
              SEARCH
          ==================================================== */}

          <div className="relative w-full sm:w-64">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Icon name="search" size={15} />
            </div>

            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="
                w-full
                h-10
                pl-9
                pr-3
                text-xs
                text-gray-800
                bg-white
                border
                border-gray-300
                rounded-lg
                outline-none
                focus:border-gray-500
                focus:ring-1
                focus:ring-gray-300
                transition
              "
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          INVENTORY LIST
      ======================================================== */}

      <div className="p-4">
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 mb-3">
              <Icon name="search" size={17} />
            </div>

            <p className="text-sm font-semibold text-gray-800">
              No items found
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isAvailable =
                item.is_available ??
                item.in_stock ??
                true;

              return (
                <div
                  key={item.item_id || item.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                    p-3
                    bg-gray-50
                    border
                    border-gray-200
                    rounded-lg
                  "
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-gray-800 truncate">
                      {item.name}
                    </span>

                    <span className="block mt-0.5 text-[10px] text-gray-500">
                      ${parseFloat(
                        item.price || 0
                      ).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onToggleStock(
                        item.item_id || item.id,
                        !isAvailable
                      )
                    }
                    title={
                      isAvailable
                        ? 'Mark out of stock'
                        : 'Mark in stock'
                    }
                    className={`
                      shrink-0
                      min-h-[36px]
                      px-3
                      py-1.5
                      rounded-lg
                      border
                      text-[10px]
                      sm:text-xs
                      font-semibold
                      cursor-pointer
                      transition
                      ${
                        isAvailable
                          ? `
                            bg-white
                            text-gray-700
                            border-gray-300
                            hover:bg-gray-100
                            hover:text-black
                          `
                          : `
                            bg-gray-900
                            text-white
                            border-gray-900
                            hover:bg-gray-800
                          `
                      }
                    `}
                  >
                    {isAvailable
                      ? 'In Stock'
                      : 'Out of Stock'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InverntoryToggle;