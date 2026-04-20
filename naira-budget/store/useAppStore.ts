import { create } from "zustand";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface AppStoreState {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  isOnboarded: boolean;
  setIsOnboarded: (value: boolean) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  selectedMonth: currentMonthKey(),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  isOnboarded: false,
  setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
}));
