import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const FloorPlanGrid = ({ onSelectTable, selectedTableId }) => {
  const { token } = useContext(AuthContext);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTables = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/tables', {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch floor plan.');
      
      // Ensure data is sorted cleanly by table number
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => a.table_number - b.table_number)
        : [];
      setTables(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    // Refresh table status every 15 seconds
    const interval = setInterval(fetchTables, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200';
      case 'Occupied':
        return 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
      case 'Awaiting_Bill':
        return 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200';
      case 'Reserved':
        return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 font-medium">Loading floor plan...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Floor Plan & Table Status</h2>
          <p className="text-sm text-gray-500">Select a table to take orders or view running tab</p>
        </div>
        <button
          onClick={fetchTables}
          className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Grid of Tables */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => {
          const isSelected = selectedTableId === table.table_id;
          return (
            <button
              key={table.table_id}
              onClick={() => onSelectTable(table)}
              className={`p-4 rounded-xl border-2 text-left flex flex-col justify-between transition-all duration-150 transform active:scale-95 ${getStatusBadge(
                table.status
              )} ${
                isSelected
                  ? 'ring-4 ring-blue-500 ring-offset-2 border-blue-600 shadow-md'
                  : ''
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-lg font-black tracking-tight">
                  T-{table.table_number}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 backdrop-blur-sm">
                  {table.capacity || 4} Seats
                </span>
              </div>

              <div className="mt-4">
                <span className="text-xs font-semibold block capitalize">
                  ● {table.status.replace('_', ' ')}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Available
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span> Occupied (Ordering)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span> Awaiting Bill
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span> Reserved
        </div>
      </div>
    </div>
  );
};

export default FloorPlanGrid;