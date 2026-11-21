import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import EventCard from "@/components/EventCard";
import EventDetail from "@/components/EventDetail";
import { inr, hm, rolePersonPay } from "@/lib/money";

export default async function Page({ searchParams: sp }: { searchParams: { id?: string } }) {
  const u = await need("WORKER");
  const apps: any[] = await db.application.findMany({
    where: { userId: u.id, status: "ACCEPTED", checkOut: null, role: { event: { status: "PUBLISHED" } } },
    orderBy: { role: { event: { startsAt: "asc" } } },
    include: { role: { include: { event: { include: { organizer: true, roles: true } } } } },
  });

  const head = (
    <>
      <div className="dh">
        <div>
          <span className="mute">Worker dashboard</span>
          <h1>My Confirmed Events &amp; Shifts</h1>
        </div>
      </div>
      <p className="mute">
        Events and shifts where you are confirmed as crew. Click on an event for shift details, booth location, and organizer check-in information.
      </p>
    </>
  );

  const a = sp.id ? apps.find((x) => x.role.eventId === sp.id) : null;
  if (a) {
    const isHourly = a.role.wageType === "HOURLY";
    const totalPay = rolePersonPay(a.role);
    return (
      <>
        {head}
        <EventDetail e={a.role.event} back={["/volunteer/my-events", "My events"]}>
          <h2>Your Confirmed Shift Details</h2>
          <div className="card">
            <p className="kv">
              <span className="mute">Role</span>
              <br />
              <b>{a.role.title}</b>
            </p>
            <p className="kv">
              <span className="mute">Shift Length</span>
              <br />
              <b>{a.role.hours ? `${a.role.hours} hrs` : "–"}</b>
            </p>
            <p className="kv">
              <span className="mute">Wage Rate &amp; Earnings</span>
              <br />
              <b>{isHourly ? `${inr(a.role.pay)}/hr (${inr(totalPay)} total)` : `${inr(a.role.pay)} flat daily`}</b>
            </p>
            {a.role.locationSpecific && (
              <p className="kv">
                <span className="mute">Booth / Work Location</span>
                <br />
                <b>{a.role.locationSpecific}</b>
              </p>
            )}
            <p className="kv">
              <span className="mute">Attendance Status</span>
              <br />
              <span className="tag ok">
                {a.checkIn ? `Checked in at ${hm(a.checkIn)}` : "Confirmed, awaiting check-in"}
              </span>
            </p>
            <p className="mute">
              Admin transfers your payout directly to your bank account or UPI after shift completion and checkout.
            </p>
            {!a.checkIn && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                <p className="mute" style={{ margin: "0 0 8px", fontSize: "0.85rem" }}>
                  Need to cancel this assignment? Manage cancellations and view waiting lists from My Applications.
                </p>
                <Link href="/volunteer/applications" className="btn ghost" style={{ fontSize: "0.82rem" }}>
                  Go to My Applications &amp; Cancellations
                </Link>
              </div>
            )}
          </div>
        </EventDetail>
      </>
    );
  }

  return (
    <>
      {head}
      {apps.length ? (
        <div className="grid">
          {apps.map((x) => {
            const payStr = x.role.wageType === "HOURLY"
              ? `${inr(x.role.pay)}/hr (${inr(rolePersonPay(x.role))})`
              : inr(x.role.pay);
            return (
              <EventCard
                key={x.id}
                href={`/volunteer/my-events?id=${x.role.eventId}`}
                e={x.role.event}
                badge={x.checkIn ? "Checked in" : "Confirmed"}
                sub={`${x.role.title} · ${x.role.hours ? x.role.hours + " hrs · " : ""}${payStr}`}
              />
            );
          })}
        </div>
      ) : (
        <p className="card">
          No confirmed events yet. Browse available opportunities in the <Link href="/volunteer/events" style={{ textDecoration: "underline", fontWeight: 600 }}>Events</Link> tab to apply.
        </p>
      )}
    </>
  );
}
