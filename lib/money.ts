// Platform fee the organizer pays on top of the crew pay (default 15%). Change with COMMISSION_PERCENT in .env
export const RATE = Math.max(0, Number(process.env.COMMISSION_PERCENT ?? 15) || 0)
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")
export const crewOf = (roles: { slots: number; pay: number }[]) => roles.reduce((n, r) => n + r.slots * r.pay, 0)
export const commissionOf = (crew: number) => Math.round((crew * RATE) / 100)
export const accepted = (e: any): { a: any; r: any }[] => e.roles.flatMap((r: any) => r.applications.filter((a: any) => a.status === "ACCEPTED").map((a: any) => ({ a, r })))
// a volunteer counts as present only if the organizer marked BOTH check in and check out
export const attended = (a: any) => !!a.checkIn && !!a.checkOut
export const dt = (d: Date) => d.toLocaleString("en-IN")
export const hm = (d: Date | null) => (d ? d.toLocaleTimeString("en-IN", { timeStyle: "short" }) : "—")
export const when = (e: any) => `${dt(e.startsAt)} to ${hm(e.endsAt)}`
const q = (e: any) => (e.latitude && e.longitude ? `${e.latitude},${e.longitude}` : encodeURIComponent(`${e.venue}, ${e.city}`))
export const mapUrl = (e: any) => `https://www.google.com/maps/search/?api=1&query=${q(e)}`
export const dirUrl = (e: any) => `https://www.google.com/maps/dir/?api=1&destination=${q(e)}`
// ---- absence rules
export const MAX_ABSENCES = 5                 // this many absences = account suspended
export const GRACE_MS = 2 * 60 * 60 * 1000    // organizers get 2 hours after the event ends to finish check in / out
// absent = marked absent, or (after the grace time) did not complete both check in and check out
export const absentNow = (a: any, e: any) => !attended(a) && (!!a.absent || e.endsAt.getTime() + GRACE_MS <= Date.now())
