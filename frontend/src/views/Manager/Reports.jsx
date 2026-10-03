import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icons = {
  chart: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19V5M4 19h17" />
      <path d="M8 16v-5M12 16V7M16 16v-8M20 16v-4" />
    </svg>
  ),

  card: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M7 14h3" />
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
      <path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4" />
      <path d="M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4" />
    </svg>
  ),

  production: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 20V9M9 20V5M13 20v-7M17 20V3M21 20H3" />
    </svg>
  ),

  calendar: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  ),

  orders: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 3h12v18H6z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  ),

  money: (className = 'w-5 h-5') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.3-3-1" />
      <path d="M12 6.5v11" />
    </svg>
  ),

  arrow: (className = 'w-4 h-4') => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
};

const Reports = () => {
  const { token } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('summary');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();

    return new Date(
      d.getFullYear(),
      d.getMonth(),
      1
    )
      .toISOString()
      .split('T')[0];
  });

  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  const [summaryData, setSummaryData] = useState({
    metrics: {},
    paymentBreakdown: [],
    topItems: [],
  });

  const [reconciliationData, setReconciliationData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError('');

    const authToken = token || localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const cleanStartDate =
      startDate ||
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
        .toISOString()
        .split('T')[0];

    const cleanEndDate =
      endDate || new Date().toISOString().split('T')[0];

    try {
      if (activeTab === 'summary') {
        const res = await fetch(
          `http://localhost:5000/api/v1/reports/summary?startDate=${cleanStartDate}&endDate=${cleanEndDate}`,
          { headers }
        );

        const result = await res.json();

        if (!res.ok) {
          throw new Error(
            result.message || 'Failed to fetch sales summary.'
          );
        }

        setSummaryData({
          metrics: result.metrics || {},
          paymentBreakdown: Array.isArray(result.paymentBreakdown)
            ? result.paymentBreakdown
            : [],
          topItems: Array.isArray(result.topItems)
            ? result.topItems
            : [],
        });
      } else {
        const res = await fetch(
          `http://localhost:5000/api/v1/reports/station-reconciliation?startDate=${cleanStartDate}&endDate=${cleanEndDate}`,
          { headers }
        );

        const result = await res.json();

        if (!res.ok) {
          throw new Error(
            result.message ||
              'Failed to fetch station reconciliation.'
          );
        }

        setReconciliationData(
          Array.isArray(result.data) ? result.data : []
        );
      }
    } catch (err) {
      console.error('Report Fetch Error:', err);
      setError(err.message || 'Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, token]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const {
    metrics = {},
    paymentBreakdown = [],
    topItems = [],
  } = summaryData;

  const getStationBadgeClass = (stationName) => {
    switch (stationName) {
      case 'Bar':
        return 'bg-violet-50 text-violet-700 border-violet-200';

      case 'Hot Drinks':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'Kitchen':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const formatMoney = (value) => {
    return parseFloat(value || 0).toFixed(2);
  };

  const MetricCard = ({
    label,
    value,
    suffix = 'ETB',
    icon,
  }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {value}
            {suffix && (
              <span className="ml-1 text-sm font-normal text-slate-400">
                {suffix}
              </span>
            )}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          {icon}
        </div>
      </div>
    </div>
  );

  const SectionHeader = ({
    icon,
    title,
    description,
    amber = false,
  }) => (
    <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          amber
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* Report Controls */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">

          {/* Tabs */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Report view
            </p>

            <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === 'summary'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sales summary
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reconciliation')}
                className={`cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === 'reconciliation'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Station reconciliation
              </button>
            </div>
          </div>

          {/* Date Filters */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Reporting period
            </p>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-end">

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  From
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {Icons.calendar()}
                  </div>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <span className="hidden pb-3 text-sm text-slate-400 sm:block">
                to
              </span>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  To
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {Icons.calendar()}
                  </div>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={fetchReportData}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {Icons.refresh()}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">
            Unable to load report
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />

            <p className="mt-4 text-sm font-medium text-slate-600">
              Loading report analytics...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* SALES SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-5 sm:space-y-6">

              {/* Metrics */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <MetricCard
                  label="Gross revenue"
                  value={formatMoney(metrics.total_revenue)}
                  icon={Icons.money()}
                />

                <MetricCard
                  label="Net subtotal"
                  value={formatMoney(metrics.gross_subtotal)}
                  icon={Icons.chart()}
                />

                <MetricCard
                  label="Total VAT"
                  value={formatMoney(metrics.total_vat)}
                  icon={Icons.money()}
                />

                <MetricCard
                  label="Service charge"
                  value={formatMoney(metrics.total_service_charges)}
                  icon={Icons.money()}
                />

                <MetricCard
                  label="Completed orders"
                  value={metrics.total_orders || 0}
                  suffix=""
                  icon={Icons.orders()}
                />
              </div>

              {/* Revenue Settlement */}
              <section className="rounded-xl border border-slate-200 bg-white">
                <SectionHeader
                  icon={Icons.money()}
                  title="Revenue settlement"
                  description="Breakdown of sales, service charges, and VAT."
                  amber
                />

                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Base sales
                    </p>

                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {formatMoney(metrics.gross_subtotal)}{' '}
                      <span className="text-sm font-normal text-slate-400">
                        ETB
                      </span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Service fee
                    </p>

                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      +{formatMoney(metrics.total_service_charges)}{' '}
                      <span className="text-sm font-normal text-slate-400">
                        ETB
                      </span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      VAT collected
                    </p>

                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      +{formatMoney(metrics.total_vat)}{' '}
                      <span className="text-sm font-normal text-slate-400">
                        ETB
                      </span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-900 bg-slate-900 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Total revenue
                    </p>

                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatMoney(metrics.total_revenue)}{' '}
                      <span className="text-sm font-normal text-slate-400">
                        ETB
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Payment + Top Items */}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

                {/* Payment Breakdown */}
                <section className="rounded-xl border border-slate-200 bg-white">
                  <SectionHeader
                    icon={Icons.card()}
                    title="Revenue by payment type"
                    description="Collected payments grouped by method."
                  />

                  {paymentBreakdown.length === 0 ? (
                    <div className="px-5 py-12 text-center sm:px-6">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        {Icons.card()}
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No payment data recorded
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        There are no collected payments for this period.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5">
                      <div className="space-y-2">
                        {paymentBreakdown.map((pm, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {pm.payment_method || 'Cash'}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {pm.order_count || 0}{' '}
                                {pm.order_count === 1
                                  ? 'order'
                                  : 'orders'}
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-semibold text-slate-900">
                              {formatMoney(pm.total_collected)} ETB
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Top Items */}
                <section className="rounded-xl border border-slate-200 bg-white">
                  <SectionHeader
                    icon={Icons.chart()}
                    title="Top selling menu items"
                    description="Best-performing items for the selected period."
                  />

                  {topItems.length === 0 ? (
                    <div className="px-5 py-12 text-center sm:px-6">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        {Icons.chart()}
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No menu items sold yet
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        There are no sales records for this period.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5">
                      <div className="space-y-2">
                        {topItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-200 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {item.name}
                                </p>

                                <span
                                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStationBadgeClass(
                                    item.station
                                  )}`}
                                >
                                  {item.station ||
                                    item.category ||
                                    'General'}
                                </span>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatMoney(item.total_sales)} ETB
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {item.total_quantity || 0} sold
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* RECONCILIATION */}
          {activeTab === 'reconciliation' && (
            <section className="rounded-xl border border-slate-200 bg-white">
              <SectionHeader
                icon={Icons.production()}
                title="Station reconciliation"
                description="Compare production value with settled cashier payments."
                amber
              />

              {reconciliationData.length === 0 ? (
                <div className="px-5 py-14 text-center sm:px-6">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    {Icons.production()}
                  </div>

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No production records found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Try selecting a different date range.
                  </p>
                </div>
              ) : (
                <div className="p-4 sm:p-5">
                  <div className="space-y-3">
                    {reconciliationData.map((row, idx) => {
                      const expected = parseFloat(
                        row.net_expected_revenue ||
                          row.gross_production_value ||
                          0
                      );

                      const collected = parseFloat(
                        row.actual_collected || 0
                      );

                      const deficit = parseFloat(
                        row.revenue_deficit ||
                          expected - collected
                      );

                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 p-4 sm:p-5"
                        >
                          {/* Row Header */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Station
                              </p>

                              <span
                                className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStationBadgeClass(
                                  row.station
                                )}`}
                              >
                                {row.station}
                              </span>
                            </div>

                            <div className="sm:text-right">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Difference
                              </p>

                              <p
                                className={`mt-1 text-base font-semibold ${
                                  deficit > 0
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {deficit > 0 ? '+' : ''}
                                {deficit.toFixed(2)} ETB
                              </p>
                            </div>
                          </div>

                          {/* Values */}
                          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">

                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Gross production
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {formatMoney(
                                  row.gross_production_value
                                )}{' '}
                                ETB
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Net expected
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {expected.toFixed(2)} ETB
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Collected
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {collected.toFixed(2)} ETB
                              </p>
                            </div>

                            <div
                              className={`rounded-lg p-3 ${
                                deficit > 0
                                  ? 'bg-red-50'
                                  : 'bg-emerald-50'
                              }`}
                            >
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Difference
                              </p>

                              <p
                                className={`mt-1 text-sm font-semibold ${
                                  deficit > 0
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {deficit > 0 ? '+' : ''}
                                {deficit.toFixed(2)} ETB
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;