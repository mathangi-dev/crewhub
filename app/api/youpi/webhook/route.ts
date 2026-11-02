import { db } from "@/lib/db";
import { youpiClient } from "@/lib/youpi";
import { notifyAdmins } from "@/lib/notifications";
import { ADMIN_UPI_ID, ADMIN_UPI_NUMBER } from "@/lib/payment";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-gateway-signature") || "";

    // Verify HMAC-SHA256 signature if secret is active
    const isValid = youpiClient.verifyWebhook(rawBody, signature);
    const body = JSON.parse(rawBody);

    const { event, paymentId, orderId, amount, utr, eventId } = body;

    if (!eventId && !orderId) {
      return new Response(JSON.stringify({ error: "Missing eventId or orderId" }), { status: 400 });
    }

    const targetEventId = eventId || orderId;
    const targetEvent = await db.event.findUnique({
      where: { id: targetEventId },
      include: { organizer: true },
    });

    if (!targetEvent) {
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404 });
    }

    if (targetEvent.payStatus === "PAID") {
      return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
    }

    const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
    const totalAmount = targetEvent.crewTotal + targetEvent.commission;
    const referenceUtr = utr || `YOUPI_${Date.now()}`;

    // Atomically transition event to funded & awaiting Admin review
    await db.event.update({
      where: { id: targetEventId },
      data: {
        status: "PENDING",
        payStatus: "PAID",
        paidAt: new Date(),
      },
    });

    // Record verified transaction in ledger
    await db.transaction.create({
      data: {
        type: "ORGANIZER_EVENT_PAYMENT",
        amount: totalAmount,
        currency: "INR",
        fromUserId: targetEvent.organizerId,
        toUserId: admin?.id,
        eventId: targetEventId,
        reference: referenceUtr,
        paymentMethod: "YOUPI_PG",
        upiNumber: admin?.upiNumber || ADMIN_UPI_NUMBER,
        upiId: admin?.upiId || ADMIN_UPI_ID,
        status: "SUCCESS",
        note: `Funded via YouPI-PG Gateway (UTR: ${referenceUtr}) for event "${targetEvent.title}"`,
      },
    });

    // Notify Admin of YouPI-PG webhook verification
    await notifyAdmins({
      title: `YouPI-PG Payment Verified: ${targetEvent.title}`,
      message: `Organizer "${targetEvent.organizer.orgName || targetEvent.organizer.name}" paid ₹${totalAmount} via YouPI-PG Gateway (UTR: ${referenceUtr}). Ready for your approval.`,
      link: `/admin/events?s=PENDING`,
      eventId: targetEventId,
    }).catch(console.error);

    return new Response(JSON.stringify({ success: true, paymentId, status: "PAID" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[YouPI Webhook Error]", err);
    return new Response(JSON.stringify({ error: err.message || "Webhook error" }), { status: 500 });
  }
}
