import React, { useState } from 'react';

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const ReceiptIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 8h6M9 12h6M9 16h3"
    />
  </svg>
);

const TableIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect x="4" y="7" width="16" height="10" rx="2" />
    <path
      strokeLinecap="round"
      d="M8 7V5M16 7V5M8 17v2M16 17v2"
    />
  </svg>
);

const AlertIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4M12 17h.01"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.3 4.7L2.9 17.5A1.5 1.5 0 004.2 20h15.6a1.5 1.5 0 001.3-2.5L13.7 4.7a2 2 0 00-3.4 0z"
    />
  </svg>
);

const CashIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path
      strokeLinecap="round"
      d="M6 9h.01M18 15h.01"
    />
  </svg>
);

const DigitalIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path
      strokeLinecap="round"
      d="M7 9h10M7 13h4M7 16h2"
    />
  </svg>
);

const CheckIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 12l4 4L19 6"
    />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const PaymentCheckout = ({
  table,
  token,
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] =
    useState('Cash');

  const [paymentRef, setPaymentRef] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [fiscalReceiptNo, setFiscalReceiptNo] =
    useState('');

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  /* ---------------------------------------------------------------------- */
  /* Financial Values                                                        */
  /* ---------------------------------------------------------------------- */

  const rawSubtotal = parseFloat(
    table.total_subtotal || table.subtotal || 0
  );

  const rawService = parseFloat(
    table.total_service_charge ||
      table.service_charge ||
      0
  );

  const rawVat = parseFloat(
    table.total_vat ||
      table.vat_amount ||
      0
  );

  const finalPayable = parseFloat(
    table.group_total_amount ||
      table.total_amount ||
      0
  );

  const cashGiven = parseFloat(cashReceived) || 0;

  const changeGiven =
    paymentMethod === 'Cash'
      ? Math.max(0, cashGiven - finalPayable)
      : 0;

  /* ---------------------------------------------------------------------- */
  /* Payment                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      paymentMethod === 'Cash' &&
      cashGiven < finalPayable
    ) {
      setError(
        `Insufficient cash. Short by ${(
          finalPayable - cashGiven
        ).toFixed(2)} ETB`
      );
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const authToken =
        token || localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:5000/api/v1/bills/process-table-payment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            tableId: table.table_id,
            payment_method: paymentMethod,
            payment_ref:
              paymentRef.trim() || null,
            cash_received:
              paymentMethod === 'Cash'
                ? cashGiven
                : finalPayable,
            fiscal_receipt_no:
              fiscalReceiptNo.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Payment settlement failed.'
        );
      }

      onPaymentSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <form
      onSubmit={handleSubmit}
      className="
        bg-white
        border border-gray-200
        rounded-lg
        overflow-hidden
      "
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="
          flex flex-col
          sm:flex-row
          sm:items-center
          sm:justify-between
          gap-3
        ">
          <div className="flex items-center gap-3">
            <div className="
              w-10 h-10
              rounded-md
              bg-gray-950
              text-white
              flex items-center justify-center
            ">
              <TableIcon className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400 font-semibold">
                Checkout
              </p>

              <h2 className="text-lg font-bold text-gray-950">
                Table #{table.table_number}
              </h2>

              <p className="text-xs text-gray-500 mt-0.5">
                Waiter: {table.waiter_name || 'Unassigned'}
              </p>
            </div>
          </div>

          {table.section && (
            <span className="
              self-start sm:self-auto
              px-2.5 py-1
              rounded-md
              bg-gray-100
              border border-gray-200
              text-[10px]
              font-bold
              uppercase
              tracking-wide
              text-gray-600
            ">
              {table.section}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Error */}
        {error && (
          <div className="
            flex items-start gap-3
            px-3.5 py-3
            rounded-md
            bg-red-50
            border border-red-200
            text-red-700
          ">
            <AlertIcon className="w-4 h-4 mt-0.5 shrink-0" />

            <p className="text-xs leading-5">
              {error}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Order Breakdown                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Order Summary
              </h3>

              <p className="text-xs text-gray-400 mt-0.5">
                Items included in this settlement
              </p>
            </div>

            <ReceiptIcon className="w-4 h-4 text-gray-400" />
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            {table.orders_breakdown?.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {table.orders_breakdown.map((order) => (
                  <div
                    key={order.order_id}
                    className="p-3.5"
                  >
                    <div className="
                      flex items-center justify-between
                      mb-2.5
                    ">
                      <span className="
                        text-[10px]
                        uppercase
                        tracking-wide
                        font-bold
                        text-gray-400
                      ">
                        Ticket #{order.order_id}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {order.items?.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="
                              flex
                              items-center
                              justify-between
                              gap-4
                              text-xs
                            "
                          >
                            <span className="text-gray-600">
                              <span className="font-semibold text-gray-900">
                                {item.quantity}×
                              </span>{' '}
                              {item.name}
                            </span>

                            <span className="
                              shrink-0
                              font-mono
                              font-medium
                              text-gray-700
                            ">
                              {(
                                item.quantity *
                                parseFloat(
                                  item.unit_price
                                )
                              ).toFixed(2)}{' '}
                              ETB
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-xs text-gray-400 text-center">
                No order breakdown available.
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Amount                                                            */}
        {/* ---------------------------------------------------------------- */}

        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            Amount Due
          </h3>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">
                  Subtotal
                </span>
                <span className="font-mono text-gray-700">
                  {rawSubtotal.toFixed(2)} ETB
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-gray-500">
                  Service Charge
                </span>
                <span className="font-mono text-gray-700">
                  {rawService.toFixed(2)} ETB
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-gray-500">
                  VAT
                </span>
                <span className="font-mono text-gray-700">
                  {rawVat.toFixed(2)} ETB
                </span>
              </div>
            </div>

            <div className="
              px-4 py-4
              bg-gray-50
              border-t border-gray-200
              flex items-center justify-between
            ">
              <span className="text-sm font-bold text-gray-900">
                Total Due
              </span>

              <span className="
                text-xl
                font-bold
                tracking-tight
                text-gray-950
              ">
                {finalPayable.toFixed(2)}
                <span className="ml-1 text-xs font-semibold text-gray-500">
                  ETB
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Payment Method                                                    */}
        {/* ---------------------------------------------------------------- */}

        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            Payment Method
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                value: 'Cash',
                label: 'Cash',
                icon: <CashIcon />,
              },
              {
                value: 'Telebirr',
                label: 'Telebirr',
                icon: <DigitalIcon />,
              },
              {
                value: 'CBE_Birr',
                label: 'CBE Birr',
                icon: <DigitalIcon />,
              },
            ].map((method) => {
              const selected =
                paymentMethod === method.value;

              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() =>
                    setPaymentMethod(method.value)
                  }
                  className={`
                    flex items-center gap-3
                    p-3
                    rounded-md
                    border
                    text-left
                    transition-colors
                    cursor-pointer
                    ${
                      selected
                        ? 'border-gray-950 bg-gray-950 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span
                    className={
                      selected
                        ? 'text-white'
                        : 'text-gray-500'
                    }
                  >
                    {method.icon}
                  </span>

                  <span className="text-xs font-bold">
                    {method.label}
                  </span>

                  {selected && (
                    <CheckIcon className="w-3.5 h-3.5 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Payment Details                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paymentMethod === 'Cash' ? (
              <div className="sm:col-span-2">
                <label className="
                  block
                  text-xs
                  font-semibold
                  text-gray-700
                  mb-1.5
                ">
                  Cash Received <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={cashReceived}
                    onChange={(e) => {
                      setCashReceived(e.target.value);
                      setError('');
                    }}
                    className="
                      w-full
                      h-11
                      px-3
                      pr-14
                      rounded-md
                      border border-gray-200
                      bg-white
                      text-sm
                      font-mono
                      text-gray-900
                      outline-none
                      focus:border-gray-500
                      transition-colors
                    "
                    placeholder="0.00"
                  />

                  <span className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-xs
                    font-semibold
                    text-gray-400
                  ">
                    ETB
                  </span>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="
                  block
                  text-xs
                  font-semibold
                  text-gray-700
                  mb-1.5
                ">
                  Transaction Reference
                  <span className="ml-1 text-gray-400 font-normal">
                    Optional
                  </span>
                </label>

                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) =>
                    setPaymentRef(e.target.value)
                  }
                  className="
                    w-full
                    h-11
                    px-3
                    rounded-md
                    border border-gray-200
                    bg-white
                    text-sm
                    font-mono
                    text-gray-900
                    outline-none
                    focus:border-gray-500
                    transition-colors
                  "
                  placeholder="Enter transaction ID"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="
                block
                text-xs
                font-semibold
                text-gray-700
                mb-1.5
              ">
                Fiscal Receipt Number
                <span className="ml-1 text-gray-400 font-normal">
                  Optional
                </span>
              </label>

              <input
                type="text"
                value={fiscalReceiptNo}
                onChange={(e) =>
                  setFiscalReceiptNo(e.target.value)
                }
                className="
                  w-full
                  h-11
                  px-3
                  rounded-md
                  border border-gray-200
                  bg-white
                  text-sm
                  font-mono
                  text-gray-900
                  outline-none
                  focus:border-gray-500
                  transition-colors
                "
                placeholder="Enter fiscal receipt number"
              />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Change                                                            */}
        {/* ---------------------------------------------------------------- */}

        {paymentMethod === 'Cash' && (
          <div className="
            px-4 py-4
            rounded-md
            border border-amber-200
            bg-amber-50
            flex items-center justify-between
            gap-4
          ">
            <div>
              <p className="text-xs font-semibold text-amber-900">
                Change to Customer
              </p>

              <p className="text-[11px] text-amber-700 mt-0.5">
                Amount to return after payment
              </p>
            </div>

            <p className="
              text-xl
              font-bold
              font-mono
              text-amber-900
              shrink-0
            ">
              {changeGiven.toFixed(2)}
              <span className="ml-1 text-xs font-semibold">
                ETB
              </span>
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Submit                                                            */}
        {/* ---------------------------------------------------------------- */}

        <button
          type="submit"
          disabled={processing}
          className="
            w-full
            h-12
            flex items-center justify-center gap-2
            rounded-md
            bg-gray-950
            text-white
            text-sm
            font-bold
            hover:bg-gray-800
            transition-colors
            cursor-pointer
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {processing ? (
            <>
              <span className="
                w-4 h-4
                rounded-full
                border-2
                border-white/30
                border-t-white
                animate-spin
              " />
              Processing payment...
            </>
          ) : (
            <>
              <CheckIcon />
              Complete Payment
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PaymentCheckout;