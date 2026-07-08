import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import Timeline from '../components/ui/Timeline';
import { SLABadge, TahapBadge } from '../components/ui/Badge';
import SidePanel from '../components/ui/SidePanel';
import CaseForm from '../components/forms/CaseForm';
import { useGetCaseById, useUpdateCase } from '../hooks/useCases';
import { useSLAStatus } from '../hooks/useSLAStatus';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import slaConfig from '../config/slaConfig.json';

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMMM yyyy', { locale: idLocale });
}

function DocRow({ label, nomor, tanggal }) {
  if (!nomor) return null;
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">{label}</p>
        <p className="font-mono text-xs text-navy mt-0.5">{nomor}</p>
      </div>
      {tanggal && <p className="text-xs text-gray-500 flex-shrink-0 ml-4">{fmtDate(tanggal)}</p>}
    </div>
  );
}

export default function DetailKasusPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: rawCase, isLoading } = useGetCaseById(id);
  const casesWithSLA = useSLAStatus(rawCase ? [rawCase] : []);
  const kasus = casesWithSLA[0];

  const updateMutation = useUpdateCase();

  const handleUpdate = async (data) => {
    await updateMutation.mutateAsync({ id, data });
    setPanelOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F5F9]">
        <Topbar /><Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-navy border-t-teal rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!kasus) {
    return (
      <div className="min-h-screen bg-[#F3F5F9]">
        <Topbar /><Navbar />
        <div className="max-w-4xl mx-auto px-5 py-10 text-center">
          <p className="text-gray-500">Kasus tidak ditemukan.</p>
          <button onClick={() => navigate(-1)} className="mt-4 btn-outline text-sm">← Kembali</button>
        </div>
      </div>
    );
  }

  const jl = slaConfig.jenisLayanan.find(j => j.id === kasus.jenisLayananId);
  const py = slaConfig.penyuluh.find(p => p.id === kasus.penyuluhId);

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="max-w-5xl mx-auto px-5 py-5">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <button onClick={() => navigate('/dashboard')} className="hover:text-navy">Dashboard</button>
          <span>›</span>
          <button onClick={() => navigate('/tugas-saya')} className="hover:text-navy">Tugas Saya</button>
          <span>›</span>
          <span className="text-navy font-semibold">Detail Kasus — {kasus.namaWP}</span>
        </nav>

        {/* Info Header Card */}
        <div className="card p-6 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-xl font-extrabold text-navy">{kasus.namaWP}</h1>
                <SLABadge code={kasus.slaStatus.code} label={kasus.slaStatus.label} />
                <TahapBadge tahap={kasus.tahapSaatIni} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">NPWP</p>
                  <p className="font-mono text-xs text-gray-700 mt-0.5">{kasus.npwp}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Jenis Layanan</p>
                  <p className="text-xs text-gray-700 mt-0.5">{jl?.nama || kasus.jenisLayananId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Penyuluh</p>
                  <p className="text-xs text-gray-700 mt-0.5">{py?.nama || kasus.penyuluhId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">No. Kasus Coretax</p>
                  <p className="font-mono text-xs text-gray-700 mt-0.5">{kasus.nomorKasusCoretax}</p>
                </div>
              </div>
            </div>

            {/* Jatuh tempo */}
            <div className="flex-shrink-0 bg-gray-50 rounded-xl px-5 py-4 text-center border border-gray-100">
              <p className="text-[10px] font-bold uppercase text-gray-400">Jatuh Tempo</p>
              <p className="font-bold text-navy text-sm mt-1">{fmtDate(kasus.jatuhTempo)}</p>
              <p className={`text-xs font-semibold mt-1
                ${kasus.slaStatus.code === 'OVERDUE' ? 'text-danger' : kasus.slaStatus.code === 'WARNING' ? 'text-gold' : 'text-teal'}`}>
                {kasus.slaStatus.label}
              </p>
            </div>
          </div>
        </div>

        {/* Two-column: Timeline + Dokumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

          {/* Kiri: Timeline */}
          <div className="card p-5">
            <h2 className="font-bold text-navy text-sm mb-5 flex items-center gap-2">
              <span className="w-1 h-4 bg-teal rounded-full" />
              Progres Tahapan
            </h2>
            <Timeline kasus={kasus} />
          </div>

          {/* Kanan: Dokumen */}
          <div className="card p-5">
            <h2 className="font-bold text-navy text-sm mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-navy-light rounded-full" />
              Dokumen Terkait
            </h2>
            <DocRow label="No. LPAD / SKPLB / PLB" nomor={kasus.nomorLPAD} tanggal={kasus.tanggalLPAD} />
            <DocRow label="Produk Hukum" nomor={kasus.nomorProdukHukum} tanggal={kasus.tanggalProdukHukum} />
            <DocRow label="SKPKPP" nomor={kasus.nomorSKPKPP} tanggal={kasus.tanggalSKPKPP} />
            <DocRow label="SPMKP" nomor={kasus.nomorSPMKP} tanggal={kasus.tanggalSPMKP} />

            {kasus.hasilPenelitian && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase text-gray-400">Hasil Penelitian</p>
                <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full
                  ${kasus.hasilPenelitian === 'Diterima' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {kasus.hasilPenelitian}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="btn-outline flex items-center gap-2 text-sm">
            <ArrowLeft size={14} /> Kembali
          </button>
          <button onClick={() => setPanelOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Edit size={14} /> Edit Kasus
          </button>
        </div>
      </div>

      {/* Side Panel */}
      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} title="Edit Kasus">
        <CaseForm
          initialData={kasus}
          onSubmit={handleUpdate}
          onCancel={() => setPanelOpen(false)}
          isSubmitting={updateMutation.isPending}
          currentSLAStatus={kasus?.slaStatus}
        />
      </SidePanel>
    </div>
  );
}
