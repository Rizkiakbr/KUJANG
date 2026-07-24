import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import { SLABadge, TahapBadge } from '../components/ui/Badge';
import SidePanel from '../components/ui/SidePanel';
import CaseForm from '../components/forms/CaseForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoginAlertModal from '../components/ui/LoginAlertModal';
import { useGetCases, useCreateCase, useUpdateCase, useDeleteCase, useHolidays } from '../hooks/useCases';
import { useSLAStatus } from '../hooks/useSLAStatus';
import { calcMultiJatuhTempo, getStatusTerkritis, calcSLAStatus } from '../services/slaService';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import slaConfig from '../config/slaConfig.json';


const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  { value: 'OVERDUE',          label: '🔴 Lewat Tempo'       },
  { value: 'WARNING',          label: '🟡 Warning H-N'       },
  { value: 'SAFE',             label: '🟢 Aman'              },
  { value: 'COMPLETED_ONTIME', label: '✅ Tepat Waktu'       },
  { value: 'COMPLETED_LATE',   label: '🟠 Terlambat Selesai' },
];

/**
 * Helper: ambil JT yang ditampilkan di tabel (JT terkritis untuk multi-JT, JT tunggal untuk SKB)
 */
function getDisplayJT(kasus, holidays) {
  const config = slaConfig.jenisLayanan.find(j => j.id === kasus.jenisLayananId);
  if (config?.multiJatuhTempo) {
    const multiJT    = calcMultiJatuhTempo(kasus, kasus.jenisLayananId, holidays);
    const terkritis  = getStatusTerkritis(multiJT);
    const tooltip    = multiJT
      ? multiJT.map(jt =>
          `${jt.label}: ${jt.jatuhTempo
            ? format(new Date(jt.jatuhTempo), 'dd MMM yyyy')
            : 'Belum diisi'}`
        ).join('\n')
      : null;
    return {
      jatuhTempo: terkritis?.jatuhTempo ?? null,
      status:     terkritis?.status ?? null,
      isMulti:    true,
      tooltip,
    };
  }
  return {
    jatuhTempo: kasus.jatuhTempo,
    status:     calcSLAStatus(kasus.jatuhTempo, kasus.jenisLayananId, kasus),
    isMulti:    false,
    tooltip:    null,
  };
}

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMM yyyy', { locale: idLocale });
}

