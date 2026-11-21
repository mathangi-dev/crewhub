import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { Stats, Tag } from "@/components/ui";
import { inr, dt, hm, rolePersonPay } from "@/lib/money";
import { payState, PAY_LABEL } from "@/lib/payroll";
import { bankReady } from "@/lib/bank";
import { requestPayment } from "@/app/actions";

export default async function Page() {
  const u = await need("WORKER"), now = new Date();
  const all: any[] = await db.application.findMany({
    where: { userId: u.id, status: "ACCEPTED", role: { pay: { gt: 0 }, event: { status: "PUBLISHED" } } },
    orderBy: { role: { event: { startsAt: "desc" } } },
    include: { user: true, role: { include: { event: true } } },
  });

  const rows = all
    .map((a) => {
      const s = payState(a, a.role, a.role.event.endsAt <= now);
      return { a, s: s === "REFUNDED" ? ((a.checkIn ? "NO_CHECKOUT" : "ABSENT") as typeof s) : s };
    })
    .filter((x) => x.a.paid || x.a.checkIn || x.a.role.event.endsAt <= now); // show worked events and missed ones

  const sum = (f: (x: any) => boolean) =>
    rows.filter(f).reduce((n, x) => n + (x.s === "PAID" ? x.a.payout : rolePersonPay(x.a.role)), 0);

  const getStatusColor = (s: string) => {
    if (s === "PAID" || s === "APPROVED") return "ok";
    if (s === "ABSENT" || s === "NO_CHECKOUT" || s === "NO_BANK" || s === "FAILED" || s === "DISPUTED") return "bad";
    if (s === "PROCESSING" || s === "DUE") return "warn";
    return "";
  };

  return (
    <>
      <div className="dh">
        <div>
          <span className="mute">Worker dashboard</span>
          <h1>Payment History &amp; Earnings</h1>
        </div>
      </div>
      <p className="mute">
        You are paid by CrewHub for events where your attendance is verified. Payouts are transferred by the Admin directly to your UPI ID, UPI Phone number, or Bank Account.
      </p>

      {!bankReady(u) && (
        <p className="card" style={{ borderLeft: "4px solid #b42318" }}>
          Add your bank or UPI details in your <Link href="/volunteer/profile" style={{ fontWeight: 700, textDecoration: "underline" }}>Profile</Link> to receive payouts. CrewHub cannot disburse your earnings without them.
        </p>
      )}

      <Stats
        items={[
          [inr(sum((x) => x.s === "PAID")), "Total Earned"],
          [inr(sum((x) => ["DUE", "NO_BANK", "APPROVED", "PROCESSING"].includes(x.s))), "Pending Payout"],
          [rows.filter((x) => x.s === "PAID").length, "Payouts Received"],
        ]}
      />

      <div style={{ margin: "16px 0 8px" }}>
        <p className="mute" style={{ fontSize: "0.86rem" }}>
          <b>Haven't received your payment yet?</b> If your event has concluded and payout is due, click <b>"Request Payment"</b> to notify the Admin immediately.
        </p>
      </div>

      {!rows.length ? (
        <p className="card">Payout records will appear here after you check in and complete shifts.</p>
      ) : (
        rows.map(({ a, s }) => {
          const expectedPay = rolePersonPay(a.role);
          const isHourly = a.role.wageType === "HOURLY";
          return (
            <div key={a.id} className="card row" style={{ alignItems: "center", gap: "14px" }}>
              <div style={{ flex: 1 }}>
                <b>{a.role.event.title}</b>
                <div className="mute" style={{ marginTop: "3px", fontSize: "0.85rem" }}>
                  <b>{a.role.title}</b> · {isHourly ? `${inr(a.role.pay)}/hr × ${a.role.hours || 0} hrs` : `${inr(a.role.pay)} daily flat`} · {a.role.event.startsAt.toLocaleDateString("en-IN")} · In: {hm(a.checkIn)} · Out: {hm(a.checkOut)}
                  {a.paid ? ` · Paid on ${dt(a.paidAt).split(",")[0]}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Tag c={getStatusColor(s)}>
                  {PAY_LABEL[s] || s}
                </Tag>

                <b style={{ minWidth: "60px", textAlign: "right", fontSize: "1.05rem" }}>
                  {["ABSENT", "NO_CHECKOUT"].includes(s) ? "₹0" : inr(s === "PAID" ? a.payout : expectedPay)}
                </b>

                {!a.paid && a.role.pay > 0 && (
                  a.paymentRequestedAt ? (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "#92400e",
                        background: "#fef3c7",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title={`Request sent on ${dt(a.paymentRequestedAt)}`}
                    >
                      Request Sent
                    </span>
                  ) : (
                    <form action={requestPayment.bind(null, a.id)}>
                      <button
                        type="submit"
                        className="btn sm"
                        style={{
                          background: "#00072D",
                          color: "#fff",
                          fontSize: "0.78rem",
                          padding: "4px 10px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                        title="Send a payment request alert to Admin"
                      >
                        Request Payment
                      </button>
                    </form>
                  )
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
