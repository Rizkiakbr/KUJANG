import { create } from 'zustand';

/**
 * Zustand store untuk notifikasi warning SLA global
 */
export const useNotifStore = create((set) => ({
  overdueItems:  [],  // array of case objects dengan status OVERDUE
  warningItems:  [],  // array of case objects dengan status WARNING
  overdueCount:  0,
  warningCount:  0,
  isOpen:        false,

  setNotifications: (overdueItems, warningItems) => set({
    overdueItems,
    warningItems,
    overdueCount: overdueItems.length,
    warningCount: warningItems.length,
  }),

  toggleDropdown: () => set((state) => ({ isOpen: !state.isOpen })),
  closeDropdown:  () => set({ isOpen: false }),
}));
