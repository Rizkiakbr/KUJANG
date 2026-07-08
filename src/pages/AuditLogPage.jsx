import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import { useGetCases } from '../hooks/useCases';
import { getAuditLogs } from '../services/auditService';
import { exportToCSV } from '../services/reportService';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';

function fmtTs(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMM yyyy HH:mm', { locale: idLocale });
}

const ACTION_LABELS = {
  LOGIN:         { label: 'Login',           cls: 'bg-blue-50 text-blue-700' },
  LOGOUT:        { label: 'Logout',          cls: 'bg-gray-100 text-gray-600' },
  CREATE_CASE:   { label: 'Buat Kasus',      cls: 'bg-green-50 text-green-700' },
  UPDATE_CASE:   { label: 'Update Kasus',    cls: 'bg-yellow-50 text-yellow-700' },
  DELETE_CASE:   { label: 'Hapus Kasus',     cls: 'bg-red-50 text-red-700' },
  UPLOAD_DATA:   { label: 'Upload Data',     cls: 'bg-purple-50 text-purple-700' },
  EXPORT_REPORT: { label: 'Export Laporan',  cls: 'bg-teal/10 text-teal-dark' },
};

export default function AuditLogPage() {
  const { userData } = useAuthStore();
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser]     = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', filterAction, filterUser],
    queryFn: () => getAuditLogs({
      action: filterAction || undefined,
      userUid: filterUser || undefined,
    }),
    staleTime: 1000 * 30,
  });

  const filtered = useMemo(() => {
    let r = logs;
    if (filterUser) r = r.filter(l => l.userUid === filterUser || l.userName?.toLowerCase().includes(filterUser.toLowerCase()));
    return r;
  }, [logs, filterUser]);

  const handleExport = () => {
    exportToCSV(
      filtered,
      ['Waktu', 'User', 'Role', 'Aksi', 'Target ID', 'Detail'],
      (l) => [fmtTs(l.timestamp), l.userName, l.userRole, l.action, l.targetId || '-', l.detail],
      `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      userData
    );
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-extrabold text-navy text-lg">Audit Log Aktivitas</h1>
            <p className="text-xs text-gray-500">Rekam jejak semua aktivitas pengguna di sistem KUJANG</p>
          </div>
          <button onClick={handleExport} disabled={filtered.length === 0}
                  className="btn-primary flex items-center gap-2 text-xs disabled:opacity-50">
            <Download size={13} /> Export CSV
          </button>
        </div>

        {/* Filter */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <input
            type="text" placeholder="Cari nama user..."
            value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="form-input text-xs w-48"
          />
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                  className="form-input text-xs w-48">
            <option value="">Semua Aksi</option>
            {Object.keys(ACTION_LABELS).map(a => (
              <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} log</span>
        </div>

        {/* Tabel */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Waktu','User','Role','Aksi','Target ID','Detail'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-navy border-t-teal rounded-full animate-spin mx-auto" />
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400">Belum ada log</td></tr>
                ) : filtered.map(log => {
                  const action = ACTION_LABELS[log.action] || { label: log.action, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fmtTs(log.timestamp)}</td>
                      <td className="px-4 py-3 font-semibold text-navy">{log.userName}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{log.userRole}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.cls}`}>
                          {action.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400">{log.targetId || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={log.detail}>{log.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
