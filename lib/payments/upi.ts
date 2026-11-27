/**
 * CrewHub UPI Payment Utility
 * Inspired by YouPI-PG architecture for zero-fee, direct UPI wage transfers.
 * Supports dynamic UPI intent generation, QR generation, deep links,
 * and 24-hour individual checkout deadline tracking.
 */

export interface UpiPaymentIntentOptions {
  payeeUpi: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRef?: string;
}

export interface UpiDeepLinks {
  standard: string;
  gpay: string;
  phonepe: string;
  paytm: string;
}

export interface PaymentDeadlineStatus {
  hoursRemaining: number;
  isOverdue: boolean;
  isUrgent: boolean; // < 6 hours remaining
  formattedLabel: string;
  color: "green" | "amber" | "red" | "gray";
}

/**
 * Generate standard UPI payload string compliant with NPCI specifications:
 * upi://pay?pa={upiId}&pn={payeeName}&am={amount}&cu=INR&tn={note}
 */
export function generateUpiPayload(options: UpiPaymentIntentOptions): string {
  const { payeeUpi, payeeName, amount, transactionNote, transactionRef } = options;

  const cleanUpi = payeeUpi.trim();
  const cleanName = payeeName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const formattedAmount = Number(amount).toFixed(2);
  const cleanNote = transactionNote.trim().slice(0, 50);

  const params = new URLSearchParams({
    pa: cleanUpi,
    pn: cleanName,
    am: formattedAmount,
    cu: "INR",
    tn: cleanNote,
  });

  if (transactionRef) {
    params.set("tr", transactionRef.trim().slice(0, 35));
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Generate dynamic QR code URL for immediate scanning via mobile UPI apps
 */
export function getUpiQrCodeUrl(upiPayload: string, size = 260): string {
  const encoded = encodeURIComponent(upiPayload);
  // Uses high-reliability QR code service
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=8`;
}

/**
 * Generate deep links for mobile devices to invoke specific UPI apps directly
 */
export function getUpiDeepLinks(upiPayload: string): UpiDeepLinks {
  const queryString = upiPayload.replace(/^upi:\/\/pay\?/, "");
  return {
    standard: upiPayload,
    gpay: `gpay://upi/pay?${queryString}`,
    phonepe: `phonepe://pay?${queryString}`,
    paytm: `paytmmp://pay?${queryString}`,
  };
}

/**
 * Calculate the status of the 24-hour post-checkout payment deadline
 */
export function getPaymentDeadlineStatus(
  deadlineAt: Date | string | null | undefined,
  paymentStatus: "PENDING" | "RECORDED" | "CONFIRMED" | "DISPUTED"
): PaymentDeadlineStatus {
  if (paymentStatus === "CONFIRMED") {
    return {
      hoursRemaining: 0,
      isOverdue: false,
      isUrgent: false,
      formattedLabel: "Settled",
      color: "green",
    };
  }

  if (paymentStatus === "RECORDED") {
    return {
      hoursRemaining: 0,
      isOverdue: false,
      isUrgent: false,
      formattedLabel: "Worker Review",
      color: "gray",
    };
  }

  if (!deadlineAt) {
    return {
      hoursRemaining: 24,
      isOverdue: false,
      isUrgent: false,
      formattedLabel: "Pending Checkout",
      color: "gray",
    };
  }

  const deadline = typeof deadlineAt === "string" ? new Date(deadlineAt) : deadlineAt;
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMs <= 0) {
    const overdueHours = Math.abs(hoursRemaining);
    return {
      hoursRemaining: 0,
      isOverdue: true,
      isUrgent: true,
      formattedLabel: overdueHours > 0 ? `Overdue by ${overdueHours}h` : "Overdue",
      color: "red",
    };
  }

  if (hoursRemaining <= 6) {
    return {
      hoursRemaining,
      isOverdue: false,
      isUrgent: true,
      formattedLabel: `${hoursRemaining}h left (Urgent)`,
      color: "amber",
    };
  }

  return {
    hoursRemaining,
    isOverdue: false,
    isUrgent: false,
    formattedLabel: `${hoursRemaining}h remaining`,
    color: "green",
  };
}

/**
 * Phase 2 Architecture: Bulk Payout Data Models
 * Prepared for future one-click bulk payouts via legitimate provider / self-hosted gateway
 */
export interface BulkPayoutItem {
  paymentId: string;
  applicationId: string;
  workerId: string;
  workerName: string;
  workerUpi: string;
  amount: number;
  purpose: string;
}

export interface BulkPayoutBatch {
  batchId: string;
  organizerId: string;
  eventId: string;
  totalAmount: number;
  itemCount: number;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  items: BulkPayoutItem[];
  createdAt: string;
}
