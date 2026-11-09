import { createFileRoute } from "@tanstack/react-router";
import AuditLog from "../../legacy/Pages/AuditLog.jsx";
export const Route = createFileRoute("/_admin/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — MR Delights" },
      {
        name: "description",
        content: "Review every change made across the MR Delights management system.",
      },
      { property: "og:title", content: "Audit Log — MR Delights" },
      {
        property: "og:description",
        content: "Review every change made across the MR Delights management system.",
      },
    ],
  }),
  component: AuditLog,
});
