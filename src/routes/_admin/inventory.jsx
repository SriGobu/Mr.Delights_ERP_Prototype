import { createFileRoute } from "@tanstack/react-router";
import Inventory from "../../legacy/Pages/Inventory.jsx";
export const Route = createFileRoute("/_admin/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — MR Delights" },
      {
        name: "description",
        content: "Manage seed parents, variants, package sizes and stock levels for MR Delights.",
      },
      { property: "og:title", content: "Inventory — MR Delights" },
      {
        property: "og:description",
        content: "Manage seed parents, variants, package sizes and stock levels for MR Delights.",
      },
    ],
  }),
  component: Inventory,
});
