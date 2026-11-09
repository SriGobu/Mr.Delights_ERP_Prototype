/**
 * Mock API client — drop-in replacement for the axios instance.
 * Returns the same response bodies the real backend returned
 * (`res.data.<key>`), so no page/store code has to change.
 */
import { db } from "../Api/mockDb";

const LATENCY = 320;
const wait = (ms = LATENCY + Math.random() * 220) => new Promise((r) => setTimeout(r, ms));

const clone = (v) => JSON.parse(JSON.stringify(v));
const ok = (data) => ({ success: true, data });

/* ------------------------------------------------------------------ */
/* analytics helpers                                                   */
/* ------------------------------------------------------------------ */

const rangeStart = (range) => {
  const d = new Date();
  if (range === "week") d.setDate(d.getDate() - 7);
  else if (range === "year") d.setFullYear(d.getFullYear() - 1);
  else d.setMonth(d.getMonth() - 1);
  return d;
};

const salesInRange = (range) => {
  const from = rangeStart(range);
  return db.sales.filter((s) => new Date(s.date) >= from);
};

const previousWindow = (range) => {
  const from = rangeStart(range);
  const span = Date.now() - from.getTime();
  const prevFrom = new Date(from.getTime() - span);
  return db.sales.filter((s) => new Date(s.date) >= prevFrom && new Date(s.date) < from);
};

const pct = (curr, prev) => {
  if (!prev) return curr ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
};

const totalsOf = (list) => {
  let revenue = 0;
  let cost = 0;
  let trueCost = 0;
  list.forEach((s) => {
    revenue += s.total;
    s.items.forEach((i) => {
      cost += (i.costPrice || 0) * i.qty;
      trueCost += (i.purchaseCost || i.costPrice || 0) * i.qty;
    });
  });
  return {
    revenue,
    cost,
    trueCost,
    profit: revenue - cost,
    trueProfit: revenue - trueCost,
  };
};

