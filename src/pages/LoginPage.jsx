import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { loginWithNIP } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [nip, setNip]           = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!nip || !password) { setError('NIP dan kata sandi wajib diisi.'); return; }

    setLoading(true);
    try {
      const { user, userData } = await loginWithNIP(nip.trim(), password);
      setUser(user, userData);

      // Redirect berdasarkan role
      const redirectMap = {
        penyuluh:       '/dashboard',
        pelaksana:      '/monitoring',
        'kepala-seksi': '/dashboard-kasi',
        ketuakpp:       '/dashboard-ketua',
      };
      navigate(redirectMap[userData.role] || '/dashboard', { replace: true });
    } catch (err) {
      const msgMap = {
        'auth/user-not-found':     'NIP tidak terdaftar di sistem.',
        'auth/wrong-password':     'Kata sandi salah.',
        'auth/invalid-email':      'Format NIP tidak valid.',
        'auth/too-many-requests':  'Terlalu banyak percobaan. Coba lagi nanti.',
        'auth/invalid-credential': 'NIP atau kata sandi salah.',
      };
      setError(msgMap[err.code] || err.message || 'Login gagal. Periksa kembali NIP dan kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Panel Kiri ── */}
      <div
        className="hidden lg:flex w-[42%] flex-col items-center justify-between py-10 px-8 relative overflow-hidden"
        style={{ background: '#0D2E5C' }}
      >
        {/* Foto gedung sebagai background */}
        <img
          src="/gedung-kpp.webp"
          alt="Gedung KPP Madya Bandung"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 0.12 }}
        />

        {/* Overlay gradient gelap agar teks tetap terbaca */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(9,33,63,0.97) 0%, rgba(13,46,92,0.92) 100%)'
          }}
        />

        {/* Konten utama panel kiri */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 flex-1 justify-center">

          {/* Logo — langsung tanpa container/background kotak */}
          <img
            src="/logo-kujang.jpeg"
            alt="Logo KUJANG"
            className="w-36 h-36 object-contain drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}
            onError={e => {
              e.target.style.display = 'none';
            }}
          />

          {/* Brand */}
          <div>
            <h1 className="text-white font-black text-3xl tracking-[3px] mb-2">KUJANG</h1>
            <p className="text-blue-200 text-sm leading-relaxed max-w-xs">
              Kendali Utama Jatuh Tempo &<br />Antisipasi Gagal-waktu
            </p>
          </div>

          {/* Divider */}
          <div className="w-16 h-0.5" style={{ background: '#1D9E75' }} />

          {/* Instansi */}
          <div className="text-blue-300 text-xs space-y-1">
            <p className="font-semibold text-blue-100">KPP Madya Bandung</p>
            <p>Direktorat Jenderal Pajak</p>
            <p>Kementerian Keuangan RI</p>
          </div>

          {/* Badge Zona Integritas */}
          <div className="flex items-center gap-2 bg-teal/15 border border-teal/30 rounded-full px-4 py-2">
            <Shield size={13} className="text-teal-light" />
            <span className="text-[11px] font-bold text-teal-light tracking-wide">
              Zona Integritas · WBK &amp; WBBM
            </span>
          </div>
        </div>

        {/* Footer panel kiri */}
        <div className="relative z-10 text-center">
          <p className="text-xs text-blue-400/60">© 2026 DJP — Sistem Internal</p>
        </div>
      </div>

      {/* ── Panel Kanan ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img
              src="/logo-kujang.jpeg"
              alt="KUJANG"
              className="w-10 h-10 rounded-lg object-cover"
              onError={e => e.target.style.display = 'none'}
            />
            <div>
              <p className="font-black text-navy tracking-widest text-sm">KUJANG</p>
              <p className="text-[10px] text-gray-400">KPP Madya Bandung</p>
            </div>
          </div>

          {/* Header form */}
          <div className="mb-8">
            <h2 className="text-navy font-bold text-xl mb-1">Selamat datang</h2>
            <p className="text-gray-500 text-sm">Masuk menggunakan akun DJP Anda</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertTriangle size={15} className="text-danger mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* NIP */}
            <div>
              <label className="form-label" htmlFor="input-nip">NIP / Username</label>
              <input
                id="input-nip"
                type="text"
                value={nip}
                onChange={e => setNip(e.target.value)}
                placeholder="Contoh: 198001012005011001"
                className="form-input"
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="input-password">Kata Sandi</label>
              <div className="relative">
                <input
                  id="input-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" className="text-xs text-navy-light hover:underline">
                  Lupa kata sandi?
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : 'Masuk ke KUJANG'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">atau</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* SSO Button */}
            <button
              type="button"
              id="btn-sso"
              className="w-full border-2 border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg
                         hover:border-navy hover:text-navy transition-all text-sm"
            >
              🔐 Masuk dengan SSO DJP
            </button>
          </form>

          {/* Warning */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-yellow-800">
              Sistem ini hanya untuk pegawai KPP Madya Bandung yang berwenang. Akses tidak sah merupakan pelanggaran.
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] text-gray-400">
            KUJANG v2.0 · KPP Madya Bandung · DJP
          </p>
        </div>
      </div>
    </div>
  );
}
