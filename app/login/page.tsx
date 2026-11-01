import Link from "next/link"; import { login } from "../actions"
export default function Login({ searchParams }: { searchParams: { e?: string } }) {
  return <div className="auth"><Link href="/" className="back">← Back to home</Link><form action={login} className="panel"><img src="/logo-full.png" alt="CrewHub" className="plogo" /><h1>Log in</h1><p className="mute" style={{ margin: 0 }}>Use the email you signed up with.</p>
    {searchParams.e && <p className="err" role="alert">Wrong email or password, or the account is suspended.</p>}
    <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required />
    <label htmlFor="pw">Password</label><input id="pw" name="password" type="password" autoComplete="current-password" required />
    <button className="btn">Log in</button>
    <p className="alt mute">New to CrewHub? <Link href="/register">Sign up</Link></p>
    <p className="alt mute">Demo: vol@eventlink.test / password123</p></form></div>
}
