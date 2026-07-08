import { create } from 'zustand';

/**
 * Zustand store untuk user session & role
 */
export const useAuthStore = create((set) => ({
  user:       null,  // Firebase Auth user object
  userData:   null,  // Firestore user document
  isLoading:  true,  // true saat pertama kali cek auth state

  setUser: (user, userData) => set({ user, userData, isLoading: false }),
  clearUser: () => set({ user: null, userData: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
