import { need } from "@/lib/auth"; import { decrypt, bankReady, maskedAccount } from "@/lib/bank"
// ADMIN ONLY. Shows saved bank details. Masked by default, the full number is inside the "show" section.
export default async function AdminBank({ u }: { u: any }) {
  await need("ADMIN")
  if (!bankReady(u)) return <p className="mute" style={{ margin: "4px 0 0" }}>No bank details added yet</p>
  const acct = decrypt(u.bankAccountEnc)
  return <details style={{ marginTop: 6 }}><summary className="mute" style={{ cursor: "pointer" }}>Bank details {maskedAccount(u) ? `(${maskedAccount(u)})` : "(UPI)"}</summary>
    <div className="kv" style={{ marginTop: 6 }}>
      {u.bankHolder && <div><span className="mute">Account holder</span> <b>{u.bankHolder}</b></div>}
      {u.bankName && <div><span className="mute">Bank</span> <b>{u.bankName}</b></div>}
      {acct && <div><span className="mute">Account number</span> <b>{acct}</b></div>}
      {u.bankIfsc && <div><span className="mute">IFSC</span> <b>{u.bankIfsc}</b></div>}
      {u.upiId && <div><span className="mute">UPI ID</span> <b>{u.upiId}</b></div>}
      {u.upiNumber && <div><span className="mute">UPI Number</span> <b>{u.upiNumber}</b></div>}
    </div></details>
}
