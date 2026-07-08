import { useEffect, useRef, useState } from 'react';
import { useToastStore } from '../../store/toastStore';

/* ── Konfigurasi visual per variant ── */
const VARIANTS = {
  danger: {
    icon: '🚨',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    titleColor: '#7F1D1D',
    messageColor: '#991B1B',
    progressColor: '#E24B4A',
  },
  warning: {
    icon: '⚠️',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    titleColor: '#78350F',
    messageColor: '#92400E',
    progressColor: '#EF9F27',
  },
  success: {
    icon: '✅',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    titleColor: '#14532D',
    messageColor: '#166534',
    progressColor: '#1D9E75',
  },
  info: {
    icon: 'ℹ️',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    titleColor: '#1E3A5F',
    messageColor: '#1E40AF',
    progressColor: '#185FA5',
  },
};

/* ── Single Toast Item ── */
function ToastItem({ toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [progress, setProgress] = useState(100);
  const [visible, setVisible]   = useState(false);
  const intervalRef = useRef(null);
  const timerRef    = useRef(null);

  const v = VARIANTS[toast.type] ?? VARIANTS.info;
  const duration = toast.duration ?? 5000;
  const step = 100 / (duration / 100); // progress per 100ms

  // Slide-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) return 0;
        return p - step;
      });
    }, 100);

    timerRef.current = setTimeout(() => dismiss(), duration);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => removeToast(toast.id), 300);
  };

  return (
    <div
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        minWidth: '320px',
        maxWidth: '400px',
        backgroundColor: v.bgColor,
        border: `1px solid ${v.borderColor}`,
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
          {v.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            color: v.titleColor,
            marginBottom: '3px',
            lineHeight: 1.3,
          }}>
            {toast.title}
          </p>
          {toast.message && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: '12px',
              color: v.messageColor,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}>
              {toast.message}
            </p>
          )}
        </div>
        {/* Tombol tutup */}
        <button
          onClick={dismiss}
          style={{
            flexShrink: 0,
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: v.titleColor,
            fontSize: '14px',
            fontWeight: 700,
            opacity: 0.6,
            borderRadius: '4px',
            lineHeight: 1,
          }}
          title="Tutup"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          width: `${progress}%`,
          backgroundColor: v.progressColor,
          transition: 'width 0.1s linear',
          borderRadius: '0 0 0 12px',
        }}
      />
    </div>
  );
}

/* ── Toast Container (di-render di App.jsx) ── */
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
