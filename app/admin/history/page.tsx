import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { Tag, Stats, Back } from "@/components/ui";
import { inr, when, dt } from "@/lib/money";
import Link from "next/link";

export default async function Page({ searchParams: sp }: { searchParams: { id?: string } }) {
  await need("ADMIN");
  const base = "/admin/history";

  const head = (
    <div className="dh">
      <div>
        <span className="mute">Admin dashboard</span>
        <h1>Financial & Payment History</h1>
      </div>
    </div>
  );

  const events = await db.event.findMany({
    where: { payStatus: { in: ["PAID", "REFUNDED"] } },
    orderBy: { startsAt: "desc" },
    include: {
      organizer: true,
      roles: {
        include: {
          applications: {
            where: { status: "ACCEPTED" },
            include: { user: true },
          },
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const totalCollected = events.reduce((sum, e) => sum + e.crewTotal + e.commission, 0);
  const totalCommission = events.reduce((sum, e) => sum + e.commission, 0);
  const totalRefunded = events.reduce((sum, e) => sum + e.refunded, 0);

  const allApps = events.flatMap((e) => e.roles.flatMap((r) => r.applications));
  const totalVolunteerPayouts = allApps
    .filter((a) => a.paid)
    .reduce((sum, a) => sum + a.payout, 0);

  // Detail view of single event history
  const single = sp.id ? events.find((e) => e.id === sp.id) : null;

  if (single) {
    const apps = single.roles.flatMap((r) => r.applications.map((a) => ({ a, r })));
    const paidApps = apps.filter((x) => x.a.paid);
    const absentApps = apps.filter((x) => x.a.absent || !x.a.checkOut);

    return (
      <div className="compact">
        {head}
        <Back href={base} label="All Events Financial History" />

        <section className="evc">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div>
              <b style={{ fontSize: "1.2rem" }}>{single.title}</b>{" "}
              <Tag c={single.payStatus === "PAID" ? "ok" : "bad"}>{single.payStatus}</Tag>
              <div className="mute" style={{ marginTop: "4px" }}>
                Organizer: <b>{single.organizer.orgName || single.organizer.name}</b> ({single.organizer.phone || "No phone"}) · Venue: {single.venue}, {single.city} · {when(single)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mute">Total Event Value</div>
              <b style={{ fontSize: "1.25rem", color: "#0f172a" }}>{inr(single.crewTotal + single.commission)}</b>
            </div>
          </div>

          <Stats
            items={[
              [inr(single.crewTotal + single.commission), "Organizer Paid"],
              [inr(single.commission), "Platform Fee (15%)"],
              [inr(single.crewTotal), "Funded Crew Pool"],
              [inr(paidApps.reduce((sum, x) => sum + x.a.payout, 0)), "Paid to Volunteers"],
              [inr(single.refunded), "Refunded to Organizer"],
            ]}
          />

          {/* Breakdown Section 1: Organizer Payment Details */}
          <div className="card" style={{ marginTop: "16px" }}>
            <h3 style={{ margin: "0 0 10px" }}>1. Organizer Payment Received</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", fontSize: "0.88rem" }}>
              <div><span className="mute">Amount:</span> <b>{inr(single.crewTotal + single.commission)}</b></div>
              <div><span className="mute">Platform Fee (15%):</span> <b>{inr(single.commission)}</b></div>
              <div><span className="mute">Crew Pool (Escrow):</span> <b>{inr(single.crewTotal)}</b></div>
              <div><span className="mute">Payment Date:</span> <b>{single.paidAt ? dt(single.paidAt) : "—"}</b></div>
            </div>
          </div>

          {/* Breakdown Section 2: Volunteer Payouts */}
          <div className="card" style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>2. Volunteer Salary Payouts ({paidApps.length} Paid)</h3>
              <b>Total: {inr(paidApps.reduce((sum, x) => sum + x.a.payout, 0))}</b>
            </div>

            {!paidApps.length ? (
              <p className="mute" style={{ marginTop: "8px" }}>No volunteer payouts disbursed yet for this event.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {paidApps.map(({ a, r }) => (
                  <div key={a.id} className="row" style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "0.85rem" }}>
                    <div>
                      <b>{a.user.name}</b> <span className="mute">({r.title})</span> · Phone: {a.user.phone || "—"}
                      <div className="mute">UPI: {a.user.upiNumber || a.user.upiId || "Bank"} · Paid on {a.paidAt ? dt(a.paidAt) : "—"}</div>
                    </div>
                    <Tag c="ok">Paid {inr(a.payout)}</Tag>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Breakdown Section 3: Absentee Refunds to Organizer */}
          <div className="card" style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>3. Refunds to Organizer for Absentees / Unused Funds</h3>
              <b style={{ color: single.refunded > 0 ? "#16a34a" : "#64748b" }}>{inr(single.refunded)}</b>
            </div>

            {single.refunded > 0 ? (
              <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#166534" }}>
                ✓ {inr(single.refunded)} was refunded to organizer {single.organizer.name} for {absentApps.length} absent or incomplete shifts on {single.refundedAt ? dt(single.refundedAt) : "event completion"}.
              </div>
            ) : (
              <p className="mute" style={{ marginTop: "8px", fontSize: "0.85rem" }}>
                {absentApps.length > 0 ? `${absentApps.length} absent volunteer(s) on record. Refund pending processing.` : "All accepted volunteers attended their shifts."}
              </p>
            )}
          </div>

          {/* Breakdown Section 4: Transaction Logs for this Event */}
          {single.transactions.length > 0 && (
            <div className="card" style={{ marginTop: "14px" }}>
              <h3 style={{ margin: "0 0 10px" }}>4. Transaction Reference & Audit Trail</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {single.transactions.map((tx) => (
                  <div key={tx.id} className="row" style={{ fontSize: "0.82rem", padding: "6px 10px", background: "#f1f5f9", borderRadius: "6px" }}>
                    <div>
                      <Tag>{tx.type}</Tag> Ref: <code>{tx.reference || "N/A"}</code> {tx.note && `· ${tx.note}`}
                    </div>
                    <div>
                      <b>{inr(tx.amount)}</b> <span className="mute">· {dt(tx.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Summary List of all Events
  return (
    <div className="compact">
      {head}
      <p className="mute">
        Per-event complete financial history: all payments received from organizers, payouts disbursed to volunteers, and absentee refunds.
      </p>

      <Stats
        items={[
          [inr(totalCollected), "Total Payments Received"],
          [inr(totalCommission), "15% Platform Commission"],
          [inr(totalVolunteerPayouts), "Volunteer Payouts Disbursed"],
          [inr(totalRefunded), "Refunded to Organizers"],
        ]}
      />

      <div style={{ marginTop: "24px" }}>
        <h2>Per-Event Financial Accounts ({events.length})</h2>
        <p className="mute">Tap any event to view its full transaction ledger, volunteer payouts, and organizer refund breakdown.</p>

        {!events.length ? (
          <p className="card mute">No paid events in history yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {events.map((e) => {
              const totalEvent = e.crewTotal + e.commission;
              const apps = e.roles.flatMap((r) => r.applications);
              const paidVolunteers = apps.filter((a) => a.paid);

              return (
                <Link
                  key={e.id}
                  href={`${base}?id=${e.id}`}
                  className="card row"
                  style={{ alignItems: "center", textDecoration: "none" }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <b>{e.title}</b>
                      <Tag c={e.payStatus === "PAID" ? "ok" : "bad"}>{e.payStatus}</Tag>
                      {e.refunded > 0 && <span className="tag" style={{ background: "#dcfce7", color: "#15803d" }}>Refund: {inr(e.refunded)}</span>}
                    </div>
                    <div className="mute" style={{ fontSize: "0.84rem", marginTop: "3px" }}>
                      Organizer: <b>{e.organizer.orgName || e.organizer.name}</b> · {e.venue}, {e.city} · {e.startsAt.toLocaleDateString("en-IN")}
                    </div>
                    <div className="mute" style={{ fontSize: "0.8rem", marginTop: "2px" }}>
                      Received: <b>{inr(totalEvent)}</b> (Crew {inr(e.crewTotal)} + Fee {inr(e.commission)}) · Paid {paidVolunteers.length} volunteer(s)
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <b style={{ fontSize: "1.1rem", color: "#0f172a" }}>{inr(totalEvent)}</b>
                    <div className="mute" style={{ fontSize: "0.78rem" }}>View Statement ➔</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
