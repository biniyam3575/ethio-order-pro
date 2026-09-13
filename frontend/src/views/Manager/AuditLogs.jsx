import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

      if (range.startDate) params.append('startDate', range.startDate);
      if (range.endDate) params.append('endDate', range.endDate);
      if (selectedAction) params.append('action', selectedAction);
      if (selectedStaff) params.append('userId', selectedStaff);
      if (search.trim()) params.append('search', search.trim());

      const queryString = params.toString();

      const response = await fetch(
        `http://localhost:5000/api/v1/audit${queryString ? `?${queryString}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch audit logs.');
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
  }, [token, datePreset, startDate, endDate, selectedAction, selectedStaff]);

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
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            System Audit Trail
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor important system activities and changes
          </p>
        </div>

        <div className="text-sm text-gray-500">
          {logs.length} record{logs.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Date
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Action
            </label>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Staff Member
            </label>

            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Staff</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Search
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search details..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={fetchAudit}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Apply Filters
          </button>

          <button
            onClick={clearFilters}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-gray-500 p-4 text-center">
          Loading audit history...
        </p>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="py-8 text-center text-gray-500"
                  >
                    No activity found for the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-medium whitespace-nowrap">
                      {log.staff_name || 'System'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.target_record || 'N/A'}
                    </td>

                    <td className="py-3 px-4 text-gray-600 min-w-[250px]">
                      {log.details || 'No details available'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;