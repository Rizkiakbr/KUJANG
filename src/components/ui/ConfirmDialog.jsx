import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — modal konfirmasi hapus
 * @param {{ isOpen, title, message, onConfirm, onCancel, isLoading? }} props
 */
export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-navy-dark/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-card shadow-2xl w-full max-w-md animate-fade-in-up">
        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-danger" />
          </div>

          <h3 className="text-center font-bold text-navy text-base mb-2">{title}</h3>
          <p className="text-center text-sm text-gray-600 mb-6">{message}</p>

          <div className="flex gap-3">
            <button
              id="btn-confirm-cancel"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 btn-outline"
            >
              Batal
            </button>
            <button
              id="btn-confirm-ok"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 btn-danger"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menghapus...
                </span>
              ) : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
