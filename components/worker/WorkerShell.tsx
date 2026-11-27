"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PillNav, { type NavItem } from "./PillNav";
import { Ms } from "./ui";
import { useWorker } from "./WorkerProvider";

const ITEMS: NavItem[] = [
  { label: "Home", href: "/worker", icon: "home", match: (p) => p === "/worker" },
  { label: "Events", href: "/worker/events", icon: "event", match: (p) => p.startsWith("/worker/events") },
  { label: "My Applications", href: "/worker/applications", icon: "assignment", match: (p) => p.startsWith("/worker/applications") },
  { label: "My Events", href: "/worker/my-events", icon: "calendar_month", match: (p) => p.startsWith("/worker/my-events") },
  { label: "Payments", href: "/worker/payments", icon: "payments", match: (p) => p.startsWith("/worker/payments") },
];

export default function WorkerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { notices, markRead, markAll, profile, ask, notify, toast } = useWorker();
  const [open, setOpen] = useState<"" | "n" | "p">("");
  const unread = notices.filter((n) => !n.r).length;
  const initials = profile.name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  useEffect(() => setOpen(""), [path]);
  useEffect(() => {
    const down = (e: PointerEvent) => { if (!(e.target as Element).closest(".rel")) setOpen(""); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(""); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function contactAdmin() {
    setOpen("");
    ask({
      title: "Contact Admin",
      body: "Describe your question or problem and the admin team will reply.",
      yes: "Send message",
      input: "Write your message",
      onYes: async (msg) => {
        try {
          const res = await fetch("/api/support", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
          });
          if (res.ok) {
            notify("Support request sent", "Your message was sent to the admin team.", "/worker/profile");
            toast("Message sent to Admin");
          } else {
            toast("Failed to send support request");
          }
        } catch {
          toast("Failed to send support request");
        }
      },
    });
  }

  return (
    <>
      <header className="bar">
        <div className="wrap pnrow">
          <Link className="brand" href="/worker" aria-label="CrewHub home">CrewHub</Link>
          <PillNav items={ITEMS} pathname={path} />
          <span className="sp" />
          <div className="rel">
            <button className="ib" id="bell" aria-label={`Notifications, ${unread} unread`} aria-haspopup="true" onClick={() => setOpen(open === "n" ? "" : "n")}>
              <span className="ms">notifications</span>
              {unread > 0 && <span className="dot" id="bc">{unread}</span>}
            </button>
            {open === "n" && (
              <div className="dd" id="nd">
                <div className="dh"><b>Notifications</b>{unread > 0 && <button data-act="readall" onClick={markAll}>Mark all as read</button>}</div>
                {notices.length === 0 && <div className="empty">No notifications yet.</div>}
                {notices.map((n, i) => (
                  <div key={n.id || i} className={"ni" + (n.r ? " r" : "")} role="button" tabIndex={0}
                    onClick={() => { markRead(n.id || i); router.push(n.h); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); markRead(n.id || i); router.push(n.h); } }}>
                    <i /><div><b>{n.t}</b><span>{n.b}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rel">
            <button className="av" id="avb" aria-label="Profile menu" aria-haspopup="true" onClick={() => setOpen(open === "p" ? "" : "p")}>{initials}</button>
            {open === "p" && (
              <div className="dd sm" id="pd">
                <Link className="mi" href="/worker/profile"><span className="ms">account_circle</span>Profile</Link>
                <Link className="mi" href="/worker/my-events?tab=history"><span className="ms">history</span>Event History</Link>
                <button className="mi" onClick={contactAdmin}><span className="ms">support_agent</span>Contact Admin</button>
                <Link className="mi" href="/worker/password"><span className="ms">lock</span>Change password</Link>
                <Link className="mi" href="/worker/profile"><span className="ms">settings</span>Settings</Link>
                <button className="mi" onClick={logout}><span className="ms">logout</span>Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main>
        <div className="wrap">
          {children}
          <p className="note">Design preview only. All names, events, numbers and actions use sample data held in this page; in the live app the server decides selection, waitlists and payment status. Poster areas are placeholders for organizer-uploaded photos. The real screens read from the database.</p>
        </div>
      </main>
    </>
  );
}
