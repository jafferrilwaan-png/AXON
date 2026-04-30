import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import { LuminousCursor } from "./components/LuminousCursor";
import { AxonAIBot } from "./pages/AxonAIBot";
import Home from "./pages/Home";
import Dashboard from "./pages/patient/Dashboard";
import Vault from "./pages/patient/Vault";
import AuditTrail from "./pages/patient/Audit";
import AccessControl from "./pages/patient/AccessControl";
import Profile from "./pages/patient/Profile";
import AiInsights from "./pages/patient/AiInsights";
import ProviderAccess from "./pages/doctor/Portal";
import AuthPage from "./pages/Auth";
import Architecture from "./pages/Architecture";
import Unauthorized from "./pages/Unauthorized";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthenticatedLayout } from "./components/AuthenticatedLayout";
import { Toaster } from "react-hot-toast";
import { ConfigurationOverlay } from "./components/ConfigurationOverlay";

import { Activity } from "lucide-react";

import DatabaseSetup from "./pages/DatabaseSetup";

function RootRoute() {
  const { user, isDoctor, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Activity className="w-12 h-12 text-cyan-400 animate-pulse" />
      </div>
    );
  }

  if (user) {
    if (isDoctor) {
      return <Navigate to="/portal/doctor/access" replace />;
    } else {
      return <Navigate to="/portal/patient/dashboard" replace />;
    }
  }

  return <Home />;
}

export default function App() {
  return (
    <AuthProvider>
      <ConfigurationOverlay />
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0f172a',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      }} />
      <div className="min-h-screen flex flex-col font-sans bg-slate-950 relative overflow-hidden">
        <LuminousCursor />
        <AxonAIBot />
        <Routes>
          {/* Public Routes with Navbar */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<RootRoute />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/setup" element={<DatabaseSetup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
          </Route>
          
          {/* Patient Portal */}
          <Route path="/portal/patient">
            <Route path="dashboard" element={
              <ProtectedRoute allowedRole="patient">
                <AuthenticatedLayout>
                  <Dashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />
            <Route path="vault" element={
              <ProtectedRoute allowedRole="patient">
                <AuthenticatedLayout>
                  <Vault />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />
            <Route path="access" element={
              <ProtectedRoute allowedRole="patient">
                <AuthenticatedLayout>
                  <AccessControl />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />
            <Route path="audit" element={
              <ProtectedRoute allowedRole="patient">
                <AuthenticatedLayout>
                  <AuditTrail />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />
            <Route path="profile" element={
              <ProtectedRoute allowedRole="patient">
                <AuthenticatedLayout>
                  <Profile />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />
            <Route path="ai-insights" element={
              <ProtectedRoute allowedRole="patient">
                <AuthenticatedLayout>
                  <AiInsights />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />
          </Route>

          {/* Doctor Portal */}
          <Route path="/portal/doctor">
            <Route path="access" element={
              <ProtectedRoute allowedRole="doctor">
                <PublicLayout>
                  <ProviderAccess />
                </PublicLayout>
              </ProtectedRoute>
            } />
          </Route>

          {/* Persistent Legacy Routes */}
          <Route path="/dashboard" element={<Navigate to="/portal/patient/dashboard" replace />} />
          <Route path="/vault" element={<Navigate to="/portal/patient/vault" replace />} />
          <Route path="/audit" element={<Navigate to="/portal/patient/audit" replace />} />
          <Route path="/provider-access" element={<Navigate to="/portal/doctor/access" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

function PublicLayout({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <>
      {!user && <Navbar />}
      <main className={`flex-1 flex flex-col ${!user ? 'pt-16' : ''} relative z-10`}>
        {children || <Outlet />}
      </main>
    </>
  );
}

