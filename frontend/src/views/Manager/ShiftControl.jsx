import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ShiftControl = () => {
  const { token } = useContext(AuthContext);
  const [activeShifts, setActiveShifts] = useState([]);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceCloseCashierId, setForceCloseCashierId] = useState(null);

  const fetchShiftData = useCallback(async () => {
    setLoading(true);
    setError('');
    const authToken = token || localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${authToken}` };

    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/shifts/active-all', { headers }),
        fetch('http://localhost:5000/api/v1/shifts/history', { headers }),
      ]);

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveShifts(activeData.data || activeData || []);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setShiftHistory(historyData.data || historyData || []);
      }
    } catch (err) {
      setError('Failed to fetch shift tracking data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchShiftData();
  }, [fetchShiftData]);

  const handleForceClose = async (shiftId) => {
    if (!window.confirm('Are you sure you want to force close this cashier register shift?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/v1/shifts/force-close/${shiftId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to force close shift.');
      fetchShiftData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-6 text-gray-500 font-medium">Loading shift audit controls...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      {/* Active Registers */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🟢 Active Cashier Registers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs uppercase text-gray-600">
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Opened At</th>
                <th className="py-3 px-4">Starting Float</th>
                <th className="py-3 px-4">Expected Drawer Cash</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeShifts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-500">No active shifts open.</td>
                </tr>
              ) : (
                activeShifts.map((shift) => (
                  <tr key={shift.shift_id || shift.id}>
                    <td className="py-3 px-4 font-bold text-gray-800">{shift.cashier_name || `Cashier #${shift.user_id}`}</td>
                    <td className="py-3 px-4">{new Date(shift.opening_time || shift.created_at).toLocaleTimeString()}</td>
                    <td className="py-3 px-4 font-mono">{parseFloat(shift.opening_cash || 0).toFixed(2)} ETB</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {parseFloat(shift.expected_cash || 0).toFixed(2)} ETB
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleForceClose(shift.shift_id || shift.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded font-bold transition"
                      >
                        Force Close Register
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Audit History */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📜 Closed Shift Audit & Cash Discrepancies</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs uppercase text-gray-600">
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Opened / Closed</th>
                <th className="py-3 px-4">Expected</th>
                <th className="py-3 px-4">Actual Counted</th>
                <th className="py-3 px-4">Variance (Short/Over)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shiftHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-500">No historical shift records found.</td>
                </tr>
              ) : (
                shiftHistory.map((shift) => {
                  const diff = parseFloat(shift.actual_cash || 0) - parseFloat(shift.expected_cash || 0);
                  return (
                    <tr key={shift.shift_id || shift.id}>
                      <td className="py-3 px-4 font-medium">{shift.cashier_name || `Cashier #${shift.user_id}`}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {new Date(shift.opening_time).toLocaleTimeString()} - {new Date(shift.closing_time).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-mono">{parseFloat(shift.expected_cash || 0).toFixed(2)} ETB</td>
                      <td className="py-3 px-4 font-mono font-bold">{parseFloat(shift.actual_cash || 0).toFixed(2)} ETB</td>
                      <td className={`py-3 px-4 font-mono font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        {diff.toFixed(2)} ETB
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShiftControl;