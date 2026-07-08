import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import slaConfig from '../../config/slaConfig.json';

/**
 * Modal pop-up yang muncul ~1 detik setelah login berhasil
 * jika ada kasus OVERDUE atau WARNING.
 * Satu kali per sesi browser (cek sessionStorage).
 *
 * FIX: Dua useEffect terpisah untuk menghindari race condition
 * di mana cleanup timer di-cancel oleh perubahan cases.
 *
 * @param {{ cases: object[], allCases?: object[], isLoading?: boolean }} props
 */
export default function LoginAlertModal({ cases = [], allCases = [], isLoading = false }) {
  const { userData } = useAuthStore();
  const navigate = useNavigate();

  const [visible, setVisible]       = useState(false);
  const [animated, setAnimated]     = useState(false);
  // Trigger terpisah — set satu kali, tidak bergantung pada cases
  const [triggerShow, setTriggerShow] = useState(false);
  const detectedRef = useRef(false);   // sudah terdeteksi critical? (sebelum timer)

  const role = userData?.role;
  const sessionKey = userData?.uid
    ? `kujang_login_modal_${userData.uid}_${new Date().toDateString()}`
    : null;

  /* ────────────────────────────────────────────────────────────
     EFFECT 1: Deteksi apakah ada kasus kritis.
     Dep: cases, allCases, userData, isLoading.
     Hanya set triggerShow=true SATU KALI — tidak menyentuh timer.
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    // Tunggu data selesai loading
    if (isLoading) return;
    // Sudah pernah terdeteksi → tidak perlu cek lagi
    if (detectedRef.current) return;
    if (!userData || !role) return;
    if (!sessionKey) return;
    if (sessionStorage.getItem(sessionKey)) return;

    const overdue = cases.filter((c) => c.slaStatus?.code === 'OVERDUE');
    const warning = cases.filter((c) => c.slaStatus?.code === 'WARNING');
    const adminOverdue = allCases.filter((c) => c.slaStatus?.code === 'OVERDUE');
    const adminWarning = allCases.filter((c) => c.slaStatus?.code === 'WARNING');

    let hasCritical = false;
    if (role === 'penyuluh') hasCritical = overdue.length > 0 || warning.length > 0;
    if (role === 'admin')    hasCritical = adminOverdue.length > 0 || adminWarning.length > 0;

    if (!hasCritical) return;

    // Kunci: tandai sudah terdeteksi SEBELUM set state
    detectedRef.current = true;
    setTriggerShow(true);
  }, [cases, allCases, userData, role, sessionKey, isLoading]);

  /* ────────────────────────────────────────────────────────────
     EFFECT 2: Tampilkan modal setelah 1 detik.
     HANYA dep pada triggerShow — tidak akan di-cancel oleh cases.
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!triggerShow) return;

    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimated(true));
    }, 900);

    return () => clearTimeout(timer);
  }, [triggerShow]); // deps minimal — aman dari race condition

  const handleClose = () => {
    setAnimated(false);
    setTimeout(() => {
      setVisible(false);
      if (sessionKey) sessionStorage.setItem(sessionKey, '1');
    }, 250);
  };

  const handleGo = (path) => {
    handleClose();
    setTimeout(() => navigate(path), 300);
  };

  if (!visible) return null;

  /* ── PENYULUH VIEW ── */
  if (role === 'penyuluh') {
    const overdue = cases.filter((c) => c.slaStatus?.code === 'OVERDUE');
    const warning = cases.filter((c) => c.slaStatus?.code === 'WARNING');
    const hasOverdue = overdue.length > 0;
    const headerBg = hasOverdue
      ? 'linear-gradient(135deg, #7F1D1D, #991B1B)'
      : 'linear-gradient(135deg, #78350F, #92400E)';

    return (
      <Overlay animated={animated} onClose={handleClose}>
        {/* Header */}
        <div style={{
          background: headerBg,
          padding: '20px 24px',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '24px' }}>{hasOverdue ? '🚨' : '⚠️'}</span>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '15px', margin: 0 }}>
              Perhatian — Ada Kasus Kritis!
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', margin: 0, marginTop: '2px' }}>
              Selamat datang, {userData?.nama}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '13px', color: '#374151', marginBottom: '16px', lineHeight: 1.5 }}>
            Anda memiliki kasus yang perlu segera ditangani hari ini:
          </p>

          {overdue.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#7F1D1D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                🔴 Lewat Jatuh Tempo ({overdue.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {overdue.slice(0, 3).map((c) => {
                  const jl = slaConfig.jenisLayanan.find((j) => j.id === c.jenisLayananId);
                  return (
                    <ModalCaseRow key={c.id} color="#EF4444" bg="#FEF2F2">
                      <span style={{ fontWeight: 600, color: '#7F1D1D', fontSize: '13px' }}>{c.namaWP}</span>
                      <span style={{ color: '#991B1B', fontSize: '11px' }}>
                        {jl?.nama || c.jenisLayananId} — Lewat {Math.abs(c.slaStatus?.sisaHari)} hari
                      </span>
                    </ModalCaseRow>
                  );
                })}
                {overdue.length > 3 && (
                  <p style={{ fontSize: '11px', color: '#991B1B', paddingLeft: '8px' }}>
                    + {overdue.length - 3} kasus lainnya
                  </p>
                )}
              </div>
            </div>
          )}

          {warning.length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#78350F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                🟡 Mendekati Jatuh Tempo ({warning.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {warning.slice(0, 3).map((c) => {
                  const jl = slaConfig.jenisLayanan.find((j) => j.id === c.jenisLayananId);
                  return (
                    <ModalCaseRow key={c.id} color="#F59E0B" bg="#FFFBEB">
                      <span style={{ fontWeight: 600, color: '#78350F', fontSize: '13px' }}>{c.namaWP}</span>
                      <span style={{ color: '#92400E', fontSize: '11px' }}>
                        {jl?.nama || c.jenisLayananId} — H-{c.slaStatus?.sisaHari}
                      </span>
                    </ModalCaseRow>
                  );
                })}
                {warning.length > 3 && (
                  <p style={{ fontSize: '11px', color: '#92400E', paddingLeft: '8px' }}>
                    + {warning.length - 3} kasus lainnya
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <ModalFooter onClose={handleClose} onGo={() => handleGo('/tugas-saya')} goLabel="Lihat Tugas Saya →" />
      </Overlay>
    );
  }

  /* ── ADMIN VIEW ── */
  if (role === 'admin') {
    const overdue = allCases.filter((c) => c.slaStatus?.code === 'OVERDUE');
    const warning = allCases.filter((c) => c.slaStatus?.code === 'WARNING');
    const safe    = allCases.filter((c) => c.slaStatus?.code === 'SAFE');

    const penyuluhMap = {};
    overdue.forEach((c) => {
      const p = slaConfig.penyuluh.find((px) => px.id === c.penyuluhId);
      const name = p?.nama || c.penyuluhId;
      penyuluhMap[name] = (penyuluhMap[name] || 0) + 1;
    });
    const penyuluhKritis = Object.entries(penyuluhMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return (
      <Overlay animated={animated} onClose={handleClose}>
        <div style={{
          background: 'linear-gradient(135deg, #0D2E5C, #185FA5)',
          padding: '20px 24px',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '24px' }}>📋</span>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '15px', margin: 0 }}>
              Ringkasan Kondisi Hari Ini
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', margin: 0, marginTop: '2px' }}>
              Selamat datang, {userData?.nama}
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '13px', color: '#374151', marginBottom: '14px' }}>
            Total kasus aktif: <strong>{allCases.length}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <StatRow icon="🔴" color="#7F1D1D" label={`Lewat jatuh tempo: ${overdue.length} kasus`} />
            <StatRow icon="🟡" color="#78350F" label={`Warning H-N: ${warning.length} kasus`} />
            <StatRow icon="🟢" color="#14532D" label={`Aman: ${safe.length} kasus`} />
          </div>
          {penyuluhKritis.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Penyuluh dengan kasus kritis:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {penyuluhKritis.map(([nama, count]) => (
                  <div key={nama} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E24B4A', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#374151' }}>
                      {nama} — <strong style={{ color: '#7F1D1D' }}>{count} kasus merah</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ModalFooter onClose={handleClose} onGo={() => handleGo('/monitoring')} goLabel="Buka Monitoring →" />
      </Overlay>
    );
  }

  return null;
}

/* ─────────── Sub-komponen ─────────── */

function Overlay({ children, animated, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: `rgba(0,0,0,${animated ? 0.5 : 0})`,
        backdropFilter: animated ? 'blur(2px)' : 'none',
        transition: 'background-color 0.25s ease, backdrop-filter 0.25s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          transform: animated ? 'scale(1)' : 'scale(0.9)',
          opacity: animated ? 1 : 0,
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalCaseRow({ children, color, bg }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '8px 10px',
      backgroundColor: bg,
      borderRadius: '8px',
      borderLeft: `3px solid ${color}`,
    }}>
      {children}
    </div>
  );
}

function StatRow({ icon, color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <span style={{ fontSize: '13px', color }}>{label}</span>
    </div>
  );
}

function ModalFooter({ onClose, onGo, goLabel }) {
  return (
    <div style={{
      padding: '14px 24px 20px',
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      borderTop: '1px solid #F3F4F6',
    }}>
      <button
        onClick={onClose}
        style={{
          padding: '9px 18px',
          border: '1.5px solid #D1D5DB',
          borderRadius: '8px',
          backgroundColor: 'white',
          color: '#374151',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Tutup
      </button>
      <button
        onClick={onGo}
        style={{
          padding: '9px 18px',
          border: 'none',
          borderRadius: '8px',
          backgroundColor: '#0D2E5C',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {goLabel}
      </button>
    </div>
  );
}
