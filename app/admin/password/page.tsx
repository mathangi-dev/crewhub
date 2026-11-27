"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPasswordPage() {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = !cur
      ? "Enter current password."
      : n1.length < 8
      ? "New password must be at least 8 characters."
      : n1 === cur
      ? "New password must be different."
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
        setSuccess(true);
        setTimeout(() => router.push("/admin"), 1500);
      } else {
        setErr(data.error?.message || "Failed to update password");
      }
    } catch {
      setLoading(false);
      setErr("Network error updating password");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "480px", background: "#fff", borderRadius: "20px", border: "1px solid var(--line)", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span className="ms" style={{ fontSize: "28px" }}>shield</span>
          <h2 style={{ margin: 0, fontSize: "22px" }}>Change Admin Password</h2>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 20px" }}>
          Update administrator password for CrewHub platform governance.
        </p>

        {err && (
          <div style={{ background: "#fde8e8", color: "#e11900", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
            {err}
          </div>
        )}

        {success && (
          <div style={{ background: "#e6f7ef", color: "#05944f", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
            Password updated successfully! Redirecting to admin dashboard...
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Current Password *</label>
            <input
              type="password"
              style={{ width: "100%", height: "46px", borderRadius: "10px", border: "1px solid var(--line)", padding: "0 14px", font: "inherit" }}
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>New Password *</label>
            <input
              type="password"
              style={{ width: "100%", height: "46px", borderRadius: "10px", border: "1px solid var(--line)", padding: "0 14px", font: "inherit" }}
              value={n1}
              onChange={(e) => setN1(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Confirm New Password *</label>
            <input
              type="password"
              style={{ width: "100%", height: "46px", borderRadius: "10px", border: "1px solid var(--line)", padding: "0 14px", font: "inherit" }}
              value={n2}
              onChange={(e) => setN2(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Updating..." : "Update Password"}
            </button>
            <Link className="btn ghost" href="/admin" style={{ textDecoration: "none" }}>
              Back to Admin
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
