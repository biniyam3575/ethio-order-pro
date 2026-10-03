import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import { AuthContext } from '../../context/AuthContext';

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const LockIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect
      x="5"
      y="10"
      width="14"
      height="10"
      rx="2"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 10V7a4 4 0 018 0v3"
    />
  </svg>
);

const UnlockIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect
      x="5"
      y="10"
      width="14"
      height="10"
      rx="2"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 10V7a4 4 0 017.5-1.9"
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

const ShiftManager = ({ onShiftChange }) => {
  const { token } = useContext(AuthContext);

  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);

  const [openingCash, setOpeningCash] = useState('');
  const [actualCash, setActualCash] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [processing, setProcessing] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Response Parser                                                         */
  /* ---------------------------------------------------------------------- */

  const parseResponse = async (response) => {
    const contentType =
      response.headers.get('content-type');

    if (
      contentType &&
      contentType.includes('application/json')
    ) {
      return await response.json();
    }

    const text = await response.text();

    throw new Error(
      `Server returned HTML (${response.status} ${response.statusText}). Endpoint might not exist on backend.`
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Current Shift                                                           */
  /* ---------------------------------------------------------------------- */

  const fetchCurrentShift = useCallback(async () => {
    try {
      setError('');

      const authToken =
        token || localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:5000/api/v1/shifts/current',
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.status === 404) {
        setActiveShift(null);
        return;
      }

      const data = await parseResponse(response);

      if (response.ok && data.active) {
        setActiveShift(data.data);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error(
        'Error loading shift status:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  /* ---------------------------------------------------------------------- */
  /* Open Shift                                                              */
  /* ---------------------------------------------------------------------- */

  const handleOpenShift = async (e) => {
    e.preventDefault();

    setProcessing(true);
    setError('');
    setMessage('');

    try {
      const authToken =
        token || localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:5000/api/v1/shifts/open',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            opening_cash:
              parseFloat(openingCash) || 0,
          }),
        }
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to open shift.'
        );
      }

      setMessage(
        'Cashier shift opened successfully.'
      );

      setOpeningCash('');

      await fetchCurrentShift();

      if (onShiftChange) {
        onShiftChange();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Close Shift                                                             */
  /* ---------------------------------------------------------------------- */

  const handleCloseShift = async (e) => {
    e.preventDefault();

    setProcessing(true);
    setError('');
    setMessage('');

    try {
      const authToken =
        token || localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:5000/api/v1/shifts/close',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            actual_cash:
              parseFloat(actualCash) || 0,
          }),
        }
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to close shift.'
        );
      }

      setMessage(
        'Cashier shift closed successfully.'
      );

      setActualCash('');

      await fetchCurrentShift();

      if (onShiftChange) {
        onShiftChange();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                  */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="
        bg-white
        border border-gray-200
        rounded-lg
        p-6
      ">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="
            w-5 h-5
            rounded-full
            border-2
            border-gray-200
            border-t-gray-900
            animate-spin
          " />

          Checking register status...
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="
      bg-white
      border border-gray-200
      rounded-lg
      overflow-hidden
    ">
      {/* Header */}
      <div className="
        px-5 py-4
        border-b border-gray-200
        flex items-center justify-between
        gap-4
      ">
        <div className="flex items-center gap-3">
          <div className="
            w-10 h-10
            rounded-md
            bg-gray-100
            text-gray-700
            flex items-center justify-center
          ">
            {activeShift ? (
              <UnlockIcon className="w-5 h-5" />
            ) : (
              <LockIcon className="w-5 h-5" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Register Shift
            </h2>

            <p className="text-xs text-gray-400 mt-0.5">
              Manage your cashier session and cash drawer.
            </p>
          </div>
        </div>

        <span className={`
          shrink-0
          inline-flex items-center gap-1.5
          px-2.5 py-1
          rounded-md
          border
          text-[10px]
          font-bold
          uppercase
          tracking-wide
          ${
            activeShift
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }
        `}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeShift
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            }`}
          />

          {activeShift
            ? 'Register Open'
            : 'Register Closed'}
        </span>
      </div>

      <div className="p-5">
        {/* Messages */}
        {error && (
          <div className="
            mb-4
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

        {message && (
          <div className="
            mb-4
            flex items-start gap-3
            px-3.5 py-3
            rounded-md
            bg-emerald-50
            border border-emerald-200
            text-emerald-700
          ">
            <CheckIcon className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-5">
              {message}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Active Shift                                                      */}
        {/* ---------------------------------------------------------------- */}

        {activeShift ? (
          <div className="space-y-5">
            <div className="
              grid
              grid-cols-1
              sm:grid-cols-2
              gap-px
              bg-gray-200
              border border-gray-200
              rounded-md
              overflow-hidden
            ">
              <div className="bg-white p-4">
                <p className="
                  text-[10px]
                  uppercase
                  tracking-wide
                  font-bold
                  text-gray-400
                ">
                  Opened At
                </p>

                <p className="mt-1.5 text-sm font-semibold text-gray-900">
                  {new Date(
                    activeShift.opening_time ||
                      activeShift.created_at
                  ).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="bg-white p-4">
                <p className="
                  text-[10px]
                  uppercase
                  tracking-wide
                  font-bold
                  text-gray-400
                ">
                  Opening Float
                </p>

                <p className="
                  mt-1.5
                  text-sm
                  font-mono
                  font-bold
                  text-gray-900
                ">
                  {parseFloat(
                    activeShift.opening_cash || 0
                  ).toFixed(2)}{' '}
                  ETB
                </p>
              </div>

              <div className="
                sm:col-span-2
                bg-gray-50
                p-4
                flex items-center justify-between
                gap-4
              ">
                <div>
                  <p className="
                    text-[10px]
                    uppercase
                    tracking-wide
                    font-bold
                    text-gray-400
                  ">
                    Expected Cash
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Current expected drawer balance
                  </p>
                </div>

                <p className="
                  text-xl
                  font-bold
                  font-mono
                  text-gray-950
                  shrink-0
                ">
                  {parseFloat(
                    activeShift.expected_cash || 0
                  ).toFixed(2)}{' '}
                  <span className="text-xs text-gray-400">
                    ETB
                  </span>
                </p>
              </div>
            </div>

            {/* Close shift */}
            <form
              onSubmit={handleCloseShift}
              className="
                border-t
                border-gray-200
                pt-5
              "
            >
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Close Register
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  Count the physical cash in the drawer and
                  enter the final amount.
                </p>
              </div>

              <label className="
                block
                text-xs
                font-semibold
                text-gray-700
                mb-1.5
              ">
                Counted Cash
                <span className="text-red-500 ml-1">*</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={actualCash}
                  onChange={(e) =>
                    setActualCash(e.target.value)
                  }
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
                    outline-none
                    focus:border-gray-500
                  "
                  placeholder="Enter counted cash"
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

              <button
                type="submit"
                disabled={processing}
                className="
                  w-full
                  h-11
                  mt-3
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
                    Closing register...
                  </>
                ) : (
                  <>
                    <LockIcon className="w-4 h-4" />
                    Close Register
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ---------------------------------------------------------------- */
          /* Closed Shift                                                     */
          /* ---------------------------------------------------------------- */
          <form
            onSubmit={handleOpenShift}
            className="space-y-5"
          >
            <div className="
              p-4
              rounded-md
              bg-gray-50
              border border-gray-200
            ">
              <div className="flex items-start gap-3">
                <div className="
                  shrink-0
                  w-9 h-9
                  rounded-md
                  bg-white
                  border border-gray-200
                  text-gray-600
                  flex items-center justify-center
                ">
                  <CashIcon className="w-4 h-4" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Open your cashier register
                  </h3>

                  <p className="
                    mt-1
                    text-xs
                    leading-5
                    text-gray-500
                  ">
                    Enter the starting cash available in
                    your drawer. Once the shift is open,
                    you can process guest payments.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="
                block
                text-xs
                font-semibold
                text-gray-700
                mb-1.5
              ">
                Starting Cash Float
                <span className="text-red-500 ml-1">*</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={openingCash}
                  onChange={(e) =>
                    setOpeningCash(e.target.value)
                  }
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
                    outline-none
                    focus:border-gray-500
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

            <button
              type="submit"
              disabled={processing}
              className="
                w-full
                h-11
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
                  Opening register...
                </>
              ) : (
                <>
                  <UnlockIcon className="w-4 h-4" />
                  Open Register
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ShiftManager;