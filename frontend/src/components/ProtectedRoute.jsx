import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Loading session...</p>
      </div>
    );
  }

  // 1. Unauthenticated users go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check if user's role matches any allowed roles for this route
  const hasPermission = allowedRoles 
    ? user.roles.some((role) => allowedRoles.includes(role))
    : true;

  if (!hasPermission) {
    // Direct unauthorized access back to login or their main space
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;