"use client";

import { useState } from "react";
import SubmitBtn from "./SubmitBtn";

export default function CheckoutPaymentModule({
  eventId,
  total,
  totalFormatted,
  adminName,
  adminUpiId,
  adminUpiNumber,
  upiLink,
  qrUrl,
  initialUtr,
  payEventAction,
}: {
  eventId: string;
  total: number;
  totalFormatted: string;
  adminName: string;
  adminUpiId: string;
  adminUpiNumber: string;
  upiLink: string;
  qrUrl: string;
  initialUtr: string;
  payEventAction: (id: string, formData: FormData) => Promise<void>;
}) {
  const [method, setMethod] = useState<"razorpay" | "upi">("razorpay");
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [simulatedPaymentId, setSimulatedPaymentId] = useState("");

  const handleSimulateRazorpay = () => {
    const fakeId = `pay_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString().slice(-4)}`;
    setSimulatedPaymentId(fakeId);
    setRazorpaySuccess(true);
  };

  return (
    <div
      style={{
        margin: "20px 0",
        background: "#ffffff",
        border: "1.5px solid #e2e8f0",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header & Tabs */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "16px 20px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <b style={{ fontSize: "1.05rem", color: "#f8fafc" }}>CrewHub Secure Escrow Checkout</b>
          <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
            15% Platform fee included. 100% money-back guarantee for absentees.
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setMethod("razorpay")}
            style={{
              background: method === "razorpay" ? "#0284c7" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            💳 Razorpay Gateway
          </button>
          <button
            type="button"
            onClick={() => setMethod("upi")}
            style={{
              background: method === "upi" ? "#0284c7" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚡ UPI App / QR
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Method 1: Razorpay Option */}
        {method === "razorpay" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div
                style={{
                  background: "#0284c7",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  letterSpacing: "0.5px",
                }}
              >
                Razorpay
              </div>
              <span className="mute" style={{ fontSize: "0.84rem" }}>
                Accepts Credit/Debit Cards, NetBanking, GPay, PhonePe, Paytm, Cred, and Wallets
              </span>
            </div>

            {!razorpaySuccess ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.4rem", marginBottom: "8px" }}>🛡️</div>
                <b style={{ fontSize: "1.05rem", color: "#0f172a" }}>Razorpay Instant Payment Modal</b>
                <p className="mute" style={{ maxWidth: "420px", margin: "6px auto 14px", fontSize: "0.85rem" }}>
                  Amount to charge: <b style={{ color: "#16a34a", fontSize: "1rem" }}>{totalFormatted}</b>. Click below to launch Razorpay Secure Sandbox to authorize the escrow deposit.
                </p>

                <button
                  type="button"
                  onClick={handleSimulateRazorpay}
                  style={{
                    background: "#0284c7",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(2, 132, 199, 0.3)",
                  }}
                >
                  Pay {totalFormatted} via Razorpay ➔
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", marginBottom: "10px" }}>
                  <span style={{ fontSize: "1.2rem" }}>✓</span>
                  <b style={{ fontSize: "1rem" }}>Razorpay Payment Authorized!</b>
                </div>

                <div className="mute" style={{ fontSize: "0.84rem", marginBottom: "12px" }}>
                  Razorpay Payment ID: <code style={{ color: "#0f172a", fontWeight: 700 }}>{simulatedPaymentId}</code>
                </div>

                <form action={payEventAction.bind(null, eventId)}>
                  <input type="hidden" name="reference" value={simulatedPaymentId} />
                  <SubmitBtn pendingText="Finalizing event creation...">
                    Confirm & Submit Event for Admin Approval ➔
                  </SubmitBtn>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Method 2: UPI Direct Transfer */}
        {method === "upi" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "18px",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.88rem" }}>
                <div>
                  <span className="mute">Admin Payee:</span> <b>{adminName}</b>
                </div>
                <div>
                  <span className="mute">Admin UPI Number:</span>{" "}
                  <b style={{ color: "#0284c7", fontSize: "0.98rem" }}>{adminUpiNumber}</b>
                </div>
                <div>
                  <span className="mute">Admin UPI ID / VPA:</span>{" "}
                  <b style={{ color: "#0f172a" }}>{adminUpiId}</b>
                </div>
                <div>
                  <span className="mute">Total to Transfer:</span>{" "}
                  <b style={{ color: "#16a34a", fontSize: "1.1rem" }}>{totalFormatted}</b>
                </div>

                <div style={{ marginTop: "8px" }}>
                  <a
                    href={upiLink}
                    className="btn"
                    style={{
                      background: "#059669",
                      color: "#fff",
                      fontWeight: 700,
                      padding: "10px 18px",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      textDecoration: "none",
                      boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                    }}
                  >
                    🚀 Open in UPI App (GPay / PhonePe / Paytm)
                  </a>
                </div>
              </div>

              {/* QR Code */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "8px",
                    background: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <img
                    src={qrUrl}
                    alt="Scan UPI QR"
                    width={150}
                    height={150}
                    style={{ display: "block", borderRadius: "8px" }}
                  />
                </div>
                <div className="mute" style={{ fontSize: "0.76rem", marginTop: "6px" }}>
                  Scan with any UPI camera
                </div>
              </div>
            </div>

            <form action={payEventAction.bind(null, eventId)} style={{ marginTop: "18px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="reference" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Transaction UTR / Reference ID
                </label>
                <input
                  id="reference"
                  name="reference"
                  defaultValue={initialUtr}
                  placeholder="12-digit UPI reference ID"
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontFamily: "monospace",
                  }}
                />
                <span className="mute" style={{ fontSize: "0.75rem" }}>
                  Auto-filled with simulated UTR, or paste the 12-digit UTR from your bank/UPI app.
                </span>
              </div>

              <SubmitBtn pendingText="Verifying payment...">
                Confirm Payment & Submit Event ➔
              </SubmitBtn>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
