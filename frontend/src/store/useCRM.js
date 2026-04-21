import { create } from "zustand";
import {
  contactsService,
  companiesService,
  dealsService,
  storesService,
  activitiesService,
  settingsService,
  analyticsService,
} from "../lib/db";
import { isSupabaseConfigured } from "../lib/supabase";
import { SEED_DATA } from "../data/seed";

const useCRM = create((set, get) => ({
  // State
  mode: "demo", // 'demo' = use seed data, 'production' = use real database
  contacts: SEED_DATA.contacts,
  companies: SEED_DATA.companies,
  deals: SEED_DATA.deals,
  stores: SEED_DATA.stores,
  activities: SEED_DATA.activities,
  settings: SEED_DATA.settings,
  revenueHistory: SEED_DATA.revenueHistory,
  pipelineHistory: SEED_DATA.pipelineHistory,
  currentStoreId: null,
  loading: true,
  error: null,

  // Mode control
  setMode: (mode) => {
    if (mode === "demo") {
      // Reset to seed data
      set({
        mode: "demo",
        contacts: SEED_DATA.contacts,
        companies: SEED_DATA.companies,
        deals: SEED_DATA.deals,
        stores: SEED_DATA.stores,
        activities: SEED_DATA.activities,
        settings: SEED_DATA.settings,
        revenueHistory: SEED_DATA.revenueHistory,
        pipelineHistory: SEED_DATA.pipelineHistory,
        loading: false,
        error: null,
      });
    } else {
      // Initialize from Supabase
      get().initialize();
    }
  },

  // Initialize - load data from Supabase or use seed data
  initialize: async () => {
    set({ loading: true, error: null, mode: "production" });
    try {
      const [contacts, companies, deals, stores, activities, settings] =
        await Promise.all([
          contactsService.getAll(),
          companiesService.getAll(),
          dealsService.getAll(),
          storesService.getAll(),
          activitiesService.getAll(),
          settingsService.get(),
        ]);

      const [revenueHistory, pipelineHistory] = await Promise.all([
        analyticsService.getRevenueHistory(),
        analyticsService.getPipelineHistory(),
      ]);

      set({
        contacts,
        companies,
        deals,
        stores,
        activities,
        settings,
        revenueHistory,
        pipelineHistory,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to initialize from Supabase:", err);
      set({ loading: false, error: err.message });
    }
  },

  // Store filter
  setCurrentStore: (storeId) => set({ currentStoreId: storeId }),

  // ========== CONTACTS ==========
  addContact: async (contact) => {
    try {
      const newContact = await contactsService.create(contact);
      set((s) => ({ contacts: [...s.contacts, newContact] }));
      return newContact;
    } catch (err) {
      console.error("Failed to create contact:", err);
      // Fallback to local
      const localContact = { ...contact, id: `c_${Date.now()}` };
      set((s) => ({ contacts: [...s.contacts, localContact] }));
      return localContact;
    }
  },

  updateContact: async (id, updates) => {
    try {
      const updated = await contactsService.update(id, updates);
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.id === id ? { ...c, ...updated } : c,
        ),
      }));
    } catch (err) {
      console.error("Failed to update contact:", err);
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      }));
    }
  },

  deleteContact: async (id) => {
    try {
      await contactsService.delete(id);
      set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
    } catch (err) {
      console.error("Failed to delete contact:", err);
      set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
    }
  },

  // ========== COMPANIES ==========
  addCompany: async (company) => {
    try {
      const newCompany = await companiesService.create(company);
      set((s) => ({ companies: [...s.companies, newCompany] }));
      return newCompany;
    } catch (err) {
      console.error("Failed to create company:", err);
      const localCompany = { ...company, id: `comp_${Date.now()}` };
      set((s) => ({ companies: [...s.companies, localCompany] }));
      return localCompany;
    }
  },

  updateCompany: async (id, updates) => {
    try {
      const updated = await companiesService.update(id, updates);
      set((s) => ({
        companies: s.companies.map((c) =>
          c.id === id ? { ...c, ...updated } : c,
        ),
      }));
    } catch (err) {
      console.error("Failed to update company:", err);
      set((s) => ({
        companies: s.companies.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      }));
    }
  },

  deleteCompany: async (id) => {
    try {
      await companiesService.delete(id);
      set((s) => ({ companies: s.companies.filter((c) => c.id !== id) }));
    } catch (err) {
      console.error("Failed to delete company:", err);
      set((s) => ({ companies: s.companies.filter((c) => c.id !== id) }));
    }
  },

  // ========== DEALS ==========
  addDeal: async (deal) => {
    try {
      const newDeal = await dealsService.create(deal);
      set((s) => ({ deals: [...s.deals, newDeal] }));
      return newDeal;
    } catch (err) {
      console.error("Failed to create deal:", err);
      const localDeal = { ...deal, id: `d_${Date.now()}` };
      set((s) => ({ deals: [...s.deals, localDeal] }));
      return localDeal;
    }
  },

  updateDeal: async (id, updates) => {
    try {
      const updated = await dealsService.update(id, updates);
      set((s) => ({
        deals: s.deals.map((d) => (d.id === id ? { ...d, ...updated } : d)),
      }));
    } catch (err) {
      console.error("Failed to update deal:", err);
      set((s) => ({
        deals: s.deals.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      }));
    }
  },

  moveDeal: async (id, newStage) => {
    try {
      await dealsService.updateStage(id, newStage);
      set((s) => ({
        deals: s.deals.map((d) =>
          d.id === id ? { ...d, stage: newStage } : d,
        ),
      }));
    } catch (err) {
      console.error("Failed to move deal:", err);
      set((s) => ({
        deals: s.deals.map((d) =>
          d.id === id ? { ...d, stage: newStage } : d,
        ),
      }));
    }
  },

  deleteDeal: async (id) => {
    try {
      await dealsService.delete(id);
      set((s) => ({ deals: s.deals.filter((d) => d.id !== id) }));
    } catch (err) {
      console.error("Failed to delete deal:", err);
      set((s) => ({ deals: s.deals.filter((d) => d.id !== id) }));
    }
  },

  // ========== STORES ==========
  addStore: async (store) => {
    try {
      const newStore = await storesService.create(store);
      set((s) => ({ stores: [...s.stores, newStore] }));
      return newStore;
    } catch (err) {
      console.error("Failed to create store:", err);
      const localStore = { ...store, id: `store_${Date.now()}` };
      set((s) => ({ stores: [...s.stores, localStore] }));
      return localStore;
    }
  },

  updateStore: async (id, updates) => {
    try {
      const updated = await storesService.update(id, updates);
      set((s) => ({
        stores: s.stores.map((st) =>
          st.id === id ? { ...st, ...updated } : st,
        ),
      }));
    } catch (err) {
      console.error("Failed to update store:", err);
      set((s) => ({
        stores: s.stores.map((st) =>
          st.id === id ? { ...st, ...updates } : st,
        ),
      }));
    }
  },

  deleteStore: async (id) => {
    try {
      await storesService.delete(id);
      set((s) => ({ stores: s.stores.filter((st) => st.id !== id) }));
    } catch (err) {
      console.error("Failed to delete store:", err);
      set((s) => ({ stores: s.stores.filter((st) => st.id !== id) }));
    }
  },

  // ========== ACTIVITIES ==========
  addActivity: async (activity) => {
    try {
      const newActivity = await activitiesService.create(activity);
      set((s) => ({ activities: [...s.activities, newActivity] }));
      return newActivity;
    } catch (err) {
      console.error("Failed to create activity:", err);
      const localActivity = { ...activity, id: `a_${Date.now()}` };
      set((s) => ({ activities: [...s.activities, localActivity] }));
      return localActivity;
    }
  },

  updateActivity: async (id, updates) => {
    try {
      const updated = await activitiesService.update(id, updates);
      set((s) => ({
        activities: s.activities.map((a) =>
          a.id === id ? { ...a, ...updated } : a,
        ),
      }));
    } catch (err) {
      console.error("Failed to update activity:", err);
      set((s) => ({
        activities: s.activities.map((a) =>
          a.id === id ? { ...a, ...updates } : a,
        ),
      }));
    }
  },

  deleteActivity: async (id) => {
    try {
      await activitiesService.delete(id);
      set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
    } catch (err) {
      console.error("Failed to delete activity:", err);
      set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
    }
  },

  completeActivity: async (id) => {
    try {
      await activitiesService.complete(id);
      set((s) => ({
        activities: s.activities.map((a) =>
          a.id === id ? { ...a, status: "completed" } : a,
        ),
      }));
    } catch (err) {
      console.error("Failed to complete activity:", err);
      set((s) => ({
        activities: s.activities.map((a) =>
          a.id === id ? { ...a, status: "completed" } : a,
        ),
      }));
    }
  },

  // ========== SETTINGS ==========
  updateSettings: async (updates) => {
    try {
      await settingsService.update(updates);
      set((s) => ({ settings: { ...s.settings, ...updates } }));
    } catch (err) {
      console.error("Failed to update settings:", err);
      set((s) => ({ settings: { ...s.settings, ...updates } }));
    }
  },

  addUser: async (user) => {
    try {
      const newUser = await settingsService.createUser(user);
      set((s) => ({
        settings: {
          ...s.settings,
          users: [...(s.settings.users || []), newUser],
        },
      }));
      return newUser;
    } catch (err) {
      console.error("Failed to create user:", err);
      const localUser = { ...user, id: `u_${Date.now()}` };
      set((s) => ({
        settings: {
          ...s.settings,
          users: [...(s.settings.users || []), localUser],
        },
      }));
      return localUser;
    }
  },

  deleteUser: async (id) => {
    try {
      await settingsService.deleteUser(id);
      set((s) => ({
        settings: {
          ...s.settings,
          users: s.settings.users?.filter((u) => u.id !== id),
        },
      }));
    } catch (err) {
      console.error("Failed to delete user:", err);
      set((s) => ({
        settings: {
          ...s.settings,
          users: s.settings.users?.filter((u) => u.id !== id),
        },
      }));
    }
  },

  // ========== SELECTORS ==========
  getFilteredContacts: () => {
    const { contacts, currentStoreId } = get();
    return currentStoreId
      ? contacts.filter((c) => c.storeId === currentStoreId)
      : contacts;
  },

  getFilteredDeals: () => {
    const { deals, currentStoreId } = get();
    return currentStoreId
      ? deals.filter((d) => d.storeId === currentStoreId)
      : deals;
  },

  getContactById: (id) => get().contacts.find((c) => c.id === id),
  getCompanyById: (id) => get().companies.find((c) => c.id === id),
  getStoreById: (id) => get().stores.find((s) => s.id === id),

  getDashboardStats: () => {
    const { deals, contacts, companies } = get();
    const filtered = get().getFilteredDeals();
    const wonDeals = filtered.filter((d) => d.stage === "won");
    const lostDeals = filtered.filter((d) => d.stage === "lost");
    const openDeals = filtered.filter(
      (d) => !["won", "lost"].includes(d.stage),
    );

    return {
      totalRevenue: wonDeals.reduce((s, d) => s + (d.value || 0), 0),
      pipelineValue: openDeals.reduce((s, d) => s + (d.value || 0), 0),
      openDeals: openDeals.length,
      winRate:
        wonDeals.length + lostDeals.length > 0
          ? Math.round(
              (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100,
            )
          : 0,
      pendingActivities: get().activities.filter(
        (a) => a.status !== "completed",
      ).length,
      contacts: contacts.length,
      companies: companies.length,
    };
  },

  // Refresh data from Supabase
  refresh: async () => {
    return get().initialize();
  },

  // Reset to seed data (local fallback)
  resetData: () =>
    set({
      contacts: SEED_DATA.contacts,
      companies: SEED_DATA.companies,
      deals: SEED_DATA.deals,
      stores: SEED_DATA.stores,
      activities: SEED_DATA.activities,
      settings: SEED_DATA.settings,
      revenueHistory: SEED_DATA.revenueHistory,
      pipelineHistory: SEED_DATA.pipelineHistory,
    }),
}));

export default useCRM;
