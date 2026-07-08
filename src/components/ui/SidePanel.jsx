import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * SidePanel — slide dari kanan, 400px
 * @param {{ isOpen: boolean, onClose: Function, title: string, children: React.ReactNode }} props
 */
export default function SidePanel({ isOpen, onClose, title, children }) {
  const panelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="panel-overlay animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        id="side-panel"
        className="fixed top-0 right-0 h-full w-[420px] max-w-[100vw] bg-white z-50
                   shadow-panel flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-navy text-base">{title}</h2>
          <button
            id="btn-close-panel"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center
                       transition-colors text-gray-500"
            aria-label="Tutup panel"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </>
  );
}
