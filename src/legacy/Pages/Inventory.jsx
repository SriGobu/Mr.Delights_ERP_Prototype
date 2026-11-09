// src/pages/Inventory.jsx
import { useState, useMemo } from "react";
import { useAppStore } from "../Store/useAppStore";
import { useToast } from "../Context/ToastContext";
import { PACKAGE_SIZES } from "../Constants/appConstants";
import Loader from "../Components/Loader";

function variantStatus(v) {
  if (v.stock === 0) return { label: "Out of Stock", color: "#dc2626", bg: "#fef2f2" };
  if (v.stock <= v.reorderThreshold) return { label: "Low Stock", color: "#d97706", bg: "#fffbeb" };
  return { label: "In Stock", color: "#15803d", bg: "#f0fdf4" };
}

function downloadCSV(filename, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\ufeff" + lines], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EMPTY_FORM = {
  seedId: "",
  packageSize: "100G",
  description: "",
  stock: 0,
  purchaseCost: 0,
  costPrice: 0,
  profitPct: 20,
  mrpManual: "",
  reorderThreshold: 10,
};

export default function Inventory() {
  const {
    seedParents,
    seedVariants,
    loading,
    addSeedParent,
    addSeedVariant,
    editSeedVariant,
    removeSeedVariant,
    removeSeedParent,
    refreshInventory,
  } = useAppStore();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [pkgFilter, setPkgFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expanded, setExpanded] = useState(new Set());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editVariantId, setEditVariantId] = useState(null);
  const [lockedSeedId, setLockedSeedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [newParentMode, setNewParentMode] = useState(false);
  const [newParentName, setNewParentName] = useState("");
  const [savingParent, setSavingParent] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, label }
  const [deleting, setDeleting] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshInventory();
      toast("Inventory refreshed");
    } catch (err) {
      toast(err?.message || "Failed to refresh", "error");
    } finally {
      setRefreshing(false);
    }
  }

  const selectedParent = seedParents.find((p) => p._id === form.seedId);
  const autoMrp = Math.round(form.costPrice * (1 + form.profitPct / 100));
  const finalMrp = form.mrpManual !== "" ? Number(form.mrpManual) : autoMrp;
  const mrpIsOverridden = form.mrpManual !== "" && Number(form.mrpManual) !== autoMrp;
  const actualProfit = finalMrp - form.costPrice;
  const actualPct = finalMrp > 0 ? (actualProfit / finalMrp) * 100 : 0;
  const costBuffer = form.costPrice - form.purchaseCost;

  const filteredParents = useMemo(() => {
    return seedParents.filter((p) => {
      const variants = seedVariants.filter((v) => v.seedId === p._id);
      if (!variants.length && !search) return true;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
        const skuMatch = variants.some((v) =>
          (v.sku || "").toLowerCase().includes(search.toLowerCase()),
        );
        if (!skuMatch) return false;
      }
      return true;
    });
  }, [seedParents, seedVariants, search]);

  function getVariants(parentId) {
    return seedVariants.filter((v) => {
      if (v.seedId !== parentId) return false;
      if (pkgFilter !== "All" && v.packageSize !== pkgFilter) return false;
      if (statusFilter !== "All" && variantStatus(v).label !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !v.seedName.toLowerCase().includes(q) &&
          !(v.sku || "").toLowerCase().includes(q) &&
          !v.packageSize.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function resetDrawerExtras() {
    setNewParentMode(false);
    setNewParentName("");
    setErrors({});
  }

  function openAddNew() {
    setForm(EMPTY_FORM);
    setEditVariantId(null);
    setLockedSeedId(null);
    resetDrawerExtras();
    setDrawerOpen(true);
  }

  function openAddVariant(parentId) {
    const existing = seedVariants.filter((v) => v.seedId === parentId).map((v) => v.packageSize);
    const firstAvailable = PACKAGE_SIZES.find((p) => !existing.includes(p)) ?? "100G";
    setForm({ ...EMPTY_FORM, seedId: parentId, packageSize: firstAvailable });
    setEditVariantId(null);
    setLockedSeedId(parentId);
    resetDrawerExtras();
    setDrawerOpen(true);
  }

  function openEdit(v) {
    setForm({
      seedId: v.seedId,
      packageSize: v.packageSize,
      description: v.description || "",
      stock: v.stock,
      purchaseCost: v.purchaseCost || 0,
      costPrice: v.costPrice,
      profitPct: v.profitPct,
      mrpManual: v.mrpOverridden ? String(v.mrp) : "",
      reorderThreshold: v.reorderThreshold,
    });
    setEditVariantId(v._id);
    setLockedSeedId(v.seedId);
    resetDrawerExtras();
    setDrawerOpen(true);
  }

  function validate() {
    const e = {};
    if (!form.seedId) e.seedId = "Select a seed";
    const duplicateVariant = seedVariants.some(
      (variant) =>
        String(variant.seedId) === String(form.seedId) &&
        variant.packageSize === form.packageSize &&
        variant._id !== editVariantId,
    );
    if (duplicateVariant) {
      e.packageSize = "This package size is already added for this seed";
    }
    if (form.purchaseCost < 0) e.purchaseCost = "Cannot be negative";
    if (form.costPrice <= 0) e.costPrice = "Must be > 0";
    if (form.profitPct < 0) e.profitPct = "Must be ≥ 0";
    if (finalMrp <= 0) e.mrp = "Must be > 0";
    if (finalMrp < form.costPrice) e.mrp = "MRP cannot be less than cost";
    return e;
  }

  async function handleAddParent() {
    const name = newParentName.trim();
    if (!name) return;
    setSavingParent(true);
    try {
      const parent = await addSeedParent(name);
      const id = parent?._id || parent?.id;
      if (!id) {
        toast("Seed created but no id was returned by the server", "error");
        return;
      }
      setForm((f) => ({ ...f, seedId: id }));
      setNewParentMode(false);
      setNewParentName("");
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Failed to add seed", "error");
    } finally {
      setSavingParent(false);
    }
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    const parent = seedParents.find((p) => p._id === form.seedId);
    if (!parent) {
      setErrors({ seedId: "Select a seed" });
      return;
    }

    const payload = {
      seedId: parent._id,
      seedName: parent.name,
      packageSize: form.packageSize,
      description: form.description,
      stock: form.stock,
      purchaseCost: form.purchaseCost,
      costPrice: form.costPrice,
      profitPct: form.profitPct,
      mrp: finalMrp,
      mrpOverridden: mrpIsOverridden,
      reorderThreshold: form.reorderThreshold,
    };

    setSaving(true);
    try {
      if (editVariantId) {
        await editSeedVariant(editVariantId, payload);
        toast("Variant updated", "info");
      } else {
        await addSeedVariant(payload);
        setExpanded((prev) => new Set([...prev, parent._id]));
        toast("Variant added to inventory!");
      }
      setDrawerOpen(false);
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Failed to save variant", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "variant") {
        await removeSeedVariant(deleteTarget.id);
        toast("Variant removed", "error");
      } else {
        await removeSeedParent(deleteTarget.id);
        toast("Seed and all variants removed", "error");
      }
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  }

  function handleExport() {
    downloadCSV(
      "inventory.csv",
      [
        "Seed",
        "Variant",
        "SKU",
        "Stock",
        "Purchase Cost",
        "Cost Price",
        "Profit %",
        "MRP",
        "Actual Profit %",
        "Status",
      ],
      seedVariants.map((v) => {
        const pct = v.mrp > 0 ? ((v.mrp - v.costPrice) / v.mrp) * 100 : 0;
        return [
          v.seedName,
          v.packageSize,
          v.sku || "",
          v.stock,
          v.purchaseCost || 0,
          v.costPrice,
          v.profitPct,
          v.mrp,
          pct.toFixed(1) + "%",
          variantStatus(v).label,
        ];
      }),
    );
  }

  const totalVariants = seedVariants.length;
  const lowStockCount = seedVariants.filter(
    (v) => v.stock > 0 && v.stock <= v.reorderThreshold,
  ).length;
  const outOfStockCount = seedVariants.filter((v) => v.stock === 0).length;
  const totalStock = seedVariants.reduce((a, v) => a + v.stock, 0);

  const kpis = [
    {
      label: "Total Seeds",
      value: loading ? "Not yet" : seedParents.length,
      color: "#3d7a4f",
    },
    {
      label: "Total Variants",
      value: loading ? "Not yet" : totalVariants,
      color: "#b5813a",
    },
    {
      label: "Total Stock",
      value: loading ? "Not yet" : totalStock.toLocaleString("en-IN") + " pkts",
      color: "#3d7a4f",
    },
    {
      label: "Low / Out of Stock",
      value: loading ? "Not yet" : `${lowStockCount} / ${outOfStockCount}`,
      color: outOfStockCount > 0 ? "#dc2626" : "#d97706",
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="hidden md:block">
          <h1
            className="text-2xl text-[#1a1a12]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Inventory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7a7060" }}>
            {loading ? "Loading…" : `${seedParents.length} seeds · ${totalVariants} variants`}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border hover:bg-[#f0ebe1] transition-colors disabled:opacity-50"
            style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                transition: "transform 0.4s",
                transform: refreshing ? "rotate(360deg)" : "none",
              }}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border hover:bg-[#f0ebe1] transition-colors"
            style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={openAddNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "#3d7a4f" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add New Seed
          </button>
        </div>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-1"
            style={{
              border: "1px solid #e0dbd0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <span className="text-xs font-medium" style={{ color: "#b0a898" }}>
              {k.label}
            </span>
            <span
              className="text-lg font-bold"
              style={{
                color: k.value === "Not yet" ? "#b0a898" : k.color,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {k.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b0a898"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seed name or SKU…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
            style={{ border: "1px solid #e0dbd0" }}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={pkgFilter}
            onChange={(e) => setPkgFilter(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
            style={{ border: "1px solid #e0dbd0", color: "#4a4035" }}
          >
            <option value="All">All Sizes</option>
            {PACKAGE_SIZES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
            style={{ border: "1px solid #e0dbd0", color: "#4a4035" }}
          >
            <option value="All">All Status</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Parent-child inventory list */}
      <div className="flex flex-col gap-3">
        {loading && (
          <div
            className="py-20 text-center bg-white rounded-2xl"
            style={{ border: "1px solid #e0dbd0" }}
          >
            <Loader label="Loading inventory…" />
          </div>
        )}

        {!loading && filteredParents.length === 0 && (
          <div
            className="py-20 text-center bg-white rounded-2xl"
            style={{ border: "1px solid #e0dbd0" }}
          >
            <div className="text-4xl mb-3">🌱</div>
            <div className="text-base font-medium" style={{ color: "#7a7060" }}>
              No seeds found
            </div>
          </div>
        )}

        {!loading &&
          filteredParents.map((parent) => {
            const variants = getVariants(parent._id);
            const isExpanded = expanded.has(parent._id);
            const allVariants = seedVariants.filter((v) => v.seedId === parent._id);
            const parentLowStock = allVariants.filter(
              (v) => v.stock > 0 && v.stock <= v.reorderThreshold,
            ).length;
            const parentOutOfStock = allVariants.filter((v) => v.stock === 0).length;
            const usedSizes = allVariants.map((v) => v.packageSize);
            const availableSizes = PACKAGE_SIZES.filter((p) => !usedSizes.includes(p));

            return (
              <div
                key={parent._id}
                className="bg-white rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid #e0dbd0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{
                    background: "#faf8f4",
                    borderBottom: isExpanded ? "1px solid #f0ebe1" : "none",
                  }}
                >
                  <button
                    onClick={() => toggleExpand(parent._id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3d7a4f"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      style={{
                        transition: "transform 0.2s",
                        transform: isExpanded ? "rotate(90deg)" : "none",
                        flexShrink: 0,
                      }}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: "#1a1a12" }}>
                        {parent.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "#ece8df", color: "#7a7060" }}
                      >
                        {allVariants.length} variant
                        {allVariants.length !== 1 ? "s" : ""}
                      </span>
                      {parentOutOfStock > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#fef2f2", color: "#dc2626" }}
                        >
                          {parentOutOfStock} out of stock
                        </span>
                      )}
                      {parentLowStock > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#fffbeb", color: "#d97706" }}
                        >
                          {parentLowStock} low stock
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {availableSizes.length > 0 && (
                      <button
                        onClick={() => openAddVariant(parent._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                        style={{ background: "#3d7a4f", color: "#fff" }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add Variant
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: "parent",
                          id: parent._id,
                          label: parent.name,
                        })
                      }
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: "#dc2626" }}
                      title="Remove seed"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded &&
                  (variants.length === 0 ? (
                    <div className="py-8 text-center text-sm" style={{ color: "#b0a898" }}>
                      No variants match the current filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[800px]">
                        <thead>
                          <tr style={{ borderBottom: "1px solid #f0ebe1" }}>
                            {[
                              "Variant",
                              "SKU",
                              "Stock",
                              "Purchase Cost",
                              "Cost Price",
                              "Profit %",
                              "MRP",
                              "Actual Profit",
                              "Status",
                              "Actions",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-2.5 text-xs uppercase tracking-wider font-semibold"
                                style={{ color: "#b0a898" }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((v) => {
                            const st = variantStatus(v);
                            const pct = v.mrp > 0 ? ((v.mrp - v.costPrice) / v.mrp) * 100 : 0;
                            return (
                              <tr
                                key={v._id}
                                className="border-b last:border-0 hover:bg-[#faf8f4] transition-colors"
                                style={{ borderColor: "#f0ebe1" }}
                              >
                                <td
                                  className="px-4 py-3 font-semibold"
                                  style={{ color: "#1a1a12" }}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {v.packageSize}
                                    {v.mrpOverridden && (
                                      <span
                                        className="text-xs px-1 py-0 rounded"
                                        style={{
                                          background: "#fff3cd",
                                          color: "#856404",
                                          fontSize: 9,
                                        }}
                                      >
                                        MRP adj.
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td
                                  className="px-4 py-3 font-mono text-xs"
                                  style={{ color: "#7a7060" }}
                                >
                                  {v.sku || "—"}
                                </td>
                                <td
                                  className="px-4 py-3 font-semibold"
                                  style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "#1a1a12",
                                  }}
                                >
                                  {v.stock}{" "}
                                  <span
                                    className="text-xs font-normal"
                                    style={{ color: "#b0a898" }}
                                  >
                                    pkts
                                  </span>
                                </td>
                                <td
                                  className="px-4 py-3"
                                  style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "#b5813a",
                                  }}
                                >
                                  ₹{v.purchaseCost || 0}
                                </td>
                                <td
                                  className="px-4 py-3"
                                  style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "#7a7060",
                                  }}
                                >
                                  ₹{v.costPrice}
                                </td>
                                <td
                                  className="px-4 py-3"
                                  style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "#3d7a4f",
                                  }}
                                >
                                  {v.profitPct}%
                                </td>
                                <td
                                  className="px-4 py-3 font-semibold"
                                  style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "#1a1a12",
                                  }}
                                >
                                  ₹{v.mrp}
                                </td>
                                <td
                                  className="px-4 py-3 text-xs font-semibold"
                                  style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "#3d7a4f",
                                  }}
                                >
                                  ₹{v.mrp - v.costPrice} ({pct.toFixed(1)}%)
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                    style={{
                                      background: st.bg,
                                      color: st.color,
                                    }}
                                  >
                                    {st.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openEdit(v)}
                                      className="p-1.5 rounded-lg hover:bg-[#ece8df] transition-colors"
                                      style={{ color: "#7a7060" }}
                                    >
                                      <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                      >
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: "variant",
                                          id: v._id,
                                          label: `${v.seedName} ${v.packageSize}`,
                                        })
                                      }
                                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                      style={{ color: "#dc2626" }}
                                    >
                                      <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                      >
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
              </div>
            );
          })}
      </div>

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-end"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
        >
          <div
            className="h-full w-full sm:max-w-md bg-white flex flex-col"
            style={{ boxShadow: "-8px 0 40px rgba(0,0,0,0.12)" }}
          >
            <div
              className="flex items-center justify-between px-6 py-5 border-b"
              style={{ borderColor: "#e0dbd0" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  color: "#1a1a12",
                }}
              >
                {editVariantId ? "Edit Variant" : lockedSeedId ? "Add Variant" : "Add New Seed"}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#f0ebe1]"
                style={{ color: "#7a7060" }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {/* Seed Parent picker */}
              <Field label="Seed *" error={errors.seedId}>
                {lockedSeedId ? (
                  <div
                    className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#f4f1eb]"
                    style={{ border: "1px solid #e0dbd0", color: "#4a4035" }}
                  >
                    {selectedParent?.name || "—"}
                  </div>
                ) : (
                  <>
                    <select
                      value={form.seedId}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setNewParentMode(true);
                          return;
                        }
                        setForm((f) => ({ ...f, seedId: e.target.value }));
                      }}
                      className={inp(errors.seedId)}
                    >
                      <option value="">Select a seed…</option>
                      {seedParents.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                      <option value="__new__">+ Add new seed…</option>
                    </select>
                    {newParentMode && (
                      <div
                        className="flex gap-2 mt-2 p-2.5 rounded-xl"
                        style={{
                          background: "#faf8f4",
                          border: "1px solid #e0dbd0",
                        }}
                      >
                        <input
                          autoFocus
                          value={newParentName}
                          onChange={(e) => setNewParentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddParent();
                            }
                          }}
                          placeholder="New seed name"
                          className="flex-1 px-3 py-2 rounded-lg text-sm bg-white outline-none"
                          style={{ border: "1px solid #e0dbd0" }}
                        />
                        <button
                          onClick={handleAddParent}
                          disabled={savingParent || !newParentName.trim()}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white shrink-0"
                          style={{
                            background: "#3d7a4f",
                            opacity: savingParent || !newParentName.trim() ? 0.6 : 1,
                          }}
                        >
                          {savingParent ? "Adding…" : "Add"}
                        </button>
                        <button
                          onClick={() => {
                            setNewParentMode(false);
                            setNewParentName("");
                          }}
                          className="px-3 py-2 rounded-lg text-xs font-semibold shrink-0"
                          style={{ color: "#7a7060" }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </Field>

              {/* Package Size */}
              <Field label="Package Size *" error={errors.packageSize}>
                <select
                  value={form.packageSize}
                  onChange={(e) => setForm((f) => ({ ...f, packageSize: e.target.value }))}
                  disabled={!!editVariantId}
                  className={inp() + (editVariantId ? " bg-[#f4f1eb]" : "")}
                >
                  {PACKAGE_SIZES.map((p) => {
                    const isUsed =
                      form.seedId &&
                      seedVariants.some(
                        (v) =>
                          String(v.seedId) === String(form.seedId) &&
                          v.packageSize === p &&
                          v._id !== editVariantId,
                      );
                    return (
                      <option key={p} value={p} disabled={!!isUsed}>
                        {p}
                        {isUsed ? " (already added)" : ""}
                      </option>
                    );
                  })}
                </select>
              </Field>

              {/* SKU */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#7a7060" }}
                >
                  SKU
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: "#f4f1eb", border: "1px solid #e0dbd0" }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b5813a"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span
                    className="font-bold tracking-widest"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      color: "#b5813a",
                    }}
                  >
                    {editVariantId
                      ? seedVariants.find((v) => v._id === editVariantId)?.sku || "—"
                      : "Generated by server on save"}
                  </span>
                </div>
              </div>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inp() + " resize-none"}
                  rows={2}
                  placeholder="Optional product description…"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Stock (Packets)">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.stock === 0 ? "" : form.stock}
                    onFocus={() => {
                      if (form.stock === 0) setForm((f) => ({ ...f, stock: "" }));
                    }}
                    onBlur={() => {
                      if (form.stock === "") setForm((f) => ({ ...f, stock: 0 }));
                    }}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setForm((f) => ({
                        ...f,
                        stock: raw === "" ? 0 : Number(raw),
                      }));
                    }}
                    className={inp()}
                  />
                </Field>
                <Field label="Reorder Threshold">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.reorderThreshold === 0 ? "" : form.reorderThreshold}
                    onFocus={() => {
                      if (form.reorderThreshold === 0)
                        setForm((f) => ({ ...f, reorderThreshold: "" }));
                    }}
                    onBlur={() => {
                      if (form.reorderThreshold === "")
                        setForm((f) => ({ ...f, reorderThreshold: 0 }));
                    }}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setForm((f) => ({
                        ...f,
                        reorderThreshold: raw === "" ? 0 : Number(raw),
                      }));
                    }}
                    className={inp()}
                  />
                </Field>
              </div>

              {/* Pricing */}
              <div className="border-t pt-4" style={{ borderColor: "#f0ebe1" }}>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "#7a7060" }}
                >
                  Pricing
                </div>
                <div className="flex flex-col gap-3">
                  <Field
                    label="Purchase Cost (₹) · per packet — actual amount paid incl. delivery/extra charges"
                    error={errors.purchaseCost}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.purchaseCost === 0 ? "" : form.purchaseCost}
                      onFocus={() => {
                        if (form.purchaseCost === 0) setForm((f) => ({ ...f, purchaseCost: "" }));
                      }}
                      onBlur={() => {
                        if (form.purchaseCost === "") setForm((f) => ({ ...f, purchaseCost: 0 }));
                      }}
                      onChange={(e) => {
                        let raw = e.target.value.replace(/[^0-9.]/g, "");
                        raw = raw.replace(/(\..*)\./g, "$1");
                        setForm((f) => ({
                          ...f,
                          purchaseCost: raw === "" ? 0 : raw.endsWith(".") ? raw : Number(raw),
                        }));
                      }}
                      className={inp(errors.purchaseCost)}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cost Price (₹) · per packet *" error={errors.costPrice}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.costPrice === 0 ? "" : form.costPrice}
                        onFocus={() => {
                          if (form.costPrice === 0) setForm((f) => ({ ...f, costPrice: "" }));
                        }}
                        onBlur={() => {
                          if (form.costPrice === "") setForm((f) => ({ ...f, costPrice: 0 }));
                        }}
                        onChange={(e) => {
                          let raw = e.target.value.replace(/[^0-9.]/g, "");
                          raw = raw.replace(/(\..*)\./g, "$1");
                          setForm((f) => ({
                            ...f,
                            costPrice: raw === "" ? 0 : raw.endsWith(".") ? raw : Number(raw),
                            mrpManual: "",
                          }));
                        }}
                        className={inp(errors.costPrice)}
                      />
                    </Field>
                    <Field label="Profit %" error={errors.profitPct}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.profitPct === 0 ? "" : form.profitPct}
                        onFocus={() => {
                          if (form.profitPct === 0) setForm((f) => ({ ...f, profitPct: "" }));
                        }}
                        onBlur={() => {
                          if (form.profitPct === "") setForm((f) => ({ ...f, profitPct: 0 }));
                        }}
                        onChange={(e) => {
                          let raw = e.target.value.replace(/[^0-9.]/g, "");
                          raw = raw.replace(/(\..*)\./g, "$1");
                          setForm((f) => ({
                            ...f,
                            profitPct: raw === "" ? 0 : raw.endsWith(".") ? raw : Number(raw),
                            mrpManual: "",
                          }));
                        }}
                        className={inp(errors.profitPct)}
                      />
                    </Field>
                  </div>

                  {form.costPrice > 0 && form.purchaseCost > 0 && (
                    <div
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: costBuffer >= 0 ? "#fff8e1" : "#fef2f2",
                        border: `1px solid ${costBuffer >= 0 ? "#fde68a" : "#fecaca"}`,
                      }}
                    >
                      <span
                        style={{
                          color: costBuffer >= 0 ? "#92400e" : "#dc2626",
                        }}
                      >
                        {costBuffer >= 0
                          ? "Cost Price buffer over Purchase Cost"
                          : "⚠ Cost Price is below Purchase Cost"}
                      </span>
                      <span
                        className="font-bold"
                        style={{
                          color: costBuffer >= 0 ? "#92400e" : "#dc2626",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {costBuffer >= 0 ? "+" : ""}₹{costBuffer}
                      </span>
                    </div>
                  )}

                  {form.costPrice > 0 && (
                    <div
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <span style={{ color: "#15803d" }}>Auto-calculated MRP</span>
                      <span
                        className="font-bold"
                        style={{
                          color: "#15803d",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        ₹{autoMrp}
                      </span>
                    </div>
                  )}

                  <Field
                    label={`MRP (₹) · per packet — ${mrpIsOverridden ? "Manually adjusted" : "Auto from cost + profit%"}`}
                    error={errors.mrp}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.mrpManual !== "" ? form.mrpManual : autoMrp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        const manualMrp = val === "" ? 0 : Number(val);
                        setForm((f) => {
                          const newPct =
                            f.costPrice > 0 && manualMrp > 0
                              ? parseFloat(
                                  (((manualMrp - f.costPrice) / f.costPrice) * 100).toFixed(1),
                                )
                              : f.profitPct;
                          return { ...f, mrpManual: val, profitPct: newPct };
                        });
                      }}
                      className={inp(errors.mrp)}
                      placeholder={String(autoMrp)}
                    />
                  </Field>

                  {form.costPrice > 0 && finalMrp > 0 && (
                    <div
                      className="rounded-xl p-3 flex flex-col gap-1.5 text-xs"
                      style={{
                        background: mrpIsOverridden ? "#fff8e1" : "#f4f1eb",
                        border: `1px solid ${mrpIsOverridden ? "#fde68a" : "#e0dbd0"}`,
                      }}
                    >
                      {mrpIsOverridden && (
                        <div
                          className="flex items-center gap-1.5 font-semibold mb-1"
                          style={{ color: "#92400e" }}
                        >
                          <span>⚠</span>
                          <span>MRP manually adjusted</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span style={{ color: "#7a7060" }}>Purchase Cost</span>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#b5813a",
                          }}
                        >
                          ₹{form.purchaseCost}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "#7a7060" }}>Cost Price</span>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#1a1a12",
                          }}
                        >
                          ₹{form.costPrice}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "#7a7060" }}>Final MRP</span>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#1a1a12",
                          }}
                        >
                          ₹{finalMrp}
                        </span>
                      </div>
                      <div
                        className="flex justify-between font-semibold border-t pt-1.5 mt-0.5"
                        style={{ borderColor: "#e0dbd0" }}
                      >
                        <span style={{ color: "#3d7a4f" }}>Actual Profit</span>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#3d7a4f",
                          }}
                        >
                          ₹{actualProfit} ({actualPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span style={{ color: "#b5813a" }}>True Profit</span>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#b5813a",
                          }}
                        >
                          ₹{finalMrp - form.purchaseCost} (
                          {finalMrp > 0
                            ? (((finalMrp - form.purchaseCost) / finalMrp) * 100).toFixed(1)
                            : "0.0"}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "#e0dbd0" }}>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                style={{ background: "#3d7a4f", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : editVariantId ? "Save Changes" : "Add to Inventory"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <div className="text-4xl text-center mb-3">🗑</div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: "#1a1a12" }}>
              {deleteTarget.type === "parent"
                ? "Remove seed & all variants?"
                : "Remove this variant?"}
            </h3>
            <p className="text-sm text-center mb-2 font-medium" style={{ color: "#3d7a4f" }}>
              {deleteTarget.label}
            </p>
            <p className="text-sm text-center mb-5" style={{ color: "#7a7060" }}>
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#dc2626", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7a7060" }}>
        {label}
      </label>
      {children}
      {error && (
        <span className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </span>
      )}
    </div>
  );
}

function inp(error) {
  return `w-full px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30 transition-all border border-[#e0dbd0] ${
    error ? "ring-2 ring-red-300" : ""
  }`;
}
