import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import Navbar from '../components/layout/Navbar';
import UploadForm from '../components/forms/UploadForm';
import { useAuthStore } from '../store/authStore';
import { bulkCreateCases } from '../services/caseService';
import { writeAuditLog } from '../services/auditService';

export default function UploadPage() {
  const navigate = useNavigate();
  const { userData } = useAuthStore();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async (rows) => {
    setImporting(true);
    try {
      const res = await bulkCreateCases(rows, userData);
      await writeAuditLog({
        userUid: userData.uid, userName: userData.nama, userRole: userData.role,
        action: 'UPLOAD_DATA', targetId: null,
        detail: `Import ${res.success} kasus berhasil, ${res.errors.length} error`,
      });
      setResult(res);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <Topbar />
      <Navbar />

      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/monitoring')} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div>
            <h1 className="font-extrabold text-navy text-lg">Upload Data Kasus</h1>
            <p className="text-xs text-gray-500">Import data kasus massal dari file Excel (.xlsx) atau CSV</p>
          </div>
        </div>

        {/* Petunjuk format */}
        <div className="card p-5 mb-5">
          <h2 className="font-bold text-navy text-sm mb-3">Format Kolom yang Diperlukan</h2>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wide">Nama Kolom di File</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wide">Keterangan</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wide">Wajib?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Jenis Layanan',        'Harus sesuai nama persis dari konfigurasi SLA', '✅'],
                  ['NPWP',                 '16 digit angka',                                '✅'],
                  ['Nama WP',              'Nama lengkap wajib pajak',                      '✅'],
                  ['Nomor Kasus Coretax',  'Nomor kasus di sistem Coretax',                 '✅'],
                  ['No LPAD/SKPLB/PLB',    'Nomor dokumen permohonan',                      '—'],
                  ['Tanggal LPAD',         'Format: YYYY-MM-DD atau DD/MM/YYYY',            '✅'],
                  ['Penyuluh',             'Harus sesuai nama persis penyuluh',             '✅'],
                  ['Hasil Penelitian',     '"Diterima" atau "Ditolak"',                     '—'],
                ].map(([col, ket, wajib]) => (
                  <tr key={col}>
                    <td className="px-3 py-2 font-mono font-semibold text-navy">{col}</td>
                    <td className="px-3 py-2 text-gray-600">{ket}</td>
                    <td className="px-3 py-2">{wajib}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hasil import */}
        {result && (
          <div className={`card p-5 mb-5 border-l-4 ${result.errors.length === 0 ? 'border-l-teal' : 'border-l-gold'}`}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className={result.errors.length === 0 ? 'text-teal' : 'text-gold'} />
              <h3 className="font-bold text-navy text-sm">Hasil Import</h3>
            </div>
            <p className="text-sm text-gray-700">
              ✅ <strong>{result.success}</strong> kasus berhasil diimpor
              {result.errors.length > 0 && (
                <> · ❌ <strong className="text-danger">{result.errors.length}</strong> kasus gagal</>
              )}
            </p>
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">• {e.error}</p>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/monitoring')} className="mt-4 btn-primary text-xs">
              Lihat Semua Kasus →
            </button>
          </div>
        )}

        {/* Upload Form */}
        <div className="card p-6">
          <h2 className="font-bold text-navy text-sm mb-5">Upload File</h2>
          <UploadForm onImport={handleImport} isImporting={importing} />
        </div>
      </div>
    </div>
  );
}
