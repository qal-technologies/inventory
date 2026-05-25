'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  /** Persisted branch name filter (null = "All Branches") */
  branch: string | null;
  /** Persisted month filter in "YYYY-MM" format (null = "All Months") */
  month: string | null;
  setMonth: (month: string | null) => void;
  setBranch: (branch: string | null) => void;
  clearFilters: () => void;
  clearSession: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<SessionState>()(
  persist(
    (set) => ({
      branch: null,
      month: null,
      setBranch: (branch) => set({ branch: branch || null }),
      setMonth: (month) => set({ month: month || null }),
      clearFilters: () => set({ branch: null, month: null }),
      clearSession: () => set({ branch: null, month: null }),
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'app-session',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
