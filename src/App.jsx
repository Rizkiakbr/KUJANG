import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { onAuthChange } from './services/authService';
import { useAuthStore } from './store/authStore';

import ProtectedRoute         from './components/layout/ProtectedRoute';
import ToastContainer         from './components/ui/Toast';
import SessionWarningModal    from './components/ui/SessionWarningModal';

import LoginPage              from './pages/LoginPage';
import DashboardPenyuluhPage  from './pages/DashboardPenyuluhPage';
import TugasSayaPage          from './pages/TugasSayaPage';
import DetailKasusPage        from './pages/DetailKasusPage';
import MonitoringPage         from './pages/MonitoringPage';
import UploadPage             from './pages/UploadPage';
import LaporanPage            from './pages/LaporanPage';
import AuditLogPage           from './pages/AuditLogPage';
import DashboardKetuaPage     from './pages/DashboardKetuaPage';
import DashboardKasiPage      from './pages/DashboardKasiPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Session timeout wrapper — hanya aktif jika user sudah login
 * SessionWarningModal menangani UI warning sekarang
 */
function SessionGuard({ children }) {
  return (
    <>
      {children}
      <SessionWarningModal />
    </>
  );
}

/**
 * Auth initializer — subscribe ke Firebase auth state saat mount
 */
function AuthInitializer() {
  const { setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const unsub = onAuthChange((firebaseUser, userData) => {
      if (firebaseUser && userData) {
        setUser(firebaseUser, userData);
      } else {
        clearUser();
      }
    });
    return () => unsub();
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <BrowserRouter>
        <AuthInitializer />
        <SessionGuard>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Redirect root */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Penyuluh + Pelaksana — dashboard */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['penyuluh', 'pelaksana']}>
                <DashboardPenyuluhPage />
              </ProtectedRoute>
            } />

            {/* Penyuluh only */}
            <Route path="/tugas-saya" element={
              <ProtectedRoute allowedRoles={['penyuluh']}>
                <TugasSayaPage />
              </ProtectedRoute>
            } />

            {/* Semua role yang login */}
            <Route path="/kasus/:id" element={
              <ProtectedRoute allowedRoles={['penyuluh', 'pelaksana', 'kepala-seksi', 'ketuakpp']}>
                <DetailKasusPage />
              </ProtectedRoute>
            } />
            <Route path="/laporan" element={
              <ProtectedRoute allowedRoles={['penyuluh', 'pelaksana', 'kepala-seksi', 'ketuakpp']}>
                <LaporanPage />
              </ProtectedRoute>
            } />

            {/* Pelaksana + Kasi + Ketua */}
            <Route path="/monitoring" element={
              <ProtectedRoute allowedRoles={['pelaksana', 'kepala-seksi', 'ketuakpp']}>
                <MonitoringPage />
              </ProtectedRoute>
            } />
            <Route path="/audit-log" element={
              <ProtectedRoute allowedRoles={['kepala-seksi', 'ketuakpp']}>
                <AuditLogPage />
              </ProtectedRoute>
            } />

            {/* Pelaksana only */}
            <Route path="/upload" element={
              <ProtectedRoute allowedRoles={['pelaksana']}>
                <UploadPage />
              </ProtectedRoute>
            } />

            {/* Kepala Seksi only */}
            <Route path="/dashboard-kasi" element={
              <ProtectedRoute allowedRoles={['kepala-seksi']}>
                <DashboardKasiPage />
              </ProtectedRoute>
            } />

            {/* Ketua KPP only */}
            <Route path="/dashboard-ketua" element={
              <ProtectedRoute allowedRoles={['ketuakpp']}>
                <DashboardKetuaPage />
              </ProtectedRoute>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SessionGuard>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
