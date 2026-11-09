import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import Sidebar from "../legacy/Components/Sidebar.jsx";
import { COMPANY } from "../legacy/Constants/appConstants.js";
import { useAppStore } from "../legacy/Store/useAppStore.js";
import useAuthStore from "../legacy/Store/authStore.js";
import Loader from "../legacy/Components/Loader.jsx";
export const Route = createFileRoute("/_admin")({
  component: AdminShell,
});
const navItems = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { id: "inventory", label: "Inventory", path: "/inventory" },
  { id: "sales", label: "Sales", path: "/sales" },
  {
    id: "customer-management",
    label: "Customers",
    path: "/customer-management",
  },
  { id: "profit", label: "Profit", path: "/profit" },
  { id: "audit", label: "Audit Log", path: "/audit-log" },
  { id: "profile", label: "Profile", path: "/profile" },
];
function AdminShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { loading, error, loadAll } = useAppStore();
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/", replace: true });
    }
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (isAuthenticated) loadAll();
  }, [isAuthenticated, loadAll]);
  const activeId = navItems.find((n) => pathname.startsWith(n.path))?.id ?? "dashboard";
  if (!isAuthenticated) return null;
  if (loading) {
    return _jsx("div", {
      className: "flex flex-col items-center justify-center h-screen gap-4",
      style: { background: "#f4f1eb", color: "#7a7060" },
      children: _jsx(Loader, { label: `Loading ${COMPANY.NAME}…`, size: 48 }),
    });
  }
  if (error) {
    return _jsxs("div", {
      className: "flex flex-col items-center justify-center h-screen gap-3",
      style: { background: "#f4f1eb", color: "#dc2626" },
      children: [
        _jsx("p", { children: error }),
        _jsx("button", {
          onClick: loadAll,
          className: "px-4 py-2 rounded-xl text-sm font-semibold text-white",
          style: { background: "#3d7a4f" },
          children: "Retry",
        }),
      ],
    });
  }
  return _jsxs("div", {
    className: "flex h-screen overflow-hidden",
    style: { background: "#f4f1eb" },
    children: [
      _jsx("div", {
        className: "hidden md:flex",
        children: _jsx(Sidebar, {
          active: activeId,
          onNavigate: (id) => {
            const target = navItems.find((n) => n.id === id);
            if (target) navigate({ to: target.path });
          },
        }),
      }),
      _jsxs("div", {
        className: "flex flex-col flex-1 min-w-0 overflow-hidden",
        children: [
          _jsx("header", {
            className: "md:hidden flex items-center justify-between px-4 py-3 shrink-0",
            style: {
              background: "#1a2b1c",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            },
            children: _jsxs("div", {
              className: "flex items-center gap-2.5",
              children: [
                _jsx("img", {
                  src: "/mr-delights-dashboard.svg",
                  alt: COMPANY.NAME,
                  className: "object-contain",
                  style: { width: 40, height: 40 },
                }),
                _jsx("div", {
                  className: "text-sm font-bold leading-tight",
                  style: {
                    fontFamily: "'DM Serif Display', serif",
                    color: "#d4af37",
                  },
                  children: COMPANY.NAME,
                }),
              ],
            }),
          }),
          _jsx("main", {
            className: "flex-1 overflow-y-auto pb-20 md:pb-0",
            children: _jsx(Outlet, {}),
          }),
        ],
      }),
      _jsx("nav", {
        className: "md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch",
        style: {
          background: "#1a2b1c",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "env(safe-area-inset-bottom)",
        },
        children: navItems.map((item) =>
          _jsx(
            "button",
            {
              onClick: () => navigate({ to: item.path }),
              className: "flex-1 flex flex-col items-center justify-center py-2.5 gap-1",
              style: {
                color: activeId === item.id ? "#6eba85" : "rgba(255,255,255,0.4)",
              },
              children: _jsx("span", {
                className: "text-xs font-medium",
                style: { fontSize: 10 },
                children: item.label,
              }),
            },
            item.id,
          ),
        ),
      }),
    ],
  });
}
