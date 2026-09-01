import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/v1/audit', {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch audit logs.');
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAudit();
  }, [token]);

  if (loading) return <p className="text-gray-500 p-4">Loading audit history...</p>;
  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded m-4">{error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4">System Audit Trail</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
            {logs.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-500">
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.log_id}>
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-medium">{log.staff_name || 'System'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-blue-700">{log.action}</td>
                  <td className="py-3 px-4">
                    {log.entity_type} (#{log.entity_id})
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;