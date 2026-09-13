// src/components/Manager/Reports.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Reports = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'reconciliation'

  // Default date filter range: Start of current month to today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data States
  const [summaryData, setSummaryData] = useState({ metrics: {}, paymentBreakdown: [], topItems: [] });
  const [reconciliationData, setReconciliationData] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    const authToken = token || localStorage.getItem('token');
    const headers = { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}` 
    };

    const cleanStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const cleanEndDate = endDate || new Date().toISOString().split('T')[0];

    try {
      if (activeTab === 'summary') {
        const res = await fetch(
          `http://localhost:5000/api/v1/reports/summary?startDate=${cleanStartDate}&endDate=${cleanEndDate}`,
          { headers }
        );
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch sales summary.');
        
        setSummaryData({
          metrics: result.metrics || {},
          paymentBreakdown: Array.isArray(result.paymentBreakdown) ? result.paymentBreakdown : [],
          topItems: Array.isArray(result.topItems) ? result.topItems : []
        });
      } else if (activeTab === 'reconciliation') {
        const res = await fetch(
          `http://localhost:5000/api/v1/reports/station-reconciliation?startDate=${cleanStartDate}&endDate=${cleanEndDate}`,
          { headers }
        );
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch station reconciliation.');
        
        setReconciliationData(Array.isArray(result.data) ? result.data : []);
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

  const { metrics = {}, paymentBreakdown = [], topItems = [] } = summaryData;

  const getStationBadgeClass = (stationName) => {
    switch (stationName) {
      case 'Bar':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Hot Drinks':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'Kitchen':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow border border-gray-200">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b md:border-b-0 border-gray-200 pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 font-semibold text-sm rounded-md transition-colors ${
              activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Sales Summary
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-2 font-semibold text-sm rounded-md transition-colors ${
              activeTab === 'reconciliation' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🍳 Station Reconciliation
          </button>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={fetchReportData}
            className="bg-gray-800 text-white text-sm px-3 py-1 rounded hover:bg-gray-900 transition font-medium"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">
          <p className="font-bold">Error loading reports</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-medium">Loading report analytics...</div>
      ) : (
        <>
          {/* TAB 1: SALES SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Gross Revenue</h3>
                  <p className="text-xl font-bold text-green-600 mt-2">
                    {parseFloat(metrics.total_revenue || 0).toFixed(2)} ETB
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Net Subtotal</h3>
                  <p className="text-xl font-bold text-gray-800 mt-2">
                    {parseFloat(metrics.gross_subtotal || 0).toFixed(2)} ETB
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Total VAT (Tax)</h3>
                  <p className="text-xl font-bold text-teal-600 mt-2">
                    {parseFloat(metrics.total_vat || 0).toFixed(2)} ETB
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Service Charge</h3>
                  <p className="text-xl font-bold text-amber-600 mt-2">
                    {parseFloat(metrics.total_service_charges || 0).toFixed(2)} ETB
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Completed Orders</h3>
                  <p className="text-xl font-bold text-blue-600 mt-2">{metrics.total_orders || 0}</p>
                </div>
              </div>

              {/* Settlement Summary */}
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🏛️ Tax & Revenue Settlement Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                  <div>
                    <span className="text-gray-500 block">Base Sales (Subtotal)</span>
                    <span className="text-base font-bold text-gray-800">
                      {parseFloat(metrics.gross_subtotal || 0).toFixed(2)} ETB
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Service Fee Collected</span>
                    <span className="text-base font-bold text-amber-700">
                      + {parseFloat(metrics.total_service_charges || 0).toFixed(2)} ETB
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">VAT Collected</span>
                    <span className="text-base font-bold text-teal-700">
                      + {parseFloat(metrics.total_vat || 0).toFixed(2)} ETB
                    </span>
                  </div>
                  <div className="border-l pl-4 border-gray-300">
                    <span className="text-gray-500 block font-medium">Total Deposited Revenue</span>
                    <span className="text-base font-bold text-green-700">
                      = {parseFloat(metrics.total_revenue || 0).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">💳 Revenue by Payment Type</h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Orders</th>
                        <th className="py-3 px-4">Total Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {paymentBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-4 text-center text-gray-500">No payment data recorded.</td>
                        </tr>
                      ) : (
                        paymentBreakdown.map((pm, idx) => (
                          <tr key={idx}>
                            <td className="py-3 px-4 font-medium">{pm.payment_method || 'Cash'}</td>
                            <td className="py-3 px-4">{pm.order_count}</td>
                            <td className="py-3 px-4 font-semibold text-green-700">
                              {parseFloat(pm.total_collected || 0).toFixed(2)} ETB
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Top Selling Items */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🔥 Top Selling Menu Items</h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Station / Category</th>
                        <th className="py-3 px-4">Qty</th>
                        <th className="py-3 px-4">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {topItems.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-4 text-center text-gray-500">No menu items sold yet.</td>
                        </tr>
                      ) : (
                        topItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded ${getStationBadgeClass(
                                  item.station
                                )}`}
                              >
                                {item.station || item.category || 'General'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold">{item.total_quantity}</td>
                            <td className="py-3 px-4 font-semibold text-green-700">
                              {parseFloat(item.total_sales || 0).toFixed(2)} ETB
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATION RECONCILIATION */}
          {activeTab === 'reconciliation' && (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                🍳 Kitchen, Bar & Hot Drinks Production vs Cashier Payments
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Compares gross item production value against settled payments to highlight unpaid orders or missing revenue.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                      <th className="py-3 px-4">Station</th>
                      <th className="py-3 px-4">Gross Production</th>
                      <th className="py-3 px-4">Net Expected</th>
                      <th className="py-3 px-4">Actual Collected</th>
                      <th className="py-3 px-4">Deficiency / Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {reconciliationData.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-500">
                          No production records found for the selected date range.
                        </td>
                      </tr>
                    ) : (
                      reconciliationData.map((row, idx) => {
                        const expected = parseFloat(row.net_expected_revenue || row.gross_production_value || 0);
                        const collected = parseFloat(row.actual_collected || 0);
                        const deficit = parseFloat(row.revenue_deficit || (expected - collected));

                        return (
                          <tr key={idx}>
                            <td className="py-3 px-4 font-semibold text-gray-800">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${getStationBadgeClass(row.station)}`}>
                                {row.station}
                              </span>
                            </td>
                            <td className="py-3 px-4">{parseFloat(row.gross_production_value || 0).toFixed(2)} ETB</td>
                            <td className="py-3 px-4">{expected.toFixed(2)} ETB</td>
                            <td className="py-3 px-4 font-semibold text-green-700">
                              {collected.toFixed(2)} ETB
                            </td>
                            <td className={`py-3 px-4 font-bold ${deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {deficit.toFixed(2)} ETB
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;