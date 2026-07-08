import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, BarChart2 } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import HeroGreeting from '../components/layout/HeroGreeting';
import StatCard from '../components/ui/StatCard';
import AlertBanner from '../components/ui/AlertBanner';
import Timeline from '../components/ui/Timeline';
import { SLABadge, TahapBadge } from '../components/ui/Badge';
import SidePanel from '../components/ui/SidePanel';
import CaseForm from '../components/forms/CaseForm';
import LoginAlertModal from '../components/ui/LoginAlertModal';
import { useAuthStore } from '../store/authStore';
import { useNotifStore } from '../store/notifStore';
import { useToastStore } from '../store/toastStore';
import { useGetCases, useCreateCase, useUpdateCase } from '../hooks/useCases';
import { useSLAStatus } from '../hooks/useSLAStatus';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import slaConfig from '../config/slaConfig.json';

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMM yyyy', { locale: idLocale });
}

function ShortcutCard({ emoji, title, subtitle, onClick, id }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="card p-5 text-left hover:border-navy-light hover:shadow-card-hover hover:-translate-y-0.5
                 transition-all duration-200 border border-transparent w-full"
    >
      <div className="text-2xl mb-2">{emoji}</div>
      <p className="font-bold text-navy text-sm">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </button>
  );
}

export default function DashboardPenyuluhPage() {
  const navigate = useNavigate();
  const { userData } = useAuthStore();
  const setNotifications = useNotifStore(state => state.setNotifications);

  const [panelOpen, setPanelOpen]   = useState(false);
  const [panelMode, setPanelMode]   = useState('create'); // 'create' | 'edit'
  const [selectedCase, setSelected] = useState(null);

  const penyuluhId = userData?.penyuluhId;
  const { data: rawCases = [], isLoading } = useGetCases(penyuluhId ? { penyuluhId } : {});
  const cases = useSLAStatus(rawCases);

  const addToast = useToastStore((s) => s.addToast);

  // Update notif store
  useEffect(() => {
    const overdue = cases.filter(c => c.slaStatus?.code === 'OVERDUE');
    const warning = cases.filter(c => c.slaStatus?.code === 'WARNING');
    setNotifications(overdue, warning);
  }, [cases, setNotifications]);

  const overdueList  = cases.filter(c => c.slaStatus?.code === 'OVERDUE');
  const warningList  = cases.filter(c => c.slaStatus?.code === 'WARNING');
  const safeList     = cases.filter(c => c.slaStatus?.code === 'SAFE');
  const activeCases  = cases.filter(c => c.tahapSaatIni !== 'SPMKP');

  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase();

  const openCreate = () => { setPanelMode('create'); setSelected(null); setPanelOpen(true); };
  const openEdit   = (kasus) => { setPanelMode('edit'); setSelected(kasus); setPanelOpen(true); };

  const handleSubmit = async (data) => {
    try {
      if (panelMode === 'create') {
        await createMutation.mutateAsync(data);
        addToast({ type: 'success', title: 'Kasus Berhasil Ditambahkan', message: `Kasus ${data.namaWP} berhasil disimpan` });
      } else {
        await updateMutation.mutateAsync({ id: selectedCase.id, data });
        addToast({ type: 'success', title: 'Kasus Berhasil Diperbarui', message: `Kasus ${data.namaWP} berhasil diperbarui` });
      }
      setPanelOpen(false);
    } catch (err) {
      addToast({ type: 'danger', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan saat menyimpan kasus' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      {/* Hero */}
      <HeroGreeting
        overdueCount={overdueList.length}
        warningCount={warningList.length}
        totalCases={cases.length}
      />

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-5">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Kasus Saya"          value={cases.length}         icon="📋" colorCode="navy" />
          <StatCard title="Lewat Jatuh Tempo"   value={overdueList.length}   icon="🚨" colorCode="danger"
                    subtitle="Segera tindak lanjuti" />
          <StatCard title="Perlu Perhatian"     value={warningList.length}   icon="⚠️"  colorCode="gold"
                    subtitle={warningList[0] ? `H-${warningList[0].slaStatus.sisaHari} — segera` : 'Dalam batas warning'} />
          <StatCard title="Aman"                value={safeList.length}      icon="✅" colorCode="safe"
                    subtitle="Dalam batas waktu" />
        </div>

        {/* Alert Banner */}
        {overdueList.length > 0 && <AlertBanner cases={overdueList} />}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Kolom kiri: Progres Kasus Aktif */}
          <div className="lg:col-span-2 card p-5">
            <h2 className="font-bold text-navy text-sm mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-teal rounded-full inline-block" />
              Progres Kasus Aktif
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : activeCases.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Tidak ada kasus aktif</div>
            ) : (
              <div className="space-y-5">
                {activeCases.slice(0, 3).map(kasus => {
                  const jl = slaConfig.jenisLayanan.find(j => j.id === kasus.jenisLayananId);
                  return (
                    <div key={kasus.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-navy text-sm truncate">{kasus.namaWP}</p>
                          <p className="text-[11px] text-gray-400 truncate">{jl?.nama || kasus.jenisLayananId}</p>
                        </div>
                        <SLABadge code={kasus.slaStatus.code} label={kasus.slaStatus.label} size="sm" />
                      </div>
                      <Timeline kasus={kasus} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kolom kanan: Semua Kasus */}
          <div className="lg:col-span-3 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy text-sm flex items-center gap-2">
                <span className="text-yellow-400">⚡</span> Semua Kasus Saya
              </h2>
              <button
                onClick={() => navigate('/tugas-saya')}
                className="text-xs font-semibold text-navy-light hover:underline"
              >
                Buka Tugas Saya →
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                Belum ada kasus. <button onClick={openCreate} className="text-navy-light hover:underline">Tambah kasus baru</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {cases.map(kasus => {
                  const jl = slaConfig.jenisLayanan.find(j => j.id === kasus.jenisLayananId);
                  const statusIcon = { OVERDUE: '🚨', WARNING: '⚠️', SAFE: '✅' };
                  const statusBg   = { OVERDUE: 'bg-red-100', WARNING: 'bg-yellow-100', SAFE: 'bg-green-100' };

                  return (
                    <div
                      key={kasus.id}
                      onClick={() => openEdit(kasus)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                                 hover:bg-[#FAFBFF] transition-colors border border-transparent hover:border-gray-100"
                    >
                      {/* Status icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                                       ${statusBg[kasus.slaStatus.code]}`}>
                        <span className="text-sm">{statusIcon[kasus.slaStatus.code]}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-navy text-xs truncate">{kasus.namaWP}</p>
                        <p className="text-[10px] text-gray-400 truncate">{jl?.nama || kasus.jenisLayananId}</p>
                        <p className="font-mono text-[9px] text-gray-300">{kasus.npwp}</p>
                      </div>

                      {/* Right side */}
                      <div className="text-right flex-shrink-0">
                        <SLABadge code={kasus.slaStatus.code} label={kasus.slaStatus.label} size="sm" />
                        <p className="text-[10px] text-gray-400 mt-1">{fmtDate(kasus.jatuhTempo)}</p>
                      </div>

                      {/* Tombol */}
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(kasus)}
                          className="text-[10px] bg-navy text-white px-2.5 py-1 rounded-md hover:bg-navy-light transition-colors"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => navigate(`/kasus/${kasus.id}`)}
                          className="text-[10px] border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md hover:bg-gray-50"
                        >
                          Detail
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Shortcut Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ShortcutCard
            id="shortcut-tugas"
            emoji="📝"
            title="Tugas Saya"
            subtitle="Lihat & update semua kasus"
            onClick={() => navigate('/tugas-saya')}
          />
          <ShortcutCard
            id="shortcut-tambah"
            emoji="➕"
            title="Tambah Kasus Baru"
            subtitle="Input permohonan baru"
            onClick={openCreate}
          />
          <ShortcutCard
            id="shortcut-laporan"
            emoji="📊"
            title="Laporan Saya"
            subtitle="Rekap kinerja bulan ini"
            onClick={() => navigate('/laporan')}
          />
        </div>
      </div>

      {/* Login Alert Modal */}
      <LoginAlertModal cases={cases} isLoading={isLoading} />

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
    </div>
  );
}
