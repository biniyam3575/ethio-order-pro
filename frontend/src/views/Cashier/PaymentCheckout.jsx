import React, { useState } from 'react';

export default function PaymentCheckout({ order, onSuccess, onCancel }) {
  const [method, setMethod] = useState('Cash');
  const [ref, setRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/orders/${order.order_id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payment_method: method, payment_ref: ref })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(order);
      } else {
        alert(data.message || 'Payment processing failed.');
      }
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto border">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">Checkout Order #{order.order_id}</h2>
      
      <div className="space-y-1 text-sm border-b pb-4 mb-4 text-gray-700">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>ETB {parseFloat(order.subtotal).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Service Charge (10%):</span>
          <span>ETB {parseFloat(order.service_charge).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT (15%):</span>
          <span>ETB {parseFloat(order.vat_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-green-700 pt-2 border-t mt-2">
          <span>Total Payable:</span>
          <span>ETB {parseFloat(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Payment Method</label>
          <select 
            value={method} 
            onChange={(e) => setMethod(e.target.value)} 
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="Cash">Cash</option>
            <option value="Telebirr">Telebirr</option>
            <option value="CBE_Birr">CBE Birr</option>
          </select>
        </div>

        {method !== 'Cash' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Transaction Ref Code</label>
            <input
              type="text"
              required
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. TXN98765432"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button 
            type="button" 
            onClick={onCancel} 
            className="w-1/2 border py-2 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={submitting} 
            className="w-1/2 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}