import Link from "next/link";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { Stats, Tag } from "@/components/ui";
import { inr, dt, hm } from "@/lib/money";
import { payState, PAY_LABEL } from "@/lib/payroll";
import { bankReady } from "@/lib/bank";
import { requestPayment } from "@/app/actions";

export default async function Page() {
  const u = await need("VOLUNTEER"), now = new Date();
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
    rows.filter(f).reduce((n, x) => n + (x.s === "PAID" ? x.a.payout : x.a.role.pay), 0);

  return (
    <>
      <div className="dh">
        <div>
          <span className="mute">Volunteer dashboard</span>
          <h1>Payment History</h1>
        </div>
      </div>
      <p className="mute">
        You are paid by CrewHub for events where you checked in and checked out. Payouts are transferred by the Admin directly to your bank account or UPI.
      </p>

      {!bankReady(u) && (
        <p className="card" style={{ borderLeft: "4px solid #b42318" }}>
          ⚠️ Add your bank/UPI details in your <Link href="/volunteer/profile" style={{ fontWeight: 700, textDecoration: "underline" }}>Profile</Link> to receive payouts. CrewHub cannot disburse your earnings without them.
        </p>
      )}

      <Stats
        items={[
          [inr(sum((x) => x.s === "PAID")), "Earned"],
          [inr(sum((x) => x.s === "DUE" || x.s === "NO_BANK")), "Pending payout"],
          [rows.filter((x) => x.s === "PAID").length, "Payouts received"],
        ]}
      />

      <div style={{ margin: "16px 0 8px" }}>
        <p className="mute" style={{ fontSize: "0.86rem" }}>
          💡 <b>Haven't received your payment yet?</b> If your event ended and payout is pending, click <b>"Request Payment"</b> to notify the Admin instantly.
        </p>
      </div>

      {!rows.length ? (
        <p className="card">Payouts appear here after you check out of an event.</p>
      ) : (
        rows.map(({ a, s }) => (
          <div key={a.id} className="card row" style={{ alignItems: "center", gap: "14px" }}>
            <div style={{ flex: 1 }}>
              <b>{a.role.event.title}</b>
              <div className="mute">
                {a.role.title} · {a.role.event.startsAt.toLocaleDateString("en-IN")} · In {hm(a.checkIn)} · Out {hm(a.checkOut)}
                {a.paid ? ` · paid on ${dt(a.paidAt).split(",")[0]}` : ""}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Tag c={s === "PAID" ? "ok" : ["ABSENT", "NO_CHECKOUT", "NO_BANK"].includes(s) ? "bad" : ""}>
                {PAY_LABEL[s]}
              </Tag>

              <b style={{ minWidth: "60px", textAlign: "right" }}>
                {["ABSENT", "NO_CHECKOUT"].includes(s) ? "₹0" : inr(s === "PAID" ? a.payout : a.role.pay)}
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
                    ✓ Request Sent
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
                      Request Payment ✉
                    </button>
                  </form>
                )
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
