import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { submitAttendanceDispute } from "@/app/actions";
import EventCard from "@/components/EventCard";
import EventDetail from "@/components/EventDetail";
import { Stats, Tag } from "@/components/ui";
import { inr, hm, dt } from "@/lib/money";

export default async function Page({ searchParams: sp }: { searchParams: { id?: string; disputed?: string } }) {
  const u = await need("WORKER");
  const apps: any[] = await db.application.findMany({
    where: { userId: u.id, checkOut: { not: null } },
    orderBy: { checkOut: "desc" },
    include: { role: { include: { event: { include: { organizer: true, roles: true } } } } },
  });

  const head = (
    <>
      <div className="dh">
        <div>
          <span className="mute">Worker dashboard</span>
          <h1>Work &amp; Attendance History</h1>
        </div>
      </div>
      <p className="mute">Verified completed events, attendance records, ratings, and salary receipts.</p>
    </>
  );

  if (sp.disputed === "1") {
    return (
      <>
        {head}
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "12px 18px", marginBottom: "16px", color: "#065f46" }}>
          Dispute statement received by Admin desk. Your record and reliability rating will be reviewed.
        </div>
      </>
    );
  }

  const a = sp.id ? apps.find((x) => x.role.eventId === sp.id) : null;
  if (a) {
    return (
      <>
        {head}
        <EventDetail e={a.role.event} back={["/volunteer/history", "Work history"]}>
          <h2>Shift Summary</h2>
          <div className="card">
            <p className="kv">
              <span className="mute">Role</span>
              <br />
              <b>{a.role.title}{a.role.hours ? ` · ${a.role.hours} hrs` : ""}</b>
            </p>
            <p className="kv">
              <span className="mute">Attendance Check-In / Check-Out</span>
              <br />
              <b>{hm(a.checkIn)} to {hm(a.checkOut)}</b>
            </p>
            <p className="kv">
              <span className="mute">Organizer Rating</span>
              <br />
              <b>{a.rating ? `${a.rating} / 5` : "Not rated yet"}</b>
            </p>
            <p style={{ margin: "10px 0" }}>
              {a.paid ? (
                <Tag c="ok">Paid {inr(a.payout)} on {dt(a.paidAt).split(",")[0]}</Tag>
              ) : a.role.event.crewTotal > 0 ? (
                <Tag>Payout pending settlement</Tag>
              ) : (
                <Tag>Unpaid volunteering</Tag>
              )}
            </p>

            {/* Attendance Dispute Desk */}
            <details style={{ marginTop: "16px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "#b45309" }}>
                Dispute Attendance or Rating Record
              </summary>
              <form action={submitAttendanceDispute.bind(null, a.id)} style={{ marginTop: "10px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>Explain your dispute</label>
                <textarea
                  name="disputeReason"
                  rows={2}
                  placeholder="Explain if your check-in time, hours, or rating was inaccurate..."
                  required
                  style={{ width: "100%", margin: "6px 0 10px", fontSize: "0.85rem", padding: "8px" }}
                />
                <button type="submit" className="btn sm">Submit Dispute to Admin</button>
              </form>
            </details>
          </div>
        </EventDetail>
      </>
    );
  }

  const rated = apps.filter((x) => x.rating);
  const avg = rated.length
    ? (rated.reduce((n, x) => n + x.rating, 0) / rated.length).toFixed(1)
    : "–";

  return (
    <>
      {head}
      <Stats
        items={[
          [apps.length, "Completed Shifts"],
          [avg, "Average Rating"],
          [`${Math.round(u.reliabilityScore ?? 100)}%`, "Reliability Score"],
        ]}
      />
      {apps.length ? (
        <div className="grid">
          {apps.map((x) => (
            <EventCard
              key={x.id}
              href={`/volunteer/history?id=${x.role.eventId}`}
              e={x.role.event}
              badge={x.rating ? `Rating: ${x.rating}/5` : "Completed"}
              sub={`${x.role.title} · In ${hm(x.checkIn)} · Out ${hm(x.checkOut)}`}
            />
          ))}
        </div>
      ) : (
        <p className="card mute">Completed shifts and verified attendance records will appear here.</p>
      )}
    </>
  );
}
