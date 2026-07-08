import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { parseXlsx, validateRows } from '../../services/uploadService';

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

/**
 * UploadForm — drop zone + preview + validasi
 * @param {{ onImport: (rows) => void, isImporting: boolean }} props
 */
export default function UploadForm({ onImport, isImporting }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver]   = useState(false);
  const [file, setFile]           = useState(null);
  const [parsing, setParsing]     = useState(false);
  const [validRows, setValidRows] = useState([]);
  const [errors, setErrors]       = useState([]);
  const [parseError, setParseErr] = useState('');

  const handleFile = async (f) => {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(xlsx|csv)$/i)) {
      setParseErr('Format file tidak didukung. Gunakan .xlsx atau .csv');
      return;
    }
    setFile(f);
    setParseErr('');
    setParsing(true);

    try {
      const { rows, parseError: pe } = await parseXlsx(f);
      if (pe) { setParseErr(pe); return; }

      const { valid, errors: rowErrors } = validateRows(rows);
      setValidRows(valid);
      setErrors(rowErrors);
    } catch (err) {
      setParseErr(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleReset = () => {
    setFile(null);
    setValidRows([]);
    setErrors([]);
    setParseErr('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const canImport = validRows.length > 0 && errors.length === 0 && !isImporting;

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-card p-12 text-center cursor-pointer transition-all duration-200
            ${dragOver ? 'border-navy bg-kblue-light' : 'border-gray-300 hover:border-navy hover:bg-gray-50'}`}
        >
          <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="font-semibold text-gray-600 mb-1">Seret file ke sini atau klik untuk memilih</p>
          <p className="text-sm text-gray-400">Mendukung format .xlsx dan .csv</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        /* File info */
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <FileSpreadsheet size={18} className="text-navy" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={handleReset} className="text-gray-400 hover:text-danger">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Parse loading */}
      {parsing && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          Memproses file...
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{parseError}</p>
        </div>
      )}

      {/* Summary */}
      {(validRows.length > 0 || errors.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-teal">{validRows.length}</p>
            <p className="text-xs text-gray-600">Baris valid</p>
          </div>
          <div className={`border rounded-lg px-4 py-3 text-center
            ${errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-2xl font-extrabold ${errors.length > 0 ? 'text-danger' : 'text-gray-400'}`}>
              {errors.length}
            </p>
            <p className="text-xs text-gray-600">Baris error</p>
          </div>
        </div>
      )}

      {/* Error detail table */}
      {errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-700 uppercase tracking-wide">
            Detail Error
          </div>
          <div className="divide-y divide-red-100 max-h-48 overflow-y-auto">
            {errors.map((e, i) => (
              <div key={i} className="px-4 py-2.5">
                <p className="text-xs font-semibold text-red-700">Baris {e.rowIndex}</p>
                <ul className="mt-1 space-y-0.5">
                  {e.messages.map((m, mi) => (
                    <li key={mi} className="text-[11px] text-red-600">• {m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview table */}
      {validRows.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
            <CheckCircle2 size={12} className="text-teal" />
            Preview Data ({validRows.length} baris siap impor)
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left font-semibold">Nama WP</th>
                  <th className="px-3 py-2 text-left font-semibold">NPWP</th>
                  <th className="px-3 py-2 text-left font-semibold">Jenis</th>
                  <th className="px-3 py-2 text-left font-semibold">Penyuluh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validRows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{r.namaWP}</td>
                    <td className="px-3 py-2 font-mono">{r.npwp}</td>
                    <td className="px-3 py-2">{r.jenisLayananId}</td>
                    <td className="px-3 py-2">{r.penyuluhId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {validRows.length > 0 && (
        <button
          onClick={() => onImport(validRows)}
          disabled={!canImport}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          {isImporting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Mengimpor {validRows.length} kasus...
            </>
          ) : (
            <>
              <Upload size={15} />
              Import {validRows.length} Kasus
            </>
          )}
        </button>
      )}
    </div>
  );
}
