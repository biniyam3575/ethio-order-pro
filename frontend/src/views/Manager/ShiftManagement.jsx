// import React, { useState, useEffect, useContext } from 'react';
// import { AuthContext } from '../../context/AuthContext';

// const ShiftManagement = () => {
//   const [shifts, setShifts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const { token } = useContext(AuthContext);

//   useEffect(() => {
//     const fetchShifts = async () => {
//       try {
//         const res = await fetch('http://localhost:5000/api/v1/shifts', {
//           headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
//         });
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.message || 'Failed to fetch shifts');
//         setShifts(data);
//       } catch (err) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchShifts();
//   }, [token]);

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
//       <h2 className="text-xl font-bold text-gray-800 mb-4">Cashier Shift & Register Reconciliation</h2>
//       {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
//       {loading ? (
//         <p className="text-gray-500">Loading register shifts...</p>
//       ) : shifts.length === 0 ? (
//         <p className="text-gray-500">No shift registers found.</p>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
//                 <th className="py-3 px-4">Cashier</th>
//                 <th className="py-3 px-4">Shift Start</th>
//                 <th className="py-3 px-4">Shift End</th>
//                 <th className="py-3 px-4">Opening Float</th>
//                 <th className="py-3 px-4">Expected Cash</th>
//                 <th className="py-3 px-4">Status</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
//               {shifts.map((shift) => (
//                 <tr key={shift.shift_id}>
//                   <td className="py-3 px-4 font-medium">{shift.cashier_name || shift.username}</td>
//                   <td className="py-3 px-4 text-xs">{new Date(shift.start_time).toLocaleString()}</td>
//                   <td className="py-3 px-4 text-xs">
//                     {shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Active Now'}
//                   </td>
//                   <td className="py-3 px-4 font-mono">{parseFloat(shift.opening_float || 0).toFixed(2)} ETB</td>
//                   <td className="py-3 px-4 font-mono">{parseFloat(shift.expected_cash || 0).toFixed(2)} ETB</td>
//                   <td className="py-3 px-4">
//                     <span className={`px-2 py-1 text-xs font-semibold rounded ${
//                       shift.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
//                     }`}>
//                       {shift.status || 'Closed'}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ShiftManagement;