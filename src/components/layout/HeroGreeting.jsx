import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * HeroGreeting — identitas instansi + greeting personal
 * @param {{ overdueCount: number, warningCount: number, totalCases: number }} props
 */
export default function HeroGreeting({ overdueCount = 0, warningCount = 0, totalCases = 0 }) {
  const { userData } = useAuthStore();
  const nama = userData?.nama || 'Pengguna';

  const now = new Date();
  const dateStr = format(now, "EEEE, d MMMM yyyy '·' HH.mm 'WIB'", { locale: idLocale });

  return (
    <div className="relative overflow-hidden" style={{ background: '#0D2E5C' }}>
      {/* Background foto gedung */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: "url('/gedung-kpp.webp')", opacity: 0.10 }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(9,33,63,0.97) 0%, rgba(13,46,92,0.90) 100%)' }}
      />

      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        {/* Kiri: logo + divider + greeting */}
        <div className="flex items-center gap-5">
          {/* Logo */}
          <img
            src="/logo-kujang.png"
            alt="Logo KUJANG"
            className="w-14 h-14 rounded-xl object-cover shadow-lg border border-white/10 bg-white/5 flex-shrink-0"
            onError={e => { e.target.style.display = 'none'; }}
          />

          {/* Divider vertikal */}
          <div className="h-12 w-px bg-teal/40" />

          {/* Greeting text */}
          <div>
            <div className="text-[10.5px] font-medium mb-1" style={{ color: '#6A9EC8' }}>
              {dateStr}
            </div>
            <div className="text-white font-bold text-xl mb-1">
              {getGreeting()}, {nama.split(' ')[0]}! 👋
            </div>
            <div className="text-blue-200 text-xs flex items-center gap-2 flex-wrap">
              <span>Total <span className="font-semibold text-white">{totalCases}</span> kasus</span>
              {overdueCount > 0 && (
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 rounded px-2 py-0.5 font-semibold text-[11px]">
                  🚨 {overdueCount} lewat tempo
                </span>
              )}
              {warningCount > 0 && (
                <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded px-2 py-0.5 font-semibold text-[11px]">
                  ⚠️ {warningCount} warning
                </span>
              )}
              {overdueCount === 0 && warningCount === 0 && totalCases > 0 && (
                <span className="text-green-300 font-semibold text-[11px]">✅ Semua kasus dalam batas waktu</span>
              )}
            </div>
          </div>
        </div>

        {/* Kanan: instansi + badge */}
        <div className="hidden md:flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-blue-200 text-[11px] font-medium">KPP Madya Bandung</div>
            <div className="text-blue-300 text-[10px]">Direktorat Jenderal Pajak · Kemenkeu RI</div>
          </div>
          <div className="flex items-center gap-1.5 bg-teal/15 border border-teal/30 rounded-full px-3 py-1">
            <Shield size={12} className="text-teal-light" />
            <span className="text-[10px] font-bold text-teal-light tracking-wide">Zona Integritas · WBK & WBBM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
