import React, {
  useState,
  useContext,
  useMemo,
} from 'react';

import { AuthContext } from '../../context/AuthContext';

const PaymentCheckout = ({
  order,
  onSuccess,
  onPrintPreview,
}) => {
  const { token } = useContext(AuthContext);

  const [paymentMethod, setPaymentMethod] =
    useState('Cash');

  const [paymentRef, setPaymentRef] =
    useState('');

  const [cashGiven, setCashGiven] =
    useState('');

  const [discount, setDiscount] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  /*
  |--------------------------------------------------------------------------
  | SAFE NUMBER
  |--------------------------------------------------------------------------
  */

  const toNumber = (value) => {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  };

  /*
  |--------------------------------------------------------------------------
  | ORDER AMOUNTS
  |--------------------------------------------------------------------------
  */

  const subtotal = toNumber(order?.subtotal);

  const serviceCharge =
    toNumber(order?.service_charge);

  const vatAmount =
    toNumber(order?.vat_amount);

  /*
   * The order already contains discount_amount.
   * We use it as the starting discount value.
   */
  const originalDiscount =
    toNumber(order?.discount_amount);

  const enteredDiscount =
    toNumber(discount);

  /*
   * Do not allow the discount to become larger
   * than the amount before discount.
   */
  const maximumDiscount = Math.max(
    0,
    subtotal + serviceCharge + vatAmount
  );

  const safeDiscount = Math.min(
    enteredDiscount,
    maximumDiscount
  );

  const originalTotal =
    toNumber(order?.total_amount);

  const finalTotal = useMemo(() => {
    /*
     * When no new discount was entered,
     * use the existing order total.
     *
     * When the cashier enters a discount,
     * subtract it from the original total.
     */
    if (
      discount === '' &&
      originalDiscount > 0
    ) {
      return Math.max(
        0,
        originalTotal
      );
    }

    return Math.max(
      0,
      originalTotal - safeDiscount
    );
  }, [
    discount,
    originalDiscount,
    originalTotal,
    safeDiscount,
  ]);

  const cashReceived =
    toNumber(cashGiven);

  const changeAmount =
    Math.max(
      0,
      cashReceived - finalTotal
    );

  const insufficientCash =
    paymentMethod === 'Cash' &&
    cashGiven !== '' &&
    cashReceived < finalTotal;

  /*
  |--------------------------------------------------------------------------
  | PAYMENT METHODS
  |--------------------------------------------------------------------------
  */

  const paymentMethods = [
    {
      value: 'Cash',
      label: 'Cash',
      icon: '💵',
    },
    {
      value: 'Telebirr',
      label: 'Telebirr',
      icon: '📱',
    },
    {
      value: 'CBE_Birr',
      label: 'CBE Birr',
      icon: '📱',
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | PAYMENT METHOD CHANGE
  |--------------------------------------------------------------------------
  */

  const handlePaymentMethodChange = (
    method
  ) => {
    setPaymentMethod(method);
    setError('');

    /*
     * Clear fields that belong to another
     * payment method.
     */
    if (method === 'Cash') {
      setPaymentRef('');
    } else {
      setCashGiven('');
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DISCOUNT CHANGE
  |--------------------------------------------------------------------------
  */

  const handleDiscountChange = (e) => {
    const value = e.target.value;

    if (value === '') {
      setDiscount('');
      return;
    }

    const number = parseFloat(value);

    if (!Number.isFinite(number)) {
      return;
    }

    if (number < 0) {
      setDiscount('0');
      return;
    }

    if (number > maximumDiscount) {
      setDiscount(
        maximumDiscount.toFixed(2)
      );
      return;
    }

    setDiscount(value);
  };

  /*
  |--------------------------------------------------------------------------
  | PAYMENT VALIDATION
  |--------------------------------------------------------------------------
  */

  const validatePayment = () => {
    if (!order?.order_id) {
      return 'Invalid order selected.';
    }

    if (finalTotal < 0) {
      return 'Invalid payment total.';
    }

    if (paymentMethod === 'Cash') {
      if (cashGiven === '') {
        return 'Please enter the cash received.';
      }

      if (cashReceived < finalTotal) {
        return `Insufficient cash. Customer still owes ETB ${(finalTotal - cashReceived).toFixed(2)}.`;
      }
    }

    if (
      paymentMethod === 'Telebirr' ||
      paymentMethod === 'CBE_Birr'
    ) {
      if (!paymentRef.trim()) {
        return 'Please enter the transaction reference.';
      }
    }

    return '';
  };

  /*
  |--------------------------------------------------------------------------
  | COMPLETE PAYMENT
  |--------------------------------------------------------------------------
  */

  const handlePay = async (e) => {
    e.preventDefault();

    if (submitting) {
      return;
    }

    setError('');

    const validationError =
      validatePayment();

    if (validationError) {
      setError(validationError);
      return;
    }

    const activeToken =
      token || localStorage.getItem('token');

    if (!activeToken) {
      setError(
        'Your session has expired. Please login again.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Confirm payment of ETB ${finalTotal.toFixed(
          2
        )} for Table ${order.table_number}?`
      );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `http://localhost:5000/api/v1/orders/${order.order_id}/pay`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization: `Bearer ${activeToken}`,
          },

          body: JSON.stringify({
            payment_method:
              paymentMethod,

            payment_ref:
              paymentMethod === 'Cash'
                ? null
                : paymentRef.trim(),

            discount_amount:
              safeDiscount,
          }),
        }
      );

      let data = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 401) {
        throw new Error(
          'Your session has expired. Please login again.'
        );
      }

      if (res.status === 403) {
        throw new Error(
          'You do not have permission to process this payment.'
        );
      }

      if (!res.ok) {
        throw new Error(
          data.message ||
            'Payment processing failed.'
        );
      }

      /*
       * Backend successfully finalized:
       *
       * Order → Paid
       * Table → Available
       */
      alert(
        `Payment of ETB ${finalTotal.toFixed(
          2
        )} completed successfully.`
      );

      if (typeof onSuccess === 'function') {
        await onSuccess({
          ...order,
          payment_method:
            paymentMethod,
          payment_ref:
            paymentMethod === 'Cash'
              ? null
              : paymentRef.trim(),
          discount_amount:
            safeDiscount,
          total_amount:
            finalTotal,
          paid_at:
            new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(
        'Payment processing error:',
        err
      );

      setError(
        err.message ||
          'Unable to process payment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | NO ORDER
  |--------------------------------------------------------------------------
  */

  if (!order) {
    return (
      <div className="p-8 text-center text-gray-400">
        No order selected.
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <form
      onSubmit={handlePay}
      className="p-4 sm:p-6 space-y-5"
    >
      {/* ================================================================
          HEADER
      ================================================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase">
            Awaiting Payment
          </p>

          <h2 className="text-xl font-extrabold text-gray-800 mt-1">
            Table {order.table_number}
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Order #{order.order_id}
            {order.waiter_name
              ? ` • Waiter: ${order.waiter_name}`
              : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onPrintPreview}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 transition"
        >
          🖨️ Receipt Preview
        </button>
      </div>

      {/* ================================================================
          ERROR
      ================================================================= */}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <p className="font-bold">
            Payment error
          </p>

          <p className="text-xs mt-1">
            {error}
          </p>
        </div>
      )}

      {/* ================================================================
          ORDER ITEMS
      ================================================================= */}

      <div>
        <h3 className="font-extrabold text-gray-700 text-sm mb-3">
          Order Items
        </h3>

        <div className="border rounded-lg overflow-hidden">
          {Array.isArray(order.items) &&
          order.items.length > 0 ? (
            <div className="divide-y">
              {order.items.map(
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
                    quantity * unitPrice;

                  return (
                    <div
                      key={
                        item.id ||
                        index
                      }
                      className="p-3 flex justify-between items-start gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">
                          <span className="text-blue-600 mr-2">
                            {quantity}×
                          </span>

                          {item.name ||
                            'Unknown item'}
                        </p>

                        {item.note && (
                          <p className="text-xs text-red-500 italic mt-1">
                            Note: {item.note}
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mt-1">
                          ETB{' '}
                          {unitPrice.toFixed(
                            2
                          )}{' '}
                          each
                        </p>
                      </div>

                      <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                        ETB{' '}
                        {lineTotal.toFixed(
                          2
                        )}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="p-5 text-center text-xs text-gray-400">
              No order items found.
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          BILL SUMMARY
      ================================================================= */}

      <div>
        <h3 className="font-extrabold text-gray-700 text-sm mb-3">
          Bill Summary
        </h3>

        <div className="bg-gray-50 border rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Subtotal
            </span>

            <span className="font-semibold">
              ETB {subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Service Charge
            </span>

            <span className="font-semibold">
              ETB{' '}
              {serviceCharge.toFixed(
                2
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              VAT
            </span>

            <span className="font-semibold">
              ETB {vatAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600">
              Original Total
            </span>

            <span className="font-bold">
              ETB {originalTotal.toFixed(2)}
            </span>
          </div>

          {/* DISCOUNT */}
          <div className="pt-2">
            <label
              htmlFor="discount"
              className="block text-xs font-bold text-gray-600 mb-1"
            >
              Discount (ETB)
            </label>

            <input
              id="discount"
              type="number"
              min="0"
              max={maximumDiscount}
              step="0.01"
              value={discount}
              onChange={
                handleDiscountChange
              }
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            />
          </div>

          {safeDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>

              <span className="font-bold">
                - ETB{' '}
                {safeDiscount.toFixed(
                  2
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3 mt-2">
            <span className="font-extrabold text-gray-800">
              TOTAL
            </span>

            <span className="text-xl font-extrabold text-blue-600">
              ETB {finalTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================
          PAYMENT METHOD
      ================================================================= */}

      <div>
        <h3 className="font-extrabold text-gray-700 text-sm mb-3">
          Payment Method
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {paymentMethods.map(
            (method) => {
              const selected =
                paymentMethod ===
                method.value;

              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() =>
                    handlePaymentMethodChange(
                      method.value
                    )
                  }
                  className={`p-3 rounded-lg border-2 transition ${
                    selected
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl">
                    {method.icon}
                  </div>

                  <div className="text-xs font-extrabold mt-1">
                    {method.label}
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* ================================================================
          CASH
      ================================================================= */}

      {paymentMethod === 'Cash' && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <label
            htmlFor="cashGiven"
            className="block text-xs font-extrabold text-gray-700 mb-1"
          >
            Cash Received (ETB)
          </label>

          <input
            id="cashGiven"
            type="number"
            min="0"
            step="0.01"
            value={cashGiven}
            onChange={(e) =>
              setCashGiven(
                e.target.value
              )
            }
            placeholder="Enter amount received"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500"
          />

          {cashGiven !== '' && (
            <div className="mt-3">
              {insufficientCash ? (
                <p className="text-sm font-bold text-red-600">
                  Insufficient cash:
                  {' '}
                  ETB{' '}
                  {(
                    finalTotal -
                    cashReceived
                  ).toFixed(2)}{' '}
                  remaining
                </p>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-600">
                    Change
                  </span>

                  <span className="text-lg font-extrabold text-green-700">
                    ETB{' '}
                    {changeAmount.toFixed(
                      2
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          DIGITAL PAYMENT
      ================================================================= */}

      {paymentMethod !== 'Cash' && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <label
            htmlFor="paymentRef"
            className="block text-xs font-extrabold text-gray-700 mb-1"
          >
            Transaction Reference
          </label>

          <input
            id="paymentRef"
            type="text"
            required
            value={paymentRef}
            onChange={(e) =>
              setPaymentRef(
                e.target.value
              )
            }
            placeholder="e.g. TXN123456789"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          />

          <p className="text-[11px] text-gray-500 mt-2">
            Enter the transaction/reference number from the customer's payment.
          </p>
        </div>
      )}

      {/* ================================================================
          COMPLETE PAYMENT
      ================================================================= */}

      <div className="pt-2 border-t">
        <button
          type="submit"
          disabled={
            submitting ||
            insufficientCash
          }
          className={`w-full py-3 rounded-lg text-sm font-extrabold transition ${
            submitting ||
            insufficientCash
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {submitting
            ? 'Processing Payment...'
            : `✓ Complete Payment — ETB ${finalTotal.toFixed(
                2
              )}`}
        </button>
      </div>
    </form>
  );
};

export default PaymentCheckout;