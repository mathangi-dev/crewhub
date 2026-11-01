import { redirect } from "next/navigation"; import { need } from "@/lib/auth"; import { TERMS_VERSION, VOLUNTEER_TERMS } from "@/lib/terms"; import { acceptTerms, logout } from "../actions"
export default async function Terms() {
  const u = await need("VOLUNTEER")
  if (u.termsVersion === TERMS_VERSION) redirect("/volunteer")
  return <div className="auth"><div className="panel terms"><h1>Volunteer terms and conditions</h1>
    <ol className="tlist">{VOLUNTEER_TERMS.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
    <form action={acceptTerms}><label className="agree"><input type="checkbox" name="agree" required /><span>I, {u.name}, have read the terms above and I declare that I agree to follow them.</span></label>
      <button className="btn">Agree and continue</button></form>
    <form action={logout}><button className="ghost">I do not agree, log out</button></form></div></div>
}
