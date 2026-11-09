// src/pages/Profile.jsx
import { useState } from "react";
import { useAppStore } from "../Store/useAppStore";
import { COMPANY } from "../Constants/appConstants";
import { useNavigate } from "@tanstack/react-router";
import api from "../Config/axios";
import useAuthStore from "../Store/authStore";
import Loader from "../Components/Loader";

export default function Profile() {
  const navigate = useNavigate();
  const { profile, editProfile } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await editProfile({ name });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(profile?.name || "");
    setEditing(false);
  }

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      useAuthStore.getState().clearAuth();
      navigate({ to: "/login", replace: true });
    }
  };

  if (!profile) {
    return <Loader label="Loading profile…" className="py-20" />;
  }

  const initials = (profile.name || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-start md:items-center justify-center min-h-full p-4 md:p-6">
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1
          className="text-2xl text-[#1a1a12] text-center mb-2"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Profile
        </h1>

        <div
          className="bg-white rounded-2xl p-8 flex flex-col items-center gap-6"
          style={{
            border: "1px solid #e0dbd0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #3d7a4f, #2d6040)",
              boxShadow: "0 4px 16px rgba(61,122,79,0.3)",
            }}
          >
            {initials}
          </div>

          {!editing ? (
            <div className="w-full flex flex-col gap-4">
              <ProfileRow label="Full Name" value={profile.name} />
              <ProfileRow label="Email" value={profile.email} locked />
              <ProfileRow label="Role" value={profile.role || "Admin/Owner"} locked />
              <ProfileRow label="Shop Name" value={COMPANY.SHOP_NAME} locked />
              <button
                onClick={() => {
                  setName(profile.name || "");
                  setEditing(true);
                }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 hover:opacity-90 transition-opacity"
                style={{ background: "#3d7a4f" }}
              >
                Edit Name
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#7a7060" }}
                >
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#3d7a4f]/30"
                  style={{ border: "1px solid #e0dbd0" }}
                />
              </div>

              {/* Non-editable fields — shown for context, locked */}
              <LockedField label="Email" value={profile.email} />
              <LockedField label="Role" value={profile.role || "Admin/Owner"} />
              <LockedField label="Shop Name" value={COMPANY.SHOP_NAME} />

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#3d7a4f" }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="bg-white rounded-2xl p-4"
          style={{
            border: "1px solid #e0dbd0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <button
            onClick={() => setLogoutConfirm(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-red-50"
            style={{ color: "#dc2626", border: "1px solid #fecaca" }}
          >
            Log Out
          </button>
        </div>

        {logoutConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
              <div className="text-4xl text-center mb-3">👋</div>
              <h3 className="text-base font-semibold text-center mb-2" style={{ color: "#1a1a12" }}>
                Log out of Mr.Delight?
              </h3>
              <p className="text-sm text-center mb-5" style={{ color: "#7a7060" }}>
                You will need to log back in to access the admin panel.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ borderColor: "#e0dbd0", color: "#7a7060" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#dc2626" }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRow({ label, value, locked }) {
  return (
    <div
      className="flex flex-col gap-1 pb-3 border-b last:border-0 last:pb-0"
      style={{ borderColor: "#f0ebe1" }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
        style={{ color: "#b0a898" }}
      >
        {label}
        {locked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b0a898"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium" style={{ color: "#1a1a12" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function LockedField({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
        style={{ color: "#7a7060" }}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b0a898"
          strokeWidth="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </label>
      <input
        value={value || ""}
        disabled
        className="w-full px-3 py-2.5 rounded-xl text-sm cursor-not-allowed"
        style={{
          border: "1px solid #e0dbd0",
          background: "#f4f1eb",
          color: "#9a8e7e",
        }}
      />
    </div>
  );
}
