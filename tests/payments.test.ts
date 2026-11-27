import { describe, it, expect } from "vitest";
import {
  generateUpiPayload,
  getPaymentDeadlineStatus,
  getUpiDeepLinks,
} from "../lib/payments/upi";

describe("CrewHub Direct UPI Payment System", () => {
  it("generates NPCI-compliant UPI payload string with zero deductions", () => {
    const payload = generateUpiPayload({
      payeeUpi: "worker@okaxis",
      payeeName: "Ramesh Kumar",
      amount: 650,
      transactionNote: "CrewHub Wage - Stage Support",
    });

    expect(payload).toContain("upi://pay?");
    expect(payload).toContain("pa=worker%40okaxis");
    expect(payload).toContain("pn=Ramesh+Kumar");
    expect(payload).toContain("am=650.00");
    expect(payload).toContain("cu=INR");
    expect(payload).toContain("tn=CrewHub+Wage+-+Stage+Support");
  });

  it("generates mobile deep links for instant UPI app redirection", () => {
    const payload = generateUpiPayload({
      payeeUpi: "volunteer@icici",
      payeeName: "Ananya",
      amount: 450,
      transactionNote: "CrewHub - Crowd Support",
    });

    const links = getUpiDeepLinks(payload);
    expect(links.standard).toBe(payload);
    expect(links.gpay).toContain("gpay://upi/pay?");
    expect(links.phonepe).toContain("phonepe://pay?");
    expect(links.paytm).toContain("paytmmp://pay?");
  });

  it("calculates 24-hour settlement deadline statuses correctly", () => {
    const now = new Date();

    // 1. Confirmed payment
    const confirmed = getPaymentDeadlineStatus(new Date(now.getTime() - 3600000), "CONFIRMED");
    expect(confirmed.formattedLabel).toBe("Settled");
    expect(confirmed.color).toBe("green");
    expect(confirmed.isOverdue).toBe(false);

    // 2. Pending checkout (no deadline yet)
    const pendingCheckout = getPaymentDeadlineStatus(null, "PENDING");
    expect(pendingCheckout.formattedLabel).toBe("Pending Checkout");
    expect(pendingCheckout.isOverdue).toBe(false);

    // 3. Normal remaining window (18 hours left)
    const future18h = new Date(now.getTime() + 18 * 3600000);
    const normal = getPaymentDeadlineStatus(future18h, "PENDING");
    expect(normal.isOverdue).toBe(false);
    expect(normal.isUrgent).toBe(false);
    expect(normal.formattedLabel).toContain("remaining");

    // 4. Urgent remaining window (4 hours left)
    const future4h = new Date(now.getTime() + 4 * 3600000);
    const urgent = getPaymentDeadlineStatus(future4h, "PENDING");
    expect(urgent.isOverdue).toBe(false);
    expect(urgent.isUrgent).toBe(true);
    expect(urgent.formattedLabel).toContain("Urgent");
    expect(urgent.color).toBe("amber");

    // 5. Overdue payment (past 24h deadline)
    const past5h = new Date(now.getTime() - 5 * 3600000);
    const overdue = getPaymentDeadlineStatus(past5h, "PENDING");
    expect(overdue.isOverdue).toBe(true);
    expect(overdue.color).toBe("red");
    expect(overdue.formattedLabel).toContain("Overdue");
  });
});
