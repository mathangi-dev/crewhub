import { db } from "@/lib/db";
import { payoutOne, refundOne, refundAll } from "@/app/actions";
import { accepted, inr, when, hm, rolePersonPay } from "@/lib/money";
import { payState, PAY_LABEL, unusedOf } from "@/lib/payroll";
import { Tag, Back, Stats } from "./ui";
import AdminBank from "./AdminBank";
import { buildUpiDeepLink } from "@/lib/payment";

export default async function EventPayout({ id, backHref }: { id: string; backHref: string }) {
  const e: any = await db.event.findUnique({
    where: { id },
    include: {
      organizer: true,
      roles: { include: { applications: { include: { user: true } } } },
    },
  });
  if (!e) return <Back href={backHref} />;
  const ended = e.endsAt <= new Date(),
    ready = e.payStatus === "PAID" && e.status === "PUBLISHED" && ended;
  const rows = accepted(e).map(({ a, r }) => ({ a, r, s: payState(a, r, ended) }));
  const due = rows.filter((x) => x.s === "DUE" || x.s === "APPROVED"),
    dueSum = due.reduce((n, x) => n + rolePersonPay(x.r), 0),
    paidSum = rows.filter((x) => x.s === "PAID").reduce((n, x) => n + (x.a.payout || rolePersonPay(x.r)), 0),
    unused = ended ? unusedOf(e) : 0;
  const tag = (x: any) =>
    x.s === "PAID" ? (
      <Tag c="ok">Paid {inr(x.a.payout || rolePersonPay(x.r))}</Tag>
    ) : (
      <Tag c={["ABSENT", "NO_CHECKOUT", "NO_BANK", "FAILED", "DISPUTED"].includes(x.s) ? "bad" : x.s === "APPROVED" ? "ok" : ""}>
        {PAY_LABEL[x.s as keyof typeof PAY_LABEL] || x.s}
      </Tag>
    );

  return (
    <>
      <Back href={backHref} />
      <section className="evc">
        <div>
          <b>{e.title}</b> <Tag c={e.payStatus === "PAID" ? "ok" : "bad"}>{e.payStatus}</Tag>
          <div className="mute">
            {e.organizer.orgName || e.organizer.name} · {e.venue}, {e.city} · {when(e)}
          </div>
        </div>

        <Stats
          items={[
            [inr(e.crewTotal + e.commission), "Organizer paid"],
            [inr(e.commission), "Platform fee"],
            [inr(paidSum), "Paid to volunteers"],
            [inr(dueSum), "Ready to pay"],
            [inr(unused), "Refundable"],
            [inr(e.refunded), "Refunded"],
          ]}
        />

        <p className="mute">
          Each volunteer is paid the pay rate of their role upon verified attendance (both Check-In and Check-Out marked). Absent volunteers and incomplete attendances are not eligible for payout.
        </p>

        <div className="role">
          <div className="row">
            <h3>Volunteer Attendance & Direct Payouts</h3>
            <div className="acts">
              {due.length > 0 && (
                <a href={`/admin/payouts/csv?id=${e.id}`} className="btn" download>
                  Download CSV
                </a>
              )}
            </div>
          </div>

          {!ready && rows.length > 0 && (
            <p className="mute" style={{ margin: "0 0 8px" }}>
              {e.payStatus !== "PAID"
                ? "The organizer has not paid for this event."
                : e.status !== "PUBLISHED"
                ? "Only approved events can be paid out."
                : "Payouts open after the event ends."}
            </p>
          )}

          {unused > 0 && (
            <div className="app">
              <div className="who">
                <b>Unused crew funds {inr(unused)}</b>
                <div className="mute">
                  Absent volunteers and unfilled slots. Refund goes to the organizer, the platform fee stays.
                </div>
                <AdminBank u={e.organizer} />
              </div>
              <form action={refundAll.bind(null, e.id)}>
                <button className="bad" disabled={!ready}>
                  Refund {inr(unused)} to organizer
                </button>
              </form>
            </div>
          )}

          {!rows.length && <p className="mute">No accepted volunteers yet.</p>}

          {rows.map((x) => {
            const workerPay = rolePersonPay(x.r);
            const isHourly = x.r.wageType === "HOURLY";
            const upiTarget =
              x.a.user.upiId || (x.a.user.upiNumber ? `${x.a.user.upiNumber}@upi` : "");
            const upiLink = upiTarget
              ? buildUpiDeepLink({
                  pa: upiTarget,
                  pn: x.a.user.name,
                  am: workerPay,
                  tn: `CrewHub Payout: ${e.title}`,
                })
              : null;

            return (
              <div key={x.a.id} className="app" style={{ alignItems: "center", gap: "10px" }}>
                <span className="av">{x.a.user.name[0]}</span>

                <div className="who" style={{ flex: 1 }}>
                  <b>{x.a.user.name}</b>
                  <div className="mute">
                    {x.r.title} · {isHourly ? `${inr(x.r.pay)}/hr × ${x.r.hours || 0}h (${inr(workerPay)})` : `pay ${inr(workerPay)}`} · In: <b>{hm(x.a.checkIn)}</b> · Out:{" "}
                    <b>{hm(x.a.checkOut)}</b>
                    {x.a.checkIn && x.a.checkOut ? (
                      <span style={{ color: "#16a34a", fontWeight: 700 }}> · Attended</span>
                    ) : (
                      <span style={{ color: "#dc2626" }}> · Incomplete Attendance</span>
                    )}
                  </div>
                  <AdminBank u={x.a.user} />
                </div>

                {x.a.paymentRequestedAt && !x.a.paid && <Tag c="bad">Payment Requested</Tag>}
                {tag(x)}

                {(x.s === "DUE" || x.s === "APPROVED") && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {upiLink && (
                      <a
                        href={upiLink}
                        className="btn sm"
                        style={{
                          background: "#059669",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.76rem",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          textDecoration: "none",
                        }}
                        title="Directly launch UPI payment app (GPay / PhonePe / Paytm)"
                      >
                        Pay UPI App
                      </a>
                    )}
                    <form action={payoutOne.bind(null, x.a.id)}>
                      <button
                        disabled={!ready}
                        style={{ padding: "5px 10px", fontSize: "0.8rem", borderRadius: "6px" }}
                      >
                        Mark Paid ({inr(workerPay)})
                      </button>
                    </form>
                  </div>
                )}

                {(x.s === "ABSENT" || x.s === "NO_CHECKOUT") && x.r.pay > 0 && (
                  <form action={refundOne.bind(null, x.a.id)}>
                    <button className="bad" disabled={!ready}>
                      Refund {inr(workerPay)}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
