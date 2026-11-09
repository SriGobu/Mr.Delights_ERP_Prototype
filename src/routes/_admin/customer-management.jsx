import { createFileRoute } from "@tanstack/react-router";
import CustomerManagement from "../../legacy/Pages/CustomerManagement.jsx";
export const Route = createFileRoute("/_admin/customer-management")({
  head: () => ({
    meta: [
      { title: "Customers — MR Delights" },
      {
        name: "description",
        content: "Manage MR Delights customers, contact details and purchase history.",
      },
      { property: "og:title", content: "Customers — MR Delights" },
      {
        property: "og:description",
        content: "Manage MR Delights customers, contact details and purchase history.",
      },
    ],
  }),
  component: CustomerManagement,
});
