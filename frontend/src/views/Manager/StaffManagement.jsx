import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Icons = {

  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),

  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M12 3v9" strokeLinecap="round" />
      <path d="M7.05 5.64a9 9 0 106.9 0" strokeLinecap="round" />
    </svg>
  ),
};

const StaffManagement = () => {
  const { token, user } = useContext(AuthContext);

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Waiter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = user?.roles?.includes('Owner');

  const getRoles = (roles) => {
    if (!roles) return 'No role';

    if (Array.isArray(roles)) {
      return roles.filter(Boolean).join(', ');
    }

    if (typeof roles === 'string') {
      return roles
        .replace(/[{}"]/g, '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .join(', ');
    }

    return String(roles);
  };

  const fetchStaff = async () => {
    try {
      setError('');

      const response = await fetch('http://localhost:5000/api/v1/staff', {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load staff.');
      }

      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [token]);

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
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
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

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create staff.');
      }

      setSuccess(`Account for ${data.staff.full_name} created successfully.`);

      setFullName('');
      setUsername('');
      setPassword('');
      setPhone('');
      setRole('Waiter');

      fetchStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    const newStatus =
      currentStatus === 'Active' ? 'Inactive' : 'Active';

    try {
      setError('');
      setSuccess('');

      const response = await fetch(
        `http://localhost:5000/api/v1/staff/${staffId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status.');
      }

      setStaffList((prev) =>
        prev.map((item) =>
          item.staff_id === staffId
            ? { ...item, status: newStatus }
            : item
        )
      );

      setSuccess(`Staff status changed to ${newStatus}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStaff = async (staffId, fullName) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${fullName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch(
        `http://localhost:5000/api/v1/staff/${staffId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete staff.');
      }

      setSuccess(`Account for ${fullName} was deleted.`);
      fetchStaff();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputClass = `
    w-full h-10 px-3
    bg-white border border-slate-200 rounded-lg
    text-sm text-slate-800 placeholder:text-slate-400
    outline-none transition
    focus:border-amber-400 focus:ring-2 focus:ring-amber-100
  `;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            Add staff
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            Create a login account for a staff member.
          </p>
        </div>

        <form onSubmit={handleCreateStaff} className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Full name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClass}
                placeholder="Abebe Bikila"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={inputClass}
                placeholder="abebe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Phone
              </label>

              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="0911223344"
              />
            </div>

            <div className="sm:col-span-2 xl:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Role
              </label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="Waiter">Waiter</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Bar">Bar</option>
                <option value="Hot Drinks">Hot Drinks</option>
                <option value="Cashier">Cashier</option>

                {isOwner && (
                  <option value="General Manager">
                    General Manager
                  </option>
                )}
              </select>
            </div>

            <div className="sm:col-span-2 xl:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full sm:w-auto h-10 px-5
                  inline-flex items-center justify-center gap-2
                  rounded-lg
                  bg-black text-white
                  text-sm font-semibold
                  hover:bg-slate-800
                  transition
                  cursor-pointer
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                "
              >
                {Icons.plus}
                {isSubmitting ? 'Adding...' : 'Add staff'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Staff list
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Manage account status and access.
            </p>
          </div>

          <span className="sm:hidden text-xs text-slate-500">
            {staffList.length} staff
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Loading staff...
          </div>
        ) : staffList.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-600">
              No staff found
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Add your first staff member above.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Name
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Username
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Role
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Phone
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff) => {
                    const isCurrentUser =
                      staff.staff_id === user?.staff_id;

                    return (
                      <tr
                        key={staff.staff_id}
                        className="hover:bg-slate-50/70 transition"
                      >
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                          {staff.full_name}
                        </td>

                        <td className="px-5 py-3.5 text-sm text-slate-500">
                          {staff.username}
                        </td>

                        <td className="px-5 py-3.5 text-sm text-slate-600">
                          {getRoles(staff.roles)}
                        </td>

                        <td className="px-5 py-3.5 text-sm text-slate-500">
                          {staff.phone || '—'}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`
                              inline-flex px-2 py-1 rounded-md
                              text-[11px] font-semibold
                              ${
                                staff.status === 'Active'
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-slate-100 text-slate-500'
                              }
                            `}
                          >
                            {staff.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          {isCurrentUser ? (
                            <span className="block text-right text-xs text-slate-400">
                              Current account
                            </span>
                          ) : (
                            <div className="flex justify-end items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleStatus(
                                    staff.staff_id,
                                    staff.status
                                  )
                                }
                                className={`
                                  inline-flex items-center gap-1.5
                                  px-2.5 py-1.5 rounded-md
                                  text-xs font-medium
                                  transition cursor-pointer
                                  ${
                                    staff.status === 'Active'
                                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                      : 'text-green-700 bg-green-50 hover:bg-green-100'
                                  }
                                `}
                              >
                                {Icons.power}
                                {staff.status === 'Active'
                                  ? 'Deactivate'
                                  : 'Activate'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteStaff(
                                    staff.staff_id,
                                    staff.full_name
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                              >
                                {Icons.trash}
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {staffList.map((staff) => {
                const isCurrentUser =
                  staff.staff_id === user?.staff_id;

                return (
                  <div key={staff.staff_id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {staff.full_name}
                        </p>

                        <p className="text-xs text-slate-400 mt-0.5">
                          @{staff.username}
                        </p>
                      </div>

                      <span
                        className={`
                          flex-shrink-0 px-2 py-1 rounded-md
                          text-[10px] font-semibold
                          ${
                            staff.status === 'Active'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }
                        `}
                      >
                        {staff.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400">Role</p>
                        <p className="text-slate-600 mt-0.5">
                          {getRoles(staff.roles)}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Phone</p>
                        <p className="text-slate-600 mt-0.5">
                          {staff.phone || '—'}
                        </p>
                      </div>
                    </div>

                    {!isCurrentUser && (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleStatus(
                              staff.staff_id,
                              staff.status
                            )
                          }
                          className={`
                            flex-1 h-9
                            inline-flex items-center justify-center gap-1.5
                            rounded-lg text-xs font-medium
                            cursor-pointer
                            ${
                              staff.status === 'Active'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-green-50 text-green-700'
                            }
                          `}
                        >
                          {Icons.power}
                          {staff.status === 'Active'
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteStaff(
                              staff.staff_id,
                              staff.full_name
                            )
                          }
                          className="h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium cursor-pointer"
                        >
                          {Icons.trash}
                          Delete
                        </button>
                      </div>
                    )}

                    {isCurrentUser && (
                      <p className="mt-3 text-[11px] text-slate-400">
                        This is your current account.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default StaffManagement;
