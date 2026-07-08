import { create } from 'zustand';

/**
 * Zustand store untuk sistem toast notification
 */
export const useToastStore = create((set) => ({
  toasts: [],

  /**
   * Tambah toast baru (max 3 sekaligus — yang paling lama dihapus)
   * @param {{ type: 'success'|'danger'|'warning'|'info', title: string, message: string, duration?: number }} toast
   */
  addToast: (toast) =>
    set((state) => {
      const newToast = {
        id: Date.now() + Math.random(),
        duration: 5000,
        ...toast,
      };
      // Jaga max 3 — buang yang paling lama (index 0)
      const toasts = state.toasts.length >= 3
        ? [...state.toasts.slice(1), newToast]
        : [...state.toasts, newToast];
      return { toasts };
    }),

  /**
   * Hapus toast berdasarkan id
   * @param {number} id
   */
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  /**
   * Hapus semua toast
   */
  clearAll: () => set({ toasts: [] }),
}));
