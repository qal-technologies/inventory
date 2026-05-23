'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionUser {
  uid: string;
  role: 'admin' | 'staff';
  name: string;
  email: string;
}

interface BranchInfo {
  branchId: string;
  branchName: string;
}

interface SessionState {
  user: SessionUser | null;
  branch: BranchInfo | null;
  setUser: (user: SessionUser) => void;
  setBranch: (branch: BranchInfo) => void;
  clearSession: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      branch: null,
      setUser: (user) => set({ user }),
      setBranch: (branch) => set({ branch }),
      clearSession: () => set({ user: null, branch: null }),
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'inv-session',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
