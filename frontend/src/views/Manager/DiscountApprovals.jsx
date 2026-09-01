import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const DiscountApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  const fetchDiscounts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/discounts/pending', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (response.ok) setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [token]);

  const handleReview = async (id, action) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/discounts/${id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error('Action failed.');
      fetchDiscounts();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading discount requests...</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Discount Approvals</h2>

      {requests.length === 0 ? (
        <p className="text-gray-500 py-4">No pending discount requests.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {requests.map((req) => (
                <tr key={req.id}>
                  <td className="py-3 px-4 font-semibold">#{req.order_id}</td>
                  <td className="py-3 px-4">{req.requested_by_name}</td>
                  <td className="py-3 px-4 font-bold text-red-600">
                    {parseFloat(req.discount_amount).toFixed(2)} ETB
                  </td>
                  <td className="py-3 px-4 italic text-gray-600">{req.reason || 'N/A'}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => handleReview(req.id, 'Approved')}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded font-medium hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(req.id, 'Rejected')}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DiscountApprovals;