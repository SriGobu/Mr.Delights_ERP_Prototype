import { createFileRoute } from "@tanstack/react-router";
import ProfitManagement from "../../legacy/Pages/ProfitManagement.jsx";
export const Route = createFileRoute("/_admin/profit")({
  head: () => ({
    meta: [
      { title: "Profit — MR Delights" },
      {
        name: "description",
        content: "Analyse margins, cost prices and profit trends across MR Delights products.",
      },
      { property: "og:title", content: "Profit — MR Delights" },
      {
        property: "og:description",
        content: "Analyse margins, cost prices and profit trends across MR Delights products.",
      },
    ],
  }),
  component: ProfitManagement,
});
