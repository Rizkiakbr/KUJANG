import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Upload, Trash2, FileText, ExternalLink } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import Timeline from '../components/ui/Timeline';
import { SLABadge, TahapBadge } from '../components/ui/Badge';
import SidePanel from '../components/ui/SidePanel';
import CaseForm from '../components/forms/CaseForm';
import { useGetCaseById, useUpdateCase, useHolidays } from '../hooks/useCases';
import { useSLAStatus } from '../hooks/useSLAStatus';
import { calcMultiJatuhTempo, getStatusTerkritis } from '../services/slaService';
import { uploadDokumen, getDokumenKasus, deleteDokumen } from '../services/documentService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import slaConfig from '../config/slaConfig.json';

/* ── Konfigurasi tahap upload PDF ── */
const TAHAP_UPLOAD = [
  { key: 'produk-hukum', label: 'Produk Hukum', syarat: 'tanggalProdukHukum',
    roles: ['penyuluh', 'pelaksana'] },
  { key: 'skpkpp',       label: 'SKPKPP',        syarat: 'tanggalSKPKPP',
    roles: ['penyuluh', 'pelaksana'] },
  { key: 'spmkp',        label: 'SPMKP',          syarat: 'tanggalSPMKP',
    roles: ['pelaksana'] },
];

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

/**
 * Badge warna per status JT
 */
