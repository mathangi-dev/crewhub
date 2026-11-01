import { db } from "./db"; import { MAX_ABSENCES, GRACE_MS } from "./money"
let last = 0
// Runs on page loads (no cron needed). 1) accepted volunteers who did not complete check in AND check out are marked absent once the
// event is over + grace time. 2) every new absence is added to the volunteer's count. 3) at MAX_ABSENCES the account is suspended.
export async function sweepAbsences(force = false) {
  const now = Date.now(); if (!force && now - last < 20000) return; last = now
  const over = { event: { status: "PUBLISHED", endsAt: { lte: new Date(now - GRACE_MS) } } }
  await db.application.updateMany({ where: { status: "ACCEPTED", absent: false, paid: false, OR: [{ checkIn: null }, { checkOut: null }], role: over }, data: { absent: true } })
  const todo = await db.application.findMany({ where: { status: "ACCEPTED", absent: true, absentCounted: false, role: over }, select: { id: true, userId: true } })
  const by: Record<string, string[]> = {}; for (const t of todo) (by[t.userId] ||= []).push(t.id)
  for (const userId of Object.keys(by)) {
    const r = await db.application.updateMany({ where: { id: { in: by[userId] }, absentCounted: false }, data: { absentCounted: true } }) // count each absence only once
    if (!r.count) continue
    const u = await db.user.update({ where: { id: userId }, data: { absences: { increment: r.count } } })
    if (u.role === "VOLUNTEER" && !u.suspended && u.absences >= MAX_ABSENCES) {
      await db.user.update({ where: { id: userId }, data: { suspended: true } })
      await db.application.updateMany({ where: { userId, status: { in: ["PENDING", "ACCEPTED"] }, role: { event: { endsAt: { gt: new Date() } } } }, data: { status: "CANCELLED" } }) // drop upcoming events
      await db.auditLog.create({ data: { actorId: "system", action: `auto-suspend:${u.email}:${u.absences} absences` } })
    }
  }
}
