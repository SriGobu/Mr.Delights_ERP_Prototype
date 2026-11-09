// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAppStore } from "../Store/useAppStore";
import { fetchDashboardMetrics } from "../Api/root.js";
import { DASHBOARD_RANGES } from "../Constants/appConstants";
import Loader from "../Components/Loader";

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white border rounded-lg px-3 py-2 shadow-lg text-sm"
      style={{ borderColor: "#e0dbd0" }}
    >
      <div className="font-medium mb-0.5" style={{ color: "#7a7060" }}>
        {label}
      </div>
      <div
        className="font-semibold"
        style={{ color: "#3d7a4f", fontFamily: "JetBrains Mono, monospace" }}
      >
        {fmt(payload[0].value)}
      </div>
    </div>
  );
};

const PAY_COLORS = { Cash: "#3d7a4f", UPI: "#1d4ed8", Card: "#6b21a8" };

export default function Dashboard() {
  const { seedVariants, seedParents } = useAppStore();
  const [range, setRange] = useState("month");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadMetrics() {
      setLoading(true);
      try {
        const res = await fetchDashboardMetrics(range);
        if (active) setMetrics(res.data);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadMetrics();
    return () => {
      active = false;
    };
  }, [range]);

  const hasData = metrics && metrics.kpis.totalOrders > 0;

  const lowStockCount = seedVariants.filter(
    (v) => v.stock > 0 && v.stock <= v.reorderThreshold,
  ).length;
  const outOfStockCount = seedVariants.filter((v) => v.stock === 0).length;

  const kpis = metrics
    ? [
        {
          label: "Total Revenue",
          value: fmt(metrics.kpis.totalRevenue),
          change: metrics.trends.revenue,
          sub: "Gross sales",
        },
        {
          label: "True Profit",
          value: fmt(metrics.kpis.totalTrueProfit),
          change: metrics.trends.trueProfit,
          sub: `Planned: ${fmt(metrics.kpis.totalPlannedProfit)}`,
        },
        {
          label: "Transactions",
          value: String(metrics.kpis.totalOrders),
          change: metrics.trends.orders,
          sub: "Bills generated",
        },
        {
          label: "Products",
          value: `${seedParents.length} seeds · ${seedVariants.length} var.`,
          change: 0,
          sub: `${lowStockCount} low · ${outOfStockCount} out`,
        },
      ]
    : [];

  const paymentData = metrics
    ? [
        { name: "Cash", value: metrics.paymentBreakdown.cash },
        { name: "UPI", value: metrics.paymentBreakdown.upi },
        { name: "Card", value: metrics.paymentBreakdown.card },
      ].filter((d) => d.value > 0)
    : [];

  const lowStock = seedVariants
    .filter((v) => v.stock <= v.reorderThreshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="hidden md:block">
          <h1
            className="text-2xl"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#1a1a12",
            }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7a7060" }}>
            Sales performance at a glance
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#ece8df" }}>
            {DASHBOARD_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
                style={{
                  background: range === r ? "#fff" : "transparent",
                  color: range === r ? "#1a1a12" : "#7a7060",
                  boxShadow: range === r ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            disabled={!metrics?.recentSales?.length}
            onClick={() =>
              downloadCSV(
                "dashboard-recent-sales.csv",
                ["Bill No", "Invoice No", "Date", "Customer", "Items", "Total", "Status"],
                metrics.recentSales.map((s) => [
                  s.billNo,
                  s.invoiceNo,
                  s.date,
                  s.customerName || "Walk-in",
                  s.items.length,
                  s.total,
                  s.paymentStatus,
                ]),
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-[#f0ebe1] transition-colors disabled:opacity-40"
            style={{
              borderColor: "#e0dbd0",
              color: "#7a7060",
              background: "#fff",
            }}
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
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading dashboard…" className="py-16" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(hasData ? kpis : Array.from({ length: 4 })).map((kpi, i) => {
              if (!kpi) {
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 flex flex-col gap-2"
                    style={{
                      border: "1px solid #e0dbd0",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: "#7a7060" }}>
                      {["Total Revenue", "True Profit", "Transactions", "Products"][i]}
                    </span>
                    <div className="text-xl font-bold" style={{ color: "#b0a898" }}>
                      Not yet
                    </div>
                    <div className="text-xs" style={{ color: "#b0a898" }}>
                      No sales in this period
                    </div>
                  </div>
                );
              }
              const up = kpi.change >= 0;
              return (
                <div
                  key={kpi.label}
                  className="bg-white rounded-2xl p-4 flex flex-col gap-2"
                  style={{
                    border: "1px solid #e0dbd0",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span
                      className="text-xs font-medium leading-tight"
                      style={{ color: "#7a7060" }}
                    >
                      {kpi.label}
                    </span>
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
                    >
                      {up ? "▲" : "▼"}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="text-xl md:text-2xl font-bold tracking-tight leading-none"
                    style={{
                      color: kpi.label === "True Profit" ? "#3d7a4f" : "#1a1a12",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {kpi.value}
                  </div>
                  <div className="text-xs" style={{ color: "#b0a898" }}>
                    {kpi.sub}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="bg-white rounded-2xl p-4 md:p-5"
            style={{
              border: "1px solid #e0dbd0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm md:text-base font-semibold" style={{ color: "#1a1a12" }}>
                Revenue Over Time
              </h2>
              <span
                className="text-xs px-2 py-1 rounded-lg font-medium capitalize"
                style={{ background: "#f0ebe1", color: "#7a7060" }}
              >
                {range}
              </span>
            </div>
            {!metrics?.revenueOverTime?.length ? (
              <div
                className="flex items-center justify-center h-36 text-sm"
                style={{ color: "#b0a898" }}
              >
                Not yet — no revenue recorded for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={metrics.revenueOverTime}
                  margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3d7a4f" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3d7a4f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#b0a898" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#b0a898" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3d7a4f"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#3d7a4f" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="md:col-span-2 bg-white rounded-2xl p-4 md:p-5"
              style={{
                border: "1px solid #e0dbd0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <h2 className="text-sm md:text-base font-semibold mb-4" style={{ color: "#1a1a12" }}>
                Top Selling Seeds
              </h2>
              {!metrics?.topSellingSeeds?.length ? (
                <div
                  className="flex items-center justify-center h-36 text-sm"
                  style={{ color: "#b0a898" }}
                >
                  Not yet — no sales data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart
                    data={metrics.topSellingSeeds.slice(0, 6)}
                    margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#b0a898" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#b0a898" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => "₹" + v}
                    />
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="revenue" fill="#3d7a4f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* NEW — By Payment donut chart */}
            <div
              className="bg-white rounded-2xl p-4 md:p-5"
              style={{
                border: "1px solid #e0dbd0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <h2 className="text-sm md:text-base font-semibold mb-3" style={{ color: "#1a1a12" }}>
                By Payment
              </h2>
              {paymentData.length === 0 ? (
                <div
                  className="flex items-center justify-center h-36 text-sm"
                  style={{ color: "#b0a898" }}
                >
                  No data
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={62}
                        dataKey="value"
                        paddingAngle={3}
                      >
                        {paymentData.map((entry) => (
                          <Cell key={entry.name} fill={PAY_COLORS[entry.name] ?? "#ccc"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmt(v)}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {paymentData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: PAY_COLORS[d.name] ?? "#ccc" }}
                          />
                          <span style={{ color: "#4a4035" }}>{d.name}</span>
                        </div>
                        <span
                          className="font-medium"
                          style={{
                            color: "#1a1a12",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {fmt(d.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="bg-white rounded-2xl p-4 md:p-5"
              style={{
                border: "1px solid #e0dbd0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm md:text-base font-semibold" style={{ color: "#1a1a12" }}>
                  Low Stock
                </h2>
                {lowStock.length > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "#fef3c7", color: "#92400e" }}
                  >
                    Alert
                  </span>
                )}
              </div>
              {lowStock.length === 0 ? (
                <div className="text-sm" style={{ color: "#b0a898" }}>
                  All items are well stocked.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {lowStock.map((v) => (
                    <div key={v._id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate text-xs" style={{ color: "#1a1a12" }}>
                          {v.seedName} — {v.packageSize}
                        </span>
                        <span
                          className="font-semibold shrink-0 ml-2 text-xs"
                          style={{
                            color: v.stock === 0 ? "#dc2626" : "#d97706",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {v.stock} pkts
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "#f0ebe1" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min((v.stock / (v.reorderThreshold || 1)) * 100, 100)}%`,
                            background: v.stock === 0 ? "#dc2626" : "#d97706",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="md:col-span-2 bg-white rounded-2xl p-4 md:p-5"
              style={{
                border: "1px solid #e0dbd0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <h2 className="text-sm md:text-base font-semibold mb-4" style={{ color: "#1a1a12" }}>
                Recent Transactions
              </h2>
              {!metrics?.recentSales?.length ? (
                <div className="text-sm py-8 text-center" style={{ color: "#b0a898" }}>
                  Not yet — no transactions recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f0ebe1" }}>
                        {["Invoice No.", "Date", "Customer", "Items", "Total", "Status"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left py-2 pr-4 font-medium text-xs uppercase tracking-wider"
                              style={{ color: "#b0a898" }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.recentSales.map((s) => (
                        <tr
                          key={s._id}
                          className="border-b last:border-0 hover:bg-[#faf8f4] transition-colors"
                          style={{ borderColor: "#f0ebe1" }}
                        >
                          <td
                            className="py-2.5 pr-4 font-medium"
                            style={{
                              color: "#3d7a4f",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 11,
                            }}
                          >
                            {s.invoiceNo}
                          </td>
                          <td className="py-2.5 pr-4 text-xs" style={{ color: "#7a7060" }}>
                            {new Date(s.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td
                            className="py-2.5 pr-4 font-medium text-xs"
                            style={{ color: "#1a1a12" }}
                          >
                            {s.customerName || "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-xs" style={{ color: "#7a7060" }}>
                            {s.items.length}
                          </td>
                          <td
                            className="py-2.5 pr-4 font-semibold text-xs"
                            style={{
                              color: "#1a1a12",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {fmt(s.total)}
                          </td>
                          <td className="py-2.5">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background:
                                  s.paymentStatus === "Paid"
                                    ? "#f0fdf4"
                                    : s.paymentStatus === "Partially Paid"
                                      ? "#fff7ed"
                                      : "#fef2f2",
                                color:
                                  s.paymentStatus === "Paid"
                                    ? "#15803d"
                                    : s.paymentStatus === "Partially Paid"
                                      ? "#c2410c"
                                      : "#dc2626",
                              }}
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
          </div>
        </>
      )}
    </div>
  );
}
