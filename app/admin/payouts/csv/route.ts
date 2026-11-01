import { db } from "@/lib/db"; import { me } from "@/lib/auth"; import { decrypt } from "@/lib/bank"; import { accepted } from "@/lib/money"; import { payState } from "@/lib/payroll"
export const dynamic = "force-dynamic" // always built fresh from the database, so the file is never stale
// ADMIN ONLY: every volunteer who is ready to be paid (checked in + out, bank details saved), with everything needed to make the transfer.
const esc = (v: any) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"` } // blocks spreadsheet formula injection
const num = (v: string) => (/^\d+$/.test(v) ? `"=""${v}"""` : esc(v)) // keeps long account numbers as text in Excel
export async function GET(req: Request) {
  const u = await me(); if (!u || u.role !== "ADMIN") return new Response("Forbidden", { status: 403 })
  const id = new URL(req.url).searchParams.get("id"), now = new Date()
  const events = await db.event.findMany({ where: { status: "PUBLISHED", payStatus: "PAID", endsAt: { lte: now }, ...(id ? { id } : {}) }, orderBy: { endsAt: "desc" }, include: { roles: { include: { applications: { include: { user: true } } } } } })
  const head = ["Payout ID", "Volunteer ID", "Volunteer name", "Email", "Event", "Role", "Check in", "Check out", "Account holder", "Bank", "Account number", "IFSC", "UPI ID", "UPI Number", "Amount to pay (INR)"]
  const lines = [head.map(esc).join(",")]; let total = 0
  for (const e of events) for (const { a, r } of accepted(e)) {
    if (payState(a, r, true) !== "DUE") continue; total += r.pay
    lines.push([esc(a.id), esc(a.user.id), esc(a.user.name), esc(a.user.email), esc(e.title), esc(r.title), esc(a.checkIn?.toISOString()), esc(a.checkOut?.toISOString()), esc(a.user.bankHolder), esc(a.user.bankName), num(decrypt(a.user.bankAccountEnc)), esc(a.user.bankIfsc), esc(a.user.upiId), esc(a.user.upiNumber || ""), r.pay].join(","))
  }
  if (lines.length > 1) lines.push(["", "", "", "", "", "", "", "", "", "", "", "", "", esc("TOTAL"), total].join(","))
  await db.auditLog.create({ data: { actorId: u.id, action: `csv-export:${id || "all"}:${lines.length - 1} rows` } }) // the file holds account numbers, so every download is logged
  const name = `crewhub-payouts-${events.length === 1 ? events[0].title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "all"}-${now.toISOString().slice(0, 10)}.csv`
  return new Response("\uFEFF" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } })
}
