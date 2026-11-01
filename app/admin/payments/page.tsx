import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { Tag, Stats } from "@/components/ui";
import EventPayout from "@/components/EventPayout";
import { inr, when, RATE, accepted, dt } from "@/lib/money";
import { payState, unusedOf } from "@/lib/payroll";

export default async function Page({ searchParams: sp }: { searchParams: { id?: string } }) {
  await need("ADMIN");
  const base = "/admin/payments";
  const head = (
    <div className="dh">
      <div>
        <span className="mute">Admin dashboard</span>
        <h1>Payments & Safe Transaction Ledger</h1>
      </div>
    </div>
  );

  if (sp.id)
    return (
      <div className="compact">
        {head}
        <EventPayout id={sp.id} backHref={base} />
      </div>
    );

  const all: any[] = await db.event.findMany({
    where: { payStatus: { in: ["PAID", "REFUNDED"] } },
    orderBy: { paidAt: "desc" },
    include: {
      organizer: true,
      roles: { include: { applications: { include: { user: true } } } },
    },
  });

  const paid = all.filter((e) => e.payStatus === "PAID"),
    sum = (f: (e: any) => number) => paid.reduce((n, e) => n + f(e), 0);
  const out =
    (await db.application.aggregate({ _sum: { payout: true }, where: { paid: true } }))._sum
      .payout || 0;
  const now = new Date(),
    live = paid.filter((e) => e.status === "PUBLISHED");
  const rows = (e: any) =>
    accepted(e).map(({ a, r }) => ({ a, r, s: payState(a, r, e.endsAt <= now) }));
  const pending = live.reduce(
    (n, e) =>
      n +
      rows(e)
        .filter((x) => x.s === "DUE" || x.s === "NO_BANK")
        .reduce((m, x) => m + x.r.pay, 0),
    0
  );
  const unused = live.filter((e) => e.endsAt <= now).reduce((n, e) => n + unusedOf(e), 0),
    refunded = paid.reduce((n, e) => n + e.refunded, 0);

  // Safe transactions ledger
  const transactions = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      fromUser: { select: { id: true, name: true, orgName: true, role: true } },
      toUser: { select: { id: true, name: true, orgName: true, role: true } },
      event: { select: { id: true, title: true } },
    },
  });

  return (
    <div className="compact">
      {head}
      <div className="card">
        <b>Platform fee: {RATE}% of crew pay</b>
      </div>

      <Stats
        items={[
          [inr(sum((e) => e.crewTotal + e.commission)), "Total collected"],
          [inr(sum((e) => e.commission)), "Commission earned"],
          [inr(out), "Paid to volunteers"],
          [inr(pending), "Pending payout"],
          [inr(unused), "Refundable to organizers"],
          [inr(refunded), "Refunded to organizers"],
        ]}
      />

      {/* Safe Transaction Audit Ledger Section */}
      <div style={{ marginTop: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2>🛡️ Safe Transactions Audit Ledger</h2>
          <span className="mute" style={{ fontSize: "0.82rem" }}>
            {transactions.length} verified transactions
          </span>
        </div>
        <p className="mute">
          All organizer event payments and volunteer bulk payouts are permanently tracked with bank UTR and UPI numbers.
        </p>

        {!transactions.length ? (
          <p className="card mute">
            No transactions recorded yet. They will appear here automatically when organizers fund events or admin executes payouts.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {transactions.map((t) => {
              const typeColor =
                t.type === "ORGANIZER_EVENT_PAYMENT"
                  ? "#0284c7"
                  : t.type === "VOLUNTEER_PAYOUT"
                  ? "#16a34a"
                  : "#dc2626";

              const typeLabel =
                t.type === "ORGANIZER_EVENT_PAYMENT"
                  ? "EVENT FUNDING"
                  : t.type === "VOLUNTEER_PAYOUT"
                  ? "VOLUNTEER PAYOUT"
                  : "REFUND";

              const fromName = t.fromUser?.orgName || t.fromUser?.name || "Organizer";
              const toName = t.toUser?.orgName || t.toUser?.name || "Recipient";

              return (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    padding: "14px 16px",
                    borderLeft: `4px solid ${typeColor}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#fff",
                          background: typeColor,
                          padding: "2px 7px",
                          borderRadius: "4px",
                        }}
                      >
                        {typeLabel}
                      </span>
                      <b style={{ fontSize: "0.95rem" }}>
                        {fromName} ➔ {toName}
                      </b>
                    </div>

                    <div className="mute" style={{ fontSize: "0.82rem", marginTop: "4px" }}>
                      {t.event ? `Event: ${t.event.title} · ` : ""}
                      {t.upiNumber ? `UPI: ${t.upiNumber} · ` : t.upiId ? `VPA: ${t.upiId} · ` : ""}
                      UTR: <code style={{ fontSize: "0.78rem" }}>{t.reference || "N/A"}</code>
                      {t.note ? ` · ${t.note}` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <b style={{ fontSize: "1.1rem", color: "#0f172a" }}>{inr(t.amount)}</b>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <Tag c="ok">{t.status}</Tag>
                      <span className="mute" style={{ fontSize: "0.75rem" }}>
                        {dt(t.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: "32px" }}>
        <h2>Approved Events History</h2>
        <p className="mute">Tap an event to see attendance, bank details, and payouts.</p>
        {all.map((e) => (
          <Link key={e.id} href={`${base}?id=${e.id}`} className="card row">
            <div>
              <b>{e.title}</b> <Tag c={e.payStatus === "PAID" ? "ok" : "bad"}>{e.payStatus}</Tag>
              <div className="mute">
                {e.organizer.orgName || e.organizer.name} · {when(e)}
              </div>
            </div>
            <span className="mute">
              Crew {inr(e.crewTotal)} + commission {inr(e.commission)}
            </span>
            <b>{inr(e.crewTotal + e.commission)}</b>
          </Link>
        ))}
        {!all.length && <p className="mute">No payments yet.</p>}
      </div>
    </div>
  );
}
