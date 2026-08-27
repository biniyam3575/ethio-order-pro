import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

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
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // 1. Save token & user state in AuthContext
      loginUser(data);

      // 2. Redirect automatically based on primary role
      const primaryRole = data.user.roles[0];
      if (primaryRole === 'Manager') {
        navigate('/manager');
      } else if (primaryRole === 'Waiter') {
        navigate('/waiter');
      } else if (primaryRole === 'Kitchen') {
        navigate('/kitchen');
      } else if (primaryRole === 'Cashier') {
        navigate('/cashier');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick-Fill Demo Credentials Handler
  const fillDemoCredentials = (roleUsername, rolePassword) => {
    setUsername(roleUsername);
    setPassword(rolePassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Ethio-Order Pro v2.0
        </h2>
        <p className="text-sm text-center text-gray-500 mb-6">
          Café & Table Management System
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition font-medium"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Portfolio Demo Credentials Quick Switcher */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500 font-semibold mb-3">
            PORTFOLIO DEMO ACCOUNTS (ONE-CLICK)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin', '123456')}
              className="bg-purple-100 text-purple-700 p-2 rounded text-center hover:bg-purple-200 font-medium"
            >
              👑 Manager
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('waiter1', '123456')}
              className="bg-green-100 text-green-700 p-2 rounded text-center hover:bg-green-200 font-medium"
            >
              📝 Waitstaff
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('kitchen1', '123456')}
              className="bg-orange-100 text-orange-700 p-2 rounded text-center hover:bg-orange-200 font-medium"
            >
              🍳 Kitchen
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('cashier1', '123456')}
              className="bg-blue-100 text-blue-700 p-2 rounded text-center hover:bg-blue-200 font-medium"
            >
              💳 Cashier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;