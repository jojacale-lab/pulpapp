import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import TrialExpired from './pages/TrialExpired';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import ClinicalHistory from './pages/ClinicalHistory';
import Billing from './pages/Billing';
import AIAssistant from './pages/AIAssistant';
import AdminPanel from './pages/AdminPanel';

const LoadingScreen = () => (
  <div className="loading-page">
    <div className="spinner" />
    <span style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Cargando PulpApp...</span>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading, subscriptionExpired } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (subscriptionExpired) return <TrialExpired />;
  return children;
};

const OwnerRoute = ({ children }) => {
  const { user, loading, isOwner } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading, subscriptionExpired } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!user) return children;
  if (subscriptionExpired) return <TrialExpired />;
  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="patients" element={<Patients />} />
      <Route path="patients/:id" element={<PatientDetail />} />
      <Route path="appointments" element={<Appointments />} />
      <Route path="clinical-history/:patientId" element={<ClinicalHistory />} />
      <Route path="billing" element={<Billing />} />
      <Route path="ai-assistant" element={<AIAssistant />} />
      <Route path="admin" element={<OwnerRoute><AdminPanel /></OwnerRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
