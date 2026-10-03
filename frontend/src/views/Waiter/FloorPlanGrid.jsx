import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icon = ({ name, size = 16 }) => {
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
    table: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 17v3M17 17v3M7 7V4M17 7V4" />
      </>
    ),

    users: (
      <>
        <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
        <circle cx="9.5" cy="7.5" r="3.5" />
        <path d="M17 11a3 3 0 1 0-1.5-5.6M21 20v-1.5a4 4 0 0 0-3-3.87" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4" />
        <path d="M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),

    alert: (
      <>
        <path d="M12 3l9 17H3L12 3Z" />
        <path d="M12 9v4M12 16h.01" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
};

const FloorPlanGrid = ({ onSelectTable, selectedTableId }) => {
  const { token } = useContext(AuthContext);

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ------------------------------------------------------------
  // Fetch tables
  // ------------------------------------------------------------

  const fetchTables = async () => {
    try {
      setError('');

      const response = await fetch(
        'http://localhost:5000/api/v1/tables',
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
          data.message || 'Failed to fetch tables.'
        );
      }

      const sortedTables = Array.isArray(data)
        ? [...data].sort(
            (a, b) =>
              Number(a.table_number) -
              Number(b.table_number)
          )
        : [];

      setTables(sortedTables);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const interval = setInterval(fetchTables, 15000);

    return () => clearInterval(interval);
  }, [token]);

  // ------------------------------------------------------------
  // Table status
  // ------------------------------------------------------------

  const getStatus = (status) => {
    switch (status) {
      case 'Available':
        return {
          label: 'Available',
          dot: 'bg-emerald-500',
          badge:
            'bg-emerald-50 text-emerald-700 border-emerald-200',
          border:
            'border-emerald-200 hover:border-emerald-300',
          icon:
            'bg-emerald-50 text-emerald-700',
        };

      case 'Occupied':
        return {
          label: 'Occupied',
          dot: 'bg-amber-500',
          badge:
            'bg-amber-50 text-amber-700 border-amber-200',
          border:
            'border-amber-200 hover:border-amber-300',
          icon:
            'bg-amber-50 text-amber-700',
        };

      case 'Awaiting_Bill':
        return {
          label: 'Awaiting Bill',
          dot: 'bg-purple-500',
          badge:
            'bg-purple-50 text-purple-700 border-purple-200',
          border:
            'border-purple-200 hover:border-purple-300',
          icon:
            'bg-purple-50 text-purple-700',
        };

      case 'Reserved':
        return {
          label: 'Reserved',
          dot: 'bg-blue-500',
          badge:
            'bg-blue-50 text-blue-700 border-blue-200',
          border:
            'border-blue-200 hover:border-blue-300',
          icon:
            'bg-blue-50 text-blue-700',
        };

      default:
        return {
          label: status || 'Unknown',
          dot: 'bg-slate-400',
          badge:
            'bg-slate-50 text-slate-600 border-slate-200',
          border:
            'border-slate-200 hover:border-slate-300',
          icon:
            'bg-slate-100 text-slate-600',
        };
    }
  };

  // ------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------

  const totalTables = tables.length;

  const availableTables = tables.filter(
    (table) => table.status === 'Available'
  ).length;

  const occupiedTables = tables.filter(
    (table) => table.status === 'Occupied'
  ).length;

  const awaitingBillTables = tables.filter(
    (table) => table.status === 'Awaiting_Bill'
  ).length;

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="border border-gray-200 bg-white rounded-lg p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />

          <p className="mt-3 text-xs font-semibold text-gray-700">
            Loading floor plan...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ========================================================
          COMPACT FLOOR PLAN HEADER
      ======================================================== */}

      <section className="border border-gray-200 bg-white rounded-lg">

        <div className="px-3 py-3 sm:px-4">

          <div className="flex items-center justify-between gap-3">

            {/* Title + summary */}
            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <Icon name="table" size={15} />
                </div>

                <h2 className="text-sm font-semibold text-gray-900">
                  Floor Plan
                </h2>

              </div>

              {/* Compact statistics */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-9">

                <span className="text-[10px] text-gray-500">
                  <strong className="text-gray-800">
                    {totalTables}
                  </strong>{' '}
                  Tables
                </span>

                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <strong className="text-gray-800">
                    {availableTables}
                  </strong>{' '}
                  Available
                </span>

                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <strong className="text-gray-800">
                    {occupiedTables}
                  </strong>{' '}
                  Occupied
                </span>

                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <strong className="text-gray-800">
                    {awaitingBillTables}
                  </strong>{' '}
                  Awaiting Bill
                </span>

              </div>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchTables}
              title="Refresh tables"
              className="
                shrink-0
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-md
                border
                border-gray-200
                bg-white
                text-gray-500
                hover:bg-gray-50
                hover:text-gray-900
                cursor-pointer
                transition
              "
            >
              <Icon name="refresh" size={15} />
            </button>

          </div>

        </div>
      </section>

      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-red-700">

          <div className="mt-0.5 shrink-0">
            <Icon name="alert" size={15} />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold">
              Unable to load tables
            </p>

            <p className="mt-0.5 text-[10px]">
              {error}
            </p>
          </div>

        </div>
      )}

      {/* ========================================================
          TABLE GRID
      ======================================================== */}

      <section className="border border-gray-200 bg-white rounded-lg p-3 sm:p-4">

        {tables.length === 0 ? (

          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">

            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400">
              <Icon name="table" size={17} />
            </div>

            <p className="mt-3 text-xs font-semibold text-gray-700">
              No tables found
            </p>

            <p className="mt-1 text-[10px] text-gray-400">
              No tables are currently configured.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

            {tables.map((table) => {

              const status = getStatus(table.status);

              const isSelected =
                selectedTableId === table.table_id;

              return (
                <button
                  key={table.table_id}
                  type="button"
                  onClick={() => onSelectTable(table)}
                  className={`
                    group
                    relative
                    min-w-0
                    rounded-lg
                    border
                    bg-white
                    p-3
                    text-left
                    cursor-pointer
                    transition
                    ${
                      isSelected
                        ? 'border-gray-900 ring-2 ring-gray-900/10'
                        : status.border
                    }
                  `}
                >

                  {/* Selected indicator */}
                  {isSelected && (
                    <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}

                  {/* Top */}
                  <div className="flex items-start justify-between gap-2">

                    <div
                      className={`
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-md
                        ${status.icon}
                      `}
                    >
                      <Icon name="table" size={15} />
                    </div>

                    <span
                      className={`
                        inline-flex
                        max-w-[85px]
                        items-center
                        gap-1
                        rounded-full
                        border
                        px-1.5
                        py-0.5
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-wide
                        ${status.badge}
                      `}
                    >
                      <span
                        className={`
                          h-1.5
                          w-1.5
                          shrink-0
                          rounded-full
                          ${status.dot}
                        `}
                      />

                      <span className="truncate">
                        {status.label}
                      </span>
                    </span>

                  </div>

                  {/* Table information */}
                  <div className="mt-3">

                    <p className="truncate text-sm font-bold text-gray-900">
                      Table #{table.table_number}
                    </p>

                    {table.section && (
                      <p className="mt-0.5 truncate text-[10px] text-gray-500">
                        {table.section}
                      </p>
                    )}

                  </div>

                  {/* Capacity */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-gray-500">

                    <Icon name="users" size={12} />

                    <span>
                      {table.capacity || 0}{' '}
                      {Number(table.capacity) === 1
                        ? 'seat'
                        : 'seats'}
                    </span>

                  </div>

                  {/* Bottom */}
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">

                    <span className="text-[9px] font-semibold text-gray-400">
                      Select
                    </span>

                    <span className="text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900">
                      <Icon name="arrow" size={12} />
                    </span>

                  </div>

                </button>
              );
            })}

          </div>
        )}

      </section>

    </div>
  );
};

export default FloorPlanGrid;