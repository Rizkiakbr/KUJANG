import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, FileText,
  BarChart2, Upload, ScrollText, Shield, Users
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const NAV_ITEMS = {
  penyuluh: [
    { to: '/dashboard',  label: 'Dashboard Saya', icon: LayoutDashboard },
    { to: '/tugas-saya', label: 'Tugas Saya',     icon: ClipboardList  },
    { to: '/laporan',    label: 'Laporan',          icon: BarChart2      },
  ],
  pelaksana: [
    { to: '/monitoring', label: 'Monitoring',  icon: Shield         },
    { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard},
    { to: '/upload',     label: 'Upload Data', icon: Upload         },
    { to: '/laporan',    label: 'Laporan',      icon: BarChart2      },
  ],
  'kepala-seksi': [
    { to: '/dashboard-kasi', label: 'Dashboard Kasi', icon: LayoutDashboard },
    { to: '/monitoring',     label: 'Monitoring',      icon: Shield          },
    { to: '/laporan',        label: 'Laporan',          icon: BarChart2       },
    { to: '/audit-log',      label: 'Audit Log',        icon: ScrollText      },
  ],
  ketuakpp: [
    { to: '/dashboard-ketua', label: 'Dashboard Ketua', icon: LayoutDashboard },
    { to: '/monitoring',      label: 'Monitoring',       icon: Shield          },
    { to: '/laporan',         label: 'Laporan',           icon: BarChart2       },
    { to: '/audit-log',       label: 'Audit Log',         icon: ScrollText      },
  ],
};

export default function Navbar() {
  const { userData } = useAuthStore();
  const role = userData?.role || 'penyuluh';
  const items = NAV_ITEMS[role] || NAV_ITEMS.penyuluh;

  return (
    <nav className="bg-navy-dark border-b border-white/5 sticky top-14 z-20">
      <div className="flex items-center px-5 overflow-x-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${to.replace(/\//g, '').replace(/-/g, '')}`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap
               transition-all duration-200 border-b-2
               ${isActive
                 ? 'text-teal border-teal bg-teal/10'
                 : 'text-blue-300 border-transparent hover:text-white hover:bg-white/5'
               }`
            }
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
