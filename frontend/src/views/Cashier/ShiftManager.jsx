import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ShiftManager = ({ onShiftChange }) => {
  const { token } = useContext(AuthContext);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  // Helper function to handle non-JSON HTML responses (like 404/500 pages)
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    throw new Error(`Server returned HTML (${response.status} ${response.statusText}). Endpoint might not exist on backend.`);
  };

  const fetchCurrentShift = useCallback(async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/shifts/current', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok && response.status === 404) {
        // Backend endpoint not found
        setActiveShift(null);
        return;
      }

      const data = await parseResponse(response);
      if (response.ok && data.active) {
        setActiveShift(data.data);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error('Error loading shift status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    setMessage('');

    try {
      const authToken = token || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/shifts/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ opening_cash: parseFloat(openingCash) || 0 }),
      });

      const data = await parseResponse(response);
      if (!response.ok) throw new Error(data.message || 'Failed to open shift.');

      setMessage('Shift opened successfully.');
      setOpeningCash('');
      await fetchCurrentShift();
      if (onShiftChange) onShiftChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    setMessage('');

    try {
      const authToken = token || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/shifts/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ actual_cash: parseFloat(actualCash) || 0 }),
      });

      const data = await parseResponse(response);
      if (!response.ok) throw new Error(data.message || 'Failed to close shift.');

      setMessage(`Shift closed successfully.`);
      setActualCash('');
      await fetchCurrentShift();
      if (onShiftChange) onShiftChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-xs text-gray-500 animate-pulse">Checking active cashier shift status...</div>;
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <h3 className="font-black text-gray-900 text-sm tracking-tight">Shift Register Control</h3>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            activeShift
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-amber-100 text-amber-800 border-amber-200'
          }`}
        >
          {activeShift ? '🔴 Shift Active / Register Open' : '⚪ Shift Closed'}
        </span>
      </div>

      {error && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{error}</div>}
      {message && <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-bold">{message}</div>}

      {activeShift ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
            <div>
              <span className="text-gray-500 block text-[10px]">Opened At:</span>
              <span className="font-bold text-gray-800">
                {new Date(activeShift.opening_time || activeShift.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">Opening Float:</span>
              <span className="font-bold font-mono text-gray-900">{parseFloat(activeShift.opening_cash || 0).toFixed(2)} ETB</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-gray-700 font-bold">Expected Cash in Drawer:</span>
              <span className="font-black font-mono text-emerald-700 text-sm">
                {parseFloat(activeShift.expected_cash || 0).toFixed(2)} ETB
              </span>
            </div>
          </div>

          <form onSubmit={handleCloseShift} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Counted End-of-Shift Cash (ETB) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500"
                placeholder="Enter exact cash balance in drawer"
              />
            </div>
            <button
              type="submit"
              disabled={processing}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
            >
              {processing ? 'Closing Register...' : '🔒 Close Active Shift Register'}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleOpenShift} className="space-y-3">
          <p className="text-xs text-gray-500">
            You must open a shift and log your starting drawer cash float before settling guest orders.
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Starting Cash Float (ETB) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
            />
          </div>
          <button
            type="submit"
            disabled={processing}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
          >
            {processing ? 'Opening Shift...' : '🔓 Open Shift Register'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ShiftManager;