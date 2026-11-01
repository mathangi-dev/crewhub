import { saveBank } from "@/app/actions"; import { maskedAccount, bankReady } from "@/lib/bank"
const MSG: Record<string, [string, boolean]> = {
  saved: ["Bank details saved securely.", true],
  acct: ["Account number must be 9 to 18 digits.", false],
  ifsc: ["IFSC looks wrong. It is 11 characters, like SBIN0001234.", false],
  upi: ["UPI id looks wrong. Example: name@okbank", false],
  upinum: ["UPI number should be an 8 to 12 digit number (e.g. mobile number).", false],
  incomplete: ["Please fill account holder, account number and IFSC, or a UPI ID / UPI Number.", false]
}
export default function BankForm({ u, msg, purpose }: { u: any; msg?: string; purpose: string }) {
  const m = msg ? MSG[msg] : null
  return <><h2>Bank details</h2>
    <form action={saveBank} className="card" autoComplete="off">
      <p className="mute" style={{ marginTop: 0 }}>{purpose} Your account number is stored encrypted. Only the admin can view it, and only to make payments.</p>
      {m && <p><span className={`tag ${m[1] ? "ok" : "bad"}`}>{m[0]}</span></p>}
      <p style={{ margin: "0 0 8px" }}>Status: <span className={`tag ${bankReady(u) ? "ok" : "bad"}`}>{bankReady(u) ? `Saved ${maskedAccount(u)}` : "Not added"}</span></p>
      <label htmlFor="bankHolder">Account holder name</label><input id="bankHolder" name="bankHolder" defaultValue={u.bankHolder} autoComplete="off" />
      <label htmlFor="bankName">Bank name</label><input id="bankName" name="bankName" defaultValue={u.bankName} autoComplete="off" />
      <label htmlFor="bankAccount">Account number</label><input id="bankAccount" name="bankAccount" inputMode="numeric" autoComplete="off" placeholder={u.bankLast4 ? `Saved ${maskedAccount(u)}. Leave blank to keep it` : "9 to 18 digits"} />
      <label htmlFor="bankIfsc">IFSC code</label><input id="bankIfsc" name="bankIfsc" defaultValue={u.bankIfsc} autoComplete="off" placeholder="e.g. SBIN0001234" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "6px" }}>
        <div>
          <label htmlFor="upiId">UPI ID (optional)</label>
          <input id="upiId" name="upiId" defaultValue={u.upiId} autoComplete="off" placeholder="name@okbank" />
        </div>
        <div>
          <label htmlFor="upiNumber">UPI Number (optional)</label>
          <input id="upiNumber" name="upiNumber" defaultValue={u.upiNumber} inputMode="numeric" autoComplete="off" placeholder="e.g. 9876543210" />
        </div>
      </div>
      <p><button>Save bank details</button></p></form></>
}
