import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import { SLABadge, TahapBadge } from '../components/ui/Badge';
import SidePanel from '../components/ui/SidePanel';
import CaseForm from '../components/forms/CaseForm';
import UploadPenyuluhModal from '../components/ui/UploadPenyuluhModal';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useGetCases, useCreateCase, useUpdateCase } from '../hooks/useCases';
import { useSLAStatus } from '../hooks/useSLAStatus';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import slaConfig from '../config/slaConfig.json';

const PAGE_SIZE = 12;

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMM yyyy', { locale: idLocale });
}

function SisaHariBar({ sisaHari, code }) {
  const color = { OVERDUE: '#E24B4A', WARNING: '#EF9F27', SAFE: '#1D9E75' }[code];
  const pct   = code === 'OVERDUE' ? 100 : Math.min(100, Math.max(0, (1 - sisaHari / 30) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold text-xs ${code === 'OVERDUE' ? 'text-danger' : code === 'WARNING' ? 'text-gold' : 'text-teal'}`}>
        {code === 'OVERDUE' ? `-${Math.abs(sisaHari)}` : sisaHari}
      </span>
      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
    </div>
  );
}

export default function TugasSayaPage() {
  const navigate  = useNavigate();
  const { userData } = useAuthStore();

  const [panelOpen, setPanelOpen]     = useState(false);
  const [panelMode, setPanelMode]     = useState('create');
  const [selectedCase, setSelected]   = useState(null);
  const [search, setSearch]           = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]               = useState(1);
  const [showUpload, setShowUpload]   = useState(false);

  const addToast     = useToastStore(s => s.addToast);
  const queryClient  = useQueryClient();

  const penyuluhId = userData?.penyuluhId;
  const { data: rawCases = [], isLoading } = useGetCases(penyuluhId ? { penyuluhId } : {});
  const cases = useSLAStatus(rawCases);

  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase();

  // Greeting stats
  const overdueCount = cases.filter(c => c.slaStatus?.code === 'OVERDUE').length;
  const warningCount = cases.filter(c => c.slaStatus?.code === 'WARNING').length;
  const safeCount    = cases.filter(c => c.slaStatus?.code === 'SAFE').length;

  // Filtered
  const filtered = useMemo(() => {
    let result = cases;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.namaWP?.toLowerCase().includes(q) || c.npwp?.includes(q));
    }
    if (filterJenis) result = result.filter(c => c.jenisLayananId === filterJenis);
    if (filterStatus) result = result.filter(c => c.slaStatus?.code === filterStatus);
    return result;
  }, [cases, search, filterJenis, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setPanelMode('create'); setSelected(null); setPanelOpen(true); };
  const openEdit   = (kasus) => { setPanelMode('edit'); setSelected(kasus); setPanelOpen(true); };

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

  const py = slaConfig.penyuluh.find(p => p.id === penyuluhId);

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="max-w-7xl mx-auto px-5 py-5 space-y-4">

        {/* Greeting Strip */}
        <div className="card px-5 py-4 flex items-center gap-4 flex-wrap">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
               style={{ background: 'linear-gradient(135deg, #0D2E5C, #185FA5)' }}>
            {py?.initials || userData?.nama?.slice(0, 2).toUpperCase() || 'KJ'}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-navy text-sm">Halo, {userData?.nama?.split(' ')[0]}! 👋</p>
            <p className="text-xs text-gray-500">
              Anda memiliki <span className="font-semibold text-navy">{cases.length}</span> kasus aktif
              {overdueCount > 0 && <> — <span className="text-danger font-semibold">{overdueCount} lewat tempo</span></>}
              {warningCount > 0 && <>, <span className="text-gold font-semibold">{warningCount} warning</span></>}
            </p>
          </div>

          {/* Mini stat chips */}
          <div className="flex gap-2 flex-wrap">
            <span className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
              🚨 {overdueCount}
            </span>
            <span className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
              ⚠️ {warningCount}
            </span>
            <span className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
              ✅ {safeCount}
            </span>
          </div>

          {/* Tambah kasus + Upload Excel */}
          <div className="flex items-center gap-2">
            <button
              id="btn-upload-excel"
              onClick={() => setShowUpload(true)}
              className="btn-outline flex items-center gap-1.5 text-xs"
            >
              <Upload size={13} /> Upload Excel
            </button>
            <button id="btn-tambah-kasus" onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={13} /> Tambah Kasus
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card px-5 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama WP atau NPWP..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-9 text-xs"
              />
            </div>

            {/* Jenis Layanan */}
            <select
              value={filterJenis}
              onChange={e => { setFilterJenis(e.target.value); setPage(1); }}
              className="form-input text-xs w-auto min-w-48"
            >
              <option value="">Semua Jenis Layanan</option>
              {slaConfig.jenisLayanan.map(j => (
                <option key={j.id} value={j.id}>{j.nama}</option>
              ))}
            </select>

            {/* Status filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { val: '',                 label: 'Semua',        cls: 'bg-gray-100 text-gray-600' },
                { val: 'OVERDUE',          label: '🔴 Kritis',    cls: 'bg-red-50 text-red-700 border border-red-200' },
                { val: 'WARNING',          label: '🟡 Warning',   cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
                { val: 'SAFE',             label: '🟢 Aman',      cls: 'bg-green-50 text-green-700 border border-green-200' },
                { val: 'COMPLETED_ONTIME', label: '✓ Tepat Waktu', cls: 'bg-green-100 text-green-900 border border-green-400' },
                { val: 'COMPLETED_LATE',   label: '⚠ Terlambat',  cls: 'bg-orange-50 text-orange-700 border border-orange-300' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => { setFilterStatus(opt.val); setPage(1); }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap
                    ${filterStatus === opt.val ? opt.cls + ' ring-1 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
              Menampilkan {paged.length} dari {filtered.length} kasus
            </span>
          </div>
        </div>

        {/* Tabel */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['No', 'Jenis Layanan', 'Nama WP', 'NPWP', 'Tgl LPAD', 'Jatuh Tempo', 'Sisa Hari', 'Status SLA', 'Hasil', 'Tahap', 'Aksi']
                    .map(h => (
                      <th key={h} className="px-3 py-3 text-left font-bold text-[10.5px] uppercase tracking-wider text-gray-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <div className="w-6 h-6 border-2 border-navy border-t-teal rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      Tidak ada kasus yang sesuai filter
                    </td>
                  </tr>
                ) : (
                  paged.map((kasus, idx) => {
                    const jl   = slaConfig.jenisLayanan.find(j => j.id === kasus.jenisLayananId);
                    const code = kasus.slaStatus?.code;
                    const rowCls =
                      code === 'OVERDUE'          ? 'row-overdue' :
                      code === 'WARNING'          ? 'row-warning' :
                      code === 'COMPLETED_ONTIME' ? 'row-completed-ontime' :
                      code === 'COMPLETED_LATE'   ? 'row-completed-late' :
                      'row-safe';

                    return (
                      <tr
                        key={kasus.id}
                        onClick={() => openEdit(kasus)}
                        className={`${rowCls} hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50`}
                      >
                        <td className="px-3 py-3 text-gray-400">{(page-1)*PAGE_SIZE + idx + 1}</td>
                        <td className="px-3 py-3 max-w-[180px]">
                          <p className="truncate font-medium text-gray-700" title={jl?.nama}>{jl?.nama || kasus.jenisLayananId}</p>
                        </td>
                        <td className="px-3 py-3 font-semibold text-navy max-w-[160px]">
                          <p className="truncate">{kasus.namaWP}</p>
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-500">{kasus.npwp}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-600">{fmtDate(kasus.tanggalLPAD)}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-700">{fmtDate(kasus.jatuhTempo)}</td>
                        <td className="px-3 py-3">
                          <SisaHariBar sisaHari={kasus.slaStatus.sisaHari} code={code} />
                        </td>
                        <td className="px-3 py-3">
                          <SLABadge code={code} label={kasus.slaStatus.label} size="sm" />
                        </td>
                        <td className="px-3 py-3">
                          {kasus.hasilPenelitian ? (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                              ${kasus.hasilPenelitian === 'Diterima' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {kasus.hasilPenelitian}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3"><TahapBadge tahap={kasus.tahapSaatIni} /></td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEdit(kasus)}
                                    className="bg-navy text-white px-2.5 py-1 rounded-md text-[10px] hover:bg-navy-light transition-colors">
                              Update
                            </button>
                            <button onClick={() => navigate(`/kasus/${kasus.id}`)}
                                    className="border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md text-[10px] hover:bg-gray-50">
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                        className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i+1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <>
                      {i > 0 && arr[i-1] !== p-1 && <span key={`dot-${p}`} className="px-1 text-gray-300">…</span>}
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors
                          ${page === p ? 'bg-navy text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        {p}
                      </button>
                    </>
                  ))
                }
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                        className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <SidePanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={panelMode === 'create' ? 'Tambah Kasus Baru' : 'Update Kasus'}
      >
        <CaseForm
          initialData={selectedCase}
          onSubmit={handleSubmit}
          onCancel={() => setPanelOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          currentSLAStatus={selectedCase?.slaStatus}
        />
      </SidePanel>

      {/* Upload Excel Modal */}
      {showUpload && (
        <UploadPenyuluhModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            queryClient.invalidateQueries({ queryKey: ['cases'] });
          }}
        />
      )}
    </div>
  );
}
