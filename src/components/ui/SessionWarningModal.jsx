import { useEffect, useState } from 'react';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';

const WARNING_TOTAL_SECONDS = 2 * 60; // 2 menit

/**
 * Modal peringatan sesi akan berakhir.
 * Tidak bisa ditutup dengan klik overlay — user harus pilih tombol.
 */
export default function SessionWarningModal() {
  const { showWarning, remainingSeconds, extendSession, forceLogout } = useSessionTimeout();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (showWarning) {
      requestAnimationFrame(() => setAnimated(true));
    } else {
      setAnimated(false);
    }
  }, [showWarning]);

  if (!showWarning) return null;

  const progress = Math.max(0, (remainingSeconds / WARNING_TOTAL_SECONDS) * 100);
  const minutes  = Math.floor(remainingSeconds / 60);
  const seconds  = remainingSeconds % 60;
  const timeStr  = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const handleExtend = () => {
    extendSession();
  };

  const handleLogout = () => {
    forceLogout();
  };

  return (
    /* Overlay — tidak bisa ditutup dengan klik luar */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: `rgba(0,0,0,${animated ? 0.6 : 0})`,
        backdropFilter: animated ? 'blur(3px)' : 'none',
        transition: 'background-color 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          transform: animated ? 'scale(1)' : 'scale(0.9)',
          opacity: animated ? 1 : 0,
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{
          background: '#0D2E5C',
          padding: '20px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '8px',
            animation: 'pulse 1.5s infinite',
          }}>
            ⏱️
          </div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '16px', margin: 0 }}>
            Sesi Akan Berakhir
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, marginBottom: '20px' }}>
            Sesi Anda akan berakhir karena tidak ada aktivitas.<br />
            Klik <strong>Tetap Masuk</strong> untuk melanjutkan.
          </p>

          {/* Countdown */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '4px solid #E24B4A',
            backgroundColor: '#FEF2F2',
            marginBottom: '20px',
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '22px',
              fontWeight: 700,
              color: '#7F1D1D',
              letterSpacing: '-1px',
            }}>
              {timeStr}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: '6px',
            backgroundColor: '#F3F4F6',
            borderRadius: '99px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#E24B4A',
              borderRadius: '99px',
              transition: 'width 1s linear',
            }} />
          </div>

          {/* Tombol */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleLogout}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '2px solid #E24B4A',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#E24B4A',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
            >
              Keluar Sekarang
            </button>
            <button
              onClick={handleExtend}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#1D9E75',
                color: 'white',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#178f68'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1D9E75'; }}
            >
              Tetap Masuk
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
