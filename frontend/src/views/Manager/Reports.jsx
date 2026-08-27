import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Reports = () => {
  const [data, setData] = useState({ metrics: {}, topItems: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/v1/reports/summary', {
          headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [token]);

  if (loading) return <p className="text-gray-500">Loading sales analytics...</p>;
  if (error) return <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>;

  const { metrics, topItems } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {parseFloat(metrics.total_revenue || 0).toFixed(2)} ETB
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Completed Orders</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {metrics.total_orders || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Avg Order Value</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {parseFloat(metrics.avg_order_value || 0).toFixed(2)} ETB
          </p>
        </div>
      </div>

      {/* Top Performing Items Table */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🔥 Top Selling Menu Items</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
              <th className="py-3 px-4">Item Name</th>
              <th className="py-3 px-4">Units Sold</th>
              <th className="py-3 px-4">Total Generated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {topItems.length > 0 ? (
              topItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4">{item.total_quantity}</td>
                  <td className="py-3 px-4 font-semibold text-green-700">
                    {parseFloat(item.total_sales).toFixed(2)} ETB
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="py-4 text-center text-gray-500">
                  No completed sales recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;