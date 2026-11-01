import { db } from "@/lib/db";
import { me } from "@/lib/auth";
import { decrypt } from "@/lib/bank";
import { attended, absentNow, inr } from "@/lib/money";
import { payState } from "@/lib/payroll";

export const dynamic = "force-dynamic";

const esc = (v: any) => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
};

const num = (v: string) => (/^\d+$/.test(v) ? `"=""${v}"""` : esc(v));

export async function GET(req: Request) {
  const u = await me();
  if (!u) return new Response("Unauthorized", { status: 401 });
  if (u.role !== "ADMIN" && u.role !== "ORGANIZER") {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return new Response("Missing eventId parameter", { status: 400 });
  }

  // Fetch the event
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: true,
      roles: {
        include: {
          applications: {
            where: { status: "ACCEPTED" }, // Only accepted volunteers who got the job
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!event) return new Response("Event not found", { status: 404 });

  // Security check: If organizer, ensure they own this event!
  if (u.role === "ORGANIZER" && event.organizerId !== u.id) {
    return new Response("Forbidden: You do not own this event", { status: 403 });
  }

  const now = new Date();
  const safeTitle = event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  // 1. ORGANIZER SPREADSHEET: BASIC VOLUNTEER DETAILS ONLY (NO BANK DETAILS)
  if (u.role === "ORGANIZER") {
    const headers = [
      "Volunteer ID",
      "Volunteer Name",
      "Location / City",
      "Assigned Role",
      "Shift Hours",
      "Skills",
      "Interests",
      "Check-in Time",
      "Check-out Time",
      "Attendance Status",
      "Rating (1-5)",
    ];

    const lines = [headers.map(esc).join(",")];

    for (const r of event.roles) {
      for (const a of r.applications) {
        const ab = absentNow(a, event);
        const attStatus = attended(a)
          ? "COMPLETED"
          : ab
          ? "ABSENT"
          : a.checkIn
          ? "CHECKED IN"
          : "PENDING CHECK-IN";

        lines.push(
          [
            esc(a.user.id),
            esc(a.user.name),
            esc(a.user.city),
            esc(r.title),
            r.hours ? esc(`${r.hours} hrs`) : esc("–"),
            esc(a.user.skills || "None listed"),
            esc(a.user.interests || "None listed"),
            esc(a.checkIn ? a.checkIn.toLocaleString("en-IN") : "–"),
            esc(a.checkOut ? a.checkOut.toLocaleString("en-IN") : "–"),
            esc(attStatus),
            esc(a.rating ? `${a.rating} ★` : "Not rated"),
          ].join(",")
        );
      }
    }

    await db.auditLog.create({
      data: {
        actorId: u.id,
        action: `organizer-crew-export:${event.id}:${lines.length - 1} volunteers`,
      },
    });

    const filename = `crew-roster-${safeTitle}-${now.toISOString().slice(0, 10)}.csv`;
    return new Response("\uFEFF" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // 2. ADMIN SPREADSHEET: BASIC DETAILS + FULL BANK DETAILS + PAYOUT DETAILS
  if (u.role === "ADMIN") {
    const headers = [
      "Application ID",
      "Volunteer ID",
      "Volunteer Name",
      "Email",
      "Location / City",
      "Assigned Role",
      "Shift Hours",
      "Skills",
      "Attendance Status",
      "Check-in Time",
      "Check-out Time",
      "Bank Account Holder",
      "Bank Name",
      "Bank Account Number",
      "IFSC Code",
      "UPI ID",
      "UPI Number",
      "Role Pay Rate (INR)",
      "Payout Amount (INR)",
      "Payout Status",
      "Paid At Date",
    ];

    const lines = [headers.map(esc).join(",")];
    let totalPayout = 0;

    for (const r of event.roles) {
      for (const a of r.applications) {
        const ab = absentNow(a, event);
        const attStatus = attended(a)
          ? "COMPLETED"
          : ab
          ? "ABSENT"
          : a.checkIn
          ? "CHECKED IN"
          : "PENDING CHECK-IN";

        const state = payState(a, r, true);
        const payoutAmount = a.paid ? a.payout : state === "DUE" ? r.pay : 0;
        if (a.paid || state === "DUE") {
          totalPayout += payoutAmount;
        }

        const payoutStatusLabel = a.paid
          ? "PAID"
          : state === "DUE"
          ? "PAYMENT DUE"
          : state === "NO_BANK"
          ? "MISSING BANK DETAILS"
          : state === "ABSENT"
          ? "NO PAYOUT (ABSENT)"
          : state === "NO_CHECKOUT"
          ? "NO PAYOUT (NO CHECKOUT)"
          : "PENDING EVENT END";

        const plainAccount = decrypt(a.user.bankAccountEnc);

        lines.push(
          [
            esc(a.id),
            esc(a.user.id),
            esc(a.user.name),
            esc(a.user.email),
            esc(a.user.city),
            esc(r.title),
            r.hours ? esc(`${r.hours} hrs`) : esc("–"),
            esc(a.user.skills || "None listed"),
            esc(attStatus),
            esc(a.checkIn ? a.checkIn.toLocaleString("en-IN") : "–"),
            esc(a.checkOut ? a.checkOut.toLocaleString("en-IN") : "–"),
            esc(a.user.bankHolder || "–"),
            esc(a.user.bankName || "–"),
            plainAccount ? num(plainAccount) : esc("Not provided"),
            esc(a.user.bankIfsc || "–"),
            esc(a.user.upiId || "–"),
            esc(a.user.upiNumber || "–"),
            r.pay,
            payoutAmount,
            esc(payoutStatusLabel),
            esc(a.paidAt ? a.paidAt.toLocaleString("en-IN") : "–"),
          ].join(",")
        );
      }
    }

    if (lines.length > 1) {
      lines.push(
        [
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          esc("TOTAL PAYOUT"),
          totalPayout,
          "",
          "",
        ].join(",")
      );
    }

    await db.auditLog.create({
      data: {
        actorId: u.id,
        action: `admin-crew-payroll-export:${event.id}:${lines.length - 2} volunteers`,
      },
    });

    const filename = `admin-crew-payroll-${safeTitle}-${now.toISOString().slice(0, 10)}.csv`;
    return new Response("\uFEFF" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("Invalid request", { status: 400 });
}
