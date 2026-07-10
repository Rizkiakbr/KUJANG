import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import { SLABadge, TahapBadge } from '../components/ui/Badge';
import DonutChart from '../components/ui/DonutChart';
import StackedBar from '../components/ui/StackedBar';
import { useGetCases } from '../hooks/useCases';
import { useSLAStatus } from '../hooks/useSLAStatus';
import { useAuthStore } from '../store/authStore';
import slaConfig from '../config/slaConfig.json';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatRupiah } from '../services/reportService';

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMM yyyy', { locale: idLocale });
}

function StatCard({ label, value, sub, color = 'text-navy', bg = 'bg-white' }) {
  return (
    <div className={`card p-5 text-center ${bg}`}>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardKasiPage() {
  const navigate = useNavigate();
  const { userData } = useAuthStore();

  const [filterPenyuluh, setFilterPenyuluh] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');

  const { data: rawCases = [], isLoading } = useGetCases({});
  const allCases = useSLAStatus(rawCases);

  // Filter client-side
  const filteredCases = useMemo(() => {
    return allCases.filter(k => {
      if (filterPenyuluh && k.penyuluhId !== filterPenyuluh) return false;
      if (filterStatus && k.slaStatus?.code !== filterStatus) return false;
      return true;
    });
  }, [allCases, filterPenyuluh, filterStatus]);

  // Hitung stats dari filtered cases
  const stats = useMemo(() => ({
    total:   filteredCases.length,
    overdue: filteredCases.filter(k => k.slaStatus?.code === 'OVERDUE').length,
    warning: filteredCases.filter(k => k.slaStatus?.code === 'WARNING').length,
    safe:    filteredCases.filter(k => k.slaStatus?.code === 'SAFE').length,
  }), [filteredCases]);

  // Kasus kritis (overdue + warning)
  const kasusKritis = useMemo(() =>
    filteredCases
      .filter(k => ['OVERDUE', 'WARNING'].includes(k.slaStatus?.code))
      .slice(0, 10),
    [filteredCases]
  );

  // Hitung per penyuluh
  const perPenyuluh = useMemo(() => {
    return slaConfig.penyuluh.map(p => {
      const kasusP = filteredCases.filter(k => k.penyuluhId === p.id);
      return {
        ...p,
        total:   kasusP.length,
        overdue: kasusP.filter(k => k.slaStatus?.code === 'OVERDUE').length,
        warning: kasusP.filter(k => k.slaStatus?.code === 'WARNING').length,
        safe:    kasusP.filter(k => k.slaStatus?.code === 'SAFE').length,
      };
    });
  }, [filteredCases]);

  // Donut chart data
  const donutData = [
    { label: 'Lewat Tempo', value: stats.overdue, color: '#E24B4A' },
    { label: 'Warning',     value: stats.warning, color: '#EF9F27' },
    { label: 'Aman',        value: stats.safe,    color: '#1D9E75' },
  ];

  // Stacked bar per penyuluh
  const stackedData = perPenyuluh.map(p => ({
    label: p.nama.split(' ')[0],
    segments: [
      { value: p.overdue, color: '#E24B4A', title: 'Lewat Tempo' },
      { value: p.warning, color: '#EF9F27', title: 'Warning' },
      { value: p.safe,    color: '#1D9E75', title: 'Aman' },
    ],
  }));

  const handleDetailPenyuluh = (penyuluhId) => {
    setFilterPenyuluh(penyuluhId);
    navigate('/monitoring');
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-extrabold text-navy text-lg">Dashboard Kepala Seksi</h1>
            <p className="text-xs text-gray-500">
              Monitoring & supervisi semua kasus — read only · {userData?.nama}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-blue-700 font-semibold">👁️ Mode Monitoring</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card px-5 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={filterPenyuluh}
              onChange={e => setFilterPenyuluh(e.target.value)}
              className="form-input text-xs w-auto"
            >
              <option value="">Semua Penyuluh</option>
              {slaConfig.penyuluh.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="form-input text-xs w-auto"
            >
              <option value="">Semua Status</option>
              <option value="OVERDUE">🔴 Lewat Tempo</option>
              <option value="WARNING">🟡 Warning</option>
              <option value="SAFE">🟢 Aman</option>
            </select>
            {(filterPenyuluh || filterStatus) && (
              <button
                onClick={() => { setFilterPenyuluh(''); setFilterStatus(''); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Reset Filter
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">{filteredCases.length} kasus ditampilkan</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Kasus"  value={stats.total}   color="text-navy"   />
          <StatCard label="Lewat Tempo"  value={stats.overdue} color="text-danger"  />
          <StatCard label="Warning"      value={stats.warning} color="text-gold"    />
          <StatCard label="Aman"         value={stats.safe}    color="text-teal"    />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Donut */}
          <div className="card p-5">
            <h2 className="font-bold text-navy text-sm mb-4">Distribusi Status SLA</h2>
            <div className="flex items-center gap-6">
              <DonutChart data={donutData} size={130} strokeWidth={20} />
              <div className="space-y-2.5 flex-1">
                {donutData.map(d => (
                  <div key={d.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-gray-600">{d.label}</span>
                    </div>
                    <span className="font-bold text-xs text-navy">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stacked Bar */}
          <div className="card p-5">
            <h2 className="font-bold text-navy text-sm mb-4">Kasus per Penyuluh</h2>
            {stackedData.length > 0 ? (
              <StackedBar data={stackedData} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Tidak ada data</p>
            )}
          </div>
        </div>

        {/* Tabel Per Penyuluh */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-bold text-navy text-sm">Rekap per Penyuluh</h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Nama Penyuluh', 'Total', 'Lewat Tempo', 'Warning', 'Aman', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perPenyuluh.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-navy">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                        {p.initials}
                      </div>
                      {p.nama}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{p.total}</td>
                  <td className="px-4 py-3 text-danger font-bold">{p.overdue}</td>
                  <td className="px-4 py-3 text-gold font-bold">{p.warning}</td>
                  <td className="px-4 py-3 text-teal font-bold">{p.safe}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDetailPenyuluh(p.id)}
                      className="text-[10px] font-semibold text-navy border border-navy/20 px-2.5 py-1 rounded-md hover:bg-navy hover:text-white transition-colors"
                    >
                      Detail →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kasus Kritis */}
        {kasusKritis.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-navy text-sm">
                🚨 Kasus Kritis ({kasusKritis.length} teratas)
              </h2>
              <span className="text-[10px] text-gray-400">Read-only</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['No', 'Penyuluh', 'Nama WP', 'Jenis Layanan', 'Jatuh Tempo', 'Sisa Hari', 'Status', 'Tahap'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kasusKritis.map((k, idx) => {
                    const jl = slaConfig.jenisLayanan.find(j => j.id === k.jenisLayananId);
                    const py = slaConfig.penyuluh.find(p => p.id === k.penyuluhId);
                    const code = k.slaStatus?.code;
                    const rowCls = code === 'OVERDUE' ? 'row-overdue' : 'row-warning';
                    return (
                      <tr key={k.id} className={`${rowCls} border-b border-gray-50`}>
                        <td className="px-3 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-md bg-navy flex items-center justify-center text-white text-[9px] font-bold">
                              {py?.initials || '??'}
                            </div>
                            <span>{py?.nama?.split(' ')[0] || k.penyuluhId}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-navy max-w-[150px]">
                          <p className="truncate">{k.namaWP}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-600 max-w-[150px]">
                          <p className="truncate">{jl?.nama || k.jenisLayananId}</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">{fmtDate(k.jatuhTempo)}</td>
                        <td className="px-3 py-3">
                          <span className={`font-bold ${code === 'OVERDUE' ? 'text-danger' : 'text-gold'}`}>
                            {k.slaStatus?.sisaHari}
                          </span>
                        </td>
                        <td className="px-3 py-3"><SLABadge code={code} label={k.slaStatus?.label} size="sm" /></td>
                        <td className="px-3 py-3"><TahapBadge tahap={k.tahapSaatIni} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-navy border-t-teal rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
