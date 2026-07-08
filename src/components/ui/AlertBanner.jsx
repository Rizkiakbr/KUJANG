import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import slaConfig from '../../config/slaConfig.json';

/**
 * AlertBanner — banner merah untuk kasus OVERDUE
 * @param {{ cases: object[] }} props  - kasus dengan slaStatus.code === 'OVERDUE'
 */
export default function AlertBanner({ cases = [] }) {
  const navigate = useNavigate();
  if (cases.length === 0) return null;

  const first = cases[0];
  const jl = slaConfig.jenisLayanan.find(j => j.id === first.jenisLayananId);

  return (
    <div
      className="relative overflow-hidden rounded-card px-5 py-4 flex items-center justify-between gap-4"
      style={{
        background:  'linear-gradient(135deg, #7F1D1D, #991B1B)',
        boxShadow:   '0 4px 14px rgba(153,27,27,0.25)',
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🚨</span>
        </div>

        {/* Text */}
        <div className="min-w-0">
          <div className="text-white font-bold text-sm">
            {cases.length} kasus Anda telah melewati jatuh tempo!
          </div>
          <div className="text-red-200 text-xs mt-0.5 truncate">
            {first.namaWP} · {jl?.nama || first.jenisLayananId} · {first.slaStatus?.label}
            {cases.length > 1 && ` dan ${cases.length - 1} kasus lainnya`}
          </div>
        </div>
      </div>

      {/* Tombol */}
      <button
        id="btn-alert-update"
        onClick={() => navigate('/tugas-saya')}
        className="flex items-center gap-2 bg-white text-danger dark font-semibold text-xs
                   px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 relative z-10"
      >
        Update Sekarang <ArrowRight size={13} />
      </button>
    </div>
  );
}
