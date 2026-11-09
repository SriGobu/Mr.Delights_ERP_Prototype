import api from "../Config/axios";

// Dashboard
export const fetchDashboardMetrics = (range) => api.get("/dashboard", { params: { range } });

// Profit
export const fetchProfitAnalytics = (range) => api.get("/profit", { params: { range } });

// Profile
export const fetchProfile = () => api.get("/profile");
export const updateProfile = (data) => api.put("/profile", data);

// Sales
export const fetchSales = (params) => api.get("/sales", { params });
export const fetchSaleById = (id) => api.get(`/sales/${id}`);
export const createSale = (data) => api.post("/sales", data);
export const updateSale = (id, data) => api.put(`/sales/${id}`, data);
export const deleteSale = (id) => api.delete(`/sales/${id}`);

// Seed Parents
export const fetchSeedParents = () => api.get("/seed-parent");
export const createSeedParent = (name) => api.post("/seed-parent", { name });
export const deleteSeedParent = (id) => api.delete(`/seed-parent/${id}`);

// Seed Variants
export const fetchSeedVariants = () => api.get("/seed-variant");
export const createSeedVariant = (data) => api.post("/seed-variant", data);
export const updateSeedVariant = (id, data) => api.put(`/seed-variant/${id}`, data);
export const deleteSeedVariant = (id) => api.delete(`/seed-variant/${id}`);

// Audit Log
export const fetchAuditLogs = (params) => api.get("/audit-log", { params });

export const fetchCustomers = () => api.get("/customers");
export const fetchCustomerById = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post("/customers", data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
