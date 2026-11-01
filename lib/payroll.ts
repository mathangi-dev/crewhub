import { attended, accepted } from "./money"; import { bankReady } from "./bank"
// One place that decides who gets paid.
// DUE = checked in AND checked out + role has pay + bank details saved. Everyone else gets nothing.
export type PayState = "PAID" | "REFUNDED" | "DUE" | "NO_BANK" | "UNPAID_ROLE" | "ABSENT" | "NO_CHECKOUT" | "WORKING" | "PENDING"
export const payState = (a: any, r: any, ended: boolean): PayState =>
  a.paid ? "PAID" : a.refunded ? "REFUNDED"
  : a.absent ? "ABSENT"
  : attended(a) ? (r.pay <= 0 ? "UNPAID_ROLE" : bankReady(a.user) ? "DUE" : "NO_BANK")
  : a.checkIn ? (ended ? "NO_CHECKOUT" : "WORKING")
  : ended ? "ABSENT" : "PENDING"
export const PAY_LABEL: Record<PayState, string> = { PAID: "Paid", REFUNDED: "Refunded to organizer", DUE: "Ready to pay", NO_BANK: "No bank details", UNPAID_ROLE: "Unpaid role", ABSENT: "Absent, no payout", NO_CHECKOUT: "No check-out, no payout", WORKING: "Checked in", PENDING: "Not checked in yet" }
// crew money that will never reach a volunteer (absent, no check-out, unfilled slots) and was not refunded yet
export const unusedOf = (e: any) => {
  const used = accepted(e).reduce((n, { a, r }) => { const s = payState(a, r, true); return n + (s === "PAID" ? a.payout : s === "DUE" || s === "NO_BANK" ? r.pay : 0) }, 0)
  return Math.max(0, e.crewTotal - used - (e.refunded || 0))
}
