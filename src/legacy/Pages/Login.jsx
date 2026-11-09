import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import useAuthStore from "../Store/authStore";
import { COMPANY } from "../Constants/appConstants";

function Login() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authError = search?.error ?? null;

  const errorMessageMap = {
    unauthorized: "This Google account is not authorized for this app.",
    invalid_profile: "Google profile data is invalid. Please try again.",
    google_auth_failed: "Google sign-in failed. Please try again.",
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [signingIn, setSigningIn] = useState(false);

  // Demo mode — any Google account is accepted, no backend required.
  const handleGoogleLogin = async () => {
    setSigningIn(true);
    await new Promise((r) => setTimeout(r, 700));
    useAuthStore.getState().setAuth("mock-access-token", {
      id: "mockuser",
      name: "Demo Admin",
      email: "demo@mrdelights.in",
      role: "admin",
    });
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <>
      <div className="min-h-screen flex bg-[#f4f1eb] text-[#1a1a12] font-[Outfit]">
        {/* =====================================================
          LEFT BRAND SECTION
          ===================================================== */}
        <section className="relative hidden w-[45%] min-h-screen overflow-hidden bg-[#1a2b1c] text-white lg:flex items-center justify-center">
          {/* Decorative circles */}
          <div className="absolute -right-44 -top-44 h-[420px] w-[420px] rounded-full border border-[#d4af37]/10" />

          <div className="absolute -bottom-72 -left-72 h-[520px] w-[520px] rounded-full border border-white/[0.04]" />

          <div className="relative z-10 w-[420px]">
            {/* Logo */}
            <div className="mb-7">
              <img
                src="/mr-delights-login.svg"
                alt="Mr. Delights"
                className="w-56 sm:w-60 md:w-64"
              />
            </div>

            {/* Brand name */}
            <h1 className="font-['DM_Serif_Display'] text-6xl font-normal leading-tight text-white">
              {COMPANY.SHOP_NAME}
            </h1>

            {/* Gold line */}
            <div className="my-5 h-[2px] w-[52px] bg-[#d4af37]" />

            {/* Tagline */}
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#d4af37]">
              {COMPANY.TAGLINE ? COMPANY.TAGLINE : "Your trusted business partner."}
            </p>

            {/* Description */}
            <p className="mt-7 max-w-[340px] text-base leading-7 text-white/65">
              {COMPANY.DESCRIPTION
                ? COMPANY.DESCRIPTION
                : "Manage your business efficiently with our comprehensive management system."}
            </p>

            {/* Footer */}
            <div className="mt-[70px] flex items-center gap-2.5 text-[9px] font-semibold tracking-[0.12em] text-white/30">
              <span>MR DELIGHTS</span>
              <span>•</span>
              <span>BUSINESS MANAGEMENT</span>
            </div>
          </div>
        </section>

        {/* =====================================================
          LOGIN SECTION
          ===================================================== */}
        <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[440px] rounded-[18px] border border-[#e0dbd0] bg-white px-6 py-9 shadow-[0_20px_60px_rgba(26,43,28,0.08)] sm:px-[42px] sm:py-[46px]">
            {/* Header */}
            <div className="mb-8">
              <span className="mb-3 inline-block text-[11px] font-bold uppercase tracking-[0.15em] text-[#b5813a]">
                MR DELIGHTS
              </span>

              <h2 className="font-['DM_Serif_Display'] text-[40px] font-normal leading-tight text-[#1a1a12]">
                Welcome back
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#7a7060]">
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* =================================================
              ERROR MESSAGE
              ================================================= */}
            {authError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-[10px] border border-[#e5b8b8] bg-[#fff5f5] px-3.5 py-3 text-[13px] leading-5 text-[#9b3b3b]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9b3b3b] text-xs font-bold text-white">
                  !
                </span>

                <span>{errorMessageMap[authError] || errorMessageMap.google_auth_failed}</span>
              </div>
            )}

            {/* =================================================
              GOOGLE LOGIN BUTTON
              ================================================= */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={signingIn}
              className="flex h-[54px] w-full items-center justify-center gap-3 rounded-[10px] border border-[#d8d4cc] bg-white text-sm font-semibold text-[#1a1a12] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#3d7a4f] hover:bg-[#fafcf9] hover:shadow-[0_5px_18px_rgba(61,122,79,0.12)] active:translate-y-0"
            >
              {/* Google Icon */}
              <span className="flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.22a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.7 2.93-4.2 2.93-7.4z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 21.8c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.54 13.9A5.86 5.86 0 0 1 6.23 12c0-.66.11-1.3.31-1.9V7.58H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.42l3.24-2.52z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.07c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.14 14.63 2.2 12 2.2a9.75 9.75 0 0 0-8.7 5.38l3.24 2.52c.77-2.31 2.92-4.03 5.46-4.03z"
                  />
                </svg>
              </span>

              <span>Continue with Google</span>
            </button>

            {/* =================================================
              DIVIDER
              ================================================= */}
            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#e0dbd0]" />

              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-[#9a9183]">
                Authorized accounts only
              </p>

              <span className="h-px flex-1 bg-[#e0dbd0]" />
            </div>

            {/* Description */}
            <p className="text-center text-xs leading-6 text-[#7a7060]">
              Use your authorized Google account to access the MR Delights management system.
            </p>

            {/* Security */}
            <div className="mt-7 flex items-center justify-center gap-2 text-[11px] font-medium text-[#8a8275]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b5813a]" />
              Secure business access
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Login;
