import React, { useState } from 'react';

const PaymentCheckout = ({ table, token, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [fiscalReceiptNo, setFiscalReceiptNo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Breakdown calculations
  const rawSubtotal = parseFloat(table.total_subtotal || 0);
  const rawService = parseFloat(table.total_service_charge || 0);
  const rawVat = parseFloat(table.total_vat || 0);
  const baseTotal = rawSubtotal + rawService + rawVat;

  const discount = Math.max(0, parseFloat(discountAmount) || 0);
  const finalPayable = Math.max(0, baseTotal - discount);

  const cashGiven = parseFloat(cashReceived) || 0;
  const changeGiven = paymentMethod === 'Cash' ? Math.max(0, cashGiven - finalPayable) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fiscalReceiptNo.trim()) {
      setError('Government Fiscal Machine Receipt No. is required for tax logging.');
      return;
    }

    if (paymentMethod === 'Cash' && cashGiven < finalPayable) {
      setError(`Insufficient cash received. Short by ${(finalPayable - cashGiven).toFixed(2)} ETB`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/v1/bills/process-table-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tableId: table.table_id,
          payment_method: paymentMethod,
          payment_ref: paymentRef,
          discount_amount: discount,
          cash_received: cashGiven,
          fiscal_receipt_no: fiscalReceiptNo,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Payment settlement failed.');

      onPaymentSuccess({
        tableNumber: table.table_number,
        waiterName: table.waiter_name,
        ordersBreakdown: table.orders_breakdown || [],
        paymentMethod,
        paymentRef,
        fiscalReceiptNo,
        subtotal: rawSubtotal,
        serviceCharge: rawService,
        vatAmount: rawVat,
        discount,
        finalPayable,
        cashGiven,
        changeGiven: data.change_given ?? changeGiven,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="border-b border-gray-200 pb-3 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 text-base">Checkout: Table #{table.table_number}</h3>
        <span className="text-xs text-gray-500">{table.section ? `${table.section} Section` : ''}</span>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Orders Breakdown */}
      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
        <p className="text-xs font-bold text-gray-700">Order Items Summary:</p>
        {table.orders_breakdown?.map((ord) => (
          <div key={ord.order_id} className="bg-gray-50 p-2 rounded border border-gray-100 text-xs space-y-1">
            <div className="font-semibold text-gray-500 text-[10px]">Ticket #{ord.order_id}</div>
            {ord.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-gray-800">
                <span>{item.quantity}x {item.name}</span>
                <span>{(item.quantity * parseFloat(item.unit_price)).toFixed(2)} ETB</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1.5 text-xs">
        <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>{rawSubtotal.toFixed(2)} ETB</span></div>
        <div className="flex justify-between text-gray-600"><span>Service Charge (10%):</span><span>{rawService.toFixed(2)} ETB</span></div>
        <div className="flex justify-between text-gray-600"><span>VAT (15%):</span><span>{rawVat.toFixed(2)} ETB</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Discount:</span><span>-{discount.toFixed(2)} ETB</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
          <span>Total Payable:</span>
          <span className="text-emerald-700">{finalPayable.toFixed(2)} ETB</span>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-gray-700 mb-1">Fiscal Receipt No. *</label>
          <input
            type="text"
            required
            value={fiscalReceiptNo}
            onChange={(e) => setFiscalReceiptNo(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
            placeholder="e.g. FISC-88941"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="Cash">Cash</option>
            <option value="Telebirr">Telebirr</option>
            <option value="CBE_Birr">CBE Birr</option>
          </select>
        </div>

        {paymentMethod === 'Cash' ? (
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Cash Received (ETB)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
            />
          </div>
        ) : (
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Transaction Ref / Txn ID</label>
            <input
              type="text"
              required
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. TXN123456"
            />
          </div>
        )}

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Discount Amount (ETB)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="0.00"
          />
        </div>
      </div>

      {paymentMethod === 'Cash' && (
        <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-bold text-emerald-900">Change Due to Customer:</span>
          <span className="text-base font-black text-emerald-700">{changeGiven.toFixed(2)} ETB</span>
        </div>
      )}

      <button
        type="submit"
        disabled={processing}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
      >
        {processing ? 'Processing Payment...' : '✅ Complete Settlement & Save Tax Record'}
      </button>
    </form>
  );
};

export default PaymentCheckout;