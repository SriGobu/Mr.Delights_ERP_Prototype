/**
 * In-memory mock backend for MR Delights.
 * Mirrors the real REST API shapes so every page works without a server.
 */

let counter = 1000;
const oid = () => `mock${(counter++).toString(16).padStart(8, "0")}`;

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + (n % 8), (n * 7) % 60, 0, 0);
  return d.toISOString();
};

const SEEDS = [
  { name: "Almonds" },
  { name: "Cashews" },
  { name: "Pistachios" },
  { name: "Walnuts" },
  { name: "Chia Seeds" },
  { name: "Pumpkin Seeds" },
  { name: "Sunflower Seeds" },
  { name: "Raisins" },
];

const SIZE_FACTOR = { "100G": 1, "150G": 1.45, "250G": 2.4, "500G": 4.6, "1KG": 9 };
const BASE_COST = {
  Almonds: 78,
  Cashews: 92,
  Pistachios: 128,
  Walnuts: 110,
  "Chia Seeds": 32,
  "Pumpkin Seeds": 40,
  "Sunflower Seeds": 26,
  Raisins: 34,
};

const seedParents = SEEDS.map((s) => ({ _id: oid(), name: s.name }));

const seedVariants = [];
seedParents.forEach((p, pi) => {
  const sizes = ["100G", "250G", "500G", "1KG"].slice(0, 2 + (pi % 3));
  sizes.forEach((size, si) => {
    const costPrice = Math.round(BASE_COST[p.name] * SIZE_FACTOR[size]);
    const profitPct = 25 + ((pi + si) % 4) * 5;
    const stock = [42, 18, 6, 0, 75, 31, 12, 58][(pi * 3 + si) % 8];
    seedVariants.push({
      _id: oid(),
      seedId: p._id,
      seedName: p.name,
      sku: `MRD-${p.name.slice(0, 3).toUpperCase()}-${size}`,
      packageSize: size,
      description: `${p.name} — premium grade, ${size} vacuum pack`,
      stock,
      purchaseCost: Math.round(costPrice * 0.94),
      costPrice,
      profitPct,
      mrp: Math.round(costPrice * (1 + profitPct / 100)),
      mrpOverridden: false,
      reorderThreshold: 10,
    });
  });
});

const CUSTOMER_SEED = [
  ["Anitha Ramesh", "9840112233", "T. Nagar, Chennai"],
  ["Karthik Subramanian", "9876543210", "Coimbatore"],
  ["Fathima Noor", "9791122334", "Madurai"],
  ["Ravi Shankar", "9445566778", "Salem"],
  ["Divya Prakash", "9003344556", "Trichy"],
  ["Mohan Kumar", "9698877665", "Erode"],
  ["Sneha Iyer", "9566778899", "Adyar, Chennai"],
];

const customers = CUSTOMER_SEED.map(([name, phone, place], i) => ({
  _id: oid(),
  name,
  phone,
  place,
  notes: i % 3 === 0 ? "Prefers weekend delivery" : "",
  totalOrders: 0,
  totalSpent: 0,
  totalPaid: 0,
  totalOutstanding: 0,
}));

