"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ms } from "../ui";
import { useWorker } from "../WorkerProvider";

export default function PasswordView() {
  const router = useRouter();
  const { toast } = useWorker();
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = !cur ? "Enter your current password."
      : n1.length < 8 ? "New password must be at least 8 characters."
      : n1 === cur ? "New password must be different."
      : n1 !== n2 ? "New passwords do not match." : "";
    setErr(m);
    if (m) return;

    setLoading(true);
    try {
      const res = await fetch("/api/worker/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cur, n1 }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        toast("Password updated successfully");
        router.push("/worker/profile");
      } else {
        setErr(data.error?.message || "Failed to update password");
      }
    } catch {
      setLoading(false);
      setErr("Network error updating password");
    }
  }

  return (
    <>
      <Link className="bk" href="/worker/profile"><span className="ms">arrow_back</span>Profile</Link>
      <div className="head"><div><h1>Change password</h1><p className="sub">Use at least 8 characters and a password you do not use anywhere else.</p></div></div>
      <form className="f panel pad" id="pwf" onSubmit={submit} noValidate style={{ maxWidth: 480 }}>
        <label htmlFor="p0">Current password</label><input id="p0" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <label htmlFor="p1">New password</label><input id="p1" type="password" value={n1} onChange={(e) => setN1(e.target.value)} autoComplete="new-password" />
        <label htmlFor="p2">Confirm new password</label><input id="p2" type="password" value={n2} onChange={(e) => setN2(e.target.value)} autoComplete="new-password" />
        <p className="er" id="e_pw">{err}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
          <Link className="btn sec" href="/worker/profile">Cancel</Link>
        </div>
      </form>
    </>
  );
}
