import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'patient' | 'doctor' }> = ({ children, allowedRole }) => {
  const { user, loading, patient, isDoctor } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.img 
          src="https://i.ibb.co/Cpsv0qY7/73024ef0-7fe4-4884-96b1-58af0a49ff7c.png" 
          alt="AXON Logo" 
          className="h-16 opacity-50"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role validation
  if (allowedRole) {
    if (allowedRole === 'doctor' && !isDoctor) {
      return <Navigate to="/unauthorized" replace />;
    }
    if (allowedRole === 'patient' && isDoctor) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Doctors skip patient onboarding checks
  if (isDoctor) {
    return <>{children}</>;
  }

  // Handle onboarding requirement: If no patient profile exists, 
  // or profile_complete is false, funnel to profile.
  const isProfilePage = location.pathname.includes('/profile');
  if (patient && !patient.profile_complete && !isProfilePage) {
    return <Navigate to="/portal/patient/profile" replace />;
  }

  return <>{children}</>;
};
