"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import PillNav, { type NavItem } from "@/components/worker/PillNav";
import { useOrganizer } from "./OrganizerProvider";

const ITEMS: NavItem[] = [
  { label: "Overview", href: "/organizer?tab=overview", icon: "dashboard", match: (p) => p.includes("overview") || p === "/organizer" },
  { label: "Create Event", href: "/organizer?tab=create", icon: "add_circle", match: (p) => p.includes("create") },
  { label: "Crew & Applicants", href: "/organizer?tab=crew", icon: "group", match: (p) => p.includes("crew") },
  { label: "Attendance", href: "/organizer?tab=attendance", icon: "how_to_reg", match: (p) => p.includes("attendance") },
  { label: "Payments", href: "/organizer?tab=payments", icon: "payments", match: (p) => p.includes("payments") },
];

export default function OrganizerShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const activePath = `/organizer?tab=${currentTab}`;
  const router = useRouter();

  const { data, activeDialog, closeDialog, toastMsg } = useOrganizer();
  const [profileOpen, setProfileOpen] = useState(false);
  const [dialogInput, setDialogInput] = useState("");

  const initials = data.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "OR";

  useEffect(() => {
    if (activeDialog?.defaultValue !== undefined) {
      setDialogInput(activeDialog.defaultValue);
    } else {
      setDialogInput("");
    }
  }, [activeDialog]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <header className="bar">
        <div className="wrap pnrow">
          <Link className="brand" href="/organizer" aria-label="CrewHub home">
            CrewHub <span className="org-tag">Organizer</span>
          </Link>
          <PillNav items={ITEMS} pathname={activePath} />
          <span className="sp" />

          <div className="rel">
            <button
              className="av"
              id="org-avb"
              aria-label="Organizer profile menu"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              {initials}
            </button>
            {profileOpen && (
              <div className="dd sm" style={{ minWidth: "220px" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>{data.profile.orgName}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>{data.profile.email}</div>
                  {data.profile.verified && (
                    <span className="badge-verified" style={{ marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span className="ms" style={{ fontSize: "14px" }}>verified</span> Verified Organizer
                    </span>
                  )}
                </div>
                <button
                  className="mi"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/organizer?tab=overview");
                  }}
                >
                  <span className="ms">dashboard</span>Dashboard Overview
                </button>
                <button
                  className="mi"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/organizer?tab=create");
                  }}
                >
                  <span className="ms">add_box</span>Create New Event
                </button>
                <Link
                  className="mi"
                  href="/organizer/password"
                  onClick={() => setProfileOpen(false)}
                >
                  <span className="ms">lock</span>Change password
                </Link>
                <button className="mi" onClick={logout} style={{ color: "var(--red)" }}>
                  <span className="ms">logout</span>Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <div className="wrap">{children}</div>
      </main>

      {/* Active Dialog Modal */}
      {activeDialog && (
        <div className="modal-backdrop" onClick={closeDialog}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{activeDialog.title}</h3>
            <p>{activeDialog.body}</p>
            {activeDialog.input && (
              <input
                type="text"
                className="inp modal-input"
                placeholder={activeDialog.input}
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                autoFocus
              />
            )}
            <div className="modal-actions">
              <button className="btn sm ghost" onClick={closeDialog}>
                {activeDialog.no || "Cancel"}
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  activeDialog.onYes(dialogInput);
                  closeDialog();
                }}
              >
                {activeDialog.yes || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && <div className="toast-pop">{toastMsg}</div>}
    </>
  );
}
