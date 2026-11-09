import { create } from "zustand";
import {
  fetchSeedParents,
  fetchSeedVariants,
  fetchSales,
  fetchProfile,
  createSeedParent,
  deleteSeedParent,
  createSeedVariant,
  updateSeedVariant,
  deleteSeedVariant,
  createSale,
  updateSale,
  deleteSale,
  fetchAuditLogs,
  updateProfile,
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../Api/root.js";

export const useAppStore = create((set) => ({
  seedParents: [],
  seedVariants: [],
  sales: [],
  auditLogs: [],
  customers: [],
  profile: null,
  loading: true,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [sp, sv, sl, pr, us] = await Promise.all([
        fetchSeedParents(),
        fetchSeedVariants(),
        fetchSales(),
        fetchProfile(),
        fetchCustomers(),
      ]);
      set({
        seedParents: sp.data.seedParents,
        seedVariants: sv.data.seedVariants,
        sales: sl.data.sales,
        profile: pr.data.user,
        customers: us.data.customers,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ---- Seed Parents ----
  addSeedParent: async (name) => {
    const res = await createSeedParent(name);
    const newParent = res.data.seedParent;
    set((s) => {
      const alreadyExists = s.seedParents.some((p) => p._id === newParent._id);
      if (alreadyExists) {
        return s;
      }
      return {
        seedParents: [...s.seedParents, newParent],
      };
    });
    return newParent;
  },
  removeSeedParent: async (id) => {
    await deleteSeedParent(id);
    set((s) => ({
      seedParents: s.seedParents.filter((p) => p._id !== id),
      seedVariants: s.seedVariants.filter((v) => v.seedId !== id),
    }));
  },

  // ---- Seed Variants ----
  addSeedVariant: async (data) => {
    const res = await createSeedVariant(data);
    set((s) => ({ seedVariants: [...s.seedVariants, res.data.variant] }));
    return res.data.variant;
  },
  editSeedVariant: async (id, data) => {
    const res = await updateSeedVariant(id, data);
    set((s) => ({
      seedVariants: s.seedVariants.map((v) => (v._id === id ? res.data.variant : v)),
    }));
    return res.data.variant;
  },
  removeSeedVariant: async (id) => {
    await deleteSeedVariant(id);
    set((s) => ({ seedVariants: s.seedVariants.filter((v) => v._id !== id) }));
  },

  // ---- Sales ----
  addSale: async (data) => {
    const res = await createSale(data);
    const sale = res.data.sale;
    set((s) => ({
      sales: [sale, ...s.sales],
      // Reflect the server-computed stock decrement locally instead of refetching
      seedVariants: s.seedVariants.map((v) => {
        const item = sale.items.find((i) => String(i.variantId) === String(v._id));
        return item ? { ...v, stock: v.stock - item.qty } : v;
      }),
    }));
    // Sale creation can create/update a linked customer + their stats — refresh
    const usRes = await fetchCustomers();
    set({ customers: usRes.data.customers });
    return sale;
  },
  editSale: async (id, data) => {
    const res = await updateSale(id, data);
    const updatedSale = res.data.sale;
    // Stock deltas for an edited sale are non-trivial (old items restored,
    // new items reserved server-side) — safest to refresh variants from
    // the server here rather than guess the diff on the client.
    const svRes = await fetchSeedVariants();
    const usRes = await fetchCustomers();
    set((s) => ({
      sales: s.sales.map((sale) => (sale._id === id ? updatedSale : sale)),
      seedVariants: svRes.data.seedVariants,
      customers: usRes.data.customers,
    }));
    return updatedSale;
  },
  removeSale: async (id) => {
    await deleteSale(id);
    const svRes = await fetchSeedVariants();
    const usRes = await fetchCustomers();
    set((s) => ({
      sales: s.sales.filter((sale) => sale._id !== id),
      seedVariants: svRes.data.seedVariants,
      customers: usRes.data.customers,
    }));
  },

  // ---- Customers ----
  addCustomer: async (data) => {
    const res = await createCustomer(data);
    const customer = res.data.customer;
    set((s) => ({ customers: [...s.customers, customer] }));
    return customer;
  },
  editCustomer: async (id, data) => {
    const res = await updateCustomer(id, data);
    set((s) => ({
      customers: s.customers.map((c) => (c._id === id ? res.data.customer : c)),
    }));
    return res.data.customer;
  },
  removeCustomer: async (id) => {
    await deleteCustomer(id);
    set((s) => ({ customers: s.customers.filter((c) => c._id !== id) }));
  },
  refreshCustomers: async () => {
    const res = await fetchCustomers();
    set({ customers: res.data.customers });
    return res.data.customers;
  },
  loadCustomerDetail: async (id) => {
    // Full profile + complete sales log for one customer — not stored in
    // the main `customers` array (too heavy to keep for everyone), so the
    // page holds this in local component state instead.
    const res = await fetchCustomerById(id);
    return res.data; // { customer, sales }
  },

  // ---- Audit Logs (loaded on demand, not part of initial loadAll) ----
  loadAuditLogs: async (params) => {
    const res = await fetchAuditLogs(params);
    const auditLogs = res?.data?.auditLogs ?? res?.data?.logs ?? [];
    set({ auditLogs });
    return auditLogs;
  },

  // ---- Profile ----
  editProfile: async (data) => {
    const res = await updateProfile(data);
    set({ profile: res.data.user });
    return res.data.user;
  },

  refreshInventory: async () => {
    const res = await fetchSeedVariants();
    set({ seedVariants: res.data.seedVariants });
    return res.data.seedVariants;
  },
}));
