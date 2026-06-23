'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfMonth, endOfMonth, format, parse, isAfter, isBefore } from 'date-fns';

interface SessionUser {
  uid: string;
  role: 'admin' | 'staff';
  name: string;
  email: string;
}

interface SessionState {
  user: SessionUser | null;
  branchId: string | null;
  branchName: string | null;
  month: string | null;

  setMonth: (month: string | null) => void;
  setUser: (user: SessionUser | null) => void;
  setBranch: (branchId: string | null, branchName: string | null) => void;
  clearSession: () => void;

  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Month filter helpers
  getMonthRange: () => { start: Date; end: Date } | null;
  isDateInSelectedMonth: (date: string | Date) => boolean;
  getAvailableMonths: () => string[];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      branchId: null,
      branchName: null,
      month: null,

      setMonth: (month) => set({ month: month || null }),
      setUser: (user) => set({ user }),
      setBranch: (branchId, branchName) => set({
        branchId: branchId || null,
        branchName: branchName || null
      }),
      clearSession: () => set({
        user: null,
        branchId: null,
        branchName: null,
        month: null
      }),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      /**
       * Get start and end dates for selected month
       */
      getMonthRange: () => {
        const { month } = get();
        if (!month) return null;

        try {
          const date = parse(month, 'yyyy-MM', new Date());
          return {
            start: startOfMonth(date),
            end: endOfMonth(date),
          };
        } catch {
          console.error('Invalid month format:', month);
          return null;
        }
      },

      /**
       * Check if a date falls within selected month
       */
      isDateInSelectedMonth: (date: string | Date) => {
        const { month } = get();
        if (!month) return true; // If no month selected, include all

        const range = get().getMonthRange();
        if (!range) return false;

        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return (
          (isAfter(dateObj, range.start) || dateObj.getTime() === range.start.getTime()) &&
          (isBefore(dateObj, range.end) || dateObj.getTime() === range.end.getTime())
        );
      },

      /**
       * Get list of available months for filtering (last 12 months)
       */
      getAvailableMonths: () => {
        const months: string[] = [];
        const now = new Date();

        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(format(date, 'yyyy-MM'));
        }

        return months;
      },
    }),
    {
      name: 'inv-session-v2', // Changed name to avoid conflicts with old schema if any
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
