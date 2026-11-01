import { need } from "@/lib/auth"; import { saveProfile, submitVerification } from "@/app/actions"; import BankForm from "@/components/BankForm"
const ST: Record<string, string> = { PENDING: "Awaiting approval", APPROVED: "Verified", REJECTED: "Rejected" }
export default async function Page({ searchParams }: { searchParams: { bank?: string } }) {
  const u = await need("ORGANIZER")
  return <div className="compact"><div className="dh"><div><span className="mute">Organizer dashboard</span><h1>Profile</h1></div></div><p className="mute">Your organization details and verification.</p>
    <h2 style={{ marginTop: 0 }}>Organization details</h2>
    <form action={saveProfile} className="card"><input type="hidden" name="verifyInfo" value={u.verifyInfo} />
      <label htmlFor="name">Contact name</label><input id="name" name="name" defaultValue={u.name} required /><label htmlFor="orgName">Organization name</label><input id="orgName" name="orgName" defaultValue={u.orgName} />
      <label htmlFor="city">City</label><input id="city" name="city" defaultValue={u.city} /><label htmlFor="bio">About the organization</label><textarea id="bio" name="bio" defaultValue={u.bio} /><p><button>Save details</button></p></form>
    <h2>Verification</h2>
    <form action={submitVerification} className="card"><p style={{ margin: "0 0 8px" }}>Status: <span className={`tag ${u.approval === "APPROVED" ? "ok" : u.approval === "REJECTED" ? "bad" : ""}`}>{ST[u.approval]}</span></p>
      <label htmlFor="verifyInfo">Verification info (website, past events, registration no.)</label><textarea id="verifyInfo" name="verifyInfo" defaultValue={u.verifyInfo} /><p><button>Submit for verification</button></p></form>
    <BankForm u={u} msg={searchParams.bank} purpose="Used for refunds if an event is rejected." /></div>
}
