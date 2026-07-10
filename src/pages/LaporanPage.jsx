import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import DonutChart from '../components/ui/DonutChart';
import StackedBar from '../components/ui/StackedBar';
import { useAuthStore } from '../store/authStore';
import { useGetCases } from '../hooks/useCases';
import { useSLAStatus } from '../hooks/useSLAStatus';
import { exportToCSV, getRestitusiReport, formatRupiah } from '../services/reportService';
import slaConfig from '../config/slaConfig.json';

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMM yyyy', { locale: idLocale });
}

const TABS = [
  { id: 'rekap-bulanan', label: '📊 Rekap Bulanan' },
  { id: 'restitusi',     label: '💰 Monitoring Restitusi' },
];

const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function LaporanPage() {
  const { userData } = useAuthStore();
  const now = new Date();
  const [activeTab, setActiveTab] = useState('rekap-bulanan');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [filterPenyuluh, setFilterPenyuluh] = useState('');

  const isPenyuluh = userData?.role === 'penyuluh';
  const penyuluhId = isPenyuluh ? userData?.penyuluhId : null;
  const { data: rawCases = [], isLoading } = useGetCases(penyuluhId ? { penyuluhId } : {});
  const cases = useSLAStatus(rawCases);

  // ── TAB 1: REKAP BULANAN ──

  // Filter bulan & tahun
  const filtered = useMemo(() => cases.filter(c => {
    const tgl = c.tanggalLPAD?.toDate?.() ?? new Date(c.tanggalLPAD);
    return tgl.getMonth() + 1 === month && tgl.getFullYear() === year;
  }), [cases, month, year]);

  const overdueCount = filtered.filter(c => c.slaStatus?.code === 'OVERDUE').length;
  const warningCount = filtered.filter(c => c.slaStatus?.code === 'WARNING').length;
  const safeCount    = filtered.filter(c => c.slaStatus?.code === 'SAFE').length;
  const selesai      = filtered.filter(c => c.tahapSaatIni === 'SPMKP').length;
  const compliance   = filtered.length > 0 ? Math.round((safeCount / filtered.length) * 100) : 0;

  // Per penyuluh
  const perPenyuluh = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      if (!map[c.penyuluhId]) {
        const py = slaConfig.penyuluh.find(p => p.id === c.penyuluhId);
        map[c.penyuluhId] = { nama: py?.nama || c.penyuluhId, total: 0, overdue: 0, warning: 0, safe: 0, selesai: 0 };
      }
      map[c.penyuluhId].total++;
      map[c.penyuluhId][c.slaStatus.code.toLowerCase()]++;
      if (c.tahapSaatIni === 'SPMKP') map[c.penyuluhId].selesai++;
    });
    return Object.values(map);
  }, [filtered]);

  // Donut data
  const donutData = [
    { label: 'Lewat Tempo', value: overdueCount, color: '#E24B4A' },
    { label: 'Warning',     value: warningCount, color: '#EF9F27' },
    { label: 'Aman',        value: safeCount,    color: '#1D9E75' },
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

  const handleExport = () => {
    const cols = ['Nama WP', 'NPWP', 'Jenis Layanan', 'Penyuluh', 'Tgl LPAD', 'Jatuh Tempo', 'Status SLA', 'Tahap', 'Hasil', 'Nominal Restitusi'];
    exportToCSV(
      filtered,
      cols,
      (c) => {
        const jl = slaConfig.jenisLayanan.find(j => j.id === c.jenisLayananId);
        const py = slaConfig.penyuluh.find(p => p.id === c.penyuluhId);
        return [
          c.namaWP, c.npwp, jl?.nama || c.jenisLayananId, py?.nama || c.penyuluhId,
          fmtDate(c.tanggalLPAD), fmtDate(c.jatuhTempo), c.slaStatus?.label,
          c.tahapSaatIni, c.hasilPenelitian || '-',
          c.nominalRestitusi != null ? c.nominalRestitusi : '-',
        ];
      },
      `laporan-kujang-${year}-${String(month).padStart(2,'0')}.csv`,
      userData
    );
  };

  // ── TAB 2: MONITORING RESTITUSI ──

  const restitusiPenyuluh = isPenyuluh ? userData?.penyuluhId : filterPenyuluh || null;
  const restitusiReport = useMemo(
    () => getRestitusiReport(cases, month, year, restitusiPenyuluh),
    [cases, month, year, restitusiPenyuluh]
  );

  const handleExportRestitusi = () => {
    const allItems = [
      ...restitusiReport.harusCair.items,
      ...restitusiReport.sudahCair.items.filter(i => !restitusiReport.harusCair.items.find(h => h.id === i.id)),
      ...restitusiReport.ditahan.items.filter(i => !restitusiReport.harusCair.items.find(h => h.id === i.id) && !restitusiReport.sudahCair.items.find(s => s.id === i.id)),
    ];
    const cols = ['Nama WP', 'NPWP', 'Jenis Layanan', 'Penyuluh', 'Jatuh Tempo', 'Nominal Restitusi', 'Status', 'Tahap', 'No. SPMKP'];
    exportToCSV(
      allItems,
      cols,
      (c) => {
        const jl = slaConfig.jenisLayanan.find(j => j.id === c.jenisLayananId);
        const py = slaConfig.penyuluh.find(p => p.id === c.penyuluhId);
        return [
          c.namaWP, c.npwp, jl?.nama || c.jenisLayananId, py?.nama || c.penyuluhId,
          fmtDate(c.jatuhTempo),
          c.nominalRestitusi != null ? c.nominalRestitusi : '-',
          c.slaStatus?.label || '-',
          c.tahapSaatIni,
          c.nomorSPMKP || '-',
        ];
      },
      `monitoring-restitusi-kujang-${year}-${String(month).padStart(2,'0')}.csv`,
      userData
    );
  };

  const canExport = ['pelaksana', 'kepala-seksi'].includes(userData?.role);

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-extrabold text-navy text-lg">Laporan</h1>
            <p className="text-xs text-gray-500">Rekap performa penanganan permohonan berdasarkan periode</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all
                ${activeTab === tab.id
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Periode — tampil di kedua tab */}
        <div className="card p-4 flex items-center gap-4 flex-wrap">
          <div>
            <label className="form-label">Bulan</label>
            <select value={month} onChange={e => setMonth(+e.target.value)} className="form-input text-xs w-36">
              {monthNames.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tahun</label>
            <select value={year} onChange={e => setYear(+e.target.value)} className="form-input text-xs w-24">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {!isPenyuluh && (
            <div>
              <label className="form-label">Penyuluh</label>
              <select value={filterPenyuluh} onChange={e => setFilterPenyuluh(e.target.value)} className="form-input text-xs w-auto">
                <option value="">Semua Penyuluh</option>
                {slaConfig.penyuluh.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
          )}
          <div className="ml-auto text-sm font-semibold text-navy">
            {monthNames[month-1]} {year}
          </div>
        </div>

        {/* ── TAB 1: REKAP BULANAN ── */}
        {activeTab === 'rekap-bulanan' && (
          <>
            <div className="flex justify-end">
              {canExport && (
                <button onClick={handleExport} disabled={filtered.length === 0}
                        className="btn-primary flex items-center gap-2 text-xs disabled:opacity-50">
                  <Download size={13} /> Export CSV
                </button>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total Kasus',    val: filtered.length, cls: 'text-navy' },
                { label: 'Lewat Tempo',    val: overdueCount,    cls: 'text-danger' },
                { label: 'Warning',        val: warningCount,    cls: 'text-gold' },
                { label: 'Aman',           val: safeCount,       cls: 'text-teal' },
                { label: '% Compliance',   val: compliance + '%', cls: compliance >= 80 ? 'text-teal' : 'text-danger' },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <p className={`text-2xl font-extrabold ${s.cls}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

              <div className="card p-5">
                <h2 className="font-bold text-navy text-sm mb-4">Kasus per Penyuluh</h2>
                {stackedData.length > 0 ? (
                  <StackedBar data={stackedData} />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">Tidak ada data</p>
                )}
              </div>
            </div>

            {/* Tabel per penyuluh */}
            {!isPenyuluh && perPenyuluh.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="font-bold text-navy text-sm">Rekap per Penyuluh</h2>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Penyuluh','Total','Lewat Tempo','Warning','Aman','Selesai','Compliance'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {perPenyuluh.map(p => (
                      <tr key={p.nama} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-navy">{p.nama}</td>
                        <td className="px-4 py-3">{p.total}</td>
                        <td className="px-4 py-3 text-danger font-semibold">{p.overdue}</td>
                        <td className="px-4 py-3 text-gold font-semibold">{p.warning}</td>
                        <td className="px-4 py-3 text-teal font-semibold">{p.safe}</td>
                        <td className="px-4 py-3">{p.selesai}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${p.total > 0 && (p.safe/p.total)*100 >= 80 ? 'text-teal' : 'text-danger'}`}>
                            {p.total > 0 ? Math.round((p.safe/p.total)*100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: MONITORING RESTITUSI ── */}
        {activeTab === 'restitusi' && (
          <>
            <div className="flex justify-end">
              {canExport && (
                <button onClick={handleExportRestitusi}
                        className="btn-primary flex items-center gap-2 text-xs">
                  <Download size={13} /> Export CSV Restitusi
                </button>
              )}
            </div>

            {/* 3 Kartu Rekap Nominal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Harus Cair */}
              <div className="card p-5 border-l-4 border-gold">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">💰</span>
                  <span className="text-[10px] font-bold text-gold bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                    JT Bulan Ini
                  </span>
                </div>
                <p className="font-black text-navy text-xl leading-tight">
                  {formatRupiah(restitusiReport.harusCair.total)}
                </p>
                <p className="text-[11px] text-gray-500 font-semibold mt-1">Harus Cair</p>
                <p className="text-[10px] text-gray-400">{restitusiReport.harusCair.count} permohonan</p>
              </div>

              {/* Sudah Cair */}
              <div className="card p-5 border-l-4 border-teal">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">✅</span>
                  <span className="text-[10px] font-bold text-teal bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Ada SPMKP
                  </span>
                </div>
                <p className="font-black text-navy text-xl leading-tight">
                  {formatRupiah(restitusiReport.sudahCair.total)}
                </p>
                <p className="text-[11px] text-gray-500 font-semibold mt-1">Sudah Cair</p>
                <p className="text-[10px] text-gray-400">{restitusiReport.sudahCair.count} permohonan</p>
              </div>

              {/* Ditahan/Belum Cair */}
              <div className="card p-5 border-l-4 border-danger">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">⏳</span>
                  <span className="text-[10px] font-bold text-danger bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    Belum SPMKP
                  </span>
                </div>
                <p className="font-black text-navy text-xl leading-tight">
                  {formatRupiah(restitusiReport.ditahan.total)}
                </p>
                <p className="text-[11px] text-gray-500 font-semibold mt-1">Ditahan / Belum Cair</p>
                <p className="text-[10px] text-gray-400">{restitusiReport.ditahan.count} permohonan</p>
              </div>
            </div>

            {/* Tabel Detail — Harus Cair bulan ini */}
            {restitusiReport.harusCair.items.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="font-bold text-navy text-sm">
                    💰 Permohonan Jatuh Tempo — {monthNames[month-1]} {year}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['No', 'Nama WP', 'Jenis', 'Penyuluh', 'Jatuh Tempo', 'Nominal Restitusi', 'Status', 'Tahap'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {restitusiReport.harusCair.items.map((c, idx) => {
                        const jl = slaConfig.jenisLayanan.find(j => j.id === c.jenisLayananId);
                        const py = slaConfig.penyuluh.find(p => p.id === c.penyuluhId);
                        return (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-3 py-3 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-3 font-semibold text-navy">{c.namaWP}</td>
                            <td className="px-3 py-3 text-gray-600 max-w-[140px]"><p className="truncate">{jl?.nama || c.jenisLayananId}</p></td>
                            <td className="px-3 py-3">{py?.nama?.split(' ')[0] || c.penyuluhId}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{fmtDate(c.jatuhTempo)}</td>
                            <td className="px-3 py-3 font-semibold text-navy">
                              {c.nominalRestitusi != null
                                ? <span className="text-teal font-bold">{formatRupiah(c.nominalRestitusi)}</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                ${c.slaStatus?.code === 'OVERDUE' ? 'bg-red-100 text-red-700'
                                  : c.slaStatus?.code === 'WARNING' ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'}`}>
                                {c.slaStatus?.label}
                              </span>
                            </td>
                            <td className="px-3 py-3">{c.tahapSaatIni}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabel Detail — Ditahan/Belum Cair */}
            {restitusiReport.ditahan.items.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="font-bold text-navy text-sm">
                    ⏳ Belum Cair (Non-SKB tanpa SPMKP)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['No', 'Nama WP', 'Jenis', 'Penyuluh', 'Jatuh Tempo', 'Nominal Restitusi', 'Tahap'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {restitusiReport.ditahan.items.map((c, idx) => {
                        const jl = slaConfig.jenisLayanan.find(j => j.id === c.jenisLayananId);
                        const py = slaConfig.penyuluh.find(p => p.id === c.penyuluhId);
                        return (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-3 py-3 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-3 font-semibold text-navy">{c.namaWP}</td>
                            <td className="px-3 py-3 text-gray-600 max-w-[140px]"><p className="truncate">{jl?.nama || c.jenisLayananId}</p></td>
                            <td className="px-3 py-3">{py?.nama?.split(' ')[0] || c.penyuluhId}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{fmtDate(c.jatuhTempo)}</td>
                            <td className="px-3 py-3">
                              {c.nominalRestitusi != null
                                ? <span className="text-navy font-bold">{formatRupiah(c.nominalRestitusi)}</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-3 py-3">{c.tahapSaatIni}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {restitusiReport.harusCair.items.length === 0 && restitusiReport.ditahan.items.length === 0 && (
              <div className="card p-8 text-center text-gray-400">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-sm">Tidak ada data restitusi untuk periode ini.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
