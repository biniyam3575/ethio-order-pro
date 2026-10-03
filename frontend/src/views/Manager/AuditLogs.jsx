import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icons = {
  audit: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),

  search: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16l5 5" />
    </svg>
  ),

  filter: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  ),

  refresh: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4" />
    </svg>
  ),
};

const AuditLogs = () => {
  const { token } = useContext(AuthContext);

  const [logs, setLogs] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [actionOptions, setActionOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [search, setSearch] = useState('');

  const authToken = token || localStorage.getItem('token');

  const getDateRange = () => {
    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    if (datePreset === 'today') {
      const start = new Date(today);
      const end = new Date(today);

      end.setDate(end.getDate() + 1);

      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }

    if (datePreset === 'yesterday') {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);

      const end = new Date(today);

      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }

    if (datePreset === '7days') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);

      const end = new Date(today);
      end.setDate(end.getDate() + 1);

      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }

    if (datePreset === '30days') {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);

      const end = new Date(today);
      end.setDate(end.getDate() + 1);

      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }

    if (datePreset === 'custom') {
      return {
        startDate: startDate
          ? new Date(`${startDate}T00:00:00`).toISOString()
          : '',
        endDate: endDate
          ? new Date(`${endDate}T23:59:59.999`).toISOString()
          : '',
      };
    }

    return {
      startDate: '',
      endDate: '',
    };
  };

  const fetchAudit = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      const range = getDateRange();

      if (range.startDate) {
        params.append('startDate', range.startDate);
      }

      if (range.endDate) {
        params.append('endDate', range.endDate);
      }

      if (selectedAction) {
        params.append('action', selectedAction);
      }

      if (selectedStaff) {
        params.append('userId', selectedStaff);
      }

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const queryString = params.toString();

      const response = await fetch(
        `http://localhost:5000/api/v1/audit${
          queryString ? `?${queryString}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to fetch audit logs.'
        );
      }

      const receivedLogs = Array.isArray(data) ? data : [];

      setLogs(receivedLogs);

      const uniqueStaff = [
        ...new Map(
          receivedLogs
            .filter((log) => log.user_id && log.staff_name)
            .map((log) => [
              log.user_id,
              {
                id: log.user_id,
                name: log.staff_name,
              },
            ])
        ).values(),
      ];

      const uniqueActions = [
        ...new Set(
          receivedLogs
            .map((log) => log.action)
            .filter(Boolean)
        ),
      ].sort();

      setStaffOptions(uniqueStaff);
      setActionOptions(uniqueActions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [
    token,
    datePreset,
    startDate,
    endDate,
    selectedAction,
    selectedStaff,
  ]);

  const clearFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedAction('');
    setSelectedStaff('');
    setSearch('');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      fetchAudit();
    }
  };

  return (
    <div className="space-y-6">

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 sm:px-6">

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {Icons.filter()}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Filter activity
            </h3>

            <p className="text-xs text-slate-500">
              Narrow the audit records you want to review.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">

          {/* Main filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Date range
              </label>

              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);

                  if (e.target.value !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Action
              </label>

              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All actions</option>

                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Staff member
              </label>

              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All staff</option>

                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Search
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {Icons.search()}
                </div>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="Search details..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Custom dates */}
          {datePreset === 'custom' && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Start date
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  End date
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          )}

          {/* Filter buttons */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">

            <button
              type="button"
              onClick={fetchAudit}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {Icons.refresh()}
              Apply filters
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="rounded-xl border border-slate-200 bg-white">

        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h3 className="font-semibold text-slate-900">
            Activity records
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            System actions recorded by the application.
          </p>
        </div>

        {loading && (
          <div className="px-5 py-12 text-center sm:px-6">
            <p className="text-sm font-medium text-slate-500">
              Loading audit history...
            </p>
          </div>
        )}

        {error && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:m-6">
            {error}
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="px-5 py-12 text-center sm:px-6">

            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              {Icons.audit()}
            </div>

            <p className="text-sm font-medium text-slate-700">
              No activity found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your filters or search term.
            </p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Staff member</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Target</th>
                    <th className="px-5 py-3">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.map((log) => (
                    <tr
                      key={log.log_id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                        {log.staff_name || 'System'}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {log.action}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {log.target_record || 'N/A'}
                      </td>

                      <td className="min-w-[280px] px-5 py-4 text-slate-500">
                        {log.details || 'No details available'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="space-y-3 p-4 md:hidden">
              {logs.map((log) => (
                <div
                  key={log.log_id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <p className="font-medium text-slate-900">
                        {log.staff_name || 'System'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>

                    <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700">
                      {log.action}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">

                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Target
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {log.target_record || 'N/A'}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Details
                      </p>

                      <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                        {log.details || 'No details available'}
                      </p>
                    </div>
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

export default AuditLogs;