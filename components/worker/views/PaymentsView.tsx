"use client";
import { money } from "@/lib/worker/format";
import { Badge } from "../ui";
import { useWorker } from "../WorkerProvider";
import { getPaymentDeadlineStatus } from "@/lib/payments/upi";

export default function PaymentsView() {
  const { pay, confirmPay, disputePay } = useWorker();
  const sum = (f: (p: (typeof pay)[number]) => boolean) => pay.filter(f).reduce((a, p) => a + p.w, 0);

  const cards = [
    { icon: "account_balance_wallet", n: sum(() => true), label: "Total earnings", cls: "s2" },
    { icon: "check_circle", n: sum((p) => p.st === "Confirmed"), label: "Paid & Verified", cls: "" },
    { icon: "schedule", n: sum((p) => p.st === "Pending" || p.st === "Recorded"), label: "In Settlement", cls: "s3" },
  ];

  return (
    <>
      <div className="head">
        <div>
          <h1>Payments & Earnings</h1>
          <p className="sub">
            Organizers pay you directly via UPI without any platform deductions. A 24-hour payment window starts when you check out from the event.
          </p>
        </div>
      </div>

      <div className="stats c3">
        {cards.map((c) => (
          <div key={c.label} className={"stat " + c.cls}>
            <span className="ic"><span className="ms">{c.icon}</span></span>
            <div>
              <strong>{money(c.n)}</strong>
              <small>{c.label}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="ph" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Payment History</h2>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Zero deduction guarantee · 100% wage payout
          </span>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Agreed Wage</th>
                <th>24h Deadline</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th>Transaction UTR</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pay.map((p, i) => {
                const deadline = getPaymentDeadlineStatus(
                  p.deadlineAt,
                  p.st.toUpperCase() as any
                );

                return (
                  <tr key={p.id || i}>
                    <td>
                      <b>{p.ev}</b>
                    </td>
                    <td>
                      <b>{money(p.w)}</b>
                    </td>
                    <td>
                      {p.st === "Confirmed" ? (
                        <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                          Settled
                        </span>
                      ) : p.deadlineAt ? (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background:
                              deadline.color === "red"
                                ? "#fee2e2"
                                : deadline.color === "amber"
                                ? "#fef3c7"
                                : "#dcfce7",
                            color:
                              deadline.color === "red"
                                ? "#b91c1c"
                                : deadline.color === "amber"
                                ? "#b45309"
                                : "#15803d",
                          }}
                        >
                          {deadline.formattedLabel}
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          Pending Check-out
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge st={p.st} />
                    </td>
                    <td>{p.date || "–"}</td>
                    <td>
                      {p.ref ? (
                        <code style={{ fontSize: "12px", background: "#f0f0f8", padding: "2px 6px", borderRadius: "4px" }}>
                          {p.ref}
                        </code>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>–</span>
                      )}
                    </td>
                    <td>
                      {p.st === "Recorded" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn green sm"
                            data-act="payok"
                            data-i={i}
                            onClick={() => confirmPay(p.id)}
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                          >
                            Confirm Received
                          </button>
                          <button
                            className="btn sec sm"
                            data-act="paybad"
                            data-i={i}
                            onClick={() => disputePay(p.id)}
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                          >
                            Dispute
                          </button>
                        </div>
                      )}
                      {p.st === "Pending" && (
                        <span className="sub" style={{ fontSize: "12px" }}>
                          Awaiting organizer UPI
                        </span>
                      )}
                      {p.st === "Confirmed" && (
                        <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600 }}>
                          Confirmed
                        </span>
                      )}
                      {p.st === "Disputed" && (
                        <div>
                          <span style={{ fontSize: "12px", color: "#b91c1c", fontWeight: 600 }}>
                            Disputed
                          </span>
                          {p.disputeNote && (
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                              {p.disputeNote}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pay.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No payment records yet. Completed work shifts and settlements will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
