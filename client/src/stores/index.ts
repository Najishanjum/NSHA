import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Couple, PartnerNumber, AppNotification } from '@/types';

/* ─── Couple Store ─── */

interface CoupleState {
  couple: Couple | null;
  currentPartner: PartnerNumber | null;
  partner: PartnerNumber | null;
  isJoined: boolean;
  setCouple: (couple: Couple) => void;
  setCurrentPartner: (partner: PartnerNumber) => void;
  setPartner: (partner: PartnerNumber) => void;
  setJoined: (joined: boolean) => void;
  getPartnerName: () => string;
  getMyName: () => string;
  logout: () => void;
  reset: () => void;
}

export const useCoupleStore = create<CoupleState>()(
  persist(
    (set, get) => ({
      couple: null,
      currentPartner: null,
      partner: null,
      isJoined: false,
      setCouple: (couple) => set({ couple }),
      setCurrentPartner: (partner) => set({ currentPartner: partner, partner }),
      setPartner: (partner) => set({ currentPartner: partner, partner }),
      setJoined: (joined) => set({ isJoined: joined }),
      getPartnerName: () => {
        const { couple, currentPartner } = get();
        if (!couple || !currentPartner) return 'Partner';
        return currentPartner === 1 ? couple.partner2Name : couple.partner1Name;
      },
      getMyName: () => {
        const { couple, currentPartner } = get();
        if (!couple || !currentPartner) return 'You';
        return currentPartner === 1 ? couple.partner1Name : couple.partner2Name;
      },
      logout: () => set({ couple: null, currentPartner: null, partner: null, isJoined: false }),
      reset: () => set({ couple: null, currentPartner: null, partner: null, isJoined: false }),
    }),
    {
      name: 'couplesync-couple',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.partner && state.currentPartner) state.partner = state.currentPartner;
          if (!state.currentPartner && state.partner) state.currentPartner = state.partner;
        }
      },
    }
  )
);

/* ─── UI Store ─── */

interface UIState {
  sidebarOpen: boolean;
  activePage: string;
  showCompletionAnimation: boolean;
  setSidebarOpen: (open: boolean) => void;
  setActivePage: (page: string) => void;
  setShowCompletionAnimation: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activePage: 'home',
  showCompletionAnimation: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePage: (page) => set({ activePage: page }),
  setShowCompletionAnimation: (show) => set({ showCompletionAnimation: show }),
}));

/* ─── Notification Store ─── */

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (notif) =>
    set((state) => ({
      notifications: [
        {
          ...notif,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ].slice(0, 50),
    })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearAll: () => set({ notifications: [] }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