export default function MonitoringPage() {
  const navigate = useNavigate();
  const { userData } = useAuthStore();
  const role = userData?.role;

  const [panelOpen, setPanelOpen]   = useState(false);
  const [panelMode, setPanelMode]   = useState('create');
  const [selectedCase, setSelected] = useState(null);
  const [confirmKasus, setConfirmKasus] = useState(null); // kasus object untuk hapus
  const [search, setSearch]         = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterPenyuluh, setFilterPenyuluh] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [page, setPage] = useState(1);

  const { data: holidays = [] } = useHolidays(new Date().getFullYear());


  const { data: rawCases = [], isLoading } = useGetCases({});
  const cases = useSLAStatus(rawCases);

  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase();
  const deleteMutation = useDeleteCase();
  const addToast = useToastStore((s) => s.addToast);

  const filtered = useMemo(() => {
    let r = cases;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c => c.namaWP?.toLowerCase().includes(q) || c.npwp?.includes(q));
    }
    if (filterJenis) r = r.filter(c => c.jenisLayananId === filterJenis);
    if (filterPenyuluh) r = r.filter(c => c.penyuluhId === filterPenyuluh);
    if (selectedStatuses.length > 0) r = r.filter(c => selectedStatuses.includes(c.slaStatus?.code));
    return r;
  }, [cases, search, filterJenis, filterPenyuluh, selectedStatuses]);


  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const overdueCount = cases.filter(c => c.slaStatus?.code === 'OVERDUE').length;
  const warningCount = cases.filter(c => c.slaStatus?.code === 'WARNING').length;

  const openCreate = () => { setPanelMode('create'); setSelected(null); setPanelOpen(true); };
  const openEdit   = (k) => { setPanelMode('edit'); setSelected(k); setPanelOpen(true); };

  const handleSubmit = async (data) => {
    try {
      if (panelMode === 'create') {
        await createMutation.mutateAsync(data);
        addToast({ type: 'success', title: 'Kasus Ditambahkan', message: `${data.namaWP} berhasil disimpan` });
      } else {
        await updateMutation.mutateAsync({ id: selectedCase.id, data });
        addToast({ type: 'success', title: 'Kasus Diperbarui', message: `${data.namaWP} berhasil diperbarui` });
      }
      setPanelOpen(false);
    } catch (err) {
      addToast({ type: 'danger', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan' });
    }
  };

  const handleDelete = async () => {
    if (!confirmKasus) return;
    try {
      await deleteMutation.mutateAsync({ id: confirmKasus.id, caseData: confirmKasus });
      addToast({ type: 'info', title: 'Kasus Dihapus', message: `Kasus ${confirmKasus?.namaWP || ''} berhasil dihapus` });
      setConfirmKasus(null);
    } catch (err) {
      addToast({ type: 'danger', title: 'Gagal Menghapus', message: err.message || 'Terjadi kesalahan' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="max-w-7xl mx-auto px-5 py-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-extrabold text-navy text-lg">Monitoring Semua Kasus</h1>
            <p className="text-xs text-gray-500">
              Total <strong>{cases.length}</strong> kasus ·
              <span className="text-danger font-semibold"> {overdueCount} lewat tempo</span> ·
              <span className="text-gold font-semibold"> {warningCount} warning</span>
            </p>
          </div>
          <div className="flex gap-2">
            {role === 'pelaksana' && (
              <button onClick={() => navigate('/upload')} className="btn-outline flex items-center gap-1.5 text-xs">
                <Upload size={13} /> Upload xlsx
              </button>
            )}
            {['penyuluh', 'pelaksana'].includes(role) && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={13} /> Tambah Kasus
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card px-5 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Cari nama WP atau NPWP..."
                     value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                     className="form-input pl-9 text-xs" />
            </div>
            <select value={filterJenis} onChange={e => { setFilterJenis(e.target.value); setPage(1); }}
                    className="form-input text-xs w-auto min-w-44">
              <option value="">Semua Jenis</option>
              {slaConfig.jenisLayanan.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
            <select value={filterPenyuluh} onChange={e => { setFilterPenyuluh(e.target.value); setPage(1); }}
                    className="form-input text-xs w-auto">
              <option value="">Semua Penyuluh</option>
              {slaConfig.penyuluh.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
            {/* Filter Status — multi-select pills */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSelectedStatuses(prev =>
                      prev.includes(opt.value)
                        ? prev.filter(s => s !== opt.value)
                        : [...prev, opt.value]
                    );
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${selectedStatuses.includes(opt.value)
                      ? 'bg-[#0D2E5C] text-white border-[#0D2E5C]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
              {selectedStatuses.length > 0 && (
                <button
                  onClick={() => { setSelectedStatuses([]); setPage(1); }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Reset
                </button>
              )}
            </div>

            <span className="text-xs text-gray-400 ml-auto">{filtered.length} kasus</span>
          </div>
        </div>

        {/* Tabel */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['No','Penyuluh','Jenis Layanan','Nama WP','NPWP','Jatuh Tempo','Sisa Hari','Status','Tahap','Aksi'].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-navy border-t-teal rounded-full animate-spin mx-auto" />
                  </td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-gray-400">Tidak ada kasus</td></tr>
                ) : paged.map((k, idx) => {
                  const jl   = slaConfig.jenisLayanan.find(j => j.id === k.jenisLayananId);
                  const py   = slaConfig.penyuluh.find(p => p.id === k.penyuluhId);
                  const code = k.slaStatus?.code;
                  const rowCls =
                    code === 'OVERDUE'          ? 'row-overdue' :
                    code === 'WARNING'          ? 'row-warning' :
                    code === 'COMPLETED_ONTIME' ? 'row-completed-ontime' :
                    code === 'COMPLETED_LATE'   ? 'row-completed-late' :
                    'row-safe';

                  return (
                    <tr key={k.id} className={`${rowCls} border-b border-gray-50 hover:bg-gray-50 cursor-pointer`}
                        onClick={() => openEdit(k)}>
                      <td className="px-3 py-3 text-gray-400">{(page-1)*PAGE_SIZE+idx+1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-navy flex items-center justify-center text-white text-[9px] font-bold">
                            {py?.initials || '??'}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{py?.nama?.split(' ')[0] || k.penyuluhId}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[160px]"><p className="truncate font-medium text-gray-600" title={jl?.nama}>{jl?.nama || k.jenisLayananId}</p></td>
                      <td className="px-3 py-3 font-semibold text-navy max-w-[150px]"><p className="truncate">{k.namaWP}</p></td>
                      <td className="px-3 py-3 font-mono text-gray-500">{k.npwp}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {(() => {
                          const displayJT = getDisplayJT(k, holidays);
                          return (
                            <div title={displayJT.tooltip ?? ''}>
                              <div className="text-sm font-medium">
                                {displayJT.jatuhTempo
                                  ? fmtDate(displayJT.jatuhTempo)
                                  : '—'}
                              </div>
                              {displayJT.isMulti && (
                                <div className="text-[10px] text-gray-400">ⓘ hover detail</div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-bold ${code==='OVERDUE'?'text-danger':code==='WARNING'?'text-gold':'text-teal'}`}>
                          {k.slaStatus.sisaHari}
                        </span>
                      </td>
                      <td className="px-3 py-3"><SLABadge code={code} label={k.slaStatus.label} size="sm" /></td>
                      <td className="px-3 py-3"><TahapBadge tahap={k.tahapSaatIni} /></td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {['penyuluh', 'pelaksana'].includes(role) && (
                            <button onClick={() => openEdit(k)} className="bg-navy text-white px-2 py-1 rounded text-[10px] hover:bg-navy-light">Update</button>
                          )}
                          <button onClick={() => navigate(`/kasus/${k.id}`)} className="border border-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] hover:bg-gray-50">Detail</button>
                          {role === 'pelaksana' && (
                            <button onClick={() => {
                              const jl = slaConfig.jenisLayanan.find(j => j.id === k.jenisLayananId);
                              setConfirmKasus({ ...k, jenisLayanan: jl?.nama || k.jenisLayananId });
                            }} className="bg-red-50 text-danger px-2 py-1 rounded text-[10px] hover:bg-red-100">Hapus</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Halaman {page} dari {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={14}/></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={14}/></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} title={panelMode === 'create' ? 'Tambah Kasus' : 'Update Kasus'}>
        <CaseForm initialData={selectedCase} onSubmit={handleSubmit} onCancel={() => setPanelOpen(false)}
                  isSubmitting={createMutation.isPending || updateMutation.isPending} currentSLAStatus={selectedCase?.slaStatus} />
      </SidePanel>

      {/* Login Alert Modal (Admin) */}
      <LoginAlertModal allCases={cases} isLoading={isLoading} />

      <ConfirmDialog
        isOpen={!!confirmKasus}
        title="Hapus Kasus"
        kasusData={confirmKasus}
        onConfirm={handleDelete}
        onCancel={() => setConfirmKasus(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
