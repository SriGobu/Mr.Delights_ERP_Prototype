import { useState, useMemo, useRef } from "react";
import { useAppStore } from "../Store/useAppStore";
import { useToast } from "../Context/ToastContext";
import { COMPANY } from "../Constants/appConstants";
import logo from "/logo.PNG";
function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
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

function payStatusStyle(status) {
  if (status === "Paid") return { background: "#f0fdf4", color: "#15803d" };
  if (status === "Partially Paid") return { background: "#fff7ed", color: "#c2410c" };
  return { background: "#fef2f2", color: "#dc2626" };
}

export default function Sales() {
  const { seedVariants, sales, customers, addSale, editSale, removeSale, refreshInventory } =
    useAppStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [modal, setModal] = useState(null); // 'new' | 'edit' | null
  const [viewBill, setViewBill] = useState(null);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [layout, setLayout] = useState("list");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const tempIdRef = useRef(0);
  const nextTempId = () => ++tempIdRef.current;

  function printBill(sale) {
    const rows = sale.items
      .map(
        (item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0ebe0"};border-bottom:1px solid #e8e0d0;">
        <td style="padding:8px 10px;font-weight:600;color:#1a2b1c;">${item.seedName}</td>
        <td style="padding:8px 10px;text-align:center;color:#4a4035;">
          <span style="background:#e8e0d0;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">${item.packageSize}</span>
        </td>
        <td style="padding:8px 10px;text-align:center;color:#4a4035;font-family:'Courier New',monospace;">${item.qty}</td>
        <td style="padding:8px 10px;text-align:right;color:#4a4035;font-family:'Courier New',monospace;">&#8377;${item.unitPrice.toFixed(2)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;color:#1a2b1c;font-family:'Courier New',monospace;">&#8377;${item.lineTotal.toFixed(2)}</td>
      </tr>`,
      )
      .join("");

    const cash = sale.payment.cash,
      upi = sale.payment.upi,
      card = sale.payment.card;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${sale.invoiceNo}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Georgia,serif;background:#f5f0e8;padding:32px;color:#1a1a12;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@media print{body{padding:16px;}@page{margin:12mm;}}</style>
      </head><body><div style="max-width:760px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img
              src="${window.location.origin}/mr-delights-dashboard.svg"
              alt="${COMPANY.NAME}"
              style="width:48px;height:48px;object-fit:contain;"
            />
            <div>
              <div style="font-size:26px;font-weight:900;color:#1a2b1c;font-family:Georgia,serif;">${COMPANY.NAME}</div>
              <div style="font-size:11px;color:#b5813a;font-weight:600;margin-top:3px;">${COMPANY.TAGLINE}</div>
              <div style="margin-top:5px;border:1px solid #1a2b1c;display:inline-block;padding:2px 6px;font-size:9px;font-family:'Courier New',monospace;color:#1a2b1c;"><em>fssai</em> ${COMPANY.FSSAI_NO}</div>
            </div>
          </div>
        </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:12px;color:#4a4035;border-top:1px solid #c8bfa8;padding-top:10px;">
          <div><div>${COMPANY.ADDRESS}</div><div>${COMPANY.PHONE}</div></div>
          <div style="text-align:right;">
            <div><strong style="color:#1a2b1c;">Invoice No:</strong> <span style="font-family:'Courier New',monospace;">${sale.invoiceNo}</span></div>
            <div><strong style="color:#1a2b1c;">Date:</strong> ${new Date(sale.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div><strong style="color:#1a2b1c;">REF No:</strong> <span style="font-family:'Courier New',monospace;">${sale.refNo}</span></div>
          </div>
        </div>
        <div style="margin-bottom:14px;font-size:12px;border-top:1px solid #c8bfa8;padding-top:10px;">
          <div style="font-weight:700;font-size:13px;color:#1a2b1c;margin-bottom:4px;">BILL TO:</div>
          ${sale.customerName ? `<div>${sale.customerName}</div>${sale.customerPhone ? `<div>${sale.customerPhone}</div>` : ""}${sale.customerPlace ? `<div>${sale.customerPlace}</div>` : ""}` : '<div style="color:#9a8e7e;">Walk-in Customer</div>'}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;border:1px solid #d4c9b0;">
          <thead><tr style="background:#1a2b1c;">
            <th style="padding:8px 10px;text-align:left;color:#d4af37;font-size:10px;letter-spacing:0.06em;">PRODUCT</th>
            <th style="padding:8px 10px;text-align:center;color:#d4af37;font-size:10px;letter-spacing:0.06em;">VARIANT</th>
            <th style="padding:8px 10px;text-align:center;color:#d4af37;font-size:10px;letter-spacing:0.06em;">QTY</th>
            <th style="padding:8px 10px;text-align:right;color:#d4af37;font-size:10px;letter-spacing:0.06em;">RATE/PKT</th>
            <th style="padding:8px 10px;text-align:right;color:#d4af37;font-size:10px;letter-spacing:0.06em;">AMOUNT</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
          <div style="width:300px;border:1px solid #d4c9b0;font-size:13px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;padding:7px 12px;background:#faf7f0;color:#4a4035;border-bottom:1px solid #e0d8c8;"><span>Subtotal</span><span style="font-family:'Courier New',monospace;">&#8377;${sale.subtotal.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:7px 12px;background:#faf7f0;color:${sale.discountAmount > 0 ? "#15803d" : "#b0a898"};border-bottom:1px solid #e0d8c8;"><span>Discount ${sale.discountPct > 0 ? `(${sale.discountPct}%)` : ""}</span><span style="font-family:'Courier New',monospace;">${sale.discountAmount > 0 ? `-&#8377;${sale.discountAmount.toFixed(2)}` : "&#8212;"}</span></div>
            <div style="display:flex;justify-content:space-between;padding:7px 12px;background:#faf7f0;color:${sale.deliveryCharge > 0 ? "#4a4035" : "#b0a898"};border-bottom:1px solid #e0d8c8;"><span>Delivery Charge</span><span style="font-family:'Courier New',monospace;">${sale.deliveryCharge > 0 ? `+&#8377;${sale.deliveryCharge.toFixed(2)}` : "&#8212;"}</span></div>
            <div style="display:flex;justify-content:space-between;padding:9px 12px;background:#1a2b1c;color:#d4af37;font-weight:700;"><span style="letter-spacing:0.08em;font-size:11px;">TOTAL</span><span style="font-family:'Courier New',monospace;">&#8377;${sale.total.toFixed(2)}</span></div>
            ${cash > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 12px;background:#faf7f0;color:#4a4035;border-bottom:1px solid #e0d8c8;"><span>Cash</span><span style="font-family:'Courier New',monospace;">&#8377;${cash.toFixed(2)}</span></div>` : ""}
            ${upi > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 12px;background:#faf7f0;color:#1d4ed8;border-bottom:1px solid #e0d8c8;"><span>UPI</span><span style="font-family:'Courier New',monospace;">&#8377;${upi.toFixed(2)}</span></div>` : ""}
            ${card > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 12px;background:#faf7f0;color:#6b21a8;"><span>Card</span><span style="font-family:'Courier New',monospace;">&#8377;${card.toFixed(2)}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;padding:6px 12px;background:${sale.paymentStatus === "Paid" ? "#f0fdf4" : "#fff7ed"};border-top:1px solid #e0d8c8;font-weight:700;font-size:11px;"><span>${sale.paymentStatus}</span><span></span></div>
          </div>
        </div>
        <div style="text-align:center;border-top:1px solid #c8bfa8;padding-top:12px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#1a2b1c;text-transform:uppercase;">THANK YOU FOR YOUR BUSINESS!</div>
      </div>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=700,height=900");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  // ─── New sale form state ───
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPlace, setCustomerPlace] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null); // NEW — the real, unambiguous link
  const [lineItems, setLineItems] = useState(() => [
    { tempId: Date.now(), variantId: "", qty: "" },
  ]);
  const [discountPct, setDiscountPct] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [refNo, setRefNo] = useState("");
  const [payCash, setPayCash] = useState("");
  const [payUpi, setPayUpi] = useState("");
  const [payCard, setPayCard] = useState("");

  const variantMap = useMemo(() => {
    const m = {};
    seedVariants.forEach((v) => (m[v._id] = v));
    return m;
  }, [seedVariants]);

  // CHANGED — grouped by name (an ARRAY per name), because two different
  // real customers can share a name. Name alone is never a safe key: only
  // phone / _id are guaranteed unique, so we must never silently merge on
  // name alone (that was the root cause of the customer-conflict bug).
  const customersByName = useMemo(() => {
    const m = {};
    customers.forEach((c) => {
      const key = c.name.trim().toLowerCase();
      (m[key] = m[key] || []).push(c);
    });
    return m;
  }, [customers]);

  // NEW — phone is the actual unique key on the backend, so resolve the
  // link from phone whenever the user types/edits it directly.
  const customersByPhone = useMemo(() => {
    const m = {};
    customers.forEach((c) => {
      if (c.phone) m[c.phone.trim()] = c;
    });
    return m;
  }, [customers]);

  // Plain unique names for the datalist — just a typing convenience now,
  // no longer used to resolve which actual customer record this is.
  const customerNameOptions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.name))),
    [customers],
  );

  // CHANGED — only auto-fill (and link) when the typed name is unambiguous.
  // If two customers share this name, we deliberately do NOT guess — the
  // user has to confirm via phone, which is what actually resolves the id.
  function handleCustomerNameChange(value) {
    setCustomerName(value);
    const matches = customersByName[value.trim().toLowerCase()] || [];
    if (matches.length === 1) {
      const c = matches[0];
      setCustomerPhone(c.phone || "");
      setCustomerPlace(c.place || "");
      setSelectedCustomerId(c._id);
    } else {
      setSelectedCustomerId(null);
    }
  }

  // NEW — phone is authoritative. If what's typed matches a known
  // customer's phone exactly, lock onto that customer's real id.
  function handleCustomerPhoneChange(value) {
    setCustomerPhone(value);
    const match = customersByPhone[value.trim()];
    setSelectedCustomerId(match ? match._id : null);
    if (match) {
      if (!customerName.trim()) setCustomerName(match.name);
      if (!customerPlace.trim()) setCustomerPlace(match.place || "");
    }
  }

  const subtotal = lineItems.reduce((sum, li) => {
    const v = variantMap[li.variantId];
    return sum + (v ? v.mrp * (li.qty || 0) : 0);
  }, 0);
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const total = Math.max(0, subtotal - discountAmount + Number(deliveryCharge || 0));
  const totalPaid = (Number(payCash) || 0) + (Number(payUpi) || 0) + (Number(payCard) || 0);
  const balance = total - totalPaid;

  function resetForm() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerPlace("");
    setSelectedCustomerId(null); // NEW
    setLineItems([{ tempId: nextTempId(), variantId: "", qty: "" }]);
    setDiscountPct(0);
    setDeliveryCharge(0);
    setRefNo("");
    setPayCash("");
    setPayUpi("");
    setPayCard("");
    setSubmitError("");
    setEditingSaleId(null);
  }

  function closeModal() {
    setModal(null);
    resetForm();
  }

  // When editing, a variant's true available stock is its current stock
  // PLUS whatever this sale already has reserved against it (since that
  // stock was deducted when the sale was originally created).
  const originalItemsMap = useMemo(() => {
    if (!editingSaleId) return {};
    const sale = sales.find((s) => s._id === editingSaleId);
    if (!sale) return {};
    const m = {};
    sale.items.forEach((item) => {
      m[item.variantId] = (m[item.variantId] || 0) + item.qty;
    });
    return m;
  }, [editingSaleId, sales]);

  function effectiveStock(variant) {
    return variant.stock + (originalItemsMap[variant._id] || 0);
  }

  function openEdit(sale) {
    setCustomerName(sale.customerName || "");
    setCustomerPhone(sale.customerPhone || "");
    setCustomerPlace(sale.customerPlace || "");
    setSelectedCustomerId(sale.customerId || null); // NEW — keep the original link
    setLineItems(
      sale.items.map((item) => ({
        tempId: nextTempId(),
        variantId: item.variantId,
        qty: item.qty,
      })),
    );
    setDiscountPct(sale.discountPct || 0);
    setDeliveryCharge(sale.deliveryCharge || 0);
    setRefNo(sale.refNo || "");
    setPayCash(sale.payment.cash || "");
    setPayUpi(sale.payment.upi || "");
    setPayCard(sale.payment.card || "");
    setSubmitError("");
    setEditingSaleId(sale._id);
    setModal("edit");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeSale(deleteTarget._id);
      toast("Bill deleted, stock restored", "error");
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || "Failed to delete bill", "error");
    } finally {
      setDeleting(false);
    }
  }

  function updateLine(idx, field, value) {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)));
  }

  async function handleGenerate() {
    const valid = lineItems.filter((li) => li.variantId && li.qty > 0);
    if (!valid.length) {
      setSubmitError("Add at least one item");
      return;
    }
    if (totalPaid > total) {
      setSubmitError("Payment amount exceeds invoice total");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    const payload = {
      customerId: selectedCustomerId, // NEW — explicit, authoritative link to the customer record
      customerName,
      customerPhone,
      customerPlace,
      refNo: refNo.trim(),
      items: valid.map((li) => ({ variantId: li.variantId, qty: li.qty })),
      discountPct,
      deliveryCharge,
      payment: {
        cash: Number(payCash) || 0,
        upi: Number(payUpi) || 0,
        card: Number(payCard) || 0,
      },
    };
    try {
      if (editingSaleId) {
        await editSale(editingSaleId, payload);
      } else {
        await addSale({ ...payload, date: new Date().toISOString() });
        await refreshInventory();
      }
      resetForm();
      setModal(null);
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to ${editingSaleId ? "update" : "create"} sale`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(
    () =>
      [...sales]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .filter((s) => {
          const q = search.toLowerCase();
          const matchSearch =
            s.billNo.toLowerCase().includes(q) ||
            (s.invoiceNo || "").toLowerCase().includes(q) ||
            s.customerName.toLowerCase().includes(q) ||
            (s.customerPhone || "").includes(q) ||
            s.items.some((i) => i.sku.toLowerCase().includes(q));
          const matchPay = payFilter === "All" || s.paymentStatus === payFilter;
          return matchSearch && matchPay;
        }),
    [sales, search, payFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const IconList = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
  const IconGrid = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="hidden md:block">
          <h1
            className="text-2xl text-[#1a1a12]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Sales
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7a7060" }}>
            {sales.length} transactions recorded
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
                className="p-1.5 rounded-lg transition-all"
                style={{
                  background: layout === l ? "#fff" : "transparent",
                  color: layout === l ? "#3d7a4f" : "#7a7060",
                  boxShadow: layout === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {l === "list" ? <IconList /> : <IconGrid />}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              downloadCSV(
                "sales.csv",
                [
                  "Invoice No",
                  "REF No",
                  "Date",
                  "Customer",
                  "Phone",
                  "Place",
                  "Items",
                  "Subtotal",
                  "Discount",
                  "Delivery",
                  "Total",
                  "Cash",
                  "UPI",
                  "Card",
                  "Status",
                ],
                filtered.map((s) => [
                  s.billNo,
                  s.refNo,
                  s.invoiceNo,
                  s.date,
                  s.customerName || "Walk-in",
                  s.customerPhone,
                  s.customerPlace,
                  s.items.length,
                  s.subtotal,
                  s.discountAmount,
                  s.deliveryCharge,
                  s.total,
                  s.payment.cash,
                  s.payment.upi,
                  s.payment.card,
                  s.paymentStatus,
                ]),
              )
            }
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
            onClick={() => {
              resetForm();
              setModal("new");
            }}
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
            New Sale
          </button>
        </div>
      </div>

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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search invoice no., bill no., customer, phone, SKU…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
            style={{ border: "1px solid #e0dbd0" }}
          />
        </div>
        <select
          value={payFilter}
          onChange={(e) => {
            setPayFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none"
          style={{ border: "1px solid #e0dbd0", color: "#4a4035" }}
        >
          <option value="All">All Status</option>
          <option>Paid</option>
          <option>Partially Paid</option>
          <option>Pending</option>
        </select>
      </div>

      {layout === "list" && (
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            border: "1px solid #e0dbd0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl mb-3">🧾</div>
              <div className="text-base font-medium" style={{ color: "#7a7060" }}>
                No transactions found
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid #f0ebe1",
                      background: "#faf8f4",
                    }}
                  >
                    {[
                      "Invoice No.",
                      "Date",
                      "Customer",
                      "Items",
                      "Total",
                      "Payment",
                      "Status",
                      "Actions",
                    ].map((h) => (
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
                  {paginated.map((s) => (
                    <tr
                      key={s._id}
                      className="border-b last:border-0 hover:bg-[#faf8f4] transition-colors"
                      style={{ borderColor: "#f0ebe1" }}
                    >
                      <td
                        className="px-4 py-3.5 font-semibold"
                        style={{
                          color: "#3d7a4f",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                        }}
                      >
                        {s.invoiceNo}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: "#7a7060" }}>
                        {new Date(s.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-xs" style={{ color: "#1a1a12" }}>
                          {s.customerName || <span style={{ color: "#b0a898" }}>Walk-in</span>}
                        </div>
                        {s.customerPlace && (
                          <div className="text-xs" style={{ color: "#b0a898" }}>
                            {s.customerPlace}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: "#7a7060" }}>
                        {s.items.length}
                      </td>
                      <td
                        className="px-4 py-3.5 font-semibold text-xs"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          color: "#1a1a12",
                        }}
                      >
                        {fmt(s.total)}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {s.payment.cash > 0 && (
                          <span className="mr-1" style={{ color: "#15803d" }}>
                            C:{fmt(s.payment.cash)}
                          </span>
                        )}
                        {s.payment.upi > 0 && (
                          <span className="mr-1" style={{ color: "#1d4ed8" }}>
                            U:{fmt(s.payment.upi)}
                          </span>
                        )}
                        {s.payment.card > 0 && (
                          <span style={{ color: "#6b21a8" }}>K:{fmt(s.payment.card)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={payStatusStyle(s.paymentStatus)}
                        >
                          {s.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewBill(s)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium hover:opacity-80"
                            style={{ background: "#f0ebe1", color: "#3d7a4f" }}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-[#ece8df] transition-colors"
                            style={{ color: "#7a7060" }}
                            title="Edit bill"
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
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            style={{ color: "#dc2626" }}
                            title="Delete bill"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {layout === "grid" &&
        (filtered.length === 0 ? (
          <div
            className="py-20 text-center bg-white rounded-2xl"
            style={{ border: "1px solid #e0dbd0" }}
          >
            <div className="text-4xl mb-3">🧾</div>
            <div className="text-base font-medium" style={{ color: "#7a7060" }}>
              No transactions found
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {paginated.map((s) => (
              <div
                key={s._id}
                className="bg-white rounded-2xl p-3 flex flex-col gap-2"
                style={{
                  border: "1px solid #e0dbd0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="font-bold text-xs"
                    style={{
                      color: "#3d7a4f",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {s.invoiceNo}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={payStatusStyle(s.paymentStatus)}
                  >
                    {s.paymentStatus}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: "#1a1a12" }}>
                    {s.customerName || "Walk-in Customer"}
                  </div>
                  {s.customerPlace && (
                    <div className="text-xs" style={{ color: "#b0a898" }}>
                      {s.customerPlace}
                    </div>
                  )}
                  <div className="text-xs mt-0.5" style={{ color: "#b0a898" }}>
                    {new Date(s.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-xs" style={{ color: "#b0a898" }}>
                    {s.items.length} item{s.items.length !== 1 ? "s" : ""}
                  </div>
                  <div
                    className="text-xl font-bold"
                    style={{
                      color: "#1a1a12",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {fmt(s.total)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewBill(s)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80"
                    style={{ background: "#f0ebe1", color: "#3d7a4f" }}
                  >
                    View Bill
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg hover:opacity-80 transition-colors shrink-0"
                    style={{ color: "#7a7060", background: "#f0ebe1" }}
                    title="Edit bill"
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
                    onClick={() => setDeleteTarget(s)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                    style={{ color: "#dc2626" }}
                    title="Delete bill"
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
            ))}
          </div>
        ))}

      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs" style={{ color: "#7a7060" }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40"
              style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
            >
              Prev
            </button>
            <span className="text-xs px-2" style={{ color: "#4a4035" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-40"
              style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {(modal === "new" || modal === "edit") && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-end"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div
            className="h-full w-full sm:max-w-3xl bg-white flex flex-col"
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
                {editingSaleId ? "Edit Sale" : "New Sale"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-[#f0ebe1]"
                style={{ color: "#7a7060" }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "#7a7060" }}
                >
                  Customer (Optional)
                </div>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={customerName}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      placeholder="Customer name"
                      list="customer-suggestions"
                      className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                      style={{ border: "1px solid #e0dbd0" }}
                    />
                    <input
                      value={customerPhone}
                      onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                      placeholder="Phone number"
                      className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                      style={{ border: "1px solid #e0dbd0" }}
                    />
                  </div>
                  <datalist id="customer-suggestions">
                    {customerNameOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <input
                    value={customerPlace}
                    onChange={(e) => setCustomerPlace(e.target.value)}
                    placeholder="Place / Town"
                    className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                    style={{ border: "1px solid #e0dbd0" }}
                  />
                  {/* CHANGED — reflects a confirmed id match, not a name-text guess */}
                  {selectedCustomerId && (
                    <div
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ background: "#f0fdf4", color: "#15803d" }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Returning customer — linked by phone
                    </div>
                  )}
                  {!selectedCustomerId &&
                    customerName.trim() &&
                    (customersByName[customerName.trim().toLowerCase()] || []).length > 1 && (
                      <div
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                        style={{ background: "#fff7ed", color: "#c2410c" }}
                      >
                        Multiple customers share this name — enter their phone number to link the
                        right one.
                      </div>
                    )}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#7a7060" }}>
                      REF No{" "}
                      <span style={{ color: "#b0a898", fontWeight: 400 }}>
                        (leave blank to auto-generate)
                      </span>
                    </label>
                    <input
                      value={refNo}
                      onChange={(e) => setRefNo(e.target.value.toUpperCase())}
                      placeholder="e.g. AB12CD34"
                      className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                      style={{
                        border: "1px solid #e0dbd0",
                        fontFamily: "JetBrains Mono, monospace",
                        letterSpacing: "0.06em",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "#7a7060" }}
                >
                  Items
                </div>
                <div className="flex flex-col gap-3">
                  {lineItems.map((item, idx) => {
                    const v = variantMap[item.variantId];
                    return (
                      <div key={item.tempId} className="flex items-start gap-2">
                        <div
                          className="flex-1 grid gap-2"
                          style={{ gridTemplateColumns: "2fr 1fr" }}
                        >
                          <select
                            value={item.variantId}
                            onChange={(e) => updateLine(idx, "variantId", e.target.value)}
                            className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                            style={{
                              border: "1px solid #e0dbd0",
                              color: item.variantId ? "#1a1a12" : "#b0a898",
                            }}
                          >
                            <option value="">Select product…</option>
                            {seedVariants
                              .filter((sv) => effectiveStock(sv) > 0)
                              .map((sv) => (
                                <option key={sv._id} value={sv._id}>
                                  {sv.seedName} — {sv.packageSize} · ₹{sv.mrp} ({sv.stock} pkts)
                                </option>
                              ))}
                          </select>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Qty"
                            value={item.qty}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => {
                              if (item.qty === "") updateLine(idx, "qty", 1);
                            }}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, "");
                              updateLine(
                                idx,
                                "qty",
                                raw === ""
                                  ? ""
                                  : Math.min(Number(raw), v ? effectiveStock(v) : 999),
                              );
                            }}
                            className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                            style={{ border: "1px solid #e0dbd0" }}
                          />
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[72px] pt-2.5">
                          <span
                            className="text-sm font-semibold"
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              color: "#1a1a12",
                            }}
                          >
                            {v && item.qty ? fmt(v.mrp * item.qty) : "—"}
                          </span>
                          {v && item.qty > effectiveStock(v) && (
                            <span className="text-xs" style={{ color: "#dc2626" }}>
                              Max {effectiveStock(v)}
                            </span>
                          )}
                        </div>
                        {lineItems.length > 1 && (
                          <button
                            onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="mt-2 p-1.5 rounded-lg hover:bg-red-50"
                            style={{ color: "#dc2626" }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() =>
                      setLineItems((prev) => [
                        ...prev,
                        {
                          tempId: nextTempId(),
                          variantId: "",
                          qty: "",
                        },
                      ])
                    }
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    style={{ color: "#3d7a4f" }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add another item
                  </button>
                </div>
              </div>

              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "#7a7060" }}
                >
                  Charges & Discount
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#7a7060" }}>
                      Discount %
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={discountPct === 0 ? "" : discountPct}
                      onFocus={() => {
                        if (discountPct === 0) setDiscountPct("");
                      }}
                      onBlur={() => {
                        if (discountPct === "") setDiscountPct(0);
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setDiscountPct(raw === "" ? "" : Math.min(Number(raw), 100));
                      }}
                      className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                      style={{ border: "1px solid #e0dbd0" }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#7a7060" }}>
                      Delivery Charge (₹)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={deliveryCharge === 0 ? "" : deliveryCharge}
                      onFocus={() => {
                        if (deliveryCharge === 0) setDeliveryCharge("");
                      }}
                      onBlur={() => {
                        if (deliveryCharge === "") setDeliveryCharge(0);
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setDeliveryCharge(raw === "" ? "" : Number(raw));
                      }}
                      className="px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                      style={{ border: "1px solid #e0dbd0" }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "#f4f1eb" }}>
                <div className="flex justify-between text-sm" style={{ color: "#7a7060" }}>
                  <span>Subtotal</span>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      color: "#1a1a12",
                    }}
                  >
                    {fmt(subtotal)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: "#15803d" }}>
                    <span>Discount ({discountPct}%)</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      −{fmt(discountAmount)}
                    </span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: "#7a7060" }}>
                    <span>Delivery</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      +{fmt(deliveryCharge)}
                    </span>
                  </div>
                )}
                <div
                  className="border-t pt-2 flex justify-between font-bold"
                  style={{ borderColor: "#e0dbd0", color: "#1a1a12" }}
                >
                  <span>Total</span>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 17,
                    }}
                  >
                    {fmt(total)}
                  </span>
                </div>
              </div>

              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "#7a7060" }}
                >
                  Payment (Split allowed)
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: "Cash",
                      val: payCash,
                      set: setPayCash,
                      color: "#15803d",
                    },
                    {
                      label: "UPI",
                      val: payUpi,
                      set: setPayUpi,
                      color: "#1d4ed8",
                    },
                    {
                      label: "Card",
                      val: payCard,
                      set: setPayCard,
                      color: "#6b21a8",
                    },
                  ].map(({ label, val, set, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-sm font-semibold w-10 shrink-0" style={{ color }}>
                        {label}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={val}
                        onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="0"
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                        style={{ border: "1px solid #e0dbd0" }}
                      />
                    </div>
                  ))}
                </div>
                <div
                  className="mt-3 rounded-xl p-3 flex items-center justify-between text-sm"
                  style={{
                    background: balance === 0 ? "#f0fdf4" : balance > 0 ? "#fff7ed" : "#fef2f2",
                    border: `1px solid ${balance === 0 ? "#bbf7d0" : balance > 0 ? "#fed7aa" : "#fecaca"}`,
                  }}
                >
                  <span
                    className="font-semibold"
                    style={{
                      color: balance === 0 ? "#15803d" : balance > 0 ? "#c2410c" : "#dc2626",
                    }}
                  >
                    {balance === 0
                      ? "✓ Fully Paid"
                      : balance > 0
                        ? `⏳ Remaining: ${fmt(balance)}`
                        : `⚠ Over by: ${fmt(-balance)}`}
                  </span>
                  <span className="text-xs font-medium" style={{ color: "#7a7060" }}>
                    Paid: {fmt(totalPaid)}
                  </span>
                </div>
              </div>

              {submitError && (
                <div
                  className="rounded-xl p-3 text-sm font-medium"
                  style={{
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                  }}
                >
                  {submitError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "#e0dbd0" }}>
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={totalPaid > total || submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: "#3d7a4f" }}
              >
                {submitting
                  ? editingSaleId
                    ? "Saving…"
                    : "Generating…"
                  : editingSaleId
                    ? "Save Changes"
                    : "Generate Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewBill && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setViewBill(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl"
              style={{ background: "#f5f0e8" }}
            >
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  background: "#fff",
                  borderBottom: "1px solid #e0dbd0",
                }}
              >
                <span className="text-sm font-semibold truncate mr-2" style={{ color: "#1a1a12" }}>
                  <span
                    style={{
                      color: "#3d7a4f",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {viewBill.invoiceNo}
                  </span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => printBill(viewBill)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-[#f0ebe1]"
                    style={{ color: "#3d7a4f", border: "1px solid #e0dbd0" }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                  </button>
                  <button
                    onClick={() => setViewBill(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0ebe1] text-lg"
                    style={{ color: "#7a7060" }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div
                      className="text-lg font-black"
                      style={{
                        color: "#1a2b1c",
                        fontFamily: "'DM Serif Display', serif",
                      }}
                    >
                      {COMPANY.NAME}
                    </div>
                    <div className="text-xs font-medium" style={{ color: "#b5813a" }}>
                      {COMPANY.TAGLINE}
                    </div>
                    <div
                      className="mt-1 px-1.5 py-0.5 self-start text-xs border inline-block"
                      style={{
                        borderColor: "#1a2b1c",
                        color: "#1a2b1c",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 9,
                      }}
                    >
                      <span className="italic font-semibold">fssai</span> {COMPANY.FSSAI_NO}
                    </div>
                  </div>
                  <img
                    src={logo}
                    alt=""
                    className="rounded-full object-cover shrink-0"
                    style={{ width: 40, height: 40 }}
                  />
                </div>

                <div
                  className="flex items-start justify-between gap-2 text-[11px] border-t pt-2"
                  style={{ borderColor: "#d4c9b0", color: "#4a4035" }}
                >
                  <div>
                    <div>{COMPANY.ADDRESS}</div>
                    <div>{COMPANY.PHONE}</div>
                  </div>
                  <div className="text-right flex flex-col gap-0.5">
                    <div>
                      <span className="font-bold" style={{ color: "#1a2b1c" }}>
                        Invoice No:{" "}
                      </span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {viewBill.invoiceNo}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: "#1a2b1c" }}>
                        Date:{" "}
                      </span>
                      {new Date(viewBill.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: "#1a2b1c" }}>
                        REF No:{" "}
                      </span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {viewBill.refNo}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="text-[11px] border-t pt-2 flex flex-col gap-0.5"
                  style={{ borderColor: "#d4c9b0" }}
                >
                  <div className="font-bold text-xs mb-0.5" style={{ color: "#1a2b1c" }}>
                    BILL TO:
                  </div>
                  {viewBill.customerName ? (
                    <>
                      <span style={{ color: "#4a4035" }}>{viewBill.customerName}</span>
                      {viewBill.customerPhone && (
                        <span style={{ color: "#4a4035" }}>{viewBill.customerPhone}</span>
                      )}
                      {viewBill.customerPlace && (
                        <span style={{ color: "#4a4035" }}>{viewBill.customerPlace}</span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: "#9a8e7e" }}>Walk-in Customer</span>
                  )}
                </div>

                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #d4c9b0" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px]" style={{ fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: "#1a2b1c" }}>
                          {[
                            ["PRODUCT", "left"],
                            ["VARIANT", "center"],
                            ["QTY", "center"],
                            ["RATE/PKT", "right"],
                            ["AMOUNT", "right"],
                          ].map(([h, align]) => (
                            <th
                              key={h}
                              className="py-1.5 px-1.5 font-bold tracking-wide whitespace-nowrap"
                              style={{
                                color: "#d4af37",
                                textAlign: align,
                                fontSize: 9,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewBill.items.map((item, i) => (
                          <tr
                            key={i}
                            style={{
                              background: i % 2 === 0 ? "#fff" : "#f0ebe0",
                              borderBottom: "1px solid #e8e0d0",
                            }}
                          >
                            <td
                              className="py-1.5 px-1.5 font-semibold"
                              style={{ color: "#1a2b1c" }}
                            >
                              {item.seedName}
                            </td>
                            <td
                              className="py-1.5 px-1.5 text-center text-xs"
                              style={{ color: "#4a4035" }}
                            >
                              <span
                                className="px-1.5 py-0.5 rounded font-medium"
                                style={{ background: "#e8e0d0" }}
                              >
                                {item.packageSize}
                              </span>
                            </td>
                            <td
                              className="py-1.5 px-1.5 text-center"
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                color: "#4a4035",
                              }}
                            >
                              {item.qty}
                            </td>
                            <td
                              className="py-1.5 px-1.5 text-right whitespace-nowrap"
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                color: "#4a4035",
                              }}
                            >
                              ₹{item.unitPrice.toFixed(2)}
                            </td>
                            <td
                              className="py-1.5 px-1.5 text-right whitespace-nowrap font-semibold"
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                color: "#1a2b1c",
                              }}
                            >
                              ₹{item.lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  className="flex flex-col w-full sm:w-72 sm:self-end rounded-lg overflow-hidden"
                  style={{ border: "1px solid #d4c9b0", fontSize: 11 }}
                >
                  <div
                    className="flex justify-between py-1.5 px-2.5"
                    style={{
                      borderBottom: "1px solid #e0d8c8",
                      color: "#4a4035",
                      background: "#faf7f0",
                    }}
                  >
                    <span>Subtotal</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      ₹{viewBill.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between py-1.5 px-2.5"
                    style={{
                      borderBottom: "1px solid #e0d8c8",
                      background: "#faf7f0",
                      color: viewBill.discountAmount > 0 ? "#15803d" : "#b0a898",
                    }}
                  >
                    <span>
                      Discount {viewBill.discountPct > 0 ? `(${viewBill.discountPct}%)` : ""}
                    </span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {viewBill.discountAmount > 0
                        ? `−₹${viewBill.discountAmount.toFixed(2)}`
                        : "—"}
                    </span>
                  </div>
                  <div
                    className="flex justify-between py-1.5 px-2.5"
                    style={{
                      borderBottom: "1px solid #e0d8c8",
                      background: "#faf7f0",
                      color: viewBill.deliveryCharge > 0 ? "#4a4035" : "#b0a898",
                    }}
                  >
                    <span>Delivery Charge</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {viewBill.deliveryCharge > 0
                        ? `+₹${viewBill.deliveryCharge.toFixed(2)}`
                        : "—"}
                    </span>
                  </div>
                  <div
                    className="flex justify-between py-2 px-2.5 font-bold"
                    style={{ background: "#1a2b1c", color: "#d4af37" }}
                  >
                    <span className="tracking-widest uppercase" style={{ fontSize: 11 }}>
                      Total
                    </span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      ₹{viewBill.total.toFixed(2)}
                    </span>
                  </div>
                  {viewBill.payment.cash > 0 && (
                    <div
                      className="flex justify-between py-1.5 px-2.5"
                      style={{
                        borderBottom: "1px solid #e0d8c8",
                        background: "#faf7f0",
                        color: "#15803d",
                      }}
                    >
                      <span>Cash</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        ₹{viewBill.payment.cash.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {viewBill.payment.upi > 0 && (
                    <div
                      className="flex justify-between py-1.5 px-2.5"
                      style={{
                        borderBottom: "1px solid #e0d8c8",
                        background: "#faf7f0",
                        color: "#1d4ed8",
                      }}
                    >
                      <span>UPI</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        ₹{viewBill.payment.upi.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {viewBill.payment.card > 0 && (
                    <div
                      className="flex justify-between py-1.5 px-2.5"
                      style={{
                        borderBottom: "1px solid #e0d8c8",
                        background: "#faf7f0",
                        color: "#6b21a8",
                      }}
                    >
                      <span>Card</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        ₹{viewBill.payment.card.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div
                    className="flex justify-between py-2 px-3 font-bold"
                    style={{
                      background: viewBill.paymentStatus === "Paid" ? "#f0fdf4" : "#fff7ed",
                      color: viewBill.paymentStatus === "Paid" ? "#15803d" : "#c2410c",
                    }}
                  >
                    <span>{viewBill.paymentStatus}</span>
                  </div>
                </div>

                <div
                  className="text-center py-2 border-t text-[10px] font-semibold tracking-widest uppercase"
                  style={{
                    borderColor: "#c8bfa8",
                    color: "#1a2b1c",
                    letterSpacing: "0.12em",
                  }}
                >
                  THANK YOU FOR YOUR BUSINESS!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <div className="text-4xl text-center mb-3">🗑</div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: "#1a1a12" }}>
              Delete this bill?
            </h3>
            <p className="text-sm text-center mb-2 font-medium" style={{ color: "#3d7a4f" }}>
              {deleteTarget.invoiceNo}
            </p>
            <p className="text-sm text-center mb-5" style={{ color: "#7a7060" }}>
              This will restore the reserved stock and cannot be undone.
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
