import React, { useState } from 'react';

const InverntoryToggle = ({ menuItems = [], onToggleStock }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = menuItems.filter((item) =>
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">86 List / Inventory Control</h3>
          <p className="text-xs text-gray-500">Toggle item availability when ingredients run out</p>
        </div>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-64"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
        {filteredItems.map((item) => {
          const isAvailable = item.is_available ?? item.in_stock ?? true;

          return (
            <div
              key={item.item_id || item.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <span className="text-xs font-bold text-gray-800 block">{item.name}</span>
                <span className="text-[10px] text-gray-500">${parseFloat(item.price || 0).toFixed(2)}</span>
              </div>
              <button
                onClick={() => onToggleStock(item.item_id || item.id, !isAvailable)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  isAvailable
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {isAvailable ? 'In Stock' : 'Out of Stock'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InverntoryToggle;