import { createFileRoute } from "@tanstack/react-router";
import Login from "../legacy/Pages/Login.jsx";
export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MR Delights" },
      {
        name: "description",
        content:
          "Sign in with your authorized Google account to access the MR Delights business management system.",
      },
      { property: "og:title", content: "Sign in — MR Delights" },
      {
        property: "og:description",
        content: "Authorized account access to the MR Delights dashboard.",
      },
    ],
  }),
  validateSearch: (search) =>
    typeof search["error"] === "string" ? { error: search["error"] } : {},
  component: Login,
});
