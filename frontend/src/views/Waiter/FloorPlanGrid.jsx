import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const FloorPlanGrid = ({ language, selectedTable, onSelectTable }) => {
  const { token } = useContext(AuthContext);
  const [tables, setTables] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/v1/tables', {
      headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
    })
      .then((res) => res.json())
      .then((data) => setTables(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, [token]);

  return (
    <div className="bg-white p-4 border rounded shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-3">
        {language === 'am' ? 'ጠረጴዛ ይምረጡ' : 'Select a Table'}
      </h2>

      {/* Grid adapts cleanly across all device screen sizes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables.map((tbl) => (
          <button
            key={tbl.table_id}
            onClick={() => onSelectTable(tbl)}
            className={`p-4 rounded border text-center font-bold transition flex flex-col items-center ${
              selectedTable?.table_id === tbl.table_id
                ? 'bg-blue-600 text-white border-blue-600'
                : tbl.status === 'Occupied'
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-green-50 text-green-700 border-green-300'
            }`}
          >
            <span className="text-lg">T-{tbl.table_number}</span>
            <span className="text-xs uppercase mt-1">{tbl.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FloorPlanGrid;