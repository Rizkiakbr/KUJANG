import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import { Construction } from 'lucide-react';

export default function DashboardKetuaPage() {
  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
        <div className="w-20 h-20 rounded-2xl bg-navy/10 flex items-center justify-center mb-6">
          <Construction size={36} className="text-navy" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy mb-2">Dashboard Ketua KPP</h1>
        <p className="text-gray-500 text-sm max-w-sm mb-1">
          Halaman eksekutif untuk Kepala Kantor sedang dalam pengembangan.
        </p>
        <p className="text-gray-400 text-xs">Akan tersedia di KUJANG v2.0</p>

        <div className="mt-8 flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-5 py-2">
          <span className="text-xs font-bold text-gold">🚧 Coming Soon — Fase 2</span>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            { icon: '📊', label: 'Grafik Kinerja Real-time',   desc: 'Monitor semua penyuluh sekaligus' },
            { icon: '🎯', label: 'Target SLA per Bulan',       desc: 'Penetapan & tracking target' },
            { icon: '📋', label: 'Laporan Eksekutif PDF',      desc: 'Ekspor laporan 1 klik' },
          ].map(f => (
            <div key={f.label} className="card p-4 text-center opacity-50">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="font-semibold text-navy text-sm">{f.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
