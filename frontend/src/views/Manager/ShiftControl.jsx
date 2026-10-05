import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icons = {
  cash: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M7 10h10M8 15h2M14 15h2" />
    </svg>
  ),

  history: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5M12 7v5l3 2" />
    </svg>
  ),

  close: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),

  warning: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3l9 17H3L12 3z" />
      <path d="M12 9v4M12 16h.01" />
    </svg>
  ),

  users: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M17 11a3 3 0 1 0-1.5-5.6M21 20v-1.5a4 4 0 0 0-3-3.87" />
    </svg>
  ),

  activity: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  ),

  balance: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3v18M5 7h14M6 7l-3 6h6L6 7ZM18 7l-3 6h6l-3-6Z" />
      <path d="M8 21h8" />
    </svg>
  ),
};

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

    const headers = {
      Authorization: `Bearer ${authToken}`,
    };

    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch('/api/v1/shifts/active-all', {
          headers,
        }),

        fetch('/api/v1/shifts/history', {
          headers,
        }),
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
    if (
      !window.confirm(
        'Are you sure you want to force close this cashier register shift?'
      )
    ) {
      return;
    }

    setForceCloseCashierId(shiftId);
    setError('');

    try {
      const response = await fetch(
        `/api/v1/shifts/force-close/${shiftId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${
              token || localStorage.getItem('token')
            }`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to force close shift.');
      }

      await fetchShiftData();
    } catch (err) {
      setError(err.message);
    } finally {
      setForceCloseCashierId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
          <p className="text-sm font-medium text-slate-600">
            Loading shift controls...
          </p>
        </div>
      </div>
    );
  }

  const totalExpectedCash = activeShifts.reduce(
    (sum, shift) => sum + parseFloat(shift.expected_cash || 0),
    0
  );

  const totalStartingCash = activeShifts.reduce(
    (sum, shift) => sum + parseFloat(shift.opening_cash || 0),
    0
  );

  return (
    <div className="min-w-0 space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
          <div className="mt-0.5 shrink-0">
            {Icons.warning('h-4 w-4')}
          </div>

          <p>{error}</p>
        </div>
      )}

      {/* Active registers */}
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              {Icons.activity('h-5 w-5')}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Active registers
                </h3>

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                Cashier shifts currently open
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {activeShifts.length} active
          </span>
        </div>

        {activeShifts.length === 0 ? (
          <div className="m-5 flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 text-center sm:m-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
              {Icons.cash('h-6 w-6')}
            </div>

            <p className="text-sm font-semibold text-slate-800">
              No active registers
            </p>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              There are currently no cashier shifts open.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 lg:p-6">
            {/* Desktop / tablet cards */}
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {activeShifts.map((shift) => {
                const shiftId = shift.shift_id || shift.id;
                const isClosing = forceCloseCashierId === shiftId;

                const openingCash = parseFloat(
                  shift.opening_cash || 0
                ).toFixed(2);

                const expectedCash = parseFloat(
                  shift.expected_cash || 0
                ).toFixed(2);

                return (
                  <article
                    key={shiftId}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          {Icons.users('h-5 w-5')}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {shift.cashier_name ||
                              `Cashier #${shift.user_id}`}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Opened{' '}
                            {new Date(
                              shift.opening_time || shift.created_at
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Starting float
                        </p>

                        <p className="mt-1.5 font-mono text-sm font-semibold text-slate-800">
                          {openingCash}{' '}
                          <span className="font-sans text-[11px] font-medium text-slate-400">
                            ETB
                          </span>
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Expected cash
                        </p>

                        <p className="mt-1.5 font-mono text-sm font-semibold text-slate-950">
                          {expectedCash}{' '}
                          <span className="font-sans text-[11px] font-medium text-slate-400">
                            ETB
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {Icons.balance('h-3.5 w-3.5')}
                        Register control
                      </div>

                      <button
                        type="button"
                        onClick={() => handleForceClose(shiftId)}
                        disabled={isClosing}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          isClosing
                            ? 'cursor-not-allowed border-red-100 bg-red-50 text-red-400 opacity-70'
                            : 'cursor-pointer border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {Icons.close('h-3.5 w-3.5')}

                        {isClosing ? 'Closing...' : 'Force close'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* History */}
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              {Icons.history('h-5 w-5')}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">
                Shift history
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Completed registers and cash reconciliation
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {shiftHistory.length} record
            {shiftHistory.length !== 1 ? 's' : ''}
          </span>
        </div>

        {shiftHistory.length === 0 ? (
          <div className="m-5 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 text-center sm:m-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
              {Icons.history('h-5 w-5')}
            </div>

            <p className="text-sm font-semibold text-slate-800">
              No historical records
            </p>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Closed cashier shifts will appear here.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 lg:p-6">
            <div className="space-y-3">
              {shiftHistory.map((shift) => {
                const diff =
                  parseFloat(shift.actual_cash || 0) -
                  parseFloat(shift.expected_cash || 0);

                return (
                  <article
                    key={shift.shift_id || shift.id}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      {/* Cashier */}
                      <div className="flex min-w-0 items-center gap-3 xl:w-[25%]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          {Icons.users('h-5 w-5')}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {shift.cashier_name ||
                              `Cashier #${shift.user_id}`}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(
                              shift.opening_time
                            ).toLocaleTimeString()}{' '}
                            —{' '}
                            {new Date(
                              shift.closing_time
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Financial values */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:flex xl:flex-1 xl:justify-center">
                        <div className="min-w-0 rounded-xl bg-slate-50 px-3.5 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Expected
                          </p>

                          <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                            {parseFloat(
                              shift.expected_cash || 0
                            ).toFixed(2)}{' '}
                            <span className="font-sans text-[10px] font-medium text-slate-400">
                              ETB
                            </span>
                          </p>
                        </div>

                        <div className="min-w-0 rounded-xl bg-slate-50 px-3.5 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Actual
                          </p>

                          <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                            {parseFloat(
                              shift.actual_cash || 0
                            ).toFixed(2)}{' '}
                            <span className="font-sans text-[10px] font-medium text-slate-400">
                              ETB
                            </span>
                          </p>
                        </div>

                        <div className="col-span-2 min-w-0 rounded-xl bg-slate-50 px-3.5 py-3 sm:col-span-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Variance
                          </p>

                          <p
                            className={`mt-1 font-mono text-sm font-semibold ${
                              diff < 0
                                ? 'text-red-600'
                                : diff > 0
                                ? 'text-slate-900'
                                : 'text-emerald-600'
                            }`}
                          >
                            {diff > 0 ? '+' : ''}
                            {diff.toFixed(2)}{' '}
                            <span className="font-sans text-[10px] font-medium opacity-70">
                              ETB
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Result */}
                      <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 xl:w-[150px] xl:border-t-0 xl:pt-0">
                        <span className="text-xs font-medium text-slate-400">
                          Result
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            diff < 0
                              ? 'bg-red-50 text-red-700'
                              : diff > 0
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {diff < 0
                            ? 'Short'
                            : diff > 0
                            ? 'Over'
                            : 'Balanced'}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ShiftControl;