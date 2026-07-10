import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuthStore } from '../../store/authStore';
import { useNotifStore } from '../../store/notifStore';
import { logout } from '../../services/authService';
import NotifDropdown from '../ui/NotifDropdown';

export default function Topbar() {
  const { userData, clearUser } = useAuthStore();
  const { overdueCount, warningCount, isOpen, toggleDropdown, closeDropdown } = useNotifStore();
  const navigate = useNavigate();

  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: idLocale });
  const totalAlert = overdueCount + warningCount;

  const handleLogout = async () => {
    await logout(userData);
    clearUser();
    navigate('/login');
  };

  const roleLabel = {
    penyuluh:       'Penyuluh',
    pelaksana:      'Pelaksana',
    'kepala-seksi': 'Kepala Seksi',
    ketuakpp:       'Ketua KPP',
  };

  return (
    <header className="sticky top-0 z-30 bg-navy shadow-lg">
      <div className="flex items-center justify-between px-5 h-14">

        {/* Kiri: logo + brand */}
        <div className="flex items-center gap-3">
          <img
            src="/logo-kujang.png"
            alt="Logo KUJANG"
            className="h-8 w-8 rounded object-cover bg-white/10"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div className="leading-none">
            <div className="text-white font-bold text-sm tracking-widest">KUJANG</div>
            <div className="text-[10px] text-blue-200 leading-tight">Kendali Jatuh Tempo</div>
          </div>
        </div>

        {/* Tengah: instansi */}
        <div className="hidden md:block text-center">
          <div className="text-blue-100 text-xs font-medium tracking-wide">
            KPP Madya Bandung — Direktorat Jenderal Pajak
          </div>
          <div className="text-[10px] text-blue-300">{today}</div>
        </div>

        {/* Kanan: notif + user */}
        <div className="flex items-center gap-3">
          {/* Notifikasi */}
          <div className="relative">
            <button
              id="btn-notif"
              onClick={toggleDropdown}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Notifikasi SLA"
            >
              <Bell size={18} className="text-blue-200" />
              {totalAlert > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-bold
                                 w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {totalAlert > 9 ? '9+' : totalAlert}
                </span>
              )}
            </button>
            {isOpen && <NotifDropdown onClose={closeDropdown} />}
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <div className="w-6 h-6 rounded-md bg-teal flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
            <div className="hidden sm:block leading-none">
              <div className="text-white text-xs font-semibold">{userData?.nama || 'User'}</div>
              <div className="text-[10px] text-blue-300">{roleLabel[userData?.role] || userData?.role}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Keluar"
          >
            <LogOut size={16} className="text-blue-300" />
          </button>
        </div>
      </div>
    </header>
  );
}
