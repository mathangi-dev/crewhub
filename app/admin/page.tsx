import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { Stats, Tag } from "@/components/ui";
import { inr, dt } from "@/lib/money";

export default async function AdminDashboard() {
  await need("ADMIN");
  const now = new Date();

  // User counts
  const totalUsers = await db.user.count();
  const totalOrganizers = await db.user.count({ where: { role: "ORGANIZER" } });
  const totalWorkers = await db.user.count({ where: { role: { in: ["WORKER", "VOLUNTEER"] } } });
  const pendingWorkerApprovals = await db.user.count({
    where: { role: { in: ["WORKER", "VOLUNTEER"] }, approval: "PENDING" },
  });
  const pendingOrganizerApprovals = await db.user.count({
    where: { role: "ORGANIZER", approval: "PENDING" },
  });

  // Event counts
  const pendingEventApprovals = await db.event.count({ where: { status: "PENDING" } });
  const activeEvents = await db.event.count({
    where: { status: "PUBLISHED", endsAt: { gte: now } },
  });
  const completedEvents = await db.event.count({
    where: { status: "PUBLISHED", endsAt: { lt: now } },
  });

  // Workforce Assignment counts
  const totalAssignments = await db.application.count({ where: { status: "ACCEPTED" } });
  const totalWaitlisted = await db.application.count({ where: { status: "WAITLISTED" } });
  const totalPendingApps = await db.application.count({ where: { status: "PENDING" } });

  // Cancellation statistics
  const totalCancellations = await db.application.count({ where: { status: "CANCELLED" } });
  const workerCancellations = await db.application.count({
    where: { status: "CANCELLED", cancelledBy: "WORKER" },
  });
  const organizerCancellations = await db.application.count({
    where: { status: "CANCELLED", cancelledBy: "ORGANIZER" },
  });
  const emergencyCancellations = await db.application.count({
    where: { status: "CANCELLED", isEmergency: true },
  });

  // Payment summaries
  const allPaidEvents = await db.event.findMany({
    where: { payStatus: "PAID" },
    select: { crewTotal: true, commission: true, refunded: true },
  });
  const totalCollected = allPaidEvents.reduce((s, e) => s + e.crewTotal + e.commission, 0);
  const totalCommission = allPaidEvents.reduce((s, e) => s + e.commission, 0);
  const totalRefunded = allPaidEvents.reduce((s, e) => s + (e.refunded || 0), 0);
  const payoutAggregate = await db.application.aggregate({
    _sum: { payout: true },
    where: { paid: true },
  });
  const paidToWorkers = payoutAggregate._sum.payout || 0;

  // Open inquiries & complaints
  const openQueries = await db.supportQuery.count({ where: { status: "OPEN" } });

  // Recent pending events
  const pendingEvents = await db.event.findMany({
    where: { status: "PENDING" },
    orderBy: { startsAt: "asc" },
    take: 5,
    include: { organizer: true, roles: true },
  });

  // Recent audit logs
  const recentLogs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const actorIds = [...new Set(recentLogs.map((l) => l.actorId))];
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, role: true },
  });
  const actorMap = Object.fromEntries(actors.map((u) => [u.id, u]));

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Admin console</span>
          <h1>Workforce Platform Overview</h1>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/admin/events" className="btn sm">
            Manage Events
          </Link>
          <Link href="/admin/payments" className="btn sm ghost">
            Safe Ledger
          </Link>
        </div>
      </div>

      {/* Primary Platform KPIs */}
      <h2 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Platform &amp; User Community</h2>
      <Stats
        items={[
          [totalUsers, "Total Platform Users"],
          [totalWorkers, "Registered Workers"],
          [totalOrganizers, "Event Organizers"],
          [pendingWorkerApprovals + pendingOrganizerApprovals, "Pending ID Approvals"],
        ]}
      />

      {/* Workforce & Event Operations */}
      <h2 style={{ fontSize: "1.1rem", margin: "24px 0 8px" }}>Workforce Allocation &amp; Events</h2>
      <Stats
        items={[
          [activeEvents, "Live / Upcoming Events"],
          [pendingEventApprovals, "Events Awaiting Approval"],
          [completedEvents, "Completed Events"],
          [totalAssignments, "Confirmed Assignments"],
          [totalWaitlisted, "Waitlisted Candidates"],
          [totalPendingApps, "Applications Under Review"],
        ]}
      />

      {/* Cancellation Management Statistics */}
      <h2 style={{ fontSize: "1.1rem", margin: "24px 0 8px" }}>Workforce Cancellations &amp; Reliability</h2>
      <Stats
        items={[
          [totalCancellations, "Total Cancellations"],
          [workerCancellations, "Cancelled by Worker"],
          [organizerCancellations, "Released by Organizer"],
          [emergencyCancellations, "Exempt Genuine Emergencies"],
        ]}
      />

      {/* Financial & Safe Escrow Summaries */}
      <h2 style={{ fontSize: "1.1rem", margin: "24px 0 8px" }}>Safe Escrow &amp; Payment Summaries</h2>
      <Stats
        items={[
          [inr(totalCollected), "Total Escrow Collected"],
          [inr(totalCommission), "Commission Earned (15%)"],
          [inr(paidToWorkers), "Disbursed to Workers"],
          [inr(totalRefunded), "Refunded to Organizers"],
        ]}
      />

      {/* Quick Action Queue: Pending Events */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Urgent Event Approvals ({pendingEvents.length})</h2>
          <Link href="/admin/events?s=PENDING" style={{ fontSize: "0.85rem", textDecoration: "underline" }}>
            View all pending events →
          </Link>
        </div>

        {!pendingEvents.length ? (
          <p className="card mute">No events currently awaiting admin review or approval.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingEvents.map((e) => (
              <div
                key={e.id}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <b style={{ fontSize: "1.05rem" }}>{e.title}</b>
                  <div className="mute" style={{ fontSize: "0.85rem", marginTop: "3px" }}>
                    Organizer: <b>{e.organizer.orgName || e.organizer.name}</b> · {e.city} · Crew Budget:{" "}
                    <b>{inr(e.crewTotal)}</b> · Payment: <Tag c={e.payStatus === "PAID" ? "ok" : "bad"}>{e.payStatus}</Tag>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Link href={`/admin/events?s=PENDING&id=${e.id}`} className="btn sm">
                    Review &amp; Approve
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disputes & Support Notice */}
      {openQueries > 0 && (
        <div
          className="card"
          style={{
            marginTop: "24px",
            background: "#fffbeb",
            borderLeft: "4px solid #f59e0b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <b style={{ color: "#92400e" }}>{openQueries} Support Inquiries / Disputes Awaiting Resolution</b>
            <div className="mute" style={{ fontSize: "0.85rem", marginTop: "2px" }}>
              Workers or organizers have submitted inquiries, attendance disputes, or complaints.
            </div>
          </div>
          <Link href="/admin/queries?s=OPEN" className="btn sm" style={{ background: "#d97706", color: "#fff" }}>
            Open Support Desk
          </Link>
        </div>
      )}

      {/* Platform Audit Log Trail */}
      <div style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "12px" }}>System Audit Trail</h2>
        <div className="card" style={{ padding: "12px 16px" }}>
          {!recentLogs.length ? (
            <p className="mute">No audit log records found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentLogs.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.85rem",
                    paddingBottom: "8px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      {actorMap[l.actorId]?.name || "System"} ({actorMap[l.actorId]?.role || "ADMIN"})
                    </span>
                    <span className="mute" style={{ marginLeft: "8px" }}>
                      {l.action}
                    </span>
                  </div>
                  <span className="mute" style={{ fontSize: "0.78rem" }}>
                    {dt(l.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}