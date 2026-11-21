import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { apply, registerBackup } from "@/app/actions";
import EventDetail from "@/components/EventDetail";
import { inr } from "@/lib/money";

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { err?: string; applied?: string; conflicting?: string };
}) {
  const u = await need("WORKER");
  const e: any = await db.event.findUnique({
    where: { id: params.id },
    include: {
      organizer: true,
      roles: {
        include: {
          applications: true,
          backupWorkers: true,
        },
      },
    },
  });
  if (!e || e.status !== "PUBLISHED") notFound();

  return (
    <EventDetail e={e} back={["/volunteer/events", "All events"]}>
      {searchParams.err === "conflict" && (
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #f87171",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "18px",
            color: "#991b1b",
          }}
        >
          <b>Schedule Conflict Detected:</b> You already hold an active confirmed shift during this time{" "}
          {searchParams.conflicting ? `(${decodeURIComponent(searchParams.conflicting)})` : ""}. CrewHub prevents overlapping confirmed shifts to maintain event reliability.
        </div>
      )}

      {searchParams.err === "not_approved" && (
        <div
          style={{
            background: "#fffbeb",
            border: "1.5px solid #fde047",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "18px",
            color: "#854d0e",
          }}
        >
          <b>Verification Required:</b> Your worker account is currently pending Admin approval. You will be able to apply for shifts once approved.
        </div>
      )}

      {searchParams.applied === "1" && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "18px",
            color: "#166534",
          }}
        >
          <b>Application Submitted Successfully!</b> You can track your confirmation or waiting list status in{" "}
          <Link href="/volunteer/applications" style={{ fontWeight: 700, textDecoration: "underline" }}>
            My Applications
          </Link>.
        </div>
      )}

      <h2>Available Job Categories &amp; Roles</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {e.roles.map((r: any) => {
          const acceptedCount = r.applications.filter((a: any) => a.status === "ACCEPTED").length;
          const waitlistCount = r.applications.filter((a: any) => a.status === "WAITLISTED").length;
          const spotsLeft = Math.max(0, r.slots - acceptedCount);
          const isFull = spotsLeft === 0;
          const mine = r.applications.find((a: any) => a.userId === u.id);
          const myBackup = r.backupWorkers.find((b: any) => b.workerId === u.id && b.status === "ACTIVE");

          const wageDisplay =
            r.wageType === "HOURLY"
              ? `${inr(r.pay)} / hr (${inr(Math.round(r.pay * (r.hours || 1)))} shift total)`
              : `${inr(r.pay)} / shift`;

          const methodLabel =
            r.selectionMethod === "FIRST_COME"
              ? "⚡ First-Come, First-Served"
              : r.selectionMethod === "AUTOMATIC"
              ? "🤖 Automatic Matching"
              : "📋 Manual Review";

          return (
            <div
              key={r.id}
              className="role"
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <b style={{ fontSize: "1.2rem", color: "#0f172a" }}>{r.title}</b>
                    <span
                      style={{
                        background: "#f1f5f9",
                        color: "#334155",
                        fontSize: "0.78rem",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontWeight: 600,
                      }}
                    >
                      {methodLabel}
                    </span>
                    {r.isUrgentVacancy && (
                      <span
                        style={{
                          background: "#fee2e2",
                          color: "#dc2626",
                          fontSize: "0.78rem",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontWeight: 700,
                        }}
                      >
                        ⚡ Urgent Vacancy
                      </span>
                    )}
                  </div>

                  <div className="mute" style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                    Wage: <b>{wageDisplay}</b> · Duration: <b>{r.hours ? `${r.hours} hrs` : "Full Event"}</b>
                    {r.locationSpecific ? ` · Location: ${r.locationSpecific}` : ""}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <b style={{ fontSize: "1.1rem", color: isFull ? "#dc2626" : "#16a34a" }}>
                    {isFull ? "All Spots Filled" : `${spotsLeft} of ${r.slots} spots left`}
                  </b>
                  {isFull && (
                    <div className="mute" style={{ fontSize: "0.8rem" }}>
                      {waitlistCount} worker{waitlistCount === 1 ? "" : "s"} on waiting list
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="bar" style={{ margin: "14px 0" }}>
                <i
                  style={{
                    width: `${Math.min(100, (acceptedCount / r.slots) * 100)}%`,
                    background: isFull ? "#ef4444" : "#10b981",
                  }}
                />
              </div>

              {r.description && (
                <p style={{ margin: "8px 0", fontSize: "0.92rem", color: "#334155" }}>
                  {r.description}
                </p>
              )}

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "0.85rem", color: "#64748b", margin: "10px 0" }}>
                {r.experienceReq && r.experienceReq !== "None" && (
                  <div>
                    Experience: <b>{r.experienceReq}</b>
                  </div>
                )}
                {r.skills && (
                  <div>
                    Required Skills: <b>{r.skills}</b>
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                <div>
                  {mine && !["CANCELLED", "WITHDRAWN", "REJECTED"].includes(mine.status) ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span
                        className={`tag ${
                          mine.status === "ACCEPTED" ? "ok" : mine.status === "WAITLISTED" ? "warn" : ""
                        }`}
                        style={{ fontSize: "0.85rem", padding: "5px 12px" }}
                      >
                        {mine.status === "ACCEPTED"
                          ? "✓ Confirmed Assignment"
                          : mine.status === "WAITLISTED"
                          ? `Waiting List Position #${mine.waitlistPosition}`
                          : mine.status === "OFFERED"
                          ? "⚡ Replacement Offer Available!"
                          : "Application Under Review"}
                      </span>
                      <Link href="/volunteer/applications" className="btn ghost sm">
                        View Application
                      </Link>
                    </div>
                  ) : (
                    <form action={apply.bind(null, r.id, e.id)}>
                      <button
                        disabled={u.approval !== "APPROVED"}
                        style={{
                          background: isFull ? "#475569" : "#0284c7",
                          color: "#fff",
                          fontWeight: 700,
                          padding: "10px 20px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: u.approval === "APPROVED" ? "pointer" : "not-allowed",
                        }}
                      >
                        {isFull ? "Join Waiting List (FCFS Auto-Replacement)" : "Apply for This Role"}
                      </button>
                    </form>
                  )}
                </div>

                {/* Standby Backup Option */}
                {!mine && (
                  <div>
                    {myBackup ? (
                      <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: 600 }}>
                        ✓ Registered as Standby Backup
                      </span>
                    ) : (
                      <form action={registerBackup.bind(null, r.id)}>
                        <button
                          type="submit"
                          className="btn ghost sm"
                          style={{ fontSize: "0.82rem" }}
                          title="Register for on-call standby priority with allowance"
                        >
                          Volunteer as Backup Standby
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </EventDetail>
  );
}
