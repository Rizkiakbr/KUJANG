import { useEffect, useState, useCallback } from 'react';
import { useNotifStore } from '../../store/notifStore';
import { useNavigate } from 'react-router-dom';
import { SLABadge } from './Badge';
import slaConfig from '../../config/slaConfig.json';

const LS_KEY = 'kujang_notif_read';

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveReadIds(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
}

export default function NotifDropdown({ onClose }) {
  const { overdueItems, warningItems } = useNotifStore();
  const navigate = useNavigate();
  const [readIds, setReadIds] = useState(getReadIds);
  const [animated, setAnimated] = useState(false);

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setAnimated(true));
  }, []);

  const all = [...overdueItems, ...warningItems];
  const unreadCount = all.filter((i) => !readIds.has(i.id)).length;

  const markAllRead = useCallback(() => {
    const newSet = new Set(all.map((i) => i.id));
    setReadIds(newSet);
    saveReadIds(newSet);
  }, [all]);

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const handleClick = (item) => {
    markRead(item.id);
    onClose();
    navigate(`/kasus/${item.id}`);
  };

  return (
    <div
      id="notif-dropdown"
      style={{
        transform: animated ? 'translateY(0)' : 'translateY(-8px)',
        opacity: animated ? 1 : 0,
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
      }}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-card shadow-panel border border-gray-100 z-50 overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-bold text-navy text-sm">Notifikasi</p>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: '#E24B4A' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {all.length > 0 && (
          <button
            onClick={markAllRead}
            className="text-[11px] font-medium hover:underline"
            style={{ color: '#185FA5' }}
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* ── List ── */}
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {all.length === 0 ? (
          /* Empty state */
          <div className="px-4 py-8 text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="font-semibold text-sm" style={{ color: '#14532D' }}>
              Semua kasus dalam kondisi aman
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Tidak ada kasus melewati atau mendekati jatuh tempo
            </p>
          </div>
        ) : (
          <>
            {/* Seksi Kritis */}
            {overdueItems.length > 0 && (
              <>
                <div className="px-4 py-2 flex items-center gap-2 sticky top-0 bg-white border-b border-red-50"
                  style={{ backgroundColor: '#FEF2F2' }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7F1D1D' }}>
                    🔴 Kritis ({overdueItems.length})
                  </span>
                </div>
                {overdueItems.map((item) => (
                  <NotifItem
                    key={item.id}
                    item={item}
                    isRead={readIds.has(item.id)}
                    onClick={() => handleClick(item)}
                    accentColor="#E24B4A"
                    bgColor="#FEF9F9"
                  />
                ))}
              </>
            )}

            {/* Seksi Warning */}
            {warningItems.length > 0 && (
              <>
                <div className="px-4 py-2 flex items-center gap-2 sticky top-0 border-b border-yellow-50"
                  style={{ backgroundColor: '#FFFBEB' }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#78350F' }}>
                    🟡 Perlu Perhatian ({warningItems.length})
                  </span>
                </div>
                {warningItems.map((item) => (
                  <NotifItem
                    key={item.id}
                    item={item}
                    isRead={readIds.has(item.id)}
                    onClick={() => handleClick(item)}
                    accentColor="#EF9F27"
                    bgColor="#FFFDF5"
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 border-t border-gray-100" style={{ backgroundColor: '#F9FAFB' }}>
        <button
          onClick={() => { onClose(); navigate('/tugas-saya'); }}
          className="text-xs font-semibold hover:underline w-full text-center"
          style={{ color: '#0D2E5C' }}
        >
          Lihat semua di Tugas Saya →
        </button>
      </div>
    </div>
  );
}

/* ── Notif Item ── */
function NotifItem({ item, isRead, onClick, accentColor, bgColor }) {
  const jl = slaConfig.jenisLayanan.find((j) => j.id === item.jenisLayananId);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isRead ? 'white' : bgColor,
        borderLeft: isRead ? '3px solid transparent' : `3px solid ${accentColor}`,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      className="w-full flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:brightness-95"
    >
      {/* Dot unread */}
      {!isRead && (
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          backgroundColor: accentColor, flexShrink: 0, marginTop: '5px',
        }} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-xs truncate" style={{ color: '#0D2E5C' }}>
              {item.namaWP}
            </p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {jl?.nama || item.jenisLayananId}
            </p>
          </div>
          <SLABadge code={item.slaStatus?.code} label={item.slaStatus?.label} size="sm" />
        </div>
        <p className="text-[10px] mt-1.5 font-medium" style={{ color: accentColor }}>
          {item.slaStatus?.code === 'OVERDUE'
            ? `Lewat ${Math.abs(item.slaStatus?.sisaHari)} hari`
            : `H-${item.slaStatus?.sisaHari} dari jatuh tempo`}
        </p>
      </div>
    </div>
  );
}
