import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — modal konfirmasi hapus
 * Jika kasusData diberikan, mode "ketik HAPUS" aktif untuk extra safety.
 * @param {{ isOpen, title, message, kasusData?, onConfirm, onCancel, isLoading? }} props
 */
export default function ConfirmDialog({ isOpen, title, message, kasusData, onConfirm, onCancel, isLoading }) {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const requiresTyping = !!kasusData;
  const isConfirmed = requiresTyping ? inputText === 'HAPUS' : true;

  const handleConfirm = () => {
    if (!isConfirmed) return;
    setInputText('');
    onConfirm();
  };

  const handleCancel = () => {
    setInputText('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-navy-dark/60 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-card shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden">

        {/* Header */}
        <div className="bg-red-700 text-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗑️</span>
            <h3 className="font-bold text-lg">{title || 'Hapus Kasus?'}</h3>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Detail kasus jika ada */}
          {kasusData && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="font-bold text-navy text-base">{kasusData.namaWP}</p>
              <p className="text-sm text-gray-500 mt-1">{kasusData.jenisLayanan}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">{kasusData.npwp}</p>
            </div>
          )}

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium">
              ⚠️ {message || 'Tindakan ini tidak dapat dibatalkan. Data akan dihapus permanen dan tercatat di Audit Log.'}
            </p>
          </div>

          {/* Input konfirmasi ketik HAPUS */}
          {requiresTyping && (
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Ketik <strong className="text-red-600">HAPUS</strong> untuk konfirmasi:
              </label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value.toUpperCase())}
                placeholder="Ketik HAPUS di sini..."
                className="w-full border-2 border-gray-200 rounded-lg p-3 text-center font-bold
                           tracking-widest focus:border-red-400 outline-none
                           text-red-600 placeholder-gray-300 transition-colors"
                autoFocus
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              id="btn-confirm-cancel"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              id="btn-confirm-ok"
              onClick={handleConfirm}
              disabled={isLoading || !isConfirmed}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors
                ${isConfirmed && !isLoading
                  ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menghapus...
                </span>
              ) : '🗑️ Hapus Permanen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
