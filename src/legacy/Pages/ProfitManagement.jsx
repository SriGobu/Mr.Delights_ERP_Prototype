// src/pages/ProfitManagement.jsx
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchProfitAnalytics } from "../Api/root.js";
import { DASHBOARD_RANGES } from "../Constants/appConstants";
import Loader from "../Components/Loader";

function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function marginPct(profit, revenue) {
  return revenue > 0 ? (profit / revenue) * 100 : 0;
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
      className="bg-white border rounded-xl px-3 py-2 shadow-lg text-xs"
      style={{ borderColor: "#e0dbd0" }}
    >
      <div className="font-medium mb-1" style={{ color: "#7a7060" }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "#4a4035" }}>{p.name}:</span>
          <span
            className="font-semibold"
            style={{
              color: "#1a1a12",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ProfitManagement() {
  const [range, setRange] = useState("month");
  const [view, setView] = useState("overview");
  const [layout, setLayout] = useState("list");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadProfitData() {
      setLoading(true);
      try {
        const res = await fetchProfitAnalytics(range);
        if (active) setData(res.data);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProfitData();
    return () => {
      active = false;
    };
  }, [range]);

  const hasData = data && data.totalRevenue > 0;

  const kpis = data
    ? [
        {
          label: "Total Revenue",
          value: fmt(data.totalRevenue),
          change: data.trends.revenue,
          sub: "Gross sales",
        },
        {
          label: "Total Cost",
          value: fmt(data.totalCost),
          change: data.trends.cost,
          sub: `True: ${fmt(data.totalTrueCost)}`,
          invert: true,
        },
        {
          label: "Gross Profit",
          value: fmt(data.totalProfit),
          change: data.trends.profit,
          sub: `True: ${fmt(data.totalTrueProfit)}`,
        },
        {
          label: "Profit Margin",
          value: `${data.profitMargin.toFixed(1)}%`,
          change: data.trends.margin,
          sub: `True: ${data.trueProfitMargin.toFixed(1)}%`,
        },
      ]
    : [];

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
            Profit Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7a7060" }}>
            Revenue, cost & margin analysis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#ece8df" }}>
            {["overview", "per-seed"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: view === v ? "#fff" : "transparent",
                  color: view === v ? "#1a1a12" : "#7a7060",
                  boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {v === "per-seed" ? "Per Seed" : "Overview"}
              </button>
            ))}
          </div>
          {view === "per-seed" && (
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
          )}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#ece8df" }}>
            {DASHBOARD_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
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
            disabled={!hasData}
            onClick={() => {
              if (view === "per-seed") {
                downloadCSV(
                  "profit-per-variant.csv",
                  [
                    "Variant",
                    "Units Sold",
                    "Revenue",
                    "Cost",
                    "Profit",
                    "Margin",
                    "True Cost",
                    "True Profit",
                    "True Margin",
                  ],
                  data.seedBreakdown.map((r) => [
                    r.name,
                    r.units,
                    Math.round(r.revenue),
                    Math.round(r.cost),
                    Math.round(r.profit),
                    marginPct(r.profit, r.revenue).toFixed(1),
                    Math.round(r.trueCost),
                    Math.round(r.trueProfit),
                    marginPct(r.trueProfit, r.revenue).toFixed(1),
                  ]),
                );
              } else {
                downloadCSV(
                  "profit-overview.csv",
                  ["Period", "Revenue", "Cost", "Profit", "True Cost", "True Profit"],
                  data.chartData.map((d) => [
                    d.label,
                    Math.round(d.revenue),
                    Math.round(d.cost),
                    Math.round(d.profit),
                    Math.round(d.trueCost),
                    Math.round(d.trueProfit),
                  ]),
                );
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border hover:bg-[#f0ebe1] transition-colors disabled:opacity-40"
            style={{
              borderColor: "#e0dbd0",
              color: "#7a7060",
              background: "#fff",
            }}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading profit data…" className="py-16" />
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
                      {["Total Revenue", "Total Cost", "Gross Profit", "Profit Margin"][i]}
                    </span>
                    <div className="text-xl font-bold" style={{ color: "#b0a898" }}>
                      Not yet
                    </div>
                    <div className="text-xs" style={{ color: "#b0a898" }}>
                      No data for this period
                    </div>
                  </div>
                );
              }
              const up = kpi.invert ? kpi.change <= 0 : kpi.change >= 0;
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
                      {kpi.change >= 0 ? "▲" : "▼"}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="text-xl md:text-2xl font-bold tracking-tight leading-none"
                    style={{
                      color: kpi.label === "Gross Profit" ? "#3d7a4f" : "#1a1a12",
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

          {view === "overview" ? (
            <>
              <div
                className="bg-white rounded-2xl p-4 md:p-5"
                style={{
                  border: "1px solid #e0dbd0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  className="text-sm md:text-base font-semibold mb-4"
                  style={{ color: "#1a1a12" }}
                >
                  Revenue · Cost · Profit
                </h2>
                {!data?.chartData?.length ? (
                  <div
                    className="flex items-center justify-center h-36 text-sm"
                    style={{ color: "#b0a898" }}
                  >
                    Not yet — no sales in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={data.chartData}
                      margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#b0a898" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#b0a898" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                          v >= 1000 ? "₹" + (v / 1000).toFixed(0) + "k" : "₹" + v
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="#b5813a"
                        radius={[3, 3, 0, 0]}
                        barSize={10}
                      />
                      <Bar
                        dataKey="cost"
                        name="Cost"
                        fill="#e0d0b8"
                        radius={[3, 3, 0, 0]}
                        barSize={10}
                      />
                      <Bar
                        dataKey="profit"
                        name="Profit"
                        fill="#3d7a4f"
                        radius={[3, 3, 0, 0]}
                        barSize={10}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div
                className="bg-white rounded-2xl p-4 md:p-5"
                style={{
                  border: "1px solid #e0dbd0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  className="text-sm md:text-base font-semibold mb-4"
                  style={{ color: "#1a1a12" }}
                >
                  Profit Trend
                </h2>
                {!data?.chartData?.length ? (
                  <div
                    className="flex items-center justify-center h-32 text-sm"
                    style={{ color: "#b0a898" }}
                  >
                    Not yet — no trend data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart
                      data={data.chartData}
                      margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#b0a898" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#b0a898" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                          v >= 1000 ? "₹" + (v / 1000).toFixed(0) + "k" : "₹" + v
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Planned Profit"
                        stroke="#3d7a4f"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#3d7a4f" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="trueProfit"
                        name="True Profit"
                        stroke="#b5813a"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        dot={false}
                        activeDot={{ r: 4, fill: "#b5813a" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : !data?.seedBreakdown?.length ? (
            <div
              className="py-20 text-center bg-white rounded-2xl"
              style={{ border: "1px solid #e0dbd0" }}
            >
              <div className="text-4xl mb-3">📊</div>
              <div className="text-base font-medium" style={{ color: "#7a7060" }}>
                Not yet — no sales data for this period
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
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid #f0ebe1",
                        background: "#faf8f4",
                      }}
                    >
                      {["Variant", "Units Sold", "Revenue", "Cost", "Profit", "True Profit"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold"
                            style={{ color: "#b0a898" }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.seedBreakdown.map((row) => {
                      const isLoss = row.profit < 0;
                      const isTrueLoss = row.trueProfit < 0;
                      return (
                        <tr
                          key={row.variantId}
                          className="border-b last:border-0 hover:bg-[#faf8f4] transition-colors"
                          style={{ borderColor: "#f0ebe1" }}
                        >
                          <td className="px-4 py-3.5 font-semibold" style={{ color: "#1a1a12" }}>
                            {row.name}
                          </td>
                          <td
                            className="px-4 py-3.5"
                            style={{
                              color: "#7a7060",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {row.units}
                          </td>
                          <td
                            className="px-4 py-3.5 font-medium"
                            style={{
                              color: "#1a1a12",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {fmt(row.revenue)}
                          </td>
                          <td
                            className="px-4 py-3.5"
                            style={{
                              color: "#7a7060",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {fmt(row.cost)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold"
                                style={{
                                  color: isLoss ? "#dc2626" : "#3d7a4f",
                                  fontFamily: "JetBrains Mono, monospace",
                                }}
                              >
                                {isLoss ? "−" : "+"}
                                {fmt(Math.abs(row.profit))}
                              </span>
                              <span
                                className="text-xs font-semibold"
                                style={{
                                  color: isLoss ? "#dc2626" : "#3d7a4f",
                                }}
                              >
                                ({marginPct(row.profit, row.revenue).toFixed(1)}
                                %)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold"
                                style={{
                                  color: isTrueLoss ? "#dc2626" : "#b5813a",
                                  fontFamily: "JetBrains Mono, monospace",
                                }}
                              >
                                {isTrueLoss ? "−" : "+"}
                                {fmt(Math.abs(row.trueProfit))}
                              </span>
                              <span
                                className="text-xs font-semibold"
                                style={{
                                  color: isTrueLoss ? "#dc2626" : "#b5813a",
                                }}
                              >
                                ({marginPct(row.trueProfit, row.revenue).toFixed(1)}
                                %)
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "#faf8f4",
                        borderTop: "2px solid #e0dbd0",
                      }}
                    >
                      <td
                        className="px-4 py-3 font-bold text-xs uppercase tracking-wide"
                        style={{ color: "#7a7060" }}
                        colSpan={2}
                      >
                        Total
                      </td>
                      <td
                        className="px-4 py-3 font-bold"
                        style={{
                          color: "#1a1a12",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {fmt(data.totalRevenue)}
                      </td>
                      <td
                        className="px-4 py-3 font-bold"
                        style={{
                          color: "#7a7060",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {fmt(data.totalCost)}
                      </td>
                      <td
                        className="px-4 py-3 font-bold"
                        style={{
                          color: "#3d7a4f",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        +{fmt(data.totalProfit)} ({data.profitMargin.toFixed(1)}
                        %)
                      </td>
                      <td
                        className="px-4 py-3 font-bold"
                        style={{
                          color: "#b5813a",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        +{fmt(data.totalTrueProfit)} ({data.trueProfitMargin.toFixed(1)}%)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.seedBreakdown.map((row) => {
                const isLoss = row.profit < 0;
                const isTrueLoss = row.trueProfit < 0;
                return (
                  <div
                    key={row.variantId}
                    className="bg-white rounded-2xl p-4 flex flex-col gap-3"
                    style={{
                      border: "1px solid #e0dbd0",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm" style={{ color: "#1a1a12" }}>
                        {row.name}
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: "#f0ebe1", color: "#8b5e3c" }}
                      >
                        {row.units} units
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div
                        className="flex flex-col p-2 rounded-lg"
                        style={{ background: "#f4f1eb" }}
                      >
                        <span style={{ color: "#b0a898" }}>Revenue</span>
                        <span
                          className="font-semibold mt-0.5"
                          style={{
                            color: "#1a1a12",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {fmt(row.revenue)}
                        </span>
                      </div>
                      <div
                        className="flex flex-col p-2 rounded-lg"
                        style={{ background: "#f4f1eb" }}
                      >
                        <span style={{ color: "#b0a898" }}>Cost</span>
                        <span
                          className="font-semibold mt-0.5"
                          style={{
                            color: "#7a7060",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {fmt(row.cost)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs" style={{ color: "#b0a898" }}>
                          Profit
                        </div>
                        <div
                          className="text-base font-bold"
                          style={{
                            color: isLoss ? "#dc2626" : "#3d7a4f",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {isLoss ? "−" : "+"}
                          {fmt(Math.abs(row.profit))}
                        </div>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: isLoss ? "#dc2626" : "#3d7a4f" }}
                        >
                          {marginPct(row.profit, row.revenue).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: "#b0a898" }}>
                          True Profit
                        </div>
                        <div
                          className="text-base font-bold"
                          style={{
                            color: isTrueLoss ? "#dc2626" : "#b5813a",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {isTrueLoss ? "−" : "+"}
                          {fmt(Math.abs(row.trueProfit))}
                        </div>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: isTrueLoss ? "#dc2626" : "#b5813a" }}
                        >
                          {marginPct(row.trueProfit, row.revenue).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