const bucketLabel = (date, range) => {
  const d = new Date(date);
  if (range === "year") return d.toLocaleDateString("en-IN", { month: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const buildBuckets = (list, range) => {
  const map = new Map();
  [...list]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((s) => {
      const key = bucketLabel(s.date, range);
      const b = map.get(key) || {
        label: key,
        date: key,
        revenue: 0,
        cost: 0,
        trueCost: 0,
        profit: 0,
        trueProfit: 0,
      };
      const t = totalsOf([s]);
      b.revenue += t.revenue;
      b.cost += t.cost;
      b.trueCost += t.trueCost;
      b.profit += t.profit;
      b.trueProfit += t.trueProfit;
      map.set(key, b);
    });
  return [...map.values()];
};

const dashboard = (range = "month") => {
  const list = salesInRange(range);
  const prev = previousWindow(range);
  const t = totalsOf(list);
  const pt = totalsOf(prev);

  const paymentBreakdown = list.reduce(
    (a, s) => ({
      cash: a.cash + s.payment.cash,
      upi: a.upi + s.payment.upi,
      card: a.card + s.payment.card,
    }),
    { cash: 0, upi: 0, card: 0 },
  );

  const seedMap = new Map();
  list.forEach((s) =>
    s.items.forEach((i) => {
      const e = seedMap.get(i.seedName) || { name: i.seedName, revenue: 0, units: 0 };
      e.revenue += i.lineTotal;
      e.units += i.qty;
      seedMap.set(i.seedName, e);
    }),
  );

  return {
    kpis: {
      totalRevenue: t.revenue,
      totalOrders: list.length,
      totalTrueProfit: t.trueProfit,
      totalPlannedProfit: t.profit,
    },
    trends: {
      revenue: pct(t.revenue, pt.revenue),
      trueProfit: pct(t.trueProfit, pt.trueProfit),
      orders: pct(list.length, prev.length),
    },
    paymentBreakdown,
    revenueOverTime: buildBuckets(list, range).map((b) => ({
      date: b.label,
      revenue: b.revenue,
    })),
    topSellingSeeds: [...seedMap.values()].sort((a, b) => b.revenue - a.revenue),
    recentSales: clone(list.slice(0, 8)),
  };
};

const profitAnalytics = (range = "month") => {
  const list = salesInRange(range);
  const prev = previousWindow(range);
  const t = totalsOf(list);
  const pt = totalsOf(prev);

  const margin = t.revenue ? (t.profit / t.revenue) * 100 : 0;
  const trueMargin = t.revenue ? (t.trueProfit / t.revenue) * 100 : 0;
  const prevMargin = pt.revenue ? (pt.profit / pt.revenue) * 100 : 0;

  const rows = new Map();
  list.forEach((s) =>
    s.items.forEach((i) => {
      const e = rows.get(i.variantId) || {
        variantId: i.variantId,
        name: `${i.seedName} — ${i.packageSize}`,
        units: 0,
        revenue: 0,
        cost: 0,
        trueCost: 0,
        profit: 0,
        trueProfit: 0,
      };
      const cost = (i.costPrice || 0) * i.qty;
      const trueCost = (i.purchaseCost || i.costPrice || 0) * i.qty;
      e.units += i.qty;
      e.revenue += i.lineTotal;
      e.cost += cost;
      e.trueCost += trueCost;
      e.profit += i.lineTotal - cost;
      e.trueProfit += i.lineTotal - trueCost;
      rows.set(i.variantId, e);
    }),
  );

  return {
    totalRevenue: t.revenue,
    totalCost: t.cost,
    totalTrueCost: t.trueCost,
    totalProfit: t.profit,
    totalTrueProfit: t.trueProfit,
    profitMargin: margin,
    trueProfitMargin: trueMargin,
    trends: {
      revenue: pct(t.revenue, pt.revenue),
      cost: pct(t.cost, pt.cost),
      profit: pct(t.profit, pt.profit),
      margin: Math.round((margin - prevMargin) * 10) / 10,
    },
    chartData: buildBuckets(list, range),
    seedBreakdown: [...rows.values()].sort((a, b) => b.revenue - a.revenue),
  };
};

/* ------------------------------------------------------------------ */
/* route handling                                                      */
/* ------------------------------------------------------------------ */

const notFound = (method, url) => {
  const err = new Error(`Mock endpoint not implemented: ${method} ${url}`);
  err.status = 404;
  throw err;
};

const handle = (method, url, body = {}, params = {}) => {
  const path = url.split("?")[0];
  const seg = path.split("/").filter(Boolean);

  // --- analytics ---
  if (method === "GET" && path === "/dashboard") return dashboard(params.range);
  if (method === "GET" && path === "/profit") return profitAnalytics(params.range);

  // --- profile ---
  if (method === "GET" && path === "/profile") return { user: clone(db.profile) };
  if (method === "PUT" && path === "/profile") {
    Object.assign(db.profile, body);
    db.pushLog("UPDATE", "User", db.profile.id, { name: db.profile.name });
    return { user: clone(db.profile) };
  }

  // --- seed parents ---
  if (path === "/seed-parent" && method === "GET") return { seedParents: clone(db.seedParents) };
  if (path === "/seed-parent" && method === "POST") {
    const parent = { _id: db.oid(), name: body.name };
    db.seedParents.push(parent);
    db.pushLog("CREATE", "SeedParent", parent._id, { name: parent.name });
    return { seedParent: clone(parent) };
  }
  if (seg[0] === "seed-parent" && method === "DELETE") {
    const id = seg[1];
    const idx = db.seedParents.findIndex((p) => p._id === id);
    if (idx > -1) {
      db.pushLog("DELETE", "SeedParent", id, { name: db.seedParents[idx].name });
      db.seedParents.splice(idx, 1);
    }
    for (let i = db.seedVariants.length - 1; i >= 0; i--)
      if (db.seedVariants[i].seedId === id) db.seedVariants.splice(i, 1);
    return { success: true };
  }

  // --- seed variants ---
  if (path === "/seed-variant" && method === "GET") return { seedVariants: clone(db.seedVariants) };
  if (path === "/seed-variant" && method === "POST") {
    const variant = {
      _id: db.oid(),
      sku: `MRD-${String(body.seedName || "SEED")
        .slice(0, 3)
        .toUpperCase()}-${body.packageSize}`,
      mrpOverridden: false,
      reorderThreshold: 10,
      ...body,
    };
    db.seedVariants.push(variant);
    db.pushLog("CREATE", "SeedVariant", variant._id, {
      seedName: variant.seedName,
      packageSize: variant.packageSize,
    });
    return { variant: clone(variant) };
  }
  if (seg[0] === "seed-variant" && method === "PUT") {
    const v = db.seedVariants.find((x) => x._id === seg[1]);
    if (!v) notFound(method, url);
    Object.assign(v, body);
    db.pushLog("UPDATE", "SeedVariant", v._id, { seedName: v.seedName, stock: v.stock });
    return { variant: clone(v) };
  }
  if (seg[0] === "seed-variant" && method === "DELETE") {
    const idx = db.seedVariants.findIndex((x) => x._id === seg[1]);
    if (idx > -1) {
      db.pushLog("DELETE", "SeedVariant", seg[1], {
        seedName: db.seedVariants[idx].seedName,
      });
      db.seedVariants.splice(idx, 1);
    }
    return { success: true };
  }

  // --- sales ---
  if (path === "/sales" && method === "GET") return { sales: clone(db.sales) };
  if (seg[0] === "sales" && seg[1] && method === "GET") {
    const sale = db.sales.find((s) => s._id === seg[1]);
    return { sale: clone(sale) };
  }
  if (path === "/sales" && method === "POST") {
    const sale = composeSale(body);
    db.sales.unshift(sale);
    applyStock(sale.items, -1);
    db.recomputeCustomerStats();
    db.pushLog("CREATE", "Sale", sale._id, { billNo: sale.invoiceNo, total: sale.total });
    return { sale: clone(sale) };
  }
  if (seg[0] === "sales" && method === "PUT") {
    const idx = db.sales.findIndex((s) => s._id === seg[1]);
    if (idx < 0) notFound(method, url);
    const old = db.sales[idx];
    applyStock(old.items, 1);
    const updated = composeSale(body, old);
    db.sales[idx] = updated;
    applyStock(updated.items, -1);
    db.recomputeCustomerStats();
    db.pushLog("UPDATE", "Sale", updated._id, { billNo: updated.invoiceNo });
    return { sale: clone(updated) };
  }
  if (seg[0] === "sales" && method === "DELETE") {
    const idx = db.sales.findIndex((s) => s._id === seg[1]);
    if (idx > -1) {
      applyStock(db.sales[idx].items, 1);
      db.pushLog("DELETE", "Sale", seg[1], { billNo: db.sales[idx].invoiceNo });
      db.sales.splice(idx, 1);
      db.recomputeCustomerStats();
    }
    return { success: true };
  }

  // --- customers ---
  if (path === "/customers" && method === "GET") {
    db.recomputeCustomerStats();
    return { customers: clone(db.customers) };
  }
  if (path === "/customers" && method === "POST") {
    const customer = {
      _id: db.oid(),
      notes: "",
      totalOrders: 0,
      totalSpent: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      ...body,
    };
    db.customers.push(customer);
    db.pushLog("CREATE", "Customer", customer._id, { name: customer.name });
    return { customer: clone(customer) };
  }
  if (seg[0] === "customers" && seg[1] && method === "GET") {
    db.recomputeCustomerStats();
    const customer = db.customers.find((c) => c._id === seg[1]);
    if (!customer) notFound(method, url);
    return {
      customer: clone(customer),
      sales: clone(db.sales.filter((s) => s.customerId === customer._id)),
    };
  }
  if (seg[0] === "customers" && method === "PUT") {
    const c = db.customers.find((x) => x._id === seg[1]);
    if (!c) notFound(method, url);
    Object.assign(c, body);
    db.pushLog("UPDATE", "Customer", c._id, { name: c.name });
    return { customer: clone(c) };
  }
  if (seg[0] === "customers" && method === "DELETE") {
    const idx = db.customers.findIndex((x) => x._id === seg[1]);
    if (idx > -1) {
      db.pushLog("DELETE", "Customer", seg[1], { name: db.customers[idx].name });
      db.customers.splice(idx, 1);
    }
    return { success: true };
  }

  // --- audit log ---
  if (path === "/audit-log" && method === "GET") return { auditLogs: clone(db.auditLogs) };

  // --- auth ---
  if (path === "/auth/refresh-token") return { accessToken: "mock-token", user: clone(db.profile) };

  return notFound(method, url);
};

const applyStock = (items, sign) => {
  items.forEach((i) => {
    const v = db.seedVariants.find((x) => x._id === String(i.variantId));
    if (v) v.stock = Math.max(0, v.stock + sign * i.qty);
  });
};

function composeSale(body, existing) {
  const items = (body.items || []).map((it) => {
    const v = db.seedVariants.find((x) => x._id === String(it.variantId));
    const unitPrice = v ? v.mrp : it.unitPrice || 0;
    return {
      variantId: String(it.variantId),
      seedName: v ? v.seedName : it.seedName || "Item",
      packageSize: v ? v.packageSize : it.packageSize || "",
      sku: v ? v.sku : it.sku || "",
      qty: it.qty,
      unitPrice,
      lineTotal: unitPrice * it.qty,
      costPrice: v ? v.costPrice : 0,
      purchaseCost: v ? v.purchaseCost : 0,
    };
  });
  const subtotal = items.reduce((a, i) => a + i.lineTotal, 0);
  const discountPct = Number(body.discountPct) || 0;
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const deliveryCharge = Number(body.deliveryCharge) || 0;
  const total = subtotal - discountAmount + deliveryCharge;
  const payment = {
    cash: Number(body.payment?.cash) || 0,
    upi: Number(body.payment?.upi) || 0,
    card: Number(body.payment?.card) || 0,
  };

  let customerId = body.customerId || existing?.customerId || null;
  if (!customerId && body.customerPhone) {
    const match = db.customers.find((c) => c.phone === body.customerPhone);
    if (match) customerId = match._id;
    else {
      const created = {
        _id: db.oid(),
        name: body.customerName || "Walk-in",
        phone: body.customerPhone,
        place: body.customerPlace || "",
        notes: "",
        totalOrders: 0,
        totalSpent: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      };
      db.customers.push(created);
      customerId = created._id;
    }
  }

  const invoiceNo = existing?.invoiceNo || db.nextInvoice();
  return {
    _id: existing?._id || db.oid(),
    invoiceNo,
    billNo: existing?.billNo || invoiceNo,
    refNo: body.refNo || "",
    date: body.date || existing?.date || new Date().toISOString(),
    customerId,
    customerName: body.customerName || "",
    customerPhone: body.customerPhone || "",
    customerPlace: body.customerPlace || "",
    items,
    subtotal,
    discountPct,
    discountAmount,
    deliveryCharge,
    total,
    payment,
    paymentStatus: db.paymentStatusOf(payment, total),
  };
}

const request = async (method, url, body, config = {}) => {
  await wait();
  return ok(handle(method, url, body, config.params || {}));
};

const api = {
  get: (url, config) => request("GET", url, undefined, config),
  post: (url, body, config) => request("POST", url, body, config),
  put: (url, body, config) => request("PUT", url, body, config),
  patch: (url, body, config) => request("PUT", url, body, config),
  delete: (url, config) => request("DELETE", url, undefined, config),
};

export default api;
