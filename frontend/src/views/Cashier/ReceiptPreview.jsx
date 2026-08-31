import React from 'react';

const ReceiptPreview = ({
  order,
  onBack,
}) => {
  if (!order) {
    return (
      <div className="p-8 text-center text-gray-400">
        No receipt available.
      </div>
    );
  }

  const toNumber = (value) => {
    const number = parseFloat(value);
    return Number.isFinite(number)
      ? number
      : 0;
  };

  const subtotal =
    toNumber(order.subtotal);

  const serviceCharge =
    toNumber(order.service_charge);

  const vatAmount =
    toNumber(order.vat_amount);

  const discount =
    toNumber(order.discount_amount);

  const originalTotal =
    toNumber(order.total_amount);

  /*
   * If discount exists, the displayed final
   * total should reflect it.
   *
   * For a normal Awaiting_Bill order with
   * no new discount:
   * finalTotal = originalTotal.
   */
  const finalTotal = Math.max(
    0,
    originalTotal
  );

  /*
  |--------------------------------------------------------------------------
  | PRINT
  |--------------------------------------------------------------------------
  */

  const handlePrint = () => {
    window.print();
  };

  /*
  |--------------------------------------------------------------------------
  | ITEMS
  |--------------------------------------------------------------------------
  */

  const items = Array.isArray(
    order.items
  )
    ? order.items
    : [];

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-4 sm:p-6">
      {/* ================================================================
          TOP ACTIONS
      ================================================================= */}

      <div className="flex justify-between items-center mb-5 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 font-bold"
        >
          ← Back to Checkout
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          🖨️ Print Receipt
        </button>
      </div>

      {/* ================================================================
          RECEIPT
      ================================================================= */}

      <div className="receipt-container max-w-sm mx-auto bg-white">
        <div className="border border-gray-300 rounded-lg p-5 font-mono text-xs shadow-sm print:border-0 print:shadow-none print:p-0">
          {/* BUSINESS */}
          <div className="text-center pb-4 border-b border-dashed border-gray-400">
            <h1 className="font-extrabold text-base">
              ETHIO-ORDER PRO
            </h1>

            <p className="text-gray-500 mt-1">
              Restaurant Receipt
            </p>

            <p className="text-gray-400 mt-1">
              Thank you for your visit
            </p>
          </div>

          {/* ORDER INFO */}
          <div className="py-3 border-b border-dashed border-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Order #:</span>
              <span className="font-bold">
                {order.order_id}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Table:</span>
              <span className="font-bold">
                {order.table_number}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Waiter:</span>
              <span className="font-bold">
                {order.waiter_name ||
                  '—'}
              </span>
            </div>

            {order.payment_method && (
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-bold">
                  {order.payment_method.replace(
                    '_',
                    ' '
                  )}
                </span>
              </div>
            )}

            {order.payment_ref && (
              <div className="flex justify-between gap-3">
                <span>Reference:</span>
                <span className="font-bold text-right break-all">
                  {order.payment_ref}
                </span>
              </div>
            )}

            {order.paid_at && (
              <div className="flex justify-between">
                <span>Paid:</span>
                <span className="font-bold">
                  {new Date(
                    order.paid_at
                  ).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* ITEMS */}
          <div className="py-3 border-b border-dashed border-gray-400">
            <div className="flex justify-between font-bold mb-2">
              <span>ITEM</span>
              <span>AMOUNT</span>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-400 italic">
                No items
              </p>
            ) : (
              <div className="space-y-2">
                {items.map(
                  (item, index) => {
                    const quantity =
                      toNumber(
                        item.quantity
                      );

                    const unitPrice =
                      toNumber(
                        item.unit_price
                      );

                    const lineTotal =
                      quantity *
                      unitPrice;

                    return (
                      <div
                        key={
                          item.id ||
                          index
                        }
                      >
                        <div className="flex justify-between gap-3">
                          <span className="flex-1">
                            {quantity}x{' '}
                            {item.name ||
                              'Item'}
                          </span>

                          <span className="whitespace-nowrap">
                            {lineTotal.toFixed(
                              2
                            )}
                          </span>
                        </div>

                        {item.note && (
                          <p className="text-[10px] text-gray-500 italic pl-2">
                            Note: {item.note}
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* TOTALS */}
          <div className="py-3 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>
                ETB{' '}
                {subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Service:</span>
              <span>
                ETB{' '}
                {serviceCharge.toFixed(
                  2
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span>VAT:</span>
              <span>
                ETB{' '}
                {vatAmount.toFixed(2)}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>
                  - ETB{' '}
                  {discount.toFixed(
                    2
                  )}
                </span>
              </div>
            )}

            <div className="border-t border-gray-400 pt-2 mt-2 flex justify-between font-extrabold text-sm">
              <span>TOTAL:</span>

              <span>
                ETB{' '}
                {finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* FOOTER */}
          <div className="text-center pt-3 border-t border-dashed border-gray-400">
            <p className="font-bold">
              Thank you!
            </p>

            <p className="text-gray-500 mt-1">
              Please keep this receipt.
            </p>
          </div>
        </div>
      </div>

      {/* PRINT CSS */}
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            body * {
              visibility: hidden;
            }

            .receipt-container,
            .receipt-container * {
              visibility: visible;
            }

            .receipt-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              max-width: 380px;
              margin: 0;
            }

            @page {
              margin: 10mm;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ReceiptPreview;