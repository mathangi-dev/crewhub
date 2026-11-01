import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
// Bank account numbers are encrypted before they reach the database (AES-256-GCM).
// The key comes from BANK_SECRET in .env. If you change that secret, old saved accounts can no longer be read.
const key = () => {
  const s = process.env.BANK_SECRET
  if (!s || s.length < 16) throw new Error("BANK_SECRET is missing in .env (use at least 16 random characters)")
  return createHash("sha256").update(s).digest()
}
export const encrypt = (text: string) => {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv)
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()])
  return [iv, c.getAuthTag(), enc].map(b => b.toString("base64")).join(".")
}
export const decrypt = (v: string) => {
  if (!v) return ""
  try {
    const [iv, tag, enc] = v.split(".").map(x => Buffer.from(x, "base64"))
    const d = createDecipheriv("aes-256-gcm", key(), iv); d.setAuthTag(tag)
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8")
  } catch { return "" }
}
// a user can be paid when full bank details are saved, or a UPI id / UPI number is saved
export const bankReady = (u: any) => !!(u && ((u.bankAccountEnc && u.bankIfsc && u.bankHolder) || u.upiId || u.upiNumber))
export const maskedAccount = (u: any) => (u.bankLast4 ? `•••• •••• ${u.bankLast4}` : u.upiNumber ? `UPI No: ${u.upiNumber}` : u.upiId ? `UPI: ${u.upiId}` : "")
