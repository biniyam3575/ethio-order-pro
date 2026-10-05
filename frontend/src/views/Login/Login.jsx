import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Icon = ({ name, size = 20, className = '' }) => {
  const paths = {
    logo: (
      <>
        <path d="M12 3v18" />
        <path d="M7 3v5a5 5 0 0 0 10 0V3" />
        <path d="M5 3v5a7 7 0 0 0 14 0V3" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),

    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save token & user state in AuthContext
      loginUser(data);

      // Redirect based on primary role
      const primaryRole = data.user.roles[0];

      if (primaryRole === 'Owner') {
        navigate('/owner');
      } else if (
        primaryRole === 'Manager' ||
        primaryRole === 'General Manager'
      ) {
        navigate('/manager');
      } else if (primaryRole === 'Waiter') {
        navigate('/waiter');
      } else if (primaryRole === 'Kitchen') {
        navigate('/kitchen');
      } else if (primaryRole === 'Cashier') {
        navigate('/cashier');
      } else if (primaryRole === 'Bar') {
        navigate('/bar');
      } else if (primaryRole === 'Hot Drinks') {
        navigate('/hot-drinks');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick-fill credentials
  const fillDemoCredentials = (roleUsername, rolePassword) => {
    setUsername(roleUsername);
    setPassword(rolePassword);
    setError('');
  };

  const demoAccounts = [
    {
      username: 'owner',
      role: 'Owner',
      description: 'Full system access',
    },
    {
      username: 'admin',
      role: 'Manager',
      description: 'Operations management',
    },
    {
      username: 'waiter1',
      role: 'Waitstaff',
      description: 'Tables & orders',
    },
    {
      username: 'kitchen1',
      role: 'Kitchen',
      description: 'Food preparation',
    },
    {
      username: 'bar1',
      role: 'Bar',
      description: 'Beverage preparation',
    },
    {
      username: 'hotdrinks1',
      role: 'Hot Drinks',
      description: 'Coffee & tea service',
    },
    {
      username: 'cashier1',
      role: 'Cashier',
      description: 'Billing & payments',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-4 lg:p-5">

      {/* =========================================================
          MAIN LOGIN CONTAINER
      ========================================================== */}
      <div
  className="
    w-full max-w-6xl
    bg-white
    border border-gray-200
    rounded-2xl
    overflow-hidden
    shadow-sm
    flex flex-col
    lg:flex-row
    lg:h-auto
  "
>

        {/* =========================================================
            LEFT — PRODUCT DESCRIPTION
        ========================================================== */}
        <div
          className="
            hidden lg:flex
            lg:w-[32%]
            bg-gray-950
            text-white
            p-6 xl:p-8
            flex-col
            justify-between
          "
        >
          <div>

            {/* Brand */}
            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-lg bg-white text-gray-950 flex items-center justify-center shrink-0">
                <Icon name="logo" size={19} />
              </div>

              <div>
                <h1 className="text-base font-semibold tracking-tight">
                  DineFlow
                </h1>

                <p className="text-[10px] text-gray-400">
                  Café Operations Management
                </p>
              </div>

            </div>


            {/* Description */}
            <div className="mt-10 xl:mt-12">

              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 mb-2.5">
                One connected workspace
              </p>

              <h2 className="text-2xl xl:text-3xl font-semibold tracking-tight leading-[1.08]">
                Run your café
                <span className="block text-gray-500">
                  with clarity.
                </span>
              </h2>

              <p className="mt-4 text-[13px] leading-5.5 text-gray-400 max-w-sm">
                Keep tables, orders, staff, kitchen workflows,
                inventory and payments connected in one simple
                management system.
              </p>

            </div>


            {/* Features */}
            <div className="mt-7 space-y-2.5">

              <div className="flex items-center gap-3">

                <div className="w-7 h-7 rounded-lg border border-gray-800 flex items-center justify-center shrink-0">
                  <Icon name="grid" size={14} />
                </div>

                <div>
                  <p className="text-[13px] text-gray-200">
                    Connected operations
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Tables, orders and workflows
                  </p>
                </div>

              </div>


              <div className="flex items-center gap-3">

                <div className="w-7 h-7 rounded-lg border border-gray-800 flex items-center justify-center shrink-0">
                  <Icon name="users" size={14} />
                </div>

                <div>
                  <p className="text-[13px] text-gray-200">
                    Role-based workspaces
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Each team works from one place
                  </p>
                </div>

              </div>


              <div className="flex items-center gap-3">

                <div className="w-7 h-7 rounded-lg border border-gray-800 flex items-center justify-center shrink-0">
                  <Icon name="shield" size={14} />
                </div>

                <div>
                  <p className="text-[13px] text-gray-200">
                    Controlled access
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Secure role-based access
                  </p>
                </div>

              </div>

            </div>

          </div>


          {/* Footer */}
          <div className="text-[10px] text-gray-600">
            © {new Date().getFullYear()} DineFlow
            <span className="mx-2">•</span>
            Café Management System
          </div>

        </div>


        {/* =========================================================
            MIDDLE — LOGIN
        ========================================================== */}
        <div
          className="
            flex-1
            lg:w-[35%]
            flex
            flex-col
            border-b
            lg:border-b-0
            lg:border-r
            border-gray-200
          "
        >

          <div
            className="
              flex-1
              px-5 py-7
              sm:px-8 sm:py-9
              lg:px-8 lg:py-8
              xl:px-10
            "
          >

            {/* Mobile Brand */}
            <div className="lg:hidden flex items-center gap-3 mb-8">

              <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center">
                <Icon name="logo" size={20} />
              </div>

              <div>
                <h1 className="text-lg font-semibold text-gray-950">
                  DineFlow
                </h1>

                <p className="text-[11px] text-gray-500">
                  Café Operations Management
                </p>
              </div>

            </div>


            {/* Login Content */}
            <div className="w-full max-w-sm mx-auto">

              <div className="mb-7">

                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Secure Sign In
                </p>

                <h2 className="text-2xl font-semibold text-gray-950 tracking-tight">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm text-gray-500 leading-5">
                  Sign in to access your workspace.
                </p>

              </div>


              {/* Error */}
              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                  <div className="flex items-start gap-2">

                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />

                    <p className="text-sm text-red-700 leading-5">
                      {error}
                    </p>

                  </div>
                </div>
              )}


              {/* Login Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* Username */}
                <div>

                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-800 mb-1.5"
                  >
                    Username
                  </label>

                  <div className="relative">

                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                      <Icon name="user" size={17} />
                    </div>

                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      autoComplete="username"
                      required
                      className="
                        w-full h-11
                        pl-11 pr-4
                        border border-gray-300
                        rounded-lg
                        bg-white
                        text-gray-900
                        text-sm
                        outline-none
                        transition
                        placeholder:text-gray-400
                        focus:border-gray-950
                        focus:ring-2
                        focus:ring-gray-950/10
                      "
                    />

                  </div>

                </div>


                {/* Password */}
                <div>

                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-800 mb-1.5"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                      <Icon name="lock" size={17} />
                    </div>

                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="
                        w-full h-11
                        pl-11 pr-4
                        border border-gray-300
                        rounded-lg
                        bg-white
                        text-gray-900
                        text-sm
                        outline-none
                        transition
                        placeholder:text-gray-400
                        focus:border-gray-950
                        focus:ring-2
                        focus:ring-gray-950/10
                      "
                    />

                  </div>

                </div>


                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full h-11
                    rounded-lg
                    text-sm font-medium
                    transition
                    flex items-center justify-center gap-2
                    ${
                      loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-950 text-white hover:bg-gray-800 cursor-pointer'
                    }
                  `}
                >

                  {loading ? (
                    <>
                      <svg
                        className="animate-spin"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="2"
                          opacity="0.3"
                        />

                        <path
                          d="M21 12a9 9 0 0 1-9 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>

                      Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In
                      <Icon name="arrow" size={17} />
                    </>
                  )}

                </button>

              </form>


              {/* Small security note */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <Icon name="shield" size={13} />
                <span>Secure role-based access</span>
              </div>

            </div>
          </div>


          {/* Mobile Footer */}
          <div className="lg:hidden px-5 sm:px-8 pb-5">

            <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
              DineFlow • Café Operations Management
            </div>

          </div>

        </div>


        {/* =========================================================
            RIGHT — QUICK DEMO
        ========================================================== */}
        <div
          className="
            lg:w-[33%]
            bg-gray-50
            flex
            flex-col
            px-5 py-6
            sm:px-7 sm:py-7
            lg:px-5 lg:py-7
            xl:px-6
          "
        >

          <div className="flex-1">

            {/* Heading */}
            <div className="mb-4">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-base font-semibold text-gray-950">
                    Quick Access
                  </h3>

                  <p className="text-[11px] text-gray-500 mt-1">
                    Select a workspace to fill the login details.
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                  <Icon name="users" size={15} />
                </div>

              </div>

            </div>


            {/* Demo Accounts
                2 per row
                Last account takes full row
            */}
            <div className="grid grid-cols-2 gap-2">

              {demoAccounts.map((account, index) => {

                const isLast =
                  index === demoAccounts.length - 1;

                return (
                  <button
                    key={account.username}
                    type="button"
                    onClick={() =>
                      fillDemoCredentials(
                        account.username,
                        '123456'
                      )
                    }
                    className={`
                      group
                      ${isLast ? 'col-span-2' : ''}
                      w-full
                      text-left
                      bg-white
                      border border-gray-200
                      rounded-lg
                      px-3 py-2.5
                      hover:border-gray-950
                      hover:bg-gray-50
                      transition
                      cursor-pointer
                    `}
                  >

                    <div className="flex items-center justify-between gap-2">

                      <div className="min-w-0">

                        <div className="flex items-center gap-1.5 min-w-0">

                          <span className="text-sm font-medium text-gray-900 truncate">
                            {account.role}
                          </span>

                          <span className="text-[9px] text-gray-400 font-mono truncate">
                            {account.username}
                          </span>

                        </div>

                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                          {account.description}
                        </p>

                      </div>

                      <Icon
                        name="arrow"
                        size={13}
                        className="
                          shrink-0
                          text-gray-400
                          group-hover:text-gray-900
                          group-hover:translate-x-0.5
                          transition
                        "
                      />

                    </div>

                  </button>
                );
              })}

            </div>


            {/* Demo password information */}
            <div className="mt-4 p-2.5 rounded-lg border border-gray-200 bg-white">

              <div className="flex items-start gap-2">

                <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                  <Icon name="lock" size={13} />
                </div>

                <div>

                  <p className="text-xs font-medium text-gray-800">
                    Demo access
                  </p>

                  <p className="text-[10px] text-gray-500 leading-4 mt-0.5">
                    Select any workspace to automatically fill
                    its configured demo credentials.
                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* Desktop Footer */}
          <div className="hidden lg:block pt-4">

            <div className="border-t border-gray-200 pt-3 text-[10px] text-gray-400 leading-4">
              Choose a workspace to explore its available
              café operations tools.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;