// src/pages/AuditLog.jsx
import { useState, useEffect, Fragment } from "react";
import { useAppStore } from "../Store/useAppStore";
import Loader from "../Components/Loader";

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

function actionStyle(action = "") {
  if (action.includes("DELETED")) return { color: "#dc2626", bg: "#fef2f2" };
  if (action.includes("CREATED")) return { color: "#15803d", bg: "#f0fdf4" };
  if (action.includes("UPDATED")) return { color: "#c2410c", bg: "#fff7ed" };
  return { color: "#7a7060", bg: "#f4f1eb" };
}

export default function AuditLog() {
  const { auditLogs, loadAuditLogs } = useAppStore();
  const [layout, setLayout] = useState("list");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadAuditLogs().finally(() => setLoading(false));
  }, [loadAuditLogs]);

  const filtered = auditLogs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.targetModel || "").toLowerCase().includes(q) ||
      (log.role || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="hidden md:block">
          <h1
            className="text-2xl"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#1a1a12",
            }}
          >
            Audit Log
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7a7060" }}>
            {auditLogs.length} actions recorded
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
            disabled={!filtered.length}
            onClick={() =>
              downloadCSV(
                "audit-log.csv",
                ["Action", "Target Model", "Target ID", "Performed By Role", "Date"],
                filtered.map((log) => [
                  log.action,
                  log.targetModel,
                  log.targetId,
                  log.role,
                  log.createdAt,
                ]),
              )
            }
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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search action, model, or role…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
          style={{ border: "1px solid #e0dbd0" }}
        />
      </div>

      {loading ? (
        <Loader label="Loading audit trail…" className="py-16" />
      ) : filtered.length === 0 ? (
        <div
          className="py-20 text-center bg-white rounded-2xl"
          style={{ border: "1px solid #e0dbd0" }}
        >
          <div className="text-4xl mb-3">📋</div>
          <div className="text-base font-medium" style={{ color: "#7a7060" }}>
            Not yet — no activity recorded
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
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #f0ebe1",
                    background: "#faf8f4",
                  }}
                >
                  {["Action", "Target", "Performed By", "Date", ""].map((h) => (
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
                {paginated.map((log) => {
                  const st = actionStyle(log.action);
                  const isOpen = expandedId === log._id;
                  return (
                    <Fragment key={log._id}>
                      <tr
                        onClick={() => toggleExpand(log._id)}
                        className="border-b last:border-0 hover:bg-[#faf8f4] transition-colors cursor-pointer"
                        style={{ borderColor: "#f0ebe1" }}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#4a4035" }}>
                          {log.targetModel} —{" "}
                          {log.details?.name ||
                            log.details?.billNo ||
                            log.details?.seedName ||
                            String(log.targetId).slice(-6)}
                        </td>
                        <td className="px-4 py-3 text-xs capitalize" style={{ color: "#7a7060" }}>
                          {log.role}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#7a7060" }}>
                          {new Date(log.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#b0a898"
                            strokeWidth="2"
                            strokeLinecap="round"
                            style={{
                              transition: "transform 0.15s",
                              transform: isOpen ? "rotate(180deg)" : "none",
                            }}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr style={{ background: "#faf8f4" }}>
                          <td colSpan={5} className="px-4 py-3">
                            <div
                              className="rounded-xl p-3 text-xs flex flex-col gap-1"
                              style={{
                                background: "#fff",
                                border: "1px solid #f0ebe1",
                              }}
                            >
                              <div>
                                <span className="font-semibold" style={{ color: "#7a7060" }}>
                                  Target ID:{" "}
                                </span>
                                <span
                                  style={{
                                    fontFamily: "JetBrains Mono, monospace",
                                    color: "#1a1a12",
                                  }}
                                >
                                  {log.targetId}
                                </span>
                              </div>
                              {log.details &&
                                Object.entries(log.details).map(([k, v]) => (
                                  <div key={k}>
                                    <span
                                      className="font-semibold capitalize"
                                      style={{ color: "#7a7060" }}
                                    >
                                      {k}:{" "}
                                    </span>
                                    <span style={{ color: "#1a1a12" }}>{String(v)}</span>
                                  </div>
                                ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginated.map((log) => {
            const st = actionStyle(log.action);
            const isOpen = expandedId === log._id;
            return (
              <div
                key={log._id}
                className="bg-white rounded-2xl p-4 flex flex-col gap-2 cursor-pointer"
                style={{
                  border: "1px solid #e0dbd0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
                onClick={() => toggleExpand(log._id)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {log.action}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#b0a898"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{
                      transition: "transform 0.15s",
                      transform: isOpen ? "rotate(180deg)" : "none",
                    }}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                <div className="text-sm font-medium" style={{ color: "#1a1a12" }}>
                  {log.targetModel}
                </div>
                <div className="text-xs" style={{ color: "#7a7060" }}>
                  {new Date(log.createdAt).toLocaleDateString("en-IN")} ·{" "}
                  <span className="capitalize">{log.role}</span>
                </div>
                {isOpen && log.details && (
                  <div
                    className="mt-1 rounded-xl p-2.5 text-xs flex flex-col gap-1"
                    style={{ background: "#faf8f4" }}
                  >
                    {Object.entries(log.details).map(([k, v]) => (
                      <div key={k}>
                        <span className="font-semibold capitalize" style={{ color: "#7a7060" }}>
                          {k}:{" "}
                        </span>
                        <span style={{ color: "#1a1a12" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
