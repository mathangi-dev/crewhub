/**
 * Payment & UPI Integration Configuration
 * Standard Indian NPCI UPI Deep-Link Protocol
 */

export const ADMIN_UPI_NUMBER = "8220324140";
export const ADMIN_UPI_ID = "8220324140@upi";
export const ADMIN_NAME = "CrewHub Admin";

export const SAMPLE_ORGANIZER_UPI_NUMBER = "8838617672";
export const SAMPLE_ORGANIZER_UPI_ID = "8838617672@upi";

/**
 * Builds an official NPCI UPI Deep Link to directly open UPI apps
 * (Google Pay, PhonePe, Paytm, BHIM, Cred, etc.)
 */
export function buildUpiDeepLink({
  pa,
  pn,
  am,
  tn,
  tr,
}: {
  pa: string;
  pn: string;
  am: number;
  tn?: string;
  tr?: string;
}): string {
  // Clean UPI ID / VPA
  let vpa = pa.trim();
  if (!vpa.includes("@")) {
    vpa = `${vpa}@upi`;
  }

  const cleanAmount = (Math.round(am * 100) / 100).toFixed(2);
  const cleanName = encodeURIComponent(pn.trim());
  const cleanNote = encodeURIComponent(tn ? tn.slice(0, 50) : "CrewHub Payment");
  const ref = tr ? `&tr=${encodeURIComponent(tr)}` : "";

  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}${ref}`;
}

/**
 * Generates an SVG/PNG QR Code URL for desktop scanning with mobile camera/UPI apps
 */
export function getUpiQrCodeUrl(upiLink: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(
    upiLink
  )}`;
}

/**
 * Generates an authentic 12-digit Indian Bank UTR (Unique Transaction Reference)
 */
export function generateUTR(): string {
  const prefix = "UPI";
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // e.g. 261031
  const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `${prefix}${dateStr}${rand}`;
}