function JTStatusBadge({ status }) {
  if (!status) return null;
  const map = {
    OVERDUE:          'bg-red-100 text-red-700 border-red-200',
    WARNING:          'bg-yellow-100 text-yellow-700 border-yellow-200',
    SAFE:             'bg-green-100 text-green-700 border-green-200',
    COMPLETED_ONTIME: 'bg-green-50 text-green-600 border-green-200',
    COMPLETED_LATE:   'bg-orange-100 text-orange-700 border-orange-200',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status.code] || 'bg-gray-100 text-gray-500'}`}>
      {status.label}
    </span>
  );
}

export default function DetailKasusPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);

  const { userData } = useAuthStore();
  const userRole = userData?.role;
  const addToast = useToastStore(s => s.addToast);

  const { data: rawCase, isLoading } = useGetCaseById(id);
  const casesWithSLA = useSLAStatus(rawCase ? [rawCase] : []);
  const kasus = casesWithSLA[0];

  const { data: holidays = [] } = useHolidays(new Date().getFullYear());

  // Dokumen per tahap dari Firebase Storage
  const [dokumen, setDokumen] = useState({});
  const [uploadingTahap, setUploadingTahap] = useState(null);

  useEffect(() => {
    if (id) {
      getDokumenKasus(id)
        .then(setDokumen)
        .catch(() => setDokumen({}));
    }
  }, [id]);

  const updateMutation = useUpdateCase();

  const handleUpdate = async (data) => {
    await updateMutation.mutateAsync({ id, data });
    setPanelOpen(false);
  };

  const handleUpload = async (file, tahap) => {
    if (!file) return;
    setUploadingTahap(tahap);
    try {
      await uploadDokumen(file, id, tahap, userData);
      const updated = await getDokumenKasus(id);
      setDokumen(updated);
      addToast({ type: 'success', title: 'Upload Berhasil', message: `PDF ${tahap} berhasil diupload` });
    } catch (err) {
      addToast({ type: 'danger', title: 'Upload Gagal', message: err.message });
    } finally {
      setUploadingTahap(null);
    }
  };

  const handleDeleteDokumen = async (fullPath) => {
    if (!window.confirm('Yakin hapus dokumen ini?')) return;
    try {
      await deleteDokumen(fullPath, userData);
      const updated = await getDokumenKasus(id);
      setDokumen(updated);
      addToast({ type: 'info', title: 'Dokumen Dihapus', message: 'PDF berhasil dihapus' });
    } catch (err) {
      addToast({ type: 'danger', title: 'Gagal Hapus', message: err.message });
    }
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

  // Multi JT — hanya untuk jenis layanan yang memiliki multiJatuhTempo
  const multiJT = jl?.multiJatuhTempo
    ? calcMultiJatuhTempo(kasus, kasus.jenisLayananId, holidays)
    : null;

  // Warna baris per status JT
  const jtRowColor = (code) => {
    if (!code) return 'bg-gray-50 border-gray-200';
    return {
      OVERDUE:          'bg-red-50 border-red-200',
      WARNING:          'bg-yellow-50 border-yellow-200',
      SAFE:             'bg-green-50 border-green-200',
      COMPLETED_ONTIME: 'bg-green-50 border-green-200',
      COMPLETED_LATE:   'bg-orange-50 border-orange-200',
    }[code] || 'bg-gray-50 border-gray-200';
  };

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

            {/* Jatuh tempo — hanya tampil JT utama (SKB atau JT terkritis) */}
            {!jl?.multiJatuhTempo && (
              <div className="flex-shrink-0 bg-gray-50 rounded-xl px-5 py-4 text-center border border-gray-100">
                <p className="text-[10px] font-bold uppercase text-gray-400">Jatuh Tempo</p>
                <p className="font-bold text-navy text-sm mt-1">{fmtDate(kasus.jatuhTempo)}</p>
                <p className={`text-xs font-semibold mt-1
                  ${kasus.slaStatus.code === 'OVERDUE' ? 'text-danger' : kasus.slaStatus.code === 'WARNING' ? 'text-gold' : 'text-teal'}`}>
                  {kasus.slaStatus.label}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Section Multi JT — hanya untuk No.1-4 ── */}
        {jl?.multiJatuhTempo && multiJT && (
          <div className="card p-5 mb-5">
            <h2 className="font-bold text-navy text-sm mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-gold rounded-full" />
              ⏱ Jatuh Tempo per Tahap
            </h2>
            <div className="flex flex-col gap-3">
              {multiJT.map((jt, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border ${jtRowColor(jt.status?.code)}`}
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      {i + 1}. {jt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Dihitung dari: <span className="font-medium">{jt.labelMulai}</span>
                    </p>
                    {!kasus[jt.mulaiDari] && (
                      <p className="text-xs text-gray-400 italic mt-0.5">
                        ⏳ Menunggu {jt.labelMulai} diisi
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {jt.jatuhTempo ? (
                      <>
                        <p className="font-bold text-sm text-gray-800">
                          {format(new Date(jt.jatuhTempo), 'dd MMM yyyy', { locale: idLocale })}
                        </p>
                        <div className="mt-1">
                          <JTStatusBadge status={jt.status} />
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Belum dapat dihitung</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* ── Upload PDF per Tahap ── */}
        {TAHAP_UPLOAD
          .filter(t => kasus[t.syarat] && t.roles.includes(userRole))
          .map(tahap => (
            <div key={tahap.key} className="card p-5 mb-4">
              <h3 className="font-semibold text-sm text-navy mb-3 flex items-center gap-2">
                <FileText size={14} />
                Dokumen PDF — {tahap.label}
              </h3>

              {/* List dokumen yang sudah ada */}
              {(dokumen[tahap.key] || []).map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg mb-2 border border-gray-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={13} className="text-red-500 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate">{doc.filename}</span>
                  </div>
                  <div className="flex gap-3 flex-shrink-0 ml-3">
                    <a
                      href={doc.downloadURL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Lihat
                    </a>
                    {userRole === 'pelaksana' && (
                      <button
                        onClick={() => handleDeleteDokumen(doc.fullPath)}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={11} /> Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Upload zone */}
              <label className={`flex flex-col items-center justify-center border-2 border-dashed
                rounded-lg p-5 cursor-pointer transition-colors
                ${uploadingTahap === tahap.key
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                {uploadingTahap === tahap.key ? (
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-2" />
                ) : (
                  <Upload size={20} className="text-gray-400 mb-1" />
                )}
                <span className="text-sm text-gray-600">
                  {uploadingTahap === tahap.key ? 'Mengupload...' : `Upload PDF dokumen ${tahap.label}`}
                </span>
                <span className="text-xs text-gray-400 mt-1">Maks. 10MB · PDF saja</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploadingTahap !== null}
                  onChange={e => handleUpload(e.target.files[0], tahap.key)}
                />
              </label>
            </div>
          ))
        }

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
