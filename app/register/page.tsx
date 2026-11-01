import Link from "next/link"; import { register } from "../actions"
export default function Register({ searchParams }: { searchParams: { e?: string; role?: string } }) {
  const org = searchParams.role === "ORGANIZER"
  return <div className="auth"><Link href="/" className="back">← Back to home</Link><form action={register} className="panel"><img src="/logo-full.png" alt="CrewHub" className="plogo" /><h1>Create account</h1>
    {searchParams.e && <p className="err" role="alert">That email is already registered. <Link href="/login">Log in instead</Link>.</p>}
    <label>Join as</label><div className="roles">
      <label><input type="radio" name="role" value="VOLUNTEER" defaultChecked={!org} /><span>Join as Volunteer<small>Apply for event roles</small></span></label>
      <label><input type="radio" name="role" value="ORGANIZER" defaultChecked={org} /><span>Join as Organizer<small>Post events and hire crew</small></span></label></div>
    <label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required />
    <label htmlFor="city">City</label><input id="city" name="city" autoComplete="address-level2" />
    <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required />
    <label htmlFor="pw">Password (8+ characters)</label><input id="pw" name="password" type="password" minLength={8} autoComplete="new-password" required />
    <button className="btn">Sign up</button><p className="alt mute">Already a member? <Link href="/login">Log in</Link></p></form></div>
}
