import { createFileRoute } from "@tanstack/react-router";
import Profile from "../../legacy/Pages/Profile.jsx";
export const Route = createFileRoute("/_admin/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MR Delights" },
      {
        name: "description",
        content: "Manage your MR Delights account details and sign out securely.",
      },
      { property: "og:title", content: "Profile — MR Delights" },
      {
        property: "og:description",
        content: "Manage your MR Delights account details and sign out securely.",
      },
    ],
  }),
  component: Profile,
});
