"use client";
import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function out() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    // Hard navigate to /login and refresh state
    window.location.replace("/login");
  }

  return (
    <button
      type="button"
      className="btn ghost"
      onClick={out}
      disabled={loading}
    >
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
