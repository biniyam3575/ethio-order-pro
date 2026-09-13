import React, { useState } from 'react';

const PaymentCheckout = ({ table, token, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [fiscalReceiptNo, setFiscalReceiptNo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Financial calculations from backend payload
  const rawSubtotal = parseFloat(table.total_subtotal || table.subtotal || 0);
  const rawService = parseFloat(table.total_service_charge || table.service_charge || 0);
  const rawVat = parseFloat(table.total_vat || table.vat_amount || 0);
  const finalPayable = parseFloat(table.group_total_amount || table.total_amount || 0);

  const cashGiven = parseFloat(cashReceived) || 0;
  const changeGiven = paymentMethod === 'Cash' ? Math.max(0, cashGiven - finalPayable) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (paymentMethod === 'Cash' && cashGiven < finalPayable) {
      setError(`Insufficient cash. Short by ${(finalPayable - cashGiven).toFixed(2)} ETB`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const authToken = token || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/v1/bills/process-table-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tableId: table.table_id,
          payment_method: paymentMethod,
          payment_ref: paymentRef.trim() || null,
          cash_received: paymentMethod === 'Cash' ? cashGiven : finalPayable,
          fiscal_receipt_no: fiscalReceiptNo.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Payment settlement failed.');

      onPaymentSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
      <div className="border-b border-gray-200 pb-3 flex justify-between items-center">
        <div>
          <h3 className="font-black text-gray-900 text-base">Checkout: Table #{table.table_number}</h3>
          <p className="text-xs text-gray-500">Waiter: {table.waiter_name || 'Unassigned'}</p>
        </div>
        {table.section && (
          <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
            {table.section}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Ticket Items Summary */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ticket Breakdowns</p>
        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
          {table.orders_breakdown?.length > 0 ? (
            table.orders_breakdown.map((ord) => (
              <div key={ord.order_id} className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs space-y-1">
                <div className="font-bold text-gray-500 text-[10px] uppercase">
                  Ticket #{ord.order_id}
                </div>
                {ord.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-gray-800 py-0.5">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-mono">{(item.quantity * parseFloat(item.unit_price)).toFixed(2)} ETB</span>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 italic">No breakdown items found.</div>
          )}
        </div>
      </div>

      {/* Financial Calculation Box */}
      <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-1.5 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span className="font-mono">{rawSubtotal.toFixed(2)} ETB</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Service Charge (10%):</span>
          <span className="font-mono">{rawService.toFixed(2)} ETB</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>VAT (15%):</span>
          <span className="font-mono">{rawVat.toFixed(2)} ETB</span>
        </div>
        <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
          <span>Final Total Payable:</span>
          <span className="text-emerald-700 font-mono text-base">{finalPayable.toFixed(2)} ETB</span>
        </div>
      </div>

      {/* Payment Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg font-medium text-xs bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Cash">Cash</option>
            <option value="Telebirr">Telebirr</option>
            <option value="CBE_Birr">CBE Birr</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Fiscal Receipt No. (Optional)</label>
          <input
            type="text"
            value={fiscalReceiptNo}
            onChange={(e) => setFiscalReceiptNo(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500"
            placeholder="Optional e.g. FISC-889"
          />
        </div>

        {paymentMethod === 'Cash' ? (
          <div className="col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Cash Received (ETB) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
            />
          </div>
        ) : (
          <div className="col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Transaction Ref / Txn ID (Optional)</label>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500"
              placeholder="Optional e.g. TXN12345"
            />
          </div>
        )}
      </div>

      {paymentMethod === 'Cash' && (
        <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-bold text-emerald-900">Change Due to Customer:</span>
          <span className="text-base font-black text-emerald-700 font-mono">{changeGiven.toFixed(2)} ETB</span>
        </div>
      )}

      <button
        type="submit"
        disabled={processing}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
      >
        {processing ? 'Processing Settlement...' : '✅ Complete Settlement'}
      </button>
    </form>
  );
};

export default PaymentCheckout;