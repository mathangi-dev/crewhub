"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [role, setRole] = useState<"WORKER" | "ORGANIZER">("WORKER");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("role") === "organizer") setRole("ORGANIZER");
  }, []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body = mode === "login" ? { email: f.email, password: f.password } : { ...f, role };
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.error?.details as Record<string, string[]> | undefined;
        setError((d && Object.values(d)[0]?.[0]) || data.error?.message || "Something went wrong");
      } else {
        window.location.href = data.redirectTo;
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <Link className="logo" href="/">CrewHub</Link>
      <h1>{mode === "login" ? "Log in" : "Create your account"}</h1>
      <form onSubmit={submit} noValidate>
        {mode === "register" && (
          <>
            <div className="seg" role="group" aria-label="Account type">
              <button type="button" className={`btn ${role === "WORKER" ? "" : "ghost"}`} onClick={() => setRole("WORKER")}>Volunteer</button>
              <button type="button" className={`btn ${role === "ORGANIZER" ? "" : "ghost"}`} onClick={() => setRole("ORGANIZER")}>Organizer</button>
            </div>
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" autoComplete="name" required />
            {role === "ORGANIZER" && (
              <>
                <label htmlFor="orgName">Organization name</label>
                <input id="orgName" name="orgName" required />
              </>
            )}
          </>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
        <p className="err" role="alert">{error}</p>
        <button className="btn full" disabled={busy}>{busy ? "Please wait" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <p className="muted">
        {mode === "login" ? <>New to CrewHub? <Link href="/register">Register</Link></> : <>Already a member? <Link href="/login">Log in</Link></>}
      </p>
    </main>
  );
}
