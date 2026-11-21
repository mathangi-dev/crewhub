import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import {
  cancelApplication,
  withdrawWaitlist,
  respondToReplacementOffer,
  cancelWorkerAssignment,
} from "@/app/actions";
import { inr, hm } from "@/lib/money";

export default async function Page({
  searchParams,
}: {
  searchParams: { cancelled?: string; err?: string; offer?: string };
}) {
  const u = await need("WORKER");
  const now = new Date();

  const allApps: any[] = await db.application.findMany({
    where: { userId: u.id, checkOut: null },
    orderBy: { role: { event: { startsAt: "asc" } } },
    include: {
      role: {
        include: {
          event: true,
        },
      },
    },
  });

  const offers = allApps.filter((a) => a.status === "OFFERED");
  const confirmed = allApps.filter((a) => a.status === "ACCEPTED");
  const waitlisted = allApps.filter((a) => a.status === "WAITLISTED");
  const pending = allApps.filter((a) => a.status === "PENDING");
  const cancelled = allApps.filter((a) => a.status === "CANCELLED" || a.status === "WITHDRAWN");

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Worker dashboard</span>
          <h1>My Applications &amp; Assignments</h1>
        </div>
      </div>
      <p className="mute">
        Monitor your active gig applications, live waiting list positions, urgent replacement offers, and confirmed shifts.
      </p>

      {searchParams.cancelled === "1" && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fde047",
            borderRadius: "10px",
            padding: "12px 18px",
            marginBottom: "16px",
            color: "#854d0e",
          }}
        >
          Assignment released. CrewHub has automatically notified the organizer and offered the spot to the next waiting-list candidate.
        </div>
      )}

      {searchParams.err === "expired" && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #f87171",
            borderRadius: "10px",
            padding: "12px 18px",
            marginBottom: "16px",
            color: "#991b1b",
          }}
        >
          The replacement offer deadline has expired and was automatically cascaded to the next waiting-list worker.
        </div>
      )}

      {/* 1. URGENT REPLACEMENT OFFERS */}
      {offers.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ color: "#0284c7", display: "flex", alignItems: "center", gap: "8px" }}>
            ⚡ Urgent Replacement Offers ({offers.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {offers.map((a) => {
              const expiresAt = a.offerExpiresAt ? new Date(a.offerExpiresAt) : null;
              const isExpired = expiresAt ? expiresAt < now : false;

              return (
                <div
                  key={a.id}
                  className="card"
                  style={{
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    border: "2px solid #3b82f6",
                    borderRadius: "14px",
                    padding: "18px 20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <span
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        ACTION REQUIRED
                      </span>
                      <b style={{ fontSize: "1.15rem", display: "block", marginTop: "4px", color: "#1e3a8a" }}>
                        {a.role.title} at {a.role.event.title}
                      </b>
                      <div className="mute" style={{ color: "#1e40af", fontSize: "0.88rem", marginTop: "2px" }}>
                        {a.role.event.startsAt.toLocaleDateString("en-IN")} · {inr(a.role.pay)}{" "}
                        {a.role.wageType === "HOURLY" ? "/ hr" : " flat"} · {a.role.hours} hrs
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {expiresAt && (
                        <div style={{ fontSize: "0.85rem", color: isExpired ? "#dc2626" : "#b45309", fontWeight: 700 }}>
                          {isExpired ? "Offer Expired" : `Expires at ${hm(expiresAt)}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: "10px 0 14px", fontSize: "0.88rem", color: "#1e293b" }}>
                    A confirmed worker had to cancel their spot. As the next eligible candidate on the waiting list, this vacancy is reserved for you.
                  </p>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <form action={respondToReplacementOffer.bind(null, a.id, true)}>
                      <button
                        type="submit"
                        disabled={isExpired}
                        style={{
                          background: "#16a34a",
                          color: "#fff",
                          fontWeight: 700,
                          padding: "8px 20px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: isExpired ? "not-allowed" : "pointer",
                        }}
                      >
                        ✓ Accept &amp; Confirm Shift
                      </button>
                    </form>

                    <form action={respondToReplacementOffer.bind(null, a.id, false)}>
                      <button
                        type="submit"
                        className="btn ghost"
                        style={{ padding: "8px 16px", borderRadius: "8px" }}
                      >
                        Decline (Pass to Next Worker)
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CONFIRMED ASSIGNMENTS */}
      <div style={{ marginBottom: "28px" }}>
        <h2>Confirmed Assignments ({confirmed.length})</h2>
        {!confirmed.length ? (
          <p className="card mute">No confirmed upcoming assignments. Browse open roles to apply.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {confirmed.map((a) => (
              <div
                key={a.id}
                className="card"
                style={{
                  borderLeft: "4px solid #16a34a",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b style={{ fontSize: "1.05rem", color: "#0f172a" }}>{a.role.title}</b>
                    <span className="tag ok">CONFIRMED</span>
                  </div>
                  <div className="mute" style={{ marginTop: "4px", fontSize: "0.88rem" }}>
                    Event: <b>{a.role.event.title}</b> · {a.role.event.startsAt.toLocaleDateString("en-IN")} (
                    {hm(a.role.event.startsAt)} to {hm(a.role.event.endsAt)})
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#059669", marginTop: "2px", fontWeight: 600 }}>
                    Pay: {inr(a.role.pay)} {a.role.wageType === "HOURLY" ? "/ hr" : ""} · {a.role.hours} hours
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <Link href={`/volunteer/my-events?id=${a.role.eventId}`} className="btn sm">
                    Shift Details
                  </Link>

                  {/* Cancellation Disclosure Form */}
                  <details style={{ display: "inline-block" }}>
                    <summary
                      className="btn ghost sm"
                      style={{ color: "#dc2626", cursor: "pointer", listStyle: "none" }}
                    >
                      Cancel Assignment
                    </summary>
                    <form
                      action={cancelWorkerAssignment.bind(null, a.id)}
                      style={{
                        marginTop: "8px",
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        padding: "12px",
                        borderRadius: "8px",
                        minWidth: "260px",
                      }}
                    >
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#9f1239" }}>
                        Reason for Cancellation
                      </label>
                      <input
                        name="reason"
                        placeholder="e.g. Medical emergency, urgent travel"
                        required
                        style={{ width: "100%", margin: "4px 0 8px", padding: "6px 8px", fontSize: "0.82rem" }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#4c0519", marginBottom: "8px" }}>
                        <input type="checkbox" name="isEmergency" />
                        This is an unavoidable emergency
                      </label>
                      <button
                        type="submit"
                        style={{
                          background: "#e11d48",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        Confirm Cancellation
                      </button>
                    </form>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. WAITING LIST APPLICATIONS */}
      <div style={{ marginBottom: "28px" }}>
        <h2>Waiting List Positions ({waitlisted.length})</h2>
        {!waitlisted.length ? (
          <p className="card mute">You are not currently waitlisted for any events.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {waitlisted.map((a) => (
              <div
                key={a.id}
                className="card"
                style={{
                  borderLeft: "4px solid #f59e0b",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b style={{ fontSize: "1.05rem" }}>{a.role.title}</b>
                    <span
                      style={{
                        background: "#fef3c7",
                        color: "#b45309",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      Waiting List Position #{a.waitlistPosition || "—"}
                    </span>
                  </div>
                  <div className="mute" style={{ marginTop: "4px", fontSize: "0.88rem" }}>
                    Event: <b>{a.role.event.title}</b> · {a.role.event.startsAt.toLocaleDateString("en-IN")} ·{" "}
                    {a.role.event.city}
                  </div>
                  <div className="mute" style={{ fontSize: "0.78rem", marginTop: "2px", color: "#64748b" }}>
                    Automatic promotion: You will be sent an immediate replacement offer if any confirmed worker cancels.
                  </div>
                </div>

                <div>
                  <form action={withdrawWaitlist.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="btn ghost sm"
                      title="Withdraw from waiting list without any penalty"
                    >
                      Withdraw Application
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. PENDING APPLICATIONS */}
      {pending.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2>Applications Under Review ({pending.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pending.map((a) => (
              <div key={a.id} className="card row" style={{ alignItems: "center" }}>
                <div>
                  <b>{a.role.title}</b> at <Link href={`/volunteer/events/${a.role.eventId}`}>{a.role.event.title}</Link>
                  <div className="mute">
                    {a.role.event.startsAt.toLocaleDateString("en-IN")} · {inr(a.role.pay)}
                    {a.matchScore != null && ` · Match Score: ${Math.round(a.matchScore)}%`}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="tag">PENDING REVIEW</span>
                  <form action={cancelApplication.bind(null, a.id)}>
                    <button className="ghost sm">Cancel</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
