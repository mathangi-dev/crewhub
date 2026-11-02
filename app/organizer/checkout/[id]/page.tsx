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
import CheckoutPaymentModule from "@/components/CheckoutPaymentModule";

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

        {/* Dual Payment Options: Razorpay + Direct UPI */}
        <CheckoutPaymentModule
          eventId={e.id}
          total={total}
          totalFormatted={inr(total)}
          adminName={ADMIN_NAME}
          adminUpiId={ADMIN_UPI_ID}
          adminUpiNumber={ADMIN_UPI_NUMBER}
          upiLink={upiLink}
          qrUrl={qrUrl}
          initialUtr={initialUtr}
          payEventAction={payEvent}
        />

        <p className="mute">
          Crew pay is held securely in escrow by the admin and released directly to volunteers upon verified attendance check-in and check-out. Absentees and unfilled roles are fully refunded.
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
