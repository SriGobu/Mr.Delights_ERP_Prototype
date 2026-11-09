import useAuthStore from "../Store/authStore";

/**
 * Mock session bootstrap — restores the demo session persisted in
 * localStorage. No backend required.
 */
const bootstrapAuth = async () => {
  await new Promise((r) => setTimeout(r, 600));
  const stored = useAuthStore.getState().getUser();
  if (stored) {
    useAuthStore.getState().setAuth("mock-access-token", stored);
    return true;
  }
  return false;
};

export default bootstrapAuth;
