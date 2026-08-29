import React from 'react';

export default function ReceiptPreview({ order, onClose }) {
  return (
    <div className="bg-white p-6 border rounded shadow-md max-w-sm mx-auto font-mono text-xs text-gray-800">
      <div className="text-center mb-4 border-b pb-3">
        <h2 className="font-bold text-base tracking-wide">ETHIO-ORDER PRO</h2>
        <p className="text-gray-500">Addis Ababa, Ethiopia</p>
        <p className="mt-1">Order #{order.order_id} | Table #{order.table_number}</p>
        <p className="text-gray-400 text-[10px]">{new Date().toLocaleString()}</p>
      </div>

      <div className="border-b pb-2 mb-2 space-y-1">
        {order.items && order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{item.quantity}x {item.name}</span>
            <span>ETB {parseFloat(item.total_price).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-b pb-2 mb-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>ETB {parseFloat(order.subtotal).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Service Charge (10%)</span>
          <span>ETB {parseFloat(order.service_charge).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT (15%)</span>
          <span>ETB {parseFloat(order.vat_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm pt-1 border-t mt-1">
          <span>TOTAL PAID</span>
          <span>ETB {parseFloat(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="italic text-gray-500">Thank you for dining with us!</p>
        <div className="mt-4 flex gap-2 justify-center no-print">
          <button 
            onClick={() => window.print()} 
            className="bg-blue-600 text-white px-4 py-1.5 rounded font-sans text-xs hover:bg-blue-700"
          >
            Print Receipt
          </button>
          <button 
            onClick={onClose} 
            className="border text-gray-600 px-4 py-1.5 rounded font-sans text-xs hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}