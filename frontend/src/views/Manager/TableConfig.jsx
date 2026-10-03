import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icons = {
  tables: (className = 'w-5 h-5') => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M7 17v3M17 17v3M7 7V4M17 7V4" />
    </svg>
  ),

  plus: (className = 'w-5 h-5') => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),

  trash: (className = 'w-4 h-4') => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  ),

  users: (className = 'w-4 h-4') => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M17 11a3 3 0 1 0-1.5-5.6M21 20v-1.5a4 4 0 0 0-3-3.87" />
    </svg>
  ),
};

const TableConfig = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [section, setSection] = useState('Main Hall');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = useContext(AuthContext);

  const fetchTables = async () => {
    try {
      setError('');

      const response = await fetch('http://localhost:5000/api/v1/tables', {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch tables.');
      }

      setTables(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [token]);

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
        body: JSON.stringify({
          table_number: tableNumber,
          capacity,
          section,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setSuccess(`Table #${data.table.table_number} added successfully.`);
      setTableNumber('');

      await fetchTables();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTable = async (tableId, num) => {
    if (!window.confirm(`Are you sure you want to remove Table #${num}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/tables/${tableId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setSuccess(`Table #${num} deleted.`);
      await fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'Occupied':
        return 'bg-red-50 text-red-700 border-red-200';

      case 'Awaiting_Bill':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Add Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h3 className="font-semibold text-slate-900">
            Add a table
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Add a new table to your restaurant floor plan.
          </p>
        </div>

        <form
          onSubmit={handleCreateTable}
          className="grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-3"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Table number
            </label>

            <input
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
              placeholder="e.g. 1"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Seating capacity
            </label>

            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
              placeholder="e.g. 4"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Section / zone
            </label>

            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              required
              placeholder="Main Hall, Terrace, VIP"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 ${
                isSubmitting
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer'
              }`}
            >
              {Icons.plus('w-4 h-4')}
              {isSubmitting ? 'Adding table...' : 'Add table'}
            </button>
          </div>
        </form>
      </section>

      {/* Floor Plan */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-semibold text-slate-900">
              Current floor layout
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {tables.length} table{tables.length !== 1 ? 's' : ''} configured
            </p>
          </div>

          <div className="text-sm text-slate-400">
            Live status
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading floor layout...
            </div>
          ) : tables.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {Icons.tables('w-5 h-5')}
              </div>

              <p className="text-sm font-medium text-slate-700">
                No tables configured
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add your first table using the form above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {tables.map((tbl) => (
                <div
                  key={tbl.table_id}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">
                        {tbl.section}
                      </p>

                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        T-{tbl.table_number}
                      </p>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      {Icons.tables('w-4 h-4')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    {Icons.users('w-3.5 h-3.5')}
                    {tbl.capacity} seats
                  </div>

                  <div className="mt-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${getStatusClasses(
                        tbl.status
                      )}`}
                    >
                      {tbl.status}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteTable(tbl.table_id, tbl.table_number)
                    }
                    className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    {Icons.trash()}
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TableConfig;