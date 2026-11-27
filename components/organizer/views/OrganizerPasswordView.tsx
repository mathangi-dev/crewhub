"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOrganizer } from "../OrganizerProvider";

export default function OrganizerPasswordView() {
  const router = useRouter();
  const { toast } = useOrganizer();
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = !cur
      ? "Enter your current password."
      : n1.length < 8
      ? "New password must be at least 8 characters."
      : n1 === cur
      ? "New password must be different from current password."
      : n1 !== n2
      ? "New passwords do not match."
      : "";
    setErr(m);
    if (m) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cur, n1 }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        toast("Password updated successfully");
        router.push("/organizer?tab=overview");
      } else {
        setErr(data.error?.message || "Failed to update password");
      }
    } catch {
      setLoading(false);
      setErr("Network error updating password");
    }
  }

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "16px 0" }}>
      <Link
        className="btn sm ghost"
        href="/organizer?tab=overview"
        style={{ marginBottom: "16px", display: "inline-flex", gap: "6px" }}
      >
        <span className="ms">arrow_back</span> Back to Overview
      </Link>

      <div className="panel org-panel" style={{ padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span className="ms" style={{ fontSize: "24px" }}>lock</span>
          <h2 style={{ margin: 0, fontSize: "22px", letterSpacing: "-0.5px" }}>Change Organizer Password</h2>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 24px" }}>
          Ensure your organizer account stays secure. Must be at least 8 characters.
        </p>

        {err && (
          <div className="org-error-banner" style={{ marginBottom: "20px" }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label htmlFor="p0">Current Password *</label>
            <input
              id="p0"
              type="password"
              className="inp"
              placeholder="Enter your current password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="p1">New Password *</label>
            <input
              id="p1"
              type="password"
              className="inp"
              placeholder="At least 8 characters"
              value={n1}
              onChange={(e) => setN1(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="p2">Confirm New Password *</label>
            <input
              id="p2"
              type="password"
              className="inp"
              placeholder="Re-enter new password"
              value={n2}
              onChange={(e) => setN2(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button className="btn" type="submit" disabled={loading}>
              <span className="ms">lock_reset</span>
              {loading ? "Updating..." : "Update Password"}
            </button>
            <Link className="btn ghost" href="/organizer?tab=overview">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
