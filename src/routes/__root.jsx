import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastProvider } from "../legacy/Components/Toast.jsx";
import bootstrapAuth from "../legacy/Api/authBootstap.js";
import Loader from "../legacy/Components/Loader.jsx";

export const Route = createRootRouteWithContext()({
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    bootstrapAuth()
      .catch((error) => console.error("Authentication bootstrap failed:", error))
      .finally(() => {
        if (active) setCheckingAuth(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {checkingAuth ? (
          <div
            className="flex min-h-screen items-center justify-center"
            style={{ background: "#f4f1eb" }}
          >
            <Loader label="Loading MR Delights…" size={48} />
          </div>
        ) : (
          <Outlet />
        )}
      </ToastProvider>
    </QueryClientProvider>
  );
}
