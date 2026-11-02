import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { Tag, Stats } from "@/components/ui";
import EventPayout from "@/components/EventPayout";
import { payoutAll } from "@/app/actions";
import { inr, when, RATE, accepted, dt } from "@/lib/money";
import { payState, unusedOf } from "@/lib/payroll";
import FinancialReportGenerator from "@/components/FinancialReportGenerator";

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

  // Financial applications for salary payout reporting
  const paidApps = await db.application.findMany({
    where: { paid: true },
    include: {
      user: { select: { name: true, email: true, upiId: true, upiNumber: true } },
      role: { select: { title: true, event: { select: { id: true, title: true } } } },
    },
  });

  const financialApplications = paidApps.map((a) => ({
    id: a.id,
    volunteerName: a.user?.name || "Volunteer",
    volunteerEmail: a.user?.email || "",
    upi: a.user?.upiNumber || a.user?.upiId || "",
    eventTitle: a.role?.event?.title || "Event",
    eventId: a.role?.event?.id || "",
    roleTitle: a.role?.title || "Crew",
    payout: a.payout,
    paidAt: a.paidAt ? a.paidAt.toISOString() : null,
  }));

  const financialEvents = all.map((e) => ({
    id: e.id,
    title: e.title,
    city: e.city,
    category: e.category,
    organizerName: e.organizer.orgName || e.organizer.name,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    paidAt: e.paidAt ? e.paidAt.toISOString() : null,
    refundedAt: e.refundedAt ? e.refundedAt.toISOString() : null,
    crewTotal: e.crewTotal,
    commission: e.commission,
    refunded: e.refunded,
    payStatus: e.payStatus,
    rolesCount: e.roles.length,
    volunteersCount: accepted(e).length,
  }));

  const financialTransactions = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    reference: t.reference,
    paymentMethod: t.paymentMethod,
    status: t.status,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
    fromName: t.fromUser?.orgName || t.fromUser?.name || "Admin",
    toName: t.toUser?.orgName || t.toUser?.name || "Admin",
    eventTitle: t.event?.title || "",
  }));

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Admin dashboard</span>
          <h1>Payments & Safe Transaction Ledger</h1>
        </div>
      </div>
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
          <h2>Safe Transactions Audit Ledger</h2>
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
                        {fromName} to {toName}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Approved Events History</h2>
            <p className="mute" style={{ margin: "4px 0 0" }}>
              Manage event attendance and execute bulk volunteer payouts.
            </p>
          </div>

          {/* Straight Right Corner of History: Financial Management Report Generator */}
          <FinancialReportGenerator
            events={financialEvents}
            applications={financialApplications}
            transactions={financialTransactions}
            defaultMonth="2026-11"
            defaultYear="2026"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "14px" }}>
          {all.map((e) => {
            const r = rows(e);
            const dueVolunteers = r.filter((x) => x.s === "DUE");
            const dueSum = dueVolunteers.reduce((n, x) => n + x.r.pay, 0);
            const paidVolunteers = r.filter((x) => x.s === "PAID");
            const paidSum = paidVolunteers.reduce((n, x) => n + (x.a.payout || x.r.pay), 0);
            const noBankVolunteers = r.filter((x) => x.s === "NO_BANK");
            const isEnded = e.endsAt <= now;

            return (
              <div
                key={e.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  padding: "18px 20px",
                  borderRadius: "12px",
                  border: dueSum > 0 ? "1px solid #10b981" : "1px solid var(--border, #e2e8f0)",
                  background: dueSum > 0 ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "inherit"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <Link href={`${base}?id=${e.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <b style={{ fontSize: "1.15rem", color: "#0f172a" }}>{e.title}</b>
                      </Link>
                      <Tag c={e.payStatus === "PAID" ? "ok" : "bad"}>{e.payStatus}</Tag>
                      {isEnded ? <Tag c="ok">Completed</Tag> : <Tag c="warn">Live / Upcoming</Tag>}
                    </div>
                    <div className="mute" style={{ marginTop: "4px", fontSize: "0.88rem" }}>
                      Organizer: <b>{e.organizer.orgName || e.organizer.name}</b> · {when(e)} · {e.city}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "0.85rem", color: "#64748b" }}>
                      Crew Budget: <b>{inr(e.crewTotal)}</b> · Platform Commission (15%): <b>{inr(e.commission)}</b> · Total: <b>{inr(e.crewTotal + e.commission)}</b>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: "160px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Volunteer Payout
                    </div>
                    <b style={{ fontSize: "1.3rem", color: dueSum > 0 ? "#059669" : paidSum > 0 ? "#0f172a" : "#64748b" }}>
                      {dueSum > 0 ? inr(dueSum) : paidSum > 0 ? inr(paidSum) : "₹0"}
                    </b>
                    <div className="mute" style={{ fontSize: "0.78rem", marginTop: "2px" }}>
                      {dueSum > 0 ? (
                        <span style={{ color: "#059669", fontWeight: 600 }}>Ready for bulk payout</span>
                      ) : paidVolunteers.length > 0 ? (
                        <span style={{ color: "#059669" }}>Disbursed ({paidVolunteers.length} paid)</span>
                      ) : (
                        "No payout due"
                      )}
                    </div>
                  </div>
                </div>

                {/* Bulk Payout Action Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "14px",
                    borderTop: "1px solid #e2e8f0",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {dueVolunteers.length > 0 ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#065f46", fontSize: "0.9rem", fontWeight: 600 }}>
                        <span>
                          {dueVolunteers.length} volunteer{dueVolunteers.length === 1 ? "" : "s"} checked out with verified UPI ({inr(dueSum)} total due)
                        </span>
                      </div>
                    ) : paidVolunteers.length > 0 ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#059669", fontSize: "0.9rem", fontWeight: 600 }}>
                        <span>All {paidVolunteers.length} volunteers paid via YouPI-PG Gateway</span>
                      </div>
                    ) : (
                      <span className="mute" style={{ fontSize: "0.85rem" }}>
                        Attendance awaiting completion or no pending volunteer dues.
                      </span>
                    )}

                    {noBankVolunteers.length > 0 && (
                      <span style={{ fontSize: "0.8rem", color: "#d97706", background: "#fef3c7", padding: "2px 8px", borderRadius: "4px" }}>
                        {noBankVolunteers.length} missing UPI details
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Link
                      href={`${base}?id=${e.id}`}
                      className="btn"
                      style={{ fontSize: "0.85rem", padding: "8px 14px", textDecoration: "none" }}
                    >
                      View Details &amp; Attendance
                    </Link>

                    {dueVolunteers.length > 0 && (
                      <form action={payoutAll.bind(null, e.id)}>
                        <button
                          type="submit"
                          className="btn"
                          style={{
                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                            color: "#ffffff",
                            fontWeight: 700,
                            padding: "9px 20px",
                            borderRadius: "8px",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.35)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "0.92rem",
                          }}
                        >
                          Pay All ({inr(dueSum)} for {dueVolunteers.length} {dueVolunteers.length === 1 ? "Person" : "People"} via YouPI-PG)
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!all.length && <p className="card mute">No payments or approved events recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
