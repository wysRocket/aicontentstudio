import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthReady } = useFirebase();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
