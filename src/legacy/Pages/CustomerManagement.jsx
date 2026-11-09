// src/pages/CustomerManagement.jsx
import { useState, useMemo } from "react";
import { useAppStore } from "../Store/useAppStore";
import { useToast } from "../Context/ToastContext";
import Loader from "../Components/Loader";

function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function payStatusStyle(status) {
  if (status === "Paid") return { background: "#f0fdf4", color: "#15803d" };
  if (status === "Partially Paid") return { background: "#fff7ed", color: "#c2410c" };
  return { background: "#fef2f2", color: "#dc2626" };
}

const EMPTY_FORM = { name: "", phone: "", place: "", notes: "" };

export default function CustomerManagement() {
  const { customers, addCustomer, editCustomer, removeCustomer, loadCustomerDetail } =
    useAppStore();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("list");

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [detail, setDetail] = useState(null); // { Customer, sales }
  const [detailLoading, setDetailLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewBill, setViewBill] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...customers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.phone || "").includes(q) ||
          (u.place || "").toLowerCase().includes(q),
      );
  }, [customers, search]);

  async function openCustomer(id) {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const data = await loadCustomerDetail(id);
      setDetail(data);
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Failed to load customer", "error");
      setSelectedCustomerId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedCustomerId(null);
    setDetail(null);
  }

  function openAddNew() {
    setForm(EMPTY_FORM);
    setEditCustomerId(null);
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(customer) {
    setForm({
      name: customer.name,
      phone: customer.phone,
      place: customer.place || "",
      notes: customer.notes || "",
    });
    setEditCustomerId(customer._id);
    setErrors({});
    setDrawerOpen(true);
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      if (editCustomerId) {
        const updated = await editCustomer(editCustomerId, form);
        toast("Customer updated", "info");
        if (selectedCustomerId === editCustomerId) {
          setDetail((d) => (d ? { ...d, customer: updated } : d));
        }
      } else {
        await addCustomer(form);
        toast("Customer added");
      }
      setDrawerOpen(false);
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Failed to save customer", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeCustomer(deleteTarget._id);
      toast("Customer deleted", "error");
      if (selectedCustomerId === deleteTarget._id) closeDetail();
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  }

  // ── Single-Customer full detail view — replaces everything else on screen ──
  if (selectedCustomerId) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1000px] mx-auto">
        <button
          onClick={closeDetail}
          className="flex items-center gap-1.5 text-sm font-medium self-start"
          style={{ color: "#3d7a4f" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to all Customers
        </button>

        {detailLoading || !detail ? (
          <div
            className="py-20 text-center bg-white rounded-2xl"
            style={{ border: "1px solid #e0dbd0" }}
          >
            <Loader label="Loading customer…" />
          </div>
        ) : (
          <>
            <div
              className="bg-white rounded-2xl p-5 flex flex-col gap-4"
              style={{
                border: "1px solid #e0dbd0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1
                    className="text-2xl"
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      color: "#1a1a12",
                    }}
                  >
                    {detail.customer?.name}
                  </h1>
                  <div className="text-sm mt-1 flex flex-col gap-0.5" style={{ color: "#7a7060" }}>
                    <span>{detail.customer.phone}</span>
                    {detail.customer.place && <span>{detail.customer.place}</span>}
                  </div>
                  {detail.customer.notes && (
                    <p className="text-sm mt-2 italic" style={{ color: "#b0a898" }}>
                      {detail.customer.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(detail.customer)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-[#f0ebe1]"
                    style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(detail.customer)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "#fef2f2", color: "#dc2626" }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total Orders",
                    value: detail.customer.totalOrders,
                    color: "#3d7a4f",
                  },
                  {
                    label: "Total Spent",
                    value: fmt(detail.customer.totalSpent),
                    color: "#1a1a12",
                  },
                  {
                    label: "Total Paid",
                    value: fmt(detail.customer.totalPaid),
                    color: "#15803d",
                  },
                  {
                    label: "Outstanding",
                    value: fmt(detail.customer.totalOutstanding),
                    color: detail.customer.totalOutstanding > 0 ? "#dc2626" : "#15803d",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
                    style={{ background: "#f4f1eb" }}
                  >
                    <span className="text-xs font-medium" style={{ color: "#b0a898" }}>
                      {k.label}
                    </span>
                    <span
                      className="text-base font-bold"
                      style={{
                        color: k.color,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {k.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                border: "1px solid #e0dbd0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="px-5 py-4 font-semibold text-sm"
                style={{ color: "#1a1a12", borderBottom: "1px solid #f0ebe1" }}
              >
                Purchase History ({detail.sales.length})
              </div>
              {detail.sales.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: "#b0a898" }}>
                  No purchases yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f0ebe1" }}>
                        {["Invoice No.", "Date", "Items", "Total", "Status"].map((h) => (
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
                      {detail.sales.map((s) => (
                        <tr
                          key={s._id}
                          onClick={() => setViewBill(s)}
                          className="border-b last:border-0 hover:bg-[#faf8f4] cursor-pointer transition-colors"
                          style={{ borderColor: "#f0ebe1" }}
                        >
                          <td
                            className="px-4 py-3 font-semibold"
                            style={{
                              color: "#3d7a4f",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 11,
                            }}
                          >
                            {s.invoiceNo}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#7a7060" }}>
                            {new Date(s.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#7a7060" }}>
                            {s.items.length}
                          </td>
                          <td
                            className="px-4 py-3 font-semibold text-xs"
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              color: "#1a1a12",
                            }}
                          >
                            {fmt(s.total)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={payStatusStyle(s.paymentStatus)}
                            >
                              {s.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {drawerOpen && (
          <CustomerFormDrawer
            form={form}
            setForm={setForm}
            errors={errors}
            saving={saving}
            editCustomerId={editCustomerId}
            onCancel={() => setDrawerOpen(false)}
            onSave={handleSave}
          />
        )}

        {deleteTarget && (
          <DeleteConfirm
            label={deleteTarget.name}
            deleting={deleting}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
          />
        )}

        {viewBill && <BillPreview bill={viewBill} onClose={() => setViewBill(null)} />}
      </div>
    );
  }

  // ── List / grid of all Customers ──
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="hidden md:block">
          <h1
            className="text-2xl text-[#1a1a12]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Customer Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7a7060" }}>
            {customers.length} customers
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div
            className="flex items-center p-1 rounded-xl gap-0.5"
            style={{ background: "#ece8df" }}
          >
            {["list", "grid"].map((l) => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                style={{
                  background: layout === l ? "#fff" : "transparent",
                  color: layout === l ? "#1a1a12" : "#7a7060",
                  boxShadow: layout === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={openAddNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
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
            Add Customer
          </button>
        </div>
      </div>

      <div className="relative">
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
          placeholder="Search name, phone, or place…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
          style={{ border: "1px solid #e0dbd0" }}
        />
      </div>

      {filtered.length === 0 ? (
        <div
          className="py-20 text-center bg-white rounded-2xl"
          style={{ border: "1px solid #e0dbd0" }}
        >
          <div className="text-4xl mb-3">👤</div>
          <div className="text-base font-medium" style={{ color: "#7a7060" }}>
            No customers found
          </div>
        </div>
      ) : layout === "list" ? (
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            border: "1px solid #e0dbd0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #f0ebe1",
                    background: "#faf8f4",
                  }}
                >
                  {["Name", "Phone", "Place", "Orders", "Total Spent", "Outstanding"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold"
                      style={{ color: "#b0a898" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer._id}
                    onClick={() => openCustomer(customer._id)}
                    className="border-b last:border-0 hover:bg-[#faf8f4] cursor-pointer transition-colors"
                    style={{ borderColor: "#f0ebe1" }}
                  >
                    <td className="px-4 py-3.5 font-semibold" style={{ color: "#1a1a12" }}>
                      {customer.name}
                    </td>
                    <td
                      className="px-4 py-3.5 text-xs"
                      style={{
                        color: "#7a7060",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {customer.phone}
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: "#7a7060" }}>
                      {customer.place || "—"}
                    </td>
                    <td
                      className="px-4 py-3.5 text-xs"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: "#7a7060",
                      }}
                    >
                      {customer.totalOrders}
                    </td>
                    <td
                      className="px-4 py-3.5 font-semibold text-xs"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: "#1a1a12",
                      }}
                    >
                      {fmt(customer.totalSpent)}
                    </td>
                    <td
                      className="px-4 py-3.5 font-semibold text-xs"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: customer.totalOutstanding > 0 ? "#dc2626" : "#15803d",
                      }}
                    >
                      {fmt(customer.totalOutstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((customer) => (
            <div
              key={customer._id}
              onClick={() => openCustomer(customer._id)}
              className="bg-white rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
              style={{
                border: "1px solid #e0dbd0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div className="font-semibold text-sm" style={{ color: "#1a1a12" }}>
                {customer.name}
              </div>
              <div
                className="text-xs"
                style={{
                  color: "#7a7060",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {customer.phone}
              </div>
              {customer.place && (
                <div className="text-xs" style={{ color: "#b0a898" }}>
                  {customer.place}
                </div>
              )}
              <div
                className="flex items-center justify-between pt-2 mt-1 border-t"
                style={{ borderColor: "#f0ebe1" }}
              >
                <div>
                  <div className="text-xs" style={{ color: "#b0a898" }}>
                    Orders
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#1a1a12" }}>
                    {customer.totalOrders}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: "#b0a898" }}>
                    Outstanding
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{
                      color: customer.totalOutstanding > 0 ? "#dc2626" : "#15803d",
                    }}
                  >
                    {fmt(customer.totalOutstanding)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {drawerOpen && (
        <CustomerFormDrawer
          form={form}
          setForm={setForm}
          errors={errors}
          saving={saving}
          editCustomerId={editCustomerId}
          onCancel={() => setDrawerOpen(false)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.name}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function CustomerFormDrawer({ form, setForm, errors, saving, editCustomerId, onCancel, onSave }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
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
            {editCustomerId ? "Edit Customer" : "Add Customer"}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-[#f0ebe1]"
            style={{ color: "#7a7060" }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <FormField label="Name *" error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inp(errors.name)}
              placeholder="Customer name"
            />
          </FormField>
          <FormField label="Phone Number *" error={errors.phone}>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inp(errors.phone)}
              placeholder="10-digit number"
            />
          </FormField>
          <FormField label="Place / Town">
            <input
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              className={inp()}
              placeholder="Optional"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inp() + " resize-none"}
              rows={3}
              placeholder="Optional notes about this customer…"
            />
          </FormField>
        </div>

        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "#e0dbd0" }}>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ background: "#3d7a4f", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : editCustomerId ? "Save Changes" : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ label, deleting, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <div className="text-4xl text-center mb-3">🗑</div>
        <h3 className="text-base font-semibold text-center mb-1" style={{ color: "#1a1a12" }}>
          Delete this customer?
        </h3>
        <p className="text-sm text-center mb-2 font-medium" style={{ color: "#3d7a4f" }}>
          {label}
        </p>
        <p className="text-sm text-center mb-5" style={{ color: "#7a7060" }}>
          Their bills will be kept but unlinked. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#dc2626", opacity: deleting ? 0.7 : 1 }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BillPreview({ bill, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl bg-white"
          style={{ border: "1px solid #e0dbd0" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #e0dbd0" }}
          >
            <span
              className="font-semibold text-sm"
              style={{
                color: "#3d7a4f",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {bill.invoiceNo}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0ebe1] text-lg"
              style={{ color: "#7a7060" }}
            >
              ✕
            </button>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {bill.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                style={{ borderColor: "#f0ebe1" }}
              >
                <span style={{ color: "#1a1a12" }}>
                  {item.seedName} — {item.packageSize} × {item.qty}
                </span>
                <span className="font-semibold" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {fmt(item.lineTotal)}
                </span>
              </div>
            ))}
            <div
              className="flex justify-between font-bold pt-2 mt-1 border-t"
              style={{ borderColor: "#e0dbd0", color: "#1a1a12" }}
            >
              <span>Total</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{fmt(bill.total)}</span>
            </div>
            <span
              className="text-xs px-2 py-1 rounded-full font-medium self-start mt-1"
              style={payStatusStyle(bill.paymentStatus)}
            >
              {bill.paymentStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, error }) {
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
