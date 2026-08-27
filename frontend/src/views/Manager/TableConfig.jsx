import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const TableConfig = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [section, setSection] = useState('Main Hall');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = useContext(AuthContext);

  const fetchTables = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/tables', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch tables.');
      setTables(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleCreateTable = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/v1/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ table_number: tableNumber, capacity, section }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSuccess(`Table #${data.table.table_number} added successfully!`);
      setTableNumber('');
      fetchTables();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTable = async (tableId, num) => {
    if (!window.confirm(`Are you sure you want to remove Table #${num}?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/v1/tables/${tableId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSuccess(`Table #${num} deleted.`);
      fetchTables();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Table Form */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Add Table to Floor Plan</h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

        <form onSubmit={handleCreateTable} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Table Number</label>
            <input
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900"
              placeholder="e.g. 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Seating Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900"
              placeholder="e.g. 4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Section / Zone</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 text-gray-900"
              placeholder="e.g. Main Hall, Terrace, VIP"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition"
            >
              {isSubmitting ? 'Adding Table...' : 'Add Table'}
            </button>
          </div>
        </form>
      </div>

      {/* Visual Floor Layout Cards */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Current Floor Layout</h2>

        {loading ? (
          <p className="text-gray-500">Loading floor layout...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((tbl) => (
              <div
                key={tbl.table_id}
                className="p-4 border rounded-lg bg-gray-50 flex flex-col items-center justify-between shadow-sm relative"
              >
                <div className="text-xs font-semibold text-blue-600 uppercase mb-1">
                  {tbl.section}
                </div>
                
                <div className="text-2xl font-bold text-gray-800">T-{tbl.table_number}</div>
                <div className="text-xs text-gray-500 mt-1">👥 {tbl.capacity} Seats</div>

                {/* Dynamic Status Badge */}
                <span
                  className={`mt-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                    tbl.status === 'Available'
                      ? 'bg-green-100 text-green-700'
                      : tbl.status === 'Occupied'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {tbl.status}
                </span>

                <button
                  onClick={() => handleDeleteTable(tbl.table_id, tbl.table_number)}
                  className="mt-3 w-full text-xs bg-red-100 text-red-600 py-1 rounded hover:bg-red-200 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TableConfig;