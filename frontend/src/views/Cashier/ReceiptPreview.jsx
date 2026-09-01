import React from 'react';

const ReceiptPreview = ({ data, onClose }) => {
  const {
    tableNumber,
    waiterName,
    paymentMethod,
    paymentRef,
    fiscalReceiptNo,
    subtotal,
    serviceCharge,
    vatAmount,
    discount,
    finalPayable,
    cashGiven,
    changeGiven,
  } = data;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="font-bold text-emerald-700 text-sm">✅ Payment & Fiscal Log Saved</h3>
        <button onClick={onClose} className="text-xs font-bold text-gray-500 hover:text-gray-800">
          ✕ Close
        </button>
      </div>

      {/* Screen Fiscal Summary Card */}
      <div className="p-4 bg-gray-50 border border-gray-200 font-mono text-xs rounded space-y-2 max-w-sm mx-auto">
        <div className="text-center">
          <p className="font-black text-sm text-gray-900">ETHIO-ORDER POS</p>
          <p className="text-[10px] text-gray-500">Government Tax Audit Record Entry</p>
          <p className="text-[10px] text-gray-500">Table #{tableNumber} | Waiter: {waiterName || 'N/A'}</p>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2"></div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Fiscal Machine #:</span>
            <span className="font-bold text-gray-900">{fiscalReceiptNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between">
            <span>Service Charge (10%):</span>
            <span>{serviceCharge.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between text-blue-900 font-bold">
            <span>VAT (15%):</span>
            <span>{vatAmount.toFixed(2)} ETB</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount:</span>
              <span>-{discount.toFixed(2)} ETB</span>
            </div>
          )}
          <div className="flex justify-between font-black text-xs pt-1 border-t">
            <span>TOTAL COLLECTED:</span>
            <span>{finalPayable.toFixed(2)} ETB</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2"></div>

        <div className="text-[10px] space-y-0.5 text-gray-600">
          <div>Payment Method: <span className="font-bold text-gray-800">{paymentMethod}</span></div>
          {paymentRef && <div>Txn Ref: {paymentRef}</div>}
          {paymentMethod === 'Cash' && (
            <>
              <div>Cash Received: {cashGiven.toFixed(2)} ETB</div>
              <div>Change Issued: {parseFloat(changeGiven).toFixed(2)} ETB</div>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
      >
        Return to Billing Queue
      </button>
    </div>
  );
};

export default ReceiptPreview;