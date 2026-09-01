import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import PaymentCheckout from './PaymentCheckout';
import ReceiptPreview from './ReceiptPreview';

const AwaitingBilling = () => {
  const { token } = useContext(AuthContext);
  const [billingQueue, setBillingQueue] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedPayment, setCompletedPayment] = useState(null);

  const fetchAwaitingBills = async () => {
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/v1/bills/awaiting-bill', {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load awaiting bills queue.');

      const data = await response.json();
      setBillingQueue(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAwaitingBills();
    const interval = setInterval(fetchAwaitingBills, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setCompletedPayment(null);
  };

  const handlePaymentSuccess = (paymentSummary) => {
    setCompletedPayment(paymentSummary);
    setSelectedTable(null);
    fetchAwaitingBills();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-3 text-sm font-semibold text-gray-600">Loading Billing Queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cashier Settlement Queue ({billingQueue.length})</h2>
          <p className="text-xs text-gray-500">Record payments and fiscal machine receipt numbers for tax audits</p>
        </div>
        <button
          onClick={fetchAwaitingBills}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Queue List */}
        <div className="lg:col-span-5 space-y-3">
          {billingQueue.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-xl border border-gray-200 text-gray-400 text-xs">
              📋 No tables currently awaiting bill.
            </div>
          ) : (
            billingQueue.map((table) => {
              const isSelected = selectedTable?.table_id === table.table_id;
              return (
                <div
                  key={table.table_id}
                  onClick={() => handleSelectTable(table)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                      : 'bg-white border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-black text-gray-900 text-base">Table #{table.table_number}</h3>
                      <p className="text-xs text-gray-500">Waiter: {table.waiter_name || 'Unassigned'}</p>
                    </div>
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                      {table.total_orders_count || 1} Ticket(s)
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100 font-bold text-gray-800">
                    <span>Total Due:</span>
                    <span className="text-emerald-700 text-sm">
                      {parseFloat(table.group_total_amount || 0).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Panel: Checkout or Fiscal Summary */}
        <div className="lg:col-span-7">
          {completedPayment ? (
            <ReceiptPreview
              data={completedPayment}
              onClose={() => setCompletedPayment(null)}
            />
          ) : selectedTable ? (
            <PaymentCheckout
              table={selectedTable}
              token={token}
              onPaymentSuccess={handlePaymentSuccess}
            />
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-400 text-xs">
              👈 Select a table from the billing queue to open settlement checkout.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AwaitingBilling;