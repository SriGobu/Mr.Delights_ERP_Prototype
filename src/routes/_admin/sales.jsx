import { createFileRoute } from "@tanstack/react-router";
import Sales from "../../legacy/Pages/Sales.jsx";
export const Route = createFileRoute("/_admin/sales")({
  head: () => ({
    meta: [
      { title: "Sales — MR Delights" },
      {
        name: "description",
        content: "Record and track customer orders, payments and invoices for MR Delights.",
      },
      { property: "og:title", content: "Sales — MR Delights" },
      {
        property: "og:description",
        content: "Record and track customer orders, payments and invoices for MR Delights.",
      },
    ],
  }),
  component: Sales,
});
