"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganizer } from "../OrganizerProvider";

export default function OverviewView() {
  const { data, updateEventStatus, ask } = useOrganizer();
  const router = useRouter();

  const { stats, events, applicants, profile } = data;

  const handlePublishDraft = (ev: typeof events[0]) => {
    const fee = ev.platformFee ? ev.platformFee.feeAmount : Math.round(ev.totalVacancies * 50);
    ask({
      title: "Publish Event & Settle 10% Platform Fee",
      body: `To publish "${ev.title}", transfer the 10% CrewHub service fee of ₹${fee.toLocaleString("en-IN")} to crewhub.admin@okaxis. Enter your UPI Transaction Reference / UTR Number:`,
      input: "e.g. 432109876543 or UTR-...",
      defaultValue: `UTR-${Date.now().toString().slice(-8)}`,
      yes: "Pay & Publish Event",
      onYes: async (utr) => {
        if (!utr?.trim()) return;
        await updateEventStatus(ev.id, "PUBLISHED", utr.trim());
      },
    });
  };

  const statCards = [
    { label: "Active Events", val: stats.activeEvents, icon: "event_available", bg: "var(--lav)" },
    { label: "Confirmed Crew", val: stats.confirmedWorkers, icon: "how_to_reg", bg: "var(--mint)" },
    { label: "Total Applications", val: stats.totalApplicants, icon: "group", bg: "var(--sky)" },
    { label: "Pending Settlements", val: stats.pendingPaymentsCount, icon: "hourglass_top", bg: "var(--butter)" },
  ];

  return (
    <div className="org-page">
      {/* Overdue Restriction Banner */}
      {data.isRestricted && (
        <div
          style={{
            background: "#fff0f0",
            border: "1.5px solid #ff4d4f",
            borderRadius: "16px",
            padding: "14px 20px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="ms" style={{ fontSize: "22px", color: "#d9363e" }}>warning</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#a8071a" }}>
              Action Required: {data.overdueCount} worker settlement(s) past 24-hour deadline. Event publishing is restricted.
            </span>
          </div>
          <button
            type="button"
            className="btn sm"
            style={{ background: "#d9363e", color: "#fff", borderRadius: "999px", padding: "6px 16px", fontWeight: 600 }}
            onClick={() => router.push("/organizer?tab=payments")}
          >
            Settle Wages
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="hero2">
        <div className="top">
          <span className="hi">Welcome back, {profile.orgName}</span>
          <Link className="pp" href="/organizer?tab=create">
            <span className="ms" style={{ fontSize: "16px", verticalAlign: "middle" }}>add_circle</span>
            {" "}Post New Event
          </Link>
        </div>
        <h1>
          Managing <span className="lav">{stats.activeEvents} active event{stats.activeEvents === 1 ? "" : "s"}</span>
        </h1>
        <p style={{ color: "#d6d6d6", margin: "0 0 16px", fontSize: "15px" }}>
          You have {stats.confirmedWorkers} confirmed crew across {stats.totalEvents} total events.
        </p>
        <div className="org-hero-actions">
          <button
            type="button"
            className="org-hero-btn"
            style={{ color: "#111" }}
            onClick={() => router.push("/organizer?tab=create")}
          >
            <span className="ms" style={{ color: "#111" }}>add</span>
            <span style={{ color: "#111" }}>Create Event</span>
          </button>
          <button
            type="button"
            className="org-hero-btn"
            style={{ color: "#111" }}
            onClick={() => router.push("/organizer?tab=crew")}
          >
            <span className="ms" style={{ color: "#111" }}>group</span>
            <span style={{ color: "#111" }}>View All Crew</span>
          </button>
          <button
            type="button"
            className="org-hero-btn"
            style={{ color: "#111" }}
            onClick={() => router.push("/organizer?tab=payments")}
          >
            <span className="ms" style={{ color: "#111" }}>payments</span>
            <span style={{ color: "#111" }}>Settlements</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats" style={{ marginBottom: "28px" }}>
        {statCards.map((s, idx) => (
          <div key={s.label} className={`stat s${idx}`} style={{ background: s.bg, border: "1px solid #111" }}>
            <span className="ic"><span className="ms">{s.icon}</span></span>
            <div>
              <strong>{s.val}</strong>
              <small>{s.label}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Events List */}
      <section className="blk">
        <div className="ph0" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111", letterSpacing: "-0.3px" }}>
              Your Events
            </h2>
            <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
              ({events.length})
            </span>
          </div>
          <Link href="/organizer?tab=create" className="org-new-event-btn" style={{ textDecoration: "none" }}>
            <span className="ms" style={{ textDecoration: "none" }}>add</span>
            <span style={{ textDecoration: "none" }}>New Event</span>
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="panel empty" style={{ padding: "40px", textAlign: "center" }}>
            <h3>No events created yet</h3>
            <p style={{ color: "var(--muted)", margin: "8px 0 20px" }}>
              Get started by creating your first event to hire qualified temporary staff.
            </p>
            <Link href="/organizer?tab=create" className="btn">
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="org-events-grid">
            {events.map((ev) => {
              const startDate = new Date(ev.startsAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const pct = ev.totalVacancies > 0 ? Math.min(100, Math.round((ev.confirmedCrew / ev.totalVacancies) * 100)) : 0;

              return (
                <div key={ev.id} className="org-card" style={ev.posterUrl ? { padding: 0, overflow: "hidden" } : undefined}>
                  {ev.posterUrl && (
                    <div style={{ width: "100%", aspectRatio: "3 / 2", background: "#f0f0f8", overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ev.posterUrl}
                        alt={ev.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  )}
                  <div style={ev.posterUrl ? { padding: "18px 20px 22px" } : undefined}>
                    <div className="org-card-head">
                      <span className="org-card-cat">{ev.category}</span>
                      <span className={`badge-st badge-${ev.status.toLowerCase()}`}>
                        {ev.status}
                      </span>
                    </div>

                    <h3 className="org-card-title">{ev.title}</h3>
                    <div className="org-card-sub">
                      <span className="ms">location_on</span> {ev.venue}, {ev.city}
                    </div>
                    <div className="org-card-sub">
                      <span className="ms">calendar_today</span> {startDate}
                    </div>

                    <div className="org-vac-progress">
                      <div className="org-vac-info">
                        <span>Crew Confirmed:</span>
                        <b>{ev.confirmedCrew} / {ev.totalVacancies} ({pct}%)</b>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="org-card-roles">
                      {ev.jobs.map((j) => (
                        <span key={j.id} className="org-role-tag">
                          {j.name} (₹{j.wage})
                        </span>
                      ))}
                    </div>

                    <div className="org-card-actions">
                      <button
                        className="btn sm"
                        onClick={() => router.push(`/organizer?tab=crew&eventId=${ev.id}`)}
                      >
                        <span className="ms">group</span> Crew ({ev.totalApplicants})
                      </button>
                      {ev.status === "DRAFT" && (
                        <button
                          className="btn sm ghost"
                          onClick={() => handlePublishDraft(ev)}
                        >
                          Publish
                        </button>
                      )}
                      {ev.status === "PUBLISHED" && (
                        <button
                          className="btn sm ghost"
                          onClick={() => router.push(`/organizer?tab=attendance&eventId=${ev.id}`)}
                        >
                          Attendance
                        </button>
                      )}
                      {(ev.status === "PUBLISHED" || ev.status === "COMPLETED") && (
                        <button
                          className="btn sm ghost"
                          onClick={() => router.push(`/organizer?tab=payments&eventId=${ev.id}`)}
                        >
                          <span className="ms" style={{ fontSize: "14px", verticalAlign: "middle" }}>payments</span> Payments
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Applications Preview */}
      <section className="blk" style={{ marginTop: "32px" }}>
        <div className="panel">
          <div className="ph">
            <h2>Recent Crew Applications</h2>
            <Link href="/organizer?tab=crew">View all crew</Link>
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Event</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>City</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {applicants.slice(0, 5).map((app) => (
                  <tr key={app.id}>
                    <td>
                      <b>{app.workerName}</b>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>{app.workerEmail}</div>
                    </td>
                    <td>{app.eventTitle}</td>
                    <td><b>{app.jobName}</b> (₹{app.wage})</td>
                    <td>
                      <span className={`badge-st badge-${app.status.toLowerCase()}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>{app.workerCity}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  </tr>
                ))}
                {applicants.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "var(--muted)" }}>
                      No applications received yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
