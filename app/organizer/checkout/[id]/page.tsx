import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { need } from "@/lib/auth";
import { payEvent, discardDraft } from "@/app/actions";
import { inr, RATE } from "@/lib/money";
import { Stats } from "@/components/ui";
import SubmitBtn from "@/components/SubmitBtn";
import {
  ADMIN_UPI_NUMBER,
  ADMIN_UPI_ID,
  ADMIN_NAME,
  buildUpiDeepLink,
  getUpiQrCodeUrl,
  generateUTR,
} from "@/lib/payment";

export default async function Checkout({ params }: { params: { id: string } }) {
  const u = await need("ORGANIZER");
  const e = await db.event.findFirst({
    where: { id: params.id, organizerId: u.id },
    include: { roles: true },
  });
  if (!e) notFound();
  if (e.payStatus === "PAID") redirect("/organizer?tab=events"); // already paid, nothing to do

  // Check if an event with this title was already paid by this organizer
  const alreadyPaid = await db.event.findFirst({
    where: { organizerId: u.id, title: e.title, payStatus: "PAID", id: { not: e.id } },
  });
  if (alreadyPaid) {
    await db.event.deleteMany({ where: { id: e.id, status: "DRAFT", payStatus: "UNPAID" } });
    redirect("/organizer?tab=events");
  }

  const total = e.crewTotal + e.commission;
  const initialUtr = generateUTR();
  const upiLink = buildUpiDeepLink({
    pa: ADMIN_UPI_ID,
    pn: ADMIN_NAME,
    am: total,
    tn: `CrewHub Event: ${e.title}`,
    tr: initialUtr,
  });
  const qrUrl = getUpiQrCodeUrl(upiLink, 180);

  return (
    <div className="compact">
      <div className="dh">
        <div>
          <span className="mute">Organizer dashboard</span>
          <h1>Pay to create your event</h1>
        </div>
      </div>
      <p className="mute">
        Fund the crew pay and platform fee. Your payment goes directly to the CrewHub Admin via UPI. Once confirmed, your event is submitted for approval.
      </p>

      <section className="evc">
        <b>{e.title}</b>
        <div className="mute">
          {e.venue}, {e.city}
        </div>

        {e.roles.map((r) => (
          <p key={r.id} className="mute" style={{ margin: "6px 0 0" }}>
            {r.title} · {r.slots} {r.slots === 1 ? "person" : "people"} × {inr(r.pay)} = {inr(r.slots * r.pay)}
          </p>
        ))}

        <Stats
          items={[
            [inr(e.crewTotal), "Crew pay"],
            [inr(e.commission), `Platform fee (${RATE}%)`],
            [inr(total), "Total to pay"],
          ]}
        />

        {/* Official UPI Payment Box */}
        <div
          className="card"
          style={{
            margin: "18px 0",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            border: "1.5px solid #cbd5e1",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "1.3rem" }}>⚡</span>
            <div>
              <b style={{ fontSize: "1.05rem", color: "#0f172a" }}>UPI Instant Transfer to Admin</b>
              <div className="mute" style={{ fontSize: "0.82rem" }}>
                Pay directly using Google Pay, PhonePe, Paytm, or any UPI app
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              alignItems: "center",
              margin: "14px 0",
            }}
          >
            {/* Payee Details */}
            <div style={{ fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <span className="mute">Payee:</span> <b>{ADMIN_NAME}</b>
              </div>
              <div>
                <span className="mute">Admin UPI Number:</span>{" "}
                <b style={{ color: "#0284c7", fontSize: "0.98rem" }}>{ADMIN_UPI_NUMBER}</b>
              </div>
              <div>
                <span className="mute">Admin UPI ID:</span>{" "}
                <b style={{ color: "#0f172a" }}>{ADMIN_UPI_ID}</b>
              </div>
              <div>
                <span className="mute">Amount to Transfer:</span>{" "}
                <b style={{ color: "#16a34a", fontSize: "1.1rem" }}>{inr(total)}</b>
              </div>

              {/* Direct UPI App Launch Button */}
              <div style={{ marginTop: "8px" }}>
                <a
                  href={upiLink}
                  className="btn"
                  style={{
                    background: "#059669",
                    color: "#fff",
                    fontWeight: 700,
                    padding: "10px 18px",
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                  }}
                >
                  🚀 Open in UPI App (GPay / PhonePe / Paytm)
                </a>
              </div>
            </div>

            {/* QR Code for Mobile Scanning */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px",
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <img
                  src={qrUrl}
                  alt="Scan to pay via UPI"
                  width={150}
                  height={150}
                  style={{ display: "block", borderRadius: "8px" }}
                />
              </div>
              <div className="mute" style={{ fontSize: "0.76rem", marginTop: "6px" }}>
                Scan with any UPI app camera
              </div>
            </div>
          </div>

          <form action={payEvent.bind(null, e.id)} style={{ marginTop: "14px" }}>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="reference" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                Transaction Reference / UTR Number
              </label>
              <input
                id="reference"
                name="reference"
                defaultValue={initialUtr}
                placeholder="12-digit UPI reference ID (e.g. 430129481923)"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontFamily: "monospace",
                }}
              />
              <span className="mute" style={{ fontSize: "0.75rem" }}>
                Auto-generated UTR for instant simulation, or enter the ref ID from your UPI app.
              </span>
            </div>

            <div className="acts">
              <SubmitBtn pendingText="Confirming UPI payment...">
                Confirm Payment of {inr(total)} & Create Event
              </SubmitBtn>
            </div>
          </form>
        </div>

        <p className="mute">
          Crew pay is held securely in escrow by the admin and released directly to volunteers upon verified attendance check-in and check-out.
        </p>

        <div className="acts">
          {e.status === "DRAFT" && (
            <form action={discardDraft.bind(null, e.id, "/organizer?tab=events")}>
              <button className="ghost">Discard Draft</button>
            </form>
          )}
          <Link href="/organizer?tab=create" className="btn ghost">
            Back
          </Link>
        </div>
      </section>
    </div>
  );
}
