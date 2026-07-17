import { useState, useRef, useCallback } from 'react';
import { Upload, X, Download, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import { parseXlsx, validateRowsForPenyuluh } from '../../services/uploadService';
import { bulkCreateCasesForPenyuluh } from '../../services/caseService';
import { downloadTemplatePenyuluh } from '../../utils/exportUtils';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import slaConfig from '../../config/slaConfig.json';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

function fmtDate(v) {
  if (!v) return '-';
  try { return format(new Date(v), 'd MMM yyyy', { locale: idLocale }); }
  catch { return String(v); }
}

/**
 * Modal upload Excel untuk penyuluh di halaman Tugas Saya.
 * @param {{ onClose: Function, onSuccess: Function }} props
 */
export default function UploadPenyuluhModal({ onClose, onSuccess }) {
  const { userData } = useAuthStore();
  const addToast = useToastStore(s => s.addToast);

  const [step, setStep]         = useState('idle');   // idle | preview | importing | done
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [validRows, setValidRows]   = useState([]);
  const [errorRows, setErrorRows]   = useState([]);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const penyuluhId = userData?.penyuluhId;

  /* ── File processing ── */
  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|csv)$/i)) {
      addToast({ type: 'warning', title: 'Format tidak didukung', message: 'Gunakan file .xlsx atau .csv' });
      return;
    }
    setFileName(file.name);
    setStep('parsing');
    try {
      const { rows, parseError } = await parseXlsx(file);
      if (parseError) {
        addToast({ type: 'danger', title: 'Gagal membaca file', message: parseError });
        setStep('idle');
        return;
      }
      const { valid, errors } = validateRowsForPenyuluh(rows, penyuluhId);
      setValidRows(valid);
      setErrorRows(errors);
      setStep('preview');
    } catch (err) {
      addToast({ type: 'danger', title: 'Error', message: err.message });
      setStep('idle');
    }
  }, [penyuluhId, addToast]);

  const onFileInput = (e) => processFile(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  /* ── Import ── */
  const handleImport = async () => {
    if (!validRows.length) return;
    setStep('importing');
    try {
      const result = await bulkCreateCasesForPenyuluh(validRows, userData);
      setImportResult(result);
      setStep('done');
      if (result.success > 0) {
        addToast({
          type: 'success',
          title: 'Import Berhasil',
          message: `${result.success} kasus berhasil ditambahkan ke Tugas Saya`,
        });
        onSuccess?.();
      }
    } catch (err) {
      addToast({ type: 'danger', title: 'Gagal import', message: err.message });
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('idle');
    setFileName('');
    setValidRows([]);
    setErrorRows([]);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    /* Overlay */
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0D2E5C, #185FA5)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={20} color="white" />
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', margin: 0 }}>Upload Data Kasus Saya</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0, marginTop: '2px' }}>
                Hanya untuk kasus yang ditugaskan kepada Anda
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', opacity: 0.8 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body - scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Step: idle atau parsing */}
          {(step === 'idle' || step === 'parsing') && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#185FA5' : '#CBD5E1'}`,
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragging ? '#EFF6FF' : '#F8FAFC',
                  transition: 'all 0.2s',
                  marginBottom: '16px',
                }}
              >
                <Upload size={28} color={dragging ? '#185FA5' : '#94A3B8'} style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
                  {step === 'parsing' ? 'Memproses file...' : 'Drop file di sini atau klik untuk pilih'}
                </p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Format: .xlsx atau .csv</p>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={onFileInput} />
              </div>

              {/* Info & template */}
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', margin: '0 0 8px' }}>📋 Kolom yang harus ada di Excel:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                  {['Jenis Layanan', 'NPWP', 'Nama WP', 'Nomor Kasus Coretax', 'No LPAD/SKPLB/PLB', 'Tanggal LPAD', 'Hasil Penelitian (opsional)'].map(col => (
                    <p key={col} style={{ fontSize: '11px', color: '#1E40AF', margin: 0 }}>• {col}</p>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '8px 0 0', fontStyle: 'italic' }}>
                  ⚠ Kolom "Penyuluh" tidak perlu diisi — otomatis dari akun Anda ({userData?.nama})
                </p>
              </div>

              <button
                onClick={() => downloadTemplatePenyuluh()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1.5px solid #0D2E5C', borderRadius: '8px', backgroundColor: 'white', color: '#0D2E5C', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Download size={14} /> Unduh Template Excel
              </button>
            </>
          )}

          {/* Step: preview */}
          {step === 'preview' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0D2E5C', margin: 0 }}>{fileName}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                    <span style={{ color: '#166534', fontWeight: 600 }}>{validRows.length} baris valid</span>
                    {errorRows.length > 0 && <span style={{ color: '#991B1B', fontWeight: 600 }}> · {errorRows.length} baris error</span>}
                  </p>
                </div>
                <button onClick={reset} style={{ fontSize: '11px', color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                  Ganti file
                </button>
              </div>

              {/* Error rows */}
              {errorRows.length > 0 && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#7F1D1D', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> {errorRows.length} baris error (tidak akan diimport)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                    {errorRows.map((e, i) => (
                      <p key={i} style={{ fontSize: '10px', color: '#991B1B', margin: 0 }}>
                        Baris {e.rowIndex}: {e.messages.join(', ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview tabel */}
              {validRows.length > 0 && (
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', maxHeight: '240px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        {['#', 'Jenis Layanan', 'Nama WP', 'NPWP', 'Tgl LPAD'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((row, i) => {
                        const jl = slaConfig.jenisLayanan.find(j => j.id === row.jenisLayananId);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                            <td style={{ padding: '7px 10px', color: '#9CA3AF' }}>{i + 1}</td>
                            <td style={{ padding: '7px 10px', color: '#374151', maxWidth: '140px' }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jl?.nama || row.jenisLayananId}</span></td>
                            <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0D2E5C', maxWidth: '140px' }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.namaWP}</span></td>
                            <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#6B7280' }}>{row.npwp}</td>
                            <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: '#6B7280' }}>{fmtDate(row.tanggalLPAD)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Step: done */}
          {step === 'done' && importResult && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={48} color="#1D9E75" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#14532D', margin: '0 0 6px' }}>Import Selesai!</p>
              <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                <strong>{importResult.success}</strong> kasus berhasil ditambahkan
                {importResult.errors.length > 0 && (
                  <span style={{ color: '#991B1B' }}> · {importResult.errors.length} gagal</span>
                )}
              </p>
            </div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #BFDBFE', borderTopColor: '#185FA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>Mengimport {validRows.length} kasus...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '10px', justifyContent: 'flex-end', backgroundColor: '#F9FAFB' }}>
          {step === 'done' ? (
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', backgroundColor: '#0D2E5C', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Selesai
            </button>
          ) : (
            <>
              <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', border: '1.5px solid #D1D5DB', backgroundColor: 'white', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              {step === 'preview' && validRows.length > 0 && (
                <button
                  onClick={handleImport}
                  style={{ padding: '9px 20px', borderRadius: '8px', backgroundColor: '#1D9E75', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Import {validRows.length} Kasus →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
