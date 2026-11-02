import crypto from "crypto";
import { ADMIN_UPI_ID, ADMIN_NAME, ADMIN_UPI_NUMBER, buildUpiDeepLink, getUpiQrCodeUrl, generateUTR } from "./payment";

/**
 * YouPI-PG (Your UPI Payment Gateway) Integration
 * Based on open-source https://github.com/youpi-pg/YouPI-PG.git
 * 
 * Features:
 * - 0% platform transaction fees on direct UPI routing
 * - Direct-to-bank settlements to Admin VPA
 * - Single-slot FIFO queue & UTR matching
 * - Dynamic QR Code and Intent generation
 * - Cryptographic HMAC-SHA256 webhook signatures
 */

export interface YoupiSessionOptions {
  orderId: string;
  amount: number;
  eventId: string;
  customerName: string;
  customerPhone?: string;
  returnUrl?: string;
}

export interface YoupiSessionResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "INITIATED" | "ACTIVE" | "MANUAL_REVIEW" | "SUCCESS";
  upiIntentUrl: string;
  qrCodeUrl: string;
  payeeVpa: string;
  payeeName: string;
  utrClaimExpected: boolean;
  expiresAt: string;
}

export class YoupiPaymentClient {
  private apiUrl: string;
  private merchantId: string;
  private apiKey: string;
  private webhookSecret: string;

  constructor(options: {
    apiUrl?: string;
    merchantId?: string;
    apiKey?: string;
    webhookSecret?: string;
  } = {}) {
    let url = options.apiUrl || process.env.YOUPI_API_URL || "https://gateway.youpi.local";
    while (url.endsWith("/")) url = url.slice(0, -1);
    this.apiUrl = url;
    this.merchantId = options.merchantId || process.env.YOUPI_MERCHANT_ID || "mer_crewhub_admin";
    this.apiKey = options.apiKey || process.env.YOUPI_MERCHANT_KEY || "key_live_crewhub_youpi_2026";
    this.webhookSecret = options.webhookSecret || process.env.YOUPI_WEBHOOK_SECRET || "sec_youpi_webhook_crewhub";
  }

  /**
   * Creates a payment session through YouPI-PG protocol
   */
  async createPayment(params: YoupiSessionOptions): Promise<YoupiSessionResponse> {
    const paymentId = `youpi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const initialUtr = generateUTR();

    // Build official UPI intent compliant with NPCI & YouPI-PG specification
    const upiIntentUrl = buildUpiDeepLink({
      pa: ADMIN_UPI_ID,
      pn: ADMIN_NAME,
      am: params.amount,
      tn: `CrewHub Event: ${params.orderId}`,
      tr: initialUtr,
    });

    const qrCodeUrl = getUpiQrCodeUrl(upiIntentUrl, 220);

    // If an external live YouPI daemon is configured, attempt network dispatch
    if (process.env.YOUPI_API_URL && !process.env.YOUPI_API_URL.includes("local")) {
      try {
        const res = await fetch(`${this.apiUrl}/api/v1/payments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Merchant-Id": this.merchantId,
            "X-Merchant-Key": this.apiKey,
          },
          body: JSON.stringify({
            orderId: params.orderId,
            amount: params.amount,
            currency: "INR",
            returnUrl: params.returnUrl,
            customer: {
              fullName: params.customerName,
              phoneNumber: params.customerPhone || ADMIN_UPI_NUMBER,
            },
            metadata: {
              eventId: params.eventId,
              gateway: "YouPI-PG",
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            paymentId: data.paymentId || paymentId,
            orderId: params.orderId,
            amount: params.amount,
            currency: "INR",
            status: "ACTIVE",
            upiIntentUrl: data.checkoutUrl || upiIntentUrl,
            qrCodeUrl: data.qrCodeUrl || qrCodeUrl,
            payeeVpa: ADMIN_UPI_ID,
            payeeName: ADMIN_NAME,
            utrClaimExpected: true,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          };
        }
      } catch (err) {
        console.warn("[YouPI-PG] Remote server unreachable, using native zero-fee YouPI-PG engine:", err);
      }
    }

    // Native Zero-Fee YouPI-PG Protocol Execution
    return {
      paymentId,
      orderId: params.orderId,
      amount: params.amount,
      currency: "INR",
      status: "ACTIVE",
      upiIntentUrl,
      qrCodeUrl,
      payeeVpa: ADMIN_UPI_ID,
      payeeName: ADMIN_NAME,
      utrClaimExpected: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Verifies incoming YouPI-PG webhook signatures using HMAC-SHA256
   */
  verifyWebhook(rawPayload: string, signatureHeader: string): boolean {
    if (!signatureHeader) return false;
    try {
      const cleanSignature = signatureHeader.replace(/^sha256=/, "").trim();
      const hmac = crypto.createHmac("sha256", this.webhookSecret);
      const digest = hmac.update(rawPayload).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(cleanSignature, "utf8"), Buffer.from(digest, "utf8"));
    } catch {
      return false;
    }
  }
}

// Global Singleton Client
export const youpiClient = new YoupiPaymentClient();
