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
  const [utrClaim, setUtrClaim] = useState(initialUtr);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"youpi_qr" | "youpi_intent">("youpi_intent");

  const copyVpa = () => {
    navigator.clipboard.writeText(adminUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        margin: "20px 0",
        background: "#ffffff",
        border: "1.5px solid #0284c7",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(2, 132, 199, 0.08)",
      }}
    >
      {/* YouPI-PG Gateway Banner */}
      <div
        style={{
          background: "var(--navy)",
          padding: "16px 20px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              background: "var(--teal)",
              color: "var(--navy)",
              fontWeight: 800,
              fontSize: "0.85rem",
              padding: "4px 10px",
              borderRadius: "6px",
              letterSpacing: "0.5px",
            }}
          >
            YouPI-PG
          </div>
          <div>
            <b style={{ fontSize: "1.05rem", color: "#ffffff" }}>YouPI Payment Gateway</b>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.75)" }}>
              Direct Escrow Settlement · Zero Payment Gateway Fee · Instant UTR Verification
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("youpi_intent")}
            style={{
              background: activeTab === "youpi_intent" ? "#fff" : "rgba(255,255,255,0.15)",
              color: activeTab === "youpi_intent" ? "var(--navy)" : "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            UPI App Intent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("youpi_qr")}
            style={{
              background: activeTab === "youpi_qr" ? "#fff" : "rgba(255,255,255,0.15)",
              color: activeTab === "youpi_qr" ? "var(--navy)" : "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Scan YouPI QR
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Tab 1: UPI App Intent Flow */}
        {activeTab === "youpi_intent" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.88rem" }}>
                <div>
                  <span className="mute">Admin Payee:</span> <b>{adminName}</b>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="mute">Admin UPI VPA:</span>{" "}
                  <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: "4px" }}>
                    {adminUpiId}
                  </code>
                  <button
                    type="button"
                    onClick={copyVpa}
                    className="btn ghost sm"
                    style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div>
                  <span className="mute">Admin UPI Number:</span>{" "}
                  <b style={{ color: "var(--navy)" }}>{adminUpiNumber}</b>
                </div>
                <div>
                  <span className="mute">Total Escrow Amount:</span>{" "}
                  <b style={{ color: "var(--navy)", fontSize: "1.15rem" }}>{totalFormatted}</b>{" "}
                  <span className="mute" style={{ fontSize: "0.78rem" }}>(15% platform fee included)</span>
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <a
                  href={upiLink}
                  className="btn"
                  style={{
                    background: "var(--navy)",
                    color: "#fff",
                    fontWeight: 700,
                    padding: "10px 20px",
                    borderRadius: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    textDecoration: "none",
                  }}
                >
                  Open in UPI App (GPay / PhonePe / Paytm / Cred)
                </a>
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "14px",
                fontSize: "0.82rem",
              }}
            >
              <b style={{ color: "#0f172a" }}>How YouPI-PG Gateway Works:</b>
              <ol style={{ margin: "6px 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>Tap the button above to launch your installed UPI app.</li>
                <li>Transfer exactly <b>{totalFormatted}</b> to the Admin VPA.</li>
                <li>Copy the <b>12-digit UTR (UPI Reference ID)</b> from your bank SMS/app.</li>
                <li>Submit below to finalize your event creation for Admin approval.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 2: YouPI QR Code Flow */}
        {activeTab === "youpi_qr" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "10px",
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <img
                  src={qrUrl}
                  alt="YouPI-PG Dynamic QR"
                  width={160}
                  height={160}
                  style={{ display: "block", borderRadius: "8px" }}
                />
              </div>
              <div className="mute" style={{ fontSize: "0.76rem", marginTop: "6px" }}>
                Scan using any UPI App Camera (PhonePe, GPay, Paytm, BHIM)
              </div>
            </div>

            <div style={{ fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "6px" }}>
              <b>Scan to Pay {totalFormatted}</b>
              <div className="mute" style={{ fontSize: "0.84rem" }}>
                VPA: <b>{adminUpiId}</b> · Payee: <b>{adminName}</b>
              </div>
              <p className="mute" style={{ margin: "6px 0", fontSize: "0.82rem" }}>
                Direct NPCI dynamic QR routing directly to the Admin escrow account. Instant settlement with 0% gateway commission deduction.
              </p>
            </div>
          </div>
        )}

        {/* UTR Submission Form */}
        <form action={payEventAction.bind(null, eventId)} style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <label htmlFor="reference" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>
              Enter 12-Digit Bank UTR / UPI Reference ID
            </label>
            <input
              id="reference"
              name="reference"
              value={utrClaim}
              onChange={(e) => setUtrClaim(e.target.value)}
              placeholder="e.g. 430129481923"
              required
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontFamily: "monospace",
                fontSize: "0.95rem",
              }}
            />
            <div className="mute" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
              Pre-filled with simulated YouPI UTR reference, or paste the 12-digit UTR from your bank transaction.
            </div>
          </div>

          <SubmitBtn pendingText="Verifying with YouPI Gateway...">
            Submit Payment & Send Event for Admin Approval
          </SubmitBtn>
        </form>
      </div>
    </div>
  );
}
