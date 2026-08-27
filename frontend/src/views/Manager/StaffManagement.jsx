import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Waiter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token } = useContext(AuthContext);


  const handleDeleteStaff = async (staffId, fullName) => {
  const confirmed = window.confirm(
    `⚠️ WARNING: Are you sure you want to permanently delete user "${fullName}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`http://localhost:5000/api/v1/staff/${staffId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token || localStorage.getItem('token')}`,
      },
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message);

    setSuccess(`Account for ${fullName} deleted permanently.`);
    fetchStaff();
  } catch (err) {
    alert(`❌ Action Blocked:\n${err.message}`);
  }
};

  // Helper to format roles safely
  const formatRoles = (roles) => {
    if (!roles) return 'No Role';
    if (Array.isArray(roles)) {
      return roles.filter(Boolean).join(', ');
    }
    if (typeof roles === 'string') {
      return roles.replace(/[{}]/g, '').split(',').join(', ');
    }
    return String(roles);
  };

  // Handler to toggle user status
const handleToggleStatus = async (staffId, currentStatus) => {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

  try {
    const response = await fetch(`http://localhost:5000/api/v1/staff/${staffId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) throw new Error('Failed to update status');
    
    // Refresh the roster
    fetchStaff();
  } catch (err) {
    alert(err.message);
  }
};
  // Fetch staff list from backend with Authorization header
  const fetchStaff = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/staff', {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch staff.');
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Handle staff creation with Authorization header
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/v1/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          username,
          password,
          phone,
          role,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create staff.');

      setSuccess(`Account for ${data.staff.full_name} created successfully!`);
      setFullName('');
      setUsername('');
      setPassword('');
      setPhone('');
      setRole('Waiter');
      
      // Refresh list
      fetchStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Registration Form */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Register New Staff Account</h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}

        <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. Abebe Bikila"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. abebe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded p-2 focus:ring-blue-500 text-gray-900"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded p-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. 0911223344"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Assigned Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded p-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="Waiter">Waitstaff</option>
              <option value="Kitchen">Kitchen Staff</option>
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Active Staff Roster</h2>

        {loading ? (
          <p className="text-gray-500">Loading staff data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role(s)</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {staffList.map((staff) => (
                  <tr key={staff.staff_id}>
                    <td className="py-3 px-4 font-medium">{staff.full_name}</td>
                    <td className="py-3 px-4">{staff.username}</td>
                    <td className="py-3 px-4">{formatRoles(staff.roles)}</td>
                    <td className="py-3 px-4">{staff.phone || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          staff.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>
                    
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(staff.staff_id, staff.status)}
                        className={`px-3 py-1 text-xs font-medium rounded transition ${
                          staff.status === 'Active'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {staff.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleDeleteStaff(staff.staff_id, staff.full_name)}
                        className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;