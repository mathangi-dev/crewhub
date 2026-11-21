import { attended, accepted, rolePersonPay } from "./money";
import { bankReady } from "./bank";

// System payment statuses supported: PENDING, APPROVED, PROCESSING, PAID, FAILED, DISPUTED
export type PayState =
  | "PAID"
  | "REFUNDED"
  | "DUE"
  | "NO_BANK"
  | "UNPAID_ROLE"
  | "ABSENT"
  | "NO_CHECKOUT"
  | "WORKING"
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "FAILED"
  | "DISPUTED";

export const payState = (a: any, r: any, ended: boolean): PayState => {
  if (a.paymentStatus === "DISPUTED") return "DISPUTED";
  if (a.paid || a.paymentStatus === "PAID") return "PAID";
  if (a.paymentStatus === "PROCESSING") return "PROCESSING";
  if (a.paymentStatus === "FAILED") return "FAILED";
  if (a.refunded) return "REFUNDED";
  if (a.absent) return "ABSENT";
  if (attended(a)) {
    if (r.pay <= 0) return "UNPAID_ROLE";
    if (a.paymentStatus === "APPROVED") return "APPROVED";
    return bankReady(a.user) ? "DUE" : "NO_BANK";
  }
  if (a.checkIn) return ended ? "NO_CHECKOUT" : "WORKING";
  return ended ? "ABSENT" : "PENDING";
};

export const PAY_LABEL: Record<PayState, string> = {
  PAID: "Paid",
  REFUNDED: "Refunded to organizer",
  DUE: "Ready to pay",
  NO_BANK: "No bank details",
  UNPAID_ROLE: "Unpaid role",
  ABSENT: "Absent, no payout",
  NO_CHECKOUT: "No check-out, no payout",
  WORKING: "Checked in",
  PENDING: "Not checked in yet",
  APPROVED: "Payment Approved",
  PROCESSING: "Processing Payout",
  FAILED: "Payout Failed",
  DISPUTED: "Payment Disputed",
};

// crew money that will never reach a worker (absent, no check-out, unfilled slots) and was not refunded yet
export const unusedOf = (e: any) => {
  const used = accepted(e).reduce((n, { a, r }) => {
    const s = payState(a, r, true);
    return n + (s === "PAID" ? a.payout : ["DUE", "NO_BANK", "APPROVED", "PROCESSING"].includes(s) ? rolePersonPay(r) : 0);
  }, 0);
  return Math.max(0, e.crewTotal - used - (e.refunded || 0));
};