const paymentStatusOf = (payment, total) => {
  const paid = payment.cash + payment.upi + payment.card;
  if (paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Pending";
};

let invoiceSeq = 1;
const nextInvoice = () => `MRD-${String(invoiceSeq++).padStart(4, "0")}`;

const buildSale = ({ customer, items, discountPct, deliveryCharge, payMode, date }) => {
  const lineItems = items.map((it) => {
    const v = seedVariants.find((sv) => sv._id === it.variantId);
    return {
      variantId: v._id,
      seedName: v.seedName,
      packageSize: v.packageSize,
      sku: v.sku,
      qty: it.qty,
      unitPrice: v.mrp,
      lineTotal: v.mrp * it.qty,
      costPrice: v.costPrice,
      purchaseCost: v.purchaseCost,
    };
  });
  const subtotal = lineItems.reduce((a, i) => a + i.lineTotal, 0);
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discountAmount + deliveryCharge;
  const payment = { cash: 0, upi: 0, card: 0 };
  if (payMode === "partial") payment.upi = Math.round(total * 0.5);
  else if (payMode === "pending") {
    /* nothing paid */
  } else payment[payMode] = total;

  const invoiceNo = nextInvoice();
  return {
    _id: oid(),
    invoiceNo,
    billNo: invoiceNo,
    refNo: "",
    date,
    customerId: customer._id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerPlace: customer.place,
    items: lineItems,
    subtotal,
    discountPct,
    discountAmount,
    deliveryCharge,
    total,
    payment,
    paymentStatus: paymentStatusOf(payment, total),
  };
};

const sales = [];
const modes = ["cash", "upi", "card", "partial", "cash", "upi", "pending"];
for (let i = 0; i < 46; i++) {
  const customer = customers[i % customers.length];
  const nItems = 1 + (i % 3);
  const items = [];
  for (let k = 0; k < nItems; k++) {
    const v = seedVariants[(i * 5 + k * 3) % seedVariants.length];
    if (!items.some((it) => it.variantId === v._id))
      items.push({ variantId: v._id, qty: 1 + ((i + k) % 4) });
  }
  sales.push(
    buildSale({
      customer,
      items,
      discountPct: i % 5 === 0 ? 5 : 0,
      deliveryCharge: i % 4 === 0 ? 40 : 0,
      payMode: modes[i % modes.length],
      date: daysAgo(Math.floor((i * i) / 12)),
    }),
  );
}
sales.sort((a, b) => new Date(b.date) - new Date(a.date));

const recomputeCustomerStats = () => {
  customers.forEach((c) => {
    const own = sales.filter((s) => s.customerId === c._id);
    const spent = own.reduce((a, s) => a + s.total, 0);
    const paid = own.reduce((a, s) => a + s.payment.cash + s.payment.upi + s.payment.card, 0);
    c.totalOrders = own.length;
    c.totalSpent = spent;
    c.totalPaid = paid;
    c.totalOutstanding = Math.max(0, spent - paid);
  });
};
recomputeCustomerStats();

const auditLogs = [];
const pushLog = (action, targetModel, targetId, details) => {
  auditLogs.unshift({
    _id: oid(),
    action,
    targetModel,
    targetId,
    role: "admin",
    details,
    createdAt: new Date().toISOString(),
  });
};

[
  ["CREATE", "Sale", sales[0]._id, { billNo: sales[0].invoiceNo, total: sales[0].total }],
  [
    "UPDATE",
    "SeedVariant",
    seedVariants[3]._id,
    { seedName: seedVariants[3].seedName, stock: seedVariants[3].stock },
  ],
  ["CREATE", "Customer", customers[2]._id, { name: customers[2].name }],
  ["DELETE", "SeedVariant", seedVariants[7]._id, { seedName: seedVariants[7].seedName }],
  [
    "UPDATE",
    "Sale",
    sales[2]._id,
    { billNo: sales[2].invoiceNo, paymentStatus: sales[2].paymentStatus },
  ],
  ["CREATE", "SeedParent", seedParents[5]._id, { name: seedParents[5].name }],
  ["LOGIN", "User", "mockuser", { name: "Demo Admin" }],
].forEach(([a, m, t, d], i) => {
  pushLog(a, m, t, d);
  auditLogs[0].createdAt = daysAgo(i);
});

const profile = {
  id: "mockuser",
  _id: "mockuser",
  name: "Demo Admin",
  email: "demo@mrdelights.in",
  role: "admin",
  avatar: "",
};

export const db = {
  seedParents,
  seedVariants,
  sales,
  customers,
  auditLogs,
  profile,
  oid,
  pushLog,
  paymentStatusOf,
  recomputeCustomerStats,
  nextInvoice,
};
