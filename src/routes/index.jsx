import { createFileRoute } from "@tanstack/react-router";
import Login from "../legacy/Pages/Login.jsx";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MR Delights — Business Management Login" },
      {
        name: "description",
        content:
          "Sign in to the MR Delights management system for premium seeds, dry fruits and nuts inventory, sales and profit tracking.",
      },
      { property: "og:title", content: "MR Delights — Business Management Login" },
      {
        property: "og:description",
        content:
          "Secure access to the MR Delights inventory, sales and profit management dashboard.",
      },
    ],
  }),
  validateSearch: (search) =>
    typeof search["error"] === "string" ? { error: search["error"] } : {},
  component: Login,
});
