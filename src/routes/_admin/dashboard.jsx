import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../../legacy/Pages/Dashboard.jsx";
export const Route = createFileRoute("/_admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MR Delights" },
      {
        name: "description",
        content: "Overview of sales, revenue and inventory performance for MR Delights.",
      },
      { property: "og:title", content: "Dashboard — MR Delights" },
      {
        property: "og:description",
        content: "Overview of sales, revenue and inventory performance for MR Delights.",
      },
    ],
  }),
  component: Dashboard,
});
