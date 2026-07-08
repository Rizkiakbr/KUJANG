import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/** Route-to-role mapping: routes yang butuh role tertentu */
const ROLE_MAP = {
  '/dashboard':       ['penyuluh', 'admin'],
  '/tugas-saya':      ['penyuluh', 'admin'],
  '/monitoring':      ['admin', 'ketuakpp'],
  '/upload':          ['admin'],
  '/laporan':         ['penyuluh', 'admin', 'ketuakpp'],
  '/audit-log':       ['admin', 'ketuakpp'],
  '/dashboard-ketua': ['ketuakpp'],
};

/**
 * @param {{ allowedRoles?: string[], children: React.ReactNode }} props
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, userData, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-navy border-t-teal rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Cek role
  const roles = allowedRoles ?? ROLE_MAP[location.pathname];
  if (roles && !roles.includes(userData.role)) {
    // Redirect ke halaman home role masing-masing
    const homeByRole = {
      penyuluh: '/dashboard',
      admin:    '/monitoring',
      ketuakpp: '/dashboard-ketua',
    };
    return <Navigate to={homeByRole[userData.role] || '/dashboard'} replace />;
  }

  return children;
}
