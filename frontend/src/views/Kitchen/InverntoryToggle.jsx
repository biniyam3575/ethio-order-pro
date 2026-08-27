import React from 'react';

const InverntoryToggle = ({ menuItems, onToggleStock }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h2 className="text-lg font-bold text-gray-800 mb-2">Kitchen Quick Stock Control</h2>
      <p className="text-xs text-gray-500 mb-6">
        Toggle items off when ingredients run out. This updates instantly across waiter ordering screens and manager dashboards.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <div
            key={item.item_id}
            className="p-4 border rounded-lg flex items-center justify-between bg-gray-50"
          >
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
              <p className="text-xs text-gray-500">{item.category}</p>
            </div>

            <button
              onClick={() => onToggleStock(item.item_id, item.is_available)}
              className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                item.is_available
                  ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                  : 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200'
              }`}
            >
              {item.is_available ? 'In Stock' : 'Out of Stock'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InverntoryToggle;