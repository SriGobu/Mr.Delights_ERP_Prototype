import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (accessToken, user) =>
        set({
          accessToken,
          user:
            user && typeof user === "object"
              ? {
                  id: user.id || "",
                  name: user.name || "",
                  email: user.email || "",
                  role: user.role || "",
                }
              : null,
          isAuthenticated: !!accessToken && !!user,
        }),
      setAccessToken: (
        accessToken, // ← add here
      ) =>
        set((state) => ({
          accessToken,
          isAuthenticated: !!accessToken && !!state.user,
        })),
      updateUser: (user) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...user } : null,
        })),
      clearAuth: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
        }),
      getAccessToken: () => get().accessToken,
      getUser: () => get().user,
      isLoggedIn: () => get().isAuthenticated,
    }),
    {
      name: "auth-storage",
      // accessToken deliberately excluded — never persisted to localStorage.
      // It lives in memory only and gets re-fetched via /refresh-token on
      // every page load, matching the httpOnly-cookie strategy on the backend.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
